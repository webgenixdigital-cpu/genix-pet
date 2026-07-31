'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const PASSOS_TUTORIAL = [
  { id: 'inicio', titulo: 'Inicio', texto: 'Aqui voce ve o resumo do dia: agendamentos, valores a receber e despesas.' },
  { id: 'agenda', titulo: 'Agenda', texto: 'Gerencie os agendamentos do dia, aprove pedidos e acompanhe o fluxo de atendimento.' },
  { id: 'profissionais', titulo: 'Profissionais', texto: 'Cadastre sua equipe, defina horarios de trabalho e comissao de cada um.' },
  { id: 'servicos', titulo: 'Servicos', texto: 'Cadastre os servicos oferecidos, com preco e duracao.' },
  { id: 'produtos', titulo: 'Produtos', texto: 'Controle o estoque de produtos vendidos no seu pet shop.' },
  { id: 'pacotes', titulo: 'Pacotes', texto: 'Crie pacotes pre-pagos de servico para fidelizar seus clientes.' },
  { id: 'clientes', titulo: 'Clientes', texto: 'Veja o historico completo de cada cliente e seus pets.' },
  { id: 'financeiro', titulo: 'Financeiro', texto: 'Acompanhe receitas, despesas e comissoes calculadas automaticamente.' },
  { id: 'caixa', titulo: 'Caixa', texto: 'Registre a movimentacao diaria e emita recibos para seus clientes.' },
  { id: 'configuracoes', titulo: 'Configuracoes', texto: 'Personalize sua marca, conecte o WhatsApp e configure seu plano.' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [menuAberto, setMenuAberto] = useState(false)
  const [tourAtivo, setTourAtivo] = useState(false)
  const [boasVindasAberto, setBoasVindasAberto] = useState(false)
  const [passoAtual, setPassoAtual] = useState(0)
  const [posicaoSpotlight, setPosicaoSpotlight] = useState({ top: 0, left: 0, width: 0, height: 0 })
  const [permissoes, setPermissoes] = useState({
    tem_whatsapp: true,
    tem_catalogo_produtos: true,
    tem_modulo_financeiro: true,
  })

  useEffect(() => {
    async function carregarPermissoes() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: tenant } = await supabase
        .from('tenants')
        .select('plan_id, status')
        .eq('email', user.email)
        .single()

      if (tenant?.status === 'trial') {
        setPermissoes({
          tem_whatsapp: true,
          tem_catalogo_produtos: true,
          tem_modulo_financeiro: true,
        })
        return
      }

      if (!tenant?.plan_id) return

      const { data: plano } = await supabase
        .from('plans')
        .select('tem_whatsapp, tem_catalogo_produtos, tem_modulo_financeiro')
        .eq('id', tenant.plan_id)
        .single()

      if (plano) {
        setPermissoes({
          tem_whatsapp: plano.tem_whatsapp,
          tem_catalogo_produtos: plano.tem_catalogo_produtos,
          tem_modulo_financeiro: plano.tem_modulo_financeiro,
        })
      }
    }

    carregarPermissoes()
    verificarOnboarding()
  }, [])

  async function verificarOnboarding() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: tenant } = await supabase
      .from('tenants')
      .select('onboarding_completo')
      .eq('email', user.email)
      .single()

    if (tenant && !tenant.onboarding_completo) {
      setTimeout(() => setBoasVindasAberto(true), 500)
    }
  }

  function calcularPosicaoElemento(tourId: string) {
    const elemento = document.querySelector(`[data-tour-id="${tourId}"]`)
    if (!elemento) return null

    const rect = elemento.getBoundingClientRect()
    return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
  }

  function irParaPasso(indice: number) {
    const passo = PASSOS_TUTORIAL[indice]
    if (!passo) {
      finalizarTour()
      return
    }

    setMenuAberto(true)

    setTimeout(() => {
      const pos = calcularPosicaoElemento(passo.id)
      if (pos) {
        setPosicaoSpotlight(pos)
        setPassoAtual(indice)
      } else {
        irParaPasso(indice + 1)
      }
    }, 100)
  }

  function iniciarTour() {
    setTourAtivo(true)
    irParaPasso(0)
  }

  function proximoPasso() {
    if (passoAtual < PASSOS_TUTORIAL.length - 1) {
      irParaPasso(passoAtual + 1)
    } else {
      finalizarTour()
    }
  }

  function passoAnterior() {
    if (passoAtual > 0) {
      irParaPasso(passoAtual - 1)
    }
  }

  async function finalizarTour() {
    setTourAtivo(false)
    setMenuAberto(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('tenants').update({ onboarding_completo: true }).eq('email', user.email)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const menu = [
    { id: 'inicio', href: '/dashboard', label: 'Início', icon: '🏠', liberado: true },
    { id: 'agenda', href: '/dashboard/agenda', label: 'Agenda', icon: '📅', liberado: true },
    { id: 'profissionais', href: '/dashboard/profissionais', label: 'Profissionais', icon: '✂️', liberado: true },
    { id: 'servicos', href: '/dashboard/servicos', label: 'Serviços', icon: '🛁', liberado: true },
    { id: 'produtos', href: '/dashboard/produtos', label: 'Produtos', icon: '📦', liberado: permissoes.tem_catalogo_produtos },
    { id: 'pacotes', href: '/dashboard/pacotes', label: 'Pacotes', icon: '🎁', liberado: permissoes.tem_modulo_financeiro },
    { id: 'clientes', href: '/dashboard/clientes', label: 'Clientes', icon: '👥', liberado: true },
    { id: 'financeiro', href: '/dashboard/financeiro', label: 'Financeiro', icon: '💰', liberado: permissoes.tem_modulo_financeiro },
    { id: 'caixa', href: '/dashboard/caixa', label: 'Caixa', icon: '💵', liberado: true },
    { id: 'configuracoes', href: '/dashboard/configuracoes', label: 'Configurações', icon: '⚙️', liberado: true },
  ]

  return (
    <div className="min-h-screen flex bg-gray-50">
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-40 flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">Genix Pet</h1>
        <button onClick={() => setMenuAberto(!menuAberto)} className="text-2xl">
          {menuAberto ? '✕' : '☰'}
        </button>
      </div>

      {menuAberto && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-30" onClick={() => setMenuAberto(false)} />
      )}

      <aside
        className={`w-56 bg-white border-r border-gray-100 flex flex-col fixed md:static top-0 left-0 h-full z-40 transition-transform ${
          menuAberto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-5 border-b border-gray-100 hidden md:block">
          <h1 className="text-lg font-semibold text-gray-900">Genix Pet</h1>
          <p className="text-xs text-gray-400 mt-0.5">Painel de gestão</p>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto mt-14 md:mt-0">
          {menu.map(item => (
            item.liberado ? (
              <Link
                key={item.href}
                href={item.href}
                data-tour-id={item.id}
                onClick={() => setMenuAberto(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ) : (
              <Link
                key={item.href}
                href="/dashboard/configuracoes"
                data-tour-id={item.id}
                onClick={() => setMenuAberto(false)}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm text-gray-400"
              >
                <span className="flex items-center gap-3">
                  <span>{item.icon}</span>
                  {item.label}
                </span>
                <span title="Disponivel em planos superiores">🔒</span>
              </Link>
            )
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100 flex flex-col gap-1">
          <button
            onClick={iniciarTour}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <span>❓</span>
            Tutorial
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <span>🚪</span>
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-auto mt-14 md:mt-0">
        {children}
      </main>

      {boasVindasAberto && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md text-center">
            <div className="text-4xl mb-4">🐾</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Bem-vindo ao Genix Pet!</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              Voce esta prestes a transformar a rotina do seu pet shop. Menos tempo no telefone,
              menos papel, menos esquecimento — e mais tempo cuidando bem de cada pet que passa
              pela sua porta. Vamos te mostrar rapidinho onde encontrar tudo?
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setBoasVindasAberto(false)
                  const { data: { user } } = await supabase.auth.getUser()
                  if (user) await supabase.from('tenants').update({ onboarding_completo: true }).eq('email', user.email)
                }}
                className="flex-1 border border-gray-200 text-gray-600 text-sm py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Sair
              </button>
              <button
                onClick={() => {
                  setBoasVindasAberto(false)
                  iniciarTour()
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 rounded-lg transition-colors"
              >
                Fazer tour
              </button>
            </div>
          </div>
        </div>
      )}

      {tourAtivo && (
        <div className="fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 transition-all duration-300"
            style={{
              boxShadow: `0 0 0 9999px rgba(0,0,0,0.6)`,
              top: posicaoSpotlight.top - 6,
              left: posicaoSpotlight.left - 6,
              width: posicaoSpotlight.width + 12,
              height: posicaoSpotlight.height + 12,
              borderRadius: 10,
              position: 'fixed',
            }}
          />

          <div
            className="fixed bg-white rounded-xl shadow-2xl p-4 w-64 transition-all duration-300"
            style={{
              top: posicaoSpotlight.top,
              left: posicaoSpotlight.left + posicaoSpotlight.width + 16,
            }}
          >
            <div
              className="absolute w-3 h-3 bg-white rotate-45"
              style={{ left: -6, top: 16 }}
            />
            <p className="text-xs text-gray-400 mb-1">
              Passo {passoAtual + 1} de {PASSOS_TUTORIAL.length}
            </p>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              {PASSOS_TUTORIAL[passoAtual].titulo}
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">
              {PASSOS_TUTORIAL[passoAtual].texto}
            </p>
            <div className="flex items-center justify-between">
              <button
                onClick={finalizarTour}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Pular
              </button>
              <div className="flex gap-2">
                {passoAtual > 0 && (
                  <button
                    onClick={passoAnterior}
                    className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                  >
                    Voltar
                  </button>
                )}
                <button
                  onClick={proximoPasso}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg"
                >
                  {passoAtual === PASSOS_TUTORIAL.length - 1 ? 'Concluir' : 'Proximo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}