'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Lancamento = {
  id: string
  tipo: string
  categoria: string | null
  descricao: string
  valor: number
  forma_pagamento: string | null
  status: string
  data_lancamento: string
  customers: { nome: string } | null
  bank_accounts: { nome: string } | null
}

type Conta = { id: string; nome: string; tipo: string }
type Cliente = { id: string; nome: string }

const FORMAS_PAGAMENTO = ['Dinheiro', 'Pix', 'Cartao de credito', 'Cartao de debito', 'Transferencia']

function formatarDataISO(data: Date): string {
  return data.toISOString().split('T')[0]
}

function formatarMoeda(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`
}

export default function CaixaPage() {
  const [dataFiltro, setDataFiltro] = useState(formatarDataISO(new Date()))
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregando, setCarregando] = useState(true)

  const [modalAberto, setModalAberto] = useState(false)
  const [modalConta, setModalConta] = useState(false)
  const [tipo, setTipo] = useState('receita')
  const [categoria, setCategoria] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('Dinheiro')
  const [contaId, setContaId] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [buscaCliente, setBuscaCliente] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [nomeContaNova, setNomeContaNova] = useState('')
  const [tipoContaNova, setTipoContaNova] = useState('conta_corrente')

  const [reciboAberto, setReciboAberto] = useState<Lancamento | null>(null)

  const supabase = createClient()

  const categoriasReceita = ['Servico', 'Produto', 'Pacote', 'Outro']
  const categoriasDespesa = ['Aluguel', 'Salario', 'Fornecedor', 'Insumos', 'Manutencao', 'Outro']
  async function carregarDados() {
    setCarregando(true)
    const { data: tenant } = await supabase.from('tenants').select('id').single()
    if (!tenant) return

    const { data: lancamentosData } = await supabase
      .from('financial_transactions')
      .select('id, tipo, categoria, descricao, valor, forma_pagamento, status, data_lancamento, customers ( nome ), bank_accounts ( nome )')
      .eq('tenant_id', tenant.id)
      .eq('data_lancamento', dataFiltro)
      .order('criado_em', { ascending: false })

    const { data: contasData } = await supabase
      .from('bank_accounts')
      .select('id, nome, tipo')
      .eq('tenant_id', tenant.id)
      .eq('ativo', true)
      .order('nome')

    setLancamentos((lancamentosData as any) || [])
    setContas(contasData || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregarDados()
  }, [dataFiltro])

  async function buscarClientes(texto: string) {
    setBuscaCliente(texto)
    setClienteId('')

    if (texto.trim().length < 2) {
      setClientes([])
      return
    }

    const { data: tenant } = await supabase.from('tenants').select('id').single()
    if (!tenant) return

    const { data } = await supabase
      .from('customers')
      .select('id, nome')
      .eq('tenant_id', tenant.id)
      .ilike('nome', `%${texto}%`)
      .limit(6)

    setClientes(data || [])
  }

  async function salvarLancamento() {
    setSalvando(true)
    setErro('')

    if (!descricao || !valor) {
      setErro('Preencha descricao e valor.')
      setSalvando(false)
      return
    }

    const { data: tenant } = await supabase.from('tenants').select('id').single()
    if (!tenant) {
      setErro('Tenant nao encontrado.')
      setSalvando(false)
      return
    }

    const { data: novoLancamento, error } = await supabase
      .from('financial_transactions')
      .insert({
        tenant_id: tenant.id,
        tipo,
        categoria: categoria || null,
        descricao,
        valor: parseFloat(valor),
        forma_pagamento: formaPagamento,
        bank_account_id: contaId || null,
        customer_id: clienteId || null,
        data_lancamento: dataFiltro,
        status: 'pago',
      })
      .select('id, tipo, categoria, descricao, valor, forma_pagamento, data_lancamento, customers ( nome ), bank_accounts ( nome )')
      .single()

    if (error) {
      setErro('Erro ao salvar: ' + error.message)
      setSalvando(false)
      return
    }

    setDescricao('')
    setValor('')
    setCategoria('')
    setClienteId('')
    setBuscaCliente('')
    setModalAberto(false)
    setSalvando(false)
    carregarDados()

    if (novoLancamento) {
      setReciboAberto(novoLancamento as any)
    }
  }

  async function salvarConta() {
    if (!nomeContaNova) return

    const { data: tenant } = await supabase.from('tenants').select('id').single()
    if (!tenant) return

    await supabase.from('bank_accounts').insert({
      tenant_id: tenant.id,
      nome: nomeContaNova,
      tipo: tipoContaNova,
    })

    setNomeContaNova('')
    setModalConta(false)
    carregarDados()
  }

  const [modalReceber, setModalReceber] = useState<Lancamento | null>(null)
  const [formaRecebimento, setFormaRecebimento] = useState('Dinheiro')
  const [contaRecebimento, setContaRecebimento] = useState('')
  const [recebendo, setRecebendo] = useState(false)

  function abrirReceber(l: Lancamento) {
    setModalReceber(l)
    setFormaRecebimento('Dinheiro')
    setContaRecebimento('')
  }

  async function confirmarRecebimento() {
    if (!modalReceber) return
    setRecebendo(true)

    await supabase
      .from('financial_transactions')
      .update({
        status: 'pago',
        forma_pagamento: formaRecebimento,
        bank_account_id: contaRecebimento || null,
      })
      .eq('id', modalReceber.id)

    setRecebendo(false)
    setModalReceber(null)
    carregarDados()
  }

  const totalEntradas = lancamentos.filter(l => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0)
  const totalSaidas = lancamentos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0)
  const saldoDia = totalEntradas - totalSaidas
  return (
    <div>
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body * { visibility: hidden; }
          #area-recibo, #area-recibo * { visibility: visible; }
          #area-recibo {
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

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Caixa</h2>
          <p className="text-sm text-gray-500 mt-0.5">Movimentacao diaria</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dataFiltro}
            onChange={e => setDataFiltro(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setModalConta(true)}
            className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            + Conta
          </button>
          <button
            onClick={() => setModalAberto(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            + Lancamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <p className="text-xs text-gray-400">Entradas</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">{formatarMoeda(totalEntradas)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <p className="text-xs text-gray-400">Saidas</p>
          <p className="text-2xl font-semibold text-red-500 mt-1">{formatarMoeda(totalSaidas)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <p className="text-xs text-gray-400">Saldo do dia</p>
          <p className={`text-2xl font-semibold mt-1 ${saldoDia >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
            {formatarMoeda(saldoDia)}
          </p>
        </div>
      </div>
      {carregando ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : lancamentos.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum lancamento hoje.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {lancamentos.map(l => (
            <div key={l.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-4">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                l.tipo === 'receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
              }`}>
                {l.tipo === 'receita' ? '↑' : '↓'}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{l.descricao}</p>
                <p className="text-xs text-gray-400">
                  {l.categoria} {l.forma_pagamento && `• ${l.forma_pagamento}`} {l.customers?.nome && `• ${l.customers.nome}`} {l.bank_accounts?.nome && `• ${l.bank_accounts.nome}`}
                </p>
              </div>
              <p className={`text-sm font-medium ${l.tipo === 'receita' ? 'text-green-600' : 'text-red-500'}`}>
                {l.tipo === 'receita' ? '+' : '-'} {formatarMoeda(Number(l.valor))}
              </p>
              {l.status === 'pendente' && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full whitespace-nowrap">
                  Pendente
                </span>
              )}
              {l.status === 'pendente' ? (
                <button
                  onClick={() => abrirReceber(l)}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  Receber
                </button>
              ) : (
                <button
                  onClick={() => setReciboAberto(l)}
                  className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                >
                  Recibo
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Novo lancamento</h3>

            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setTipo('receita')}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                    tipo === 'receita' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  Entrada
                </button>
                <button
                  onClick={() => setTipo('despesa')}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                    tipo === 'despesa' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  Saida
                </button>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Categoria</label>
                <select
                  value={categoria}
                  onChange={e => setCategoria(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {(tipo === 'receita' ? categoriasReceita : categoriasDespesa).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Descricao</label>
                <input
                  type="text"
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Ex: Banho e tosa - Rex"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Valor (R$)</label>
                <input
                  type="number"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Forma de pagamento</label>
                <select
                  value={formaPagamento}
                  onChange={e => setFormaPagamento(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {contas.length > 0 && (
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Conta</label>
                  <select
                    value={contaId}
                    onChange={e => setContaId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Nao vincular</option>
                    {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Cliente (opcional)</label>
                <input
                  type="text"
                  value={clienteId ? clientes.find(c => c.id === clienteId)?.nome || buscaCliente : buscaCliente}
                  onChange={e => buscarClientes(e.target.value)}
                  placeholder="Buscar cliente pelo nome..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {clientes.length > 0 && !clienteId && (
                  <div className="border border-gray-200 rounded-lg mt-1 overflow-hidden">
                    {clientes.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setClienteId(c.id); setBuscaCliente(c.nome); setClientes([]) }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        {c.nome}
                      </button>
                    ))}
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
                  onClick={salvarLancamento}
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
      {modalConta && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Nova conta</h3>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Nome da conta</label>
                <input
                  type="text"
                  value={nomeContaNova}
                  onChange={e => setNomeContaNova(e.target.value)}
                  placeholder="Banco do Brasil, Caixa da loja..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Tipo</label>
                <select
                  value={tipoContaNova}
                  onChange={e => setTipoContaNova(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="conta_corrente">Conta corrente</option>
                  <option value="poupanca">Poupanca</option>
                  <option value="carteira">Carteira / dinheiro</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setModalConta(false)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarConta}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reciboAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 print:bg-white print:static">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 print:rounded-none print:max-w-none print:shadow-none">
            <div id="area-recibo" className="font-mono text-xs">
              <div className="text-center mb-3">
                <p className="font-bold text-sm">GENIX PET</p>
                <p>Recibo de Pagamento</p>
                <p>{new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="border-t border-dashed border-gray-400 my-2" />
              <p>Descricao: {reciboAberto.descricao}</p>
              {reciboAberto.categoria && <p>Categoria: {reciboAberto.categoria}</p>}
              {reciboAberto.customers?.nome && <p>Cliente: {reciboAberto.customers.nome}</p>}
              {reciboAberto.forma_pagamento && <p>Pagamento: {reciboAberto.forma_pagamento}</p>}
              {reciboAberto.bank_accounts?.nome && <p>Conta: {reciboAberto.bank_accounts.nome}</p>}
              <div className="border-t border-dashed border-gray-400 my-2" />
              <p className="text-sm font-bold text-center">
                {reciboAberto.tipo === 'receita' ? 'VALOR RECEBIDO' : 'VALOR PAGO'}
              </p>
              <p className="text-base font-bold text-center">{formatarMoeda(Number(reciboAberto.valor))}</p>
              <div className="border-t border-dashed border-gray-400 my-2" />
              <p className="text-center text-[10px] mt-3">Obrigado pela preferencia!</p>
            </div>

            <div className="flex gap-3 mt-6 print:hidden">
              <button
                onClick={() => setReciboAberto(null)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors"
              >
                Imprimir recibo
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
              {modalReceber.descricao} • {formatarMoeda(Number(modalReceber.valor))}
            </p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Forma de pagamento</label>
                <select
                  value={formaRecebimento}
                  onChange={e => setFormaRecebimento(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {contas.length > 0 && (
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Conta</label>
                  <select
                    value={contaRecebimento}
                    onChange={e => setContaRecebimento(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Nao vincular</option>
                    {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setModalReceber(null)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarRecebimento}
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