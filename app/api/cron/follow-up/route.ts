import { createServerClient } from '@/lib/supabase'
import { sendFollowUpEmail } from '@/lib/email'

// Vercel calls this daily at 11:00 UTC
// Sends a "Did you build it?" email to users whose first build was created ~30 days ago
export const maxDuration = 60

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const supabase = createServerClient()

  // Find builds created 29-31 days ago (catch the ~30 day window)
  const from = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()
  const to   = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString()

  const { data: builds, error } = await supabase
    .from('builds')
    .select('id, title, user_id')
    .gte('created_at', from)
    .lte('created_at', to)
    .not('user_id', 'is', null)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!builds?.length) return Response.json({ sent: 0 })

  // Deduplicate — only send to each user once (pick their most recent qualifying build)
  const seen = new Set<string>()
  const toSend = builds.filter(b => {
    if (seen.has(b.user_id)) return false
    seen.add(b.user_id)
    return true
  })

  const { data: users } = await supabase.auth.admin.listUsers()
  const userMap = new Map(
    (users?.users ?? []).map(u => [u.id, { email: u.email ?? '', meta: u.user_metadata ?? {} }])
  )

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name')
    .in('id', toSend.map(b => b.user_id))

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  let sent = 0
  const errors: string[] = []

  for (const build of toSend) {
    const userAuth = userMap.get(build.user_id)
    const profile = profileMap.get(build.user_id)
    if (!userAuth?.email) continue

    const firstName =
      profile?.first_name ||
      userAuth.meta?.first_name ||
      userAuth.meta?.full_name?.split(' ')[0] ||
      'there'

    try {
      await sendFollowUpEmail({
        to: userAuth.email,
        firstName,
        buildId: build.id,
        buildTitle: build.title,
      })
      sent++
    } catch (e) {
      errors.push(`${build.user_id}: ${e}`)
    }

    await new Promise(r => setTimeout(r, 100))
  }

  return Response.json({ sent, errors: errors.length > 0 ? errors : undefined })
}
