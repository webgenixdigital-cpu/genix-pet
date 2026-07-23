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
  sexo: string
  pelagem: string
  castrado: boolean
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
  service_packages: { nome: string } | null
}

export default function DetalhesClientePage() {
  const params = useParams()
  const router = useRouter()
  const clienteId = params.id as string
  const supabase = createClient()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [pets, setPets] = useState<Pet[]>([])
  const [pacotes, setPacotes] = useState<PacoteCliente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)

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
      .select('id, nome, especie, porte, raca, sexo, pelagem, castrado')
      .eq('customer_id', clienteId)
      .eq('ativo', true)

    const { data: pacotesData } = await supabase
      .from('customer_packages')
      .select('id, sessoes_total, sessoes_usadas, sessoes_restantes, status, service_packages ( nome )')
      .eq('customer_id', clienteId)
      .order('comprado_em', { ascending: false })

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
        <h2 className="text-xl font-semibold text-gray-900">{cliente.nome}</h2>
        <button
          onClick={() => setEditando(!editando)}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {editando ? 'Cancelar' : 'Editar dados'}
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Dados de contato</h3>

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
          <div className="text-sm text-gray-600 flex flex-col gap-1">
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
        <h3 className="text-sm font-medium text-gray-900 mb-4">Pets</h3>
        {pets.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum pet cadastrado.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {pets.map(p => (
              <div key={p.id} className="border border-gray-100 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                <p className="text-xs text-gray-400">
                  {p.especie} • {p.porte} • {p.raca || 'SRD'} • {p.sexo} • pelagem {p.pelagem} • {p.castrado ? 'castrado' : 'nao castrado'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {pacotes.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Pacotes</h3>
          <div className="flex flex-col gap-2">
            {pacotes.map(pc => (
              <div key={pc.id} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{pc.service_packages?.nome}</p>
                  <p className="text-xs text-gray-400">{pc.sessoes_usadas} de {pc.sessoes_total} usadas</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  pc.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {pc.sessoes_restantes} restantes
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}