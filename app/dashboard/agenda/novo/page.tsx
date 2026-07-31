'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Servico = { id: string; nome: string; preco: number; duracao_min: number }
type Profissional = { id: string; nome: string; cor_agenda: string }
type Pet = { id: string; nome: string }
type ClienteEncontrado = { id: string; nome: string; pets: Pet[] }

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

export default function NovoAgendamentoPage() {
  const router = useRouter()
  const supabase = createClient()

  const [servicos, setServicos] = useState<Servico[]>([])
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

  const [servicoId, setServicoId] = useState('')
  const [profissionalId, setProfissionalId] = useState('')
  const [data, setData] = useState('')
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([])
  const [horario, setHorario] = useState('')
  const [carregandoHorarios, setCarregandoHorarios] = useState(false)

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  const [tenantTransporte, setTenantTransporte] = useState<{
    endereco_lat: number | null
    endereco_lng: number | null
    preco_por_km: number | null
    valor_minimo_transporte: number | null
  } | null>(null)

  const [precisaTransporte, setPrecisaTransporte] = useState(false)
  const [cepColeta, setCepColeta] = useState('')
  const [enderecoColeta, setEnderecoColeta] = useState('')
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [transporteIdaVolta, setTransporteIdaVolta] = useState(false)
  const [distanciaKm, setDistanciaKm] = useState<number | null>(null)
  const [calculandoDistancia, setCalculandoDistancia] = useState(false)
  const [descontoTransporte, setDescontoTransporte] = useState('0')
  async function buscarCepColeta(cep: string) {
    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return

    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const data = await res.json()

      if (!data.erro) {
        const enderecoCompleto = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`
        setEnderecoColeta(enderecoCompleto)
        await calcularDistanciaTransporte(enderecoCompleto)
      }
    } catch {
      // silencioso
    }
    setBuscandoCep(false)
  }

  async function calcularDistanciaTransporte(endereco: string) {
    if (!tenantTransporte?.endereco_lat || !tenantTransporte?.preco_por_km) return

    setCalculandoDistancia(true)
    try {
      const res = await fetch(`/api/geocodificar?endereco=${encodeURIComponent(endereco)}`)
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
    if (!distanciaKm || !tenantTransporte?.preco_por_km) return 0
    const minimo = Number(tenantTransporte.valor_minimo_transporte || 0)
    const valorPorTrecho = Math.max(distanciaKm * Number(tenantTransporte.preco_por_km), minimo)
    const bruto = valorPorTrecho * (transporteIdaVolta ? 2 : 1)
    const desconto = parseFloat(descontoTransporte) || 0
    return Math.max(bruto - desconto, 0)
  }

  async function carregarDados() {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, endereco_lat, endereco_lng, preco_por_km, valor_minimo_transporte')
      .single()
    if (!tenant) {
      setCarregando(false)
      return
    }

    const { data: servicosData } = await supabase
      .from('services').select('id, nome, preco, duracao_min').eq('tenant_id', tenant.id).eq('ativo', true).order('nome')
    const { data: profissionaisData } = await supabase
      .from('professionals').select('id, nome, cor_agenda').eq('tenant_id', tenant.id).eq('ativo', true).order('nome')

    setServicos(servicosData || [])
    setProfissionais(profissionaisData || [])
    setTenantTransporte({
      endereco_lat: tenant.endereco_lat,
      endereco_lng: tenant.endereco_lng,
      preco_por_km: tenant.preco_por_km,
      valor_minimo_transporte: tenant.valor_minimo_transporte,
    })
    setCarregando(false)
  }

  useEffect(() => { carregarDados() }, [])

  async function buscarSugestoes(texto: string) {
    setBuscaTexto(texto)
    setClienteEncontrado(null)

    if (texto.trim().length < 2) {
      setSugestoes([])
      return
    }

    setBuscandoCliente(true)

    const { data: tenant } = await supabase.from('tenants').select('id').single()
    if (!tenant) return

    const { data: clientes } = await supabase
      .from('customers')
      .select('id, nome, telefone, pets ( id, nome )')
      .eq('tenant_id', tenant.id)
      .or(`nome.ilike.%${texto}%,telefone.ilike.%${texto}%`)
      .limit(8)

    setSugestoes((clientes as any) || [])
    setBuscandoCliente(false)
  }

  function selecionarCliente(cliente: any) {
    setClienteEncontrado(cliente)
    setNomeCliente(cliente.nome)
    setTelefone(cliente.telefone)
    setBuscaTexto('')
    setSugestoes([])
  }

  async function buscarHorarios() {
    if (!data || !servicoId) return
    setCarregandoHorarios(true)
    setHorario('')

    const { data: tenant } = await supabase.from('tenants').select('id').single()
    if (!tenant) return

    const servico = servicos.find(s => s.id === servicoId)
    if (!servico) return

    const dataObj = new Date(data + 'T00:00:00')
    const diaSemana = dataObj.getDay()

    const profissionaisParaChecar = profissionalId ? profissionais.filter(p => p.id === profissionalId) : profissionais
    let todosHorarios: string[] = []

    for (const prof of profissionaisParaChecar) {
      const { data: disponibilidade } = await supabase
        .from('professional_availability')
        .select('hora_inicio, hora_fim')
        .eq('professional_id', prof.id)
        .eq('dia_semana', diaSemana)
        .maybeSingle()

      if (!disponibilidade) continue

      const horariosBase = gerarHorarios(disponibilidade.hora_inicio.slice(0, 5), disponibilidade.hora_fim.slice(0, 5), servico.duracao_min)

      const { data: agendamentosExistentes } = await supabase
        .from('appointments')
        .select('inicio')
        .eq('professional_id', prof.id)
        .gte('inicio', data + 'T00:00:00')
        .lte('inicio', data + 'T23:59:59')
        .neq('status', 'cancelado')

      const ocupados = (agendamentosExistentes || []).map(a => {
        const d = new Date(a.inicio)
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      })

      todosHorarios = [...todosHorarios, ...horariosBase.filter(h => !ocupados.includes(h))]
    }

    setHorariosDisponiveis(Array.from(new Set(todosHorarios)).sort())
    setCarregandoHorarios(false)
  }

  useEffect(() => { buscarHorarios() }, [data, servicoId, profissionalId])
  async function salvarAgendamento() {
    setErro('')

    if (!telefone || !nomeCliente || !servicoId || !data || !horario) {
      setErro('Preencha telefone, nome, servico, data e horario.')
      return
    }

    const petFinal = clienteEncontrado ? petSelecionado : nomePetNovo
    if (!petFinal) {
      setErro('Informe ou selecione o pet.')
      return
    }

    setSalvando(true)

    const { data: tenant } = await supabase.from('tenants').select('id').single()
    if (!tenant) { setSalvando(false); return }

    let clienteId = clienteEncontrado?.id

    if (!clienteId) {
      const { data: novoCliente, error: erroCliente } = await supabase
        .from('customers')
        .insert({ tenant_id: tenant.id, nome: nomeCliente, telefone })
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

    if (!clienteEncontrado || !petSelecionado) {
      const { data: novoPet, error: erroPet } = await supabase
        .from('pets')
        .insert({ tenant_id: tenant.id, customer_id: clienteId, nome: nomePetNovo, porte: 'medio' })
        .select('id')
        .single()

      if (erroPet || !novoPet) {
        setErro('Erro ao cadastrar pet: ' + erroPet?.message)
        setSalvando(false)
        return
      }
      petId = novoPet.id
    }

    const servico = servicos.find(s => s.id === servicoId)
    const inicio = new Date(`${data}T${horario}:00`)
    const fim = new Date(inicio.getTime() + (servico?.duracao_min || 60) * 60000)

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

    const valorTransporteFinal = precisaTransporte ? calcularValorTransporteFinal() : 0

    const { error: erroAgendamento } = await supabase.from('appointments').insert({
      tenant_id: tenant.id,
      customer_id: clienteId,
      pet_id: petId,
      professional_id: profId || null,
      service_id: servicoId,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      status: 'agendado',
      origem: 'telefone',
      preco_cobrado: servico?.preco || 0,
      precisa_transporte: precisaTransporte,
      endereco_coleta: precisaTransporte ? enderecoColeta : null,
      endereco_entrega: precisaTransporte ? enderecoColeta : null,
      distancia_km: precisaTransporte ? distanciaKm : null,
      transporte_ida_volta: precisaTransporte ? transporteIdaVolta : false,
      valor_transporte: valorTransporteFinal,
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
      <button onClick={() => router.push('/dashboard/agenda')} className="text-xs text-blue-600 mb-4 hover:underline">
        ← Voltar para agenda
      </button>

      <h2 className="text-xl font-semibold text-gray-900 mb-1">Novo agendamento</h2>
      <p className="text-sm text-gray-500 mb-6">Para atendimentos recebidos por telefone, WhatsApp ou balcao</p>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4">
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Buscar cliente (nome ou telefone)</label>
          <input
            type="text"
            value={clienteEncontrado ? clienteEncontrado.nome : buscaTexto}
            onChange={e => buscarSugestoes(e.target.value)}
            placeholder="Digite o nome ou telefone..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {buscandoCliente && <p className="text-xs text-gray-400 mt-1">Buscando...</p>}

          {sugestoes.length > 0 && (
            <div className="border border-gray-200 rounded-lg mt-1 overflow-hidden">
              {sugestoes.map(s => (
                <button
                  key={s.id}
                  onClick={() => selecionarCliente(s)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  {s.nome} • {(s as any).telefone}
                </button>
              ))}
            </div>
          )}

          {clienteEncontrado && (
            <p className="text-xs text-green-600 mt-1">
              Cliente selecionado: {clienteEncontrado.nome} 🐾{' '}
              <button onClick={() => { setClienteEncontrado(null); setNomeCliente(''); setTelefone(''); }} className="underline">
                trocar
              </button>
            </p>
          )}

          {!clienteEncontrado && (
            <div className="mt-2">
              <label className="text-xs text-gray-500 mb-1 block">Telefone (se for cliente novo)</label>
              <input
                type="text"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                placeholder="(35) 99999-9999"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">Nome do cliente</label>
          <input
            type="text"
            value={nomeCliente}
            onChange={e => setNomeCliente(e.target.value)}
            disabled={!!clienteEncontrado}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
        </div>

        {clienteEncontrado && clienteEncontrado.pets.length > 0 ? (
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Pet</label>
            <select
              value={petSelecionado}
              onChange={e => setPetSelecionado(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione...</option>
              {clienteEncontrado.pets.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
        ) : (
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

        <div>
          <label className="text-sm text-gray-600 mb-1 block">Servico</label>
          <select
            value={servicoId}
            onChange={e => setServicoId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione...</option>
            {servicos.map(s => <option key={s.id} value={s.id}>{s.nome} - R$ {Number(s.preco).toFixed(2)}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">Profissional (opcional)</label>
          <select
            value={profissionalId}
            onChange={e => setProfissionalId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Qualquer disponivel</option>
            {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>

        <div className="border border-gray-200 rounded-lg p-3">
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
                    onBlur={e => buscarCepColeta(e.target.value)}
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
                  onChange={e => setEnderecoColeta(e.target.value)}
                  placeholder="Rua, numero, bairro"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={transporteIdaVolta}
                  onChange={e => setTransporteIdaVolta(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-xs text-gray-600">Ida e volta (senao, somente ida)</span>
              </label>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Desconto no transporte (R$)</label>
                <input
                  type="number"
                  value={descontoTransporte}
                  onChange={e => setDescontoTransporte(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {calculandoDistancia && <p className="text-xs text-gray-400">Calculando distancia...</p>}

              {distanciaKm !== null && tenantTransporte?.preco_por_km && (
                <div className="bg-blue-50 rounded-lg p-2.5">
                  <p className="text-xs text-blue-700">
                    Distancia: {distanciaKm.toFixed(1)} km {transporteIdaVolta ? '(ida e volta)' : '(somente ida)'}
                  </p>
                  <p className="text-sm font-medium text-blue-700 mt-0.5">
                    Valor do transporte: R$ {calcularValorTransporteFinal().toFixed(2).replace('.', ',')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">Data</label>
          <input
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {data && servicoId && (
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

        {erro && <p className="text-red-500 text-sm">{erro}</p>}

        <button
          onClick={salvarAgendamento}
          disabled={salvando}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Criar agendamento'}
        </button>
      </div>
    </div>
  )
}