'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Tenant = {
  id: string
  nome: string
  slug: string
  logo_url: string | null
  cor_primaria: string
  endereco_lat: number | null
  endereco_lng: number | null
  preco_por_km: number | null
  valor_minimo_transporte: number | null
}

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
  destaque: boolean
  imagem_url: string | null
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
  imagem_url: string | null
  pelagens: string[] | null
  duracao_min: number | null
  precos: Partial<Record<PorteId, number | null>>
}

type TipoTosa = {
  id: string
  nome: string
  descricao: string
}

type Profissional = {
  id: string
  nome: string
  cor_agenda: string
}

const RACAS_CACHORRO = [
  'SRD (Sem Raca Definida)', 'Labrador', 'Golden Retriever', 'Poodle', 'Bulldog Frances',
  'Pastor Alemao', 'Shih Tzu', 'Yorkshire', 'Pinscher', 'Chihuahua', 'Lhasa Apso',
  'Maltes', 'Beagle', 'Rottweiler', 'Border Collie', 'Spitz Alemao (Lulu da Pomerania)',
  'Dachshund (Salsicha)', 'Boxer', 'Pug', 'Cocker Spaniel', 'Schnauzer', 'Basset Hound',
  'Husky Siberiano', 'Akita', 'Doberman', 'Fox Paulistinha', 'Outra',
]

const RACAS_GATO = [
  'SRD (Sem Raca Definida)', 'Persa', 'Siames', 'Maine Coon', 'Angora', 'Sphynx',
  'Bengal', 'Ragdoll', 'Munchkin', 'Outra',
]

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

