'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Agendamento = {
  id: string
  inicio: string
  fim: string
  status: string
  preco_cobrado: number | null
  precisa_transporte: boolean
  endereco_coleta: string | null
  endereco_entrega: string | null
  customers: { nome: string; telefone: string } | null
  pets: { nome: string } | null
  professionals: { nome: string; cor_agenda: string } | null
  services: { nome: string } | null
}

const COLUNAS = [
  { status: 'em_espera', label: 'Aguardando aprovacao', cor: 'bg-yellow-100' },
  { status: 'agendado', label: 'Agendado', cor: 'bg-gray-100' },
  { status: 'confirmado', label: 'Confirmado', cor: 'bg-blue-100' },
  { status: 'em_atendimento', label: 'Em atendimento', cor: 'bg-purple-100' },
  { status: 'concluido', label: 'Concluido', cor: 'bg-green-100' },
]

const PROXIMO_STATUS: Record<string, string> = {
  em_espera: 'agendado',
  agendado: 'confirmado',
  confirmado: 'em_atendimento',
  em_atendimento: 'concluido',
}

function formatarDataISO(data: Date): string {
  return data.toISOString().split('T')[0]
}

export default function AgendaPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [dataFiltro, setDataFiltro] = useState(formatarDataISO(new Date()))
  const supabase = createClient()

  async function carregarAgendamentos() {
    setCarregando(true)
    const { data: tenant } = await supabase.from('tenants').select('id').single()
    if (!tenant) return

    const { data } = await supabase
      .from('appointments')
      .select(`
        id, inicio, fim, status, preco_cobrado, precisa_transporte, endereco_coleta, endereco_entrega,
        customers ( nome, telefone ),
        pets ( nome ),
        professionals ( nome, cor_agenda ),
        services ( nome )
      `)
      .eq('tenant_id', tenant.id)
      .gte('inicio', dataFiltro + 'T00:00:00')
      .lte('inicio', dataFiltro + 'T23:59:59')
      .neq('status', 'cancelado')
      .neq('status', 'faltou')
      .order('inicio')

    setAgendamentos((data as any) || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregarAgendamentos()
  }, [dataFiltro])

  async function avancarStatus(id: string, statusAtual: string) {
    const proximo = PROXIMO_STATUS[statusAtual]
    if (!proximo) return

    await supabase.from('appointments').update({ status: proximo }).eq('id', id)

    if (proximo === 'concluido') {
      const agendamento = agendamentos.find(a => a.id === id)
      if (agendamento) {
        const { data: tenant } = await supabase.from('tenants').select('id').single()
        if (tenant) {
          await supabase.from('financial_transactions').insert({
            tenant_id: tenant.id,
            tipo: 'receita',
            categoria: 'Servico',
            descricao: `${agendamento.services?.nome} - ${agendamento.pets?.nome}`,
            valor: agendamento.preco_cobrado || 0,
            data_lancamento: new Date().toISOString().split('T')[0],
            status: 'pago',
            appointment_id: id,
          })
          fetch('/api/notificar/pet-pronto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantId: tenant.id,
              telefone: agendamento.customers?.telefone,
              nomePet: agendamento.pets?.nome,
            }),
          }).catch(() => {})

          const { data: agendamentoCompleto } = await supabase
            .from('appointments')
            .select('professional_id, preco_cobrado')
            .eq('id', id)
            .single()

          if (agendamentoCompleto?.professional_id) {
            const { data: profissional } = await supabase
              .from('professionals')
              .select('percentual_comissao')
              .eq('id', agendamentoCompleto.professional_id)
              .single()

            if (profissional && profissional.percentual_comissao > 0) {
              const valorComissao = (agendamentoCompleto.preco_cobrado || 0) * (profissional.percentual_comissao / 100)

              await supabase.from('commissions').insert({
                tenant_id: tenant.id,
                professional_id: agendamentoCompleto.professional_id,
                appointment_id: id,
                tipo_calculo: 'percentual',
                percentual: profissional.percentual_comissao,
                valor_base: agendamentoCompleto.preco_cobrado || 0,
                valor_comissao: valorComissao,
                status: 'pendente',
              })
            }
          }
        }
      }
    }

    carregarAgendamentos()
  }

  async function marcarFalta(id: string) {
    await supabase.from('appointments').update({ status: 'faltou' }).eq('id', id)
    carregarAgendamentos()
  }

  async function aprovarAgendamento(agendamento: Agendamento) {
    await supabase.from('appointments').update({ status: 'agendado' }).eq('id', agendamento.id)

    const { data: tenant } = await supabase.from('tenants').select('id').single()
    if (tenant) {
      fetch('/api/notificar/confirmacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          telefone: agendamento.customers?.telefone,
          nomePet: agendamento.pets?.nome,
          servico: agendamento.services?.nome,
          data: new Date(agendamento.inicio).toLocaleDateString('pt-BR'),
          horario: new Date(agendamento.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        }),
      }).catch(() => {})
    }

    carregarAgendamentos()
  }

  async function recusarAgendamento(id: string) {
    await supabase.from('appointments').update({ status: 'cancelado' }).eq('id', id)
    carregarAgendamentos()
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Agenda</h2>
          <p className="text-sm text-gray-500 mt-0.5">Fluxo de trabalho do dia</p>
        </div>
        <input
          type="date"
          value={dataFiltro}
          onChange={e => setDataFiltro(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {carregando ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {COLUNAS.map(coluna => {
            const itens = agendamentos.filter(a => a.status === coluna.status)
            return (
              <div key={coluna.status} className="flex flex-col">
                <div className={`${coluna.cor} rounded-lg px-3 py-2 mb-3 flex items-center justify-between`}>
                  <span className="text-xs font-medium text-gray-700">{coluna.label}</span>
                  <span className="text-xs text-gray-500 bg-white rounded-full w-5 h-5 flex items-center justify-center">
                    {itens.length}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {itens.length === 0 && (
                    <p className="text-xs text-gray-300 text-center py-6">Vazio</p>
                  )}

                  {itens.map(a => (
                    <div key={a.id} className="bg-white border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-900">
                          {new Date(a.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0"
                          style={{ backgroundColor: a.professionals?.cor_agenda || '#94a3b8' }}
                        >
                          {a.professionals?.nome?.charAt(0).toUpperCase() || '?'}
                        </div>
                      </div>

                      <p className="text-sm font-medium text-gray-900">{a.pets?.nome}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{a.services?.nome}</p>
                      <p className="text-xs text-gray-400">{a.customers?.nome}</p>

                      {a.precisa_transporte && (
                        <div className="mt-2 bg-orange-50 rounded-lg px-2 py-1.5">
                          <p className="text-[10px] font-medium text-orange-700">🚐 Transporte</p>
                          {a.endereco_coleta && (
                            <button
                              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.endereco_coleta || '')}`, '_blank')}
                              className="text-[10px] text-orange-600 mt-0.5 underline block text-left"
                            >
                              📍 Coleta: {a.endereco_coleta}
                            </button>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2 mt-3">
                        {a.status === 'em_espera' ? (
                          <>
                            <button
                              onClick={() => aprovarAgendamento(a)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-[11px] py-1.5 rounded-lg transition-colors"
                            >
                              ✓ Aprovar
                            </button>
                            <button
                              onClick={() => recusarAgendamento(a.id)}
                              className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 text-[11px] py-1.5 rounded-lg transition-colors"
                            >
                              ✕ Recusar
                            </button>
                          </>
                        ) : (
                          <>
                            {PROXIMO_STATUS[a.status] && (
                              <button
                                onClick={() => avancarStatus(a.id, a.status)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] py-1.5 rounded-lg transition-colors"
                              >
                                Avancar →
                              </button>
                            )}
                            {a.status !== 'concluido' && (
                              <button
                                onClick={() => marcarFalta(a.id)}
                                className="text-[11px] text-red-500 hover:underline px-2"
                              >
                                Faltou
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}