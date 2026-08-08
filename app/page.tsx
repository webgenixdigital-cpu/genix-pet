'use client'

import Link from 'next/link'

const LOGO_URL =
  'https://tufsjmcgvlbrqltagklr.supabase.co/storage/v1/object/public/logos/ChatGPT%20Image%208%20de%20ago.%20de%202026,%2010_17_27.png'

const NIX_URL =
  'https://tufsjmcgvlbrqltagklr.supabase.co/storage/v1/object/public/site-assets/ChatGPT%20Image%207%20de%20ago.%20de%202026,%2008_02_27.png'

// Second Nix pose, used in the "Conheça o Nix" / social section
const NIX_SOCIAL_URL =
  'https://tufsjmcgvlbrqltagklr.supabase.co/storage/v1/object/public/site-assets/ChatGPT%20Image%208%20de%20ago.%20de%202026,%2010_18_53.png'

const CTA_TEXTO = 'Teste Grátis por 14 Dias'
const CTA_SUB = 'Sem cartão de crédito. Comece em poucos minutos.'

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
      'Cadastros inteligentes (raças, portes, pelagens, tabela de banho)',
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
      'Combos inteligentes com sugestões de upsell no WhatsApp',
    ],
  },
]

const DORES = [
  { emoji: '📅', texto: 'Agenda desorganizada' },
  { emoji: '⏰', texto: 'Clientes esquecendo horários' },
  { emoji: '💬', texto: 'WhatsApp lotado de mensagens repetidas' },
  { emoji: '👥', texto: 'Equipe sem visão do que fazer' },
  { emoji: '💉', texto: 'Vacinas e retornos sem controle' },
  { emoji: '📊', texto: 'Financeiro no chute' },
]

const MENSAGENS = [
  { titulo: 'Lembrete de banho', desc: 'Enviado automaticamente antes do horário.' },
  { titulo: 'Confirmação', desc: 'O cliente confirma sem precisar ligar.' },
  { titulo: 'Pet pronto', desc: 'Avisa a hora exata de buscar.' },
  { titulo: 'Reagendamento', desc: 'Resolve faltas sem perder o horário.' },
  { titulo: 'Vacinas', desc: 'Alerta quando o reforço está próximo.' },
  { titulo: 'Retorno', desc: 'Traz de volta quem já sumiu.' },
]

const KANBAN_ETAPAS = [
  { nome: 'Agendado', cor: 'bg-gray-400' },
  { nome: 'Confirmado', cor: 'bg-blue-500' },
  { nome: 'Em Atendimento', cor: 'bg-amber-500' },
  { nome: 'Banho', cor: 'bg-cyan-500' },
  { nome: 'Tosa', cor: 'bg-purple-500' },
  { nome: 'Finalizado', cor: 'bg-green-500' },
  { nome: 'Entregue', cor: 'bg-emerald-600' },
]

const CADASTROS = ['Raças', 'Portes', 'Pelagens', 'Categorias', 'Espécies', 'Serviços', 'Tabela de banho']

const COMBOS = [
  'Banho + Hidratação',
  'Banho + Corte de Unhas',
  'Banho + Escovação Dental',
  'Banho + Perfumaria',
  'Plano Mensal',
  'Pacote Banho e Tosa',
]

