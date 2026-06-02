import { createServerClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

/** GET /api/follow?following_id=userId — check if current user follows that user */
export async function GET(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ isFollowing: false })

  const url = new URL(request.url)
  const followingId = url.searchParams.get('following_id')
  if (!followingId) return Response.json({ isFollowing: false })

  const supabase = createServerClient()

  try {
    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', followingId)
      .single()

    return Response.json({ isFollowing: !!data })
  } catch {
    return Response.json({ isFollowing: false })
  }
}

/** POST /api/follow — follow a user  body: { following_id } */
export async function POST(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { following_id } = (await request.json()) as { following_id: string }
  if (!following_id) return Response.json({ error: 'following_id required' }, { status: 400 })
  if (following_id === user.id) return Response.json({ error: 'Cannot follow yourself' }, { status: 400 })

  const supabase = createServerClient()

  try {
    await supabase
      .from('follows')
      .upsert({ follower_id: user.id, following_id }, { onConflict: 'follower_id,following_id' })

    // Fire notification to the followed user (fire-and-forget)
    void supabase.from('notifications').insert({
      user_id: following_id,
      type: 'new_follower',
      from_user_id: user.id,
    })

    return Response.json({ ok: true, isFollowing: true })
  } catch {
    return Response.json({ error: 'Could not follow user' }, { status: 500 })
  }
}

/** DELETE /api/follow?following_id=userId — unfollow a user */
export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const followingId = url.searchParams.get('following_id')
  if (!followingId) return Response.json({ error: 'following_id required' }, { status: 400 })

  const supabase = createServerClient()

  try {
    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', followingId)

    return Response.json({ ok: true, isFollowing: false })
  } catch {
    return Response.json({ error: 'Could not unfollow user' }, { status: 500 })
  }
}
