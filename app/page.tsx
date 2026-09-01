'use client'

import Link from 'next/link'

const LOGO_URL =
  'https://tufsjmcgvlbrqltagklr.supabase.co/storage/v1/object/public/logos/ChatGPT%20Image%208%20de%20ago.%20de%202026,%2010_17_27.png'

const NIX_URL =
  'https://tufsjmcgvlbrqltagklr.supabase.co/storage/v1/object/public/site-assets/ChatGPT%20Image%207%20de%20ago.%20de%202026,%2008_02_27.png'

// Second Nix pose, used in the "Conheça o Nix" / social section
const NIX_SOCIAL_URL =
  'https://tufsjmcgvlbrqltagklr.supabase.co/storage/v1/object/public/site-assets/ChatGPT%20Image%208%20de%20ago.%20de%202026,%2010_18_53.png'

const CTA_TEXTO = 'Teste Grátis por 15 Dias'
const CTA_SUB = 'Sem cartão de crédito. Comece em poucos minutos.'

const PLANOS = [
  {
    nome: 'Starter',
    preco: '179,90',
    desc: 'Até 2 profissionais',
    destaque: false,
    disponivel: true,
    itens: [
      'Agenda completa e agendamento interno',
      'Clientes, histórico e pendências',
      'Financeiro, caixa e relatório fiscal',
      'Produtos com dados fiscais',
      'Pacotes e planos recorrentes',
      'Mensagens de WhatsApp personalizáveis',
    ],
  },
  {
    nome: 'Premium',
    preco: '247,90',
    desc: 'Até 4 profissionais',
    destaque: true,
    disponivel: true,
    itens: [
      'Tudo do Starter',
      'Catálogo digital público com link próprio',
      'Agendamento online direto pelo catálogo',
      'Pagamento via Pix no agendamento',
      'Controle de estoque avançado',
    ],
  },
  {
    nome: 'Pro',
    preco: '379,90',
    desc: 'Até 10 profissionais',
    destaque: false,
    disponivel: false,
    itens: [
      'Tudo do Premium',
      'Catálogo pré-preenchido com 48 raças',
      'WhatsApp automático (lembretes, pós-venda, prospecção)',
      'Busca automática de produtos (NF-e / código de barras)',
      'Suporte prioritário',
    ],
  },
]

const DORES = [
  { icone: 'calendario', cor: 'blue', texto: 'Agenda desorganizada' },
  { icone: 'relogio', cor: 'amber', texto: 'Clientes esquecendo horários' },
  { icone: 'mensagem', cor: 'green', texto: 'WhatsApp lotado de mensagens repetidas' },
  { icone: 'equipe', cor: 'purple', texto: 'Equipe sem visão do que fazer' },
  { icone: 'seringa', cor: 'rose', texto: 'Vacinas e retornos sem controle' },
  { icone: 'grafico', cor: 'cyan', texto: 'Financeiro no chute' },
] as const

const MENSAGENS = [
  { titulo: 'Lembrete de banho', desc: 'Enviado automaticamente antes do horário.', icone: 'agenda', cor: 'blue' },
  { titulo: 'Confirmação', desc: 'O cliente confirma sem precisar ligar.', icone: 'check', cor: 'green' },
  { titulo: 'Pet pronto', desc: 'Avisa a hora exata de buscar.', icone: 'pet', cor: 'amber' },
  { titulo: 'Reagendamento', desc: 'Resolve faltas sem perder o horário.', icone: 'relogio', cor: 'purple' },
  { titulo: 'Progresso do pacote', desc: 'Avisa quantas sessões ainda faltam.', icone: 'caixa', cor: 'cyan' },
  { titulo: 'Retorno', desc: 'Traz de volta quem já sumiu.', icone: 'mensagem', cor: 'rose' },
] as const

const KANBAN_ETAPAS = [
  { nome: 'Agendado', cor: 'bg-gray-400' },
  { nome: 'Confirmado', cor: 'bg-blue-500' },
  { nome: 'Em Atendimento', cor: 'bg-amber-500' },
  { nome: 'Banho', cor: 'bg-cyan-500' },
  { nome: 'Tosa', cor: 'bg-purple-500' },
  { nome: 'Finalizado', cor: 'bg-green-500' },
  { nome: 'Entregue', cor: 'bg-emerald-600' },
]

