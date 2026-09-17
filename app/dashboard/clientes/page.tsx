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
  const [tenantId, setTenantId] = useState('')
  const [racasCatalogo, setRacasCatalogo] = useState<{ id: string; nome: string }[]>([])

  const [modalNovoCliente, setModalNovoCliente] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoTelefone, setNovoTelefone] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novoEnderecoRua, setNovoEnderecoRua] = useState('')
  const [novoEnderecoNumero, setNovoEnderecoNumero] = useState('')
  const [novoEnderecoBairro, setNovoEnderecoBairro] = useState('')
  const [novoEnderecoCidade, setNovoEnderecoCidade] = useState('')
  const [novoEnderecoCep, setNovoEnderecoCep] = useState('')
  const [novosPets, setNovosPets] = useState<{
    nome: string; especie: string; porte: string; pelagem: string; raca: string; sexo: string; castrado: boolean | null; observacoes: string
  }[]>([])
  const [erroNovoCliente, setErroNovoCliente] = useState('')
  const [salvandoNovoCliente, setSalvandoNovoCliente] = useState(false)
  const supabase = createClient()

  function petNovoEmBranco() {
    return { nome: '', especie: 'cachorro', porte: 'medio', pelagem: 'curta', raca: '', sexo: '', castrado: null as boolean | null, observacoes: '' }
  }

  function abrirNovoCliente() {
    setNovoNome('')
    setNovoTelefone('')
    setNovoEmail('')
    setNovoEnderecoRua('')
    setNovoEnderecoNumero('')
    setNovoEnderecoBairro('')
    setNovoEnderecoCidade('')
    setNovoEnderecoCep('')
    setNovosPets([petNovoEmBranco()])
    setErroNovoCliente('')
    setModalNovoCliente(true)
  }

  function atualizarNovoPet(index: number, campo: string, valor: any) {
    setNovosPets(prev => prev.map((p, i) => i === index ? { ...p, [campo]: valor } : p))
  }

  function adicionarNovoPet() {
    setNovosPets(prev => [...prev, petNovoEmBranco()])
  }

  function removerNovoPet(index: number) {
    setNovosPets(prev => prev.filter((_, i) => i !== index))
  }

  async function salvarNovoCliente() {
    setErroNovoCliente('')

    if (!novoNome.trim()) {
      setErroNovoCliente('Informe ao menos o nome do cliente.')
      return
    }

    setSalvandoNovoCliente(true)

    const { data: novoCliente, error: erroCliente } = await supabase
      .from('customers')
      .insert({
        tenant_id: tenantId,
        nome: novoNome.trim(),
        telefone: novoTelefone || null,
        email: novoEmail || null,
        endereco_rua: novoEnderecoRua || null,
        endereco_numero: novoEnderecoNumero || null,
        endereco_bairro: novoEnderecoBairro || null,
        endereco_cidade: novoEnderecoCidade || null,
        endereco_cep: novoEnderecoCep || null,
      })
      .select('id')
      .single()

    if (erroCliente || !novoCliente) {
      setErroNovoCliente('Erro ao cadastrar cliente: ' + erroCliente?.message)
      setSalvandoNovoCliente(false)
      return
    }

    const petsParaSalvar = novosPets.filter(p => p.nome.trim())

    if (petsParaSalvar.length > 0) {
      await supabase.from('pets').insert(
        petsParaSalvar.map(p => ({
          tenant_id: tenantId,
          customer_id: novoCliente.id,
          nome: p.nome.trim(),
          especie: p.especie,
          porte: p.porte,
          pelagem: p.pelagem,
          raca: p.raca || null,
          sexo: p.sexo || null,
          castrado: p.castrado,
          observacoes: p.observacoes || null,
        }))
      )
    }

    setSalvandoNovoCliente(false)
    setModalNovoCliente(false)
    carregarDados()
  }

    async function carregarDados() {
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

    const { data: racasData } = await supabase
      .from('catalogo_racas')
      .select('id, nome')
      .eq('tenant_id', tenant.id)
      .order('nome')
    setRacasCatalogo(racasData || [])

        let todosClientes: any[] = []
    let pagina = 0
    const tamanhoPagina = 1000
    while (true) {
      const { data: clientesData } = await supabase
        .from('customers')
        .select('id, nome, telefone, cpf, pets ( id, nome )')
        .eq('tenant_id', tenant.id)
        .order('nome')
        .range(pagina * tamanhoPagina, pagina * tamanhoPagina + tamanhoPagina - 1)

      if (!clientesData || clientesData.length === 0) break
      todosClientes = [...todosClientes, ...clientesData]
      if (clientesData.length < tamanhoPagina) break
      pagina++
    }

    setClientes(todosClientes)
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
      <div className="mb-6 flex items-center justify-between">
                <div>
          <h2 className="text-xl font-semibold text-gray-900">Clientes</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Clientes cadastrados e venda de pacotes · <span className="font-medium text-gray-700">{clientes.length} no total</span>
          </p>
        </div>
        
                <div className="flex items-center gap-2">
          <button
            onClick={abrirNovoCliente}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          >
            + Novo cliente
          </button>
          <a
            href="/dashboard/clientes/sem-retorno"
            className="text-sm text-orange-600 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors whitespace-nowrap"
          >
            🔔 Clientes sem retorno
          </a>
        </div>
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

      {modalNovoCliente && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Novo cliente</h3>

            <div className="flex flex-col gap-4 mb-6">
              <p className="text-xs font-medium text-gray-500 uppercase">Dados do tutor</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nome</label>
                  <input
                    type="text"
                    value={novoNome}
                    onChange={e => setNovoNome(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Telefone</label>
                  <input
                    type="text"
                    value={novoTelefone}
                    onChange={e => setNovoTelefone(e.target.value)}
                    placeholder="(35) 99999-9999"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">E-mail</label>
                <input
                  type="email"
                  value={novoEmail}
                  onChange={e => setNovoEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Rua</label>
                  <input
                    type="text"
                    value={novoEnderecoRua}
                    onChange={e => setNovoEnderecoRua(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Numero</label>
                  <input
                    type="text"
                    value={novoEnderecoNumero}
                    onChange={e => setNovoEnderecoNumero(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Bairro</label>
                  <input
                    type="text"
                    value={novoEnderecoBairro}
                    onChange={e => setNovoEnderecoBairro(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Cidade</label>
                  <input
                    type="text"
                    value={novoEnderecoCidade}
                    onChange={e => setNovoEnderecoCidade(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">CEP</label>
                  <input
                    type="text"
                    value={novoEnderecoCep}
                    onChange={e => setNovoEnderecoCep(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-500 uppercase">Pets deste cliente</p>
              <button
                onClick={adicionarNovoPet}
                className="text-xs text-blue-600 hover:underline"
              >
                + Adicionar outro pet
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {novosPets.map((pet, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">Pet {i + 1}</p>
                    {novosPets.length > 1 && (
                      <button
                        onClick={() => removerNovoPet(i)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Nome do pet</label>
                      <input
                        type="text"
                        value={pet.nome}
                        onChange={e => atualizarNovoPet(i, 'nome', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Especie</label>
                      <select
                        value={pet.especie}
                        onChange={e => atualizarNovoPet(i, 'especie', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="cachorro">Cachorro</option>
                        <option value="gato">Gato</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="text-xs text-gray-500 mb-1 block">Raca</label>
                    <select
                      value={pet.raca}
                      onChange={e => atualizarNovoPet(i, 'raca', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">SRD / Sem raca definida (usa porte e pelagem)</option>
                      {racasCatalogo.map(r => (
                        <option key={r.id} value={r.nome}>{r.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Porte</label>
                      <select
                        value={pet.porte}
                        onChange={e => atualizarNovoPet(i, 'porte', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="mini">Mini</option>
                        <option value="pequeno">Pequeno</option>
                        <option value="medio">Medio</option>
                        <option value="grande">Grande</option>
                        <option value="extra_grande">Extra Grande</option>
                        <option value="gigante">Gigante</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Pelagem</label>
                      <select
                        value={pet.pelagem}
                        onChange={e => atualizarNovoPet(i, 'pelagem', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="curta">Curta</option>
                        <option value="longa">Longa</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Sexo</label>
                      <select
                        value={pet.sexo}
                        onChange={e => atualizarNovoPet(i, 'sexo', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Nao informado</option>
                        <option value="macho">Macho</option>
                        <option value="femea">Femea</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700 mt-5">
                      <input
                        type="checkbox"
                        checked={!!pet.castrado}
                        onChange={e => atualizarNovoPet(i, 'castrado', e.target.checked)}
                      />
                      Castrado
                    </label>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Observacoes</label>
                    <input
                      type="text"
                      value={pet.observacoes}
                      onChange={e => atualizarNovoPet(i, 'observacoes', e.target.value)}
                      placeholder="Alergias, comportamento, etc."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {erroNovoCliente && <p className="text-red-500 text-sm mt-4">{erroNovoCliente}</p>}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalNovoCliente(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarNovoCliente}
                disabled={salvandoNovoCliente}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {salvandoNovoCliente ? 'Salvando...' : 'Cadastrar cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}