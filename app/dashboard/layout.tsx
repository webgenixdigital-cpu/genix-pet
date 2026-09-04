'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const LOGO_URL =
  'https://tufsjmcgvlbrqltagklr.supabase.co/storage/v1/object/public/logos/ChatGPT%20Image%208%20de%20ago.%20de%202026,%2010_17_27.png'

const svgProps = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const IconesMenu: Record<string, () => JSX.Element> = {
  inicio: () => (<svg {...svgProps}><path d="M4 11l8-7 8 7" /><path d="M6 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9" /></svg>),
  agenda: () => (<svg {...svgProps}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>),
  profissionais: () => (<svg {...svgProps}><path d="M6 6l12 12M18 6L6 18" /><circle cx="6" cy="6" r="2.2" /><circle cx="18" cy="18" r="2.2" /></svg>),
  catalogo: () => (<svg {...svgProps}><path d="M4 5a2 2 0 012-2h13v18H6a2 2 0 00-2 2z" /><path d="M19 17H6a2 2 0 00-2 2" /></svg>),
  produtos: () => (<svg {...svgProps}><path d="M3 9l2-5h14l2 5" /><path d="M3 9h18v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" /><path d="M9 13h6" /></svg>),
  pacotes: () => (<svg {...svgProps}><rect x="3" y="8" width="18" height="13" rx="1.5" /><path d="M3 8V6a2 2 0 012-2h14a2 2 0 012 2v2M12 4v17M8 4a4 4 0 018 0" /></svg>),
  clientes: () => (<svg {...svgProps}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.4" /><path d="M15.5 14c2.6.3 4.5 2.5 4.5 6" /></svg>),
  financeiro: () => (<svg {...svgProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5c0-1.1 1.1-2 2.5-2s2.5.9 2.5 2c0 3-5 1.5-5 4.5 0 1.1 1.1 2 2.5 2s2.5-.9 2.5-2" /></svg>),
  caixa: () => (<svg {...svgProps}><rect x="3" y="7" width="18" height="13" rx="1.5" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 12h18" /></svg>),
  'relatorio-fiscal': () => (<svg {...svgProps}><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 12h6M9 16h6" /></svg>),
  configuracoes: () => (<svg {...svgProps}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.2a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.2a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.2a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.2a1.7 1.7 0 00-1.5 1z" /></svg>),
  suporte: () => (<svg {...svgProps}><path d="M4 15v-3a8 8 0 0116 0v3" /><rect x="2.5" y="14" width="4" height="6" rx="1.5" /><rect x="17.5" y="14" width="4" height="6" rx="1.5" /></svg>),
}

const PASSOS_TUTORIAL = [
  { id: 'inicio', titulo: 'Inicio', texto: 'Aqui voce ve o resumo do dia: agendamentos, valores a receber, despesas e indicadores do mes, tudo em um so lugar.' },
  { id: 'agenda', titulo: 'Agenda', texto: 'Gerencie os agendamentos do dia em formato Kanban, aprove pedidos vindos do link publico e acompanhe o fluxo de atendimento do inicio ao fim.' },
  { id: 'profissionais', titulo: 'Profissionais', texto: 'Cadastre sua equipe, defina horarios de trabalho e a comissao de cada um sobre os servicos realizados.' },
  { id: 'catalogo', titulo: 'Catalogo Digital', texto: 'O coracao do sistema: cadastre servicos por raca ou por porte/pelagem. E o mesmo catalogo usado no seu link de agendamento publico e na vitrine que voce compartilha com os clientes.' },
  { id: 'produtos', titulo: 'Produtos', texto: 'Controle o estoque, cadastre dados fiscais (NCM, CFOP, codigo de barras) e use a Entrada por Codigo para dar baixa ou repor estoque rapidamente com um leitor USB.' },
  { id: 'pacotes', titulo: 'Pacotes', texto: 'Crie pacotes pre-pagos ou planos recorrentes (1x, 2x ou 4x por mes) para fidelizar seus clientes e garantir receita previsivel.' },
  { id: 'clientes', titulo: 'Clientes', texto: 'Veja o historico completo de cada cliente e seus pets, alem da lista de clientes sem retorno para voce reativar.' },
  { id: 'financeiro', titulo: 'Financeiro', texto: 'Acompanhe receitas, despesas e comissoes calculadas automaticamente, com relatorios detalhados por periodo.' },
  { id: 'caixa', titulo: 'Caixa', texto: 'Registre a movimentacao diaria, receba via Pix (chave cadastrada em Configuracoes) e emita recibos ou tickets pela impressora termica.' },
  { id: 'relatorio-fiscal', titulo: 'Relatorio Fiscal', texto: 'Gere o relatorio por periodo ou o Fechamento Anual (DASN-SIMEI), com os valores prontos separados entre comercio/industria e prestacao de servicos para a declaracao do MEI.' },
  { id: 'configuracoes', titulo: 'Configuracoes', texto: 'Personalize sua marca, conecte o WhatsApp, edite as mensagens automaticas (lembrete, fatura, resumo) e gerencie seu plano.' },
  { id: 'suporte', titulo: 'Suporte', texto: 'Precisa de ajuda? Fale diretamente com a equipe Genix Pet por aqui.' },
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
  const [menuMinimizado, setMenuMinimizado] = useState(false)
  const [tourAtivo, setTourAtivo] = useState(false)
  const [boasVindasAberto, setBoasVindasAberto] = useState(false)
  const [passoAtual, setPassoAtual] = useState(0)
  const [posicaoSpotlight, setPosicaoSpotlight] = useState({ top: 0, left: 0, width: 0, height: 0 })
      const [permissoes, setPermissoes] = useState({
    tem_whatsapp: true,
    tem_catalogo_produtos: true,
    tem_modulo_financeiro: true,
    tem_relatorio_fiscal: true,
    apenas_catalogo: false,
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
          tem_relatorio_fiscal: true,
          apenas_catalogo: false,
        })
        return
      }

      if (!tenant?.plan_id) return

            const { data: plano } = await supabase
        .from('plans')
        .select('tem_whatsapp, tem_catalogo_produtos, tem_modulo_financeiro, tem_relatorio_fiscal, apenas_catalogo')
        .eq('id', tenant.plan_id)
        .single()

            if (plano) {
        setPermissoes({
          tem_whatsapp: plano.tem_whatsapp,
          tem_catalogo_produtos: plano.tem_catalogo_produtos,
          tem_modulo_financeiro: plano.tem_modulo_financeiro,
          tem_relatorio_fiscal: plano.tem_relatorio_fiscal,
          apenas_catalogo: plano.apenas_catalogo || false,
        })

        if (plano.apenas_catalogo && pathname === '/dashboard') {
          router.push('/dashboard/catalogo')
        }
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

        const menu = permissoes.apenas_catalogo
    ? [
        { id: 'catalogo', href: '/dashboard/catalogo', label: 'Catalogo', liberado: true },
        { id: 'configuracoes', href: '/dashboard/configuracoes', label: 'Configurações', liberado: true },
        { id: 'suporte', href: '/dashboard/suporte', label: 'Suporte', liberado: true },
      ]
    : [
        { id: 'inicio', href: '/dashboard', label: 'Início', liberado: true },
        { id: 'agenda', href: '/dashboard/agenda', label: 'Agenda', liberado: true },
        { id: 'profissionais', href: '/dashboard/profissionais', label: 'Profissionais', liberado: true },
        { id: 'catalogo', href: '/dashboard/catalogo', label: 'Catalogo', liberado: true },
        { id: 'produtos', href: '/dashboard/produtos', label: 'Produtos', liberado: true },
        { id: 'pacotes', href: '/dashboard/pacotes', label: 'Pacotes', liberado: true },
        { id: 'clientes', href: '/dashboard/clientes', label: 'Clientes', liberado: true },
        { id: 'financeiro', href: '/dashboard/financeiro', label: 'Financeiro', liberado: true },
        { id: 'caixa', href: '/dashboard/caixa', label: 'Caixa', liberado: true },
        { id: 'relatorio-fiscal', href: '/dashboard/relatorio-fiscal', label: 'Relatorio Fiscal', liberado: permissoes.tem_relatorio_fiscal },
        { id: 'configuracoes', href: '/dashboard/configuracoes', label: 'Configurações', liberado: true },
        { id: 'suporte', href: '/dashboard/suporte', label: 'Suporte', liberado: true },
      ]
  return (
    <div className="min-h-screen flex bg-gray-50">
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-40 flex items-center justify-between px-4 py-3">
        <img src={LOGO_URL} alt="Genix Pet" className="h-8" />
        <button onClick={() => setMenuAberto(!menuAberto)} className="text-2xl">
          {menuAberto ? '✕' : '☰'}
        </button>
      </div>

      {menuAberto && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-30" onClick={() => setMenuAberto(false)} />
      )}

      <aside
        className={`${menuMinimizado ? 'w-[72px]' : 'w-56'} bg-white border-r border-gray-100 flex flex-col fixed md:static top-0 left-0 h-full z-40 transition-all duration-200 ${
          menuAberto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-5 border-b border-gray-100 hidden md:flex items-center justify-between">
          {menuMinimizado ? (
            <span className="text-blue-600 font-bold text-lg mx-auto">G</span>
          ) : (
            <div>
              <img src={LOGO_URL} alt="Genix Pet" className="h-9" />
              <p className="text-xs text-gray-400 mt-1.5">Painel de gestão</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setMenuMinimizado(!menuMinimizado)}
          className="hidden md:flex items-center justify-center py-2 text-gray-400 hover:text-blue-600 hover:bg-gray-50 border-b border-gray-100 transition-colors"
          title={menuMinimizado ? 'Expandir menu' : 'Minimizar menu'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${menuMinimizado ? 'rotate-180' : ''}`}>
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <nav className="flex-1 p-2 flex flex-col overflow-y-auto mt-14 md:mt-0">
          {menu.map((item, i) => {
            const IconComp = IconesMenu[item.id] || IconesMenu.configuracoes
            return item.liberado ? (
              <Link
                key={item.href}
                href={item.href}
                data-tour-id={item.id}
                onClick={() => setMenuAberto(false)}
                title={menuMinimizado ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                  i < menu.length - 1 ? 'shadow-[0_1px_0_rgba(15,23,42,0.05)]' : ''
                } ${menuMinimizado ? 'justify-center' : ''} ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-600 font-medium rounded-lg'
                    : 'text-gray-600 hover:bg-gray-50 rounded-lg'
                }`}
              >
                <IconComp />
                {!menuMinimizado && item.label}
              </Link>
            ) : (
              <Link
                key={item.href}
                href="/dashboard/configuracoes"
                data-tour-id={item.id}
                onClick={() => setMenuAberto(false)}
                title={menuMinimizado ? item.label : undefined}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 ${
                  i < menu.length - 1 ? 'shadow-[0_1px_0_rgba(15,23,42,0.05)]' : ''
                } ${menuMinimizado ? 'justify-center' : ''}`}
              >
                <span className="flex items-center gap-3">
                  <IconComp />
                  {!menuMinimizado && item.label}
                </span>
                {!menuMinimizado && <span title="Disponivel em planos superiores">🔒</span>}
              </Link>
            )
          })}
        </nav>

                <div className="p-2 border-t border-gray-100 flex flex-col">
          <button
            onClick={iniciarTour}
            title={menuMinimizado ? 'Tutorial' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors ${menuMinimizado ? 'justify-center' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 9a2.5 2.5 0 015 0c0 1.7-2.5 2-2.5 3.5" />
              <circle cx="12" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
            </svg>
            {!menuMinimizado && 'Tutorial'}
          </button>
          <button
            onClick={handleLogout}
            title={menuMinimizado ? 'Sair' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors ${menuMinimizado ? 'justify-center' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
            {!menuMinimizado && 'Sair'}
          </button>
        </div>
      </aside>

            <main className="flex-1 p-4 md:p-8 overflow-auto mt-14 md:mt-0">
        {permissoes.apenas_catalogo && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 mb-6 text-white flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-semibold">🚀 Experimente 14 dias grátis do sistema Genix Pet!</p>
              <p className="text-xs text-blue-100 mt-0.5">
                Gerencie seu pet shop completo — agenda, financeiro, clientes — junto com seu catálogo digital.
              </p>
            </div>
            <a
              href="/dashboard/configuracoes"
              className="bg-white text-blue-700 text-xs font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
            >
              Fazer upgrade
            </a>
          </div>
        )}
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