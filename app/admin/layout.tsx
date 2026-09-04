'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [autorizado, setAutorizado] = useState<boolean | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: admin } = await supabase
        .from('platform_admins')
        .select('id')
        .eq('email', user.email)
        .maybeSingle()

      if (!admin) {
        router.push('/dashboard')
        return
      }

      setAutorizado(true)
    }

    verificarAcesso()
  }, [])

  if (autorizado === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">Verificando acesso...</p>
      </div>
    )
  }

  if (!autorizado) return null

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="p-5 border-b border-gray-800">
          <h1 className="text-lg font-semibold">Genix Pet</h1>
          <p className="text-xs text-gray-400 mt-0.5">Painel Admin</p>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1">
          <Link href="/admin" className="px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition-colors">
            📊 Pet Shops
          </Link>
                    <Link href="/admin/suporte" className="px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition-colors">
            🎧 Suporte
          </Link>
          <Link href="/admin/migracao" className="px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition-colors">
            📥 Migração
          </Link>
        </nav>

        <div className="p-3 border-t border-gray-800">
          <Link href="/dashboard" className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 transition-colors block">
            ← Voltar ao painel
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}