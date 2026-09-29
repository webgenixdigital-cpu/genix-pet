'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

// ---------- Tipos ----------

type Tenant = {
  id: string
  nome: string
  slug: string
  telefone: string | null
  logo_url: string | null
  cor_primaria: string | null
  endereco_lat: number | null
  endereco_lng: number | null
  preco_por_km: number | null
  valor_minimo_transporte: number | null
}

type ItemServico = {
  id: string
  grupo: 'combo' | 'principal' | 'adicional'
  nome: string
  preco: number
  descricao?: string | null
  tosa_tipo?: string | null
  duracao_min?: number | null
}

type Profissional = { id: string; nome: string; cor_agenda: string }

type Raca = {
  id: string
  nome: string
  imagem_url: string | null
  itens: ItemServico[]
}

type PorteId = 'mini' | 'pequeno' | 'medio' | 'grande' | 'gigante' | 'extra_grande'

const PORTES: { id: PorteId; label: string }[] = [
  { id: 'mini', label: 'PP' },
  { id: 'pequeno', label: 'P' },
  { id: 'medio', label: 'M' },
  { id: 'grande', label: 'G' },
  { id: 'gigante', label: 'GG' },
  { id: 'extra_grande', label: 'EXG' },
]

type PorteItemBase = {
  id: string
  grupo: 'combo' | 'principal' | 'adicional'
  nome: string
  descricao: string | null
  tosa_tipo: string | null
  pelagens: string[] | null
  duracao_min: number | null
}

function gerarHorarios(inicio: string, fim: string, duracaoMin: number): string[] {
  const horarios: string[] = []
  const [hIni, mIni] = inicio.split(':').map(Number)
  const [hFim, mFim] = fim.split(':').map(Number)
  let atual = hIni * 60 + mIni
  const limite = hFim * 60 + mFim
  while (atual + duracaoMin <= limite) {
    const h = Math.floor(atual / 60)
    const m = atual % 60
    horarios.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    atual += duracaoMin
  }
  return horarios
}

