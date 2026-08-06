'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

type Mensagem = {
  id: string
  remetente: string
  mensagem: string
  criado_em: string
}

export default function SuportePage() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const supabase = createClient()
  const finalMensagensRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    finalMensagensRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function carregarMensagens(mostrarCarregando = true) {
    if (mostrarCarregando) setCarregando(true)

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

    const { data } = await supabase
      .from('support_messages')
      .select('id, remetente, mensagem, criado_em')
      .eq('tenant_id', tenant.id)
      .order('criado_em', { ascending: true })

    setMensagens(data || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregarMensagens()
    const intervalo = setInterval(() => carregarMensagens(false), 5000)
    return () => clearInterval(intervalo)
  }, [])

  async function enviarMensagem() {
    if (!novaMensagem.trim()) return
    setEnviando(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setEnviando(false)
      return
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('email', user.email)
      .single()

    if (!tenant) {
      setEnviando(false)
      return
    }

    const { error } = await supabase.from('support_messages').insert({
      tenant_id: tenant.id,
      remetente: 'tenant',
      mensagem: novaMensagem,
    })

    if (error) {
      console.log('ERRO AO ENVIAR:', JSON.stringify(error))
      alert('Erro ao enviar: ' + error.message)
    }

    setNovaMensagem('')
    setEnviando(false)
    carregarMensagens(false)
  }
  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Suporte</h2>
      <p className="text-sm text-gray-500 mb-6">Fale diretamente com a equipe Genix Pet</p>

      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto mb-4 min-h-[200px]">
          {carregando ? (
            <p className="text-sm text-gray-400">Carregando...</p>
          ) : mensagens.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">
              Nenhuma mensagem ainda. Envie sua duvida abaixo!
            </p>
          ) : (
            mensagens.map(m => (
              <div
                key={m.id}
                className={`flex ${m.remetente === 'tenant' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.remetente === 'tenant'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p>{m.mensagem}</p>
                  <p className={`text-[10px] mt-1 ${m.remetente === 'tenant' ? 'text-blue-100' : 'text-gray-400'}`}>
                    {m.remetente === 'admin' ? 'Genix Pet' : 'Voce'} • {new Date(m.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={novaMensagem}
            onChange={e => setNovaMensagem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && enviarMensagem()}
            placeholder="Digite sua mensagem..."
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={enviarMensagem}
            disabled={enviando || !novaMensagem.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  )
}