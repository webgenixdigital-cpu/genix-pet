import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

function validarAssinatura(request: NextRequest, dataId: string): boolean {
  const xSignature = request.headers.get('x-signature')
  const xRequestId = request.headers.get('x-request-id')

  if (!xSignature || !xRequestId) return false

  const partes = xSignature.split(',').reduce((acc: Record<string, string>, parte) => {
    const [chave, valor] = parte.split('=')
    if (chave && valor) acc[chave.trim()] = valor.trim()
    return acc
  }, {})

  const ts = partes['ts']
  const hashRecebido = partes['v1']

  if (!ts || !hashRecebido) return false

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const hashCalculado = crypto
    .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET!)
    .update(manifest)
    .digest('hex')

  return hashCalculado === hashRecebido
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const dataId = body.data?.id || body.id

    if (!validarAssinatura(request, String(dataId))) {
      console.error('Webhook MP: assinatura invalida')
      return NextResponse.json({ error: 'Assinatura invalida' }, { status: 401 })
    }

    const tipo = body.type || body.topic
    const preapprovalId = body.data?.id || body.id

    if (tipo !== 'preapproval' || !preapprovalId) {
      return NextResponse.json({ recebido: true })
    }

    const preapproval = new PreApproval(client)
    const dados = await preapproval.get({ id: preapprovalId })

    if (dados.status !== 'authorized') {
      return NextResponse.json({ recebido: true })
    }

    const [tenantId, planId] = (dados.external_reference || '').split(':')

    if (!tenantId || !planId) {
      return NextResponse.json({ recebido: true })
    }

    await supabaseAdmin
      .from('tenants')
      .update({
        plan_id: planId,
        status: 'active',
        mp_preapproval_id: preapprovalId,
      })
      .eq('id', tenantId)

    return NextResponse.json({ recebido: true })
  } catch (error: any) {
    console.error('Erro webhook MP:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}