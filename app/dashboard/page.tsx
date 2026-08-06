'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type Agendamento = {
  id: string
  inicio: string
  status: string
  preco_cobrado: number | null
  precisa_transporte: boolean
  endereco_coleta: string | null
  service_id: string
  professional_id: string | null
  customer_id: string
  customers: { nome: string } | null
  pets: { nome: string } | null
  services: { nome: string } | null
  professionals: { nome: string; cor_agenda: string } | null
}

function formatarDataISO(data: Date): string {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

const STATUS_LABELS: Record<string, string> = {
  em_espera: 'Aguardando aprovacao',
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  em_atendimento: 'Em atendimento',
  concluido: 'Concluido',
  cancelado: 'Cancelado',
  faltou: 'Faltou',
}

const STATUS_CORES: Record<string, string> = {
  em_espera: 'bg-yellow-400',
  agendado: 'bg-gray-400',
  confirmado: 'bg-blue-500',
  em_atendimento: 'bg-purple-500',
  concluido: 'bg-green-500',
  cancelado: 'bg-red-400',
  faltou: 'bg-red-400',
}

function IconeMais() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}
function GraficoBarras({ valores, cor = '#2563eb' }: { valores: number[]; cor?: string }) {
  const max = Math.max(...valores, 1)
  const largura = 100 / valores.length

  return (
    <svg width="100%" height="80" viewBox="0 0 300 80" preserveAspectRatio="none">
      {valores.map((v, i) => {
        const altura = (v / max) * 70
        return (
          <rect
            key={i}
            x={i * (300 / valores.length) + 1}
            y={80 - altura}
            width={300 / valores.length - 2}
            height={altura}
            fill={cor}
            rx="1"
          />
        )
      })}
    </svg>
  )
}
function Sparkline({ valores, cor = '#2563eb' }: { valores: number[]; cor?: string }) {
  if (valores.length < 2) return null
  const max = Math.max(...valores, 1)
  const min = Math.min(...valores, 0)
  const range = max - min || 1
  const pontos = valores.map((v, i) => {
    const x = (i / (valores.length - 1)) * 60
    const y = 20 - ((v - min) / range) * 18
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width="60" height="20" viewBox="0 0 60 20">
      <polyline points={pontos} fill="none" stroke={cor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
export default function DashboardPage() {
  const [tenantNome, setTenantNome] = useState('')
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [receitaHistorico, setReceitaHistorico] = useState<number[]>([])
  const [receita30Dias, setReceita30Dias] = useState<number[]>([])
  const [agendamentos30Dias, setAgendamentos30Dias] = useState<number[]>([])
  const [receitaPorCategoria, setReceitaPorCategoria] = useState<{ categoria: string; valor: number }[]>([])
  const [indicadoresMes, setIndicadoresMes] = useState({
    faturamento: 0, faturamentoAnterior: 0,
    lucro: 0, lucroAnterior: 0,
    ticketMedio: 0,
    novosClientes: 0,
    pacotesAtivos: 0,
  })
  const [produtosEstoqueBaixo, setProdutosEstoqueBaixo] = useState<{ nome: string; estoque_atual: number }[]>([])
  const [contasPendentes, setContasPendentes] = useState(0)
  const [totalHoje, setTotalHoje] = useState({ recebido: 0, aReceber: 0, despesas: 0 })
  const [totalOntem, setTotalOntem] = useState({ recebido: 0, aReceber: 0 })
  const [carregando, setCarregando] = useState(true)
  const [dataFiltro] = useState(formatarDataISO(new Date()))
  const supabase = createClient()

  async function carregarDados() {
    setCarregando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setCarregando(false)
      return
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, nome')
      .eq('email', user.email)
      .single()

    if (!tenant) {
      setCarregando(false)
      return
    }
    setTenantNome(tenant.nome)

    const ontem = formatarDataISO(new Date(Date.now() - 24 * 60 * 60 * 1000))

    const [agendamentosRes, financeiroHojeRes, financeiroOntemRes, financeiro7DiasRes, produtosRes, financeiro30DiasRes, agendamentos30DiasRes, financeiroMesRes, financeiroMesAnteriorRes, clientesMesRes, pacotesAtivosRes] = await Promise.all([
      supabase
        .from('appointments')
        .select(`
          id, inicio, status, preco_cobrado, precisa_transporte, endereco_coleta, service_id, professional_id, customer_id,
          customers ( nome ), pets ( nome ), services ( nome ), professionals ( nome, cor_agenda )
        `)
        .eq('tenant_id', tenant.id)
        .gte('inicio', dataFiltro + 'T00:00:00')
        .lte('inicio', dataFiltro + 'T23:59:59')
        .order('inicio'),
      supabase
        .from('financial_transactions')
        .select('tipo, valor, status')
        .eq('tenant_id', tenant.id)
        .eq('data_lancamento', dataFiltro),
      supabase
        .from('financial_transactions')
        .select('tipo, valor, status')
        .eq('tenant_id', tenant.id)
        .eq('data_lancamento', ontem),
      supabase
        .from('financial_transactions')
        .select('valor, data_lancamento')
        .eq('tenant_id', tenant.id)
        .eq('tipo', 'receita')
        .eq('status', 'pago')
        .gte('data_lancamento', formatarDataISO(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)))
        .lte('data_lancamento', dataFiltro),
      supabase
        .from('products')
        .select('nome, estoque_atual, estoque_minimo')
        .eq('tenant_id', tenant.id)
        .eq('ativo', true),
      supabase
        .from('financial_transactions')
        .select('valor, data_lancamento, categoria')
        .eq('tenant_id', tenant.id)
        .eq('tipo', 'receita')
        .eq('status', 'pago')
        .gte('data_lancamento', formatarDataISO(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)))
        .lte('data_lancamento', dataFiltro),
      supabase
        .from('appointments')
        .select('inicio')
        .eq('tenant_id', tenant.id)
        .neq('status', 'cancelado')
        .gte('inicio', formatarDataISO(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)) + 'T00:00:00')
        .lte('inicio', dataFiltro + 'T23:59:59'),
      supabase
        .from('financial_transactions')
        .select('tipo, valor')
        .eq('tenant_id', tenant.id)
        .eq('status', 'pago')
        .gte('data_lancamento', formatarDataISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
        .lte('data_lancamento', dataFiltro),
      supabase
        .from('financial_transactions')
        .select('tipo, valor')
        .eq('tenant_id', tenant.id)
        .eq('status', 'pago')
        .gte('data_lancamento', formatarDataISO(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)))
        .lte('data_lancamento', formatarDataISO(new Date(new Date().getFullYear(), new Date().getMonth(), 0))),
      supabase
        .from('customers')
        .select('id, criado_em')
        .eq('tenant_id', tenant.id)
        .gte('criado_em', formatarDataISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1))),
      supabase
        .from('customer_packages')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('status', 'ativo'),
    ])

    setAgendamentos((agendamentosRes.data as any) || [])

    const finHoje = financeiroHojeRes.data || []
    const finOntem = financeiroOntemRes.data || []

    setTotalHoje({
      recebido: finHoje.filter(f => f.tipo === 'receita' && f.status === 'pago').reduce((s, f) => s + Number(f.valor), 0),
      aReceber: finHoje.filter(f => f.tipo === 'receita' && f.status === 'pendente').reduce((s, f) => s + Number(f.valor), 0),
      despesas: finHoje.filter(f => f.tipo === 'despesa').reduce((s, f) => s + Number(f.valor), 0),
    })
    setTotalOntem({
      recebido: finOntem.filter(f => f.tipo === 'receita' && f.status === 'pago').reduce((s, f) => s + Number(f.valor), 0),
      aReceber: finOntem.filter(f => f.tipo === 'receita' && f.status === 'pendente').reduce((s, f) => s + Number(f.valor), 0),
    })
    setContasPendentes(finHoje.filter(f => f.tipo === 'receita' && f.status === 'pendente').length)

    const porDia: Record<string, number> = {}
    ;(financeiro7DiasRes.data || []).forEach(f => {
      porDia[f.data_lancamento] = (porDia[f.data_lancamento] || 0) + Number(f.valor)
    })
    const ultimosDias: number[] = []
    for (let i = 6; i >= 0; i--) {
      const dia = formatarDataISO(new Date(Date.now() - i * 24 * 60 * 60 * 1000))
      ultimosDias.push(porDia[dia] || 0)
    }
    setReceitaHistorico(ultimosDias)

    const produtosBaixos = (produtosRes.data || []).filter(p => Number(p.estoque_atual) <= Number(p.estoque_minimo))
    setProdutosEstoqueBaixo(produtosBaixos.map(p => ({ nome: p.nome, estoque_atual: p.estoque_atual })))

    const financeiro30 = (financeiro30DiasRes as any)?.data || []
    const porDia30: Record<string, number> = {}
    financeiro30.forEach((f: any) => {
      porDia30[f.data_lancamento] = (porDia30[f.data_lancamento] || 0) + Number(f.valor)
    })
    const ultimos30: number[] = []
    for (let i = 29; i >= 0; i--) {
      const dia = formatarDataISO(new Date(Date.now() - i * 24 * 60 * 60 * 1000))
      ultimos30.push(porDia30[dia] || 0)
    }
    setReceita30Dias(ultimos30)

    const porCategoria: Record<string, number> = {}
    financeiro30.forEach((f: any) => {
      const cat = f.categoria || 'Outro'
      porCategoria[cat] = (porCategoria[cat] || 0) + Number(f.valor)
    })
    setReceitaPorCategoria(Object.entries(porCategoria).map(([categoria, valor]) => ({ categoria, valor })))

    const agendamentos30 = (agendamentos30DiasRes as any)?.data || []
    const porDiaAgend: Record<string, number> = {}
    agendamentos30.forEach((a: any) => {
      const dia = formatarDataISO(new Date(a.inicio))
      porDiaAgend[dia] = (porDiaAgend[dia] || 0) + 1
    })
    const ultimos30Agend: number[] = []
    for (let i = 29; i >= 0; i--) {
      const dia = formatarDataISO(new Date(Date.now() - i * 24 * 60 * 60 * 1000))
      ultimos30Agend.push(porDiaAgend[dia] || 0)
    }
    setAgendamentos30Dias(ultimos30Agend)

    const finMes = (financeiroMesRes as any)?.data || []
    const finMesAnterior = (financeiroMesAnteriorRes as any)?.data || []
    const clientesMes = (clientesMesRes as any)?.data || []
    const pacotesAtivos = (pacotesAtivosRes as any)?.data || []

    const faturamentoMes = finMes.filter((f: any) => f.tipo === 'receita').reduce((s: number, f: any) => s + Number(f.valor), 0)
    const despesasMes = finMes.filter((f: any) => f.tipo === 'despesa').reduce((s: number, f: any) => s + Number(f.valor), 0)
    const faturamentoMesAnterior = finMesAnterior.filter((f: any) => f.tipo === 'receita').reduce((s: number, f: any) => s + Number(f.valor), 0)
    const despesasMesAnterior = finMesAnterior.filter((f: any) => f.tipo === 'despesa').reduce((s: number, f: any) => s + Number(f.valor), 0)

    const qtdVendasMes = finMes.filter((f: any) => f.tipo === 'receita').length

    setIndicadoresMes({
      faturamento: faturamentoMes,
      faturamentoAnterior: faturamentoMesAnterior,
      lucro: faturamentoMes - despesasMes,
      lucroAnterior: faturamentoMesAnterior - despesasMesAnterior,
      ticketMedio: qtdVendasMes > 0 ? faturamentoMes / qtdVendasMes : 0,
      novosClientes: clientesMes.length,
      pacotesAtivos: pacotesAtivos.length,
    })

    setCarregando(false)
  }

  useEffect(() => { carregarDados() }, [])
  const agendamentosValidos = agendamentos.filter(a => a.status !== 'cancelado' && a.status !== 'faltou')
  const aguardandoAprovacao = agendamentos.filter(a => a.status === 'em_espera')
  const confirmados = agendamentos.filter(a => ['confirmado', 'em_atendimento', 'concluido'].includes(a.status))
  const cancelamentos = agendamentos.filter(a => a.status === 'cancelado' || a.status === 'faltou')

  const diaSemana = new Date().toLocaleDateString('pt-BR', { weekday: 'long' })
  const horaAtual = new Date().getHours()
  const saudacao = horaAtual < 12 ? 'Bom dia' : horaAtual < 18 ? 'Boa tarde' : 'Boa noite'

  function variacao(hoje: number, ontem: number): { texto: string; positivo: boolean } | null {
    if (ontem === 0) return null
    const diff = ((hoje - ontem) / ontem) * 100
    return { texto: `${diff >= 0 ? '+' : ''}${diff.toFixed(0)}% vs ontem`, positivo: diff >= 0 }
  }

  const alertas = [
    aguardandoAprovacao.length > 0 && {
      cor: 'bg-yellow-50 border-yellow-100 text-yellow-700',
      texto: `${aguardandoAprovacao.length} cliente(s) aguardando confirmacao`,
      link: '/dashboard/agenda',
    },
    contasPendentes > 0 && {
      cor: 'bg-orange-50 border-orange-100 text-orange-700',
      texto: `${contasPendentes} pagamento(s) pendente(s) hoje`,
      link: '/dashboard/caixa',
    },
    produtosEstoqueBaixo.length > 0 && {
      cor: 'bg-red-50 border-red-100 text-red-700',
      texto: `${produtosEstoqueBaixo.length} produto(s) com estoque baixo`,
      link: '/dashboard/produtos',
    },
  ].filter(Boolean) as { cor: string; texto: string; link: string }[]
