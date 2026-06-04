import { createServerClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

/** GET /api/saved-builds?build_id=xxx — check if current user has saved this build */
export async function GET(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ saved: false })

  const buildId = new URL(request.url).searchParams.get('build_id')
  if (!buildId) return Response.json({ saved: false })

  const supabase = createServerClient()
  const { data } = await supabase
    .from('saved_builds')
    .select('id')
    .eq('user_id', user.id)
    .eq('build_id', buildId)
    .single()

  return Response.json({ saved: !!data })
}

/** POST /api/saved-builds  body: { build_id } — save a build */
export async function POST(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { build_id } = (await request.json()) as { build_id: string }
  if (!build_id) return Response.json({ error: 'build_id required' }, { status: 400 })

  const supabase = createServerClient()
  const { error } = await supabase
    .from('saved_builds')
    .upsert({ user_id: user.id, build_id }, { onConflict: 'user_id,build_id' })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true, saved: true })
}

/** DELETE /api/saved-builds?build_id=xxx — unsave a build */
export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const buildId = new URL(request.url).searchParams.get('build_id')
  if (!buildId) return Response.json({ error: 'build_id required' }, { status: 400 })

  const supabase = createServerClient()
  await supabase
    .from('saved_builds')
    .delete()
    .eq('user_id', user.id)
    .eq('build_id', buildId)

  return Response.json({ ok: true, saved: false })
}
