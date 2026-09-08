import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

import crypto from 'crypto'

function validarAssinatura(request: NextRequest, dataId: string): boolean {
  const xSignature = request.headers.get('x-signature')
  const xRequestId = request.headers.get('x-request-id')
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET

  if (!xSignature || !xRequestId || !secret) return false

  const partes = xSignature.split(',').reduce((acc: Record<string, string>, parte) => {
    const [chave, valor] = parte.split('=')
    if (chave && valor) acc[chave.trim()] = valor.trim()
    return acc
  }, {})

  const ts = partes['ts']
  const v1 = partes['v1']
  if (!ts || !v1) return false

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

  return hash === v1
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.type !== 'payment') {
      return NextResponse.json({ ok: true })
    }

    const paymentId = body.data?.id
    if (!paymentId) {
      return NextResponse.json({ ok: true })
    }

    if (!validarAssinatura(request, String(paymentId))) {
      console.error('Assinatura invalida no webhook Mercado Pago')
      return NextResponse.json({ erro: 'Assinatura invalida' }, { status: 401 })
    }

    const resposta = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
    })
    const pagamento = await resposta.json()

    if (pagamento.status === 'approved') {
      const tenantId = pagamento.metadata?.tenant_id

      if (tenantId) {
        const novoVencimento = new Date()
        novoVencimento.setDate(novoVencimento.getDate() + 30)

        await supabaseAdmin
          .from('tenants')
          .update({
            mensalidade_status: 'em_dia',
            mensalidade_vence_em: novoVencimento.toISOString().split('T')[0],
            status: 'active',
          })
          .eq('id', tenantId)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (erro) {
    console.error('Erro no webhook Mercado Pago:', erro)
    return NextResponse.json({ ok: false, erro: String(erro) }, { status: 500 })
  }
}