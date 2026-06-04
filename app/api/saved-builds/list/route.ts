import { createServerClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

/** GET /api/saved-builds/list — all builds saved by the current user */
export async function GET(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('saved_builds')
    .select('build_id, saved_at')
    .eq('user_id', user.id)
    .order('saved_at', { ascending: false })
    .limit(200)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const buildIds = (data ?? []).map(r => r.build_id)
  if (!buildIds.length) return Response.json({ builds: [] })

  const { data: builds } = await supabase
    .from('builds')
    .select('id, title, budget, use_case, is_public, vote_score, comment_count, created_at, user_id')
    .in('id', buildIds)

  return Response.json({ builds: builds ?? [] })
}
