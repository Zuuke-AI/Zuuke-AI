import { createServerClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

function generateCode(userId: string): string {
  // Deterministic 6-char code from user ID (no collision risk in practice)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0
  }
  let code = ''
  let n = Math.abs(hash)
  for (let i = 0; i < 6; i++) {
    code += chars[n % chars.length]
    n = Math.floor(n / chars.length)
  }
  return code
}

/** GET /api/referral — get or create the user's referral code */
export async function GET(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', user.id)
    .single()

  if (profile?.referral_code) {
    return Response.json({ code: profile.referral_code })
  }

  // Generate and save
  const code = generateCode(user.id)
  await supabase.from('profiles').update({ referral_code: code }).eq('id', user.id)
  return Response.json({ code })
}

/** POST /api/referral  body: { code } — redeem a referral code on signup */
export async function POST(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = (await request.json()) as { code: string }
  if (!code) return Response.json({ error: 'code required' }, { status: 400 })

  const supabase = createServerClient()

  // Make sure user hasn't already redeemed
  const { data: self } = await supabase
    .from('profiles')
    .select('referred_by')
    .eq('id', user.id)
    .single()

  if (self?.referred_by) return Response.json({ error: 'Already redeemed' }, { status: 400 })

  // Verify code exists and isn't their own
  const { data: referrer } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', code.toUpperCase())
    .single()

  if (!referrer) return Response.json({ error: 'Invalid code' }, { status: 404 })
  if (referrer.id === user.id) return Response.json({ error: 'Cannot use your own code' }, { status: 400 })

  await supabase.from('profiles').update({ referred_by: code.toUpperCase() }).eq('id', user.id)
  return Response.json({ ok: true })
}
