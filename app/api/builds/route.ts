import { createServerClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'
import { generateBuildId, parseBuildTitle, parseBudget } from '@/lib/build-utils'

/** POST /api/builds — persist an AI-generated build and return its public ID */
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    const body = await request.json()
    const { rawMarkdown, userPrompt } = body as {
      rawMarkdown?: string
      userPrompt?: string
    }

    if (!rawMarkdown || typeof rawMarkdown !== 'string') {
      return Response.json({ error: 'rawMarkdown required' }, { status: 400 })
    }

    const id = generateBuildId()
    const title = parseBuildTitle(rawMarkdown)
    const budget = parseBudget(rawMarkdown)

    const supabase = createServerClient()
    const { error } = await supabase.from('builds').insert({
      id,
      title,
      user_id: user?.id ?? null,
      budget: budget ?? null,
      use_case: userPrompt ? userPrompt.slice(0, 200) : null,
      raw_markdown: rawMarkdown,
    })

    if (error) {
      console.error('[builds] Supabase insert error:', error.message)
      return Response.json({ error: 'Failed to save build' }, { status: 500 })
    }

    return Response.json({ id, url: `/build/${id}` })
  } catch (err) {
    console.error('[builds] Unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
