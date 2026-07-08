'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Servico = {
  id: string
  nome: string
  descricao: string | null
  preco: number
  duracao_min: number
  ativo: boolean
}

export default function ServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [preco, setPreco] = useState('')
  const [duracao, setDuracao] = useState('60')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const supabase = createClient()

  async function carregarServicos() {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .single()

    if (!tenant) return

    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('ativo', true)
      .order('nome')

    setServicos(data || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregarServicos()
  }, [])

  async function salvarServico() {
    setSalvando(true)
    setErro('')

    if (!nome || !preco) {
      setErro('Preencha nome e preco.')
      setSalvando(false)
      return
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .single()

    if (!tenant) {
      setErro('Tenant nao encontrado.')
      setSalvando(false)
      return
    }

    const { error } = await supabase
      .from('services')
      .insert({
        tenant_id: tenant.id,
        nome,
        descricao: descricao || null,
        preco: parseFloat(preco),
        duracao_min: parseInt(duracao),
        ativo: true,
      })

    if (error) {
      setErro('Erro ao salvar: ' + error.message)
      setSalvando(false)
      return
    }

    setNome('')
    setDescricao('')
    setPreco('')
    setDuracao('60')
    setModalAberto(false)
    setSalvando(false)
    carregarServicos()
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Servicos</h2>
          <p className="text-sm text-gray-500 mt-0.5">Servicos oferecidos pelo seu pet shop</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + Novo servico
        </button>
      </div>

      {carregando ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : servicos.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum servico cadastrado ainda.</p>
          <button
            onClick={() => setModalAberto(true)}
            className="mt-4 text-blue-600 text-sm hover:underline"
          >
            Cadastrar o primeiro servico
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {servicos.map(s => (
            <div key={s.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{s.nome}</p>
                {s.descricao && (
                  <p className="text-xs text-gray-400 mt-0.5">{s.descricao}</p>
                )}
              </div>
              <p className="text-xs text-gray-400">{s.duracao_min} min</p>
              <p className="text-sm font-medium text-gray-900">
                R$ {Number(s.preco).toFixed(2).replace('.', ',')}
              </p>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Novo servico</h3>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Nome</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Banho e tosa"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Descricao (opcional)</label>
                <input
                  type="text"
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Banho completo com secagem"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Preco (R$)</label>
                  <input
                    type="number"
                    value={preco}
                    onChange={e => setPreco(e.target.value)}
                    placeholder="80.00"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Duracao (min)</label>
                  <input
                    type="number"
                    value={duracao}
                    onChange={e => setDuracao(e.target.value)}
                    placeholder="60"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                  onClick={salvarServico}
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