export const dynamic = 'force-dynamic'

import { getUserFromRequest, checkMessageLimit, checkGuestLimit, getClientIp } from '@/lib/auth'
import { getAnthropicClient, getSystemPrompt } from '@/lib/anthropic'
import { createServerClient } from '@/lib/supabase'

// Bounds on request shape — the client already limits these in the UI, but
// that's UX only. Anyone can call this endpoint directly, so the real
// enforcement (and the only thing standing between a scripted request and an
// unbounded Anthropic bill) has to live here.
const MAX_MESSAGES = 30
const MAX_MESSAGE_CHARS = 6000
const MAX_TOTAL_CHARS = 16000

interface ChatMessage { role: string; content: string }

function validateMessages(input: unknown): input is ChatMessage[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_MESSAGES) return false
  let total = 0
  for (const m of input) {
    if (typeof m !== 'object' || m === null) return false
    const { role, content } = m as Record<string, unknown>
    if (role !== 'user' && role !== 'assistant') return false
    if (typeof content !== 'string' || content.length === 0 || content.length > MAX_MESSAGE_CHARS) return false
    total += content.length
  }
  return total <= MAX_TOTAL_CHARS
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request)

  // Authenticated users: enforce daily message limit
  if (user) {
    const { allowed } = await checkMessageLimit(user.id)
    if (!allowed) {
      return Response.json(
        { error: 'limit_reached', message: "You've used all 10 free messages today. Upgrade to Pro for unlimited access." },
        { status: 429 }
      )
    }
  } else {
    // Guest users (no auth token) — enforced server-side by IP.
    // The client's localStorage counter is UX only and cannot be trusted.
    const { allowed } = await checkGuestLimit(getClientIp(request))
    if (!allowed) {
      return Response.json(
        { error: 'limit_reached', message: 'Guest limit reached. Sign in for more free messages.' },
        { status: 429 }
      )
    }
  }

  const body = await request.json().catch(() => null)
  if (!validateMessages(body?.messages)) {
    return Response.json(
      { error: 'invalid_request', message: 'Message too long or malformed. Try shortening your message or starting a new chat.' },
      { status: 400 }
    )
  }
  const messages = body.messages as ChatMessage[]

  // Fetch owned parts for personalised system prompt (logged-in users only)
  let ownedParts: string | undefined
  if (user) {
    try {
      const supabase = createServerClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('owned_parts')
        .eq('id', user.id)
        .single()
      ownedParts = profile?.owned_parts || undefined
    } catch { /* non-fatal */ }
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const anthropicStream = getAnthropicClient().messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          system: [{ type: 'text', text: getSystemPrompt(ownedParts), cache_control: { type: 'ephemeral' } }],
          messages: messages.map((m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        })

        anthropicStream.on('text', (text) => send('token', { text }))
        anthropicStream.on('finalMessage', () => {
          send('done', {})
          controller.close()
        })
        anthropicStream.on('error', () => {
          send('error', { message: 'Stream error. Please try again.' })
          controller.close()
        })
      } catch {
        send('error', { message: 'Failed to get a response.' })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
