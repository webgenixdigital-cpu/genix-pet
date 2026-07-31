'use client'

import Link from 'next/link'

const PLANOS = [
  {
    nome: 'Starter',
    preco: '89,90',
    desc: '1 profissional',
    destaque: false,
    itens: [
      'Agendamento online público',
      'Clientes e pets ilimitados',
      'Bloqueios de agenda',
      'Fila de encaixe',
      'Confirmação por e-mail',
    ],
  },
  {
    nome: 'Premium',
    preco: '189,90',
    desc: 'Até 3 profissionais',
    destaque: true,
    itens: [
      'Tudo do Starter',
      'Lembretes via WhatsApp',
      'Módulo financeiro',
      'Controle de comissões',
      'Agendamentos recorrentes',
      'Pacotes de serviço',
      'Relatório fiscal',
    ],
  },
  {
    nome: 'Pro',
    preco: '349,90',
    desc: 'Até 10 profissionais',
    destaque: false,
    itens: [
      'Tudo do Premium',
      'Catálogo de produtos',
      'Controle de estoque',
      'Personalização de marca',
      'Relatórios avançados',
      'Suporte prioritário',
      'Base de serviços por raça e combos, com sugestões de upsell no WhatsApp',
    ],
  },
]

const DORES = [
  { emoji: '📅', texto: 'Agenda desorganizada' },
  { emoji: '⏰', texto: 'Clientes esquecendo horários' },
  { emoji: '💬', texto: 'Muito trabalho manual no WhatsApp' },
  { emoji: '📊', texto: 'Falta de controle financeiro' },
  { emoji: '👥', texto: 'Equipe sem organização' },
  { emoji: '🔁', texto: 'Clientes que não retornam' },
]

const MODULOS = [
  { titulo: 'Agenda Inteligente', desc: 'Agendamento online, aprovação e fila de atendimento em um só lugar.' },
  { titulo: 'Financeiro', desc: 'Receitas, despesas e comissões calculados automaticamente.' },
  { titulo: 'Clientes', desc: 'Cadastro completo com histórico de cada tutor.' },
  { titulo: 'Pets', desc: 'Ficha detalhada de cada pet, com saúde e preferências.' },
  { titulo: 'Estoque', desc: 'Controle de produtos vendidos no seu pet shop.' },
  { titulo: 'Relatórios', desc: 'Visão clara do desempenho do seu negócio.' },
  { titulo: 'WhatsApp', desc: 'Confirmações e lembretes automáticos para os clientes.' },
  { titulo: 'Planos de Banho', desc: 'Pacotes recorrentes que fidelizam seus clientes.' },
]

const DIFERENCIAIS = [
  'Especializado em Pet Shops',
  'Interface intuitiva',
  'Suporte humanizado',
  'Atualizações constantes',
  'Implantação rápida',
  'Sistema em nuvem',
]

function IconeCalendario() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  )
}

function IconeMoeda() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.5c0-1.1 1.1-2 2.5-2s2.5.9 2.5 2c0 3-5 1.5-5 4.5 0 1.1 1.1 2 2.5 2s2.5-.9 2.5-2" strokeLinecap="round" />
    </svg>
  )
}

function IconeUsuarios() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.5 14c2.6.3 4.5 2.5 4.5 6" strokeLinecap="round" />
    </svg>
  )
}

function IconePet() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="7" cy="8" r="1.8" />
      <circle cx="12" cy="6" r="1.8" />
      <circle cx="17" cy="8" r="1.8" />
      <path d="M12 11c-3.2 0-5.5 2-5.5 4.4 0 1.8 1.5 2.9 3.3 2.4a4 4 0 0 1 4.4 0c1.8.5 3.3-.6 3.3-2.4 0-2.4-2.3-4.4-5.5-4.4z" />
    </svg>
  )
}

function IconeCaixa() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 9l2-5h14l2 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 9h18v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" />
      <path d="M9 13h6" strokeLinecap="round" />
    </svg>
  )
}

function IconeGrafico() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" />
      <path d="M2 20h20" strokeLinecap="round" />
    </svg>
  )
}

function IconeMensagem() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 5h16v11H8l-4 4V5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconeRepetir() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 12a8 8 0 0113.7-5.7L20 8M20 4v4h-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 12a8 8 0 01-13.7 5.7L4 16M4 20v-4h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const ICONES_MODULOS = [IconeCalendario, IconeMoeda, IconeUsuarios, IconePet, IconeCaixa, IconeGrafico, IconeMensagem, IconeRepetir]

