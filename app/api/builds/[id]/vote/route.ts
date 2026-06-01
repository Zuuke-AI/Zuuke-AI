import { createServerClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

/** POST /api/builds/[id]/vote  body: { vote: 1 | -1 | 0 }
 *  vote=0 removes the existing vote (toggle off)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: buildId } = await params
  const { vote } = (await request.json()) as { vote: 1 | -1 | 0 }

  if (vote !== 1 && vote !== -1 && vote !== 0) {
    return Response.json({ error: 'vote must be 1, -1, or 0' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Get existing vote
  const { data: existing } = await supabase
    .from('build_votes')
    .select('vote')
    .eq('user_id', user.id)
    .eq('build_id', buildId)
    .single()

  const prevVote = existing?.vote ?? 0

  // Nothing changed
  if (prevVote === vote) return Response.json({ vote, prevVote })

  // Remove old vote
  if (prevVote !== 0) {
    await supabase
      .from('build_votes')
      .delete()
      .eq('user_id', user.id)
      .eq('build_id', buildId)
  }

  // Insert new vote (unless toggling off)
  if (vote !== 0) {
    await supabase.from('build_votes').insert({ user_id: user.id, build_id: buildId, vote })
  }

  // Recount and update build
  const { data: votes } = await supabase
    .from('build_votes')
    .select('vote')
    .eq('build_id', buildId)

  const upvotes = votes?.filter(v => v.vote === 1).length ?? 0
  const downvotes = votes?.filter(v => v.vote === -1).length ?? 0
  const vote_score = upvotes - downvotes

  await supabase
    .from('builds')
    .update({ upvotes, downvotes, vote_score })
    .eq('id', buildId)

  return Response.json({ vote, prevVote, upvotes, downvotes, vote_score })
}
