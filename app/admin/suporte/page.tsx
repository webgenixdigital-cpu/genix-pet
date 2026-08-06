'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Tenant = {
  id: string
  nome: string
  email: string
  mensagensNaoLidas: number
  ultimaMensagem: string | null
}

type Mensagem = {
  id: string
  remetente: string
  mensagem: string
  criado_em: string
}

export default function AdminSuportePage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantSelecionado, setTenantSelecionado] = useState<Tenant | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const supabase = createClient()

  async function carregarTenants() {
    setCarregando(true)

    const { data: todosTenants } = await supabase
      .from('tenants')
      .select('id, nome, email')
      .order('nome')

    const { data: todasMensagens } = await supabase
      .from('support_messages')
      .select('tenant_id, remetente, lida, criado_em')
      .order('criado_em', { ascending: false })

    const lista: Tenant[] = (todosTenants || []).map(t => {
      const msgsDoTenant = (todasMensagens || []).filter(m => m.tenant_id === t.id)
      const naoLidas = msgsDoTenant.filter(m => m.remetente === 'tenant' && !m.lida).length
      const ultima = msgsDoTenant[0]?.criado_em || null

      return {
        id: t.id,
        nome: t.nome,
        email: t.email,
        mensagensNaoLidas: naoLidas,
        ultimaMensagem: ultima,
      }
    })

    lista.sort((a, b) => b.mensagensNaoLidas - a.mensagensNaoLidas)
    setTenants(lista)
    setCarregando(false)
  }

  useEffect(() => {
    carregarTenants()
    const intervalo = setInterval(() => {
      carregarTenants()
      if (tenantSelecionado) {
        atualizarMensagensAtuais()
      }
    }, 5000)
    return () => clearInterval(intervalo)
  }, [tenantSelecionado])

  async function atualizarMensagensAtuais() {
    if (!tenantSelecionado) return

    const { data } = await supabase
      .from('support_messages')
      .select('id, remetente, mensagem, criado_em')
      .eq('tenant_id', tenantSelecionado.id)
      .order('criado_em', { ascending: true })

    setMensagens(data || [])
  }

  async function abrirConversa(tenant: Tenant) {
    setTenantSelecionado(tenant)

    const { data } = await supabase
      .from('support_messages')
      .select('id, remetente, mensagem, criado_em')
      .eq('tenant_id', tenant.id)
      .order('criado_em', { ascending: true })

    setMensagens(data || [])

    await supabase
      .from('support_messages')
      .update({ lida: true })
      .eq('tenant_id', tenant.id)
      .eq('remetente', 'tenant')

    carregarTenants()
  }

  async function enviarResposta() {
    if (!novaMensagem.trim() || !tenantSelecionado) return
    setEnviando(true)

    await supabase.from('support_messages').insert({
      tenant_id: tenantSelecionado.id,
      remetente: 'admin',
      mensagem: novaMensagem,
    })

    setNovaMensagem('')
    setEnviando(false)
    abrirConversa(tenantSelecionado)
  }

  return (
    <div className="grid grid-cols-3 gap-6 h-[calc(100vh-4rem)]">
      <div className="col-span-1 bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-900">Pet Shops</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {carregando ? (
            <p className="text-sm text-gray-400 p-4">Carregando...</p>
          ) : (
            tenants.map(t => (
              <button
                key={t.id}
                onClick={() => abrirConversa(t)}
                className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  tenantSelecionado?.id === t.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{t.nome}</p>
                  {t.mensagensNaoLidas > 0 && (
                    <span className="text-[10px] bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                      {t.mensagensNaoLidas}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{t.email}</p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="col-span-2 bg-white rounded-2xl border border-gray-100 flex flex-col">
        {!tenantSelecionado ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-400">Selecione um pet shop para ver a conversa</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">{tenantSelecionado.nome}</h3>
              <p className="text-xs text-gray-400">{tenantSelecionado.email}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {mensagens.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-12">Nenhuma mensagem ainda.</p>
              ) : (
                mensagens.map(m => (
                  <div
                    key={m.id}
                    className={`flex ${m.remetente === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                        m.remetente === 'admin'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p>{m.mensagem}</p>
                      <p className={`text-[10px] mt-1 ${m.remetente === 'admin' ? 'text-blue-100' : 'text-gray-400'}`}>
                        {new Date(m.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-2">
              <input
                type="text"
                value={novaMensagem}
                onChange={e => setNovaMensagem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && enviarResposta()}
                placeholder="Digite sua resposta..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={enviarResposta}
                disabled={enviando || !novaMensagem.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                Enviar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}