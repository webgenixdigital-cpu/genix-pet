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
  plan_id: string | null
  chave_pix: string | null
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
  pelagens: string[] | null
  duracao_min: number | null
  precos: { porte: string; preco: number }[]
}

type TipoTosa = { id: string; nome: string; descricao: string }
type Profissional = { id: string; nome: string; cor_agenda: string }

type Plano = {
  id: string
  nome: string
  raca_id: string | null
  porte: string | null
  pelagem: string | null
  quantidade_banhos: number
  validade_dias: number
  preco_base: number
  preco_final: number
  tipo_recorrencia: 'intervalo' | 'mensal_dia_semana'
  intervalo_dias: number | null
  semana_do_mes: number | null
  dia_semana: number | null
}

type PetNoAgendamento = {
  chave: string
  nome: string
  especie: string
  petIdExistente: string | null
  porte: PorteId
  pelagem: string
  usarFluxoRaca: boolean | null
  racaSelecionada: Raca | null
  itensSelecionados: Set<string>
  planoEscolhido: Plano | null
  planoAtivarAgora: boolean
}

function petEmBranco(): PetNoAgendamento {
  return {
    chave: Math.random().toString(36).slice(2),
    nome: '', especie: 'cachorro', petIdExistente: null,
    porte: 'medio', pelagem: 'curta',
    usarFluxoRaca: null, racaSelecionada: null, itensSelecionados: new Set(),
    planoEscolhido: null, planoAtivarAgora: true,
  }
}

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

