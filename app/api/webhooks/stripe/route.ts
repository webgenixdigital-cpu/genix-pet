import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const tenantId = session.metadata?.tenant_id
    const plano = session.metadata?.plano

    if (tenantId) {
      const nomesPlano: Record<string, string> = {
        starter: 'Starter',
        premium: 'Crescimento',
        pro: 'Pro',
      }

      const { data: planoEncontrado } = await supabaseAdmin
        .from('plans')
        .select('id')
        .eq('nome', nomesPlano[plano] || 'Starter')
        .single()

      await supabaseAdmin
        .from('tenants')
        .update({ status: 'active', plan_id: planoEncontrado?.id })
        .eq('id', tenantId)

      await supabaseAdmin
        .from('subscriptions')
        .upsert({
          tenant_id: tenantId,
          plan_id: planoEncontrado?.id,
          status: 'active',
          preco_atual: session.amount_total / 100,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
        }, { onConflict: 'tenant_id' })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as any

    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', subscription.id)
  }

  return NextResponse.json({ received: true })
}