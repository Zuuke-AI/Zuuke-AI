import { createServerClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

type ProfileMap = Record<string, { username: string | null; first_name: string | null }>

async function attachProfiles(
  supabase: ReturnType<typeof createServerClient>,
  comments: { user_id: string }[]
): Promise<ProfileMap> {
  const userIds = [...new Set(comments.map(c => c.user_id).filter(Boolean))]
  if (!userIds.length) return {}
  const { data } = await supabase
    .from('profiles')
    .select('id, username, first_name')
    .in('id', userIds)
  const map: ProfileMap = {}
  for (const p of data ?? []) map[p.id] = { username: p.username ?? null, first_name: p.first_name ?? null }
  return map
}

/** GET /api/builds/[id]/comments */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: buildId } = await params
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('comments')
    .select('id, parent_id, content, vote_score, upvotes, downvotes, created_at, user_id')
    .eq('build_id', buildId)
    .order('vote_score', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const comments = data ?? []
  const profileMap = await attachProfiles(supabase, comments)

  const result = comments.map(c => ({
    ...c,
    profiles: profileMap[c.user_id] ?? null,
  }))

  return Response.json({ comments: result })
}

/** POST /api/builds/[id]/comments */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: buildId } = await params
  const { content, parent_id } = (await request.json()) as {
    content: string
    parent_id?: string | null
  }

  if (!content?.trim() || content.length > 5000) {
    return Response.json({ error: 'content must be 1–5000 chars' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('comments')
    .insert({
      build_id: buildId,
      user_id: user.id,
      parent_id: parent_id ?? null,
      content: content.trim(),
    })
    .select('id, parent_id, content, vote_score, upvotes, downvotes, created_at, user_id')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Attach profile
  const profileMap = await attachProfiles(supabase, [data])
  const comment = { ...data, profiles: profileMap[data.user_id] ?? null }

  // Update comment_count on build
  const { count } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('build_id', buildId)
  await supabase.from('builds').update({ comment_count: count ?? 0 }).eq('id', buildId)

  // Fire notification to build owner (new comment) or parent comment author (reply) — fire-and-forget
  const notifType = parent_id ? 'new_reply' : 'new_comment'
  void (async () => {
    try {
      if (!parent_id) {
        const { data: build } = await supabase.from('builds').select('user_id').eq('id', buildId).single()
        if (build?.user_id && build.user_id !== user.id) {
          await supabase.from('notifications').insert({
            user_id: build.user_id,
            type: notifType,
            from_user_id: user.id,
            build_id: buildId,
            comment_id: data.id,
          })
        }
      } else {
        const { data: parentComment } = await supabase.from('comments').select('user_id').eq('id', parent_id).single()
        if (parentComment?.user_id && parentComment.user_id !== user.id) {
          await supabase.from('notifications').insert({
            user_id: parentComment.user_id,
            type: 'new_reply',
            from_user_id: user.id,
            build_id: buildId,
            comment_id: data.id,
          })
        }
      }
    } catch { /* noop */ }
  })()

  return Response.json({ comment })
}

/** DELETE /api/builds/[id]/comments?comment_id=xxx */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const commentId = url.searchParams.get('comment_id')
  if (!commentId) return Response.json({ error: 'comment_id required' }, { status: 400 })

  const { id: buildId } = await params
  const supabase = createServerClient()

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id)
    .eq('build_id', buildId)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { count } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('build_id', buildId)
  await supabase.from('builds').update({ comment_count: count ?? 0 }).eq('id', buildId)

  return Response.json({ ok: true })
}
