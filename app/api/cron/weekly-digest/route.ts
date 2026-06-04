import { createServerClient } from '@/lib/supabase'
import { sendWeeklyDigest } from '@/lib/email'

// Vercel calls this every Monday at 10:00 UTC (vercel.json cron schedule)
export const maxDuration = 60

export async function GET(request: Request) {
  // Verify this was called by Vercel cron (not a random public request)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const supabase = createServerClient()

  // Fetch this week's top community build (Build of the Week)
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: botw } = await supabase
    .from('builds')
    .select('id, title, budget, vote_score')
    .eq('is_public', true)
    .gte('created_at', oneWeekAgo)
    .order('vote_score', { ascending: false })
    .limit(1)
    .single()

  const featuredBuild = botw ?? null

  // Fetch all users who have at least one saved public build
  const { data: buildOwners, error } = await supabase
    .from('builds')
    .select('user_id')
    .eq('is_public', true)
    .not('user_id', 'is', null)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Deduplicate user IDs
  const userIds = [...new Set((buildOwners ?? []).map(b => b.user_id as string))]
  if (userIds.length === 0) return Response.json({ sent: 0 })

  // Fetch profiles (email + first_name) for those users
  const { data: users } = await supabase.auth.admin.listUsers()
  const userMap = new Map(
    (users?.users ?? []).map(u => [u.id, { email: u.email ?? '', meta: u.user_metadata ?? {} }])
  )

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name')
    .in('id', userIds)

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  let sent = 0
  const errors: string[] = []

  for (const userId of userIds) {
    const userAuth = userMap.get(userId)
    const profile = profileMap.get(userId)
    if (!userAuth?.email) continue

    const firstName =
      profile?.first_name ||
      userAuth.meta?.first_name ||
      userAuth.meta?.full_name?.split(' ')[0] ||
      'there'

    // Fetch this user's builds
    const { data: builds } = await supabase
      .from('builds')
      .select('id, title, budget, vote_score')
      .eq('user_id', userId)
      .eq('is_public', true)
      .order('vote_score', { ascending: false })
      .limit(5)

    if (!builds?.length) continue

    try {
      await sendWeeklyDigest({
        to: userAuth.email,
        firstName,
        builds,
        featuredBuild,
      })
      sent++
    } catch (e) {
      errors.push(`${userId}: ${e}`)
    }

    // Rate limit: don't blast all at once
    await new Promise(r => setTimeout(r, 100))
  }

  return Response.json({ sent, errors: errors.length > 0 ? errors : undefined })
}
