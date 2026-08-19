import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const VALORES_CENTAVOS: Record<string, number> = {
  starter: 17990,
  premium: 24790,
  pro: 37990,
}

export async function POST(request: NextRequest) {
  const { plano } = await request.json()

  const valor = VALORES_CENTAVOS[plano]

  if (!valor) {
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
    mode: 'payment',
    payment_method_types: ['pix'],
    line_items: [{
      price_data: {
        currency: 'brl',
        product_data: { name: `Genix Pet - Plano ${plano} (mensalidade via Pix)` },
        unit_amount: valor,
      },
      quantity: 1,
    }],
    customer_email: tenant.email,
    success_url: `${request.nextUrl.origin}/dashboard/configuracoes?assinatura=sucesso`,
    cancel_url: `${request.nextUrl.origin}/dashboard/configuracoes?assinatura=cancelado`,
    metadata: {
      tenant_id: tenant.id,
      plano,
      tipo: 'pix_avulso',
    },
  })

  return NextResponse.json({ url: session.url })
}