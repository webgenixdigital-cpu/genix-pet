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
  customer_id: string
  service_id: string
  pet_id: string
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
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export default function AgendaPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [dataFiltro, setDataFiltro] = useState(formatarDataISO(new Date()))
  const [periodoFiltro, setPeriodoFiltro] = useState<'dia' | 'semana' | 'mes'>('dia')
  const [offsetCalendario, setOffsetCalendario] = useState(0)
  const [ticketAberto, setTicketAberto] = useState<Agendamento | null>(null)
  const [modalReagendar, setModalReagendar] = useState<Agendamento | null>(null)
  const [novaData, setNovaData] = useState('')
  const [novoHorario, setNovoHorario] = useState('')
  const [reagendando, setReagendando] = useState(false)
  const [pacotesPorPet, setPacotesPorPet] = useState<Record<string, { usadas: number; total: number }>>({})
  const supabase = createClient()

  function calcularIntervalo() {
    const base = new Date(dataFiltro + 'T00:00:00')

    if (periodoFiltro === 'dia') {
      return { inicio: dataFiltro, fim: dataFiltro }
    }

    if (periodoFiltro === 'semana') {
      const diaSemana = base.getDay()
      const inicioSemana = new Date(base)
      inicioSemana.setDate(base.getDate() - diaSemana)
      const fimSemana = new Date(inicioSemana)
      fimSemana.setDate(inicioSemana.getDate() + 6)
      return { inicio: formatarDataISO(inicioSemana), fim: formatarDataISO(fimSemana) }
    }

    const inicioMes = new Date(base.getFullYear(), base.getMonth(), 1)
    const fimMes = new Date(base.getFullYear(), base.getMonth() + 1, 0)
    return { inicio: formatarDataISO(inicioMes), fim: formatarDataISO(fimMes) }
  }

  async function carregarAgendamentos() {
    setCarregando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setCarregando(false)
      return
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('email', user.email)
      .single()

    if (!tenant) {
      setCarregando(false)
      return
    }

    const { inicio, fim } = calcularIntervalo()

    const { data } = await supabase
      .from('appointments')
      .select(`
        id, inicio, fim, status, preco_cobrado, precisa_transporte, endereco_coleta, endereco_entrega, customer_id, service_id, pet_id,
        customers ( nome, telefone ),
        pets ( nome ),
        professionals ( nome, cor_agenda ),
        services ( nome )
      `)
      .eq('tenant_id', tenant.id)
      .gte('inicio', inicio + 'T00:00:00')
      .lte('inicio', fim + 'T23:59:59')
      .neq('status', 'cancelado')
      .neq('status', 'faltou')
      .order('inicio')

    setAgendamentos((data as any) || [])

    const petIds = Array.from(new Set(((data as any) || []).map((a: any) => a.pet_id).filter(Boolean)))

    if (petIds.length > 0) {
      const { data: pacotes } = await supabase
        .from('customer_packages')
        .select('pet_id, sessoes_total, sessoes_usadas')
        .in('pet_id', petIds)
        .eq('status', 'ativo')

      const mapa: Record<string, { usadas: number; total: number }> = {}
      ;(pacotes || []).forEach((p: any) => {
        mapa[p.pet_id] = { usadas: p.sessoes_usadas, total: p.sessoes_total }
      })
      setPacotesPorPet(mapa)
    } else {
      setPacotesPorPet({})
    }

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
          const { data: pacoteAtivo } = await supabase
            .from('customer_packages')
            .select('id, package_id, sessoes_restantes, service_packages ( service_id )')
            .eq('customer_id', agendamento.customers ? (agendamento as any).customer_id : null)
            .eq('status', 'ativo')
            .gt('sessoes_restantes', 0)

          const pacoteCompativel = (pacoteAtivo as any)?.find(
            (pc: any) => pc.service_packages?.service_id === (agendamento as any).service_id
          )

          if (pacoteCompativel) {
            await supabase.from('package_usage').insert({
              customer_package_id: pacoteCompativel.id,
              appointment_id: id,
            })
          } else {
            await supabase.from('financial_transactions').insert({
              tenant_id: tenant.id,
              tipo: 'receita',
              categoria: 'Servico',
              descricao: `${agendamento.services?.nome} - ${agendamento.pets?.nome}`,
              valor: agendamento.preco_cobrado || 0,
              data_lancamento: new Date().toISOString().split('T')[0],
              status: 'pendente',
              appointment_id: id,
              customer_id: agendamento.customer_id,
            })
          }
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

  function abrirReagendar(a: Agendamento) {
    setModalReagendar(a)
    setNovaData(formatarDataISO(new Date(a.inicio)))
    setNovoHorario(new Date(a.inicio).toTimeString().slice(0, 5))
  }

  async function confirmarReagendamento() {
    if (!modalReagendar || !novaData || !novoHorario) return
    setReagendando(true)

    const duracaoMs = new Date(modalReagendar.fim).getTime() - new Date(modalReagendar.inicio).getTime()
    const novoInicio = new Date(`${novaData}T${novoHorario}:00`)
    const novoFim = new Date(novoInicio.getTime() + duracaoMs)

    await supabase
      .from('appointments')
      .update({
        inicio: novoInicio.toISOString(),
        fim: novoFim.toISOString(),
      })
      .eq('id', modalReagendar.id)

    setReagendando(false)
    setModalReagendar(null)
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Agenda</h2>
          <p className="text-sm text-gray-500 mt-0.5">Fluxo de trabalho do dia</p>
        </div>
        <a href="/dashboard/agenda/novo" className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
          + Novo agendamento
        </a>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {(['dia', 'semana', 'mes'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriodoFiltro(p)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${
              periodoFiltro === p
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setOffsetCalendario(o => o - 7)}
          className="flex-shrink-0 w-8 h-16 rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-blue-300 transition-colors"
        >
          ‹
        </button>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-1">
          {Array.from({ length: 14 }).map((_, i) => {
            const data = new Date()
            data.setDate(data.getDate() + offsetCalendario + i)
            const dataISO = formatarDataISO(data)
            const selecionado = dataISO === dataFiltro
            const diaSemana = data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
            const diaMes = data.getDate()
            const mesAbrev = data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')

            return (
              <button
                key={dataISO}
                onClick={() => setDataFiltro(dataISO)}
                className={`flex flex-col items-center justify-center flex-shrink-0 w-14 h-16 rounded-xl border transition-colors ${
                  selecionado
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                <span className="text-[10px] uppercase">{diaSemana}</span>
                <span className="text-base font-semibold">{diaMes}</span>
                <span className="text-[9px] uppercase opacity-70">{mesAbrev}</span>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => setOffsetCalendario(o => o + 7)}
          className="flex-shrink-0 w-8 h-16 rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-blue-300 transition-colors"
        >
          ›
        </button>
      </div>

      {offsetCalendario !== 0 && (
        <button
          onClick={() => setOffsetCalendario(0)}
          className="text-xs text-blue-600 hover:underline -mt-4 mb-4 block"
        >
          Voltar para hoje
        </button>
      )}

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

                      <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                        {a.pets?.nome}
                        {pacotesPorPet[a.pet_id] && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                            🎁 {pacotesPorPet[a.pet_id].usadas + 1}/{pacotesPorPet[a.pet_id].total}
                          </span>
                        )}
                      </p>
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
                      <button
                        onClick={() => setTicketAberto(a)}
                        className="text-[11px] text-gray-500 hover:underline mt-1 block w-full text-center"
                      >
                        🎫 Imprimir ticket
                      </button>
                      <button
                        onClick={() => abrirReagendar(a)}
                        className="text-[11px] text-blue-600 hover:underline mt-1 block w-full text-center"
                      >
                        🔄 Reagendar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {ticketAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 print:bg-white print:static">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 print:rounded-none print:max-w-none print:shadow-none">
            <style>{`
              @media print {
                @page { size: 80mm auto; margin: 0; }
                body * { visibility: hidden; }
                #area-ticket, #area-ticket * { visibility: visible; }
                #area-ticket {
                  position: fixed;
                  top: 0;
                  left: 0;
                  width: 72mm;
                  padding: 2mm;
                  font-size: 11px;
                  line-height: 1.4;
                }
              }
            `}</style>

            <div id="area-ticket" className="font-mono text-xs">
              <div className="text-center mb-3">
                <p className="font-bold text-sm">GENIX PET</p>
                <p>Ticket de Atendimento</p>
                <p>{new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="border-t border-dashed border-gray-400 my-2" />
              <p>Cliente: {ticketAberto.customers?.nome}</p>
              <p>Telefone: {ticketAberto.customers?.telefone}</p>
              <p>Pet: {ticketAberto.pets?.nome}</p>
              <p>Servico: {ticketAberto.services?.nome}</p>
              <p>Horario: {new Date(ticketAberto.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              {ticketAberto.professionals?.nome && <p>Profissional: {ticketAberto.professionals.nome}</p>}
              {ticketAberto.precisa_transporte && (
                <>
                  <div className="border-t border-dashed border-gray-400 my-2" />
                  <p className="font-bold">TRANSPORTE</p>
                  {ticketAberto.endereco_coleta && <p>Coleta: {ticketAberto.endereco_coleta}</p>}
                  {ticketAberto.endereco_entrega && <p>Entrega: {ticketAberto.endereco_entrega}</p>}
                </>
              )}
              <div className="border-t border-dashed border-gray-400 my-2" />
              <p className="text-center text-[10px] mt-2">Seu pet esta em boas maos!</p>
            </div>

            <div className="flex gap-3 mt-6 print:hidden">
              <button
                onClick={() => setTicketAberto(null)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors"
              >
                Imprimir ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {modalReagendar && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Reagendar atendimento</h3>
            <p className="text-sm text-gray-500 mb-4">
              {modalReagendar.pets?.nome} — {modalReagendar.customers?.nome}
            </p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Nova data</label>
                <input
                  type="date"
                  value={novaData}
                  onChange={e => setNovaData(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Novo horario</label>
                <input
                  type="time"
                  value={novoHorario}
                  onChange={e => setNovoHorario(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setModalReagendar(null)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarReagendamento}
                  disabled={reagendando}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {reagendando ? 'Salvando...' : 'Confirmar reagendamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}