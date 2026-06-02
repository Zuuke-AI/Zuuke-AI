import { getUserFromRequest } from '@/lib/auth'
import { sendWelcomeEmail } from '@/lib/email'
import { createServerClient } from '@/lib/supabase'

/**
 * POST /api/auth/welcome
 * Sends a one-time welcome email to a newly created user.
 * Called from /auth/callback after confirming the account is <24 h old.
 * Silently skips if the account was created more than 24 hours ago
 * (returning users who somehow re-hit the callback won't be re-emailed).
 */
export async function POST(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Guard: only send for accounts created in the last 24 hours
  const ageMs = Date.now() - new Date(user.created_at ?? 0).getTime()
  if (ageMs > 24 * 60 * 60 * 1000) {
    return Response.json({ skipped: 'account_too_old' })
  }

  const email = user.email
  if (!email) return Response.json({ error: 'No email on account' }, { status: 400 })

  const supabase = createServerClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .single()

  const meta = (user.user_metadata ?? {}) as Record<string, string>
  const firstName =
    profile?.first_name ||
    meta.first_name ||
    meta.full_name?.split(' ')[0] ||
    'there'

  try {
    await sendWelcomeEmail({ to: email, firstName })
    return Response.json({ ok: true })
  } catch (e) {
    // Don't fail loudly — welcome email is non-critical
    console.error('Welcome email failed:', (e as Error).message)
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
