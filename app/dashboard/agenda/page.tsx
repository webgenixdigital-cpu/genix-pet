'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Agendamento = {
  id: string
  inicio: string
  fim: string
  status: string
  preco_cobrado: number | null
  customers: { nome: string; telefone: string } | null
  pets: { nome: string } | null
  professionals: { nome: string; cor_agenda: string } | null
  services: { nome: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  em_espera: 'Em espera',
  em_atendimento: 'Em atendimento',
  concluido: 'Concluido',
  cancelado: 'Cancelado',
  faltou: 'Faltou',
}

const STATUS_CORES: Record<string, string> = {
  agendado: 'bg-gray-100 text-gray-600',
  confirmado: 'bg-blue-100 text-blue-600',
  em_espera: 'bg-yellow-100 text-yellow-700',
  em_atendimento: 'bg-purple-100 text-purple-600',
  concluido: 'bg-green-100 text-green-600',
  cancelado: 'bg-red-100 text-red-600',
  faltou: 'bg-red-100 text-red-600',
}

function formatarDataISO(data: Date): string {
  return data.toISOString().split('T')[0]
}

export default function AgendaPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [dataFiltro, setDataFiltro] = useState(formatarDataISO(new Date()))
  const supabase = createClient()

  async function carregarAgendamentos() {
    setCarregando(true)
    const { data: tenant } = await supabase.from('tenants').select('id').single()
    if (!tenant) return

    const { data } = await supabase
      .from('appointments')
      .select(`
        id, inicio, fim, status, preco_cobrado,
        customers ( nome, telefone ),
        pets ( nome ),
        professionals ( nome, cor_agenda ),
        services ( nome )
      `)
      .eq('tenant_id', tenant.id)
      .gte('inicio', dataFiltro + 'T00:00:00')
      .lte('inicio', dataFiltro + 'T23:59:59')
      .order('inicio')

    setAgendamentos((data as any) || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregarAgendamentos()
  }, [dataFiltro])

  async function mudarStatus(id: string, novoStatus: string) {
    await supabase.from('appointments').update({ status: novoStatus }).eq('id', id)
    carregarAgendamentos()
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Agenda</h2>
          <p className="text-sm text-gray-500 mt-0.5">Agendamentos do dia</p>
        </div>
        <input
          type="date"
          value={dataFiltro}
          onChange={e => setDataFiltro(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {carregando ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : agendamentos.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum agendamento para esta data.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {agendamentos.map(a => (
            <div key={a.id} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="text-sm font-medium text-gray-900 w-14 flex-shrink-0">
                  {new Date(a.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>

                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                  style={{ backgroundColor: a.professionals?.cor_agenda || '#94a3b8' }}
                >
                  {a.professionals?.nome?.charAt(0).toUpperCase() || '?'}
                </div>

                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {a.pets?.nome} — {a.services?.nome}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {a.customers?.nome} • {a.customers?.telefone} • {a.professionals?.nome}
                  </p>
                </div>

                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_CORES[a.status]}`}>
                  {STATUS_LABELS[a.status]}
                </span>

                <select
                  value={a.status}
                  onChange={e => mudarStatus(a.id, e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(STATUS_LABELS).map(([valor, label]) => (
                    <option key={valor} value={valor}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}