const RECURSOS = [
  { nome: 'Agenda', icone: 'agenda', cor: 'blue' },
  { nome: 'Financeiro', icone: 'moeda', cor: 'green' },
  { nome: 'Clientes', icone: 'usuarios', cor: 'purple' },
  { nome: 'Pets', icone: 'pet', cor: 'amber' },
  { nome: 'Catálogo Digital', icone: 'kanban', cor: 'blue' },
  { nome: 'Kanban', icone: 'kanban', cor: 'cyan' },
  { nome: 'Relatórios', icone: 'relatorio', cor: 'rose' },
  { nome: 'Mensagens', icone: 'mensagem', cor: 'blue' },
  { nome: 'WhatsApp', icone: 'whatsapp', cor: 'green' },
  { nome: 'Estoque', icone: 'caixa', cor: 'amber' },
] as const

const DIFERENCIAIS = [
  'Criado por quem vive o mercado pet',
  'Interface intuitiva',
  'Suporte humanizado',
  'Atualizações constantes',
  'Implantação rápida',
  'Sistema em nuvem',
]

function Logo({ tamanho = 'h-10' }: { tamanho?: string }) {
  return <img src={LOGO_URL} alt="Genix Pet" className={tamanho} />
}

function Nix({ tamanho = 'h-full' }: { tamanho?: string }) {
  return <img src={NIX_URL} alt="Nix, mascote do Genix Pet" className={`${tamanho} object-contain`} />
}

function Botao({ href = '/cadastro', children }: { href?: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold px-7 py-3.5 rounded-lg transition-colors text-base"
    >
      {children}
    </Link>
  )
}

function Eyebrow({ children, claro = false }: { children: React.ReactNode; claro?: boolean }) {
  return (
    <p className={`text-xs font-bold tracking-widest uppercase mb-3 ${claro ? 'text-blue-300' : 'text-blue-600'}`}>
      {children}
    </p>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-1">
      {children}
    </span>
  )
}

// ── Ícones — traço uniforme (1.8), sempre dentro de um círculo colorido ──

type CorBadge = 'blue' | 'green' | 'amber' | 'purple' | 'cyan' | 'rose'

const CORES_BADGE: Record<CorBadge, string> = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  purple: 'bg-purple-50 text-purple-600',
  cyan: 'bg-cyan-50 text-cyan-600',
  rose: 'bg-rose-50 text-rose-600',
}

