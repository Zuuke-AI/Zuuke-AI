import { createServerClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

/** GET /api/notifications — returns last 20 notifications for the current user */
export async function GET(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, from_user_id, build_id, comment_id, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) return Response.json({ notifications: [], unread: 0 })

    const notifications = data ?? []

    // Enrich with profile info for from_user_id
    const fromUserIds = [...new Set(notifications.map(n => n.from_user_id).filter(Boolean))] as string[]
    let profileMap: Record<string, { username: string | null; first_name: string | null }> = {}
    if (fromUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, first_name')
        .in('id', fromUserIds)
      for (const p of profiles ?? []) {
        profileMap[p.id] = { username: p.username ?? null, first_name: p.first_name ?? null }
      }
    }

    // Enrich with build titles
    const buildIds = [...new Set(notifications.map(n => n.build_id).filter(Boolean))] as string[]
    let buildMap: Record<string, { title: string }> = {}
    if (buildIds.length > 0) {
      const { data: builds } = await supabase
        .from('builds')
        .select('id, title')
        .in('id', buildIds)
      for (const b of builds ?? []) buildMap[b.id] = { title: b.title }
    }

    const enriched = notifications.map(n => ({
      ...n,
      from_user: n.from_user_id ? (profileMap[n.from_user_id] ?? null) : null,
      build: n.build_id ? (buildMap[n.build_id] ?? null) : null,
    }))

    const unread = enriched.filter(n => !n.read).length

    return Response.json({ notifications: enriched, unread })
  } catch {
    return Response.json({ notifications: [], unread: 0 })
  }
}

/** POST /api/notifications/read — marks all notifications as read */
export async function POST(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  try {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
  } catch { /* noop if table doesn't exist yet */ }

  return Response.json({ ok: true })
}
