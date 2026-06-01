export const dynamic = 'force-dynamic'

import Stripe from 'stripe'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const body = await request.text()
  const sig = request.headers.get('stripe-signature') ?? ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return Response.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', (err as Error).message)
    return Response.json({ error: (err as Error).message }, { status: 400 })
  }

  const supabase = createServerClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as { customer: string; subscription: string }
    await supabase
      .from('profiles')
      .update({ subscription_status: 'pro', subscription_id: session.subscription })
      .eq('stripe_customer_id', session.customer)
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as { customer: string }
    await supabase
      .from('profiles')
      .update({ subscription_status: 'free', subscription_id: null })
      .eq('stripe_customer_id', sub.customer)
  }

  return Response.json({ received: true })
}
