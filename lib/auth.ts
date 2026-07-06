import { createServerClient } from './supabase'
import type { User } from '@supabase/supabase-js'

export async function getUserFromRequest(request: Request): Promise<User | null> {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error ? null : user
}

/** Best-effort client IP from Vercel's forwarding headers. */
export function getClientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

const GUEST_DAILY_LIMIT = 5
const GUEST_MIN_INTERVAL_MS = 3000 // burst guard — blocks scripted rapid-fire

/**
 * Server-side enforcement for unauthenticated requests. The client also
 * tracks a 5-message guest limit in localStorage, but that's UX only —
 * it does nothing to stop someone calling the API directly. This is the
 * real gate.
 */
export async function checkGuestLimit(ip: string): Promise<{ allowed: boolean }> {
  if (ip === 'unknown') return { allowed: false }

  const supabase = createServerClient()
  // Atomic Postgres function — row-locks per ip+day so concurrent requests
  // from the same IP can't race past the count/interval check together.
  const { data, error } = await supabase.rpc('check_guest_rate_limit', {
    p_ip: ip,
    p_limit: GUEST_DAILY_LIMIT,
    p_min_interval_ms: GUEST_MIN_INTERVAL_MS,
  })

  if (error) return { allowed: false }
  return { allowed: data === true }
}

const FREE_LIMIT = 10

export async function checkMessageLimit(userId: string): Promise<{
  allowed: boolean
  isPro: boolean
}> {
  const supabase = createServerClient()

  // Ensure a profile row exists (first message ever for this user)
  const { data: existing } = await supabase.from('profiles').select('id').eq('id', userId).single()
  if (!existing) {
    await supabase
      .from('profiles')
      .insert({ id: userId, subscription_status: 'free', message_count_today: 0 })
  }

  // Atomic row-locked check+increment — closes the race a plain
  // select-then-update would have under concurrent requests from one account.
  const { data, error } = await supabase.rpc('check_and_increment_message_limit', {
    p_user_id: userId,
    p_limit: FREE_LIMIT,
  })

  if (error || !data?.length) return { allowed: false, isPro: false }
  return { allowed: data[0].allowed === true, isPro: data[0].is_pro === true }
}

export { FREE_LIMIT }