function IconBadge({ cor = 'blue', tamanho = 'w-11 h-11', children }: { cor?: CorBadge; tamanho?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center justify-center ${tamanho} rounded-full flex-shrink-0 ${CORES_BADGE[cor]}`}>
      {children}
    </span>
  )
}

function Titulo({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`text-[28px] md:text-4xl font-extrabold text-gray-900 tracking-tight ${className}`}>
      {children}
    </h2>
  )
}

const svgProps = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const Icones = {
  calendario: () => (<svg {...svgProps}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>),
  relogio: () => (<svg {...svgProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>),
  mensagem: () => (<svg {...svgProps}><path d="M4 5h16v11H8l-4 4V5z" /></svg>),
  equipe: () => (<svg {...svgProps}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.4" /><path d="M15.5 14c2.6.3 4.5 2.5 4.5 6" /></svg>),
  seringa: () => (<svg {...svgProps}><path d="M20 4l-3 3M14 6l4 4-8 8-4-1-1-4 8-8z" /><path d="M8 16l-4 4" /></svg>),
  grafico: () => (<svg {...svgProps}><path d="M4 20V10M12 20V4M20 20v-7" /><path d="M2 20h20" /></svg>),
  agenda: () => (<svg {...svgProps}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18" /><circle cx="8" cy="14" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="14" r="1.2" fill="currentColor" stroke="none" /></svg>),
  moeda: () => (<svg {...svgProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5c0-1.1 1.1-2 2.5-2s2.5.9 2.5 2c0 3-5 1.5-5 4.5 0 1.1 1.1 2 2.5 2s2.5-.9 2.5-2" /></svg>),
  usuarios: () => (<svg {...svgProps}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.4" /><path d="M15.5 14c2.6.3 4.5 2.5 4.5 6" /></svg>),
  pet: () => (<svg {...svgProps}><circle cx="7" cy="8" r="1.6" /><circle cx="12" cy="6" r="1.6" /><circle cx="17" cy="8" r="1.6" /><path d="M12 11c-3.2 0-5.5 2-5.5 4.4 0 1.8 1.5 2.9 3.3 2.4a4 4 0 0 1 4.4 0c1.8.5 3.3-.6 3.3-2.4 0-2.4-2.3-4.4-5.5-4.4z" /></svg>),
  kanban: () => (<svg {...svgProps}><rect x="4" y="4" width="5" height="16" rx="1.5" /><rect x="10.5" y="4" width="5" height="10" rx="1.5" /><rect x="17" y="4" width="5" height="13" rx="1.5" /></svg>),
  relatorio: () => (<svg {...svgProps}><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 12h6M9 16h6" /></svg>),
  whatsapp: () => (<svg {...svgProps}><path d="M4 20l1.4-4.1A8 8 0 1112 20a8 8 0 01-3.9-1L4 20z" /><path d="M8.5 9.5c.3 2.6 2.4 4.7 5 5" /></svg>),
  caixa: () => (<svg {...svgProps}><path d="M3 9l2-5h14l2 5" /><path d="M3 9h18v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" /><path d="M9 13h6" /></svg>),
  nuvem: () => (<svg {...svgProps}><path d="M6.5 17a4 4 0 01-.5-8 5 5 0 019.6-1.5A4.5 4.5 0 0118.5 17h-12z" /></svg>),
  fones: () => (<svg {...svgProps}><path d="M4 15v-3a8 8 0 0116 0v3" /><rect x="2.5" y="14" width="4" height="6" rx="1.5" /><rect x="17.5" y="14" width="4" height="6" rx="1.5" /></svg>),
  check: () => (<svg {...svgProps}><path d="M5 13l4 4L19 7" /></svg>),
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* NAV */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Logo tamanho="h-12 md:h-14" />
        <div className="hidden md:flex items-center gap-8">
          <a href="#dores" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">Por que usar</a>
          <a href="#recursos" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">Funcionalidades</a>
          <a href="#nix" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">Conheça o Nix</a>
          <a href="#planos" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">Planos</a>
        </div>
        <Link
          href="/login"
          className="text-sm text-gray-700 border border-gray-200 px-4 py-2 rounded-lg hover:border-blue-400 transition-colors"
        >
          Entrar
        </Link>
      </nav>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 pt-8 md:pt-16 pb-10 md:pb-16">
        <div className="grid md:grid-cols-2 gap-8 md:gap-14 items-center">
          <div className="text-center md:text-left">
            <Eyebrow>Desenvolvido para pet shops</Eyebrow>
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-[1.05] tracking-tight">
              O sistema que nasceu dentro de um <span className="text-blue-600">Pet Shop</span>.
            </h1>
            <p className="text-gray-500 text-base md:text-lg mt-5 leading-relaxed">
              Depois de mais de 20 anos vivendo a rotina do mercado pet, transformamos nossa
              experiência em um sistema completo para organizar agenda, clientes, equipe,
              financeiro e atendimento.
            </p>

            <div className="mt-7 flex flex-col gap-2 items-center md:items-start">
              <Botao>{CTA_TEXTO}</Botao>
              <span className="text-xs text-gray-400">{CTA_SUB}</span>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-6">
              <Chip>☁️ 100% em nuvem</Chip>
              <Chip>🐾 Feito para o mercado pet</Chip>
              <Chip>💬 Suporte humanizado</Chip>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            {/* formas geométricas decorativas */}
            <div className="pointer-events-none absolute w-72 h-72 md:w-96 md:h-96 rounded-full bg-blue-50" />
            <div className="pointer-events-none absolute top-2 right-6 w-10 h-10 rounded-full border-4 border-emerald-200 hidden md:block" />
            <div className="pointer-events-none absolute bottom-4 left-2 w-6 h-6 rounded-full bg-amber-300/60 hidden md:block" />

            <div className="w-64 md:w-[28rem] flex-shrink-0 relative z-10">
              <Nix />
            </div>
            <div className="hidden md:flex items-center gap-3 absolute top-6 -left-6 bg-white rounded-2xl px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.10)] border border-gray-100">
              <IconBadge cor="blue" tamanho="w-9 h-9">
                <span className="scale-75">{Icones.agenda()}</span>
              </IconBadge>
              <div>
                <p className="text-[10px] text-gray-400">Agenda de hoje</p>
                <p className="text-sm font-bold text-gray-900">12 atendimentos</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3 absolute bottom-10 -right-4 bg-white rounded-2xl px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.10)] border border-gray-100">
              <IconBadge cor="green" tamanho="w-9 h-9">
                <span className="scale-75">{Icones.whatsapp()}</span>
              </IconBadge>
              <div>
                <p className="text-[10px] text-gray-400">WhatsApp</p>
                <p className="text-sm font-bold text-blue-600">3 lembretes enviados</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DORES */}
      <section id="dores" className="bg-gray-50 py-14 md:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-8 md:mb-12">
            <Eyebrow>O dia a dia real do pet shop</Eyebrow>
            <Titulo className="mb-2">Você abriu um pet shop...</Titulo>
            <p className="text-gray-500">...não para passar o dia apagando incêndios.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {DORES.map(d => (
              <div
                key={d.texto}
                className="bg-white border border-gray-100 rounded-[20px] p-6 flex items-center gap-4 shadow-[0_2px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-250"
              >
                <IconBadge cor={d.cor}>{Icones[d.icone]()}</IconBadge>
                <p className="text-sm text-gray-700 font-medium">{d.texto}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-500 mt-8 md:mt-12 max-w-lg mx-auto">
            O problema nunca foi falta de dedicação. É a falta de um sistema criado
            especificamente para o mercado pet.
          </p>
        </div>
      </section>

      {/* NASCEU DA PRÁTICA */}
      <section className="max-w-5xl mx-auto px-6 py-14 md:py-24 text-center">
        <Eyebrow>Origem</Eyebrow>
        <Titulo className="mb-4">O Genix Pet nasceu da prática.</Titulo>
        <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Não foi desenvolvido primeiro para depois ser vendido. Foi construído ao longo de anos
          de rotina real dentro de um pet shop — cada tela resolve um problema que já foi vivido
          no balcão, na tesoura ou no WhatsApp.
        </p>
      </section>

      {/* DASHBOARD INTELIGENTE */}
      <section className="bg-white py-14 md:py-24 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-8 md:gap-14 items-center">
          <div className="text-center md:text-left">
            <Eyebrow>Painel do dia</Eyebrow>
            <Titulo className="mb-4">Dashboard Inteligente</Titulo>
            <p className="text-gray-500 mb-6 leading-relaxed">
              Comece o dia sabendo exatamente o que precisa ser feito.
            </p>
            <ul className="flex flex-col gap-3 items-center md:items-start">
              {[
                { texto: 'Agenda do dia', icone: 'agenda', cor: 'blue' },
                { texto: 'Valores a receber e contas a pagar', icone: 'moeda', cor: 'green' },
                { texto: 'Resumo financeiro', icone: 'grafico', cor: 'cyan' },
                { texto: 'Próximos atendimentos', icone: 'relogio', cor: 'amber' },
                { texto: 'Botões rápidos de mensagem', icone: 'whatsapp', cor: 'green' },
                { texto: 'Alertas importantes', icone: 'mensagem', cor: 'rose' },
              ].map(i => (
                <li key={i.texto} className="text-sm text-gray-600 flex items-center gap-3">
                  <IconBadge cor={i.cor as CorBadge} tamanho="w-8 h-8">
                    <span className="scale-[0.65]">{Icones[i.icone as keyof typeof Icones]()}</span>
                  </IconBadge>
                  {i.texto}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full bg-blue-50 hidden md:block" />
            <div className="relative bg-gray-50 border border-gray-100 rounded-2xl p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-gray-400">Hoje</p>
                  <p className="text-xl font-bold text-gray-900">12 atendimentos</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-gray-400">A receber</p>
                  <p className="text-xl font-bold text-blue-600">R$ 1.840</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm col-span-2">
                  <p className="text-xs text-gray-400 mb-2">Próximos atendimentos</p>
                  <div className="flex flex-col gap-1.5">
                    <p className="text-sm text-gray-700">09:00 — Thor (banho + tosa)</p>
                    <p className="text-sm text-gray-700">10:30 — Mel (banho)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KANBAN */}
      <section className="bg-gray-50 py-14 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-8 md:mb-12">
            <Eyebrow>Fluxo de atendimento</Eyebrow>
            <Titulo className="mb-2">Kanban em tempo real</Titulo>
            <p className="text-gray-500 max-w-xl mx-auto">
              Basta arrastar o cartão de uma etapa para outra. Toda a equipe acompanha a
              operação ao vivo, sem perguntar "cadê o pet?".
            </p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {KANBAN_ETAPAS.map(etapa => (
              <div
                key={etapa.nome}
                className="bg-white border border-gray-100 rounded-2xl px-4 py-4 min-w-[150px] text-center shadow-[0_2px_16px_rgba(15,23,42,0.04)]"
              >
                <span className={`inline-block w-2 h-2 rounded-full ${etapa.cor} mb-2`} />
                <p className="text-xs font-semibold text-gray-700">{etapa.nome}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATÁLOGO DIGITAL */}
      <section className="bg-white py-14 md:py-24 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-8 md:gap-14 items-center">
          <div className="text-center md:text-left">
            <Eyebrow>Divulgação externa</Eyebrow>
            <Titulo className="mb-4">Catálogo Digital com link próprio</Titulo>
            <p className="text-gray-500 mb-6 leading-relaxed">
              Cada pet shop ganha um link exclusivo para divulgar o catálogo de serviços. O
              tutor escolhe a raça exata do pet — com busca em tempo real, em ordem alfabética —
              ou, se o pet não tiver raça definida, informa porte e pelagem.
            </p>
            <ul className="flex flex-col gap-3 items-center md:items-start">
              {[
                { texto: 'Busca de raça em tempo real', icone: 'pet', cor: 'blue' },
                { texto: '6 faixas de porte + pelagem curta/longa', icone: 'grafico', cor: 'amber' },
                { texto: 'Serviços por grupo: Banho e Tosa, Adicionais e Combos', icone: 'kanban', cor: 'purple' },
                { texto: 'Clientes recorrentes pulam direto para os serviços', icone: 'check', cor: 'green' },
              ].map(i => (
                <li key={i.texto} className="text-sm text-gray-600 flex items-center gap-3">
                  <IconBadge cor={i.cor as CorBadge} tamanho="w-8 h-8">
                    <span className="scale-[0.65]">{Icones[i.icone as keyof typeof Icones]()}</span>
                  </IconBadge>
                  {i.texto}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute -top-6 -left-6 w-24 h-24 rounded-full bg-emerald-50 hidden md:block" />
            <div className="relative bg-gray-50 border border-gray-100 rounded-2xl p-6">
              <p className="text-xs text-gray-400 mb-3">genixpet.com.br/seupetshop</p>
              <div className="flex flex-col gap-2">
                <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">Banho e Tosa — Golden Retriever</span>
                  <span className="text-sm font-bold text-blue-600">R$ 80</span>
                </div>
                <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">Combo Banho + Hidratação</span>
                  <span className="text-sm font-bold text-blue-600">R$ 110</span>
                </div>
                <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">Adicional — Corte de unhas</span>
                  <span className="text-sm font-bold text-blue-600">R$ 20</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRANSPORTE INTELIGENTE */}
      <section className="bg-gray-50 py-14 md:py-24">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="flex justify-center mb-4">
            <IconBadge cor="cyan" tamanho="w-14 h-14">
              <span className="scale-125">{Icones.caixa()}</span>
            </IconBadge>
          </div>
          <Eyebrow>Leva e traz</Eyebrow>
          <Titulo className="mb-4">Transporte Inteligente</Titulo>
          <p className="text-gray-500 max-w-xl mx-auto leading-relaxed mb-10">
            Cálculo automático de distância por geolocalização, com faixas fixas de preço que
            você mesmo configura — e que têm prioridade sobre o cálculo automático quando
            definidas.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { texto: 'Distância calculada automaticamente', icone: 'grafico', cor: 'blue' },
              { texto: 'Valor mínimo para corridas curtas', icone: 'moeda', cor: 'amber' },
              { texto: 'Ida e volta ou só ida', icone: 'relogio', cor: 'purple' },
            ].map(i => (
              <div
                key={i.texto}
                className="bg-white border border-gray-100 rounded-[20px] p-6 flex flex-col items-center gap-3 text-center shadow-[0_2px_16px_rgba(15,23,42,0.04)]"
              >
                <IconBadge cor={i.cor as CorBadge}>{Icones[i.icone as keyof typeof Icones]()}</IconBadge>
                <p className="text-sm text-gray-700 font-medium">{i.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MENSAGENS INTELIGENTES */}
      <section className="py-14 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-8 md:mb-12">
            <Eyebrow>Automação no WhatsApp</Eyebrow>
            <Titulo className="mb-2">Mensagens Inteligentes</Titulo>
            <p className="text-gray-500 max-w-xl mx-auto">Menos trabalho repetitivo, mais tempo cuidando dos pets.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {MENSAGENS.map((m, i) => (
              <div
                key={m.titulo}
                className="bg-[#ECE5DD] rounded-[20px] p-5 shadow-[0_2px_16px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-center gap-2 mb-3">
                  <IconBadge cor={m.cor} tamanho="w-7 h-7">
                    <span className="scale-[0.6]">{Icones[m.icone]()}</span>
                  </IconBadge>
                  <span className="text-xs font-semibold text-gray-600">Automático</span>
                </div>
                <div className="bg-white rounded-xl rounded-tl-none px-4 py-3 shadow-sm">
                  <p className="text-gray-900 font-semibold text-sm mb-1">{m.titulo}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{m.desc}</p>
                  <p className="text-[10px] text-gray-400 text-right mt-2">
                    {`0${8 + i}:${10 + i * 3 < 60 ? 10 + i * 3 : 10}`} ✓✓
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VITRINE PREMIUM */}
      <section className="bg-[#0B1730] py-14 md:py-24 relative overflow-hidden">
        {/* brilhos discretos de fundo */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <span className="inline-block text-[11px] font-bold tracking-widest uppercase text-white bg-blue-600 rounded-full px-3 py-1 mb-5">
            Premium
          </span>
          <Eyebrow claro>Baseado em mais de 20 anos de experiência</Eyebrow>
          <h2 className="text-[28px] md:text-4xl font-extrabold text-white tracking-tight mb-4">
            Comece com a experiência de quem já vive o mercado pet.
          </h2>
          <p className="text-blue-100/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            Catálogo digital com link próprio para divulgação externa, relatório fiscal e
            controle de estoque avançado — tudo em um único plano.
          </p>

          <Link
            href="#planos"
            className="inline-block bg-white hover:bg-blue-50 text-[#0B1730] font-bold px-7 py-3.5 rounded-2xl transition-colors text-base"
          >
            Ver planos
          </Link>
        </div>
      </section>

      {/* ATENDIMENTO INTEGRADO */}
      <section className="max-w-5xl mx-auto px-6 py-14 md:py-24 text-center">
        <div className="flex justify-center mb-4">
          <IconBadge cor="purple" tamanho="w-14 h-14">
            <span className="scale-125">{Icones.fones()}</span>
          </IconBadge>
        </div>
        <Eyebrow>Suporte</Eyebrow>
        <Titulo className="mb-4">Atendimento Integrado</Titulo>
        <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">
          Precisa de ajuda? Fale com o suporte sem sair do sistema. Mais rapidez, mais praticidade.
        </p>
      </section>

      {/* GRID DE RECURSOS */}
      <section id="recursos" className="bg-white py-14 md:py-24 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-8 md:mb-12">
            <Eyebrow>Tudo integrado</Eyebrow>
            <Titulo>Tudo em um único lugar</Titulo>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {RECURSOS.map(r => (
              <div
                key={r.nome}
                className="border border-gray-100 rounded-2xl px-4 py-5 flex flex-col items-center gap-2 text-center text-sm text-gray-700 font-medium shadow-[0_2px_16px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-250"
              >
                <IconBadge cor={r.cor}>{Icones[r.icone]()}</IconBadge>
                {r.nome}
              </div>
            ))}
          </div>
          <div className="text-center mt-8 md:mt-12">
            <Botao>Quero testar gratuitamente</Botao>
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section className="py-14 md:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-8 md:mb-12">
            <Eyebrow>Diferenciais</Eyebrow>
            <Titulo>Por que escolher o Genix Pet</Titulo>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-6">
            {DIFERENCIAIS.map(d => (
              <div key={d} className="flex items-center gap-3">
                <IconBadge cor="green" tamanho="w-8 h-8">
                  <span className="scale-[0.65]">{Icones.check()}</span>
                </IconBadge>
                <p className="text-sm text-gray-700">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONHEÇA O NIX */}
      <section id="nix" className="bg-gray-50 py-14 md:py-24">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-8 md:gap-14 items-center">
          <div className="w-56 md:w-72 mx-auto">
            <img
              src={NIX_SOCIAL_URL}
              alt="Nix, o mascote do Genix Pet"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="text-center md:text-left">
            <Eyebrow>Conheça o Nix</Eyebrow>
            <Titulo className="mb-4">Olá! Eu sou o Nix.</Titulo>
            <p className="text-gray-500 leading-relaxed mb-6">
              Meu trabalho é deixar sua rotina muito mais organizada. Enquanto você cuida dos
              pets, eu cuido da gestão — e agora também faço parte do universo Genix Pet nas
              redes sociais.
            </p>
            <a
              href="#"
              className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-blue-400 text-gray-800 font-semibold px-5 py-3 rounded-2xl transition-colors text-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
              </svg>
              Seguir o Nix nas redes sociais
            </a>
          </div>
        </div>
      </section>

      {/* 20 ANOS */}
      <section className="max-w-5xl mx-auto px-6 py-14 md:py-24 text-center">
        <Eyebrow>Nossa trajetória</Eyebrow>
        <Titulo className="mb-4">Mais de 20 anos transformados em tecnologia.</Titulo>
        <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Cada função do sistema nasceu para resolver um problema real. Nada foi criado apenas
          para preencher uma lista de funcionalidades.
        </p>
      </section>

      {/* PLANOS */}
      <section id="planos" className="max-w-6xl mx-auto px-6 py-14 md:py-24 bg-gray-50 rounded-[32px]">
        <div className="text-center mb-8 md:mb-12">
          <Eyebrow>Planos</Eyebrow>
          <Titulo className="mb-2">Planos simples e transparentes</Titulo>
          <p className="text-gray-500">{CTA_SUB}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANOS.map(plano => (
            <div
              key={plano.nome}
              className={`bg-white rounded-[24px] p-8 relative transition-all duration-250 ${
                plano.destaque
                  ? 'border-2 border-blue-500 shadow-[0_16px_40px_rgba(37,99,235,0.14)] md:-translate-y-2'
                  : 'border border-gray-200 shadow-[0_2px_16px_rgba(15,23,42,0.04)]'
              }`}
            >
              {plano.destaque && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Mais escolhido
                </span>
              )}
              <p className="text-sm font-medium text-gray-500">{plano.nome}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                R$ {plano.preco}<span className="text-sm font-normal text-gray-400">/mês</span>
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

                            {plano.disponivel ? (
                <Botao>{CTA_TEXTO}</Botao>
              ) : (
                <span className="inline-block bg-gray-100 text-gray-400 font-bold px-7 py-3.5 rounded-lg text-base cursor-not-allowed">
                  Em breve
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="max-w-2xl mx-auto px-6 py-14 md:py-24 text-center">
        <Titulo className="mb-4">Experimente gratuitamente.</Titulo>
        <p className="text-gray-500 mb-6">
          Descubra por que tantos profissionais escolhem um sistema criado por quem realmente
          conhece o mercado pet.
        </p>
        <div className="flex flex-col gap-2 items-center">
          <Botao>{CTA_TEXTO}</Botao>
          <span className="text-xs text-gray-400">{CTA_SUB}</span>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-50 py-10 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo tamanho="h-8" />
          <div className="flex items-center gap-6 text-xs text-gray-400">
            <a href="#" className="hover:text-blue-600 transition-colors">Política de privacidade</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Termos de uso</a>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          Genix Pet © — Uma empresa do grupo Web Genix Digital
        </p>
      </footer>
    </div>
  )
}
