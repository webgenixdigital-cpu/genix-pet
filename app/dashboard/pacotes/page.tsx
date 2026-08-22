'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Raca = { id: string; nome: string }

type Plano = {
  id: string
  nome: string
  raca_id: string | null
  porte: string | null
  pelagem: string | null
  quantidade_banhos: number
  validade_dias: number
  modo_valor: 'percentual' | 'valor_final'
  tipo_desconto: 'percentual' | 'fixo'
  valor_desconto: number
  preco_unitario_banho: number
  preco_base: number
  preco_final: number
  tipo_recorrencia: 'intervalo' | 'mensal_dia_semana'
  intervalo_dias: number | null
  semana_do_mes: number | null
  dia_semana: number | null
  ativo: boolean
  nome_referencia?: string
}

const PORTES = [
  { id: 'mini', label: 'Mini (1 a 4 kg)' },
  { id: 'pequeno', label: 'Pequeno (4 a 9 kg)' },
  { id: 'medio', label: 'Medio (9 a 15 kg)' },
  { id: 'grande', label: 'Grande (15 a 22 kg)' },
  { id: 'extra_grande', label: 'Extra Grande (22 a 35 kg)' },
  { id: 'gigante', label: 'Gigante (acima de 35 kg)' },
]

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado']

export default function PacotesPage() {
  const [carregando, setCarregando] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [planos, setPlanos] = useState<Plano[]>([])
  const [racas, setRacas] = useState<Raca[]>([])

  const [modalAberto, setModalAberto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  const [usarRaca, setUsarRaca] = useState<boolean | null>(null)
  const [racaSelecionadaId, setRacaSelecionadaId] = useState('')
  const [buscaRaca, setBuscaRaca] = useState('')
  const [porteSelecionado, setPorteSelecionado] = useState('medio')
  const [pelagemSelecionada, setPelagemSelecionada] = useState('curta')

  const [precoUnitario, setPrecoUnitario] = useState<number | null>(null)
  const [buscandoPreco, setBuscandoPreco] = useState(false)

  const [nome, setNome] = useState('')
  const [quantidadeBanhos, setQuantidadeBanhos] = useState('4')
  const [validadeDias, setValidadeDias] = useState('30')
  const [modoValor, setModoValor] = useState<'percentual' | 'valor_final'>('percentual')
  const [percentualDesconto, setPercentualDesconto] = useState('10')
  const [valorFinalManual, setValorFinalManual] = useState('')
  const [tipoRecorrencia, setTipoRecorrencia] = useState<'intervalo' | 'mensal_dia_semana'>('intervalo')
  const [intervaloDias, setIntervaloDias] = useState('7')
  const [semanaDoMes, setSemanaDoMes] = useState('1')
  const [diaSemana, setDiaSemana] = useState('3')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const supabase = createClient()
  
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

    const { data: planosData } = await supabase
      .from('pacote_config_desconto')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('nome')

    const racasMap = Object.fromEntries((racasData || []).map(r => [r.id, r.nome]))

    const planosComNome: Plano[] = (planosData || []).map((p: any) => ({
      ...p,
      nome_referencia: p.raca_id
        ? (racasMap[p.raca_id] || 'Raca')
        : `${PORTES.find(pp => pp.id === p.porte)?.label || p.porte} — ${p.pelagem === 'curta' ? 'Curta' : 'Longa'}`,
    }))

    setRacas(racasData || [])
    setPlanos(planosComNome)
    setCarregando(false)
  }

  useEffect(() => {
    carregarDados()
  }, [])
  
  async function buscarPrecoBanhoBase() {
    setBuscandoPreco(true)
    setPrecoUnitario(null)

    if (usarRaca && racaSelecionadaId) {
      const { data } = await supabase
        .from('catalogo_raca_itens')
        .select('preco')
        .eq('raca_id', racaSelecionadaId)
        .eq('eh_banho_base', true)
        .maybeSingle()

      setPrecoUnitario(data ? Number(data.preco) : null)
    } else if (usarRaca === false) {
      const { data: item } = await supabase
        .from('catalogo_porte_itens')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('eh_banho_base', true)
        .maybeSingle()

      if (item) {
        const { data: precoData } = await supabase
          .from('catalogo_porte_precos')
          .select('preco')
          .eq('item_id', item.id)
          .eq('porte', porteSelecionado)
          .maybeSingle()

        setPrecoUnitario(precoData ? Number(precoData.preco) : null)
      }
    }

    setBuscandoPreco(false)
  }

  useEffect(() => {
    if (usarRaca === true && racaSelecionadaId) buscarPrecoBanhoBase()
    if (usarRaca === false) buscarPrecoBanhoBase()
  }, [usarRaca, racaSelecionadaId, porteSelecionado])

  const precoBase = precoUnitario !== null ? precoUnitario * parseInt(quantidadeBanhos || '0') : null

  const precoFinalCalculado = precoBase === null
    ? null
    : modoValor === 'percentual'
      ? precoBase - (precoBase * parseFloat(percentualDesconto || '0') / 100)
      : parseFloat(valorFinalManual || '0')
      
  function abrirNovoPlano() {
    setEditandoId(null)
    setUsarRaca(null)
    setRacaSelecionadaId('')
    setBuscaRaca('')
    setPorteSelecionado('medio')
    setPelagemSelecionada('curta')
    setPrecoUnitario(null)
    setNome('')
    setQuantidadeBanhos('4')
    setValidadeDias('30')
    setModoValor('percentual')
    setPercentualDesconto('10')
    setValorFinalManual('')
    setTipoRecorrencia('intervalo')
    setIntervaloDias('7')
    setSemanaDoMes('1')
    setDiaSemana('3')
    setErro('')
    setModalAberto(true)
  }

  function abrirEditarPlano(p: Plano) {
    setEditandoId(p.id)
    setUsarRaca(!!p.raca_id)
    setRacaSelecionadaId(p.raca_id || '')
    setBuscaRaca('')
    setPorteSelecionado(p.porte || 'medio')
    setPelagemSelecionada(p.pelagem || 'curta')
    setPrecoUnitario(Number(p.preco_unitario_banho))
    setNome(p.nome)
    setQuantidadeBanhos(String(p.quantidade_banhos))
    setValidadeDias(String(p.validade_dias))
    setModoValor(p.modo_valor)
    setPercentualDesconto(p.modo_valor === 'percentual' ? String(p.valor_desconto) : '10')
    setValorFinalManual(p.modo_valor === 'valor_final' ? String(p.preco_final) : '')
    setTipoRecorrencia(p.tipo_recorrencia)
    setIntervaloDias(String(p.intervalo_dias || 7))
    setSemanaDoMes(String(p.semana_do_mes || 1))
    setDiaSemana(String(p.dia_semana ?? 3))
    setErro('')
    setModalAberto(true)
  }

  async function salvarPlano() {
    setSalvando(true)
    setErro('')

    if (usarRaca === null) {
      setErro('Escolha raca definida ou porte/pelagem.')
      setSalvando(false)
      return
    }

    if (usarRaca && !racaSelecionadaId) {
      setErro('Selecione uma raca.')
      setSalvando(false)
      return
    }

    if (!nome || !quantidadeBanhos || !validadeDias || precoUnitario === null) {
      setErro('Preencha todos os campos. Confirme se ha um banho base cadastrado para esse perfil.')
      setSalvando(false)
      return
    }

    if (!tenantId) {
      setErro('Tenant nao encontrado.')
      setSalvando(false)
      return
    }

    const precoBaseFinal = precoUnitario * parseInt(quantidadeBanhos)
    const valorFinal = modoValor === 'percentual'
      ? precoBaseFinal - (precoBaseFinal * parseFloat(percentualDesconto) / 100)
      : parseFloat(valorFinalManual)

    const payload = {
      tenant_id: tenantId,
      nome,
      raca_id: usarRaca ? racaSelecionadaId : null,
      porte: usarRaca ? null : porteSelecionado,
      pelagem: usarRaca ? null : pelagemSelecionada,
      quantidade_banhos: parseInt(quantidadeBanhos),
      validade_dias: parseInt(validadeDias),
      modo_valor: modoValor,
      tipo_desconto: modoValor === 'percentual' ? 'percentual' : 'fixo',
      valor_desconto: modoValor === 'percentual' ? parseFloat(percentualDesconto) : (precoBaseFinal - valorFinal),
      preco_unitario_banho: precoUnitario,
      preco_base: precoBaseFinal,
      preco_final: valorFinal,
      tipo_recorrencia: tipoRecorrencia,
      intervalo_dias: tipoRecorrencia === 'intervalo' ? parseInt(intervaloDias) : null,
      semana_do_mes: tipoRecorrencia === 'mensal_dia_semana' ? parseInt(semanaDoMes) : null,
      dia_semana: tipoRecorrencia === 'mensal_dia_semana' ? parseInt(diaSemana) : null,
      ativo: true,
    }

    const { error } = editandoId
      ? await supabase.from('pacote_config_desconto').update(payload).eq('id', editandoId)
      : await supabase.from('pacote_config_desconto').insert(payload)

    if (error) {
      setErro('Erro ao salvar: ' + error.message)
      setSalvando(false)
      return
    }

    setSalvando(false)
    setModalAberto(false)
    carregarDados()
  }

  async function removerPlano(id: string) {
    if (!confirm('Remover este plano?')) return
    await supabase.from('pacote_config_desconto').delete().eq('id', id)
    carregarDados()
  }
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Pacotes</h2>
          <p className="text-sm text-gray-500 mt-0.5">Planos de banhos recorrentes por raca ou porte</p>
        </div>
        <button
          onClick={abrirNovoPlano}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + Novo plano
        </button>
      </div>

      {carregando ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : planos.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum plano cadastrado ainda.</p>
          <button onClick={abrirNovoPlano} className="mt-4 text-blue-600 text-sm hover:underline">
            Cadastrar o primeiro plano
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {planos.map(p => (
            <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                  <p className="text-xs text-gray-400">{p.nome_referencia}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 line-through">
                    R$ {Number(p.preco_base).toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-sm font-semibold text-blue-600">
                    R$ {Number(p.preco_final).toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {p.quantidade_banhos} banhos • valido {p.validade_dias} dias
              </p>
              <p className="text-xs text-gray-400">
                {p.tipo_recorrencia === 'intervalo'
                  ? `Repete a cada ${p.intervalo_dias} dias`
                  : `${p.semana_do_mes}a ${DIAS_SEMANA[p.dia_semana || 0]} do mes`}
              </p>
              <div className="flex gap-3 mt-3">
                <button onClick={() => abrirEditarPlano(p)} className="text-xs text-blue-600 hover:underline">
                  Editar
                </button>
                <button onClick={() => removerPlano(p.id)} className="text-xs text-red-500 hover:underline">
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editandoId ? 'Editar plano' : 'Novo plano'}
            </h3>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Este plano e para:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setUsarRaca(true); setPrecoUnitario(null) }}
                    className={`text-xs py-3 rounded-lg border transition-colors ${
                      usarRaca === true ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    🐾 Raca definida
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUsarRaca(false); setPrecoUnitario(null) }}
                    className={`text-xs py-3 rounded-lg border transition-colors ${
                      usarRaca === false ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    📏 Porte / Pelagem
                  </button>
                </div>
              </div>

              {usarRaca === true && (
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Raca</label>
                  <input
                    type="text"
                    value={buscaRaca}
                    onChange={e => setBuscaRaca(e.target.value)}
                    placeholder="Buscar raca..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex flex-col gap-1 max-h-40 overflow-y-auto border border-gray-100 rounded-lg">
                    {racas
                      .filter(r => r.nome.toLowerCase().includes(buscaRaca.toLowerCase()))
                      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                      .map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => { setRacaSelecionadaId(r.id); setBuscaRaca(r.nome) }}
                          className={`text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0 ${
                            racaSelecionadaId === r.id ? 'bg-blue-50 font-medium' : ''
                          }`}
                        >
                          {r.nome}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {usarRaca === false && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-sm text-gray-600 mb-1 block">Porte</label>
                    <select
                      value={porteSelecionado}
                      onChange={e => setPorteSelecionado(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {PORTES.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm text-gray-600 mb-1 block">Pelagem</label>
                    <select
                      value={pelagemSelecionada}
                      onChange={e => setPelagemSelecionada(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="curta">Curta</option>
                      <option value="longa">Longa</option>
                    </select>
                  </div>
                </div>
              )}
              
              {usarRaca !== null && (
                <>
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">Quantidade de banhos</label>
                    <input
                      type="number"
                      value={quantidadeBanhos}
                      onChange={e => setQuantidadeBanhos(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {buscandoPreco ? (
                    <p className="text-xs text-gray-400">Calculando preco base...</p>
                  ) : precoUnitario === null ? (
                    <p className="text-xs text-red-500">
                      Nenhum "banho base" encontrado para esse perfil. Marque um item como banho base no catalogo.
                    </p>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">
                        Banho unitario: R$ {precoUnitario.toFixed(2).replace('.', ',')} × {quantidadeBanhos}
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        Soma: R$ {(precoBase || 0).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  )}

                  {precoUnitario !== null && (
                    <div className="border-t border-gray-100 pt-4">
                      <label className="text-sm text-gray-600 mb-2 block">Como definir o valor final?</label>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => setModoValor('percentual')}
                          className={`text-xs py-2 rounded-lg border transition-colors ${
                            modoValor === 'percentual' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
                          }`}
                        >
                          Desconto percentual
                        </button>
                        <button
                          type="button"
                          onClick={() => setModoValor('valor_final')}
                          className={`text-xs py-2 rounded-lg border transition-colors ${
                            modoValor === 'valor_final' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
                          }`}
                        >
                          Valor final fixo
                        </button>
                      </div>

                      {modoValor === 'percentual' ? (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Desconto (%)</label>
                          <input
                            type="number"
                            value={percentualDesconto}
                            onChange={e => setPercentualDesconto(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Valor final do plano (R$)</label>
                          <input
                            type="number"
                            value={valorFinalManual}
                            onChange={e => setValorFinalManual(e.target.value)}
                            placeholder={precoBase ? precoBase.toFixed(2) : ''}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}

                      {precoFinalCalculado !== null && (
                        <div className="bg-blue-50 rounded-lg p-3 mt-3">
                          <p className="text-xs text-blue-600">Valor final do plano</p>
                          <p className="text-lg font-semibold text-blue-700">
                            R$ {precoFinalCalculado.toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              
              {precoUnitario !== null && (
                <>
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">Nome do plano</label>
                    <input
                      type="text"
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      placeholder="Plano Mensal Fidelidade"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">Validade (dias)</label>
                    <input
                      type="number"
                      value={validadeDias}
                      onChange={e => setValidadeDias(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <label className="text-sm text-gray-600 mb-2 block">Recorrencia dos banhos futuros</label>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setTipoRecorrencia('intervalo')}
                        className={`text-xs py-2 rounded-lg border transition-colors ${
                          tipoRecorrencia === 'intervalo' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
                        }`}
                      >
                        Intervalo fixo
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoRecorrencia('mensal_dia_semana')}
                        className={`text-xs py-2 rounded-lg border transition-colors ${
                          tipoRecorrencia === 'mensal_dia_semana' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
                        }`}
                      >
                        Dia fixo do mes
                      </button>
                    </div>

                    {tipoRecorrencia === 'intervalo' ? (
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">A cada quantos dias</label>
                        <select
                          value={intervaloDias}
                          onChange={e => setIntervaloDias(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="7">7 dias</option>
                          <option value="14">14 dias</option>
                          <option value="21">21 dias</option>
                          <option value="28">28 dias</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 mb-1 block">Qual semana</label>
                          <select
                            value={semanaDoMes}
                            onChange={e => setSemanaDoMes(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="1">1a</option>
                            <option value="2">2a</option>
                            <option value="3">3a</option>
                            <option value="4">4a</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 mb-1 block">Dia da semana</label>
                          <select
                            value={diaSemana}
                            onChange={e => setDiaSemana(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {DIAS_SEMANA.map((d, i) => (
                              <option key={i} value={i}>{d}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {erro && <p className="text-red-500 text-sm">{erro}</p>}

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setModalAberto(false)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarPlano}
                  disabled={salvando || precoUnitario === null}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : 'Salvar plano'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}