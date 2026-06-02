import { createServerClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

/** PATCH /api/profile/update  body: { bio?, avatar_url?, first_name? }
 *  Updates public profile fields. */
export async function PATCH(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as {
    bio?: string
    avatar_url?: string
    first_name?: string
  }

  const updates: Record<string, unknown> = {}
  if (body.bio !== undefined) updates.bio = body.bio.trim().slice(0, 200)
  if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url
  if (body.first_name !== undefined) updates.first_name = body.first_name.trim().slice(0, 50)

  if (!Object.keys(updates).length) {
    return Response.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true, ...updates })
}