function formatarDataISO(data: Date): string {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function fmtMoeda(v: number): string {
  return `R$ ${v.toFixed(2).replace('.', ',')}`
}
export default function AgendarPage() {
  const params = useParams()
  const slug = params.slug as string
  const supabase = createClient()

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [racas, setRacas] = useState<Raca[]>([])
  const [porteItens, setPorteItens] = useState<PorteItem[]>([])
  const [tiposTosa, setTiposTosa] = useState<TipoTosa[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [carregando, setCarregando] = useState(true)
  const [naoEncontrado, setNaoEncontrado] = useState(false)

  const [etapa, setEtapa] = useState(1)
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<Profissional | null>(null)
  const [dataSelecionada, setDataSelecionada] = useState<string>('')
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([])
  const [horarioSelecionado, setHorarioSelecionado] = useState<string>('')
  const [carregandoHorarios, setCarregandoHorarios] = useState(false)
  const [nomeCliente, setNomeCliente] = useState('')
  const [telefoneCliente, setTelefoneCliente] = useState('')
  const [nomePet, setNomePet] = useState('')
  const [portePet, setPortePet] = useState<PorteId>('medio')
  const [especiePet, setEspeciePet] = useState('cachorro')
  const [racaPet, setRacaPet] = useState('')
  const [sexoPet, setSexoPet] = useState('macho')
  const [pelagemPet, setPelagemPet] = useState('curta')
  const [castradoPet, setCastradoPet] = useState(false)
  const [dataNascimentoPet, setDataNascimentoPet] = useState('')
  const [dataVacinaPet, setDataVacinaPet] = useState('')
  const [dataVermifugoPet, setDataVermifugoPet] = useState('')
  const [dataAntipulgasPet, setDataAntipulgasPet] = useState('')
  const [salvandoAgendamento, setSalvandoAgendamento] = useState(false)
  const [erroAgendamento, setErroAgendamento] = useState('')
  const [clienteExistente, setClienteExistente] = useState<any>(null)
  const [sugestoesClientes, setSugestoesClientes] = useState<any[]>([])
  const [petsDoCliente, setPetsDoCliente] = useState<any[]>([])
  const [petsExistentesSelecionados, setPetsExistentesSelecionados] = useState<string[]>([])
  const [quererCadastrarNovoPet, setQuererCadastrarNovoPet] = useState(false)
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const [mostrarMaisInfo, setMostrarMaisInfo] = useState(false)
  const [agendamentoConfirmado, setAgendamentoConfirmado] = useState(false)
  const [precisaTransporte, setPrecisaTransporte] = useState(false)
  const [enderecoColeta, setEnderecoColeta] = useState('')
  const [enderecoEntrega, setEnderecoEntrega] = useState('')
  const [ehRecorrente, setEhRecorrente] = useState(false)
  const [frequenciaMensal, setFrequenciaMensal] = useState(1)
  const [mesmoEndereco, setMesmoEndereco] = useState(true)
  const [cepColeta, setCepColeta] = useState('')
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [transporteIdaVolta, setTransporteIdaVolta] = useState(false)
  const [distanciaKm, setDistanciaKm] = useState<number | null>(null)
  const [calculandoDistancia, setCalculandoDistancia] = useState(false)

  // --- catalogo: selecao de servicos ---
  const [racaSelecionadaCatalogo, setRacaSelecionadaCatalogo] = useState<Raca | null>(null)
  const [usarFluxoRaca, setUsarFluxoRaca] = useState<boolean | null>(null)
  const [itensRacaSelecionados, setItensRacaSelecionados] = useState<Set<string>>(new Set())
  const [itensPorteSelecionados, setItensPorteSelecionados] = useState<Set<string>>(new Set())
  const [modalTosa, setModalTosa] = useState<{ titulo: string; texto: string } | null>(null)
  const [buscaRaca, setBuscaRaca] = useState('')
  useEffect(() => {
    async function carregar() {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id, nome, slug, logo_url, cor_primaria, endereco_lat, endereco_lng, preco_por_km, valor_minimo_transporte')
        .eq('slug', slug)
        .single()

      if (!tenantData) {
        setNaoEncontrado(true)
        setCarregando(false)
        return
      }

      setTenant(tenantData)

      const { data: racasData } = await supabase
        .from('catalogo_racas')
        .select('id, nome, imagem_url')
        .eq('tenant_id', tenantData.id)
        .order('nome')

      const racaIds = (racasData || []).map((r: any) => r.id)
      let racaItensData: any[] = []
      if (racaIds.length > 0) {
        const { data } = await supabase
          .from('catalogo_raca_itens')
          .select('id, raca_id, grupo, nome, descricao, preco, tosa_tipo, inclui, destaque, imagem_url, duracao_min')
          .in('raca_id', racaIds)
        racaItensData = data || []
      }

      const racasMontadas: Raca[] = (racasData || []).map((r: any) => ({
        ...r,
        itens: racaItensData.filter(i => i.raca_id === r.id),
      }))

      const { data: porteItensData } = await supabase
        .from('catalogo_porte_itens')
        .select('id, grupo, nome, descricao, tosa_tipo, inclui, imagem_url, pelagens, duracao_min')
        .eq('tenant_id', tenantData.id)
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

      const porteItensMontados: PorteItem[] = (porteItensData || []).map((i: any) => {
        const precos: Partial<Record<PorteId, number | null>> = {}
        precosData.filter(p => p.item_id === i.id).forEach(p => { precos[p.porte as PorteId] = p.preco })
        return { ...i, precos }
      })

      const { data: tiposTosaData } = await supabase
        .from('catalogo_tosa_tipos')
        .select('id, nome, descricao')
        .eq('tenant_id', tenantData.id)

      const { data: profissionaisData } = await supabase
        .from('professionals')
        .select('id, nome, cor_agenda')
        .eq('tenant_id', tenantData.id)
        .eq('ativo', true)
        .order('nome')

      setRacas(racasMontadas)
      setPorteItens(porteItensMontados)
      setTiposTosa(tiposTosaData || [])
      setProfissionais(profissionaisData || [])
      setCarregando(false)
    }

    carregar()
  }, [slug])
  async function buscarCep(cep: string) {
    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return

    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const data = await res.json()

      if (!data.erro) {
        const enderecoCompleto = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`
        setEnderecoColeta(enderecoCompleto)
        if (mesmoEndereco) {
          setEnderecoEntrega(enderecoCompleto)
        }
        await calcularValorTransporte(enderecoCompleto)
      }
    } catch {
      // silencioso
    }
    setBuscandoCep(false)
  }

  async function calcularValorTransporte(endereco: string) {
    if (!tenant || !(tenant as any).endereco_lat || !(tenant as any).preco_por_km) return

    setCalculandoDistancia(true)
    try {
      const res = await fetch(`/api/geocodificar?endereco=${encodeURIComponent(endereco)}`)
      const coords = await res.json()

      if (coords.lat) {
        const R = 6371
        const lat1 = (tenant as any).endereco_lat
        const lng1 = (tenant as any).endereco_lng
        const dLat = (coords.lat - lat1) * (Math.PI / 180)
        const dLng = (coords.lng - lng1) * (Math.PI / 180)
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(lat1 * (Math.PI / 180)) * Math.cos(coords.lat * (Math.PI / 180)) *
          Math.sin(dLng / 2) ** 2
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const distancia = R * c

        setDistanciaKm(distancia)
      }
    } catch {
      // silencioso
    }
    setCalculandoDistancia(false)
  }

  async function buscarClientePorTelefone(telefoneDigitado: string) {
    setClienteExistente(null)
    setPetsDoCliente([])

    if (!tenant || telefoneDigitado.replace(/\D/g, '').length < 4) {
      setSugestoesClientes([])
      return
    }

    setBuscandoCliente(true)

    const { data: clientes } = await supabase
      .from('customers')
      .select('id, nome, telefone, pets ( id, nome, especie, porte, raca )')
      .eq('tenant_id', tenant.id)
      .ilike('telefone', `%${telefoneDigitado.replace(/\D/g, '')}%`)
      .limit(6)

    setSugestoesClientes(clientes || [])
    setBuscandoCliente(false)
  }

  function selecionarClienteExistente(cliente: any) {
    setClienteExistente(cliente)
    setNomeCliente(cliente.nome)
    setTelefoneCliente(cliente.telefone)
    setPetsDoCliente(cliente.pets || [])
    setSugestoesClientes([])
  }

  function selecionarPetExistente(petId: string, marcado: boolean) {
    if (marcado) {
      setPetsExistentesSelecionados(prev => [...prev, petId])
    } else {
      setPetsExistentesSelecionados(prev => prev.filter(id => id !== petId))
      return
    }

    const pet = petsDoCliente.find(p => p.id === petId)
    if (!pet) return

    if (pet.porte) setPortePet(pet.porte)

    const racaCatalogo = racas.find(r => r.nome.toLowerCase() === (pet.raca || '').toLowerCase())
    if (racaCatalogo) {
      setUsarFluxoRaca(true)
      setRacaSelecionadaCatalogo(racaCatalogo)
    }
  }
  async function buscarHorarios(data: string, duracaoTotal: number) {
    if (!tenant) return
    setCarregandoHorarios(true)
    setHorarioSelecionado('')

    const dataObj = new Date(data + 'T00:00:00')
    const diaSemana = dataObj.getDay()

    const profissionaisParaChecar = profissionalSelecionado
      ? [profissionalSelecionado]
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

  // --- logica do catalogo (raca) ---
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
        alert('Voce ja selecionou um Combo. Remova o combo para escolher um servico avulso.')
        return
      }
      if (item.grupo === 'combo' && temItemDoGrupoRaca('principal')) {
        alert('Voce ja selecionou um servico de Banho e Tosa. Remova-o para escolher um Combo.')
        return
      }
      novo.add(item.id)
      abrirModalTosa(item.tosa_tipo)
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
  // --- logica do catalogo (porte) ---
  const itemValidoParaPelagem = (item: PorteItem) =>
    !item.pelagens || item.pelagens.length === 0 || item.pelagens.includes(pelagemPet)

  const itensPorteDisponiveis = useMemo(() => {
    return porteItens.filter(item => item.precos[portePet] !== undefined && item.precos[portePet] !== null && itemValidoParaPelagem(item))
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
        alert('Voce ja selecionou um Combo. Remova o combo para escolher um servico avulso.')
        return
      }
      if (item.grupo === 'combo' && temItemDoGrupoPorte('principal')) {
        alert('Voce ja selecionou um servico de Banho e Tosa. Remova-o para escolher um Combo.')
        return
      }
      novo.add(item.id)
      abrirModalTosa(item.tosa_tipo)
    }
    setItensPorteSelecionados(novo)
  }

  const bloqueioPorte = {
    principal: temItemDoGrupoPorte('combo'),
    combo: temItemDoGrupoPorte('principal'),
  }

  const resumoPorte = useMemo(() => {
    const selecionados = itensPorteDisponiveis.filter(i => itensPorteSelecionados.has(i.id))
    const total = selecionados.reduce((acc, i) => acc + Number(i.precos[portePet] || 0), 0)
    const duracao = selecionados.reduce((acc, i) => acc + (i.duracao_min || 20), 0)
    return { selecionados, total, duracao }
  }, [itensPorteDisponiveis, itensPorteSelecionados, portePet])

  // --- resumo final, independente do fluxo escolhido ---
  const resumoFinal = usarFluxoRaca ? resumoRaca : resumoPorte
  const primeiroItemPrincipal = resumoFinal.selecionados.find(i => i.grupo === 'principal') || resumoFinal.selecionados[0]

  function selecionarData(data: string) {
    setDataSelecionada(data)
    buscarHorarios(data, resumoFinal.duracao || 60)
  }

  function calcularValorTransporteFinal(): number {
    if (!precisaTransporte || distanciaKm === null || !tenant?.preco_por_km) return 0
    const valorPorTrecho = Math.max(distanciaKm * Number(tenant.preco_por_km), Number(tenant.valor_minimo_transporte || 0))
    return valorPorTrecho * (transporteIdaVolta ? 2 : 1)
  }
  async function confirmarAgendamento() {
    setErroAgendamento('')

    const precisaNomePet = quererCadastrarNovoPet || petsDoCliente.length === 0

    if (!nomeCliente || !telefoneCliente || (precisaNomePet && !nomePet)) {
      setErroAgendamento('Preencha todos os campos obrigatorios.')
      return
    }

    if (!tenant || resumoFinal.selecionados.length === 0 || !primeiroItemPrincipal) {
      setErroAgendamento('Selecione ao menos um servico.')
      return
    }

    setSalvandoAgendamento(true)

    let profissionalId = profissionalSelecionado?.id

    if (!profissionalId) {
      const dataObj = new Date(dataSelecionada + 'T00:00:00')
      const diaSemana = dataObj.getDay()

      for (const prof of profissionais) {
        const { data: disponibilidade } = await supabase
          .from('professional_availability')
          .select('hora_inicio, hora_fim')
          .eq('professional_id', prof.id)
          .eq('dia_semana', diaSemana)
          .maybeSingle()

        if (disponibilidade) {
          profissionalId = prof.id
          break
        }
      }
    }

    if (!profissionalId) {
      setErroAgendamento('Nenhum profissional disponivel para essa data.')
      setSalvandoAgendamento(false)
      return
    }

    const { data: clienteExistenteQuery } = await supabase
      .from('customers')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('telefone', telefoneCliente)
      .maybeSingle()

    let clienteId = clienteExistenteQuery?.id

    if (!clienteId) {
      const { data: novoCliente, error: erroCliente } = await supabase
        .from('customers')
        .insert({
          tenant_id: tenant.id,
          nome: nomeCliente,
          telefone: telefoneCliente,
        })
        .select('id')
        .single()

      if (erroCliente || !novoCliente) {
        setErroAgendamento('Erro ao cadastrar cliente: ' + erroCliente?.message)
        setSalvandoAgendamento(false)
        return
      }

      clienteId = novoCliente.id
    }

    const idsDosPets: string[] = [...petsExistentesSelecionados]

    if (quererCadastrarNovoPet || petsDoCliente.length === 0) {
      const { data: novoPet, error: erroPet } = await supabase
        .from('pets')
        .insert({
          tenant_id: tenant.id,
          customer_id: clienteId,
          nome: nomePet,
          especie: especiePet,
          porte: portePet,
          raca: racaPet || (usarFluxoRaca ? racaSelecionadaCatalogo?.nome : null) || null,
          sexo: sexoPet,
          pelagem: pelagemPet,
          castrado: castradoPet,
          data_nascimento: dataNascimentoPet || null,
          data_ultima_vacina: dataVacinaPet || null,
          data_ultima_vermifugacao: dataVermifugoPet || null,
          data_ultimo_antipulgas: dataAntipulgasPet || null,
        })
        .select('id')
        .single()

      if (erroPet || !novoPet) {
        setErroAgendamento('Erro ao cadastrar pet: ' + erroPet?.message)
        setSalvandoAgendamento(false)
        return
      }

      idsDosPets.push(novoPet.id)
    }

    if (idsDosPets.length === 0) {
      setErroAgendamento('Selecione ao menos um pet.')
      setSalvandoAgendamento(false)
      return
    }

    const nomesServicos = resumoFinal.selecionados.map(i => i.nome).join(' + ')
    const duracaoMs = (resumoFinal.duracao || 60) * 60000
    const valorTransporte = calcularValorTransporteFinal()
    const agendamentosCriadosIds: string[] = []
    let erroCriacao = ''

    for (let i = 0; i < idsDosPets.length; i++) {
      const inicio = new Date(new Date(`${dataSelecionada}T${horarioSelecionado}:00`).getTime() + duracaoMs * i)
      const fim = new Date(inicio.getTime() + duracaoMs)

      const { data: agendamentoCriadoLoop, error: erroLoop } = await supabase
        .from('appointments')
        .insert({
          tenant_id: tenant.id,
          customer_id: clienteId,
          pet_id: idsDosPets[i],
          professional_id: profissionalId,
          service_id: primeiroItemPrincipal.id,
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
          status: 'em_espera',
          origem: 'online',
          preco_cobrado: resumoFinal.total,
          observacoes: nomesServicos,
          precisa_transporte: precisaTransporte,
          endereco_coleta: precisaTransporte ? enderecoColeta : null,
          endereco_entrega: precisaTransporte ? enderecoEntrega : null,
          is_recorrente: ehRecorrente,
          frequencia_mensal: ehRecorrente ? frequenciaMensal : null,
          distancia_km: precisaTransporte ? distanciaKm : null,
          transporte_ida_volta: precisaTransporte ? transporteIdaVolta : false,
          valor_transporte: valorTransporte,
        })
        .select('id')
        .single()

      if (erroLoop || !agendamentoCriadoLoop) {
        erroCriacao = erroLoop?.message || 'Erro desconhecido'
        break
      }

      agendamentosCriadosIds.push(agendamentoCriadoLoop.id)
    }

    const agendamentoCriado = agendamentosCriadosIds[0] ? { id: agendamentosCriadosIds[0] } : null

    if (erroCriacao || !agendamentoCriado) {
      setErroAgendamento('Erro ao criar agendamento: ' + erroCriacao)
      setSalvandoAgendamento(false)
      return
    }

    if (ehRecorrente) {
      const intervalosPorFrequencia: Record<number, number> = { 1: 30, 2: 14, 4: 7 }
      const intervaloDias = intervalosPorFrequencia[frequenciaMensal] || 30
      const futuros = []

      for (let i = 1; i <= 6; i++) {
        const inicioBase = new Date(`${dataSelecionada}T${horarioSelecionado}:00`)
        const proximoInicio = new Date(inicioBase.getTime() + intervaloDias * i * 24 * 60 * 60 * 1000)
        const proximoFim = new Date(proximoInicio.getTime() + duracaoMs)

        futuros.push({
          tenant_id: tenant.id,
          customer_id: clienteId,
          pet_id: idsDosPets[0],
          professional_id: profissionalId,
          service_id: primeiroItemPrincipal.id,
          inicio: proximoInicio.toISOString(),
          fim: proximoFim.toISOString(),
          status: 'em_espera',
          origem: 'online',
          preco_cobrado: resumoFinal.total,
          observacoes: nomesServicos,
          precisa_transporte: precisaTransporte,
          endereco_coleta: precisaTransporte ? enderecoColeta : null,
          endereco_entrega: precisaTransporte ? enderecoEntrega : null,
          is_recorrente: true,
          frequencia_mensal: frequenciaMensal,
          recorrencia_pai_id: agendamentoCriado.id,
        })
      }

      await supabase.from('appointments').insert(futuros)
    }

    fetch('/api/notificar/recebido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: tenant.id,
        telefone: telefoneCliente,
        nomePet,
        servico: nomesServicos,
        data: new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR'),
        horario: horarioSelecionado,
      }),
    }).catch(() => {})

    setSalvandoAgendamento(false)
    setAgendamentoConfirmado(true)
  }
  function irParaEtapaServicos() {
    setEtapa(2)
  }

  function selecionarRacaCatalogo(raca: Raca) {
    setRacaSelecionadaCatalogo(raca)
    setItensRacaSelecionados(new Set())
  }

  function selecionarProfissional(p: Profissional | null) {
    setProfissionalSelecionado(p)
    setEtapa(4)
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    )
  }

  if (naoEncontrado) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Pet shop nao encontrado.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 py-6 px-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {tenant?.logo_url && (
            <img src={tenant.logo_url} alt={tenant.nome} className="w-12 h-12 rounded-lg object-cover" />
          )}
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{tenant?.nome}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Agende seu horario online</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3, 4].map(n => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full ${
                n <= etapa ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {etapa === 1 && (
          <div>
            <h2 className="text-sm font-medium text-gray-900 mb-4">Seus dados</h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Seu telefone</label>
                <input
                  type="text"
                  value={telefoneCliente}
                  onChange={e => {
                    setTelefoneCliente(e.target.value)
                    buscarClientePorTelefone(e.target.value)
                  }}
                  placeholder="(35) 99999-9999"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {buscandoCliente && <p className="text-xs text-gray-400 mt-1">Verificando...</p>}

                {sugestoesClientes.length > 0 && !clienteExistente && (
                  <div className="border border-gray-200 rounded-lg mt-1 overflow-hidden">
                    {sugestoesClientes.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selecionarClienteExistente(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        {c.nome} • {c.telefone}
                      </button>
                    ))}
                  </div>
                )}

                {clienteExistente && (
                  <p className="text-xs text-green-600 mt-1">
                    Bem-vindo de volta, {clienteExistente.nome}! 🐾{' '}
                    <button
                      type="button"
                      onClick={() => { setClienteExistente(null); setNomeCliente(''); setPetsDoCliente([]) }}
                      className="underline"
                    >
                      trocar
                    </button>
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Seu nome</label>
                <input
                  type="text"
                  value={nomeCliente}
                  onChange={e => setNomeCliente(e.target.value)}
                  placeholder="Maria Silva"
                  disabled={!!clienteExistente}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
              {petsDoCliente.length > 0 && (
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Quais pets vao? (pode escolher mais de um)</label>
                  <div className="flex flex-col gap-2">
                    {petsDoCliente.map(p => (
                      <label key={p.id} className="flex items-center gap-2 border border-gray-200 rounded-lg p-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={petsExistentesSelecionados.includes(p.id)}
                          onChange={e => selecionarPetExistente(p.id, e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">{p.nome}</span>
                      </label>
                    ))}
                    <button
                      type="button"
                      onClick={() => setQuererCadastrarNovoPet(!quererCadastrarNovoPet)}
                      className="text-xs text-blue-600 hover:underline text-left mt-1"
                    >
                      {quererCadastrarNovoPet ? '- Cancelar novo pet' : '+ Cadastrar um pet novo'}
                    </button>
                  </div>
                </div>
              )}

              {(petsDoCliente.length === 0 || quererCadastrarNovoPet) && (
                <>
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">Nome do pet</label>
                    <input
                      type="text"
                      value={nomePet}
                      onChange={e => setNomePet(e.target.value)}
                      placeholder="Rex"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">Especie</label>
                    <select
                      value={especiePet}
                      onChange={e => setEspeciePet(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cachorro">Cachorro</option>
                      <option value="gato">Gato</option>
                      <option value="outro">Outro</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">A raca sera definida na proxima etapa</p>
                  </div>

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

                  <button
                    type="button"
                    onClick={() => setMostrarMaisInfo(!mostrarMaisInfo)}
                    className="text-xs text-blue-600 hover:underline text-left"
                  >
                    {mostrarMaisInfo ? '- Ocultar informacoes adicionais' : '+ Adicionar mais informacoes (opcional)'}
                  </button>

                  {mostrarMaisInfo && (
                    <>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-sm text-gray-600 mb-1 block">Sexo</label>
                          <select
                            value={sexoPet}
                            onChange={e => setSexoPet(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="macho">Macho</option>
                            <option value="femea">Femea</option>
                          </select>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer flex-1 mt-6">
                          <input
                            type="checkbox"
                            checked={castradoPet}
                            onChange={e => setCastradoPet(e.target.checked)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-gray-700">Castrado</span>
                        </label>
                      </div>

                      <div>
                        <label className="text-sm text-gray-600 mb-1 block">Data de nascimento</label>
                        <input
                          type="date"
                          value={dataNascimentoPet}
                          onChange={e => setDataNascimentoPet(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs font-medium text-gray-500 mb-3 uppercase">Saude</p>

                        <div className="flex flex-col gap-3">
                          <div>
                            <label className="text-sm text-gray-600 mb-1 block">Ultima vacina</label>
                            <input
                              type="date"
                              value={dataVacinaPet}
                              onChange={e => setDataVacinaPet(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="text-sm text-gray-600 mb-1 block">Ultima vermifugacao</label>
                            <input
                              type="date"
                              value={dataVermifugoPet}
                              onChange={e => setDataVermifugoPet(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="text-sm text-gray-600 mb-1 block">Ultimo antipulgas</label>
                            <input
                              type="date"
                              value={dataAntipulgasPet}
                              onChange={e => setDataAntipulgasPet(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              <button
                onClick={irParaEtapaServicos}
                disabled={!nomeCliente || !telefoneCliente || ((quererCadastrarNovoPet || petsDoCliente.length === 0) && !nomePet)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50 mt-2"
              >
                Continuar
              </button>
            </div>
          </div>
        )}
        {etapa === 2 && (
          <div>
            <button
              onClick={() => setEtapa(1)}
              className="text-xs text-blue-600 mb-4 hover:underline"
            >
              Voltar
            </button>

            {usarFluxoRaca === null && (
              <div>
                <h2 className="text-sm font-medium text-gray-900 mb-4">Como voce quer ver os servicos?</h2>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => setUsarFluxoRaca(true)}
                    className="bg-white border border-gray-100 rounded-xl p-5 text-center hover:border-blue-300 transition-colors"
                  >
                    <div className="text-2xl mb-1">🐾</div>
                    <p className="text-sm font-medium text-gray-900">Meu pet tem raca definida</p>
                  </button>
                  <button
                    onClick={() => setUsarFluxoRaca(false)}
                    className="bg-white border border-gray-100 rounded-xl p-5 text-center hover:border-blue-300 transition-colors"
                  >
                    <div className="text-2xl mb-1">📏</div>
                    <p className="text-sm font-medium text-gray-900">Nao sei a raca / SRD</p>
                    <p className="text-xs text-gray-400 mt-1">Ja usamos o porte e pelagem informados</p>
                  </button>
                </div>
              </div>
            )}

            {usarFluxoRaca === true && !racaSelecionadaCatalogo && (
              <div>
                <button
                  onClick={() => setUsarFluxoRaca(null)}
                  className="text-xs text-blue-600 mb-4 hover:underline block"
                >
                  ← Trocar opcao
                </button>
                <h2 className="text-sm font-medium text-gray-900 mb-4">Qual a raca do seu pet?</h2>

                <input
                  type="text"
                  value={buscaRaca}
                  onChange={e => setBuscaRaca(e.target.value)}
                  placeholder="Digite as iniciais da raca..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />

                <div className="flex flex-col gap-1 max-h-96 overflow-y-auto">
                  {racas
                    .filter(r => r.nome.toLowerCase().includes(buscaRaca.toLowerCase()))
                    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                    .map(r => (
                      <button
                        key={r.id}
                        onClick={() => { selecionarRacaCatalogo(r); setBuscaRaca('') }}
                        className="bg-white border border-gray-100 rounded-lg px-3 py-2.5 flex items-center gap-3 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                      >
                        {r.imagem_url ? (
                          <img src={r.imagem_url} alt={r.nome} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <span className="text-lg flex-shrink-0">🐶</span>
                        )}
                        <p className="text-sm font-medium text-gray-900">{r.nome}</p>
                      </button>
                    ))}
                  {racas.filter(r => r.nome.toLowerCase().includes(buscaRaca.toLowerCase())).length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">Nenhuma raca encontrada.</p>
                  )}
                </div>
              </div>
            )}
            {usarFluxoRaca === true && racaSelecionadaCatalogo && (
              <div>
                <button
                  onClick={() => setRacaSelecionadaCatalogo(null)}
                  className="text-xs text-blue-600 mb-4 hover:underline block"
                >
                  ← Trocar raca
                </button>
                <h2 className="text-sm font-medium text-gray-900 mb-1">Servicos para {racaSelecionadaCatalogo.nome}</h2>
                <p className="text-xs text-gray-400 mb-4">Marque um ou mais servicos</p>

                {(['principal', 'adicional', 'combo'] as const).map(grupo => {
                  const itens = racaSelecionadaCatalogo.itens.filter(i => i.grupo === grupo)
                  if (itens.length === 0) return null
                  const titulo = grupo === 'principal' ? 'Banho e Tosa' : grupo === 'adicional' ? 'Adicionais' : 'Combos'
                  return (
                    <div key={grupo} className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{titulo}</p>
                      <div className="flex flex-col gap-2">
                        {itens.map(item => {
                          const checked = itensRacaSelecionados.has(item.id)
                          const disabled = (grupo === 'principal' && bloqueioRaca.principal && !checked) || (grupo === 'combo' && bloqueioRaca.combo && !checked)
                          return (
                            <label
                              key={item.id}
                              className={`flex items-center justify-between gap-3 border rounded-xl px-4 py-3 ${
                                checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                              } ${disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={() => toggleItemRaca(item)}
                                  className="w-4 h-4"
                                />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{item.nome}</p>
                                  {item.descricao && <p className="text-xs text-gray-400">{item.descricao}</p>}
                                </div>
                              </div>
                              <p className="text-sm font-medium text-blue-600 whitespace-nowrap">{fmtMoeda(Number(item.preco))}</p>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                <div className="bg-blue-50 rounded-xl p-3 mt-4">
                  <p className="text-xs text-blue-700">{resumoRaca.selecionados.length} selecionado(s)</p>
                  <p className="text-sm font-medium text-blue-700">{fmtMoeda(resumoRaca.total)}</p>
                </div>

                <button
                  onClick={() => setEtapa(3)}
                  disabled={resumoRaca.selecionados.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50 mt-4"
                >
                  Continuar
                </button>
              </div>
            )}

            {usarFluxoRaca === false && (
              <div>
                <button
                  onClick={() => setUsarFluxoRaca(null)}
                  className="text-xs text-blue-600 mb-4 hover:underline block"
                >
                  ← Trocar opcao
                </button>
                <h2 className="text-sm font-medium text-gray-900 mb-1">Servicos disponiveis</h2>
                <p className="text-xs text-gray-400 mb-4">
                  Porte: {PORTES.find(p => p.id === portePet)?.label} • Pelagem: {pelagemPet === 'curta' ? 'Curta' : 'Longa'}
                </p>

                {(['principal', 'adicional', 'combo'] as const).map(grupo => {
                  const itens = itensPorteDisponiveis.filter(i => i.grupo === grupo)
                  if (itens.length === 0) return null
                  const titulo = grupo === 'principal' ? 'Banho e Tosa' : grupo === 'adicional' ? 'Adicionais' : 'Combos'
                  return (
                    <div key={grupo} className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{titulo}</p>
                      <div className="flex flex-col gap-2">
                        {itens.map(item => {
                          const checked = itensPorteSelecionados.has(item.id)
                          const disabled = (grupo === 'principal' && bloqueioPorte.principal && !checked) || (grupo === 'combo' && bloqueioPorte.combo && !checked)
                          return (
                            <label
                              key={item.id}
                              className={`flex items-center justify-between gap-3 border rounded-xl px-4 py-3 ${
                                checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                              } ${disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={() => toggleItemPorte(item)}
                                  className="w-4 h-4"
                                />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{item.nome}</p>
                                  {item.descricao && <p className="text-xs text-gray-400">{item.descricao}</p>}
                                </div>
                              </div>
                              <p className="text-sm font-medium text-blue-600 whitespace-nowrap">{fmtMoeda(Number(item.precos[portePet] || 0))}</p>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {itensPorteDisponiveis.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">Nenhum servico disponivel para esse porte/pelagem.</p>
                )}

                <div className="bg-blue-50 rounded-xl p-3 mt-4">
                  <p className="text-xs text-blue-700">{resumoPorte.selecionados.length} selecionado(s)</p>
                  <p className="text-sm font-medium text-blue-700">{fmtMoeda(resumoPorte.total)}</p>
                </div>

                <button
                  onClick={() => setEtapa(3)}
                  disabled={resumoPorte.selecionados.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50 mt-4"
                >
                  Continuar
                </button>
              </div>
            )}
          </div>
        )}

        {etapa === 3 && (
          <div>
            <button
              onClick={() => setEtapa(2)}
              className="text-xs text-blue-600 mb-4 hover:underline"
            >
              Voltar
            </button>
            <h2 className="text-sm font-medium text-gray-900 mb-4">Escolha o profissional</h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => selecionarProfissional(null)}
                className="bg-white border border-gray-100 rounded-xl p-4 text-left hover:border-blue-300 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900">Qualquer profissional disponivel</p>
              </button>
              {profissionais.map(p => (
                <button
                  key={p.id}
                  onClick={() => selecionarProfissional(p)}
                  className="bg-white border border-gray-100 rounded-xl p-4 text-left hover:border-blue-300 transition-colors flex items-center gap-3"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                    style={{ backgroundColor: p.cor_agenda }}
                  >
                    {p.nome.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                </button>
              ))}
            </div>
          </div>
        )}
        {etapa === 4 && !agendamentoConfirmado && (
          <div>
            <button
              onClick={() => setEtapa(3)}
              className="text-xs text-blue-600 mb-4 hover:underline"
            >
              Voltar
            </button>
            <h2 className="text-sm font-medium text-gray-900 mb-4">Escolha a data</h2>

            <input
              type="date"
              value={dataSelecionada}
              min={formatarDataISO(new Date())}
              onChange={e => selecionarData(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {dataSelecionada && (
              <>
                <h2 className="text-sm font-medium text-gray-900 mb-4">Escolha o horario</h2>
                {carregandoHorarios ? (
                  <p className="text-sm text-gray-400">Buscando horarios...</p>
                ) : horariosDisponiveis.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhum horario disponivel nesta data.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {horariosDisponiveis.map(h => (
                      <button
                        key={h}
                        onClick={() => setHorarioSelecionado(h)}
                        className={`border rounded-lg py-2 text-sm transition-colors ${
                          horarioSelecionado === h
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {horarioSelecionado && (
              <>
                <div className="bg-blue-50 rounded-xl p-3 mb-6">
                  <p className="text-xs text-blue-700">
                    {resumoFinal.selecionados.map(i => i.nome).join(' + ')} • {new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR')} as {horarioSelecionado}
                  </p>
                  <p className="text-sm font-medium text-blue-700 mt-0.5">
                    Valor: {fmtMoeda(resumoFinal.total)}
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="border border-gray-200 rounded-lg p-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={precisaTransporte}
                        onChange={e => setPrecisaTransporte(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">Preciso de transporte (leva e traz)</span>
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
                          <label className="text-sm text-gray-600 mb-1 block">Endereco de coleta</label>
                          <input
                            type="text"
                            value={enderecoColeta}
                            onChange={e => {
                              setEnderecoColeta(e.target.value)
                              if (mesmoEndereco) setEnderecoEntrega(e.target.value)
                            }}
                            placeholder="Rua, numero, bairro"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={mesmoEndereco}
                            onChange={e => {
                              setMesmoEndereco(e.target.checked)
                              if (e.target.checked) setEnderecoEntrega(enderecoColeta)
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-xs text-gray-600">Entregar no mesmo endereco</span>
                        </label>

                        {!mesmoEndereco && (
                          <div>
                            <label className="text-sm text-gray-600 mb-1 block">Endereco de entrega</label>
                            <input
                              type="text"
                              value={enderecoEntrega}
                              onChange={e => setEnderecoEntrega(e.target.value)}
                              placeholder="Rua, numero, bairro"
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        )}

                        {tenant?.preco_por_km && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={transporteIdaVolta}
                              onChange={e => setTransporteIdaVolta(e.target.checked)}
                              className="w-4 h-4"
                            />
                            <span className="text-xs text-gray-600">Ida e volta (senao, somente ida)</span>
                          </label>
                        )}

                        {calculandoDistancia && (
                          <p className="text-xs text-gray-400">Calculando distancia...</p>
                        )}

                        {distanciaKm !== null && tenant?.preco_por_km && (
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

                  <div className="border border-gray-200 rounded-lg p-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ehRecorrente}
                        onChange={e => setEhRecorrente(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">Quero agendamento recorrente</span>
                    </label>

                    {ehRecorrente && (
                      <div className="mt-3">
                        <label className="text-sm text-gray-600 mb-1 block">Frequencia</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { freq: 1, label: '1x/mes' },
                            { freq: 2, label: '2x/mes' },
                            { freq: 4, label: '4x/mes' },
                          ].map(opcao => (
                            <button
                              key={opcao.freq}
                              type="button"
                              onClick={() => setFrequenciaMensal(opcao.freq)}
                              className={`text-xs py-2 rounded-lg border transition-colors ${
                                frequenciaMensal === opcao.freq
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-gray-600 border-gray-200'
                              }`}
                            >
                              {opcao.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Seus proximos 6 agendamentos serao criados automaticamente
                        </p>
                      </div>
                    )}
                  </div>

                  {erroAgendamento && <p className="text-red-500 text-sm">{erroAgendamento}</p>}

                  <button
                    onClick={confirmarAgendamento}
                    disabled={salvandoAgendamento}
                    style={{ backgroundColor: tenant?.cor_primaria || '#1a56db' }}
                    className="w-full hover:opacity-90 text-white text-sm py-2.5 rounded-lg transition-opacity disabled:opacity-50 mt-2"
                  >
                    {salvandoAgendamento ? 'Confirmando...' : 'Confirmar agendamento'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {agendamentoConfirmado && (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-yellow-600 text-xl">⏳</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Aguardando aprovacao</h2>
            <p className="text-sm text-gray-500">
              {resumoFinal.selecionados.map(i => i.nome).join(' + ')} para {nomePet}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR')} as {horarioSelecionado}
            </p>
            {ehRecorrente && (
              <p className="text-xs text-blue-600 mt-2">
                Seus proximos agendamentos recorrentes tambem foram criados e aguardam aprovacao!
              </p>
            )}
            <p className="text-xs text-gray-400 mt-4">
              O pet shop ira revisar seu pedido e confirmar em breve pelo WhatsApp.
            </p>
          </div>
        )}
      </div>

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
    </div>
  )
}