import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('email', user.email!)
    .order('criado_em', { ascending: true })
    .limit(1)
    .single()

  console.log('tenant:', tenant)
  console.log('error:', error)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            Bem-vindo ao Genix Pet!
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            Seu painel está sendo construído. Sprint 1 em andamento!
          </p>

          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 flex flex-col gap-1">
            <p><span className="font-medium">Pet shop:</span> {tenant?.nome ?? 'não encontrado'}</p>
            <p><span className="font-medium">Slug:</span> {tenant?.slug ?? '-'}</p>
            <p><span className="font-medium">Status:</span> {tenant?.status ?? '-'}</p>
            <p><span className="font-medium">Usuário:</span> {user.email}</p>
            {error && <p className="text-red-500">Erro: {error.message}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}