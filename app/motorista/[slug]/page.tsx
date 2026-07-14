'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Transporte = {
  id: string
  inicio: string
  status: string
  endereco_coleta: string | null
  endereco_entrega: string | null
  customers: { nome: string; telefone: string } | null
  pets: { nome: string } | null
  services: { nome: string } | null
}

function formatarDataISO(data: Date): string {
  return data.toISOString().split('T')[0]
}

export default function MotoristaPage() {
  const params = useParams()
  const slug = params.slug as string
  const supabase = createClient()

  const [autenticado, setAutenticado] = useState(false)
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [tenantNome, setTenantNome] = useState('')
  const [transportes, setTransportes] = useState<Transporte[]>([])
  const [carregando, setCarregando] = useState(false)

  async function validarPin() {
    setErro('')
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, nome, pin_motorista')
      .eq('slug', slug)
      .single()

    if (!tenant || tenant.pin_motorista !== pin) {
      setErro('PIN incorreto.')
      return
    }

    setTenantId(tenant.id)
    setTenantNome(tenant.nome)
    setAutenticado(true)
    carregarTransportes(tenant.id)
  }

  async function carregarTransportes(id: string) {
    setCarregando(true)
    const hoje = new Date()
    const daqui7dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)

    const { data } = await supabase
      .from('appointments')
      .select(`
        id, inicio, status, endereco_coleta, endereco_entrega,
        customers ( nome, telefone ),
        pets ( nome ),
        services ( nome )
      `)
      .eq('tenant_id', id)
      .eq('precisa_transporte', true)
      .gte('inicio', formatarDataISO(hoje) + 'T00:00:00')
      .lte('inicio', formatarDataISO(daqui7dias) + 'T23:59:59')
      .neq('status', 'cancelado')
      .order('inicio')

    setTransportes((data as any) || [])
    setCarregando(false)
  }
  if (!autenticado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm">
          <h1 className="text-lg font-semibold text-gray-900 mb-1">Acesso do motorista</h1>
          <p className="text-sm text-gray-500 mb-6">Digite o PIN para ver os transportes do dia</p>

          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="PIN"
            maxLength={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
          />

          {erro && <p className="text-red-500 text-sm mb-3">{erro}</p>}

          <button
            onClick={validarPin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors"
          >
            Entrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">{tenantNome}</h1>
        <p className="text-sm text-gray-500 mb-6">Transportes dos proximos 7 dias</p>
        {carregando ? (
          <p className="text-sm text-gray-400">Carregando...</p>
        ) : transportes.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
            <p className="text-gray-400 text-sm">Nenhum transporte agendado nos proximos dias.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {Object.entries(
              transportes.reduce((grupos: Record<string, Transporte[]>, t) => {
                const dia = formatarDataISO(new Date(t.inicio))
                if (!grupos[dia]) grupos[dia] = []
                grupos[dia].push(t)
                return grupos
              }, {})
            ).map(([dia, itensDoDia]) => (
              <div key={dia}>
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase">
                  {new Date(dia + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                </p>
                <div className="flex flex-col gap-3">
                  {itensDoDia.map(t => (
              <div key={t.id} className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(t.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                    {t.status}
                  </span>
                </div>

                <p className="text-sm font-medium text-gray-900">{t.pets?.nome} — {t.services?.nome}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t.customers?.nome} • {t.customers?.telefone}</p>

                {t.endereco_coleta && (
                  <button
                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.endereco_coleta || '')}`, '_blank')}
                    className="mt-3 w-full bg-orange-50 text-orange-700 text-xs py-2 rounded-lg text-left px-3"
                  >
                    📍 Coleta: {t.endereco_coleta}
                  </button>
                )}

                {t.endereco_entrega && t.endereco_entrega !== t.endereco_coleta && (
                      <button
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.endereco_entrega || '')}`, '_blank')}
                        className="mt-2 w-full bg-blue-50 text-blue-700 text-xs py-2 rounded-lg text-left px-3"
                      >
                        📍 Entrega: {t.endereco_entrega}
                      </button>
                    )}
                  </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}