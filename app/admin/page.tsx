'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type TenantMetricas = {
  id: string
  nome: string
  email: string
  telefone: string | null
  status: string
  plano: string
  criadoEm: string
  faturamentoTotal: number
  totalAgendamentos: number
  totalClientes: number
  totalProfissionais: number
}

export default function AdminPage() {
  const [tenants, setTenants] = useState<TenantMetricas[]>([])
  const [carregando, setCarregando] = useState(true)
  const supabase = createClient()

  async function carregarDados() {
    setCarregando(true)

    const { data: todosTenants } = await supabase
      .from('tenants')
      .select('id, nome, email, telefone, status, criado_em, plan_id, plans ( nome )')
      .order('criado_em', { ascending: false })

    const { data: financeiro } = await supabase
      .from('financial_transactions')
      .select('tenant_id, valor, tipo, status')
      .eq('tipo', 'receita')
      .eq('status', 'pago')

    const { data: agendamentos } = await supabase
      .from('appointments')
      .select('tenant_id')
      .neq('status', 'cancelado')

    const { data: clientes } = await supabase
      .from('customers')
      .select('tenant_id')
      .eq('ativo', true)

    const { data: profissionais } = await supabase
      .from('professionals')
      .select('tenant_id')
      .eq('ativo', true)

    const lista: TenantMetricas[] = (todosTenants || []).map((t: any) => ({
      id: t.id,
      nome: t.nome,
      email: t.email,
      telefone: t.telefone,
      status: t.status,
      plano: t.plans?.nome || 'Sem plano',
      criadoEm: t.criado_em,
      faturamentoTotal: (financeiro || []).filter(f => f.tenant_id === t.id).reduce((s, f) => s + Number(f.valor), 0),
      totalAgendamentos: (agendamentos || []).filter(a => a.tenant_id === t.id).length,
      totalClientes: (clientes || []).filter(c => c.tenant_id === t.id).length,
      totalProfissionais: (profissionais || []).filter(p => p.tenant_id === t.id).length,
    }))

    setTenants(lista)
    setCarregando(false)
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const totalTenants = tenants.length
  const totalAtivos = tenants.filter(t => t.status === 'active').length
  const totalTrial = tenants.filter(t => t.status === 'trial').length
  const mrrEstimado = tenants
    .filter(t => t.status === 'active')
    .reduce((s, t) => {
      const precos: Record<string, number> = { Starter: 89.9, Premium: 189.9, Pro: 349.9 }
      return s + (precos[t.plano] || 0)
    }, 0)

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Pet Shops</h2>
      <p className="text-sm text-gray-500 mb-6">Acompanhamento de todos os clientes Genix Pet</p>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-xs text-gray-400">Total de pet shops</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{totalTenants}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-xs text-gray-400">Assinantes ativos</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">{totalAtivos}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-xs text-gray-400">Em trial</p>
          <p className="text-2xl font-semibold text-yellow-600 mt-1">{totalTrial}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs text-blue-600">MRR estimado</p>
          <p className="text-2xl font-semibold text-blue-700 mt-1">
            R$ {mrrEstimado.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </div>

      {carregando ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="p-3 font-medium">Pet Shop</th>
                <th className="p-3 font-medium">Plano</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Cadastro</th>
                <th className="p-3 font-medium">Clientes</th>
                <th className="p-3 font-medium">Agendamentos</th>
                <th className="p-3 font-medium">Profissionais</th>
                <th className="p-3 font-medium text-right">Faturamento total</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="p-3">
                    <p className="font-medium text-gray-900">{t.nome}</p>
                    <p className="text-xs text-gray-400">{t.email}</p>
                  </td>
                  <td className="p-3 text-gray-600">{t.plano}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      t.status === 'active' ? 'bg-green-100 text-green-700' :
                      t.status === 'trial' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500 text-xs">
                    {new Date(t.criadoEm).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-3 text-gray-600">{t.totalClientes}</td>
                  <td className="p-3 text-gray-600">{t.totalAgendamentos}</td>
                  <td className="p-3 text-gray-600">{t.totalProfissionais}</td>
                  <td className="p-3 text-right font-medium text-gray-900">
                    R$ {t.faturamentoTotal.toFixed(2).replace('.', ',')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}