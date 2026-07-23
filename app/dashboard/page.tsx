'use client'

import { useState, useEffect } from 'react'
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
  customers: { nome: string } | null
  pets: { nome: string } | null
  services: { nome: string } | null
  professionals: { nome: string; cor_agenda: string } | null
}

function formatarDataISO(data: Date): string {
  return data.toISOString().split('T')[0]
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
  em_espera: 'bg-yellow-100 text-yellow-700',
  agendado: 'bg-gray-100 text-gray-600',
  confirmado: 'bg-blue-100 text-blue-600',
  em_atendimento: 'bg-purple-100 text-purple-600',
  concluido: 'bg-green-100 text-green-600',
  cancelado: 'bg-red-100 text-red-600',
  faltou: 'bg-red-100 text-red-600',
}

export default function DashboardPage() {
  const [tenantNome, setTenantNome] = useState('')
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [servicos, setServicos] = useState<{ id: string; nome: string; preco: number }[]>([])
  const [profissionais, setProfissionais] = useState<{ id: string; nome: string }[]>([])
  const [modalEdicao, setModalEdicao] = useState<Agendamento | null>(null)
  const [edServicoId, setEdServicoId] = useState('')
  const [edProfissionalId, setEdProfissionalId] = useState('')
  const [edPrecisaTransporte, setEdPrecisaTransporte] = useState(false)
  const [edEnderecoColeta, setEdEnderecoColeta] = useState('')
  const [edSalvando, setEdSalvando] = useState(false)
  const [despesasHoje, setDespesasHoje] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [dataFiltro, setDataFiltro] = useState(formatarDataISO(new Date()))
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroTransporte, setFiltroTransporte] = useState(false)
  const supabase = createClient()

  async function carregarDados() {
    setCarregando(true)
    const { data: tenant } = await supabase.from('tenants').select('id, nome').single()
    if (!tenant) return
    setTenantNome(tenant.nome)

    const { data: agendamentosData } = await supabase
      .from('appointments')
      .select(`
        id, inicio, status, preco_cobrado, precisa_transporte, endereco_coleta, service_id, professional_id,
        customers ( nome ), pets ( nome ), services ( nome ), professionals ( nome, cor_agenda )
      `)
      .eq('tenant_id', tenant.id)
      .gte('inicio', dataFiltro + 'T00:00:00')
      .lte('inicio', dataFiltro + 'T23:59:59')
      .order('inicio')

    const { data: financeiroData } = await supabase
      .from('financial_transactions')
      .select('valor')
      .eq('tenant_id', tenant.id)
      .eq('tipo', 'despesa')
      .eq('data_lancamento', dataFiltro)

    const { data: servicosData } = await supabase
      .from('services').select('id, nome, preco').eq('tenant_id', tenant.id).eq('ativo', true).order('nome')
    const { data: profissionaisData } = await supabase
      .from('professionals').select('id, nome').eq('tenant_id', tenant.id).eq('ativo', true).order('nome')

    setServicos(servicosData || [])
    setProfissionais(profissionaisData || [])
    setAgendamentos((agendamentosData as any) || [])
    setDespesasHoje((financeiroData || []).reduce((s, f) => s + Number(f.valor), 0))
    setCarregando(false)
  }

  useEffect(() => { carregarDados() }, [dataFiltro])
  function abrirEdicao(agendamento: any) {
    setModalEdicao(agendamento)
    setEdServicoId(agendamento.service_id || '')
    setEdProfissionalId(agendamento.professional_id || '')
    setEdPrecisaTransporte(agendamento.precisa_transporte || false)
    setEdEnderecoColeta(agendamento.endereco_coleta || '')
  }

  async function salvarEdicao() {
    if (!modalEdicao) return
    setEdSalvando(true)

    const servico = servicos.find(s => s.id === edServicoId)

    await supabase
      .from('appointments')
      .update({
        service_id: edServicoId || null,
        professional_id: edProfissionalId || null,
        preco_cobrado: servico?.preco ?? modalEdicao.preco_cobrado,
        precisa_transporte: edPrecisaTransporte,
        endereco_coleta: edPrecisaTransporte ? edEnderecoColeta : null,
        endereco_entrega: edPrecisaTransporte ? edEnderecoColeta : null,
      })
      .eq('id', modalEdicao.id)

    setEdSalvando(false)
    setModalEdicao(null)
    carregarDados()
  }

  async function excluirAgendamento() {
    if (!modalEdicao) return
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return

    setEdSalvando(true)
    await supabase.from('appointments').update({ status: 'cancelado' }).eq('id', modalEdicao.id)
    setEdSalvando(false)
    setModalEdicao(null)
    carregarDados()
  }

  const agendamentosValidos = agendamentos.filter(a => a.status !== 'cancelado' && a.status !== 'faltou')
  const totalAReceber = agendamentosValidos
    .filter(a => a.status !== 'concluido')
    .reduce((s, a) => s + Number(a.preco_cobrado || 0), 0)
  const totalRecebidoHoje = agendamentos
    .filter(a => a.status === 'concluido')
    .reduce((s, a) => s + Number(a.preco_cobrado || 0), 0)
  const transportesHoje = agendamentosValidos.filter(a => a.precisa_transporte)
  const aguardandoAprovacao = agendamentos.filter(a => a.status === 'em_espera').length

  const agendamentosFiltrados = agendamentosValidos.filter(a => {
    if (filtroStatus !== 'todos' && a.status !== filtroStatus) return false
    if (filtroTransporte && !a.precisa_transporte) return false
    return true
  })
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Ola, {tenantNome}!</h2>
          <p className="text-sm text-gray-500 mt-0.5">Resumo do dia</p>
        </div>
        <input
          type="date"
          value={dataFiltro}
          onChange={e => setDataFiltro(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-xs text-gray-400">Agendamentos do dia</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{agendamentosValidos.length}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-xs text-gray-400">A receber hoje</p>
          <p className="text-2xl font-semibold text-blue-600 mt-1">
            R$ {totalAReceber.toFixed(2).replace('.', ',')}
          </p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-xs text-gray-400">Recebido hoje</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">
            R$ {totalRecebidoHoje.toFixed(2).replace('.', ',')}
          </p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-xs text-gray-400">Despesas do dia</p>
          <p className="text-2xl font-semibold text-red-500 mt-1">
            R$ {despesasHoje.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </div>

      {(aguardandoAprovacao > 0 || transportesHoje.length > 0) && (
        <div className="flex gap-3 mb-6">
          {aguardandoAprovacao > 0 && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-2.5 text-sm text-yellow-700">
              ⏳ {aguardandoAprovacao} agendamento(s) aguardando aprovacao
            </div>
          )}
          {transportesHoje.length > 0 && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-2.5 text-sm text-orange-700">
              🚐 {transportesHoje.length} precisam de transporte hoje
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([valor, label]) => (
            <option key={valor} value={valor}>{label}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={filtroTransporte}
            onChange={e => setFiltroTransporte(e.target.checked)}
            className="w-4 h-4"
          />
          Somente com transporte
        </label>
      </div>

      {carregando ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : agendamentosFiltrados.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum agendamento encontrado com esse filtro.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {agendamentosFiltrados.map(a => (
            <div key={a.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-4">
              <span className="text-sm font-medium text-gray-900 w-14">
                {new Date(a.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>

              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                style={{ backgroundColor: a.professionals?.cor_agenda || '#94a3b8' }}
              >
                {a.professionals?.nome?.charAt(0).toUpperCase() || '?'}
              </div>

              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {a.pets?.nome} — {a.services?.nome}
                </p>
                <p className="text-xs text-gray-400">{a.customers?.nome}</p>
              </div>

              {a.precisa_transporte && (
                <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">🚐 Transporte</span>
              )}

              <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_CORES[a.status]}`}>
                {STATUS_LABELS[a.status]}
              </span>

              <p className="text-sm font-medium text-gray-900 w-20 text-right">
                R$ {Number(a.preco_cobrado || 0).toFixed(2).replace('.', ',')}
              </p>

              <button
                onClick={() => abrirEdicao(a)}
                className="text-xs text-blue-600 hover:underline whitespace-nowrap"
              >
                Editar
              </button>
            </div>
          ))}
        </div>
      )}

      {modalEdicao && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Editar agendamento</h3>
            <p className="text-sm text-gray-500 mb-4">{modalEdicao.pets?.nome} — {modalEdicao.customers?.nome}</p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Servico</label>
                <select
                  value={edServicoId}
                  onChange={e => setEdServicoId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Profissional</label>
                <select
                  value={edProfissionalId}
                  onChange={e => setEdProfissionalId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sem profissional definido</option>
                  {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={edPrecisaTransporte}
                  onChange={e => setEdPrecisaTransporte(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Precisa de transporte</span>
              </label>

              {edPrecisaTransporte && (
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Endereco</label>
                  <input
                    type="text"
                    value={edEnderecoColeta}
                    onChange={e => setEdEnderecoColeta(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setModalEdicao(null)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={excluirAgendamento}
                  disabled={edSalvando}
                  className="flex-1 border border-red-200 text-red-600 text-sm py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Excluir
                </button>
                <button
                  onClick={salvarEdicao}
                  disabled={edSalvando}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {edSalvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}