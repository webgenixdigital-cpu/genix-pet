'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Tenant = {
  id: string
  nome: string
  slug: string
  logo_url: string | null
  cor_primaria: string
}

type Servico = {
  id: string
  nome: string
  descricao: string | null
  preco: number
  duracao_min: number
}

type Profissional = {
  id: string
  nome: string
  cor_agenda: string
}
type Produto = {
  id: string
  nome: string
  preco_venda: number
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
  return data.toISOString().split('T')[0]
}
export default function AgendarPage() {
  const params = useParams()
  const slug = params.slug as string
  const supabase = createClient()

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [servicos, setServicos] = useState<Servico[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>([])
  const [carregando, setCarregando] = useState(true)
  const [naoEncontrado, setNaoEncontrado] = useState(false)

  const [etapa, setEtapa] = useState(1)
  const [servicoSelecionado, setServicoSelecionado] = useState<Servico | null>(null)
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<Profissional | null>(null)
  const [dataSelecionada, setDataSelecionada] = useState<string>('')
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([])
  const [horarioSelecionado, setHorarioSelecionado] = useState<string>('')
  const [carregandoHorarios, setCarregandoHorarios] = useState(false)
  const [nomeCliente, setNomeCliente] = useState('')
  const [telefoneCliente, setTelefoneCliente] = useState('')
  const [nomePet, setNomePet] = useState('')
  const [portePet, setPortePet] = useState('medio')
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
  const [agendamentoConfirmado, setAgendamentoConfirmado] = useState(false)
  const [precisaTransporte, setPrecisaTransporte] = useState(false)
  const [enderecoColeta, setEnderecoColeta] = useState('')
  const [enderecoEntrega, setEnderecoEntrega] = useState('')
  const [ehRecorrente, setEhRecorrente] = useState(false)
  const [frequenciaMensal, setFrequenciaMensal] = useState(1)
  const [mesmoEndereco, setMesmoEndereco] = useState(true)
  const [cepColeta, setCepColeta] = useState('')
  const [buscandoCep, setBuscandoCep] = useState(false)

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
      }
    } catch {
      // silencioso - usuario preenche manualmente se falhar
    }
    setBuscandoCep(false)
  }

  async function buscarHorarios(data: string) {
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
        servicoSelecionado?.duracao_min || 60
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
  async function confirmarAgendamento() {
    setErroAgendamento('')

    if (!nomeCliente || !telefoneCliente || !nomePet) {
      setErroAgendamento('Preencha todos os campos obrigatorios.')
      return
    }

    if (!tenant || !servicoSelecionado) return

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

    const { data: clienteExistente } = await supabase
      .from('customers')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('telefone', telefoneCliente)
      .maybeSingle()

    let clienteId = clienteExistente?.id

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

    const { data: novoPet, error: erroPet } = await supabase
      .from('pets')
      .insert({
        tenant_id: tenant.id,
        customer_id: clienteId,
        nome: nomePet,
        especie: especiePet,
        porte: portePet,
        raca: racaPet || null,
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

    const inicio = new Date(`${dataSelecionada}T${horarioSelecionado}:00`)
    const fim = new Date(inicio.getTime() + servicoSelecionado.duracao_min * 60000)

    const { data: agendamentoCriado, error: erroAgendamentoInsert } = await supabase
      .from('appointments')
      .insert({
        tenant_id: tenant.id,
        customer_id: clienteId,
        pet_id: novoPet.id,
        professional_id: profissionalId,
        service_id: servicoSelecionado.id,
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
        status: 'em_espera',
        origem: 'online',
        preco_cobrado: servicoSelecionado.preco,
        precisa_transporte: precisaTransporte,
        endereco_coleta: precisaTransporte ? enderecoColeta : null,
        endereco_entrega: precisaTransporte ? enderecoEntrega : null,
        is_recorrente: ehRecorrente,
        frequencia_mensal: ehRecorrente ? frequenciaMensal : null,
      })
      .select('id')
      .single()

    if (erroAgendamentoInsert || !agendamentoCriado) {
      setErroAgendamento('Erro ao criar agendamento: ' + erroAgendamentoInsert?.message)
      setSalvandoAgendamento(false)
      return
    }

    if (ehRecorrente) {
      const intervalosPorFrequencia: Record<number, number> = {
        1: 30,
        2: 14,
        4: 7,
      }
      const intervaloDias = intervalosPorFrequencia[frequenciaMensal] || 30
      const totalFuturos = 6
      const futuros = []

      for (let i = 1; i <= totalFuturos; i++) {
        const proximoInicio = new Date(inicio.getTime() + intervaloDias * i * 24 * 60 * 60 * 1000)
        const proximoFim = new Date(proximoInicio.getTime() + servicoSelecionado.duracao_min * 60000)

        futuros.push({
          tenant_id: tenant.id,
          customer_id: clienteId,
          pet_id: novoPet.id,
          professional_id: profissionalId,
          service_id: servicoSelecionado.id,
          inicio: proximoInicio.toISOString(),
          fim: proximoFim.toISOString(),
          status: 'em_espera',
          origem: 'online',
          preco_cobrado: servicoSelecionado.preco,
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
        servico: servicoSelecionado.nome,
        data: new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR'),
        horario: horarioSelecionado,
      }),
    }).catch(() => {})

    setSalvandoAgendamento(false)
    setAgendamentoConfirmado(true)
  }

  useEffect(() => {
    async function carregar() {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id, nome, slug, logo_url, cor_primaria')
        .eq('slug', slug)
        .single()

      if (!tenantData) {
        setNaoEncontrado(true)
        setCarregando(false)
        return
      }

      setTenant(tenantData)

      const { data: servicosData } = await supabase
        .from('services')
        .select('id, nome, descricao, preco, duracao_min')
        .eq('tenant_id', tenantData.id)
        .eq('ativo', true)
        .order('nome')

      const { data: profissionaisData } = await supabase
        .from('professionals')
        .select('id, nome, cor_agenda')
        .eq('tenant_id', tenantData.id)
        .eq('ativo', true)
        .order('nome')

      const { data: produtosData } = await supabase
        .from('products')
        .select('id, nome, preco_venda')
        .eq('tenant_id', tenantData.id)
        .eq('ativo', true)
        .order('nome')

      setServicos(servicosData || [])
      setProfissionais(profissionaisData || [])
      setProdutos(produtosData || [])
      setCarregando(false)
    }

    carregar()
  }, [slug])

  function selecionarServico(s: Servico) {
    setServicoSelecionado(s)
    setEtapa(2)
  }

  function selecionarProfissional(p: Profissional | null) {
    setProfissionalSelecionado(p)
    setEtapa(3)
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
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-semibold text-gray-900">{tenant?.nome}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Agende seu horario online</p>
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
            <h2 className="text-sm font-medium text-gray-900 mb-4">Escolha o servico</h2>
            <div className="flex flex-col gap-3">
              {servicos.map(s => (
                <button
                  key={s.id}
                  onClick={() => selecionarServico(s)}
                  className="bg-white border border-gray-100 rounded-xl p-4 text-left hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{s.nome}</p>
                    <p className="text-sm font-medium text-gray-900">
                      R$ {Number(s.preco).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  {s.descricao && (
                    <p className="text-xs text-gray-400 mt-1">{s.descricao}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{s.duracao_min} min</p>
                </button>
              ))}
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

        {etapa === 3 && (
          <div>
            <button
              onClick={() => setEtapa(2)}
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
                  <div className="grid grid-cols-4 gap-2">
                    {horariosDisponiveis.map(h => (
                      <button
                        key={h}
                        onClick={() => {
                          setHorarioSelecionado(h)
                          setEtapa(4)
                        }}
                        className="border border-gray-200 rounded-lg py-2 text-sm hover:border-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
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

            <div className="bg-blue-50 rounded-xl p-3 mb-6">
              <p className="text-xs text-blue-700">
                {servicoSelecionado?.nome} • {new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR')} as {horarioSelecionado}
              </p>
            </div>

            <h2 className="text-sm font-medium text-gray-900 mb-4">Seus dados</h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Seu nome</label>
                <input
                  type="text"
                  value={nomeCliente}
                  onChange={e => setNomeCliente(e.target.value)}
                  placeholder="Maria Silva"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Seu telefone</label>
                <input
                  type="text"
                  value={telefoneCliente}
                  onChange={e => setTelefoneCliente(e.target.value)}
                  placeholder="(35) 99999-9999"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Especie</label>
                  <select
                    value={especiePet}
                    onChange={e => {
                      setEspeciePet(e.target.value)
                      setRacaPet('')
                    }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cachorro">Cachorro</option>
                    <option value="gato">Gato</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Porte</label>
                  <select
                    value={portePet}
                    onChange={e => setPortePet(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pequeno">Pequeno</option>
                    <option value="medio">Medio</option>
                    <option value="grande">Grande</option>
                    <option value="gigante">Gigante</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Raca</label>
                <select
                  value={racaPet}
                  onChange={e => setRacaPet(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {(especiePet === 'cachorro' ? RACAS_CACHORRO : especiePet === 'gato' ? RACAS_GATO : ['Outra']).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

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

                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Pelagem</label>
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

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={castradoPet}
                  onChange={e => setCastradoPet(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Castrado</span>
              </label>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Data de nascimento (opcional)</label>
                <input
                  type="date"
                  value={dataNascimentoPet}
                  onChange={e => setDataNascimentoPet(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-medium text-gray-500 mb-3 uppercase">Saude (opcional)</p>

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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50 mt-2"
              >
                {salvandoAgendamento ? 'Confirmando...' : 'Confirmar agendamento'}
              </button>
            </div>
          </div>
        )}

        {agendamentoConfirmado && (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-yellow-600 text-xl">⏳</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Aguardando aprovacao</h2>
            <p className="text-sm text-gray-500">
              {servicoSelecionado?.nome} para {nomePet}
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
    </div>
  )
}