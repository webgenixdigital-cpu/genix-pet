import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

export async function POST(request: NextRequest) {
  try {
    const { plano } = await request.json()

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { data: { user }, error: erroUser } = await supabaseAdmin.auth.getUser(token)

    if (erroUser || !user?.email) {
      return NextResponse.json({ error: 'Usuario invalido' }, { status: 401 })
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, nome')
      .eq('email', user.email)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant nao encontrado' }, { status: 404 })
    }

        const { data: planoData } = await supabaseAdmin
      .from('plans')
      .select('id, nome, preco_mensal')
      .ilike('nome', plano)
      .single()

    if (!planoData) {
      return NextResponse.json({ error: 'Plano nao encontrado' }, { status: 404 })
    }

    const preapproval = new PreApproval(client)

        const resultado = await preapproval.create({
      body: {
        reason: `Genix Pet - Plano ${planoData.nome}`,
        external_reference: `${tenant.id}:${planoData.id}`,
                payer_email: user.email,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: Number(planoData.preco_mensal),
          currency_id: 'BRL',
        },
        back_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/configuracoes?assinatura=sucesso`,
        status: 'pending',
      },
    })

    return NextResponse.json({ url: resultado.init_point })
      } catch (error: any) {
    console.error('Erro checkout MP:', error.message)
    return NextResponse.json({ error: error.message || 'Erro desconhecido' }, { status: 500 })
  }
}