const RECURSOS = [
  'Agenda', 'Financeiro', 'Clientes', 'Pets', 'Vacinas', 'CRM',
  'Kanban', 'Relatórios', 'Mensagens', 'Catálogo Digital',
  'Automações', 'Assinatura Digital', 'WhatsApp', 'Estoque', 'Campanhas',
]

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
      <section className="max-w-6xl mx-auto px-6 pt-10 md:pt-20 pb-20">
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div>
            <Eyebrow>Desenvolvido para pet shops</Eyebrow>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
              O sistema que nasceu dentro de um Pet Shop.
            </h1>
            <p className="text-gray-500 text-base md:text-lg mt-5 leading-relaxed">
              Depois de mais de 20 anos vivendo a rotina do mercado pet, transformamos nossa
              experiência em um sistema completo para organizar agenda, clientes, equipe,
              financeiro e atendimento.
            </p>

            <div className="mt-9 flex flex-col gap-2 items-start">
              <Botao>{CTA_TEXTO}</Botao>
              <span className="text-xs text-gray-400">{CTA_SUB}</span>
            </div>

            <div className="flex flex-wrap gap-2 mt-8">
              <Chip>☁️ 100% em nuvem</Chip>
              <Chip>🐾 Feito para o mercado pet</Chip>
              <Chip>💬 Suporte humanizado</Chip>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="w-80 md:w-[28rem] flex-shrink-0 relative z-10">
              <Nix />
            </div>
            <div className="hidden md:block absolute top-6 -left-6 bg-white rounded-2xl px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.10)] border border-gray-100">
              <p className="text-[10px] text-gray-400">Agenda de hoje</p>
              <p className="text-sm font-bold text-gray-900">12 atendimentos</p>
            </div>
            <div className="hidden md:block absolute bottom-10 -right-4 bg-white rounded-2xl px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.10)] border border-gray-100">
              <p className="text-[10px] text-gray-400">WhatsApp</p>
              <p className="text-sm font-bold text-blue-600">3 lembretes enviados</p>
            </div>
          </div>
        </div>
      </section>

      {/* DORES */}
      <section id="dores" className="bg-gray-50 py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <Eyebrow>O dia a dia real do pet shop</Eyebrow>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Você abriu um pet shop...
            </h2>
            <p className="text-gray-500">...não para passar o dia apagando incêndios.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {DORES.map(d => (
              <div
                key={d.texto}
                className="bg-white border border-gray-100 rounded-[20px] p-8 flex items-center gap-4 shadow-[0_2px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-250"
              >
                <span className="text-2xl">{d.emoji}</span>
                <p className="text-sm text-gray-700 font-medium">{d.texto}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-500 mt-14 max-w-lg mx-auto">
            O problema nunca foi falta de dedicação. É a falta de um sistema criado
            especificamente para o mercado pet.
          </p>
        </div>
      </section>

      {/* NASCEU DA PRÁTICA */}
      <section className="max-w-5xl mx-auto px-6 py-24 md:py-32 text-center">
        <Eyebrow>Origem</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          O Genix Pet nasceu da prática.
        </h2>
        <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Não foi desenvolvido primeiro para depois ser vendido. Foi construído ao longo de anos
          de rotina real dentro de um pet shop — cada tela resolve um problema que já foi vivido
          no balcão, na tesoura ou no WhatsApp.
        </p>
      </section>

      {/* DASHBOARD INTELIGENTE */}
      <section className="bg-white py-24 md:py-32 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <Eyebrow>Painel do dia</Eyebrow>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Dashboard Inteligente</h2>
            <p className="text-gray-500 mb-6 leading-relaxed">
              Comece o dia sabendo exatamente o que precisa ser feito.
            </p>
            <ul className="flex flex-col gap-2">
              {['Agenda do dia', 'Valores a receber e contas a pagar', 'Resumo financeiro', 'Próximos atendimentos', 'Botões rápidos de mensagem', 'Alertas importantes'].map(i => (
                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-blue-600 flex-shrink-0">✓</span>{i}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
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
      </section>

      {/* KANBAN */}
      <section className="bg-gray-50 py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <Eyebrow>Fluxo de atendimento</Eyebrow>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Kanban em tempo real</h2>
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

      {/* MENSAGENS INTELIGENTES */}
      <section className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <Eyebrow>Automação no WhatsApp</Eyebrow>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Mensagens Inteligentes</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Menos trabalho repetitivo, mais tempo cuidando dos pets.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {MENSAGENS.map((m, i) => (
              <div
                key={m.titulo}
                className="bg-[#ECE5DD] rounded-[20px] p-5 shadow-[0_2px_16px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    N
                  </span>
                  <span className="text-xs font-semibold text-gray-600">Nix</span>
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
      <section className="bg-[#0B1730] py-24 md:py-32 relative overflow-hidden">
        {/* brilhos discretos de fundo */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <span className="inline-block text-[11px] font-bold tracking-widest uppercase text-white bg-blue-600 rounded-full px-3 py-1 mb-5">
            Premium
          </span>
          <Eyebrow claro>Baseado em mais de 20 anos de experiência</Eyebrow>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Comece com a experiência de quem já vive o mercado pet.
          </h2>
          <p className="text-blue-100/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            Tabela de preços sugerida, serviços pré-configurados, raças, categorias, pelagens,
            fluxos, mensagens, automações e combos — tudo baseado na experiência prática da
            equipe Genix. E tudo pode ser editado.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {CADASTROS.map(c => (
              <span
                key={c}
                className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-blue-50 font-medium backdrop-blur-sm"
              >
                {c}
              </span>
            ))}
          </div>

          <Link
            href="#planos"
            className="inline-block bg-white hover:bg-blue-50 text-[#0B1730] font-bold px-7 py-3.5 rounded-2xl transition-colors text-base"
          >
            Ver planos
          </Link>
        </div>
      </section>

      {/* COMBOS INTELIGENTES */}
      <section className="bg-gray-50 py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <Eyebrow>Ticket médio</Eyebrow>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Combos Inteligentes</h2>
            <p className="text-gray-500 mb-5 leading-relaxed">
              Muitos pet shops vendem apenas banho. O sistema sugere combos com maior valor
              percebido — inspirados na experiência prática de mercado e totalmente
              personalizáveis.
            </p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Não é uma promessa de faturamento garantido: é uma forma de construir ofertas melhores.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {COMBOS.map(c => (
              <div
                key={c}
                className="relative bg-white border border-gray-100 rounded-[20px] p-5 shadow-[0_2px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-250"
              >
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                  Combo
                </span>
                <p className="text-sm text-gray-800 font-semibold">{c}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ATENDIMENTO INTEGRADO */}
      <section className="max-w-5xl mx-auto px-6 py-24 md:py-32 text-center">
        <Eyebrow>Suporte</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Atendimento Integrado</h2>
        <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">
          Precisa de ajuda? Fale com o suporte sem sair do sistema. Mais rapidez, mais praticidade.
        </p>
      </section>

      {/* GRID DE RECURSOS */}
      <section id="recursos" className="bg-white py-24 md:py-32 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <Eyebrow>Tudo integrado</Eyebrow>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Tudo em um único lugar
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {RECURSOS.map(r => (
              <div
                key={r}
                className="border border-gray-100 rounded-2xl px-4 py-4 text-center text-sm text-gray-700 font-medium shadow-[0_2px_16px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-250"
              >
                {r}
              </div>
            ))}
          </div>
          <div className="text-center mt-14">
            <Botao>Quero testar gratuitamente</Botao>
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section className="py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <Eyebrow>Diferenciais</Eyebrow>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Por que escolher o Genix Pet
          </h2>
          </div>
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

      {/* CONHEÇA O NIX */}
      <section id="nix" className="bg-gray-50 py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-14 items-center">
          <div className="w-56 md:w-72 mx-auto">
            <img
              src={NIX_SOCIAL_URL}
              alt="Nix, o mascote do Genix Pet"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <Eyebrow>Conheça o Nix</Eyebrow>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Olá! Eu sou o Nix.</h2>
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
      <section className="max-w-5xl mx-auto px-6 py-24 md:py-32 text-center">
        <Eyebrow>Nossa trajetória</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          Mais de 20 anos transformados em tecnologia.
        </h2>
        <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Cada função do sistema nasceu para resolver um problema real. Nada foi criado apenas
          para preencher uma lista de funcionalidades.
        </p>
      </section>

      {/* PLANOS */}
      <section id="planos" className="max-w-6xl mx-auto px-6 py-24 md:py-32 bg-gray-50 rounded-[32px]">
        <div className="text-center mb-14">
          <Eyebrow>Planos</Eyebrow>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Planos simples e transparentes</h2>
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

              <Botao>{CTA_TEXTO}</Botao>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="max-w-2xl mx-auto px-6 py-24 md:py-32 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          Experimente gratuitamente.
        </h2>
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