function formatarDataISO(data: Date): string {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

type Etapa =
  | 'identificacao'
  | 'racaOuSrd'
  | 'escolherRaca'
  | 'porte'
  | 'pelagem'
  | 'servicos'
  | 'agendamento'
  | 'transporte'
  | 'resumo'
// ---------- Componente ----------

export default function AgendarSimplesPage() {
  const params = useParams()
  const slug = params.slug as string
  const supabase = createClient()

  const [carregando, setCarregando] = useState(true)
  const [naoEncontrado, setNaoEncontrado] = useState(false)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [racas, setRacas] = useState<Raca[]>([])
  const [porteItens, setPorteItens] = useState<PorteItemBase[]>([])
  const [portePrecos, setPortePrecos] = useState<{ item_id: string; porte: string; preco: number }[]>([])

  const [etapa, setEtapa] = useState<Etapa>('identificacao')

  // Dados do cliente
  const [nomeCliente, setNomeCliente] = useState('')
  const [telefoneCliente, setTelefoneCliente] = useState('')

  // Dados do pet
    const [usarFluxoRaca, setUsarFluxoRaca] = useState<boolean | null>(null)
  const [racaSelecionada, setRacaSelecionada] = useState<Raca | null>(null)
  const [porteSelecionado, setPorteSelecionado] = useState<PorteId | null>(null)
    const [pelagemSelecionada, setPelagemSelecionada] = useState<'curta' | 'longa' | null>(null)
  const [buscaRaca, setBuscaRaca] = useState('')
    const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(new Set())

  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<Profissional | null>(null)
  const [dataSelecionada, setDataSelecionada] = useState('')
  const [horarioSelecionado, setHorarioSelecionado] = useState('')
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([])
  const [carregandoHorarios, setCarregandoHorarios] = useState(false)

  // Transporte
  const [precisaTransporte, setPrecisaTransporte] = useState<boolean | null>(null)
  const [ruaColeta, setRuaColeta] = useState('')
  const [numeroColeta, setNumeroColeta] = useState('')
  const [bairroColeta, setBairroColeta] = useState('')
  const [cidadeColeta, setCidadeColeta] = useState('')
  const [ufColeta, setUfColeta] = useState('')
  const [entregaIgualColeta, setEntregaIgualColeta] = useState(true)
  const [ruaEntrega, setRuaEntrega] = useState('')
  const [numeroEntrega, setNumeroEntrega] = useState('')
  const [bairroEntrega, setBairroEntrega] = useState('')
  const [cidadeEntrega, setCidadeEntrega] = useState('')
  const [ufEntrega, setUfEntrega] = useState('')
  function precoItemPorte(itemId: string): number {
    if (!porteSelecionado) return 0
    const p = portePrecos.find(pp => pp.item_id === itemId && pp.porte === porteSelecionado)
    return p ? Number(p.preco) : 0
  }

      function itensDisponiveis(): { id: string; grupo: 'combo' | 'principal' | 'adicional'; nome: string; preco: number; tosa_tipo?: string | null; duracao_min?: number | null; descricao?: string | null }[] {
    if (usarFluxoRaca && racaSelecionada) {
      return racaSelecionada.itens.map(i => ({ id: i.id, grupo: i.grupo, nome: i.nome, preco: Number(i.preco), tosa_tipo: i.tosa_tipo, duracao_min: i.duracao_min, descricao: i.descricao }))
    }
    if (usarFluxoRaca === false && pelagemSelecionada) {
      return porteItens
        .filter(i => !i.pelagens || i.pelagens.length === 0 || i.pelagens.includes(pelagemSelecionada))
        .map(i => ({ id: i.id, grupo: i.grupo, nome: i.nome, preco: precoItemPorte(i.id), tosa_tipo: i.tosa_tipo, duracao_min: i.duracao_min, descricao: i.descricao }))
    }
    return []
  }

  function duracaoTotalServicos(): number {
    const disponiveis = itensDisponiveis()
    return disponiveis.filter(i => itensSelecionados.has(i.id)).reduce((s, i) => s + (i.duracao_min || 20), 0)
  }

  function toggleItem(id: string, grupo: 'combo' | 'principal' | 'adicional') {
    setItensSelecionados(prev => {
      const novo = new Set(prev)
      if (novo.has(id)) {
        novo.delete(id)
      } else {
        if (grupo === 'combo' || grupo === 'principal') {
          // combo e principal sao mutuamente exclusivos entre si (so um banho/combo por vez)
          const disponiveis = itensDisponiveis()
          disponiveis.filter(i => i.grupo === 'combo' || i.grupo === 'principal').forEach(i => novo.delete(i.id))
        }
        novo.add(id)
      }
      return novo
    })
  }

    function totalServicos(): number {
    const disponiveis = itensDisponiveis()
    return disponiveis.filter(i => itensSelecionados.has(i.id)).reduce((s, i) => s + i.preco, 0)
  }

  async function buscarHorarios(data: string) {
    if (!tenant) return
    setCarregandoHorarios(true)
    setHorarioSelecionado('')

    const dataObj = new Date(data + 'T00:00:00')
    const diaSemana = dataObj.getDay()
    const duracaoTotal = duracaoTotalServicos() || 60

    const profissionaisParaChecar = profissionalSelecionado ? [profissionalSelecionado] : profissionais

    let todosHorarios: string[] = []

    for (const prof of profissionaisParaChecar) {
      const { data: disponibilidade } = await supabase
        .from('professional_availability')
        .select('hora_inicio, hora_fim')
        .eq('professional_id', prof.id)
        .eq('dia_semana', diaSemana)
        .maybeSingle()

      if (!disponibilidade) continue

      const horariosBase = gerarHorarios(
        disponibilidade.hora_inicio.slice(0, 5),
        disponibilidade.hora_fim.slice(0, 5),
        duracaoTotal
      )

      const { data: agendamentosExistentes } = await supabase
        .from('appointments')
        .select('inicio')
        .eq('professional_id', prof.id)
        .gte('inicio', data + 'T00:00:00')
        .lte('inicio', data + 'T23:59:59')
        .neq('status', 'cancelado')

      const horariosOcupados = (agendamentosExistentes || []).map(a => {
        const d = new Date(a.inicio)
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      })

      const livres = horariosBase.filter(h => !horariosOcupados.includes(h))
      todosHorarios = [...todosHorarios, ...livres]
    }

    const unicos = Array.from(new Set(todosHorarios)).sort()
    setHorariosDisponiveis(unicos)
    setCarregandoHorarios(false)
  }

  function nomesServicosSelecionados(): string {
  const disponiveis = itensDisponiveis()
    return disponiveis.filter(i => itensSelecionados.has(i.id)).map(i => i.nome).join(' + ')
  }

  function formatarTelefoneDDI(tel: string | null | undefined): string {
    const numeros = (tel || '').replace(/\D/g, '')
    if (!numeros) return ''
    return numeros.startsWith('55') ? numeros : `55${numeros}`
  }

  function enviarPedido() {
    if (!tenant) return

    const enderecoColetaTexto = `${ruaColeta}, ${numeroColeta}${bairroColeta ? ', ' + bairroColeta : ''}, ${cidadeColeta} - ${ufColeta}`
    const enderecoEntregaTexto = entregaIgualColeta
      ? enderecoColetaTexto
      : `${ruaEntrega}, ${numeroEntrega}${bairroEntrega ? ', ' + bairroEntrega : ''}, ${cidadeEntrega} - ${ufEntrega}`

    const racaOuPorteTexto = usarFluxoRaca && racaSelecionada
      ? racaSelecionada.nome
      : `SRD — porte ${PORTES.find(p => p.id === porteSelecionado)?.label || porteSelecionado}, pelagem ${pelagemSelecionada}`

    const linhaTransporte = precisaTransporte
      ? `\n\n🚐 *Transporte:* Sim\n📍 Coleta: ${enderecoColetaTexto}\n📍 Entrega: ${enderecoEntregaTexto}\n_Valor do transporte a confirmar._`
      : `\n\n🚐 *Transporte:* Nao (cliente leva/busca o pet)`

        const dataFormatada = dataSelecionada
      ? new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR')
      : ''

    const mensagem =
      `Ola! Gostaria de agendar um horario 🐾\n\n` +
      `*Cliente:* ${nomeCliente}\n` +
      `*Telefone:* ${telefoneCliente}\n` +
      `*Pet:* ${racaOuPorteTexto}\n` +
      `*Servicos:* ${nomesServicosSelecionados()}\n` +
      `*Data:* ${dataFormatada}\n` +
      `*Horario:* ${horarioSelecionado}\n` +
      (profissionalSelecionado ? `*Profissional:* ${profissionalSelecionado.nome}\n` : '') +
      `*Total servicos:* R$ ${totalServicos().toFixed(2)}` +
      linhaTransporte

    const telefoneDestino = formatarTelefoneDDI(tenant.telefone)
    const url = `https://wa.me/${telefoneDestino}?text=${encodeURIComponent(mensagem)}`
    window.open(url, '_blank')
  }
  useEffect(() => {
    async function carregar() {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id, nome, slug, telefone, logo_url, cor_primaria, endereco_lat, endereco_lng, preco_por_km, valor_minimo_transporte')
        .eq('slug', slug)
        .single()

      if (!tenantData) {
        setNaoEncontrado(true)
        setCarregando(false)
        return
      }

      const { data: racasData } = await supabase
        .from('catalogo_racas')
        .select('id, nome, imagem_url')
        .eq('tenant_id', tenantData.id)

      const racaIds = (racasData || []).map((r: any) => r.id)
      let racaItensData: any[] = []
      if (racaIds.length > 0) {
        const { data } = await supabase
          .from('catalogo_raca_itens')
          .select('id, raca_id, grupo, nome, descricao, preco, tosa_tipo, duracao_min')
          .in('raca_id', racaIds)
        racaItensData = data || []
      }

      const racasMontadas: Raca[] = (racasData || []).map((r: any) => ({
        ...r,
        itens: racaItensData.filter(i => i.raca_id === r.id),
      }))

            const { data: porteItensData } = await supabase
        .from('catalogo_porte_itens')
        .select('id, grupo, nome, descricao, tosa_tipo, pelagens, duracao_min')
        .eq('tenant_id', tenantData.id)

      const { data: profissionaisData } = await supabase
        .from('professionals')
        .select('id, nome, cor_agenda')
        .eq('tenant_id', tenantData.id)
        .eq('ativo', true)
        .order('nome')

      const porteItemIds = (porteItensData || []).map((i: any) => i.id)
      let portePrecosData: any[] = []
      if (porteItemIds.length > 0) {
        const { data } = await supabase
          .from('catalogo_porte_precos')
          .select('item_id, porte, preco')
          .in('item_id', porteItemIds)
        portePrecosData = data || []
      }

           setTenant(tenantData as any)
      setRacas(racasMontadas)
      setPorteItens((porteItensData as any) || [])
      setPortePrecos(portePrecosData)
      setProfissionais((profissionaisData as any) || [])
      setCarregando(false)
    }
    carregar()
  }, [slug])

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    )
  }

  if (naoEncontrado || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Pet shop nao encontrado.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-8 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-6">
        {tenant.logo_url && (
          <img src={tenant.logo_url} alt={tenant.nome} className="h-12 mx-auto mb-4 object-contain" />
        )}
        <h1 className="text-lg font-bold text-center text-gray-900 mb-6">{tenant.nome}</h1>

        {etapa === 'identificacao' && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Vamos agendar seu horario!</h2>
            <p className="text-sm text-gray-500 mb-5">Primeiro, como podemos te chamar?</p>

            <div className="mb-3">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Seu nome</label>
              <input
                type="text"
                value={nomeCliente}
                onChange={e => setNomeCliente(e.target.value)}
                placeholder="Maria Silva"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="mb-5">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Seu telefone (WhatsApp)</label>
              <input
                type="text"
                value={telefoneCliente}
                onChange={e => setTelefoneCliente(e.target.value)}
                placeholder="(35) 99999-9999"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <button
              onClick={() => setEtapa('racaOuSrd')}
              disabled={nomeCliente.trim().length < 2 || telefoneCliente.replace(/\D/g, '').length < 10}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl disabled:opacity-40 transition-colors"
            >
              Continuar
            </button>
          </div>
        )}

                {etapa === 'racaOuSrd' && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Sobre o seu pet</h2>
            <p className="text-sm text-gray-500 mb-5">Seu pet tem raca definida?</p>

            <div className="flex flex-col gap-2.5 mb-5">
              <button
                onClick={() => { setUsarFluxoRaca(true); setEtapa('escolherRaca' as Etapa) }}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-left font-semibold hover:border-blue-600 hover:bg-blue-50 transition"
              >
                Sim, tem raca definida
              </button>
              <button
                onClick={() => { setUsarFluxoRaca(false); setEtapa('porte') }}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-left font-semibold hover:border-blue-600 hover:bg-blue-50 transition"
              >
                Nao, e SRD (sem raca definida)
              </button>
            </div>

            <button onClick={() => setEtapa('identificacao')} className="text-sm text-gray-400 hover:text-gray-600">
              ← Voltar
            </button>
          </div>
        )}

               {etapa === 'escolherRaca' && (() => {
          const racasFiltradas = racas.filter(r => r.nome.toLowerCase().includes(buscaRaca.trim().toLowerCase()))

          return (
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-1">Qual a raca do seu pet?</h2>
              <p className="text-sm text-gray-500 mb-3">Busque ou selecione na lista abaixo.</p>

              <input
                type="text"
                value={buscaRaca}
                onChange={e => setBuscaRaca(e.target.value)}
                placeholder="Digite a raca..."
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-600 focus:outline-none mb-3"
                autoFocus
              />

              <div className="flex flex-col gap-2 mb-5 max-h-80 overflow-y-auto">
                {racasFiltradas.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setRacaSelecionada(r); setEtapa('servicos') }}
                    className={`w-full border-2 rounded-xl px-4 py-3 text-left font-semibold transition ${
                      racaSelecionada?.id === r.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {r.nome}
                  </button>
                ))}
                {racasFiltradas.length === 0 && (
                  <p className="text-sm text-gray-400">Nenhuma raca encontrada.</p>
                )}
              </div>

              <button onClick={() => setEtapa('racaOuSrd')} className="text-sm text-gray-400 hover:text-gray-600">
                ← Voltar
              </button>
            </div>
          )
        })()}

        {etapa === 'porte' && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Qual o porte do seu pet?</h2>
            <p className="text-sm text-gray-500 mb-5">Escolha a opcao mais proxima do tamanho dele.</p>

            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {PORTES.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setPorteSelecionado(p.id); setEtapa('pelagem') }}
                  className={`border-2 rounded-xl py-4 text-center font-bold transition ${
                    porteSelecionado === p.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300 text-gray-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button onClick={() => setEtapa('racaOuSrd')} className="text-sm text-gray-400 hover:text-gray-600">
              ← Voltar
            </button>
          </div>
        )}

        {etapa === 'pelagem' && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Qual a pelagem?</h2>
            <p className="text-sm text-gray-500 mb-5">Isso ajuda a calcular o valor certo do banho.</p>

            <div className="flex flex-col gap-2.5 mb-5">
              <button
                onClick={() => { setPelagemSelecionada('curta'); setEtapa('servicos') }}
                className={`w-full border-2 rounded-xl px-4 py-3.5 text-left font-semibold transition ${
                  pelagemSelecionada === 'curta' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                Pelagem curta
              </button>
              <button
                onClick={() => { setPelagemSelecionada('longa'); setEtapa('servicos') }}
                className={`w-full border-2 rounded-xl px-4 py-3.5 text-left font-semibold transition ${
                  pelagemSelecionada === 'longa' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                Pelagem longa
              </button>
            </div>

            <button onClick={() => setEtapa('porte')} className="text-sm text-gray-400 hover:text-gray-600">
              ← Voltar
            </button>
          </div>
        )}

                {etapa === 'servicos' && (() => {
          const disponiveis = itensDisponiveis()
          const combos = disponiveis.filter(i => i.grupo === 'combo')
          const principais = disponiveis.filter(i => i.grupo === 'principal')
          const adicionais = disponiveis.filter(i => i.grupo === 'adicional')

          return (
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-1">Escolha os servicos</h2>
              <p className="text-sm text-gray-500 mb-4">Selecione um combo ou monte servicos avulsos.</p>

                            {combos.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Combos</p>
                  <div className="flex flex-col gap-2">
                    {combos.map(i => (
                      <ItemServicoCard key={i.id} item={i} selecionado={itensSelecionados.has(i.id)} onToggle={() => toggleItem(i.id, i.grupo)} />
                    ))}
                  </div>
                </div>
              )}

              {principais.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Servicos individuais</p>
                  <div className="flex flex-col gap-2">
                    {principais.map(i => (
                      <ItemServicoCard key={i.id} item={i} selecionado={itensSelecionados.has(i.id)} onToggle={() => toggleItem(i.id, i.grupo)} />
                    ))}
                  </div>
                </div>
              )}

              {adicionais.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Adicionais</p>
                  <div className="flex flex-col gap-2">
                    {adicionais.map(i => (
                      <ItemServicoCard key={i.id} item={i} selecionado={itensSelecionados.has(i.id)} onToggle={() => toggleItem(i.id, i.grupo)} />
                    ))}
                  </div>
                </div>
              )}

              {disponiveis.length === 0 && (
                <p className="text-sm text-gray-400 mb-5">Nenhum servico disponivel para essa configuracao.</p>
              )}

              {itensSelecionados.size > 0 && (
                <div className="flex justify-between items-center border-t-2 border-gray-900 pt-3 mb-4">
                  <span className="font-bold text-sm">Subtotal servicos</span>
                  <span className="text-lg font-extrabold text-blue-700">R$ {totalServicos().toFixed(2)}</span>
                </div>
              )}

                            <button
                onClick={() => setEtapa('agendamento')}
                disabled={itensSelecionados.size === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl disabled:opacity-40 transition-colors mb-3"
              >
                Continuar
              </button>
                            <button
                onClick={() => setEtapa(usarFluxoRaca ? 'escolherRaca' : 'pelagem')}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                ← Voltar
              </button>
            </div>
          )
        })()}

        {etapa === 'transporte' && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Precisa de transporte?</h2>
            <p className="text-sm text-gray-500 mb-5">Buscamos e levamos seu pet ate voce.</p>

            {precisaTransporte === null && (
              <div className="flex flex-col gap-2.5 mb-5">
                <button
                  onClick={() => setPrecisaTransporte(true)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-left font-semibold hover:border-blue-600 hover:bg-blue-50 transition"
                >
                  Sim, preciso de transporte
                </button>
                <button
                  onClick={() => { setPrecisaTransporte(false); setEtapa('resumo') }}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-left font-semibold hover:border-blue-600 hover:bg-blue-50 transition"
                >
                  Nao, eu levo e busco
                </button>
              </div>
            )}

            {precisaTransporte === true && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Endereco de coleta</p>
                <div className="flex flex-col gap-2 mb-4">
                  <input
                    type="text"
                    value={ruaColeta}
                    onChange={e => setRuaColeta(e.target.value)}
                    placeholder="Rua"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={numeroColeta}
                      onChange={e => setNumeroColeta(e.target.value)}
                      placeholder="Numero"
                      className="w-1/3 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={bairroColeta}
                      onChange={e => setBairroColeta(e.target.value)}
                      placeholder="Bairro"
                      className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={cidadeColeta}
                      onChange={e => setCidadeColeta(e.target.value)}
                      placeholder="Cidade"
                      className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={ufColeta}
                      onChange={e => setUfColeta(e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="UF"
                      className="w-16 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 mb-4 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={entregaIgualColeta}
                    onChange={e => setEntregaIgualColeta(e.target.checked)}
                  />
                  Entregar no mesmo endereco da coleta
                </label>

                {!entregaIgualColeta && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Endereco de entrega</p>
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={ruaEntrega}
                        onChange={e => setRuaEntrega(e.target.value)}
                        placeholder="Rua"
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={numeroEntrega}
                          onChange={e => setNumeroEntrega(e.target.value)}
                          placeholder="Numero"
                          className="w-1/3 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={bairroEntrega}
                          onChange={e => setBairroEntrega(e.target.value)}
                          placeholder="Bairro"
                          className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={cidadeEntrega}
                          onChange={e => setCidadeEntrega(e.target.value)}
                          placeholder="Cidade"
                          className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={ufEntrega}
                          onChange={e => setUfEntrega(e.target.value.toUpperCase().slice(0, 2))}
                          placeholder="UF"
                          className="w-16 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 mb-4">
                  💡 O valor do transporte sera calculado e confirmado pelo pet shop.
                </p>

                <button
                  onClick={() => setEtapa('resumo')}
                  disabled={!ruaColeta || !numeroColeta || !cidadeColeta || !ufColeta}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl disabled:opacity-40 transition-colors mb-3"
                >
                  Continuar
                </button>
              </div>
            )}

                        <button onClick={() => setEtapa('agendamento')} className="text-sm text-gray-400 hover:text-gray-600">
              ← Voltar
            </button>
          </div>
        )}

        {etapa === 'agendamento' && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Data e horario</h2>
            <p className="text-sm text-gray-500 mb-4">Escolha o melhor dia e horario para voce.</p>

            {profissionais.length > 1 && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Profissional (opcional)</label>
                <select
                  value={profissionalSelecionado?.id || ''}
                  onChange={e => {
                    const prof = profissionais.find(p => p.id === e.target.value) || null
                    setProfissionalSelecionado(prof)
                    if (dataSelecionada) buscarHorarios(dataSelecionada)
                  }}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
                >
                  <option value="">Qualquer profissional disponivel</option>
                  {profissionais.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Data</label>
              <input
                type="date"
                value={dataSelecionada}
                min={formatarDataISO(new Date())}
                onChange={e => { setDataSelecionada(e.target.value); buscarHorarios(e.target.value) }}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            {dataSelecionada && (
              <div className="mb-5">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Horario</label>
                {carregandoHorarios ? (
                  <p className="text-sm text-gray-400">Buscando horarios...</p>
                ) : horariosDisponiveis.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhum horario disponivel nesta data.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {horariosDisponiveis.map(h => (
                      <button
                        key={h}
                        onClick={() => setHorarioSelecionado(h)}
                        className={`border-2 rounded-lg py-2 text-sm font-semibold transition ${
                          horarioSelecionado === h ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setEtapa('transporte')}
              disabled={!dataSelecionada || !horarioSelecionado}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl disabled:opacity-40 transition-colors mb-3"
            >
              Continuar
            </button>

            <button onClick={() => setEtapa('servicos')} className="text-sm text-gray-400 hover:text-gray-600">
              ← Voltar
            </button>
          </div>
        )}

        {etapa === 'resumo' && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Resumo do pedido</h2>
            <p className="text-sm text-gray-500 mb-4">Confira antes de enviar.</p>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Nome</span>
                <span className="font-semibold">{nomeCliente}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Telefone</span>
                <span className="font-semibold">{telefoneCliente}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pet</span>
                <span className="font-semibold text-right">
                  {usarFluxoRaca && racaSelecionada
                    ? racaSelecionada.nome
                    : `SRD — ${PORTES.find(p => p.id === porteSelecionado)?.label} / ${pelagemSelecionada}`}
                </span>
              </div>
              <div className="pt-2 border-t border-dashed border-gray-200">
                <span className="text-gray-500">Servicos</span>
                <p className="font-semibold mt-0.5">{nomesServicosSelecionados()}</p>
              </div>
              <div className="flex justify-between pt-2 border-t border-dashed border-gray-200">
                <span className="text-gray-500">Data e horario</span>
                <span className="font-semibold">
                  {dataSelecionada ? new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR') : ''} as {horarioSelecionado}
                </span>
              </div>
              {profissionalSelecionado && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Profissional</span>
                  <span className="font-semibold">{profissionalSelecionado.nome}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-dashed border-gray-200">
                <span className="text-gray-500">Transporte</span>
                <span className="font-semibold">{precisaTransporte ? 'Sim' : 'Nao'}</span>
              </div>
            </div>

            {precisaTransporte && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3 mb-4">
                💡 O valor final incluira uma taxa de transporte, a ser confirmada pelo pet shop.
              </p>
            )}

            <div className="flex justify-between items-center border-t-2 border-gray-900 pt-3 mb-5">
              <span className="font-bold">Total dos servicos</span>
              <span className="text-2xl font-extrabold text-blue-700">R$ {totalServicos().toFixed(2)}</span>
            </div>

            <button
              onClick={enviarPedido}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-colors mb-3"
            >
              Enviar pedido pelo WhatsApp
            </button>

            <button onClick={() => setEtapa('transporte')} className="text-sm text-gray-400 hover:text-gray-600">
              ← Voltar
            </button>
          </div>
        )}
            </div>
    </div>
  )
}

function ItemServicoCard({
  item,
  selecionado,
  onToggle,
}: {
  item: { id: string; nome: string; preco: number; descricao?: string | null }
  selecionado: boolean
  onToggle: () => void
}) {
  const [expandido, setExpandido] = useState(false)

  return (
    <div className={`border-2 rounded-xl px-4 py-3 transition ${selecionado ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
      <button onClick={onToggle} className="w-full flex justify-between items-center text-left">
        <span className="font-semibold text-sm">{item.nome}</span>
        <span className="text-sm font-bold text-blue-700">R$ {item.preco.toFixed(2)}</span>
      </button>
      {item.descricao && (
        <div className="mt-1">
          <button
            onClick={e => { e.stopPropagation(); setExpandido(v => !v) }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            {expandido ? 'ocultar detalhes ▲' : 'ver o que esta incluso ▼'}
          </button>
          {expandido && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.descricao}</p>
          )}
        </div>
      )}
    </div>
  )
}