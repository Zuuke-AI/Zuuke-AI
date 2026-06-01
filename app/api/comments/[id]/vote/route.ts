import { createServerClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: commentId } = await params
  const { vote } = (await request.json()) as { vote: 1 | -1 | 0 }

  if (vote !== 1 && vote !== -1 && vote !== 0) {
    return Response.json({ error: 'vote must be 1, -1, or 0' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: existing } = await supabase
    .from('comment_votes')
    .select('vote')
    .eq('user_id', user.id)
    .eq('comment_id', commentId)
    .single()

  const prevVote = existing?.vote ?? 0
  if (prevVote === vote) return Response.json({ vote, prevVote })

  if (prevVote !== 0) {
    await supabase
      .from('comment_votes')
      .delete()
      .eq('user_id', user.id)
      .eq('comment_id', commentId)
  }

  if (vote !== 0) {
    await supabase.from('comment_votes').insert({ user_id: user.id, comment_id: commentId, vote })
  }

  const { data: votes } = await supabase
    .from('comment_votes')
    .select('vote')
    .eq('comment_id', commentId)

  const upvotes = votes?.filter(v => v.vote === 1).length ?? 0
  const downvotes = votes?.filter(v => v.vote === -1).length ?? 0
  const vote_score = upvotes - downvotes

  await supabase
    .from('comments')
    .update({ upvotes, downvotes, vote_score })
    .eq('id', commentId)

  return Response.json({ vote, prevVote, upvotes, downvotes, vote_score })
}
