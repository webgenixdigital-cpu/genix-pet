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
  codigo_barras: string | null
  ncm: string | null
  cfop: string | null
  cst: string | null
  aliquota_icms: number | null
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  const [modalAberto, setModalAberto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [precoVenda, setPrecoVenda] = useState('')
  const [precoCusto, setPrecoCusto] = useState('')
  const [estoqueAtual, setEstoqueAtual] = useState('')
  const [estoqueMinimo, setEstoqueMinimo] = useState('')
  const [unidade, setUnidade] = useState('un')
  const [codigoBarras, setCodigoBarras] = useState('')
  const [ncm, setNcm] = useState('')
  const [cfop, setCfop] = useState('')
  const [cst, setCst] = useState('')
  const [aliquotaIcms, setAliquotaIcms] = useState('')
  const [mostrarFiscal, setMostrarFiscal] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [modalEstoque, setModalEstoque] = useState(false)
  const [codigoEscaneado, setCodigoEscaneado] = useState('')
  const [produtoEncontrado, setProdutoEncontrado] = useState<Produto | null>(null)
  const [quantidadeEntrada, setQuantidadeEntrada] = useState('1')
  const [buscandoCodigo, setBuscandoCodigo] = useState(false)
  const [mensagemEstoque, setMensagemEstoque] = useState('')
  const [salvandoEstoque, setSalvandoEstoque] = useState(false)

  const supabase = createClient()
  
  async function carregarProdutos() {
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

    setTenantId(tenant.id)

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

  function abrirNovoProduto() {
    setEditandoId(null)
    setNome('')
    setDescricao('')
    setPrecoVenda('')
    setPrecoCusto('')
    setEstoqueAtual('')
    setEstoqueMinimo('')
    setUnidade('un')
    setCodigoBarras('')
    setNcm('')
    setCfop('')
    setCst('')
    setAliquotaIcms('')
    setMostrarFiscal(false)
    setErro('')
    setModalAberto(true)
  }

  function abrirEditarProduto(p: Produto) {
    setEditandoId(p.id)
    setNome(p.nome)
    setDescricao(p.descricao || '')
    setPrecoVenda(String(p.preco_venda))
    setPrecoCusto(p.preco_custo ? String(p.preco_custo) : '')
    setEstoqueAtual(String(p.estoque_atual))
    setEstoqueMinimo(String(p.estoque_minimo))
    setUnidade(p.unidade)
    setCodigoBarras(p.codigo_barras || '')
    setNcm(p.ncm || '')
    setCfop(p.cfop || '')
    setCst(p.cst || '')
    setAliquotaIcms(p.aliquota_icms ? String(p.aliquota_icms) : '')
    setMostrarFiscal(!!(p.ncm || p.cfop || p.cst || p.aliquota_icms))
    setErro('')
    setModalAberto(true)
  }

  async function salvarProduto() {
    setSalvando(true)
    setErro('')

    if (!nome || !precoVenda) {
      setErro('Preencha nome e preco de venda.')
      setSalvando(false)
      return
    }

    if (!tenantId) {
      setErro('Tenant nao encontrado.')
      setSalvando(false)
      return
    }

    const payload = {
      nome,
      descricao: descricao || null,
      preco_venda: parseFloat(precoVenda),
      preco_custo: precoCusto ? parseFloat(precoCusto) : null,
      estoque_atual: parseFloat(estoqueAtual) || 0,
      estoque_minimo: parseFloat(estoqueMinimo) || 0,
      unidade,
      codigo_barras: codigoBarras || null,
      ncm: ncm || null,
      cfop: cfop || null,
      cst: cst || null,
      aliquota_icms: aliquotaIcms ? parseFloat(aliquotaIcms) : null,
    }

    const { error } = editandoId
      ? await supabase.from('products').update(payload).eq('id', editandoId)
      : await supabase.from('products').insert({ ...payload, tenant_id: tenantId, ativo: true })

    if (error) {
      setErro('Erro ao salvar: ' + error.message)
      setSalvando(false)
      return
    }

    setModalAberto(false)
    setSalvando(false)
    carregarProdutos()
  }

  
  function abrirEntradaEstoque() {
    setCodigoEscaneado('')
    setProdutoEncontrado(null)
    setQuantidadeEntrada('1')
    setMensagemEstoque('')
    setModalEstoque(true)
  }

  async function buscarPorCodigo() {
    if (!codigoEscaneado.trim() || !tenantId) return

    setBuscandoCodigo(true)
    setMensagemEstoque('')
    setProdutoEncontrado(null)

    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('codigo_barras', codigoEscaneado.trim())
      .maybeSingle()

    if (data) {
      setProdutoEncontrado(data)
    } else {
      setMensagemEstoque('Nenhum produto encontrado com esse codigo.')
    }

    setBuscandoCodigo(false)
  }

  async function confirmarEntradaEstoque() {
    if (!produtoEncontrado) return
    setSalvandoEstoque(true)

    const novoEstoque = Number(produtoEncontrado.estoque_atual) + parseFloat(quantidadeEntrada || '0')

    await supabase
      .from('products')
      .update({ estoque_atual: novoEstoque })
      .eq('id', produtoEncontrado.id)

    setSalvandoEstoque(false)
    setCodigoEscaneado('')
    setProdutoEncontrado(null)
    setQuantidadeEntrada('1')
    setMensagemEstoque(`✓ Estoque de "${produtoEncontrado.nome}" atualizado! Pode escanear o proximo.`)
    carregarProdutos()
  }

  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Produtos</h2>
          <p className="text-sm text-gray-500 mt-0.5">Catalogo e estoque</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={abrirEntradaEstoque}
            className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            📷 Entrada por codigo
          </button>
          <button
            onClick={abrirNovoProduto}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            + Novo produto
          </button>
        </div>
      </div>

      {carregando ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : produtos.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum produto cadastrado ainda.</p>
          <button
            onClick={abrirNovoProduto}
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
              <button
                key={p.id}
                onClick={() => abrirEditarProduto(p)}
                className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4 text-left hover:border-blue-300 transition-colors w-full"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                  {p.descricao && <p className="text-xs text-gray-400 mt-0.5">{p.descricao}</p>}
                  {p.codigo_barras && <p className="text-xs text-gray-300 mt-0.5">Cod: {p.codigo_barras}</p>}
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
              </button>
            )
          })}
        </div>
      )}
      
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editandoId ? 'Editar produto' : 'Novo produto'}
            </h3>

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

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Codigo de barras (opcional)</label>
                <input
                  type="text"
                  value={codigoBarras}
                  onChange={e => setCodigoBarras(e.target.value)}
                  placeholder="Escaneie ou digite o codigo"
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
              
              <div className="border border-gray-200 rounded-lg">
                <button
                  type="button"
                  onClick={() => setMostrarFiscal(!mostrarFiscal)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left"
                >
                  <span className="text-xs font-medium text-gray-700">📄 Dados fiscais (opcional)</span>
                  <span className="text-xs text-gray-400">{mostrarFiscal ? '▲' : '▼'}</span>
                </button>
                {mostrarFiscal && (
                  <div className="px-3 pb-3 flex flex-col gap-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">NCM</label>
                        <input
                          type="text"
                          value={ncm}
                          onChange={e => setNcm(e.target.value)}
                          placeholder="3305.10.00"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">CFOP</label>
                        <input
                          type="text"
                          value={cfop}
                          onChange={e => setCfop(e.target.value)}
                          placeholder="5102"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">CST</label>
                        <input
                          type="text"
                          value={cst}
                          onChange={e => setCst(e.target.value)}
                          placeholder="102"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">Aliquota ICMS (%)</label>
                        <input
                          type="number"
                          value={aliquotaIcms}
                          onChange={e => setAliquotaIcms(e.target.value)}
                          placeholder="18"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
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
      
      {modalEstoque && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Entrada de estoque</h3>
            <p className="text-sm text-gray-500 mb-4">Escaneie ou digite o codigo do produto</p>

            <div className="flex flex-col gap-4">
              <div>
                <input
                  type="text"
                  value={codigoEscaneado}
                  onChange={e => setCodigoEscaneado(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscarPorCodigo()}
                  placeholder="Codigo de barras"
                  autoFocus
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {buscandoCodigo && <p className="text-xs text-gray-400 mt-1">Buscando...</p>}
              </div>

              {mensagemEstoque && (
                <p className={`text-sm ${mensagemEstoque.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                  {mensagemEstoque}
                </p>
              )}

              {produtoEncontrado && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900">{produtoEncontrado.nome}</p>
                  <p className="text-xs text-gray-500 mb-2">
                    Estoque atual: {produtoEncontrado.estoque_atual} {produtoEncontrado.unidade}
                  </p>
                  <label className="text-xs text-gray-600 mb-1 block">Quantidade a adicionar</label>
                  <input
                    type="number"
                    value={quantidadeEntrada}
                    onChange={e => setQuantidadeEntrada(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setModalEstoque(false)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Fechar
                </button>
                {produtoEncontrado ? (
                  <button
                    onClick={confirmarEntradaEstoque}
                    disabled={salvandoEstoque}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {salvandoEstoque ? 'Salvando...' : 'Confirmar entrada'}
                  </button>
                ) : (
                  <button
                    onClick={buscarPorCodigo}
                    disabled={!codigoEscaneado.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Buscar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}