import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const { plano } = await request.json()

  const precos: Record<string, string> = {
    starter: process.env.STRIPE_PRICE_STARTER!,
    premium: process.env.STRIPE_PRICE_PREMIUM!,
    pro: process.env.STRIPE_PRICE_PRO!,
  }

  const priceId = precos[plano]

  if (!priceId) {
    return NextResponse.json({ error: 'Plano invalido' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, nome, email')
    .eq('email', user.email!)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant nao encontrado' }, { status: 404 })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: tenant.email,
    success_url: `${request.nextUrl.origin}/dashboard/configuracoes?assinatura=sucesso`,
    cancel_url: `${request.nextUrl.origin}/dashboard/configuracoes?assinatura=cancelado`,
    metadata: {
      tenant_id: tenant.id,
      plano,
    },
  })

  return NextResponse.json({ url: session.url })
}