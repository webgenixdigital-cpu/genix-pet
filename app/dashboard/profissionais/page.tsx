'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Profissional = {
  id: string
  nome: string
  especialidades: string[]
  telefone: string | null
  cor_agenda: string
  ativo: boolean
}

type Disponibilidade = {
  dia_semana: number
  hora_inicio: string
  hora_fim: string
}

const DIAS = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado']

export default function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cor, setCor] = useState('#3b82f6')
  const [percentualComissao, setPercentualComissao] = useState('0')
  const [especialidades, setEspecialidades] = useState<string[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [modalDisponibilidade, setModalDisponibilidade] = useState<string | null>(null)
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([])
  const [salvandoDisp, setSalvandoDisp] = useState(false)

  const supabase = createClient()
  const opcaoEspecialidades = ['Banho', 'Tosa', 'Hidratacao', 'Tosa higienica', 'Escovacao']

  async function carregarProfissionais() {
    const { data: tenant } = await supabase.from('tenants').select('id').single()
    if (!tenant) return

    const { data } = await supabase
      .from('professionals')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('ativo', true)
      .order('nome')

    setProfissionais(data || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregarProfissionais()
  }, [])

  function toggleEspecialidade(esp: string) {
    setEspecialidades(prev =>
      prev.includes(esp) ? prev.filter(e => e !== esp) : [...prev, esp]
    )
  }

  async function salvarProfissional() {
    setSalvando(true)
    setErro('')

    if (!nome) {
      setErro('Informe o nome do profissional.')
      setSalvando(false)
      return
    }

    const { data: tenant } = await supabase.from('tenants').select('id').single()
    if (!tenant) {
      setErro('Tenant nao encontrado.')
      setSalvando(false)
      return
    }

    const { error } = await supabase.from('professionals').insert({
      tenant_id: tenant.id,
      nome,
      telefone: telefone || null,
      cor_agenda: cor,
      especialidades,
      ativo: true,
      tem_acesso_sistema: false,
      percentual_comissao: parseFloat(percentualComissao) || 0,
    })

    if (error) {
      setErro('Erro ao salvar: ' + error.message)
      setSalvando(false)
      return
    }

    setNome('')
    setTelefone('')
    setCor('#3b82f6')
    setEspecialidades([])
    setModalAberto(false)
    setSalvando(false)
    carregarProfissionais()
  }

  async function abrirDisponibilidade(profissionalId: string) {
    const { data } = await supabase
      .from('professional_availability')
      .select('dia_semana, hora_inicio, hora_fim')
      .eq('professional_id', profissionalId)

    const base: Disponibilidade[] = DIAS.map((_, i) => {
      const existente = data?.find(d => d.dia_semana === i)
      return existente
        ? { dia_semana: i, hora_inicio: existente.hora_inicio.slice(0, 5), hora_fim: existente.hora_fim.slice(0, 5) }
        : { dia_semana: i, hora_inicio: '', hora_fim: '' }
    })

    setDisponibilidades(base)
    setModalDisponibilidade(profissionalId)
  }

  function atualizarDisponibilidade(dia: number, campo: 'hora_inicio' | 'hora_fim', valor: string) {
    setDisponibilidades(prev =>
      prev.map(d => (d.dia_semana === dia ? { ...d, [campo]: valor } : d))
    )
  }

  async function salvarDisponibilidade() {
    if (!modalDisponibilidade) return
    setSalvandoDisp(true)

    const { data: tenant } = await supabase.from('tenants').select('id').single()
    if (!tenant) {
      setSalvandoDisp(false)
      return
    }

    await supabase
      .from('professional_availability')
      .delete()
      .eq('professional_id', modalDisponibilidade)

    const paraInserir = disponibilidades
      .filter(d => d.hora_inicio && d.hora_fim)
      .map(d => ({
        professional_id: modalDisponibilidade,
        tenant_id: tenant.id,
        dia_semana: d.dia_semana,
        hora_inicio: d.hora_inicio,
        hora_fim: d.hora_fim,
      }))

    if (paraInserir.length > 0) {
      await supabase.from('professional_availability').insert(paraInserir)
    }

    setSalvandoDisp(false)
    setModalDisponibilidade(null)
  }
return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Profissionais</h2>
          <p className="text-sm text-gray-500 mt-0.5">Banhistas e tosadores da sua equipe</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + Novo profissional
        </button>
      </div>

      {carregando ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : profissionais.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum profissional cadastrado ainda.</p>
          <button
            onClick={() => setModalAberto(true)}
            className="mt-4 text-blue-600 text-sm hover:underline"
          >
            Cadastrar o primeiro profissional
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {profissionais.map(p => (
            <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
                style={{ backgroundColor: p.cor_agenda }}
              >
                {p.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {p.especialidades?.join(', ') || 'Sem especialidades'}
                </p>
              </div>
              {p.telefone && <p className="text-xs text-gray-400">{p.telefone}</p>}
              <button
                onClick={() => abrirDisponibilidade(p.id)}
                className="text-xs text-blue-600 hover:underline whitespace-nowrap"
              >
                Definir horarios
              </button>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Novo profissional</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Nome</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Maria Silva"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Telefone</label>
                <input
                  type="text"
                  value={telefone}
                  onChange={e => setTelefone(e.target.value)}
                  placeholder="(35) 99999-9999"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Especialidades</label>
                <div className="flex flex-wrap gap-2">
                  {opcaoEspecialidades.map(esp => (
                    <button
                      key={esp}
                      onClick={() => toggleEspecialidade(esp)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        especialidades.includes(esp)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {esp}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Comissao (%)</label>
                <input
                  type="number"
                  value={percentualComissao}
                  onChange={e => setPercentualComissao(e.target.value)}
                  placeholder="30"
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
                  onClick={salvarProfissional}
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

      {modalDisponibilidade && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Horarios de atendimento</h3>
            <p className="text-sm text-gray-500 mb-4">Deixe em branco os dias sem atendimento</p>

            <div className="flex flex-col gap-2">
              {disponibilidades.map(d => (
                <div key={d.dia_semana} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-24 flex-shrink-0">{DIAS[d.dia_semana]}</span>
                  <input
                    type="time"
                    value={d.hora_inicio}
                    onChange={e => atualizarDisponibilidade(d.dia_semana, 'hora_inicio', e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm flex-1"
                  />
                  <span className="text-gray-400 text-sm">ate</span>
                  <input
                    type="time"
                    value={d.hora_fim}
                    onChange={e => atualizarDisponibilidade(d.dia_semana, 'hora_fim', e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm flex-1"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalDisponibilidade(null)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarDisponibilidade}
                disabled={salvandoDisp}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {salvandoDisp ? 'Salvando...' : 'Salvar horarios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}  