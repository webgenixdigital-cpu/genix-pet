import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarWhatsApp } from '@/lib/whatsapp'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }

  const amanha = new Date()
  amanha.setDate(amanha.getDate() + 1)
  const inicioAmanha = new Date(amanha.setHours(0, 0, 0, 0)).toISOString()
  const fimAmanha = new Date(amanha.setHours(23, 59, 59, 999)).toISOString()

  const { data: agendamentos } = await supabaseAdmin
    .from('appointments')
    .select(`
      id, inicio,
      customers ( telefone ),
      pets ( nome ),
      services ( nome ),
      tenants ( nome, zapi_instance_id, zapi_token, whatsapp_conectado )
    `)
    .in('status', ['agendado', 'confirmado'])
    .gte('inicio', inicioAmanha)
    .lte('inicio', fimAmanha)

  if (!agendamentos || agendamentos.length === 0) {
    return NextResponse.json({ enviados: 0, mensagem: 'Nenhum lembrete para enviar' })
  }

  let enviados = 0

  for (const a of agendamentos as any[]) {
    const tenant = a.tenants
    if (!tenant?.whatsapp_conectado || !tenant.zapi_instance_id || !tenant.zapi_token) continue
    if (!a.customers?.telefone) continue

    const horario = new Date(a.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    const mensagem = `Ola! Passando para lembrar do agendamento de amanha no ${tenant.nome}:\n\n🐾 Pet: ${a.pets?.nome}\n✂️ Servico: ${a.services?.nome}\n🕐 Horario: ${horario}\n\nAte amanha!`

    await enviarWhatsApp(tenant.zapi_instance_id, tenant.zapi_token, a.customers.telefone, mensagem)
    enviados++
  }

  return NextResponse.json({ enviados })
}