import { createServerClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'
import Stripe from 'stripe'

/** DELETE /api/profile/delete-account — cancel subscription + erase all data */
export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  // 1. Fetch profile for Stripe info
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, subscription_id, subscription_status')
    .eq('id', user.id)
    .single()

  // 2. Cancel Stripe subscription if active
  if (profile?.subscription_id && profile?.subscription_status === 'pro') {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
      await stripe.subscriptions.cancel(profile.subscription_id)
    } catch (err) {
      console.error('Stripe cancel error during account deletion:', (err as Error).message)
      // Non-fatal — continue deleting the account
    }
  }

  // 3. Delete user data in safe order (child rows first)
  await supabase.from('build_votes').delete().eq('user_id', user.id)
  await supabase.from('comment_votes').delete().eq('user_id', user.id)
  await supabase.from('comments').delete().eq('user_id', user.id)
  await supabase.from('builds').delete().eq('user_id', user.id)
  await supabase.from('profiles').delete().eq('id', user.id)

  // 4. Delete the auth user (must be last)
  const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}

/** POST /api/profile/delete-account — cancel subscription only (keep account) */
export async function POST(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_id, subscription_status')
    .eq('id', user.id)
    .single()

  if (!profile?.subscription_id || profile?.subscription_status !== 'pro') {
    return Response.json({ error: 'No active subscription' }, { status: 400 })
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    await stripe.subscriptions.cancel(profile.subscription_id)
    await supabase
      .from('profiles')
      .update({ subscription_status: 'free', subscription_id: null })
      .eq('id', user.id)
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
