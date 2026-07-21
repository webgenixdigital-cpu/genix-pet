'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Produto = {
  id: string
  nome: string
  descricao: string | null
  preco_venda: number
  preco_custo: number | null
  estoque_atual: number
  estoque_minimo: number
  unidade: string
  ativo: boolean
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [precoVenda, setPrecoVenda] = useState('')
  const [precoCusto, setPrecoCusto] = useState('')
  const [estoqueAtual, setEstoqueAtual] = useState('')
  const [estoqueMinimo, setEstoqueMinimo] = useState('')
  const [unidade, setUnidade] = useState('un')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const supabase = createClient()

  async function carregarProdutos() {
    setCarregando(true)
    const { data: tenant } = await supabase.from('tenants').select('id').single()
    if (!tenant) return

    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('ativo', true)
      .order('nome')

    setProdutos(data || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregarProdutos()
  }, [])

  async function salvarProduto() {
    setSalvando(true)
    setErro('')

    if (!nome || !precoVenda) {
      setErro('Preencha nome e preco de venda.')
      setSalvando(false)
      return
    }

    const { data: tenant } = await supabase.from('tenants').select('id').single()
    if (!tenant) {
      setErro('Tenant nao encontrado.')
      setSalvando(false)
      return
    }

    const { error } = await supabase.from('products').insert({
      tenant_id: tenant.id,
      nome,
      descricao: descricao || null,
      preco_venda: parseFloat(precoVenda),
      preco_custo: precoCusto ? parseFloat(precoCusto) : null,
      estoque_atual: parseFloat(estoqueAtual) || 0,
      estoque_minimo: parseFloat(estoqueMinimo) || 0,
      unidade,
      ativo: true,
    })

    if (error) {
      setErro('Erro ao salvar: ' + error.message)
      setSalvando(false)
      return
    }

    setNome('')
    setDescricao('')
    setPrecoVenda('')
    setPrecoCusto('')
    setEstoqueAtual('')
    setEstoqueMinimo('')
    setModalAberto(false)
    setSalvando(false)
    carregarProdutos()
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Produtos</h2>
          <p className="text-sm text-gray-500 mt-0.5">Catalogo e estoque</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + Novo produto
        </button>
      </div>

      {carregando ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : produtos.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum produto cadastrado ainda.</p>
          <button
            onClick={() => setModalAberto(true)}
            className="mt-4 text-blue-600 text-sm hover:underline"
          >
            Cadastrar o primeiro produto
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {produtos.map(p => {
            const estoqueBaixo = p.estoque_atual <= p.estoque_minimo
            return (
              <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                  {p.descricao && <p className="text-xs text-gray-400 mt-0.5">{p.descricao}</p>}
                </div>

                <div className="text-right">
                  <p className={`text-xs ${estoqueBaixo ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                    {estoqueBaixo && '⚠️ '}
                    Estoque: {p.estoque_atual} {p.unidade}
                  </p>
                </div>

                <p className="text-sm font-medium text-gray-900 w-24 text-right">
                  R$ {Number(p.preco_venda).toFixed(2).replace('.', ',')}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Novo produto</h3>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Nome</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Shampoo neutro 500ml"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Descricao (opcional)</label>
                <input
                  type="text"
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Marca, detalhes..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Preco de venda (R$)</label>
                  <input
                    type="number"
                    value={precoVenda}
                    onChange={e => setPrecoVenda(e.target.value)}
                    placeholder="35.00"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Preco de custo (opcional)</label>
                  <input
                    type="number"
                    value={precoCusto}
                    onChange={e => setPrecoCusto(e.target.value)}
                    placeholder="18.00"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Estoque atual</label>
                  <input
                    type="number"
                    value={estoqueAtual}
                    onChange={e => setEstoqueAtual(e.target.value)}
                    placeholder="10"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Estoque minimo</label>
                  <input
                    type="number"
                    value={estoqueMinimo}
                    onChange={e => setEstoqueMinimo(e.target.value)}
                    placeholder="3"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Unidade</label>
                  <select
                    value={unidade}
                    onChange={e => setUnidade(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="un">un</option>
                    <option value="kg">kg</option>
                    <option value="lt">lt</option>
                    <option value="cx">cx</option>
                  </select>
                </div>
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
                  onClick={salvarProduto}
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