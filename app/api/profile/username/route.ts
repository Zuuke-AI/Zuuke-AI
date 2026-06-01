import { createServerClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

/** GET /api/profile/username?check=someusername — public availability check */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const raw = url.searchParams.get('check') ?? ''
  const clean = raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')

  if (clean.length < 3 || clean.length > 30) {
    return Response.json({ available: false, reason: 'invalid' })
  }

  // Optionally exclude current user's own username (pass ?userId=xxx)
  const userId = url.searchParams.get('userId') ?? null
  const supabase = createServerClient()

  let query = supabase.from('profiles').select('id').eq('username', clean)
  if (userId) query = query.neq('id', userId)

  const { data } = await query.single()
  return Response.json({ available: !data, username: clean })
}

/** PATCH /api/profile/username  body: { username: string } */
export async function PATCH(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { username } = (await request.json()) as { username: string }

  if (!username || typeof username !== 'string') {
    return Response.json({ error: 'username required' }, { status: 400 })
  }

  const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')

  if (clean.length < 3 || clean.length > 30) {
    return Response.json({ error: 'Username must be 3–30 characters' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Check uniqueness
  const { data: taken } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', clean)
    .neq('id', user.id)
    .single()

  if (taken) return Response.json({ error: 'Username already taken' }, { status: 409 })

  const { error } = await supabase
    .from('profiles')
    .update({ username: clean })
    .eq('id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ username: clean })
}
