'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Cliente = {
  id: string
  nome: string
  telefone: string
  cpf: string | null
  pets: { id: string; nome: string }[]
}

type Pacote = {
  id: string
  nome: string
  quantidade_sessoes: number
  preco_total: number
  validade_dias: number
}

export default function ClientesPage() {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busca, setBusca] = useState('')  
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalVenda, setModalVenda] = useState<Cliente | null>(null)
  const [pacoteSelecionado, setPacoteSelecionado] = useState('')
  const [petSelecionado, setPetSelecionado] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const supabase = createClient()

  async function carregarDados() {
    setCarregando(true)
    const { data: tenant } = await supabase.from('tenants').select('id').single()
    if (!tenant) return

    const { data: clientesData } = await supabase
      .from('customers')
      .select('id, nome, telefone, cpf, pets ( id, nome )')
      .eq('tenant_id', tenant.id)
      .eq('ativo', true)
      .order('nome')

    const { data: pacotesData } = await supabase
      .from('service_packages')
      .select('id, nome, quantidade_sessoes, preco_total, validade_dias')
      .eq('tenant_id', tenant.id)
      .eq('ativo', true)

    setClientes((clientesData as any) || [])
    setPacotes(pacotesData || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregarDados()
  }, [])

  function abrirVenda(cliente: Cliente) {
    setModalVenda(cliente)
    setPacoteSelecionado('')
    setPetSelecionado(cliente.pets[0]?.id || '')
    setErro('')
  }

  async function venderPacote() {
    if (!modalVenda || !pacoteSelecionado || !petSelecionado) {
      setErro('Selecione o pacote e o pet.')
      return
    }

    setSalvando(true)

    const { data: tenant } = await supabase.from('tenants').select('id').single()
    if (!tenant) return

    const pacote = pacotes.find(p => p.id === pacoteSelecionado)
    if (!pacote) return

    const expiraEm = new Date()
    expiraEm.setDate(expiraEm.getDate() + pacote.validade_dias)

    const { error } = await supabase.from('customer_packages').insert({
      tenant_id: tenant.id,
      customer_id: modalVenda.id,
      pet_id: petSelecionado,
      package_id: pacoteSelecionado,
      sessoes_total: pacote.quantidade_sessoes,
      preco_pago: pacote.preco_total,
      expira_em: expiraEm.toISOString(),
      status: 'ativo',
    })

    if (error) {
      setErro('Erro ao vender pacote: ' + error.message)
      setSalvando(false)
      return
    }

    await supabase.from('financial_transactions').insert({
      tenant_id: tenant.id,
      tipo: 'receita',
      categoria: 'Pacote',
      descricao: `Venda ${pacote.nome} - ${modalVenda.nome}`,
      valor: pacote.preco_total,
      data_lancamento: new Date().toISOString().split('T')[0],
      status: 'pago',
    })

    setSalvando(false)
    setModalVenda(null)
  }
  const buscaLower = busca.trim().toLowerCase()
  const clientesFiltrados = buscaLower
    ? clientes.filter(c =>
        c.nome.toLowerCase().includes(buscaLower) ||
        c.telefone.includes(buscaLower) ||
        (c.cpf || '').toLowerCase().includes(buscaLower) ||
        c.pets.some(p => p.nome.toLowerCase().includes(buscaLower))
      )
    : clientes

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Clientes</h2>
        <p className="text-sm text-gray-500 mt-0.5">Clientes cadastrados e venda de pacotes</p>
      </div>

      <input
        type="text"
        value={busca}
        onChange={e => setBusca(e.target.value)}
        placeholder="Buscar por nome, telefone, CPF ou nome do pet..."
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {carregando ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : clientesFiltrados.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum cliente cadastrado ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {clientesFiltrados.map(c => (
            <div
              key={c.id}
              onClick={() => router.push(`/dashboard/clientes/${c.id}`)}
              className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-blue-300 transition-colors"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{c.nome}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {c.telefone} • Pets: {c.pets.map(p => p.nome).join(', ') || 'nenhum'}
                </p>
              </div>
              {pacotes.length > 0 && c.pets.length > 0 && (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    abrirVenda(c)
                  }}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Vender pacote
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {modalVenda && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Vender pacote</h3>
            <p className="text-sm text-gray-500 mb-4">{modalVenda.nome}</p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Pet</label>
                <select
                  value={petSelecionado}
                  onChange={e => setPetSelecionado(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {modalVenda.pets.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Pacote</label>
                <select
                  value={pacoteSelecionado}
                  onChange={e => setPacoteSelecionado(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {pacotes.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} - R$ {Number(p.preco_total).toFixed(2).replace('.', ',')}
                    </option>
                  ))}
                </select>
              </div>

              {erro && <p className="text-red-500 text-sm">{erro}</p>}

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setModalVenda(null)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={venderPacote}
                  disabled={salvando}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {salvando ? 'Vendendo...' : 'Confirmar venda'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}