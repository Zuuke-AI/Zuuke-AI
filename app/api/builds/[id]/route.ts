import { createServerClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

/** PATCH /api/builds/[id] — update mutable fields: is_built */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: buildId } = await params
  const supabase = createServerClient()

  const { data: build } = await supabase
    .from('builds')
    .select('user_id')
    .eq('id', buildId)
    .single()

  if (!build || build.user_id !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json()) as { is_built?: boolean }
  const updates: Record<string, unknown> = {}
  if (body.is_built !== undefined) {
    updates.is_built = !!body.is_built
    updates.built_at = body.is_built ? new Date().toISOString() : null
  }

  if (!Object.keys(updates).length) return Response.json({ error: 'Nothing to update' }, { status: 400 })

  const { error } = await supabase.from('builds').update(updates).eq('id', buildId)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

/** DELETE /api/builds/[id] — permanently delete a build (owner only) */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: buildId } = await params
  const supabase = createServerClient()

  // Verify ownership
  const { data: build } = await supabase
    .from('builds')
    .select('user_id')
    .eq('id', buildId)
    .single()

  if (!build || build.user_id !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete related rows first, then the build
  await supabase.from('build_votes').delete().eq('build_id', buildId)
  await supabase.from('comments').delete().eq('build_id', buildId)
  try {
    await supabase.from('notifications').delete().eq('build_id', buildId)
  } catch { /* notifications table may not exist yet */ }
  await supabase.from('builds').delete().eq('id', buildId)

  return Response.json({ ok: true })
}
