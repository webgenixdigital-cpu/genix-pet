import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarWhatsApp } from '@/lib/whatsapp'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const { tenantId, telefone, nomePet } = await request.json()

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('nome, zapi_instance_id, zapi_token, whatsapp_conectado')
    .eq('id', tenantId)
    .single()

  if (!tenant?.whatsapp_conectado || !tenant.zapi_instance_id || !tenant.zapi_token) {
    return NextResponse.json({ enviado: false, motivo: 'WhatsApp nao conectado' })
  }

  const mensagem = `${nomePet} esta pronto(a) e te esperando! 🐾✨\n\nAproveitando que voce esta por aqui: gostaria de levar algum petisco, racao ou outro produto que esteja precisando? E so responder aqui que a gente separa para voce!`

  const resultado = await enviarWhatsApp(
    tenant.zapi_instance_id,
    tenant.zapi_token,
    telefone,
    mensagem
  )

  console.log('Resultado pet-pronto:', JSON.stringify(resultado))

  return NextResponse.json(resultado)
}