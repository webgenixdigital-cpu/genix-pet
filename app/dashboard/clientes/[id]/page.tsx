'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Pet = {
  id: string
  nome: string
  especie: string
  porte: string
  raca: string | null
  sexo: string | null
  pelagem: string
  castrado: boolean | null
  observacoes: string | null
  criado_em: string
}

type Cliente = {
  id: string
  nome: string
  telefone: string
  email: string | null
  endereco_rua: string | null
  endereco_numero: string | null
  endereco_bairro: string | null
  endereco_cidade: string | null
  endereco_cep: string | null
  observacoes: string | null
}

type PacoteCliente = {
  id: string
  sessoes_total: number
  sessoes_usadas: number
  sessoes_restantes: number
  status: string
  pago: boolean
  pet_id: string
  pacote_config_desconto: { nome: string } | null
}

type Agendamento = {
  id: string
  inicio: string
  status: string
  observacoes: string | null
  preco_cobrado: number | null
  pago: boolean
  pet_id: string
  pets: { nome: string } | null
  professionals: { nome: string } | null
}

type Pendencia = {
  id: string
  categoria: string | null
  descricao: string
  valor: number
  data_lancamento: string
  appointment_id: string | null
  customer_package_id: string | null
}
function formatarDataISO(data: Date): string {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  em_espera: { label: 'Aguardando aprovacao', cor: 'bg-yellow-100 text-yellow-700' },
  agendado: { label: 'Agendado', cor: 'bg-gray-100 text-gray-600' },
  confirmado: { label: 'Confirmado', cor: 'bg-blue-100 text-blue-700' },
  em_atendimento: { label: 'Em atendimento', cor: 'bg-purple-100 text-purple-700' },
  concluido: { label: 'Concluido', cor: 'bg-green-100 text-green-700' },
  cancelado: { label: 'Cancelado', cor: 'bg-red-50 text-red-500' },
  faltou: { label: 'Faltou', cor: 'bg-red-50 text-red-500' },
}

