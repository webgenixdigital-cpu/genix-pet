import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarWhatsApp } from '@/lib/whatsapp'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type PetResumo = { nome: string; servicos: string }

export async function POST(request: NextRequest) {
  const {
    tenantId,
    telefone,
    nomePet,
    servico,
    data,
    horario,
    pets,
    formaPagamento,
    precisaTransporte,
    enderecoColeta,
    transporteIdaVolta,
  } = await request.json()

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('nome, zapi_instance_id, zapi_token, whatsapp_conectado')
    .eq('id', tenantId)
    .single()

  if (!tenant?.whatsapp_conectado || !tenant.zapi_instance_id || !tenant.zapi_token) {
    return NextResponse.json({ enviado: false, motivo: 'WhatsApp nao conectado' })
  }

  let linhasPets = ''
  if (Array.isArray(pets) && pets.length > 0) {
    linhasPets = (pets as PetResumo[])
      .map((p) => `🐾 ${p.nome}: ${p.servicos}`)
      .join('\n')
  } else {
    linhasPets = `🐾 Pet: ${nomePet}\n✂️ Servico: ${servico}`
  }

  let linhaTransporte = ''
  if (precisaTransporte) {
    linhaTransporte = `\n\n🚐 Transporte: Sim${transporteIdaVolta ? ' (ida e volta)' : ' (somente ida)'}\n📍 Endereco de coleta: ${enderecoColeta || 'nao informado'}`
  } else {
    linhaTransporte = `\n\n🚐 Transporte: Nao (cliente leva/busca o pet)`
  }

  const linhaPagamento = formaPagamento ? `\n💳 Pagamento: ${formaPagamento}` : ''

  const mensagem = `Ola! Recebemos seu pedido de agendamento no ${tenant.nome}:\n\n${linhasPets}\n📅 Data: ${data}\n🕐 Horario: ${horario}${linhaPagamento}${linhaTransporte}\n\nEstamos analisando e em breve confirmaremos seu horario!`

  const resultado = await enviarWhatsApp(
    tenant.zapi_instance_id,
    tenant.zapi_token,
    telefone,
    mensagem
  )

  return NextResponse.json(resultado)
}