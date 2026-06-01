import { createServerClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

/** GET /api/builds/[id]/comments — fetch all comments for a build (with author usernames) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: buildId } = await params
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('comments')
    .select(`
      id, parent_id, content, vote_score, upvotes, downvotes, created_at, user_id,
      profiles:user_id ( username, first_name )
    `)
    .eq('build_id', buildId)
    .order('vote_score', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ comments: data ?? [] })
}

/** POST /api/builds/[id]/comments — post a new comment */
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
    .select(`
      id, parent_id, content, vote_score, upvotes, downvotes, created_at, user_id,
      profiles:user_id ( username, first_name )
    `)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Recount and update comment_count on build
  const { count } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('build_id', buildId)
  await supabase.from('builds').update({ comment_count: count ?? 0 }).eq('id', buildId)

  return Response.json({ comment: data })
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

  // Recount
  const { count } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('build_id', buildId)
  await supabase.from('builds').update({ comment_count: count ?? 0 }).eq('id', buildId)

  return Response.json({ ok: true })
}