export default function DetalhesClientePage() {
  const params = useParams()
  const router = useRouter()
  const clienteId = params.id as string
  const supabase = createClient()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [pets, setPets] = useState<Pet[]>([])
  const [pacotes, setPacotes] = useState<PacoteCliente[]>([])
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
    const [ticketAberto, setTicketAberto] = useState<Agendamento | null>(null)
  const [petSelecionadoId, setPetSelecionadoId] = useState<string | null>(null)
  const [pendencias, setPendencias] = useState<Pendencia[]>([])
  const [modalReceber, setModalReceber] = useState<Pendencia | null>(null)
  const [formaRecebimento, setFormaRecebimento] = useState('Dinheiro')
  const [recebendo, setRecebendo] = useState(false)  
  const [editandoObsPet, setEditandoObsPet] = useState(false)
  const [obsPetTexto, setObsPetTexto] = useState('')
  const [salvandoObsPet, setSalvandoObsPet] = useState(false)

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [enderecoRua, setEnderecoRua] = useState('')
  const [enderecoNumero, setEnderecoNumero] = useState('')
  const [enderecoBairro, setEnderecoBairro] = useState('')
  const [enderecoCidade, setEnderecoCidade] = useState('')
  const [enderecoCep, setEnderecoCep] = useState('')
  const [observacoes, setObservacoes] = useState('')

  async function carregarDados() {
    setCarregando(true)

    const { data: clienteData } = await supabase
      .from('customers')
      .select('*')
      .eq('id', clienteId)
      .single()

    const { data: petsData } = await supabase
      .from('pets')
      .select('id, nome, especie, porte, raca, sexo, pelagem, castrado, observacoes, criado_em')
      .eq('customer_id', clienteId)
      .eq('ativo', true)

        const { data: pacotesData } = await supabase
      .from('customer_packages')
      .select('id, sessoes_total, sessoes_usadas, sessoes_restantes, status, pago, pet_id, pacote_config_desconto ( nome )')
      .eq('customer_id', clienteId)
      .order('comprado_em', { ascending: false })

        const { data: agendamentosData } = await supabase
      .from('appointments')
      .select('id, inicio, status, observacoes, preco_cobrado, pago, pet_id, pets ( nome ), professionals ( nome )')
      .eq('customer_id', clienteId)
      .order('inicio', { ascending: false })
      .limit(200)

    const { data: pendenciasData } = await supabase
      .from('financial_transactions')
      .select('id, categoria, descricao, valor, data_lancamento, appointment_id, customer_package_id')
      .eq('customer_id', clienteId)
      .eq('status', 'pendente')
      .order('data_lancamento', { ascending: true })

    if (clienteData) {
      setCliente(clienteData)
      setNome(clienteData.nome)
      setTelefone(clienteData.telefone)
      setEmail(clienteData.email || '')
      setEnderecoRua(clienteData.endereco_rua || '')
      setEnderecoNumero(clienteData.endereco_numero || '')
      setEnderecoBairro(clienteData.endereco_bairro || '')
      setEnderecoCidade(clienteData.endereco_cidade || '')
      setEnderecoCep(clienteData.endereco_cep || '')
      setObservacoes(clienteData.observacoes || '')
    }

        setPets(petsData || [])
    setPacotes((pacotesData as any) || [])
    setAgendamentos((agendamentosData as any) || [])
    setPendencias(pendenciasData || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregarDados()
  }, [clienteId])

  async function salvarEdicao() {
    setSalvando(true)

    await supabase
      .from('customers')
      .update({
        nome,
        telefone,
        email: email || null,
        endereco_rua: enderecoRua || null,
        endereco_numero: enderecoNumero || null,
        endereco_bairro: enderecoBairro || null,
        endereco_cidade: enderecoCidade || null,
        endereco_cep: enderecoCep || null,
        observacoes: observacoes || null,
      })
      .eq('id', clienteId)

    setSalvando(false)
    setEditando(false)
    carregarDados()
  }
    async function confirmarRecebimentoCliente() {
    if (!modalReceber) return
    setRecebendo(true)

        await supabase
      .from('financial_transactions')
      .update({ status: 'pago', forma_pagamento: formaRecebimento, data_lancamento: formatarDataISO(new Date()) })
      .eq('id', modalReceber.id)

    if (modalReceber.appointment_id) {
      await supabase.from('appointments').update({ pago: true }).eq('id', modalReceber.appointment_id)
    }

    if (modalReceber.customer_package_id) {
      await supabase.from('customer_packages').update({ pago: true }).eq('id', modalReceber.customer_package_id)
    }

    setRecebendo(false)
    setModalReceber(null)
    carregarDados()
  }
  async function salvarObsPet() {
    if (!petSelecionadoId) return
    setSalvandoObsPet(true)

    await supabase
      .from('pets')
      .update({ observacoes: obsPetTexto || null })
      .eq('id', petSelecionadoId)

    setSalvandoObsPet(false)
    setEditandoObsPet(false)
    carregarDados()
  }
  function enviarTicketWhatsapp(a: Agendamento) {
    const telefoneNum = telefone.replace(/\D/g, '')
    if (!telefoneNum) {
      alert('Cliente sem telefone cadastrado.')
      return
    }
    const telefoneComDDI = telefoneNum.startsWith('55') ? telefoneNum : `55${telefoneNum}`
    const dataFormatada = new Date(a.inicio).toLocaleDateString('pt-BR')
    const mensagem = `Ola, ${nome}! Aqui esta o resumo do atendimento do(a) ${a.pets?.nome} em ${dataFormatada}:\n\n${a.observacoes || 'Servico'}\n💰 Valor: R$ ${Number(a.preco_cobrado || 0).toFixed(2).replace('.', ',')}\n\nObrigado pela confianca!`
    window.open(`https://wa.me/${telefoneComDDI}?text=${encodeURIComponent(mensagem)}`, '_blank')
  }

    const agendamentosFiltrados = petSelecionadoId
    ? agendamentos.filter(a => a.pet_id === petSelecionadoId)
    : agendamentos

  const pacotesFiltrados = petSelecionadoId
    ? pacotes.filter(pc => pc.pet_id === petSelecionadoId)
    : pacotes

  const resumoConsumo = {
    totalVisitas: agendamentosFiltrados.filter(a => a.status === 'concluido').length,
    totalGasto: agendamentosFiltrados.filter(a => a.status === 'concluido').reduce((s, a) => s + Number(a.preco_cobrado || 0), 0),
    pendente: agendamentosFiltrados.filter(a => a.status === 'concluido' && !a.pago).reduce((s, a) => s + Number(a.preco_cobrado || 0), 0),
  }

  const petSelecionado = petSelecionadoId ? pets.find(p => p.id === petSelecionadoId) : null

  const resumoPet = petSelecionado ? {
    totalAgendamentos: agendamentosFiltrados.length,
    desde: agendamentosFiltrados.length > 0
      ? new Date(Math.min(...agendamentosFiltrados.map(a => new Date(a.inicio).getTime()))).toLocaleDateString('pt-BR')
      : new Date(petSelecionado.criado_em).toLocaleDateString('pt-BR'),
    planoAtivo: pacotesFiltrados.find(pc => pc.status === 'ativo') || null,
  } : null
  
  if (carregando) {
    return <p className="text-sm text-gray-400">Carregando...</p>
  }

  if (!cliente) {
    return <p className="text-sm text-gray-400">Cliente nao encontrado.</p>
  }

  return (
    <div>
      <button
        onClick={() => router.push('/dashboard/clientes')}
        className="text-xs text-blue-600 mb-4 hover:underline"
      >
        ← Voltar para clientes
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{cliente.nome}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{cliente.telefone}</p>
        </div>
        <button
          onClick={() => setEditando(!editando)}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {editando ? 'Cancelar' : '✏️ Editar dados'}
        </button>
      </div>

            {pendencias.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-medium text-orange-900 mb-3">
            ⚠️ {pendencias.length} pendencia(s) financeira(s)
          </h3>
          <div className="flex flex-col gap-2">
            {pendencias.map(p => (
              <div key={p.id} className="bg-white rounded-lg p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.descricao}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(p.data_lancamento + 'T00:00:00').toLocaleDateString('pt-BR')} • {p.categoria}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium text-orange-600 whitespace-nowrap">
                    R$ {Number(p.valor).toFixed(2).replace('.', ',')}
                  </p>
                  <button
                    onClick={() => { setModalReceber(p); setFormaRecebimento('Dinheiro') }}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Receber
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900">{resumoConsumo.totalVisitas}</p>
          <p className="text-xs text-gray-400 mt-0.5">Visitas concluidas</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold text-green-600">
            R$ {resumoConsumo.totalGasto.toFixed(2).replace('.', ',')}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Total consumido</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
          <p className={`text-2xl font-semibold ${resumoConsumo.pendente > 0 ? 'text-orange-500' : 'text-gray-300'}`}>
            R$ {resumoConsumo.pendente.toFixed(2).replace('.', ',')}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Pendente</p>
        </div>
      </div>
      
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">📞 Dados de contato</h3>

        {editando ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Nome</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Telefone</label>
                <input
                  type="text"
                  value={telefone}
                  onChange={e => setTelefone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">CEP</label>
                <input
                  type="text"
                  value={enderecoCep}
                  onChange={e => setEnderecoCep(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Rua</label>
                <input
                  type="text"
                  value={enderecoRua}
                  onChange={e => setEnderecoRua(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="w-24">
                <label className="text-xs text-gray-500 mb-1 block">Numero</label>
                <input
                  type="text"
                  value={enderecoNumero}
                  onChange={e => setEnderecoNumero(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Bairro</label>
                <input
                  type="text"
                  value={enderecoBairro}
                  onChange={e => setEnderecoBairro(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Cidade</label>
                <input
                  type="text"
                  value={enderecoCidade}
                  onChange={e => setEnderecoCidade(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Observacoes</label>
              <input
                type="text"
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={salvarEdicao}
              disabled={salvando}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Salvar alteracoes'}
            </button>
          </div>
        ) : (
          <div className="text-sm text-gray-600 flex flex-col gap-1.5">
            <p><span className="text-gray-400">Telefone:</span> {cliente.telefone}</p>
            {cliente.email && <p><span className="text-gray-400">E-mail:</span> {cliente.email}</p>}
            {cliente.endereco_rua && (
              <p><span className="text-gray-400">Endereco:</span> {cliente.endereco_rua}, {cliente.endereco_numero} - {cliente.endereco_bairro}, {cliente.endereco_cidade}</p>
            )}
            {cliente.observacoes && <p><span className="text-gray-400">Obs:</span> {cliente.observacoes}</p>}
          </div>
        )}
      </div>
      
            <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">🐾 Pets</h3>
        {pets.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum pet cadastrado.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pets.map(p => (
              <button
                key={p.id}
                onClick={() => { setPetSelecionadoId(p.id); setEditandoObsPet(false); setObsPetTexto(p.observacoes || '') }}
                className={`border rounded-lg p-3 text-left transition-colors ${
                  petSelecionadoId === p.id ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:border-blue-200'
                }`}
              >
                <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                <p className="text-xs text-gray-400">
                  {p.especie} • {p.porte} • {p.raca || 'SRD'} • pelagem {p.pelagem}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {pacotes.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">🎁 Pacotes / Planos</h3>
          <div className="flex flex-col gap-2">
            {pacotes.map(pc => (
              <div key={pc.id} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{pc.pacote_config_desconto?.nome || 'Plano'}</p>
                  <p className="text-xs text-gray-400">{pc.sessoes_usadas} de {pc.sessoes_total} usadas</p>
                </div>
                <div className="flex items-center gap-2">
                  {!pc.pago && (
                    <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Pendente</span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    pc.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {pc.sessoes_restantes} restantes
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
            {pets.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => { setPetSelecionadoId(null); setEditandoObsPet(false) }}
            className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
              !petSelecionadoId ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            Todos os pets
          </button>
          {pets.map(p => (
            <button
              key={p.id}
              onClick={() => { setPetSelecionadoId(p.id); setEditandoObsPet(false); setObsPetTexto(p.observacoes || '') }}
              className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
                petSelecionadoId === p.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {p.nome}
            </button>
          ))}
        </div>
      )}

      {petSelecionado && resumoPet && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-blue-900">Sobre o(a) {petSelecionado.nome}</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs text-blue-600">Cliente desde</p>
              <p className="text-sm font-medium text-blue-900">{resumoPet.desde}</p>
            </div>
            <div>
              <p className="text-xs text-blue-600">Total de agendamentos</p>
              <p className="text-sm font-medium text-blue-900">{resumoPet.totalAgendamentos}</p>
            </div>
          </div>

          {resumoPet.planoAtivo && (
            <div className="bg-white rounded-lg p-3 mb-3">
              <p className="text-xs text-gray-400">Plano ativo</p>
              <p className="text-sm font-medium text-gray-900">
                {resumoPet.planoAtivo.pacote_config_desconto?.nome} — {resumoPet.planoAtivo.sessoes_usadas}/{resumoPet.planoAtivo.sessoes_total} usadas
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-blue-600">Observacoes</p>
              {!editandoObsPet && (
                <button onClick={() => setEditandoObsPet(true)} className="text-xs text-blue-600 hover:underline">
                  ✏️ Editar
                </button>
              )}
            </div>
            {editandoObsPet ? (
              <div>
                <textarea
                  value={obsPetTexto}
                  onChange={e => setObsPetTexto(e.target.value)}
                  rows={3}
                  placeholder="Alergias, preferencias, comportamento..."
                  className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <button
                  onClick={salvarObsPet}
                  disabled={salvandoObsPet}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors mt-2 disabled:opacity-50"
                >
                  {salvandoObsPet ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            ) : (
              <p className="text-sm text-blue-900">{petSelecionado.observacoes || 'Nenhuma observacao registrada.'}</p>
            )}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <h3 className="text-sm font-medium text-gray-900 mb-4">
          📋 Historico de agendamentos {petSelecionado ? `de ${petSelecionado.nome}` : ''}
        </h3>
        {agendamentosFiltrados.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum agendamento ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {agendamentosFiltrados.map(a => {
              const statusInfo = STATUS_LABEL[a.status] || { label: a.status, cor: 'bg-gray-100 text-gray-600' }
              return (
                <div key={a.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(a.inicio).toLocaleDateString('pt-BR')} • {new Date(a.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusInfo.cor}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {a.pets?.nome} • {a.observacoes || 'Servico'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm font-medium text-gray-900">
                      R$ {Number(a.preco_cobrado || 0).toFixed(2).replace('.', ',')}
                      {a.pago && <span className="text-xs text-green-600 ml-1">✓ pago</span>}
                    </p>
                    {a.status === 'concluido' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setTicketAberto(a)}
                          title="Ver/reimprimir ticket"
                          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-xs hover:bg-gray-50 transition-colors"
                        >
                          🎫
                        </button>
                        <button
                          onClick={() => enviarTicketWhatsapp(a)}
                          title="Enviar resumo por WhatsApp"
                          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-xs hover:bg-gray-50 transition-colors"
                        >
                          📤
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      {ticketAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 print:bg-white print:static">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 print:rounded-none print:max-w-none print:shadow-none">
            <style>{`
              @media print {
                @page { size: 80mm auto; margin: 0; }
                body * { visibility: hidden; }
                #area-ticket-cliente, #area-ticket-cliente * { visibility: visible; }
                #area-ticket-cliente {
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

            <div id="area-ticket-cliente" className="font-mono text-xs">
              <div className="text-center mb-3">
                <p className="font-bold text-sm">GENIX PET</p>
                <p>Ticket de Atendimento</p>
                <p>{new Date(ticketAberto.inicio).toLocaleDateString('pt-BR')} {new Date(ticketAberto.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="border-t border-dashed border-gray-400 my-2" />
              <p>Cliente: {cliente.nome}</p>
              <p>Telefone: {cliente.telefone}</p>
              <p>Pet: {ticketAberto.pets?.nome}</p>
              <p>Servico: {ticketAberto.observacoes}</p>
              {ticketAberto.professionals?.nome && <p>Profissional: {ticketAberto.professionals.nome}</p>}
              <div className="border-t border-dashed border-gray-400 my-2" />
              <p>Valor: R$ {Number(ticketAberto.preco_cobrado || 0).toFixed(2).replace('.', ',')}</p>
              <p>{ticketAberto.pago ? 'PAGO' : 'PENDENTE'}</p>
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

      {modalReceber && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Receber pagamento</h3>
            <p className="text-sm text-gray-500 mb-4">
              {modalReceber.descricao} • R$ {Number(modalReceber.valor).toFixed(2).replace('.', ',')}
            </p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Forma de pagamento</label>
                <select
                  value={formaRecebimento}
                  onChange={e => setFormaRecebimento(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Pix">Pix</option>
                  <option value="Cartao de credito">Cartao de credito</option>
                  <option value="Cartao de debito">Cartao de debito</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setModalReceber(null)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarRecebimentoCliente}
                  disabled={recebendo}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {recebendo ? 'Confirmando...' : 'Confirmar recebimento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}