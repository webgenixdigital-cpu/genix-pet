'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const PLANOS = [
  {
        id: 'starter', nome: 'Starter', preco: 'R$ 179,90', desc: 'Ate 2 profissionais',
    itens: ['Clientes e pets ilimitados', 'Modulo financeiro e comissoes', 'Produtos e pacotes de servico', 'Agendamentos recorrentes'],
  },
  {
    id: 'premium', nome: 'Premium', preco: 'R$ 247,90', desc: 'Ate 4 profissionais',
    itens: ['Tudo do Starter', 'Catalogo personalizado com link proprio', 'Divulgacao externa do catalogo', 'Relatorio fiscal', 'Controle de estoque avancado'],
  },
  {
    id: 'pro', nome: 'Pro', preco: 'R$ 379,90', desc: 'Ate 10 profissionais',
    itens: ['Tudo do Premium', 'WhatsApp automatico', 'Lembretes de agendamento automaticos', 'Mensagens de pos-venda automaticas', 'Prospeccao automatica de clientes inativos', 'Suporte prioritario'],
  },
]

function SecaoRetravel({
  titulo,
  resumo,
  icone,
  badge,
  aberta,
  onToggle,
  children,
}: {
  titulo: string
  resumo?: string
  icone: string
  badge?: React.ReactNode
  aberta: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icone}</span>
          <div>
            <p className="text-sm font-medium text-gray-900">{titulo}</p>
            {resumo && !aberta && <p className="text-xs text-gray-400 mt-0.5">{resumo}</p>}
          </div>
          {badge}
        </div>
        <span className={`text-gray-400 transition-transform ${aberta ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {aberta && (
        <div className="px-5 pb-5 pt-1 border-t border-gray-50">
          {children}
        </div>
      )}
    </div>
  )
}

function ConfiguracoesConteudo() {
  const searchParams = useSearchParams()
  const bloqueado = searchParams.get('bloqueado') === '1'
  const bloqueadoPorPlano = searchParams.get('bloqueado') === 'plano'
  const [carregando, setCarregando] = useState<string | null>(null)

  const [secaoAberta, setSecaoAberta] = useState<string | null>(null)
  function toggleSecao(nome: string) {
    setSecaoAberta(prev => prev === nome ? null : nome)
  }

  const [logoUrl, setLogoUrl] = useState('')
  const [corPrimaria, setCorPrimaria] = useState('#1a56db')
  const [enviandoLogo, setEnviandoLogo] = useState(false)
  const [salvandoMarca, setSalvandoMarca] = useState(false)

  const [cepBase, setCepBase] = useState('')
  const [ruaBase, setRuaBase] = useState('')
  const [numeroBase, setNumeroBase] = useState('')
  const [bairroBase, setBairroBase] = useState('')
  const [cidadeBase, setCidadeBase] = useState('')
  const [precoPorKm, setPrecoPorKm] = useState('')
  const [valorMinimoTransporte, setValorMinimoTransporte] = useState('5.00')
  const [salvandoTransporte, setSalvandoTransporte] = useState(false)
  const [geocodificando, setGeocodificando] = useState(false)

  const [faixasKm, setFaixasKm] = useState<{ id?: string; raio_min_km: string; raio_max_km: string; valor_fixo: string }[]>([])
  const [salvandoFaixas, setSalvandoFaixas] = useState(false)

  const [zapiInstanceId, setZapiInstanceId] = useState('')
  const [zapiToken, setZapiToken] = useState('')
  const [whatsappConectado, setWhatsappConectado] = useState(false)
  const [salvandoWhatsapp, setSalvandoWhatsapp] = useState(false)
    const [temWhatsappNoPlano, setTemWhatsappNoPlano] = useState(true)
    const [apenasCatalogo, setApenasCatalogo] = useState(false)
  const [chavePix, setChavePix] = useState('')
  const [salvandoChavePix, setSalvandoChavePix] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function carregarTenant() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

            const { data } = await supabase
        .from('tenants')
        .select('id, zapi_instance_id, zapi_token, whatsapp_conectado, logo_url, cor_primaria, plan_id, preco_por_km, valor_minimo_transporte, chave_pix')
        .eq('email', user.email)
        .single()

           if (data) {
        setZapiInstanceId(data.zapi_instance_id || '')
        setZapiToken(data.zapi_token || '')
        setWhatsappConectado(data.whatsapp_conectado || false)
        setLogoUrl(data.logo_url || '')
        setCorPrimaria(data.cor_primaria || '#1a56db')
        setPrecoPorKm(data.preco_por_km?.toString() || '')
        setValorMinimoTransporte(data.valor_minimo_transporte?.toString() || '5.00')
        setChavePix(data.chave_pix || '')

                if (data.plan_id) {
          const { data: plano } = await supabase
            .from('plans')
            .select('tem_whatsapp, apenas_catalogo')
            .eq('id', data.plan_id)
            .single()

          setTemWhatsappNoPlano(plano?.tem_whatsapp ?? true)
          setApenasCatalogo(plano?.apenas_catalogo ?? false)
        }

        const { data: faixas } = await supabase
          .from('transport_price_tiers')
          .select('id, raio_min_km, raio_max_km, valor_fixo')
          .eq('tenant_id', data.id)
          .order('raio_min_km')

        setFaixasKm((faixas || []).map(f => ({
          id: f.id,
          raio_min_km: String(f.raio_min_km),
          raio_max_km: String(f.raio_max_km),
          valor_fixo: String(f.valor_fixo),
        })))
      }
    }

    carregarTenant()
  }, [])

  async function enviarLogo(arquivo: File) {
    setEnviandoLogo(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: tenant } = await supabase.from('tenants').select('id').eq('email', user.email).single()
    if (!tenant) return

    const nomeArquivo = `${tenant.id}-${Date.now()}.${arquivo.name.split('.').pop()}`

    const { error: erroUpload } = await supabase.storage
      .from('logos')
      .upload(nomeArquivo, arquivo)

    if (erroUpload) {
      alert('Erro ao enviar logo: ' + erroUpload.message)
      setEnviandoLogo(false)
      return
    }

    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(nomeArquivo)
    setLogoUrl(urlData.publicUrl)
    setEnviandoLogo(false)
  }
  async function salvarChavePix() {
    setSalvandoChavePix(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSalvandoChavePix(false); return }

    await supabase
      .from('tenants')
      .update({ chave_pix: chavePix || null })
      .eq('email', user.email)

    setSalvandoChavePix(false)
    alert('Chave Pix salva!')
  }
  async function salvarMarca() {
    setSalvandoMarca(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('tenants')
      .update({ logo_url: logoUrl || null, cor_primaria: corPrimaria })
      .eq('email', user.email)

    setSalvandoMarca(false)
  }

  async function buscarCepBase(cep: string) {
    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setRuaBase(data.logradouro || '')
        setBairroBase(data.bairro || '')
        setCidadeBase(`${data.localidade} - ${data.uf}`)
      }
    } catch {}
  }

  async function salvarTransporte() {
    setSalvandoTransporte(true)
    setGeocodificando(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let lat = null
    let lng = null

    if (ruaBase) {
      const cidadeSemUf = cidadeBase.split(' - ')[0]
      const uf = cidadeBase.split(' - ')[1] || ''

      const params = new URLSearchParams({
        rua: ruaBase,
        numero: numeroBase,
        cidade: cidadeSemUf,
        uf: uf,
      })

      const res = await fetch(`/api/geocodificar?${params.toString()}`)
      const coords = await res.json()
      if (coords.lat) {
        lat = coords.lat
        lng = coords.lng
      }
    }

    setGeocodificando(false)

    await supabase
      .from('tenants')
      .update({
        endereco_lat: lat,
        endereco_lng: lng,
        preco_por_km: parseFloat(precoPorKm) || 0,
        valor_minimo_transporte: parseFloat(valorMinimoTransporte) || 0,
      })
      .eq('email', user.email)

    setSalvandoTransporte(false)
  }

  function adicionarFaixa() {
    setFaixasKm(prev => [...prev, { raio_min_km: '', raio_max_km: '', valor_fixo: '' }])
  }

  function atualizarFaixa(index: number, campo: 'raio_min_km' | 'raio_max_km' | 'valor_fixo', valor: string) {
    setFaixasKm(prev => prev.map((f, i) => i === index ? { ...f, [campo]: valor } : f))
  }

  function removerFaixaLocal(index: number) {
    setFaixasKm(prev => prev.filter((_, i) => i !== index))
  }

  async function salvarFaixas() {
    setSalvandoFaixas(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSalvandoFaixas(false); return }

    const { data: tenant } = await supabase.from('tenants').select('id').eq('email', user.email).single()
    if (!tenant) { setSalvandoFaixas(false); return }

    await supabase.from('transport_price_tiers').delete().eq('tenant_id', tenant.id)

    const validas = faixasKm.filter(f => f.raio_min_km && f.raio_max_km && f.valor_fixo)

    if (validas.length > 0) {
      await supabase.from('transport_price_tiers').insert(
        validas.map(f => ({
          tenant_id: tenant.id,
          raio_min_km: parseFloat(f.raio_min_km),
          raio_max_km: parseFloat(f.raio_max_km),
          valor_fixo: parseFloat(f.valor_fixo),
        }))
      )
    }

    setSalvandoFaixas(false)
    alert('Faixas de transporte salvas!')
  }

  async function salvarWhatsapp() {
    setSalvandoWhatsapp(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('tenants')
      .update({
        zapi_instance_id: zapiInstanceId,
        zapi_token: zapiToken,
        whatsapp_conectado: true,
      })
      .eq('email', user.email)

    setWhatsappConectado(true)
    setSalvandoWhatsapp(false)
  }

      async function assinar(plano: string) {
    setCarregando(plano)

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plano }),
    })

    const data = await res.json()

    if (data.url) {
      window.location.href = data.url
    } else {
      alert('Erro ao iniciar checkout: ' + (data.error || 'desconhecido'))
      setCarregando(null)
    }
  }

  async function assinarComPix(plano: string) {
    setCarregando(plano + '-pix')

    const res = await fetch('/api/checkout-pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plano }),
    })

    const data = await res.json()

    if (data.url) {
      window.location.href = data.url
    } else {
      alert('Erro ao iniciar checkout: ' + (data.error || 'desconhecido'))
      setCarregando(null)
    }
  }

  return (
    <div className="max-w-2xl">
      {bloqueado && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">⏳</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-1">Seu periodo de teste acabou</h3>
              <p className="text-sm text-gray-500">
                Escolha um plano para continuar usando o Genix Pet sem interrupcoes
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANOS.map(p => (
                <div key={p.id} className="border border-gray-200 rounded-2xl p-4">
                  <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {p.preco}<span className="text-xs text-gray-400 font-normal">/mes</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1 mb-3">{p.desc}</p>
                  <ul className="flex flex-col gap-1.5 mb-4">
                    {p.itens.map(item => (
                      <li key={item} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-green-600 flex-shrink-0">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => assinar(p.id)}
                    disabled={carregando === p.id}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {carregando === p.id ? 'Redirecionando...' : 'Assinar este plano'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {bloqueadoPorPlano && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6">
          <p className="text-sm text-orange-700 font-medium">
            Essa funcionalidade não está disponível no seu plano atual.
          </p>
          <p className="text-xs text-orange-600 mt-1">
            Faça upgrade para um plano superior para desbloquear essa área.
          </p>
        </div>
      )}

      <h2 className="text-xl font-semibold text-gray-900 mb-1">Configuracoes</h2>
      <p className="text-sm text-gray-500 mb-6">Centralize a personalizacao do seu Genix Pet</p>

      <SecaoRetravel
        titulo="Plano e assinatura"
        resumo="Veja e altere seu plano"
        icone="💳"
        aberta={secaoAberta === 'planos'}
        onToggle={() => toggleSecao('planos')}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANOS.map(p => (
            <div key={p.id} className="border border-gray-100 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-900">{p.nome}</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{p.preco}<span className="text-xs text-gray-400 font-normal">/mes</span></p>
              <p className="text-xs text-gray-400 mt-1 mb-3">{p.desc}</p>
              <ul className="flex flex-col gap-1 mb-3">
                {p.itens.map(item => (
                  <li key={item} className="text-xs text-gray-600 flex items-start gap-1.5">
                    <span className="text-green-600 flex-shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
                             <button
                onClick={() => assinar(p.id)}
                disabled={carregando === p.id}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {carregando === p.id ? 'Redirecionando...' : 'Assinar'}
              </button>
            </div>
          ))}
        </div>
            </SecaoRetravel>

      {!apenasCatalogo && (
      <SecaoRetravel
        titulo="Pagamento"
        resumo="Chave Pix para receber pagamentos antecipados"
        icone="💳"
        aberta={secaoAberta === 'pagamento'}
        onToggle={() => toggleSecao('pagamento')}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Chave Pix</label>
            <input
              type="text"
              value={chavePix}
              onChange={e => setChavePix(e.target.value)}
              placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatoria"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Sera exibida ao cliente quando ele escolher pagar via Pix no agendamento online
            </p>
          </div>
          <button
            onClick={salvarChavePix}
            disabled={salvandoChavePix}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {salvandoChavePix ? 'Salvando...' : 'Salvar chave Pix'}
          </button>
        </div>
      </SecaoRetravel>
      )}

      {!apenasCatalogo && (
      <SecaoRetravel
        titulo="Transporte por distancia"
        resumo="Endereco base, preco por km e faixas fixas"
        icone="🚐"
        aberta={secaoAberta === 'transporte'}
        onToggle={() => toggleSecao('transporte')}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">CEP</label>
            <input
              type="text"
              value={cepBase}
              onChange={e => setCepBase(e.target.value)}
              onBlur={e => buscarCepBase(e.target.value)}
              placeholder="37700-000"
              maxLength={9}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Rua</label>
            <input
              type="text"
              value={ruaBase}
              onChange={e => setRuaBase(e.target.value)}
              placeholder="Rua das Flores"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <div className="w-24">
              <label className="text-sm text-gray-600 mb-1 block">Numero</label>
              <input
                type="text"
                value={numeroBase}
                onChange={e => setNumeroBase(e.target.value)}
                placeholder="123"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-600 mb-1 block">Bairro</label>
              <input
                type="text"
                value={bairroBase}
                onChange={e => setBairroBase(e.target.value)}
                placeholder="Centro"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Cidade - UF</label>
            <input
              type="text"
              value={cidadeBase}
              onChange={e => setCidadeBase(e.target.value)}
              placeholder="Pocos de Caldas - MG"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Usado como ponto de partida para calcular a distancia</p>
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Preco por km (R$)</label>
            <input
              type="number"
              value={precoPorKm}
              onChange={e => setPrecoPorKm(e.target.value)}
              placeholder="2.50"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Valor minimo do transporte (R$)</label>
            <input
              type="number"
              value={valorMinimoTransporte}
              onChange={e => setValorMinimoTransporte(e.target.value)}
              placeholder="5.00"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Aplicado quando o calculo por km ficar abaixo desse valor</p>
          </div>

          <button
            onClick={salvarTransporte}
            disabled={salvandoTransporte}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {geocodificando ? 'Localizando endereco...' : salvandoTransporte ? 'Salvando...' : 'Salvar configuracao de transporte'}
          </button>

          <div className="border-t border-gray-100 pt-4 mt-2">
            <p className="text-sm font-medium text-gray-700 mb-1">Faixas de valor fixo por distancia (opcional)</p>
            <p className="text-xs text-gray-400 mb-3">
              Se a distancia calculada cair dentro de uma faixa, o valor fixo sobrepoe o calculo por km
            </p>

            <div className="flex flex-col gap-2">
              {faixasKm.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="number"
                    value={f.raio_min_km}
                    onChange={e => atualizarFaixa(i, 'raio_min_km', e.target.value)}
                    placeholder="De (km)"
                    className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-400">ate</span>
                  <input
                    type="number"
                    value={f.raio_max_km}
                    onChange={e => atualizarFaixa(i, 'raio_max_km', e.target.value)}
                    placeholder="Ate (km)"
                    className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-400">=</span>
                  <input
                    type="number"
                    value={f.valor_fixo}
                    onChange={e => atualizarFaixa(i, 'valor_fixo', e.target.value)}
                    placeholder="R$"
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => removerFaixaLocal(i)}
                    className="text-red-500 hover:text-red-700 text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={adicionarFaixa}
              className="text-xs text-blue-600 hover:underline mt-2"
            >
              + Adicionar faixa
            </button>

            <button
              onClick={salvarFaixas}
              disabled={salvandoFaixas}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50 mt-3"
            >
              {salvandoFaixas ? 'Salvando...' : 'Salvar faixas'}
            </button>
          </div>
        </div>
            </SecaoRetravel>
      )}

      {!apenasCatalogo && (
      <SecaoRetravel
        titulo="WhatsApp"
        resumo={whatsappConectado ? 'Conectado' : 'Nao conectado'}
        icone="💬"
        badge={whatsappConectado ? (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Conectado</span>
        ) : undefined}
        aberta={secaoAberta === 'whatsapp'}
        onToggle={() => toggleSecao('whatsapp')}
      >
        {!temWhatsappNoPlano && (
          <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 mb-4">
            <p className="text-xs text-orange-700">
              🔒 O WhatsApp automático está disponível a partir do plano Pro.
              <Link href="#planos" className="underline font-medium ml-1">Fazer upgrade</Link>
            </p>
          </div>
        )}

        <p className="text-xs text-gray-400 mb-4">
          Cole os dados fornecidos pelo suporte para ativar os lembretes automaticos
        </p>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Instance ID</label>
            <input
              type="text"
              value={zapiInstanceId}
              onChange={e => setZapiInstanceId(e.target.value)}
              placeholder="Fornecido pelo suporte"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Token</label>
            <input
              type="text"
              value={zapiToken}
              onChange={e => setZapiToken(e.target.value)}
              placeholder="Fornecido pelo suporte"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={salvarWhatsapp}
            disabled={salvandoWhatsapp}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {salvandoWhatsapp ? 'Salvando...' : 'Salvar e conectar'}
          </button>
        </div>
            </SecaoRetravel>
      )}

      {!apenasCatalogo && (
      <SecaoRetravel
        titulo="Personalizacao de marca"
        resumo="Logo e cor do seu pet shop"
        icone="🎨"
        aberta={secaoAberta === 'marca'}
        onToggle={() => toggleSecao('marca')}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-600 mb-2 block">Logo do pet shop</label>
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-lg object-cover mb-2 border border-gray-200" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={e => e.target.files?.[0] && enviarLogo(e.target.files[0])}
              className="text-sm"
            />
            {enviandoLogo && <p className="text-xs text-gray-400 mt-1">Enviando...</p>}
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Cor principal</label>
            <input
              type="color"
              value={corPrimaria}
              onChange={e => setCorPrimaria(e.target.value)}
              className="w-12 h-10 rounded cursor-pointer border border-gray-200"
            />
          </div>

          <button
            onClick={salvarMarca}
            disabled={salvandoMarca}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {salvandoMarca ? 'Salvando...' : 'Salvar marca'}
          </button>
        </div>
            </SecaoRetravel>
      )}
    </div>
  )
}

export default function ConfiguracoesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-gray-400">Carregando...</div>}>
      <ConfiguracoesConteudo />
    </Suspense>
  )
}