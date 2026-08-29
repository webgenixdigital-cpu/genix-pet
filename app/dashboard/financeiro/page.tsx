'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
type Comissao = {
  id: string
  valor_base: number
  percentual: number
  valor_comissao: number
  status: string
  professionals: { nome: string } | null
}
type Lancamento = {
  id: string
  tipo: string
  categoria: string | null
  descricao: string
  valor: number
  data_lancamento: string
  status: string
  appointment_id: string | null
  customer_package_id: string | null
  customers: { nome: string; telefone: string } | null
}

function formatarDataISO(data: Date): string {
  return data.toISOString().split('T')[0]
}

function primeiroDiaDoMes(): string {
  const d = new Date()
  return formatarDataISO(new Date(d.getFullYear(), d.getMonth(), 1))
}

function ultimoDiaDoMes(): string {
  const d = new Date()
  return formatarDataISO(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

export default function FinanceiroPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [tipo, setTipo] = useState('receita')
  const [categoria, setCategoria] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState('')
  const [aba, setAba] = useState<'resumo' | 'aberto'>('resumo')
  const [valoresAbertos, setValoresAbertos] = useState<Lancamento[]>([])
  const [modalReceber, setModalReceber] = useState<Lancamento | null>(null)
  const [formaRecebimento, setFormaRecebimento] = useState('Dinheiro')
  const [recebendo, setRecebendo] = useState(false)
  const supabase = createClient()

  const categoriasReceita = ['Servico', 'Produto', 'Pacote', 'Outro']
  const categoriasDespesa = ['Aluguel', 'Salario', 'Fornecedor', 'Insumos', 'Manutencao', 'Outro']

    async function carregarLancamentos() {
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

    const { data } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('tenant_id', tenant.id)
      .gte('data_lancamento', primeiroDiaDoMes())
      .lte('data_lancamento', ultimoDiaDoMes())
      .order('data_lancamento', { ascending: false })

        const { data: comissoesData } = await supabase
      .from('commissions')
      .select('id, valor_base, percentual, valor_comissao, status, professionals ( nome )')
      .eq('tenant_id', tenant.id)
      .order('criado_em', { ascending: false })

        const { data: abertosData } = await supabase
      .from('financial_transactions')
      .select('id, tipo, categoria, descricao, valor, data_lancamento, status, appointment_id, customer_package_id, customers ( nome, telefone )')
      .eq('tenant_id', tenant.id)
      .eq('status', 'pendente')
      .order('data_lancamento', { ascending: true })

    setLancamentos((data as any) || [])
    setComissoes((comissoesData as any) || [])
    setValoresAbertos((abertosData as any) || [])
    setCarregando(false)
  }
  useEffect(() => {
    carregarLancamentos()
  }, [])
    function avisarCliente(l: Lancamento) {
    const telefoneNum = (l.customers?.telefone || '').replace(/\D/g, '')
    if (!telefoneNum) {
      alert('Cliente sem telefone cadastrado.')
      return
    }
    const telefoneComDDI = telefoneNum.startsWith('55') ? telefoneNum : `55${telefoneNum}`
    const dataFormatada = new Date(l.data_lancamento + 'T00:00:00').toLocaleDateString('pt-BR')

    const mensagem = `Ola, ${l.customers?.nome}! Passando para lembrar sobre um valor em aberto:\n\nData: ${dataFormatada}\nServico: ${l.descricao}\nValor: R$ ${Number(l.valor).toFixed(2).replace('.', ',')}\n\nCaso o valor ja tenha sido pago, pedimos por favor que nos envie o comprovante.`

    window.open(`https://wa.me/${telefoneComDDI}?text=${encodeURIComponent(mensagem)}`, '_blank')
  }
  async function confirmarRecebimentoFinanceiro() {
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
    carregarLancamentos()
  }
  async function salvarLancamento() {
    setSalvando(true)
    setErro('')

    if (!descricao || !valor) {
      setErro('Preencha descricao e valor.')
      setSalvando(false)
      return
    }

        const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setErro('Usuario nao autenticado.')
      setSalvando(false)
      return
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('email', user.email)
      .single()

    if (!tenant) {
      setErro('Tenant nao encontrado.')
      setSalvando(false)
      return
    }

    const { error } = await supabase.from('financial_transactions').insert({
      tenant_id: tenant.id,
      tipo,
      categoria: categoria || null,
      descricao,
      valor: parseFloat(valor),
      data_lancamento: formatarDataISO(new Date()),
      status: 'pago',
    })

    if (error) {
      setErro('Erro ao salvar: ' + error.message)
      setSalvando(false)
      return
    }

    setDescricao('')
    setValor('')
    setCategoria('')
    setModalAberto(false)
    setSalvando(false)
    carregarLancamentos()
  }

  const totalReceitas = lancamentos.filter(l => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0)
  const totalDespesas = lancamentos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0)
  const saldo = totalReceitas - totalDespesas
  return (
    <div>
            <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Financeiro</h2>
          <p className="text-sm text-gray-500 mt-0.5">Resumo do mes atual</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + Novo lancamento
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setAba('resumo')}
          className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
            aba === 'resumo' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          Resumo do mes
        </button>
        <button
          onClick={() => setAba('aberto')}
          className={`text-sm px-4 py-2 rounded-lg border transition-colors flex items-center gap-1.5 ${
            aba === 'aberto' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          Valores em aberto
          {valoresAbertos.length > 0 && (
            <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center ${
              aba === 'aberto' ? 'bg-white text-blue-600' : 'bg-orange-100 text-orange-700'
            }`}>
              {valoresAbertos.length}
            </span>
          )}
        </button>
      </div>
      {aba === 'resumo' && (
      <>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <p className="text-xs text-gray-400">Receitas</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">
            R$ {totalReceitas.toFixed(2).replace('.', ',')}
          </p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <p className="text-xs text-gray-400">Despesas</p>
          <p className="text-2xl font-semibold text-red-500 mt-1">
            R$ {totalDespesas.toFixed(2).replace('.', ',')}
          </p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <p className="text-xs text-gray-400">Saldo</p>
          <p className={`text-2xl font-semibold mt-1 ${saldo >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
            R$ {saldo.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </div>

      {carregando ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : lancamentos.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum lancamento este mes.</p>
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
                <p className="text-xs text-gray-400">{l.categoria} • {new Date(l.data_lancamento + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
              </div>
              <p className={`text-sm font-medium ${l.tipo === 'receita' ? 'text-green-600' : 'text-red-500'}`}>
                {l.tipo === 'receita' ? '+' : '-'} R$ {Number(l.valor).toFixed(2).replace('.', ',')}
              </p>
            </div>
          ))}
        </div>
      )}
      {comissoes.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Comissoes por profissional</h3>
          <div className="flex flex-col gap-2">
                        {comissoes.map(c => (
              <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{c.professionals?.nome}</p>
                  <p className="text-xs text-gray-400">
                    {c.percentual}% de R$ {Number(c.valor_base).toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  c.status === 'pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {c.status === 'pago' ? 'Pago' : 'Pendente'}
                </span>
                <p className="text-sm font-medium text-gray-900">
                  R$ {Number(c.valor_comissao).toFixed(2).replace('.', ',')}
                </p>
              </div>
                        ))}
          </div>
        </div>
      )}
      </>
      )}

      {aba === 'aberto' && (
        <div>
          {valoresAbertos.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
              <p className="text-gray-400 text-sm">Nenhum valor em aberto. Tudo em dia! 🎉</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {valoresAbertos.map(l => (
                <div key={l.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{l.descricao}</p>
                    <p className="text-xs text-gray-400">
                      {l.categoria} {l.customers?.nome && `• ${l.customers.nome}`} • {new Date(l.data_lancamento + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                                    <p className="text-sm font-medium text-orange-600 whitespace-nowrap">
                    R$ {Number(l.valor).toFixed(2).replace('.', ',')}
                  </p>
                  <button
                    onClick={() => avisarCliente(l)}
                    className="text-xs border border-blue-200 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    📤 Avisar
                  </button>
                  <button
                    onClick={() => { setModalReceber(l); setFormaRecebimento('Dinheiro') }}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Receber
                  </button>
                </div>
              ))}
            </div>
          )}
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
                  onClick={confirmarRecebimentoFinanceiro}
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

      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Novo lancamento</h3>

            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setTipo('receita')}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                    tipo === 'receita' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  Receita
                </button>
                <button
                  onClick={() => setTipo('despesa')}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                    tipo === 'despesa' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  Despesa
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
                  placeholder="Ex: Compra de shampoo"
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
    </div>
  )
}