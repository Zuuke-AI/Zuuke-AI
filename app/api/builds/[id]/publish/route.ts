import { createServerClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

/** POST /api/builds/[id]/publish  body: { community_body?, image_url? }
 *  Marks the build as public so it appears in the community feed.
 *  Only the build owner can publish. */
export async function POST(
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

  const { community_body, image_url } = (await request.json()) as {
    community_body?: string
    image_url?: string
  }

  const { error } = await supabase
    .from('builds')
    .update({
      is_public: true,
      community_body: community_body?.trim() ?? null,
      image_url: image_url ?? null,
    })
    .eq('id', buildId)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}

/** DELETE /api/builds/[id]/publish — unpublish (remove from community) */
export async function DELETE(
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

  await supabase.from('builds').update({ is_public: false }).eq('id', buildId)

  return Response.json({ ok: true })
}
