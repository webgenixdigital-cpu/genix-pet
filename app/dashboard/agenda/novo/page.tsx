'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type PorteId = 'mini' | 'pequeno' | 'medio' | 'grande' | 'extra_grande' | 'gigante'
type Grupo = 'principal' | 'adicional' | 'combo'

type RacaItem = {
  id: string
  raca_id: string
  grupo: Grupo
  nome: string
  descricao: string | null
  preco: number
  tosa_tipo: string | null
  inclui: string[] | null
  duracao_min: number | null
}

type Raca = {
  id: string
  nome: string
  imagem_url: string | null
  itens: RacaItem[]
}

type PorteItem = {
  id: string
  grupo: Grupo
  nome: string
  descricao: string | null
  tosa_tipo: string | null
  inclui: string[] | null
  pelagens: string[] | null
  duracao_min: number | null
  precos: { porte: string; preco: number }[]
}

type TipoTosa = { id: string; nome: string; descricao: string }
type Profissional = { id: string; nome: string; cor_agenda: string }
type Pet = { id: string; nome: string; porte: string | null; raca: string | null; pelagem: string | null }
type ClienteEncontrado = { id: string; nome: string; telefone: string; pets: Pet[] }

const PORTES: { id: PorteId; label: string }[] = [
  { id: 'mini', label: 'Mini (1 a 4 kg)' },
  { id: 'pequeno', label: 'Pequeno (4 a 9 kg)' },
  { id: 'medio', label: 'Medio (9 a 15 kg)' },
  { id: 'grande', label: 'Grande (15 a 22 kg)' },
  { id: 'extra_grande', label: 'Extra Grande (22 a 35 kg)' },
  { id: 'gigante', label: 'Gigante (acima de 35 kg)' },
]

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

function fmtMoeda(v: number): string {
  return `R$ ${v.toFixed(2).replace('.', ',')}`
}

