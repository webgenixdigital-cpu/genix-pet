'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Servico = {
  id: string
  nome: string
}

type Pacote = {
  id: string
  nome: string
  quantidade_sessoes: number
  preco_total: number
  validade_dias: number
  services: { nome: string } | null
}

export default function PacotesPage() {
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [servicoId, setServicoId] = useState('')
  const [quantidadeSessoes, setQuantidadeSessoes] = useState('10')
  const [precoTotal, setPrecoTotal] = useState('')
  const [validadeDias, setValidadeDias] = useState('365')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const supabase = createClient()

  async function carregarDados() {
    setCarregando(true)
    const { data: tenant } = await supabase.from('tenants').select('id').single()
    if (!tenant) return

    const { data: pacotesData } = await supabase
      .from('service_packages')
      .select('id, nome, quantidade_sessoes, preco_total, validade_dias, services ( nome )')
      .eq('tenant_id', tenant.id)
      .eq('ativo', true)
      .order('nome')

    const { data: servicosData } = await supabase
      .from('services')
      .select('id, nome')
      .eq('tenant_id', tenant.id)
      .eq('ativo', true)
      .order('nome')

    setPacotes((pacotesData as any) || [])
    setServicos(servicosData || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregarDados()
  }, [])

  async function salvarPacote() {
    setSalvando(true)
    setErro('')

    if (!nome || !servicoId || !quantidadeSessoes || !precoTotal) {
      setErro('Preencha todos os campos.')
      setSalvando(false)
      return
    }

    const { data: tenant } = await supabase.from('tenants').select('id').single()
    if (!tenant) {
      setErro('Tenant nao encontrado.')
      setSalvando(false)
      return
    }

    const { error } = await supabase.from('service_packages').insert({
      tenant_id: tenant.id,
      nome,
      service_id: servicoId,
      quantidade_sessoes: parseInt(quantidadeSessoes),
      preco_total: parseFloat(precoTotal),
      validade_dias: parseInt(validadeDias),
      ativo: true,
    })

    if (error) {
      setErro('Erro ao salvar: ' + error.message)
      setSalvando(false)
      return
    }

    setNome('')
    setServicoId('')
    setQuantidadeSessoes('10')
    setPrecoTotal('')
    setValidadeDias('365')
    setModalAberto(false)
    setSalvando(false)
    carregarDados()
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Pacotes</h2>
          <p className="text-sm text-gray-500 mt-0.5">Pacotes pre-pagos de servico</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + Novo pacote
        </button>
      </div>

      {carregando ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : pacotes.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum pacote cadastrado ainda.</p>
          <button
            onClick={() => setModalAberto(true)}
            className="mt-4 text-blue-600 text-sm hover:underline"
          >
            Cadastrar o primeiro pacote
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {pacotes.map(p => (
            <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {p.quantidade_sessoes}x {p.services?.nome} • valido {p.validade_dias} dias
                </p>
              </div>
              <p className="text-sm font-medium text-gray-900">
                R$ {Number(p.preco_total).toFixed(2).replace('.', ',')}
              </p>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Novo pacote</h3>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Nome do pacote</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Pacote 10 Banhos"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Servico</label>
                <select
                  value={servicoId}
                  onChange={e => setServicoId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {servicos.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Quantidade de sessoes</label>
                  <input
                    type="number"
                    value={quantidadeSessoes}
                    onChange={e => setQuantidadeSessoes(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Validade (dias)</label>
                  <input
                    type="number"
                    value={validadeDias}
                    onChange={e => setValidadeDias(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Preco total do pacote (R$)</label>
                <input
                  type="number"
                  value={precoTotal}
                  onChange={e => setPrecoTotal(e.target.value)}
                  placeholder="450.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {erro && <p className="text-red-500 text-sm">{erro}</p>}

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setModalAberto(false)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarPacote}
                  disabled={salvando}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}