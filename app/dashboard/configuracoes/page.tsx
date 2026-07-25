'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const PLANOS = [
  { id: 'starter', nome: 'Starter', preco: 'R$ 89,90', desc: '1 profissional' },
  { id: 'premium', nome: 'Premium', preco: 'R$ 189,90', desc: 'Ate 3 profissionais' },
  { id: 'pro', nome: 'Pro', preco: 'R$ 349,90', desc: 'Ate 10 profissionais' },
]

export default function ConfiguracoesPage() {
  const [carregando, setCarregando] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [corPrimaria, setCorPrimaria] = useState('#1a56db')
  const [enviandoLogo, setEnviandoLogo] = useState(false)
  const [salvandoMarca, setSalvandoMarca] = useState(false)
  const [zapiInstanceId, setZapiInstanceId] = useState('')
  const [zapiToken, setZapiToken] = useState('')
  const [whatsappConectado, setWhatsappConectado] = useState(false)
  const [salvandoWhatsapp, setSalvandoWhatsapp] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function carregarTenant() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('tenants')
        .select('zapi_instance_id, zapi_token, whatsapp_conectado, logo_url, cor_primaria')
        .eq('email', user.email)
        .single()

      if (data) {
        setZapiInstanceId(data.zapi_instance_id || '')
        setZapiToken(data.zapi_token || '')
        setWhatsappConectado(data.whatsapp_conectado || false)
        setLogoUrl(data.logo_url || '')
        setCorPrimaria(data.cor_primaria || '#1a56db')
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

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Configuracoes</h2>
      <p className="text-sm text-gray-500 mb-6">Escolha o plano da sua assinatura</p>

      <div className="grid grid-cols-3 gap-4">
        {PLANOS.map(p => (
          <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-sm font-medium text-gray-900">{p.nome}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{p.preco}<span className="text-xs text-gray-400 font-normal">/mes</span></p>
            <p className="text-xs text-gray-400 mt-1 mb-4">{p.desc}</p>
            <button
              onClick={() => assinar(p.id)}
              disabled={carregando === p.id}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {carregando === p.id ? 'Redirecionando...' : 'Assinar'}
            </button>
          </div>
        ))}
      </div>
<div className="mt-8 bg-white border border-gray-100 rounded-2xl p-5 max-w-md">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Personalizacao de marca</h3>

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
      </div>
      <div className="mt-8 bg-white border border-gray-100 rounded-2xl p-5 max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">WhatsApp</h3>
          {whatsappConectado && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Conectado</span>
          )}
        </div>

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
      </div>
    </div>
  )
}