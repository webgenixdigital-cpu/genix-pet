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

const PORTES = [
  { valor: 'mini', label: 'Mini (1 a 4 kg)' },
  { valor: 'pequeno', label: 'Pequeno (4 a 9 kg)' },
  { valor: 'medio', label: 'Medio (9 a 15 kg)' },
  { valor: 'grande', label: 'Grande (15 a 22 kg)' },
  { valor: 'extra_grande', label: 'Extra Grande (22 a 35 kg)' },
  { valor: 'gigante', label: 'Gigante (acima de 35 kg)' },
]

const PELAGENS = [
  { valor: 'curta', label: 'Curta' },
  { valor: 'longa', label: 'Longa' },
]

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

  const [modalPrecos, setModalPrecos] = useState<Servico | null>(null)
  const [precos, setPrecos] = useState<Record<string, { preco: string; duracao: string }>>({})
  const [salvandoPrecos, setSalvandoPrecos] = useState(false)

  async function carregarServicos() {
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

  async function abrirPrecos(servico: Servico) {
    setModalPrecos(servico)

    const { data } = await supabase
      .from('service_pricing')
      .select('porte, pelagem, preco, duracao_min')
      .eq('service_id', servico.id)

    const base: Record<string, { preco: string; duracao: string }> = {}
    PORTES.forEach(p => {
      PELAGENS.forEach(pl => {
        const chave = `${p.valor}_${pl.valor}`
        const existente = data?.find(d => d.porte === p.valor && d.pelagem === pl.valor)
        base[chave] = {
          preco: existente ? String(existente.preco) : '',
          duracao: existente ? String(existente.duracao_min) : '',
        }
      })
    })

    setPrecos(base)
  }

  async function salvarPrecos() {
    if (!modalPrecos) return
    setSalvandoPrecos(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSalvandoPrecos(false)
      return
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('email', user.email)
      .single()

    if (!tenant) {
      setSalvandoPrecos(false)
      return
    }

    await supabase.from('service_pricing').delete().eq('service_id', modalPrecos.id)

    const paraInserir: any[] = []
    PORTES.forEach(p => {
      PELAGENS.forEach(pl => {
        const chave = `${p.valor}_${pl.valor}`
        const item = precos[chave]
        if (item?.preco && item?.duracao) {
          paraInserir.push({
            service_id: modalPrecos.id,
            tenant_id: tenant.id,
            porte: p.valor,
            pelagem: pl.valor,
            preco: parseFloat(item.preco),
            duracao_min: parseInt(item.duracao),
          })
        }
      })
    })

    if (paraInserir.length > 0) {
      await supabase.from('service_pricing').insert(paraInserir)
    }

    setSalvandoPrecos(false)
    setModalPrecos(null)
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
              <button
                onClick={() => abrirPrecos(s)}
                className="text-xs text-blue-600 hover:underline whitespace-nowrap"
              >
                Configurar precos
              </button>
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

      {modalPrecos && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Precos por porte e pelagem</h3>
            <p className="text-sm text-gray-500 mb-4">{modalPrecos.nome}</p>
            <p className="text-xs text-gray-400 mb-4">
              Deixe em branco as combinacoes que nao se aplicam. O preco base do servico sera usado quando nao houver combinacao especifica.
            </p>

            <div className="flex flex-col gap-4">
              {PORTES.map(porte => (
                <div key={porte.valor} className="border border-gray-100 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">{porte.label}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {PELAGENS.map(pelagem => {
                      const chave = `${porte.valor}_${pelagem.valor}`
                      return (
                        <div key={chave} className="flex flex-col gap-1">
                          <p className="text-xs text-gray-500">Pelagem {pelagem.label}</p>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={precos[chave]?.preco || ''}
                              onChange={e => setPrecos(prev => ({
                                ...prev,
                                [chave]: { ...prev[chave], preco: e.target.value, duracao: prev[chave]?.duracao || '' }
                              }))}
                              placeholder="Preco R$"
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="number"
                              value={precos[chave]?.duracao || ''}
                              onChange={e => setPrecos(prev => ({
                                ...prev,
                                [chave]: { ...prev[chave], duracao: e.target.value, preco: prev[chave]?.preco || '' }
                              }))}
                              placeholder="Min"
                              className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalPrecos(null)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarPrecos}
                disabled={salvandoPrecos}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {salvandoPrecos ? 'Salvando...' : 'Salvar precos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}