import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarWhatsApp } from '@/lib/whatsapp'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const { tenantId, telefone, nomePet, servico, data, horario } = await request.json()

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('nome, zapi_instance_id, zapi_token, whatsapp_conectado')
    .eq('id', tenantId)
    .single()

  if (!tenant?.whatsapp_conectado || !tenant.zapi_instance_id || !tenant.zapi_token) {
    return NextResponse.json({ enviado: false, motivo: 'WhatsApp nao conectado' })
  }

  const mensagem = `Ola! Passando para lembrar do agendamento de amanha no ${tenant.nome}:\n\n🐾 Pet: ${nomePet}\n✂️ Servico: ${servico}\n📅 Data: ${data}\n🕐 Horario: ${horario}\n\nContamos com voce! Caso precise remarcar, e so nos avisar.`

  const resultado = await enviarWhatsApp(
    tenant.zapi_instance_id,
    tenant.zapi_token,
    telefone,
    mensagem
  )

  return NextResponse.json(resultado)
}