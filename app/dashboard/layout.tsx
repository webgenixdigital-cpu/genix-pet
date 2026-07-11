'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const menu = [
    { href: '/dashboard', label: 'Início', icon: '🏠' },
    { href: '/dashboard/agenda', label: 'Agenda', icon: '📅' },
    { href: '/dashboard/profissionais', label: 'Profissionais', icon: '✂️' },
    { href: '/dashboard/servicos', label: 'Serviços', icon: '🛁' },
    { href: '/dashboard/configuracoes', label: 'Configurações', icon: '⚙️' },
  ]

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <h1 className="text-lg font-semibold text-gray-900">Genix Pet</h1>
          <p className="text-xs text-gray-400 mt-0.5">Painel de gestão</p>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1">
          {menu.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <span>🚪</span>
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}