function Logo({ tamanho = 'h-8' }: { tamanho?: string }) {
  return (
    <img
      src="https://tufsjmcgvlbrqltagklr.supabase.co/storage/v1/object/public/site-assets/watermarked_img_13082130160708969679.png"
      alt="Genix Pet"
      className={tamanho}
    />
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Logo tamanho="h-16 md:h-20" />
        <div className="hidden md:flex items-center gap-8">
          <a href="#dores" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">Por que usar</a>
          <a href="#modulos" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">Funcionalidades</a>
          <a href="#planos" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">Planos</a>
        </div>
        <Link
          href="/login"
          className="text-sm text-gray-700 border border-gray-200 px-4 py-2 rounded-lg hover:border-blue-400 transition-colors"
        >
          Entrar
        </Link>
      </nav>
      <section className="max-w-6xl mx-auto px-6 pt-8 md:pt-14 pb-12">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
              Organize seu pet shop, aumente sua produtividade e tenha controle total do seu negócio.
            </h1>
            <p className="text-gray-500 text-base md:text-lg mt-5 leading-relaxed">
              O sistema de gestão feito para quem cuida de pets — agenda, financeiro e
              WhatsApp em um só lugar, sem complicação.
            </p>

            <div className="mt-8">
              <Link
                href="/cadastro"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold px-7 py-3.5 rounded-lg transition-colors text-base"
              >
                Iniciar teste grátis de 7 dias
              </Link>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
            {/* Substitua por um print real do dashboard do Genix Pet */}
            <img
              src="https://tufsjmcgvlbrqltagklr.supabase.co/storage/v1/object/public/site-assets/watermarked_img_13082130160708969679.png"
              alt="Painel do Genix Pet"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-14 pt-10 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-blue-600"><IconeCaixa /></span>
            <p className="text-sm text-gray-600 font-medium">Sistema 100% em nuvem</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-blue-600"><IconePet /></span>
            <p className="text-sm text-gray-600 font-medium">Desenvolvido para o mercado pet</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-blue-600"><IconeMensagem /></span>
            <p className="text-sm text-gray-600 font-medium">Suporte humanizado</p>
          </div>
        </div>
      </section>
      <section id="dores" className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
            Isso é comum na rotina do seu pet shop?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {DORES.map(d => (
              <div key={d.texto} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-3">
                <span className="text-2xl">{d.emoji}</span>
                <p className="text-sm text-gray-700 font-medium">{d.texto}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-500 mt-10 max-w-lg mx-auto">
            O Genix Pet foi criado para resolver exatamente essas situações.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
            Por que escolher o Genix Pet
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-6">
            {DIFERENCIAIS.map(d => (
              <div key={d} className="flex items-center gap-3">
                <span className="text-blue-600 flex-shrink-0">✓</span>
                <p className="text-sm text-gray-700">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="modulos" className="bg-white py-16 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-2">
            Tudo que seu pet shop precisa
          </h2>
          <p className="text-gray-500 text-center mb-10">Módulos pensados para o dia a dia do seu negócio</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {MODULOS.map((m, i) => {
              const Icone = ICONES_MODULOS[i]
              return (
                <div key={m.titulo} className="border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow">
                  <div className="text-blue-600 mb-3"><Icone /></div>
                  <h3 className="text-gray-900 font-semibold text-sm mb-1">{m.titulo}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{m.desc}</p>
                </div>
              )
            })}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/cadastro"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold px-7 py-3 rounded-lg transition-colors"
            >
              Quero testar gratuitamente
            </Link>
          </div>
        </div>
      </section>
      <section id="planos" className="max-w-6xl mx-auto px-6 py-16 bg-gray-50 rounded-3xl">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-2">Planos simples e transparentes</h2>
        <p className="text-gray-500 text-center mb-10">Comece grátis por 7 dias, sem cartão de crédito</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANOS.map(plano => (
            <div
              key={plano.nome}
              className={`bg-white rounded-2xl p-6 relative ${
                plano.destaque ? 'border-2 border-blue-500 shadow-lg' : 'border border-gray-200'
              }`}
            >
              {plano.destaque && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Mais escolhido
                </span>
              )}
              <p className="text-sm font-medium text-gray-500">{plano.nome}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                R$ {plano.preco}<span className="text-sm font-normal text-gray-400">/mes</span>
              </p>
              <p className="text-xs text-gray-400 mt-1 mb-5">{plano.desc}</p>

              <ul className="flex flex-col gap-2 mb-6">
                {plano.itens.map(item => (
                  <li key={item} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-blue-600 flex-shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href="/cadastro"
                className="block text-center text-sm font-bold py-2.5 rounded-lg transition-colors bg-blue-600 hover:bg-blue-700 text-white"
              >
                Iniciar teste grátis
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          Pronto para organizar seu pet shop?
        </h2>
        <p className="text-gray-500 mb-6">
          Junte-se aos donos de pet shop que já simplificaram sua rotina com o Genix Pet.
        </p>
        <Link
          href="/cadastro"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold px-7 py-3.5 rounded-lg transition-colors"
        >
          Quero testar gratuitamente
        </Link>
      </section>

      <footer className="bg-gray-50 py-10 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo tamanho="h-8" />
          <div className="flex items-center gap-6 text-xs text-gray-400">
            <a href="#" className="hover:text-blue-600 transition-colors">Politica de privacidade</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Termos de uso</a>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          Genix Pet © — Uma empresa do grupo webgenix sistemas integrativos
        </p>
      </footer>
    </div>
  )
}