function nEsimoDiaDaSemanaDoMes(ano: number, mes: number, diaSemana: number, n: number): Date {
  const primeiroDia = new Date(ano, mes, 1)
  const primeiroDiaSemana = primeiroDia.getDay()
  const deslocamento = (diaSemana - primeiroDiaSemana + 7) % 7
  const dia = 1 + deslocamento + (n - 1) * 7
  return new Date(ano, mes, dia)
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
  const [planos, setPlanos] = useState<Plano[]>([])
  const [carregando, setCarregando] = useState(true)
  const [naoEncontrado, setNaoEncontrado] = useState(false)

  const [etapa, setEtapa] = useState(1)
  const [buscaRaca, setBuscaRaca] = useState('')
  const [modalTosa, setModalTosa] = useState<{ titulo: string; texto: string } | null>(null)

  const [nomeCliente, setNomeCliente] = useState('')
  const [telefoneCliente, setTelefoneCliente] = useState('')
  const [clienteExistente, setClienteExistente] = useState<any>(null)
  const [sugestoesClientes, setSugestoesClientes] = useState<any[]>([])
  const [petsDoCliente, setPetsDoCliente] = useState<any[]>([])
  const [buscandoCliente, setBuscandoCliente] = useState(false)

  // Arquitetura nova: um pet "em construcao" por vez, e uma lista dos ja confirmados
  const [petAtual, setPetAtual] = useState<PetNoAgendamento>(petEmBranco())
  const [petsConfirmados, setPetsConfirmados] = useState<PetNoAgendamento[]>([])
     const [subPassoPet, setSubPassoPet] = useState<'nome' | 'perfil' | 'servicos' | 'plano' | 'confirmado'>('nome')
  const [mostrarFormNovoPet, setMostrarFormNovoPet] = useState(false)

  const [profissionalSelecionado, setProfissionalSelecionado] = useState<Profissional | null>(null)
  const [dataSelecionada, setDataSelecionada] = useState<string>('')
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([])
  const [horarioSelecionado, setHorarioSelecionado] = useState<string>('')
  const [carregandoHorarios, setCarregandoHorarios] = useState(false)

  const [salvandoAgendamento, setSalvandoAgendamento] = useState(false)
  const [erroAgendamento, setErroAgendamento] = useState('')
  const [agendamentoConfirmado, setAgendamentoConfirmado] = useState(false)

    const [precisaTransporte, setPrecisaTransporte] = useState(false)
  const [ruaColeta, setRuaColeta] = useState('')
  const [numeroColeta, setNumeroColeta] = useState('')
  const [bairroColeta, setBairroColeta] = useState('')
  const [cidadeColeta, setCidadeColeta] = useState('')
  const [ufColeta, setUfColeta] = useState('')
  const [ehRecorrente, setEhRecorrente] = useState(false)
  const [frequenciaMensal, setFrequenciaMensal] = useState(1)
  const [cepColeta, setCepColeta] = useState('')
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [faixasTransporte, setFaixasTransporte] = useState<{ raio_min_km: number; raio_max_km: number; valor_fixo: number }[]>([])
  const [transporteIdaVolta, setTransporteIdaVolta] = useState(false)
  const [distanciaKm, setDistanciaKm] = useState<number | null>(null)
    const [calculandoDistancia, setCalculandoDistancia] = useState(false)
  const [formaPagamento, setFormaPagamento] = useState<'pix' | 'presencial'>('presencial')
  
  useEffect(() => {
    async function carregar() {
            const { data: tenantData } = await supabase
        .from('tenants')
        .select('id, nome, slug, logo_url, cor_primaria, endereco_lat, endereco_lng, preco_por_km, valor_minimo_transporte, plan_id, chave_pix')
        .eq('slug', slug)
        .single()

      if (!tenantData) {
        setNaoEncontrado(true)
        setCarregando(false)
        return
      }

      if (tenantData.plan_id) {
        const { data: plano } = await supabase
          .from('plans')
          .select('tem_catalogo_publico')
          .eq('id', tenantData.plan_id)
          .single()

        if (!plano?.tem_catalogo_publico) {
          setNaoEncontrado(true)
          setCarregando(false)
          return
        }
      } else {
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
        .eq('tenant_id', tenantData.id)

            const { data: profissionaisData } = await supabase
        .from('professionals')
        .select('id, nome, cor_agenda')
        .eq('tenant_id', tenantData.id)
        .eq('ativo', true)
        .order('nome')

            const { data: faixasData } = await supabase
        .from('transport_price_tiers')
        .select('raio_min_km, raio_max_km, valor_fixo')
        .eq('tenant_id', tenantData.id)
        .order('raio_min_km')

      const { data: planosData } = await supabase
        .from('pacote_config_desconto')
        .select('*')
        .eq('tenant_id', tenantData.id)
        .eq('ativo', true)

      setRacas(racasMontadas)
      setPorteItens(porteItensMontados)
      setTiposTosa(tiposTosaData || [])
      setProfissionais(profissionaisData || [])
      setFaixasTransporte((faixasData || []).map((f: any) => ({
        raio_min_km: Number(f.raio_min_km),
        raio_max_km: Number(f.raio_max_km),
        valor_fixo: Number(f.valor_fixo),
      })))
      setPlanos(planosData || [])
      setCarregando(false)
    }

    carregar()
  }, [slug])
  
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
      .select('id, nome, telefone, pets ( id, nome, especie, porte, raca, pelagem )')
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
    if (!tenant || !(tenant as any).endereco_lat || !numeroColeta || !ruaColeta || !cidadeColeta || !ufColeta) return

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
        const lat1 = (tenant as any).endereco_lat
        const lng1 = (tenant as any).endereco_lng

        try {
          const paramsRota = new URLSearchParams({
            latOrigem: String(lat1),
            lngOrigem: String(lng1),
            latDestino: String(coords.lat),
            lngDestino: String(coords.lng),
          })
          const resRota = await fetch(`/api/calcular-rota?${paramsRota.toString()}`)
          const dadosRota = await resRota.json()

          if (dadosRota.distanciaKm !== undefined) {
            setDistanciaKm(dadosRota.distanciaKm)
            setCalculandoDistancia(false)
            return
          }
        } catch {
          // se falhar, cai no calculo de linha reta abaixo
        }

        const R = 6371
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
  
  function atualizarPetAtual(campo: keyof PetNoAgendamento, valor: any) {
    setPetAtual(prev => ({ ...prev, [campo]: valor }))
  }

    function selecionarPetExistente(petId: string) {
    const pet = petsDoCliente.find(p => p.id === petId)
    if (!pet) return

    const racaCatalogo = racas.find(r => r.nome.toLowerCase() === (pet.raca || '').toLowerCase())

            setPetAtual({
      chave: Math.random().toString(36).slice(2),
      nome: pet.nome,
      especie: pet.especie || 'cachorro',
      petIdExistente: pet.id,
      porte: pet.porte || 'medio',
      pelagem: pet.pelagem || 'curta',
      usarFluxoRaca: racaCatalogo ? true : false,
      racaSelecionada: racaCatalogo || null,
      itensSelecionados: new Set(),
      planoEscolhido: null,
      planoAtivarAgora: true,
    })
    setSubPassoPet('servicos')
  }

  function irParaPerfilComNomeNovo() {
    if (!petAtual.nome) return
    setSubPassoPet('perfil')
  }

    function confirmarPetAtualEAdicionarOutro() {
    setPetsConfirmados(prev => [...prev, petAtual])
    setPetAtual(petEmBranco())
    setSubPassoPet('nome')
    setBuscaRaca('')
  }

  function confirmarPetAtualEContinuar() {
    setPetsConfirmados(prev => [...prev, petAtual])
    setEtapa(3)
  }

  function planosCompativeisComPet(pet: PetNoAgendamento): Plano[] {
    if (pet.usarFluxoRaca && pet.racaSelecionada) {
      return planos.filter(p => p.raca_id === pet.racaSelecionada!.id)
    }
    if (pet.usarFluxoRaca === false) {
      return planos.filter(p => p.porte === pet.porte && p.pelagem === pet.pelagem)
    }
    return []
  }

    function escolherPlano(plano: Plano | null) {
    atualizarPetAtual('planoEscolhido', plano)
    atualizarPetAtual('planoAtivarAgora', true)
  }
  
  function abrirModalTosa(tosaTipoId: string | null) {
    if (!tosaTipoId) return
    const tipo = tiposTosa.find(t => t.id === tosaTipoId)
    if (!tipo) return
    setModalTosa({ titulo: tipo.nome, texto: tipo.descricao })
  }

  function itensDisponiveisParaPet(pet: PetNoAgendamento): RacaItem[] {
    if (pet.usarFluxoRaca && pet.racaSelecionada) {
      return pet.racaSelecionada.itens
    }
    if (pet.usarFluxoRaca === false) {
      return porteItens
        .filter(item => {
          const temPreco = item.precos.some(p => p.porte === pet.porte)
          const pelagemOk = !item.pelagens || item.pelagens.length === 0 || item.pelagens.includes(pet.pelagem)
          return temPreco && pelagemOk
        })
        .map(item => ({
          id: item.id,
          raca_id: '',
          grupo: item.grupo,
          nome: item.nome,
          descricao: item.descricao,
          preco: Number(item.precos.find(p => p.porte === pet.porte)?.preco || 0),
          tosa_tipo: item.tosa_tipo,
          duracao_min: item.duracao_min,
        }))
    }
    return []
  }

  function toggleItemPetAtual(item: RacaItem) {
    const jaMarcado = petAtual.itensSelecionados.has(item.id)
    const novo = new Set(petAtual.itensSelecionados)
    const itensDisponiveis = itensDisponiveisParaPet(petAtual)

    const temPrincipal = itensDisponiveis.filter(i => i.grupo === 'principal' && novo.has(i.id)).length > 0
    const temCombo = itensDisponiveis.filter(i => i.grupo === 'combo' && novo.has(i.id)).length > 0

    if (jaMarcado) {
      novo.delete(item.id)
    } else {
      if (item.grupo === 'principal' && temCombo) {
        alert('Ja existe um Combo selecionado. Remova-o para escolher um servico avulso.')
        return
      }
      if (item.grupo === 'combo' && temPrincipal) {
        alert('Ja existe um servico de Banho e Tosa selecionado. Remova-o para escolher um Combo.')
        return
      }
      novo.add(item.id)
      abrirModalTosa(item.tosa_tipo)
    }
    atualizarPetAtual('itensSelecionados', novo)
  }

  function resumoPet(pet: PetNoAgendamento) {
    const itensDisponiveis = itensDisponiveisParaPet(pet)
    const selecionados = itensDisponiveis.filter(i => pet.itensSelecionados.has(i.id))
    const total = selecionados.reduce((acc, i) => acc + Number(i.preco), 0)
    const duracao = selecionados.reduce((acc, i) => acc + (i.duracao_min || 20), 0)
    return { selecionados, total, duracao }
  }

  const resumoGeral = useMemo(() => {
    const todosSelecionados = petsConfirmados.map(p => resumoPet(p))
    const total = todosSelecionados.reduce((acc, r) => acc + r.total, 0)
    const duracao = todosSelecionados.reduce((acc, r) => acc + r.duracao, 0)
    return { total, duracao }
  }, [petsConfirmados])
  
  async function buscarHorarios(data: string) {
    if (!tenant) return
    setCarregandoHorarios(true)
    setHorarioSelecionado('')

    const dataObj = new Date(data + 'T00:00:00')
    const diaSemana = dataObj.getDay()
    const duracaoTotal = resumoGeral.duracao || 60

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

  function selecionarData(data: string) {
    setDataSelecionada(data)
    buscarHorarios(data)
  }

    function calcularValorTransporteFinal(): number {
    if (!precisaTransporte || distanciaKm === null) return 0

    const faixaCorrespondente = faixasTransporte.find(
      f => distanciaKm >= f.raio_min_km && distanciaKm <= f.raio_max_km
    )

    if (faixaCorrespondente) {
      return faixaCorrespondente.valor_fixo * (transporteIdaVolta ? 2 : 1)
    }

    if (!tenant?.preco_por_km) return 0
    const valorPorTrecho = Math.max(distanciaKm * Number(tenant.preco_por_km), Number(tenant.valor_minimo_transporte || 0))
    return valorPorTrecho * (transporteIdaVolta ? 2 : 1)
  }
  
  async function confirmarAgendamento() {
    setErroAgendamento('')

    if (!nomeCliente || !telefoneCliente) {
      setErroAgendamento('Preencha seu nome e telefone.')
      return
    }

    if (petsConfirmados.length === 0) {
      setErroAgendamento('Adicione ao menos um pet.')
      return
    }

        if (!dataSelecionada || !horarioSelecionado) {
      setErroAgendamento('Escolha data e horario.')
      return
    }

    if (precisaTransporte && (!ruaColeta || !numeroColeta || !cidadeColeta || !ufColeta)) {
      setErroAgendamento('Preencha rua, numero, cidade e UF do endereco de coleta.')
      return
    }

    if (!tenant) return

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
        .insert({ tenant_id: tenant.id, nome: nomeCliente, telefone: telefoneCliente })
        .select('id')
        .single()

      if (erroCliente || !novoCliente) {
        setErroAgendamento('Erro ao cadastrar cliente: ' + erroCliente?.message)
        setSalvandoAgendamento(false)
        return
      }
      clienteId = novoCliente.id
    }
    
        const enderecoColetaFinal = precisaTransporte
      ? `${ruaColeta}, ${numeroColeta}${bairroColeta ? ', ' + bairroColeta : ''}, ${cidadeColeta} - ${ufColeta}`
      : ''

    let horarioAcumuladoMs = 0
    const agendamentosCriadosIds: string[] = []
    let erroCriacao = ''
    let primeiroPetNome = ''

    for (const pet of petsConfirmados) {
      let petId = pet.petIdExistente

      if (!petId) {
        const { data: novoPet, error: erroPet } = await supabase
          .from('pets')
          .insert({
            tenant_id: tenant.id,
            customer_id: clienteId,
            nome: pet.nome,
            especie: pet.especie,
            porte: pet.porte,
            pelagem: pet.pelagem,
            raca: pet.usarFluxoRaca ? pet.racaSelecionada?.nome : null,
          })
          .select('id')
          .single()

        if (erroPet || !novoPet) {
          erroCriacao = 'Erro ao cadastrar pet: ' + erroPet?.message
          break
        }
        petId = novoPet.id
      }

            if (!primeiroPetNome) primeiroPetNome = pet.nome

      const { selecionados, total, duracao } = resumoPet(pet)
      const nomesServicos = selecionados.map(i => i.nome).join(' + ')
      const duracaoMs = (duracao || 60) * 60000

      const inicio = new Date(new Date(`${dataSelecionada}T${horarioSelecionado}:00`).getTime() + horarioAcumuladoMs)
      const fim = new Date(inicio.getTime() + duracaoMs)
      horarioAcumuladoMs += duracaoMs

      let customerPackageId: string | null = null

      if (pet.planoEscolhido && pet.planoAtivarAgora) {
        const plano = pet.planoEscolhido

        const ciclosNaoPagos = await supabase
          .from('customer_packages')
          .select('id')
          .eq('pet_id', petId)
          .eq('pago', false)
          .lte('sessoes_restantes', 0)
          .limit(1)

        if (ciclosNaoPagos.data && ciclosNaoPagos.data.length > 0) {
          erroCriacao = 'Este pet tem um ciclo de plano anterior nao pago. Marque como pago antes de iniciar um novo ciclo.'
          break
        }

        const expiraEm = new Date(inicio)
        expiraEm.setDate(expiraEm.getDate() + plano.validade_dias)

                const { data: pacoteCriado, error: erroPacote } = await supabase
          .from('customer_packages')
          .insert({
            tenant_id: tenant.id,
            customer_id: clienteId,
            pet_id: petId,
            pacote_config_id: plano.id,
            sessoes_total: plano.quantidade_banhos,
            sessoes_usadas: 1,
            preco_pago: plano.preco_final,
            expira_em: expiraEm.toISOString(),
            status: 'ativo',
          })
          .select('id')
          .single()

               customerPackageId = pacoteCriado?.id || null

        if (customerPackageId) {
          await supabase.from('financial_transactions').insert({
            tenant_id: tenant.id,
            tipo: 'receita',
            categoria: 'Pacote',
            descricao: `Plano ${plano.nome} (${plano.quantidade_banhos} banhos) - ${pet.nome}`,
            valor: plano.preco_final,
            data_lancamento: formatarDataISO(new Date()),
            status: 'pendente',
            customer_id: clienteId,
            customer_package_id: customerPackageId,
          })
        }
      }         

      const totalAdicionais = selecionados.filter(i => i.grupo === 'adicional').reduce((s, i) => s + Number(i.preco), 0)
      const precoDeHoje = (pet.planoEscolhido && pet.planoAtivarAgora) ? totalAdicionais : total

      const { data: agendamentoCriado, error: erroAg } = await supabase
        .from('appointments')
        .insert({
          tenant_id: tenant.id,
          customer_id: clienteId,
          pet_id: petId,
          professional_id: profissionalId,
          service_id: selecionados[0]?.id || null,
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
          status: 'em_espera',
          origem: 'online',
          preco_cobrado: precoDeHoje,
          customer_package_id: customerPackageId,
          observacoes: nomesServicos,
                    precisa_transporte: precisaTransporte,
          endereco_coleta: precisaTransporte ? enderecoColetaFinal : null,
          endereco_entrega: precisaTransporte ? enderecoColetaFinal : null,
                              is_recorrente: !!(pet.planoEscolhido && pet.planoAtivarAgora),
          forma_pagamento_solicitada: formaPagamento,
          distancia_km: precisaTransporte ? distanciaKm : null,
          transporte_ida_volta: precisaTransporte ? transporteIdaVolta : false,
          valor_transporte: precisaTransporte && distanciaKm && tenant?.preco_por_km
            ? Math.max(distanciaKm * Number(tenant.preco_por_km), Number(tenant.valor_minimo_transporte || 0)) * (transporteIdaVolta ? 2 : 1)
            : 0,
        })
        .select('id')
        .single()

      if (erroAg || !agendamentoCriado) {
        erroCriacao = erroAg?.message || 'Erro desconhecido'
        break
      }

      agendamentosCriadosIds.push(agendamentoCriado.id)

                  if (pet.planoEscolhido) {
        const plano = pet.planoEscolhido
        const ativarAgora = pet.planoAtivarAgora

        // Se nao ativar agora, o pacote ainda nao foi criado la em cima - criamos aqui
        if (!ativarAgora && !customerPackageId) {
          const expiraEm2 = new Date(inicio)
          expiraEm2.setDate(expiraEm2.getDate() + plano.validade_dias)

          const { data: pacoteCriado2 } = await supabase
            .from('customer_packages')
            .insert({
              tenant_id: tenant.id,
              customer_id: clienteId,
              pet_id: petId,
              pacote_config_id: plano.id,
              sessoes_total: plano.quantidade_banhos,
              sessoes_usadas: 0,
              preco_pago: plano.preco_final,
              expira_em: expiraEm2.toISOString(),
              status: 'ativo',
            })
            .select('id')
            .single()

                    customerPackageId = pacoteCriado2?.id || null

          if (customerPackageId) {
            await supabase.from('financial_transactions').insert({
              tenant_id: tenant.id,
              tipo: 'receita',
              categoria: 'Pacote',
              descricao: `Plano ${plano.nome} (${plano.quantidade_banhos} banhos) - ${pet.nome}`,
              valor: plano.preco_final,
              data_lancamento: formatarDataISO(new Date()),
              status: 'pendente',
              customer_id: clienteId,
              customer_package_id: customerPackageId,
            })
          }
        }

        // Se ativar agora: o agendamento de hoje conta como sessao 1, faltam (quantidade-1) futuras
        // Se nao ativar agora: hoje fica avulso (fora do plano), e todas as (quantidade) sessoes comecam a partir da proxima data
        const totalFuturos = ativarAgora ? plano.quantidade_banhos - 1 : plano.quantidade_banhos
        const inicioContagem = ativarAgora ? 0 : 1
        const futuros = []

        for (let i = inicioContagem === 0 ? 1 : 0; i < inicioContagem + totalFuturos; i++) {
          const offset = ativarAgora ? i : i + 1
          let proximoInicio: Date

          if (plano.tipo_recorrencia === 'intervalo' && plano.intervalo_dias) {
            proximoInicio = new Date(inicio.getTime() + plano.intervalo_dias * offset * 24 * 60 * 60 * 1000)
          } else if (plano.semana_do_mes !== null && plano.dia_semana !== null) {
            const dataBase = new Date(inicio)
            const mesAlvo = dataBase.getMonth() + offset
            const diaCalculado = nEsimoDiaDaSemanaDoMes(dataBase.getFullYear(), mesAlvo, plano.dia_semana, plano.semana_do_mes)
            proximoInicio = new Date(diaCalculado)
            proximoInicio.setHours(inicio.getHours(), inicio.getMinutes())
          } else {
            continue
          }

          const proximoFim = new Date(proximoInicio.getTime() + duracaoMs)

                    futuros.push({
            tenant_id: tenant.id,
            customer_id: clienteId,
            pet_id: petId,
            professional_id: profissionalId,
            service_id: selecionados[0]?.id || null,
            inicio: proximoInicio.toISOString(),
            fim: proximoFim.toISOString(),
            status: 'em_espera',
            origem: 'online',
            preco_cobrado: 0,
            customer_package_id: customerPackageId,
            observacoes: `${nomesServicos} (plano ${plano.nome})`,
            is_recorrente: true,
            recorrencia_pai_id: agendamentoCriado.id,
          })
        }

        if (futuros.length > 0) {
          await supabase.from('appointments').insert(futuros)
        }
      }
    }

    if (erroCriacao || agendamentosCriadosIds.length === 0) {
      setErroAgendamento('Erro ao criar agendamento: ' + erroCriacao)
      setSalvandoAgendamento(false)
      return
    }

    fetch('/api/notificar/recebido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: tenant.id,
        telefone: telefoneCliente,
        nomePet: primeiroPetNome,
        servico: `${petsConfirmados.length} pet(s)`,
        data: new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR'),
        horario: horarioSelecionado,
      }),
    }).catch(() => {})

    setSalvandoAgendamento(false)
    setAgendamentoConfirmado(true)
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
                    Bem-vindo de volta, {clienteExistente.nome}! 🐾
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

              <button
                onClick={() => setEtapa(2)}
                disabled={!nomeCliente || !telefoneCliente}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50 mt-2"
              >
                Continuar
              </button>
            </div>
          </div>
        )}
        
        {etapa === 2 && (
          <div>
            <button onClick={() => setEtapa(1)} className="text-xs text-blue-600 mb-4 hover:underline">
              Voltar
            </button>

            {petsConfirmados.length > 0 && (
              <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-4">
                <p className="text-xs font-medium text-green-700">
                  ✅ {petsConfirmados.length} pet{petsConfirmados.length > 1 ? 's' : ''} confirmado{petsConfirmados.length > 1 ? 's' : ''}: {petsConfirmados.map(p => p.nome).join(', ')}
                </p>
              </div>
            )}

                        {subPassoPet === 'nome' && (
              <div>
                <h2 className="text-sm font-medium text-gray-900 mb-1">
                  {petsConfirmados.length === 0 ? `Ola, ${nomeCliente.split(' ')[0]}!` : 'Vamos cadastrar o proximo pet'}
                </h2>

                {petsConfirmados.length === 0 && clienteExistente && (
                  <p className="text-xs text-gray-400 mb-4">{telefoneCliente}</p>
                )}

                {petsDoCliente.filter(p => !petsConfirmados.some(pc => pc.petIdExistente === p.id)).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1.5">Escolha um pet ja cadastrado</p>
                    <div className="flex flex-col gap-1.5">
                      {petsDoCliente
                        .filter(p => !petsConfirmados.some(pc => pc.petIdExistente === p.id))
                        .map(p => (
                          <button
                            key={p.id}
                            onClick={() => selecionarPetExistente(p.id)}
                            className="border border-gray-200 rounded-lg px-3 py-3 text-left hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm flex items-center justify-between"
                          >
                            <span className="font-medium text-gray-900">{p.nome}</span>
                            <span className="text-xs text-gray-400">
                              {p.raca || (p.porte ? PORTES.find(pp => pp.id === p.porte)?.label : '')}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {!mostrarFormNovoPet ? (
                  <button
                    onClick={() => setMostrarFormNovoPet(true)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    + Cadastrar um pet novo
                  </button>
                ) : (
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">Nome do novo pet</label>
                    <input
                      type="text"
                      value={petAtual.nome}
                      onChange={e => atualizarPetAtual('nome', e.target.value)}
                      placeholder="Nome do pet"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={() => { irParaPerfilComNomeNovo(); setMostrarFormNovoPet(false) }}
                      disabled={!petAtual.nome}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Continuar
                    </button>
                  </div>
                )}
              </div>
            )}
            
            
            {subPassoPet === 'perfil' && (
              <div>
                <button onClick={() => setSubPassoPet('nome')} className="text-xs text-blue-600 mb-3 hover:underline block">
                  ← Voltar
                </button>
                <h2 className="text-sm font-medium text-gray-900 mb-4">Sobre o {petAtual.nome}</h2>

                <div className="mb-4">
                  <label className="text-sm text-gray-600 mb-1 block">Especie</label>
                  <select
                    value={petAtual.especie}
                    onChange={e => atualizarPetAtual('especie', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cachorro">Cachorro</option>
                    <option value="gato">Gato</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                {petAtual.usarFluxoRaca === null && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">O {petAtual.nome} tem raca definida?</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => atualizarPetAtual('usarFluxoRaca', true)}
                        className="border border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 transition-colors"
                      >
                        <div className="text-xl mb-1">🐾</div>
                        <p className="text-xs font-medium text-gray-900">Raca definida</p>
                      </button>
                      <button
                        onClick={() => { atualizarPetAtual('usarFluxoRaca', false); setSubPassoPet('servicos') }}
                        className="border border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 transition-colors"
                      >
                        <div className="text-xl mb-1">📏</div>
                        <p className="text-xs font-medium text-gray-900">SRD / Nao sei</p>
                      </button>
                    </div>
                  </div>
                )}

                {petAtual.usarFluxoRaca === true && !petAtual.racaSelecionada && (
                  <div>
                    <button onClick={() => atualizarPetAtual('usarFluxoRaca', null)} className="text-xs text-blue-600 mb-3 hover:underline block">
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
                            onClick={() => { atualizarPetAtual('racaSelecionada', r); setBuscaRaca(''); setSubPassoPet('servicos') }}
                            className="border border-gray-100 rounded-lg px-3 py-2 text-left hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm"
                          >
                            {r.nome}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {subPassoPet === 'servicos' && (() => {
              const itensDisponiveis = itensDisponiveisParaPet(petAtual)
              const { selecionados, total } = resumoPet(petAtual)
              const temPrincipalSel = selecionados.some(i => i.grupo === 'principal')
              const temComboSel = selecionados.some(i => i.grupo === 'combo')

              return (
                <div>
                  <button
                    onClick={() => { atualizarPetAtual('usarFluxoRaca', petAtual.usarFluxoRaca ? null : null); setSubPassoPet('perfil') }}
                    className="text-xs text-blue-600 mb-3 hover:underline block"
                  >
                    ← Voltar
                  </button>
                  <h2 className="text-sm font-medium text-gray-900 mb-1">Servicos para {petAtual.nome}</h2>
                  {petAtual.usarFluxoRaca && petAtual.racaSelecionada && (
                    <p className="text-xs text-gray-400 mb-4">Raca: {petAtual.racaSelecionada.nome}</p>
                  )}

                  {petAtual.usarFluxoRaca === false && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Porte</p>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {PORTES.map(p => (
                          <button
                            key={p.id}
                            onClick={() => atualizarPetAtual('porte', p.id)}
                            className={`text-xs py-2 px-2 rounded-lg border transition-colors ${
                              petAtual.porte === p.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Pelagem</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => atualizarPetAtual('pelagem', 'curta')}
                          className={`text-xs py-2 rounded-lg border transition-colors ${
                            petAtual.pelagem === 'curta' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
                          }`}
                        >
                          Curta
                        </button>
                        <button
                          onClick={() => atualizarPetAtual('pelagem', 'longa')}
                          className={`text-xs py-2 rounded-lg border transition-colors ${
                            petAtual.pelagem === 'longa' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
                          }`}
                        >
                          Longa
                        </button>
                      </div>
                    </div>
                  )}

                  {(['principal', 'adicional', 'combo'] as const).map(grupo => {
                    const itens = itensDisponiveis.filter(i => i.grupo === grupo)
                    if (itens.length === 0) return null
                    const titulo = grupo === 'principal' ? 'Banho e Tosa' : grupo === 'adicional' ? 'Adicionais' : 'Combos'
                    return (
                      <div key={grupo} className="mb-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{titulo}</p>
                        <div className="flex flex-col gap-1.5">
                          {itens.map(item => {
                            const checked = petAtual.itensSelecionados.has(item.id)
                            const disabled = (grupo === 'principal' && temComboSel && !checked) || (grupo === 'combo' && temPrincipalSel && !checked)
                            return (
                              <label
                                key={item.id}
                                className={`flex items-center justify-between gap-2 border rounded-xl px-4 py-3 ${
                                  checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                                } ${disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={disabled}
                                    onChange={() => toggleItemPetAtual(item)}
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

                  {itensDisponiveis.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">Nenhum servico disponivel.</p>
                  )}

                  <div className="bg-blue-50 rounded-xl p-3 mt-4">
                    <p className="text-xs text-blue-700">{selecionados.length} selecionado(s)</p>
                    <p className="text-sm font-medium text-blue-700">{fmtMoeda(total)}</p>
                  </div>

                                    <button
                    onClick={() => setSubPassoPet('plano')}
                    disabled={selecionados.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50 mt-4"
                  >
                    Continuar
                  </button>
                </div>
              )
            })()}
            
                        {subPassoPet === 'plano' && (() => {
              const planosDoPet = planosCompativeisComPet(petAtual)
              return (
                <div>
                  <button onClick={() => setSubPassoPet('servicos')} className="text-xs text-blue-600 mb-3 hover:underline block">
                    ← Voltar
                  </button>
                  <h2 className="text-sm font-medium text-gray-900 mb-1">Quer um plano recorrente?</h2>
                  <p className="text-xs text-gray-400 mb-4">
                    Economize com banhos recorrentes para {petAtual.nome}
                  </p>

                                    {planosDoPet.length === 0 ? (
                    <div>
                      <p className="text-sm text-gray-400 text-center py-6">
                        Nenhum plano disponivel para este pet no momento.
                      </p>
                      <button
                        onClick={() => setSubPassoPet('confirmado')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 rounded-lg transition-colors"
                      >
                        Continuar sem plano
                      </button>
                    </div>
                  ) : !petAtual.planoEscolhido ? (
                    <div className="flex flex-col gap-2">
                      {planosDoPet.map(p => (
                        <button
                          key={p.id}
                          onClick={() => escolherPlano(p)}
                          className="border border-gray-200 rounded-xl p-4 text-left hover:border-blue-300 transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {p.quantidade_banhos} banhos • valido {p.validade_dias} dias
                          </p>
                          <p className="text-xs text-gray-400 line-through">{fmtMoeda(Number(p.preco_base))}</p>
                          <p className="text-sm font-semibold text-blue-600">{fmtMoeda(Number(p.preco_final))}</p>
                        </button>
                      ))}
                      <button
                        onClick={() => { escolherPlano(null); setSubPassoPet('confirmado') }}
                        className="text-xs text-gray-500 hover:underline text-center mt-2"
                      >
                        Nao quero plano, so este agendamento
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="bg-blue-50 rounded-xl p-4 mb-4">
                        <p className="text-sm font-medium text-blue-900">✅ {petAtual.planoEscolhido.nome}</p>
                        <p className="text-xs text-blue-700 mt-0.5">
                          {petAtual.planoEscolhido.quantidade_banhos} banhos por {fmtMoeda(Number(petAtual.planoEscolhido.preco_final))}
                        </p>
                        <p className="text-xs text-blue-600 mt-2 bg-blue-100 rounded-lg px-2 py-1.5">
                          💳 O pagamento do plano e sempre feito no 1º banho do ciclo.
                        </p>
                      </div>

                      <p className="text-sm text-gray-700 mb-2">
                        O agendamento de hoje ja e o 1º banho deste plano?
                      </p>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => { atualizarPetAtual('planoAtivarAgora', true); setSubPassoPet('confirmado') }}
                          className="border border-gray-200 rounded-xl p-3 text-left hover:border-blue-300 transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-900">Sim, comecar agora</p>
                          <p className="text-xs text-gray-400">Este agendamento entra como o 1º banho do plano</p>
                        </button>
                        <button
                          onClick={() => { atualizarPetAtual('planoAtivarAgora', false); setSubPassoPet('confirmado') }}
                          className="border border-gray-200 rounded-xl p-3 text-left hover:border-blue-300 transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-900">Nao, comecar no proximo banho</p>
                          <p className="text-xs text-gray-400">Este agendamento e cobrado normalmente, o plano comeca depois</p>
                        </button>
                      </div>

                      <button
                        onClick={() => atualizarPetAtual('planoEscolhido', null)}
                        className="text-xs text-gray-500 hover:underline mt-3 block"
                      >
                        ← Trocar plano
                      </button>
                    </div>
                  )}
                </div>
              )
            })()}

            {subPassoPet === 'confirmado' && (() => {
              const { selecionados, total } = resumoPet(petAtual)
              return (
                <div>
                                    <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-4">
                    <p className="text-sm font-medium text-green-800 mb-1">
                      ✅ {petAtual.nome} {petAtual.usarFluxoRaca && petAtual.racaSelecionada ? `(${petAtual.racaSelecionada.nome})` : ''}
                    </p>
                    <p className="text-xs text-green-700">{selecionados.map(i => i.nome).join(', ')}</p>
                    <p className="text-sm font-medium text-green-800 mt-1">{fmtMoeda(total)}</p>
                    {petAtual.planoEscolhido && (
                      <p className="text-xs text-blue-700 mt-2 bg-blue-50 rounded-lg px-2 py-1.5">
                        📅 Plano: {petAtual.planoEscolhido.nome} ({petAtual.planoEscolhido.quantidade_banhos} banhos por {fmtMoeda(Number(petAtual.planoEscolhido.preco_final))})
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={confirmarPetAtualEAdicionarOutro}
                      className="w-full border border-blue-200 text-blue-600 text-sm py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      + Agendar outro pet
                    </button>
                    <button
                      onClick={confirmarPetAtualEContinuar}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 rounded-lg transition-colors"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
        
        {etapa === 3 && (
          <div>
            <button onClick={() => { setSubPassoPet('nome'); setEtapa(2) }} className="text-xs text-blue-600 mb-4 hover:underline">
              Voltar
            </button>

            <div className="bg-blue-50 rounded-xl p-3 mb-4">
              <p className="text-xs text-blue-700">
                {petsConfirmados.length} pet{petsConfirmados.length > 1 ? 's' : ''}: {petsConfirmados.map(p => p.nome).join(', ')}
              </p>
              <p className="text-sm font-medium text-blue-700">{fmtMoeda(resumoGeral.total)}</p>
            </div>

            <h2 className="text-sm font-medium text-gray-900 mb-4">Escolha o profissional</h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setProfissionalSelecionado(null); setEtapa(4) }}
                className="bg-white border border-gray-100 rounded-xl p-4 text-left hover:border-blue-300 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900">Qualquer profissional disponivel</p>
              </button>
              {profissionais.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setProfissionalSelecionado(p); setEtapa(4) }}
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
            <button onClick={() => setEtapa(3)} className="text-xs text-blue-600 mb-4 hover:underline">
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
                    {petsConfirmados.length} pet{petsConfirmados.length > 1 ? 's' : ''} • {new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR')} as {horarioSelecionado}
                  </p>
                  <p className="text-sm font-medium text-blue-700 mt-0.5">
                    Valor total: {fmtMoeda(resumoGeral.total)}
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
                          <label className="text-sm text-gray-600 mb-1 block">Rua *</label>
                          <input
                            type="text"
                            value={ruaColeta}
                            onChange={e => setRuaColeta(e.target.value)}
                            placeholder="Rua das Flores"
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
                              placeholder="123"
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-sm text-gray-600 mb-1 block">Bairro</label>
                            <input
                              type="text"
                              value={bairroColeta}
                              onChange={e => setBairroColeta(e.target.value)}
                              placeholder="Centro"
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
                              placeholder="Pocos de Caldas"
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="w-20">
                            <label className="text-sm text-gray-600 mb-1 block">UF *</label>
                            <input
                              type="text"
                              value={ufColeta}
                              onChange={e => setUfColeta(e.target.value.toUpperCase())}
                              placeholder="MG"
                              maxLength={2}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

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

                                    {petsConfirmados.some(p => p.planoEscolhido) && (
                    <div className="border border-blue-200 bg-blue-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-blue-800 mb-1">📅 Planos recorrentes selecionados</p>
                      {petsConfirmados.filter(p => p.planoEscolhido).map(p => (
                        <p key={p.chave} className="text-xs text-blue-700">
                          {p.nome}: {p.planoEscolhido!.nome} ({p.planoEscolhido!.quantidade_banhos} banhos)
                        </p>
                      ))}
                    </div>
                  )}

                                    <div className="border border-gray-200 rounded-lg p-3">
                    <p className="text-sm text-gray-700 mb-2">Forma de pagamento</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormaPagamento('presencial')}
                        className={`text-xs py-2 rounded-lg border transition-colors ${
                          formaPagamento === 'presencial' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
                        }`}
                      >
                        💵 Dinheiro/Cartao na hora
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormaPagamento('pix')}
                        disabled={!tenant?.chave_pix}
                        className={`text-xs py-2 rounded-lg border transition-colors disabled:opacity-40 ${
                          formaPagamento === 'pix' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
                        }`}
                      >
                        📱 Pix
                      </button>
                    </div>

                    {formaPagamento === 'pix' && tenant?.chave_pix && (
                      <div className="bg-blue-50 rounded-lg p-3 mt-3">
                        <p className="text-xs text-blue-700 mb-1">Chave Pix para pagamento antecipado:</p>
                        <p className="text-sm font-medium text-blue-900 break-all">{tenant.chave_pix}</p>
                        <button
                          type="button"
                          onClick={() => { navigator.clipboard.writeText(tenant.chave_pix || ''); alert('Chave copiada!') }}
                          className="text-xs text-blue-600 hover:underline mt-2"
                        >
                          📋 Copiar chave
                        </button>
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
              {petsConfirmados.map(p => p.nome).join(', ')}
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