const pendencias = [
    ...aguardandoAprovacao.map(a => ({
      id: `aprovar-${a.id}`,
      texto: `Confirmar agendamento de ${a.pets?.nome || 'pet'}`,
      link: '/dashboard/agenda',
    })),
    ...(contasPendentes > 0 ? [{
      id: 'receber-pagamentos',
      texto: `Receber ${contasPendentes} pagamento(s) pendente(s)`,
      link: '/dashboard/caixa',
    }] : []),
    ...produtosEstoqueBaixo.map(p => ({
      id: `estoque-${p.nome}`,
      texto: `Repor estoque de ${p.nome}`,
      link: '/dashboard/produtos',
    })),
  ]
  const atalhos = [
    { label: 'Novo Agendamento', href: '/dashboard/agenda/novo' },
    { label: 'Novo Cliente', href: '/dashboard/clientes' },
    { label: 'Novo Produto', href: '/dashboard/produtos' },
    { label: 'Nova Despesa', href: '/dashboard/caixa' },
  ]

  const insights: { texto: string; link: string }[] = []

  const variacaoFaturamento = variacao(indicadoresMes.faturamento, indicadoresMes.faturamentoAnterior)
  if (variacaoFaturamento) {
    if (!variacaoFaturamento.positivo) {
      insights.push({
        texto: `Seu faturamento esta ${variacaoFaturamento.texto.replace('vs ontem', '')} em relacao ao mes anterior.`,
        link: '/dashboard/financeiro',
      })
    } else if (parseFloat(variacaoFaturamento.texto) >= 10) {
      insights.push({
        texto: `Seu faturamento cresceu ${variacaoFaturamento.texto.replace('vs ontem', '')} em relacao ao mes anterior. Continue assim!`,
        link: '/dashboard/financeiro',
      })
    }
  }

  produtosEstoqueBaixo.forEach(p => {
    insights.push({
      texto: `Seu estoque de ${p.nome} esta acabando (restam ${p.estoque_atual}).`,
      link: '/dashboard/produtos',
    })
  })

  if (aguardandoAprovacao.length >= 3) {
    insights.push({
      texto: `Voce tem ${aguardandoAprovacao.length} agendamentos aguardando aprovacao. Confirme para nao perder clientes.`,
      link: '/dashboard/agenda',
    })
  }

  if (indicadoresMes.pacotesAtivos === 0) {
    insights.push({
      texto: 'Voce ainda nao vendeu nenhum pacote este mes. Pacotes ajudam a fidelizar clientes.',
      link: '/dashboard/pacotes',
    })
  }

  if (indicadoresMes.novosClientes >= 5) {
    insights.push({
      texto: `Voce ganhou ${indicadoresMes.novosClientes} novos clientes este mes. Otimo trabalho!`,
      link: '/dashboard/clientes',
    })
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">{saudacao}, {tenantNome}! 👋</h2>
        <p className="text-sm text-gray-500 mt-1 capitalize">
          Hoje é {diaSemana} • {agendamentosValidos.length} agendamentos • {confirmados.length} confirmados
          {aguardandoAprovacao.length > 0 && ` • ${aguardandoAprovacao.length} aguardando confirmacao`}
          {cancelamentos.length > 0 && ` • ${cancelamentos.length} cancelamento(s)`}
        </p>
      </div>

      {alertas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {alertas.map((a, i) => (
            <Link
              key={i}
              href={a.link}
              className={`border rounded-xl p-3.5 flex items-center justify-between gap-3 text-sm ${a.cor}`}
            >
              <span className="font-medium">{a.texto}</span>
              <span className="text-xs whitespace-nowrap underline">Resolver</span>
            </Link>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400">Recebido hoje</p>
            <Sparkline valores={receitaHistorico} cor="#16a34a" />
          </div>
          <p className="text-xl font-semibold text-green-600">R$ {totalHoje.recebido.toFixed(2).replace('.', ',')}</p>
          {variacao(totalHoje.recebido, totalOntem.recebido) && (
            <p className={`text-xs mt-1 ${variacao(totalHoje.recebido, totalOntem.recebido)!.positivo ? 'text-green-600' : 'text-red-500'}`}>
              {variacao(totalHoje.recebido, totalOntem.recebido)!.texto}
            </p>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-400 mb-2">A receber hoje</p>
          <p className="text-xl font-semibold text-blue-600">R$ {totalHoje.aReceber.toFixed(2).replace('.', ',')}</p>
          {variacao(totalHoje.aReceber, totalOntem.aReceber) && (
            <p className={`text-xs mt-1 ${variacao(totalHoje.aReceber, totalOntem.aReceber)!.positivo ? 'text-green-600' : 'text-red-500'}`}>
              {variacao(totalHoje.aReceber, totalOntem.aReceber)!.texto}
            </p>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-400 mb-2">Despesas hoje</p>
          <p className="text-xl font-semibold text-red-500">R$ {totalHoje.despesas.toFixed(2).replace('.', ',')}</p>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 hover:shadow-md transition-shadow">
          <p className="text-xs text-blue-600 mb-2">Lucro previsto hoje</p>
          <p className="text-xl font-semibold text-blue-700">
            R$ {(totalHoje.recebido + totalHoje.aReceber - totalHoje.despesas).toFixed(2).replace('.', ',')}
          </p>
        </div>
      </div>
{pendencias.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Pendencias de hoje</h3>
          <div className="flex flex-col gap-2">
            {pendencias.map(p => (
              <Link
                key={p.id}
                href={p.link}
                className="flex items-center gap-3 text-sm text-gray-600 hover:text-blue-600 transition-colors group"
              >
                <span className="w-4 h-4 rounded border border-gray-300 flex-shrink-0 group-hover:border-blue-400" />
                {p.texto}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        {atalhos.map(a => (
      
          <Link
            key={a.href}
            href={a.href}
            className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <IconeMais />
            </span>
            <span className="text-sm font-medium text-gray-700">{a.label}</span>
          </Link>
        ))}
      </div>
{insights.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">💡 Insights</h3>
          <div className="flex flex-col gap-3">
            {insights.map((ins, i) => (
              <div key={i} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl p-3">
                <p className="text-sm text-gray-700">{ins.texto}</p>
                <Link href={ins.link} className="text-xs text-blue-600 hover:underline whitespace-nowrap flex-shrink-0">
                  Ver detalhes
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Agenda de hoje</h3>

        {carregando ? (
          <p className="text-sm text-gray-400">Carregando...</p>
        ) : agendamentosValidos.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhum agendamento para hoje.</p>
        ) : (
          <div className="relative pl-4">
            <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-100" />
            <div className="flex flex-col gap-4">
              {agendamentosValidos.map(a => (
                <div key={a.id} className="relative flex items-start gap-4 pl-6">
                  <span className={`absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full ${STATUS_CORES[a.status]}`} />

                  <span className="text-xs font-medium text-gray-500 w-12 flex-shrink-0 pt-0.5">
                    {new Date(a.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                    style={{ backgroundColor: a.professionals?.cor_agenda || '#94a3b8' }}
                  >
                    {a.pets?.nome?.charAt(0).toUpperCase() || '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {a.pets?.nome} — {a.services?.nome}
                    </p>
                    <p className="text-xs text-gray-400">
                      {a.customers?.nome} {a.professionals?.nome && `• ${a.professionals.nome}`}
                      {a.precisa_transporte && ' • 🚐 Transporte'}
                    </p>
                  </div>

                  <span className="text-xs px-2 py-1 rounded-full bg-gray-50 text-gray-600 whitespace-nowrap">
                    {STATUS_LABELS[a.status]}
                  </span>

                  <p className="text-sm font-medium text-gray-900 w-16 text-right flex-shrink-0">
                    R$ {Number(a.preco_cobrado || 0).toFixed(0)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h3 className="text-sm font-medium text-gray-900 mb-1">Receita — ultimos 7 dias</h3>
          <p className="text-xs text-gray-400 mb-3">
            Total: R$ {receita30Dias.reduce((s, v) => s + v, 0).toFixed(2).replace('.', ',')}
          </p>
          <GraficoBarras valores={receita30Dias} cor="#16a34a" />
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h3 className="text-sm font-medium text-gray-900 mb-1">Agendamentos — ultimos 7 dias</h3>
          <p className="text-xs text-gray-400 mb-3">
            Total: {agendamentos30Dias.reduce((s, v) => s + v, 0)} agendamentos
          </p>
          <GraficoBarras valores={agendamentos30Dias} cor="#2563eb" />
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Receita por categoria</h3>
          {receitaPorCategoria.length === 0 ? (
            <p className="text-xs text-gray-400">Sem dados no periodo.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {receitaPorCategoria.map(c => {
                const total = receitaPorCategoria.reduce((s, x) => s + x.valor, 0)
                const pct = total > 0 ? (c.valor / total) * 100 : 0
                return (
                  <div key={c.categoria}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">{c.categoria}</span>
                      <span className="text-gray-400">R$ {c.valor.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Indicadores do mes</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-xs text-gray-400 mb-1">Faturamento do mes</p>
            <p className="text-lg font-semibold text-gray-900">R$ {indicadoresMes.faturamento.toFixed(2).replace('.', ',')}</p>
            {variacao(indicadoresMes.faturamento, indicadoresMes.faturamentoAnterior) && (
              <p className={`text-xs mt-1 ${variacao(indicadoresMes.faturamento, indicadoresMes.faturamentoAnterior)!.positivo ? 'text-green-600' : 'text-red-500'}`}>
                {variacao(indicadoresMes.faturamento, indicadoresMes.faturamentoAnterior)!.texto.replace('vs ontem', 'vs mes anterior')}
              </p>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-xs text-gray-400 mb-1">Lucro do mes</p>
            <p className="text-lg font-semibold text-gray-900">R$ {indicadoresMes.lucro.toFixed(2).replace('.', ',')}</p>
            {variacao(indicadoresMes.lucro, indicadoresMes.lucroAnterior) && (
              <p className={`text-xs mt-1 ${variacao(indicadoresMes.lucro, indicadoresMes.lucroAnterior)!.positivo ? 'text-green-600' : 'text-red-500'}`}>
                {variacao(indicadoresMes.lucro, indicadoresMes.lucroAnterior)!.texto.replace('vs ontem', 'vs mes anterior')}
              </p>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-xs text-gray-400 mb-1">Ticket medio</p>
            <p className="text-lg font-semibold text-gray-900">R$ {indicadoresMes.ticketMedio.toFixed(2).replace('.', ',')}</p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-xs text-gray-400 mb-1">Novos clientes</p>
            <p className="text-lg font-semibold text-gray-900">{indicadoresMes.novosClientes}</p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-xs text-gray-400 mb-1">Pacotes ativos</p>
            <p className="text-lg font-semibold text-gray-900">{indicadoresMes.pacotesAtivos}</p>
          </div>
        </div>
      </div>
    </div>
  )
}