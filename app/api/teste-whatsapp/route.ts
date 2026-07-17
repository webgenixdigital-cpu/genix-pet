import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const telefone = request.nextUrl.searchParams.get('telefone')

  if (!telefone) {
    return NextResponse.json({ error: 'Passe ?telefone=5535999999999 na URL' }, { status: 400 })
  }

  const instanceId = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: telefone,
      message: 'Teste do Genix Pet! Sua integracao com WhatsApp esta funcionando.',
    }),
  })

  const data = await res.json()

  return NextResponse.json(data)
}