export default function NovoAgendamentoPage() {
  const router = useRouter()
  const supabase = createClient()

  const [racas, setRacas] = useState<Raca[]>([])
  const [porteItens, setPorteItens] = useState<PorteItem[]>([])
  const [tiposTosa, setTiposTosa] = useState<TipoTosa[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [carregando, setCarregando] = useState(true)

  const [telefone, setTelefone] = useState('')
  const [nomeCliente, setNomeCliente] = useState('')
  const [clienteEncontrado, setClienteEncontrado] = useState<ClienteEncontrado | null>(null)
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const [sugestoes, setSugestoes] = useState<ClienteEncontrado[]>([])
  const [buscaTexto, setBuscaTexto] = useState('')

  const [nomePetNovo, setNomePetNovo] = useState('')
  const [petSelecionado, setPetSelecionado] = useState('')
  const [portePet, setPortePet] = useState<PorteId>('medio')
  const [pelagemPet, setPelagemPet] = useState('curta')

  const [usarFluxoRaca, setUsarFluxoRaca] = useState<boolean | null>(null)
  const [racaSelecionadaCatalogo, setRacaSelecionadaCatalogo] = useState<Raca | null>(null)
  const [buscaRaca, setBuscaRaca] = useState('')
  const [itensRacaSelecionados, setItensRacaSelecionados] = useState<Set<string>>(new Set())
  const [itensPorteSelecionados, setItensPorteSelecionados] = useState<Set<string>>(new Set())
    const [modalTosa, setModalTosa] = useState<{ titulo: string; texto: string } | null>(null)
  const [modalCombo, setModalCombo] = useState<{ titulo: string; itens: string[] } | null>(null)

  const [profissionalId, setProfissionalId] = useState('')
  const [data, setData] = useState('')
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([])
  const [horario, setHorario] = useState('')
  const [carregandoHorarios, setCarregandoHorarios] = useState(false)

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenantTransporte, setTenantTransporte] = useState<{
    endereco_lat: number | null
    endereco_lng: number | null
    preco_por_km: number | null
    valor_minimo_transporte: number | null
  } | null>(null)

  const [precisaTransporte, setPrecisaTransporte] = useState(false)
  const [cepColeta, setCepColeta] = useState('')
  const [ruaColeta, setRuaColeta] = useState('')
  const [numeroColeta, setNumeroColeta] = useState('')
  const [bairroColeta, setBairroColeta] = useState('')
  const [cidadeColeta, setCidadeColeta] = useState('')
  const [ufColeta, setUfColeta] = useState('')
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [transporteIdaVolta, setTransporteIdaVolta] = useState(false)
  const [distanciaKm, setDistanciaKm] = useState<number | null>(null)
  const [calculandoDistancia, setCalculandoDistancia] = useState(false)
  const [descontoTransporte, setDescontoTransporte] = useState('0')
  const [faixasTransporte, setFaixasTransporte] = useState<{ raio_min_km: number; raio_max_km: number; valor_fixo: number }[]>([])
  
  async function carregarDados() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setCarregando(false)
      return
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, endereco_lat, endereco_lng, preco_por_km, valor_minimo_transporte')
      .eq('email', user.email)
      .single()

    if (!tenant) {
      setCarregando(false)
      return
    }

    setTenantId(tenant.id)
    setTenantTransporte({
      endereco_lat: tenant.endereco_lat,
      endereco_lng: tenant.endereco_lng,
      preco_por_km: tenant.preco_por_km,
      valor_minimo_transporte: tenant.valor_minimo_transporte,
    })

    const { data: racasData } = await supabase
      .from('catalogo_racas')
      .select('id, nome, imagem_url')
      .eq('tenant_id', tenant.id)
      .order('nome')

    const racaIds = (racasData || []).map((r: any) => r.id)
    let racaItensData: any[] = []
    if (racaIds.length > 0) {
            const { data } = await supabase
        .from('catalogo_raca_itens')
        .select('id, raca_id, grupo, nome, descricao, preco, tosa_tipo, inclui, duracao_min')
        .in('raca_id', racaIds)
      racaItensData = data || []
    }

    const racasMontadas: Raca[] = (racasData || []).map((r: any) => ({
      ...r,
      itens: racaItensData.filter(i => i.raca_id === r.id),
    }))

        const { data: porteItensData } = await supabase
      .from('catalogo_porte_itens')
      .select('id, grupo, nome, descricao, tosa_tipo, inclui, pelagens, duracao_min')
      .eq('tenant_id', tenant.id)
      .order('nome')

    const porteItemIds = (porteItensData || []).map((i: any) => i.id)
    let precosData: any[] = []
    if (porteItemIds.length > 0) {
      const { data } = await supabase
        .from('catalogo_porte_precos')
        .select('item_id, porte, preco')
        .in('item_id', porteItemIds)
      precosData = data || []
    }

    const porteItensMontados: PorteItem[] = (porteItensData || []).map((i: any) => ({
      ...i,
      precos: precosData.filter(p => p.item_id === i.id),
    }))

    const { data: tiposTosaData } = await supabase
      .from('catalogo_tosa_tipos')
      .select('id, nome, descricao')
      .eq('tenant_id', tenant.id)

    const { data: profissionaisData } = await supabase
      .from('professionals')
      .select('id, nome, cor_agenda')
      .eq('tenant_id', tenant.id)
      .eq('ativo', true)
      .order('nome')

    const { data: faixasData } = await supabase
      .from('transport_price_tiers')
      .select('raio_min_km, raio_max_km, valor_fixo')
      .eq('tenant_id', tenant.id)
      .order('raio_min_km')

    setRacas(racasMontadas)
    setPorteItens(porteItensMontados)
    setTiposTosa(tiposTosaData || [])
    setProfissionais(profissionaisData || [])
    setFaixasTransporte((faixasData || []).map((f: any) => ({
      raio_min_km: Number(f.raio_min_km),
      raio_max_km: Number(f.raio_max_km),
      valor_fixo: Number(f.valor_fixo),
    })))
    setCarregando(false)
  }

  useEffect(() => { carregarDados() }, [])
  
  async function buscarClientePorTelefone(telefoneDigitado: string) {
    setClienteEncontrado(null)
    setPetSelecionado('')

    if (!tenantId || telefoneDigitado.replace(/\D/g, '').length < 4) {
      setSugestoes([])
      return
    }

    setBuscandoCliente(true)

    const { data: clientes } = await supabase
      .from('customers')
      .select('id, nome, telefone, pets ( id, nome, porte, raca, pelagem )')
      .eq('tenant_id', tenantId)
      .ilike('telefone', `%${telefoneDigitado.replace(/\D/g, '')}%`)
      .limit(6)

    setSugestoes((clientes as any) || [])
    setBuscandoCliente(false)
  }

  function selecionarCliente(cliente: ClienteEncontrado) {
    setClienteEncontrado(cliente)
    setNomeCliente(cliente.nome)
    setTelefone(cliente.telefone)
    setSugestoes([])
  }

    function selecionarPetExistente(petId: string) {
    setPetSelecionado(petId)
    const pet = clienteEncontrado?.pets.find(p => p.id === petId)
    if (!pet) return

    if (pet.porte) setPortePet(pet.porte as PorteId)
    if (pet.pelagem) setPelagemPet(pet.pelagem)

    const racaCatalogo = racas.find(r => r.nome.toLowerCase() === (pet.raca || '').toLowerCase())
    if (racaCatalogo) {
      setUsarFluxoRaca(true)
      setRacaSelecionadaCatalogo(racaCatalogo)
    } else {
      setUsarFluxoRaca(false)
      setRacaSelecionadaCatalogo(null)
    }
  }

  async function buscarCep(cep: string) {
    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return

    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const data = await res.json()

      if (!data.erro) {
        setRuaColeta(data.logradouro || '')
        setBairroColeta(data.bairro || '')
        setCidadeColeta(data.localidade || '')
        setUfColeta(data.uf || '')
      }
    } catch {
      // silencioso
    }
    setBuscandoCep(false)
  }

  async function calcularValorTransporteEstruturado() {
    if (!numeroColeta || !ruaColeta || !cidadeColeta || !ufColeta || !tenantTransporte?.endereco_lat) return

    setCalculandoDistancia(true)
    try {
      const params = new URLSearchParams({
        rua: ruaColeta,
        numero: numeroColeta,
        cidade: cidadeColeta,
        uf: ufColeta,
      })

      const res = await fetch(`/api/geocodificar?${params.toString()}`)
      const coords = await res.json()

      if (coords.lat) {
        const R = 6371
        const lat1 = tenantTransporte.endereco_lat
        const lng1 = tenantTransporte.endereco_lng!
        const dLat = (coords.lat - lat1) * (Math.PI / 180)
        const dLng = (coords.lng - lng1) * (Math.PI / 180)
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(lat1 * (Math.PI / 180)) * Math.cos(coords.lat * (Math.PI / 180)) *
          Math.sin(dLng / 2) ** 2
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        setDistanciaKm(R * c)
      }
    } catch {
      // silencioso
    }
    setCalculandoDistancia(false)
  }

  function calcularValorTransporteFinal(): number {
    if (!precisaTransporte || distanciaKm === null) return 0

    const faixaCorrespondente = faixasTransporte.find(
      f => distanciaKm >= f.raio_min_km && distanciaKm <= f.raio_max_km
    )

    let bruto: number
    if (faixaCorrespondente) {
      bruto = faixaCorrespondente.valor_fixo * (transporteIdaVolta ? 2 : 1)
    } else if (tenantTransporte?.preco_por_km) {
      const valorPorTrecho = Math.max(distanciaKm * Number(tenantTransporte.preco_por_km), Number(tenantTransporte.valor_minimo_transporte || 0))
      bruto = valorPorTrecho * (transporteIdaVolta ? 2 : 1)
    } else {
      return 0
    }

    const desconto = parseFloat(descontoTransporte) || 0
    return Math.max(bruto - desconto, 0)
  }
  
  function abrirModalTosa(tosaTipoId: string | null) {
    if (!tosaTipoId) return
    const tipo = tiposTosa.find(t => t.id === tosaTipoId)
    if (!tipo) return
    setModalTosa({ titulo: tipo.nome, texto: tipo.descricao })
  }

  const temItemDoGrupoRaca = (grupo: 'principal' | 'combo') =>
    (racaSelecionadaCatalogo?.itens || []).some(i => i.grupo === grupo && itensRacaSelecionados.has(i.id))

  function toggleItemRaca(item: RacaItem) {
    const jaMarcado = itensRacaSelecionados.has(item.id)
    const novo = new Set(itensRacaSelecionados)

    if (jaMarcado) {
      novo.delete(item.id)
    } else {
      if (item.grupo === 'principal' && temItemDoGrupoRaca('combo')) {
        alert('Ja existe um Combo selecionado. Remova-o para escolher um servico avulso.')
        return
      }
      if (item.grupo === 'combo' && temItemDoGrupoRaca('principal')) {
        alert('Ja existe um servico de Banho e Tosa selecionado. Remova-o para escolher um Combo.')
        return
      }
            novo.add(item.id)
      if (item.grupo === 'combo') {
        setModalCombo({ titulo: item.nome, itens: item.inclui || [] })
      } else {
        abrirModalTosa(item.tosa_tipo)
      }
    }
    setItensRacaSelecionados(novo)
  }

  const bloqueioRaca = {
    principal: temItemDoGrupoRaca('combo'),
    combo: temItemDoGrupoRaca('principal'),
  }

  const resumoRaca = useMemo(() => {
    const selecionados = (racaSelecionadaCatalogo?.itens || []).filter(i => itensRacaSelecionados.has(i.id))
    const total = selecionados.reduce((acc, i) => acc + Number(i.preco), 0)
    const duracao = selecionados.reduce((acc, i) => acc + (i.duracao_min || 20), 0)
    return { selecionados, total, duracao }
  }, [racaSelecionadaCatalogo, itensRacaSelecionados])

  const itemValidoParaPelagem = (item: PorteItem) =>
    !item.pelagens || item.pelagens.length === 0 || item.pelagens.includes(pelagemPet)

  const itensPorteDisponiveis = useMemo(() => {
    return porteItens.filter(item => {
      const precoParaPorte = item.precos.find(p => p.porte === portePet)
      return precoParaPorte !== undefined && itemValidoParaPelagem(item)
    })
  }, [porteItens, portePet, pelagemPet])

  const temItemDoGrupoPorte = (grupo: 'principal' | 'combo') =>
    itensPorteDisponiveis.some(i => i.grupo === grupo && itensPorteSelecionados.has(i.id))

  function toggleItemPorte(item: PorteItem) {
    const jaMarcado = itensPorteSelecionados.has(item.id)
    const novo = new Set(itensPorteSelecionados)

    if (jaMarcado) {
      novo.delete(item.id)
    } else {
      if (item.grupo === 'principal' && temItemDoGrupoPorte('combo')) {
        alert('Ja existe um Combo selecionado. Remova-o para escolher um servico avulso.')
        return
      }
      if (item.grupo === 'combo' && temItemDoGrupoPorte('principal')) {
        alert('Ja existe um servico de Banho e Tosa selecionado. Remova-o para escolher um Combo.')
        return
      }
            novo.add(item.id)
      if (item.grupo === 'combo') {
        setModalCombo({ titulo: item.nome, itens: item.inclui || [] })
      } else {
        abrirModalTosa(item.tosa_tipo)
      }
    }
    setItensPorteSelecionados(novo)
  }

  const bloqueioPorte = {
    principal: temItemDoGrupoPorte('combo'),
    combo: temItemDoGrupoPorte('principal'),
  }

  const resumoPorte = useMemo(() => {
    const selecionados = itensPorteDisponiveis.filter(i => itensPorteSelecionados.has(i.id))
    const total = selecionados.reduce((acc, i) => {
      const precoItem = i.precos.find(p => p.porte === portePet)
      return acc + Number(precoItem?.preco || 0)
    }, 0)
    const duracao = selecionados.reduce((acc, i) => acc + (i.duracao_min || 20), 0)
    return { selecionados, total, duracao }
  }, [itensPorteDisponiveis, itensPorteSelecionados, portePet])

  const resumoFinal = usarFluxoRaca ? resumoRaca : resumoPorte
  const primeiroItemPrincipal = resumoFinal.selecionados.find(i => i.grupo === 'principal') || resumoFinal.selecionados[0]
  
  async function buscarHorarios(dataEscolhida: string, duracaoTotal: number) {
    if (!tenantId) return
    setCarregandoHorarios(true)
    setHorario('')

    const dataObj = new Date(dataEscolhida + 'T00:00:00')
    const diaSemana = dataObj.getDay()

    const profissionaisParaChecar = profissionalId
      ? profissionais.filter(p => p.id === profissionalId)
      : profissionais

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
        duracaoTotal || 60
      )

      const { data: agendamentosExistentes } = await supabase
        .from('appointments')
        .select('inicio')
        .eq('professional_id', prof.id)
        .gte('inicio', dataEscolhida + 'T00:00:00')
        .lte('inicio', dataEscolhida + 'T23:59:59')
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

  function selecionarData(dataEscolhida: string) {
    setData(dataEscolhida)
    buscarHorarios(dataEscolhida, resumoFinal.duracao || 60)
  }
  
  async function salvarAgendamento() {
    setErro('')

    const precisaNomePet = !petSelecionado
    if (!telefone || !nomeCliente || (precisaNomePet && !nomePetNovo)) {
      setErro('Preencha telefone, nome do cliente e nome do pet.')
      return
    }

    if (!data || !horario) {
      setErro('Escolha data e horario.')
      return
    }

    if (resumoFinal.selecionados.length === 0 || !primeiroItemPrincipal) {
      setErro('Selecione ao menos um servico.')
      return
    }

    if (precisaTransporte && (!ruaColeta || !numeroColeta || !cidadeColeta || !ufColeta)) {
      setErro('Preencha rua, numero, cidade e UF do endereco de coleta.')
      return
    }

    if (!tenantId) {
      setErro('Tenant nao encontrado.')
      return
    }

    setSalvando(true)

    let clienteId = clienteEncontrado?.id

    if (!clienteId) {
      const { data: novoCliente, error: erroCliente } = await supabase
        .from('customers')
        .insert({ tenant_id: tenantId, nome: nomeCliente, telefone })
        .select('id')
        .single()

      if (erroCliente || !novoCliente) {
        setErro('Erro ao cadastrar cliente: ' + erroCliente?.message)
        setSalvando(false)
        return
      }
      clienteId = novoCliente.id
    }

    let petId = petSelecionado

    if (!petId) {
      const { data: novoPet, error: erroPet } = await supabase
        .from('pets')
        .insert({
          tenant_id: tenantId,
          customer_id: clienteId,
          nome: nomePetNovo,
          porte: portePet,
          pelagem: pelagemPet,
          raca: usarFluxoRaca ? racaSelecionadaCatalogo?.nome : null,
        })
        .select('id')
        .single()

      if (erroPet || !novoPet) {
        setErro('Erro ao cadastrar pet: ' + erroPet?.message)
        setSalvando(false)
        return
      }
      petId = novoPet.id
    }

    const servico = { duracao_min: resumoFinal.duracao || 60 }
    const inicio = new Date(`${data}T${horario}:00`)
    const fim = new Date(inicio.getTime() + servico.duracao_min * 60000)

    let profId = profissionalId
    if (!profId) {
      const diaSemana = inicio.getDay()
      for (const prof of profissionais) {
        const { data: disp } = await supabase
          .from('professional_availability')
          .select('id')
          .eq('professional_id', prof.id)
          .eq('dia_semana', diaSemana)
          .maybeSingle()
        if (disp) { profId = prof.id; break }
      }
    }

    const nomesServicos = resumoFinal.selecionados.map(i => i.nome).join(' + ')
    const enderecoColetaFinal = precisaTransporte
      ? `${ruaColeta}, ${numeroColeta}${bairroColeta ? ', ' + bairroColeta : ''}, ${cidadeColeta} - ${ufColeta}`
      : ''
    const valorTransporte = calcularValorTransporteFinal()

    const { error: erroAgendamento } = await supabase.from('appointments').insert({
      tenant_id: tenantId,
      customer_id: clienteId,
      pet_id: petId,
      professional_id: profId || null,
      service_id: primeiroItemPrincipal.id,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      status: 'agendado',
      origem: 'telefone',
      preco_cobrado: resumoFinal.total,
      observacoes: nomesServicos,
      precisa_transporte: precisaTransporte,
      endereco_coleta: precisaTransporte ? enderecoColetaFinal : null,
      endereco_entrega: precisaTransporte ? enderecoColetaFinal : null,
      distancia_km: precisaTransporte ? distanciaKm : null,
      transporte_ida_volta: precisaTransporte ? transporteIdaVolta : false,
      valor_transporte: valorTransporte,
      desconto_transporte: precisaTransporte ? (parseFloat(descontoTransporte) || 0) : 0,
    })

    if (erroAgendamento) {
      setErro('Erro ao criar agendamento: ' + erroAgendamento.message)
      setSalvando(false)
      return
    }

    setSalvando(false)
    setSucesso(true)
  }
  
  if (carregando) return <p className="text-sm text-gray-400">Carregando...</p>

  if (sucesso) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center max-w-md">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-green-600 text-xl">✓</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Agendamento criado!</h2>
        <button
          onClick={() => router.push('/dashboard/agenda')}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Ver agenda
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Novo agendamento</h2>
      <p className="text-sm text-gray-500 mb-6">Criado a partir do catalogo digital</p>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4">
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Telefone do cliente</label>
          <input
            type="text"
            value={telefone}
            onChange={e => {
              setTelefone(e.target.value)
              buscarClientePorTelefone(e.target.value)
            }}
            placeholder="(35) 99999-9999"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {buscandoCliente && <p className="text-xs text-gray-400 mt-1">Verificando...</p>}

          {sugestoes.length > 0 && !clienteEncontrado && (
            <div className="border border-gray-200 rounded-lg mt-1 overflow-hidden">
              {sugestoes.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selecionarCliente(c)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  {c.nome} • {c.telefone}
                </button>
              ))}
            </div>
          )}

          {clienteEncontrado && (
            <p className="text-xs text-green-600 mt-1">
              Cliente encontrado: {clienteEncontrado.nome} 🐾{' '}
              <button
                type="button"
                onClick={() => { setClienteEncontrado(null); setNomeCliente(''); setPetSelecionado('') }}
                className="underline"
              >
                trocar
              </button>
            </p>
          )}
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">Nome do cliente</label>
          <input
            type="text"
            value={nomeCliente}
            onChange={e => setNomeCliente(e.target.value)}
            disabled={!!clienteEncontrado}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>
        
        {clienteEncontrado && clienteEncontrado.pets.length > 0 && (
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Pet</label>
            <select
              value={petSelecionado}
              onChange={e => selecionarPetExistente(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Cadastrar novo pet</option>
              {clienteEncontrado.pets.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
        )}

        {!petSelecionado && (
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Nome do pet</label>
            <input
              type="text"
              value={nomePetNovo}
              onChange={e => setNomePetNovo(e.target.value)}
              placeholder="Rex"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

                {petSelecionado ? (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600 font-medium mb-1">Porte e pelagem do pet</p>
            <p className="text-sm text-blue-800">
              {PORTES.find(p => p.id === portePet)?.label} • {pelagemPet === 'curta' ? 'Pelagem curta' : 'Pelagem longa'}
            </p>
          </div>
        ) : (
          <div className="flex gap-3 bg-blue-50 rounded-lg p-3">
            <div className="flex-1">
              <label className="text-sm text-gray-700 mb-1 block font-medium">Porte</label>
              <select
                value={portePet}
                onChange={e => setPortePet(e.target.value as PorteId)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PORTES.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-700 mb-1 block font-medium">Pelagem</label>
              <select
                value={pelagemPet}
                onChange={e => setPelagemPet(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="curta">Curta</option>
                <option value="longa">Longa</option>
              </select>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mt-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Servicos</h3>

        {usarFluxoRaca === null && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setUsarFluxoRaca(true)}
              className="border border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 transition-colors"
            >
              <div className="text-xl mb-1">🐾</div>
              <p className="text-xs font-medium text-gray-900">Raca definida</p>
            </button>
            <button
              onClick={() => setUsarFluxoRaca(false)}
              className="border border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 transition-colors"
            >
              <div className="text-xl mb-1">📏</div>
              <p className="text-xs font-medium text-gray-900">Porte / SRD</p>
            </button>
          </div>
        )}

        {usarFluxoRaca === true && !racaSelecionadaCatalogo && (
          <div>
            <button onClick={() => setUsarFluxoRaca(null)} className="text-xs text-blue-600 mb-3 hover:underline block">
              ← Trocar opcao
            </button>
            <input
              type="text"
              value={buscaRaca}
              onChange={e => setBuscaRaca(e.target.value)}
              placeholder="Buscar raca..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
              {racas
                .filter(r => r.nome.toLowerCase().includes(buscaRaca.toLowerCase()))
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                .map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setRacaSelecionadaCatalogo(r); setBuscaRaca('') }}
                    className="border border-gray-100 rounded-lg px-3 py-2 text-left hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm"
                  >
                    {r.nome}
                  </button>
                ))}
            </div>
          </div>
        )}

        {usarFluxoRaca === true && racaSelecionadaCatalogo && (
          <div>
            <button onClick={() => setRacaSelecionadaCatalogo(null)} className="text-xs text-blue-600 mb-3 hover:underline block">
              ← Trocar raca ({racaSelecionadaCatalogo.nome})
            </button>
            {(['principal', 'adicional', 'combo'] as const).map(grupo => {
              const itens = racaSelecionadaCatalogo.itens.filter(i => i.grupo === grupo)
              if (itens.length === 0) return null
              const titulo = grupo === 'principal' ? 'Banho e Tosa' : grupo === 'adicional' ? 'Adicionais' : 'Combos'
              return (
                <div key={grupo} className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">{titulo}</p>
                  <div className="flex flex-col gap-1.5">
                    {itens.map(item => {
                      const checked = itensRacaSelecionados.has(item.id)
                      const disabled = (grupo === 'principal' && bloqueioRaca.principal && !checked) || (grupo === 'combo' && bloqueioRaca.combo && !checked)
                      return (
                        <label key={item.id} className={`flex items-center justify-between gap-2 border rounded-lg px-3 py-2 ${checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} ${disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}>
                          <span className="flex items-center gap-2">
                            <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleItemRaca(item)} className="w-4 h-4" />
                            <span className="text-sm text-gray-900">{item.nome}</span>
                          </span>
                          <span className="text-sm font-medium text-blue-600">{fmtMoeda(Number(item.preco))}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {usarFluxoRaca === false && (
          <div>
            <button onClick={() => setUsarFluxoRaca(null)} className="text-xs text-blue-600 mb-3 hover:underline block">
              ← Trocar opcao
            </button>
            {(['principal', 'adicional', 'combo'] as const).map(grupo => {
              const itens = itensPorteDisponiveis.filter(i => i.grupo === grupo)
              if (itens.length === 0) return null
              const titulo = grupo === 'principal' ? 'Banho e Tosa' : grupo === 'adicional' ? 'Adicionais' : 'Combos'
              return (
                <div key={grupo} className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">{titulo}</p>
                  <div className="flex flex-col gap-1.5">
                    {itens.map(item => {
                      const checked = itensPorteSelecionados.has(item.id)
                      const disabled = (grupo === 'principal' && bloqueioPorte.principal && !checked) || (grupo === 'combo' && bloqueioPorte.combo && !checked)
                      const precoItem = item.precos.find(p => p.porte === portePet)
                      return (
                        <label key={item.id} className={`flex items-center justify-between gap-2 border rounded-lg px-3 py-2 ${checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} ${disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}>
                          <span className="flex items-center gap-2">
                            <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleItemPorte(item)} className="w-4 h-4" />
                            <span className="text-sm text-gray-900">{item.nome}</span>
                          </span>
                          <span className="text-sm font-medium text-blue-600">{fmtMoeda(Number(precoItem?.preco || 0))}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {itensPorteDisponiveis.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">Nenhum servico disponivel para esse porte/pelagem.</p>
            )}
          </div>
        )}

        {resumoFinal.selecionados.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-2.5 mt-3">
            <p className="text-xs text-blue-700">{resumoFinal.selecionados.length} selecionado(s)</p>
            <p className="text-sm font-medium text-blue-700">{fmtMoeda(resumoFinal.total)}</p>
          </div>
        )}
      </div>
      
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mt-4 flex flex-col gap-4">
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Profissional</label>
          <select
            value={profissionalId}
            onChange={e => setProfissionalId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Qualquer profissional disponivel</option>
            {profissionais.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">Data</label>
          <input
            type="date"
            value={data}
            onChange={e => selecionarData(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {data && resumoFinal.selecionados.length > 0 && (
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Horario</label>
            {carregandoHorarios ? (
              <p className="text-xs text-gray-400">Buscando horarios...</p>
            ) : horariosDisponiveis.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum horario disponivel.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {horariosDisponiveis.map(h => (
                  <button
                    key={h}
                    onClick={() => setHorario(h)}
                    className={`text-sm py-2 rounded-lg border transition-colors ${
                      horario === h ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mt-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={precisaTransporte}
            onChange={e => setPrecisaTransporte(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-700">Precisa de transporte</span>
        </label>

        {precisaTransporte && (
          <div className="flex flex-col gap-3 mt-3">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">CEP</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cepColeta}
                  onChange={e => setCepColeta(e.target.value)}
                  onBlur={e => buscarCep(e.target.value)}
                  placeholder="37700-000"
                  maxLength={9}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {buscandoCep && <span className="text-xs text-gray-400 self-center">Buscando...</span>}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Rua *</label>
              <input
                type="text"
                value={ruaColeta}
                onChange={e => setRuaColeta(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <div className="w-24">
                <label className="text-sm text-gray-600 mb-1 block">Numero *</label>
                <input
                  type="text"
                  value={numeroColeta}
                  onChange={e => setNumeroColeta(e.target.value)}
                  onBlur={calcularValorTransporteEstruturado}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-gray-600 mb-1 block">Bairro</label>
                <input
                  type="text"
                  value={bairroColeta}
                  onChange={e => setBairroColeta(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm text-gray-600 mb-1 block">Cidade *</label>
                <input
                  type="text"
                  value={cidadeColeta}
                  onChange={e => setCidadeColeta(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="w-20">
                <label className="text-sm text-gray-600 mb-1 block">UF *</label>
                <input
                  type="text"
                  value={ufColeta}
                  onChange={e => setUfColeta(e.target.value.toUpperCase())}
                  maxLength={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={transporteIdaVolta}
                onChange={e => setTransporteIdaVolta(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-xs text-gray-600">Ida e volta</span>
            </label>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Desconto no transporte (R$)</label>
              <input
                type="number"
                value={descontoTransporte}
                onChange={e => setDescontoTransporte(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {calculandoDistancia && <p className="text-xs text-gray-400">Calculando distancia...</p>}

            {distanciaKm !== null && (
              <div className="bg-blue-50 rounded-lg p-2.5">
                <p className="text-xs text-blue-700">
                  Distancia: {distanciaKm.toFixed(1)} km {transporteIdaVolta ? '(ida e volta)' : '(somente ida)'}
                </p>
                <p className="text-sm font-medium text-blue-700 mt-0.5">
                  Valor do transporte: {fmtMoeda(calcularValorTransporteFinal())}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {erro && <p className="text-red-500 text-sm mt-3">{erro}</p>}

      <button
        onClick={salvarAgendamento}
        disabled={salvando}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50 mt-4"
      >
        {salvando ? 'Salvando...' : 'Criar agendamento'}
      </button>

            {modalTosa && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-5 z-50"
          onClick={e => e.target === e.currentTarget && setModalTosa(null)}
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="font-bold text-base mb-2 flex items-center gap-2">✂️ {modalTosa.titulo}</div>
            <p className="text-sm text-gray-500 leading-relaxed mb-5">{modalTosa.texto}</p>
            <button
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700"
              onClick={() => setModalTosa(null)}
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {modalCombo && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-5 z-50"
          onClick={e => e.target === e.currentTarget && setModalCombo(null)}
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="font-bold text-base mb-3 flex items-center gap-2">🎁 {modalCombo.titulo}</div>
            <p className="text-xs text-gray-400 mb-2 uppercase font-medium">Este combo inclui:</p>
            {modalCombo.itens.length === 0 ? (
              <p className="text-sm text-gray-500 mb-5">Combo com desconto especial.</p>
            ) : (
              <ul className="flex flex-col gap-1.5 mb-5">
                {modalCombo.itens.map((item, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-green-600 flex-shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            )}
            <button
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700"
              onClick={() => setModalCombo(null)}
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  )
}