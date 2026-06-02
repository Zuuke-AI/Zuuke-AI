import { createServerClient } from '@/lib/supabase'

/** GET /api/profile/lookup?username=xxx — find email by username for login */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const raw = url.searchParams.get('username') ?? ''
  const username = raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')

  if (!username) return Response.json({ error: 'username required' }, { status: 400 })

  const supabase = createServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  if (!profile) return Response.json({ error: 'Username not found' }, { status: 404 })

  // Fetch email via admin API (service role required)
  const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)

  if (!user?.email) return Response.json({ error: 'User not found' }, { status: 404 })

  return Response.json({ email: user.email })
}
