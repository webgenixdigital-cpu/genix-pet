'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Lancamento = {
  id: string
  tipo: string
  categoria: string | null
  descricao: string
  valor: number
  data_lancamento: string
  status: string
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
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [tipo, setTipo] = useState('receita')
  const [categoria, setCategoria] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const supabase = createClient()

  const categoriasReceita = ['Servico', 'Produto', 'Pacote', 'Outro']
  const categoriasDespesa = ['Aluguel', 'Salario', 'Fornecedor', 'Insumos', 'Manutencao', 'Outro']

  async function carregarLancamentos() {
    setCarregando(true)
    const { data: tenant } = await supabase.from('tenants').select('id').single()
    if (!tenant) return

    const { data } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('tenant_id', tenant.id)
      .gte('data_lancamento', primeiroDiaDoMes())
      .lte('data_lancamento', ultimoDiaDoMes())
      .order('data_lancamento', { ascending: false })

    setLancamentos(data || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregarLancamentos()
  }, [])

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