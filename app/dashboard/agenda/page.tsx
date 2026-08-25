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
          observacoes: string | null
  notas_internas: string | null
  pago: boolean
  is_recorrente: boolean
  customer_package_id: string | null
  customers: { nome: string; telefone: string } | null
  pets: { nome: string } | null
  professionals: { nome: string; cor_agenda: string } | null
}

const COLUNAS = [
  { status: 'em_espera', label: 'Aguardando aprovacao', cor: 'bg-yellow-100', borda: 'border-yellow-400', destaque: true },
  { status: 'agendado', label: 'Agendado', cor: 'bg-gray-100', borda: 'border-gray-300', destaque: false },
  { status: 'confirmado', label: 'Confirmado', cor: 'bg-blue-100', borda: 'border-blue-400', destaque: false },
  { status: 'em_atendimento', label: 'Em atendimento', cor: 'bg-purple-100', borda: 'border-purple-400', destaque: false },
  { status: 'concluido', label: 'Concluido', cor: 'bg-green-100', borda: 'border-green-400', destaque: false },
]

const PROXIMO_STATUS: Record<string, string> = {
  em_espera: 'agendado',
  agendado: 'confirmado',
  confirmado: 'em_atendimento',
  em_atendimento: 'concluido',
}
function fmtMoeda(v: number): string {
  return `R$ ${v.toFixed(2).replace('.', ',')}`
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
      const [infoAberto, setInfoAberto] = useState<Agendamento | null>(null)
  const [mostrarTransporteModal, setMostrarTransporteModal] = useState(false)
  const [mostrarObsModal, setMostrarObsModal] = useState(false)
    const [notasInternas, setNotasInternas] = useState('')
  const [salvandoNotas, setSalvandoNotas] = useState(false)

  const [modalServico, setModalServico] = useState<Agendamento | null>(null)
  const [racasCatalogo, setRacasCatalogo] = useState<any[]>([])
  const [porteItensCatalogo, setPorteItensCatalogo] = useState<any[]>([])
  const [catalogoCarregado, setCatalogoCarregado] = useState(false)
  const [itensParaEdicao, setItensParaEdicao] = useState<any[]>([])
  const [itensSelecionadosEdicao, setItensSelecionadosEdicao] = useState<Set<string>>(new Set())
  const [salvandoServico, setSalvandoServico] = useState(false)
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
                                       id, inicio, fim, status, preco_cobrado, precisa_transporte, endereco_coleta, endereco_entrega, customer_id, service_id, pet_id, observacoes, notas_internas, pago, is_recorrente, customer_package_id,
        customers ( nome, telefone ),
        pets ( nome ),
        professionals ( nome, cor_agenda )
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
        const { data: { user } } = await supabase.auth.getUser()
        const { data: tenant } = user ? await supabase.from('tenants').select('id').eq('email', user.email).single() : { data: null }
        if (tenant) {
          if (agendamento.customer_package_id) {
            const { data: pacote } = await supabase
              .from('customer_packages')
              .select('sessoes_usadas, sessoes_total')
              .eq('id', agendamento.customer_package_id)
              .single()

            if (pacote) {
              const novasSessoesUsadas = (pacote.sessoes_usadas || 0) + 1
              const cicloCompleto = novasSessoesUsadas >= pacote.sessoes_total

              await supabase
                .from('customer_packages')
                .update({
                  sessoes_usadas: novasSessoesUsadas,
                  status: cicloCompleto ? 'concluido' : 'ativo',
                })
                .eq('id', agendamento.customer_package_id)
            }
          }

          if (Number(agendamento.preco_cobrado || 0) > 0) {
            await supabase.from('financial_transactions').insert({
              tenant_id: tenant.id,
              tipo: 'receita',
              categoria: 'Servico',
              descricao: `${agendamento.observacoes || 'Servico'} - ${agendamento.pets?.nome}`,
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
function enviarLembreteRapido(a: Agendamento) {
    const telefone = (a.customers?.telefone || '').replace(/\D/g, '')
    if (!telefone) {
      alert('Cliente sem telefone cadastrado.')
      return
    }

    const telefoneComDDI = telefone.startsWith('55') ? telefone : `55${telefone}`

    const dataFormatada = new Date(a.inicio).toLocaleDateString('pt-BR')
    const horarioFormatado = new Date(a.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

        const mensagem = `Ola! Passando para confirmar seu agendamento:\n\n🐾 Pet: ${a.pets?.nome}\n✂️ Servico: ${a.observacoes || 'Servico'}\n📅 Data: ${dataFormatada}\n🕐 Horario: ${horarioFormatado}\n\nConfira e confirme pra nos se esta correto.`
    const link = `https://wa.me/${telefoneComDDI}?text=${encodeURIComponent(mensagem)}`
    window.open(link, '_blank')
  }
    async function abrirEditarServico(agendamento: Agendamento) {
    setModalServico(agendamento)
    setItensSelecionadosEdicao(new Set())
    setItensParaEdicao([])

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: tenant } = await supabase.from('tenants').select('id').eq('email', user.email).single()
    if (!tenant) return

    let racas = racasCatalogo
    let porteItens = porteItensCatalogo

    if (!catalogoCarregado) {
      const { data: racasData } = await supabase
        .from('catalogo_racas')
        .select('id, nome')
        .eq('tenant_id', tenant.id)

      const racaIds = (racasData || []).map((r: any) => r.id)
      let racaItensData: any[] = []
      if (racaIds.length > 0) {
        const { data } = await supabase
          .from('catalogo_raca_itens')
          .select('id, raca_id, grupo, nome, preco, inclui, duracao_min')
          .in('raca_id', racaIds)
        racaItensData = data || []
      }

      racas = (racasData || []).map((r: any) => ({ ...r, itens: racaItensData.filter(i => i.raca_id === r.id) }))

      const { data: porteItensData } = await supabase
        .from('catalogo_porte_itens')
        .select('id, grupo, nome, pelagens, inclui, duracao_min')
        .eq('tenant_id', tenant.id)

      const porteItemIds = (porteItensData || []).map((i: any) => i.id)
      let precosData: any[] = []
      if (porteItemIds.length > 0) {
        const { data } = await supabase
          .from('catalogo_porte_precos')
          .select('item_id, porte, preco')
          .in('item_id', porteItemIds)
        precosData = data || []
      }

      porteItens = (porteItensData || []).map((i: any) => ({ ...i, precos: precosData.filter(p => p.item_id === i.id) }))

      setRacasCatalogo(racas)
      setPorteItensCatalogo(porteItens)
      setCatalogoCarregado(true)
    }

    const { data: pet } = await supabase
      .from('pets')
      .select('porte, pelagem, raca')
      .eq('id', agendamento.pet_id)
      .single()

    if (!pet) return

    const racaEncontrada = racas.find((r: any) => r.nome.toLowerCase() === (pet.raca || '').toLowerCase())

    if (racaEncontrada) {
      setItensParaEdicao(racaEncontrada.itens.map((i: any) => ({ ...i, preco: Number(i.preco) })))
    } else {
      const itensCompativeis = porteItens.filter((i: any) => {
        const temPreco = i.precos.some((p: any) => p.porte === pet.porte)
        const pelagemOk = !i.pelagens || i.pelagens.length === 0 || i.pelagens.includes(pet.pelagem)
        return temPreco && pelagemOk
      })
      setItensParaEdicao(itensCompativeis.map((i: any) => ({
        ...i,
        preco: Number(i.precos.find((p: any) => p.porte === pet.porte)?.preco || 0),
      })))
    }
  }

  function toggleItemEdicao(item: any) {
    const jaMarcado = itensSelecionadosEdicao.has(item.id)
    const novo = new Set(itensSelecionadosEdicao)

    const temPrincipal = itensParaEdicao.filter(i => i.grupo === 'principal' && novo.has(i.id)).length > 0
    const temCombo = itensParaEdicao.filter(i => i.grupo === 'combo' && novo.has(i.id)).length > 0

    if (jaMarcado) {
      novo.delete(item.id)
    } else {
      if (item.grupo === 'principal' && temCombo) {
        alert('Ja existe um Combo selecionado. Remova-o para escolher um servico avulso.')
        return
      }
      if (item.grupo === 'combo' && temPrincipal) {
        alert('Ja existe um servico de Banho e Tosa selecionado. Remova-o para escolher um Combo.')
        return
      }
      novo.add(item.id)
    }
    setItensSelecionadosEdicao(novo)
  }

  async function salvarServicoEditado() {
    if (!modalServico) return
    setSalvandoServico(true)

    const selecionados = itensParaEdicao.filter(i => itensSelecionadosEdicao.has(i.id))
    const nomesServicos = selecionados.map(i => i.nome).join(' + ')
    const total = selecionados.reduce((s, i) => s + Number(i.preco), 0)

    await supabase
      .from('appointments')
      .update({
        observacoes: nomesServicos || null,
        preco_cobrado: total,
        service_id: selecionados[0]?.id || modalServico.service_id,
      })
      .eq('id', modalServico.id)

    setSalvandoServico(false)
    setModalServico(null)
    carregarAgendamentos()
  }
    async function marcarComoPago(id: string) {
    await supabase.from('appointments').update({ pago: true }).eq('id', id)
    setInfoAberto(null)
    carregarAgendamentos()
  }

  function enviarFatura(a: Agendamento) {
    const telefone = (a.customers?.telefone || '').replace(/\D/g, '')
    if (!telefone) {
      alert('Cliente sem telefone cadastrado.')
      return
    }

    const telefoneComDDI = telefone.startsWith('55') ? telefone : `55${telefone}`

    const mensagem = `Ola, ${a.customers?.nome}! Segue o resumo do atendimento do(a) ${a.pets?.nome}:\n\n${a.observacoes}\n\n💰 Valor total: R$ ${Number(a.preco_cobrado || 0).toFixed(2).replace('.', ',')}\n\nFico no aguardo do pagamento. Qualquer duvida, e so chamar!`

    const link = `https://wa.me/${telefoneComDDI}?text=${encodeURIComponent(mensagem)}`
    window.open(link, '_blank')
  }
    async function salvarNotasInternas() {
    if (!infoAberto) return
    setSalvandoNotas(true)

    await supabase
      .from('appointments')
      .update({ notas_internas: notasInternas })
      .eq('id', infoAberto.id)

    setSalvandoNotas(false)
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
    if (!agendamento.observacoes) {
      alert('Este agendamento nao tem servico definido. Reagende ou edite antes de aprovar.')
      return
    }

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
                    servico: agendamento.observacoes || 'Servico',
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

  const agendamentosPorDia = agendamentos.reduce((acc: Record<string, Agendamento[]>, a) => {
    const dia = formatarDataISO(new Date(a.inicio))
    if (!acc[dia]) acc[dia] = []
    acc[dia].push(a)
    return acc
  }, {})

  function gerarDiasDaSemana(): string[] {
    const base = new Date(dataFiltro + 'T00:00:00')
    const diaSemana = base.getDay()
    const inicioSemana = new Date(base)
    inicioSemana.setDate(base.getDate() - diaSemana)
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(inicioSemana)
      d.setDate(inicioSemana.getDate() + i)
      return formatarDataISO(d)
    })
  }

  function gerarDiasDoMes(): string[] {
    const base = new Date(dataFiltro + 'T00:00:00')
    const inicioMes = new Date(base.getFullYear(), base.getMonth(), 1)
    const fimMes = new Date(base.getFullYear(), base.getMonth() + 1, 0)
    const primeiroDiaSemana = inicioMes.getDay()
    const dias: string[] = []

    for (let i = 0; i < primeiroDiaSemana; i++) dias.push('')

    for (let d = 1; d <= fimMes.getDate(); d++) {
      dias.push(formatarDataISO(new Date(base.getFullYear(), base.getMonth(), d)))
    }

    return dias
  }

  function irParaDia(dia: string) {
    setDataFiltro(dia)
    setPeriodoFiltro('dia')
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
            ) : periodoFiltro === 'semana' ? (
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-cols-7 gap-3 min-w-[700px]">
          {gerarDiasDaSemana().map(dia => {
            const itens = (agendamentosPorDia[dia] || []).filter(a => a.status !== 'cancelado' && a.status !== 'faltou')
            const dataObj = new Date(dia + 'T00:00:00')
            const hoje = dia === formatarDataISO(new Date())
            return (
                            <div key={dia} className="flex flex-col bg-gray-50/50 rounded-xl p-2 border border-gray-100 shadow-sm">
                <button
                  onClick={() => irParaDia(dia)}
                  className={`rounded-lg px-2 py-2 mb-2 text-center transition-colors ${hoje ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-100'}`}
                >
                  <p className="text-[10px] uppercase">{dataObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</p>
                  <p className="text-sm font-semibold">{dataObj.getDate()}</p>
                  {itens.length > 0 && (
                    <span className={`inline-block mt-0.5 text-[9px] px-1.5 py-0.5 rounded-full ${hoje ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-700'}`}>
                      {itens.length} agend.
                    </span>
                  )}
                </button>
                <div className="flex flex-col gap-1.5">
                  {itens.length === 0 && <p className="text-[10px] text-gray-300 text-center py-2">-</p>}
                                     {itens.map(a => (
                    <button
                      key={a.id}
                      onClick={() => irParaDia(dia)}
                      className="bg-white border border-gray-100 rounded-lg p-2 text-left hover:border-blue-300 transition-colors"
                    >
                      <p className="text-[10px] font-medium text-gray-900">
                        {new Date(a.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[11px] text-gray-600 truncate">{a.pets?.nome}</p>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
          </div>
        </div>
      ) : periodoFiltro === 'mes' ? (                    
          
        <div>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => (
              <p key={d} className="text-[10px] text-gray-400 text-center uppercase font-medium">{d}</p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {gerarDiasDoMes().map((dia, i) => {
              if (!dia) return <div key={`vazio-${i}`} />
              const itens = (agendamentosPorDia[dia] || []).filter(a => a.status !== 'cancelado' && a.status !== 'faltou')
              const dataObj = new Date(dia + 'T00:00:00')
              const hoje = dia === formatarDataISO(new Date())
              return (
                <button
                  key={dia}
                  onClick={() => irParaDia(dia)}
                  className={`aspect-square rounded-lg border p-2 flex flex-col items-center justify-center transition-colors ${
                    hoje ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-100 hover:border-blue-300'
                  }`}
                >
                  <p className="text-sm font-medium">{dataObj.getDate()}</p>
                  {itens.length > 0 && (
                    <span className={`text-[9px] mt-0.5 px-1.5 rounded-full ${hoje ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-700'}`}>
                      {itens.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:overflow-visible overflow-x-auto lg:min-w-0">
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
                    <button
                      key={a.id}
                      onClick={() => { setInfoAberto(a); setNotasInternas(a.notas_internas || '') }}
                      className={`bg-white rounded-xl p-3 text-left hover:shadow-sm transition-all w-full border-l-4 ${
                        a.is_recorrente ? 'border-purple-500' : coluna.borda
                      } ${coluna.destaque ? 'ring-1 ring-yellow-300 shadow-sm' : 'border-t border-r border-b border-gray-100'}`}
                    >
                                            <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-900">
                          {new Date(a.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                                                                        <div className="flex items-center gap-1.5">
                          {!a.observacoes && <span className="text-xs" title="Servico nao definido">⚠️</span>}
                          {!a.pago && Number(a.preco_cobrado || 0) > 0 && (
                            <span className="text-xs" title="Pagamento pendente">💰</span>
                          )}
                          {a.is_recorrente && <span className="text-xs" title="Faz parte de um plano recorrente">🔁</span>}
                          {a.precisa_transporte && <span className="text-xs">🚐</span>}
                          {pacotesPorPet[a.pet_id] && (
                            <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                              🎁 {pacotesPorPet[a.pet_id].usadas + 1}/{pacotesPorPet[a.pet_id].total}
                            </span>
                          )}
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0"
                            style={{ backgroundColor: a.professionals?.cor_agenda || '#94a3b8' }}
                          >
                            {a.professionals?.nome?.charAt(0).toUpperCase() || '?'}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">{a.pets?.nome}</p>
                      <p className="text-xs text-gray-400 truncate">{a.customers?.nome}</p>
                    </button>
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
                            <p>Servico: {ticketAberto.observacoes}</p>
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
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
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

            {infoAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setInfoAberto(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informacoes do agendamento</h3>

            {!infoAberto.observacoes && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700 font-medium">⚠️ Servico nao definido</p>
                <p className="text-xs text-red-600 mt-0.5 mb-2">
                  Este agendamento nao pode ser aprovado ate que um servico seja definido.
                </p>
                <button
                  onClick={() => { abrirEditarServico(infoAberto); setInfoAberto(null) }}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Definir servico agora
                </button>
              </div>
            )}

            <div className="flex flex-col gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Cliente</p>
                <p className="text-gray-900">{infoAberto.customers?.nome}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Telefone</p>
                <p className="text-gray-900">{infoAberto.customers?.telefone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Pet</p>
                <p className="text-gray-900">{infoAberto.pets?.nome}</p>
              </div>

              {infoAberto.status === 'em_espera' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => { aprovarAgendamento(infoAberto); setInfoAberto(null) }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded-lg transition-colors"
                  >
                    ✓ Aprovar
                  </button>
                  <button
                    onClick={() => { recusarAgendamento(infoAberto.id); setInfoAberto(null) }}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs py-2 rounded-lg transition-colors"
                  >
                    ✕ Recusar
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {PROXIMO_STATUS[infoAberto.status] && (
                    <button
                      onClick={() => { avancarStatus(infoAberto.id, infoAberto.status); setInfoAberto(null) }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded-lg transition-colors"
                    >
                      Avancar →
                    </button>
                  )}
                  {infoAberto.status !== 'concluido' && (
                    <button
                      onClick={() => { marcarFalta(infoAberto.id); setInfoAberto(null) }}
                      className="text-xs text-red-500 hover:underline px-2"
                    >
                      Faltou
                    </button>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs text-gray-400">Valor</p>
                <div className="flex items-center justify-between">
                  <p className="text-gray-900">R$ {Number(infoAberto.preco_cobrado || 0).toFixed(2).replace('.', ',')}</p>
                  {Number(infoAberto.preco_cobrado || 0) > 0 && (
                    infoAberto.pago ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Pago</span>
                    ) : (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">💰 Pendente</span>
                    )
                  )}
                </div>
              </div>

              {Number(infoAberto.preco_cobrado || 0) > 0 && !infoAberto.pago && (
                <div className="flex gap-2">
                  <button
                    onClick={() => marcarComoPago(infoAberto.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded-lg transition-colors"
                  >
                    ✓ Marcar como pago
                  </button>
                  <button
                    onClick={() => enviarFatura(infoAberto)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded-lg transition-colors"
                  >
                    📤 Enviar fatura
                  </button>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">Servicos</p>
                  <button
                    onClick={() => { abrirEditarServico(infoAberto); setInfoAberto(null) }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    ✏️ Editar servicos
                  </button>
                </div>
                <p className="text-gray-900">{infoAberto.observacoes || '-'}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400">Profissional</p>
                <p className="text-gray-900">{infoAberto.professionals?.nome || 'Nao definido'}</p>
              </div>

              {infoAberto.precisa_transporte && (
                <div className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => setMostrarTransporteModal(!mostrarTransporteModal)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left"
                  >
                    <span className="text-xs font-medium text-gray-700">🚐 Endereco de transporte</span>
                    <span className="text-xs text-gray-400">{mostrarTransporteModal ? '▲' : '▼'}</span>
                  </button>
                  {mostrarTransporteModal && (
                    <div className="px-3 pb-3 flex flex-col gap-2">
                      <div>
                        <p className="text-xs text-gray-400">Endereco de coleta</p>
                        <p className="text-gray-900 text-sm">{infoAberto.endereco_coleta}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Endereco de entrega</p>
                        <p className="text-gray-900 text-sm">{infoAberto.endereco_entrega}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => { setTicketAberto(infoAberto); setInfoAberto(null) }}
                  title="Imprimir ticket"
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-sm hover:bg-gray-50 transition-colors"
                >
                  🎫
                </button>
                <button
                  onClick={() => { abrirReagendar(infoAberto); setInfoAberto(null) }}
                  title="Reagendar"
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-sm hover:bg-gray-50 transition-colors"
                >
                  🔄
                </button>
                <button
                  onClick={() => enviarLembreteRapido(infoAberto)}
                  title="Lembrete WhatsApp"
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-sm hover:bg-gray-50 transition-colors"
                >
                  💬
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => setMostrarObsModal(!mostrarObsModal)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left"
                >
                  <span className="text-xs font-medium text-gray-700">📝 Observacoes</span>
                  <span className="text-xs text-gray-400">{mostrarObsModal ? '▲' : '▼'}</span>
                </button>
                {mostrarObsModal && (
                  <div className="px-3 pb-3">
                    <textarea
                      value={notasInternas}
                      onChange={e => setNotasInternas(e.target.value)}
                      placeholder="Adicione uma observacao (alergia, cirurgia recente, sem perfume, etc)..."
                      rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setInfoAberto(null)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={salvarNotasInternas}
                disabled={salvandoNotas}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {salvandoNotas ? 'Salvando...' : 'Salvar observacao'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalServico && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={e => e.target === e.currentTarget && setModalServico(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Editar servicos</h3>
            <p className="text-sm text-gray-500 mb-4">{modalServico.pets?.nome} — {modalServico.customers?.nome}</p>

            {itensParaEdicao.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhum servico compativel encontrado para este pet.</p>
            ) : (
              (['principal', 'adicional', 'combo'] as const).map(grupo => {
                const itens = itensParaEdicao.filter(i => i.grupo === grupo)
                if (itens.length === 0) return null
                const titulo = grupo === 'principal' ? 'Banho e Tosa' : grupo === 'adicional' ? 'Adicionais' : 'Combos'
                return (
                  <div key={grupo} className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{titulo}</p>
                    <div className="flex flex-col gap-1.5">
                      {itens.map(item => {
                        const checked = itensSelecionadosEdicao.has(item.id)
                        return (
                          <label key={item.id} className={`flex items-center justify-between gap-2 border rounded-lg px-3 py-2 cursor-pointer ${checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                            <span className="flex items-center gap-2">
                              <input type="checkbox" checked={checked} onChange={() => toggleItemEdicao(item)} className="w-4 h-4" />
                              <span className="text-sm text-gray-900">{item.nome}</span>
                            </span>
                            <span className="text-sm font-medium text-blue-600">{fmtMoeda(Number(item.preco))}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}

            {itensSelecionadosEdicao.size > 0 && (
              <div className="bg-blue-50 rounded-lg p-2.5 mb-4">
                <p className="text-sm font-medium text-blue-700">
                  Total: {fmtMoeda(itensParaEdicao.filter(i => itensSelecionadosEdicao.has(i.id)).reduce((s, i) => s + Number(i.preco), 0))}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setModalServico(null)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarServicoEditado}
                disabled={salvandoServico || itensSelecionadosEdicao.size === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {salvandoServico ? 'Salvando...' : 'Salvar servicos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}