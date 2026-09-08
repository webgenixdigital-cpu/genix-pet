import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await request.json()

    if (!tenantId) {
      return NextResponse.json({ erro: 'tenantId obrigatorio' }, { status: 400 })
    }

        const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('nome, email, plan_id, plans(nome, preco_mensal)')
      .eq('id', tenantId)
      .single()

    if (!tenant) {
      return NextResponse.json({ erro: 'Tenant nao encontrado' }, { status: 404 })
    }

    const valor = (tenant as any).plans?.preco_mensal || 0

    const resposta = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${tenantId}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: valor,
        description: `Mensalidade Genix Pet - ${tenant.nome}`,
        payment_method_id: 'pix',
        payer: {
          email: tenant.email,
        },
        metadata: {
          tenant_id: tenantId,
        },
      }),
    })

    const dados = await resposta.json()

    if (!resposta.ok) {
      console.error('Erro Mercado Pago:', dados)
      return NextResponse.json({ erro: 'Falha ao gerar Pix', detalhes: dados }, { status: 500 })
    }

    await supabaseAdmin
      .from('tenants')
      .update({ mensalidade_pix_txid: String(dados.id) })
      .eq('id', tenantId)

    return NextResponse.json({
      ok: true,
      qrCodeBase64: dados.point_of_interaction?.transaction_data?.qr_code_base64,
      pixCopiaECola: dados.point_of_interaction?.transaction_data?.qr_code,
      paymentId: dados.id,
    })
  } catch (erro) {
    console.error('Erro ao gerar Pix:', erro)
    return NextResponse.json({ erro: String(erro) }, { status: 500 })
  }
}