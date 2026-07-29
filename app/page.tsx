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
    ],
  },
]

function IconeCalendario() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  )
}

function IconeTelefone() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .5 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4.1c0-.6.5-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.2 1L6.6 10.8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconeRelogio() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconeArquivos() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 8h5l2 2h9v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
      <path d="M9 4h5l2 2h4a1 1 0 011 1v2" />
    </svg>
  )
}

function IconeCalculadora() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8M8 11h1M12 11h1M16 11h1M8 15h1M12 15h1M16 15h1M8 18h1M12 18h1M16 18h1" strokeLinecap="round" />
    </svg>
  )
}

function IconeMensagensMultiplas() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 5h12v8H8l-3 3v-3H3z" />
      <path d="M11 4h9a1 1 0 011 1v8h-3v3l-3-3h-4" />
    </svg>
  )
}

function IconeCalendarioVazio() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" />
      <path d="M9 14l6 4M15 14l-6 4" strokeLinecap="round" />
    </svg>
  )
}

function IconeMoeda() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.5c0-1.1 1.1-2 2.5-2s2.5.9 2.5 2c0 3-5 1.5-5 4.5 0 1.1 1.1 2 2.5 2s2.5-.9 2.5-2" strokeLinecap="round" />
    </svg>
  )
}

function IconeRepetir() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 12a8 8 0 0113.7-5.7L20 8M20 4v4h-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 12a8 8 0 01-13.7 5.7L4 16M4 20v-4h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconeMensagem() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 5h16v11H8l-4 4V5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const PROBLEMAS = [
  { Icone: IconeMensagensMultiplas, texto: 'As mensagens do WhatsApp se acumulam entre um atendimento e outro.' },
  { Icone: IconeCalendarioVazio, texto: 'De vez em quando, alguém esquece o horário e a vaga fica parada.' },
  { Icone: IconeArquivos, texto: 'O histórico do pet fica espalhado entre caderno, memória e boa vontade.' },
  { Icone: IconeCalculadora, texto: 'No fim do mês, comissão e financeiro viram uma continha à parte.' },
]

const FUNCIONALIDADES = [
  { Icone: IconeCalendario, titulo: 'Agendamento online 24h', desc: 'Seu cliente marca sozinho pelo celular, a qualquer hora — sem depender de telefone.' },
  { Icone: IconeRepetir, titulo: 'Recorrência automática', desc: 'Banhos 1x, 2x ou 4x por mês agendados sozinhos, sem retrabalho.' },
  { Icone: IconeMensagem, titulo: 'WhatsApp com aprovação', desc: 'Você aprova cada horário antes de confirmar. Zero furo de agenda.' },
  { Icone: IconeMoeda, titulo: 'Financeiro automático', desc: 'Receita, comissão e pacotes calculados sozinhos a cada atendimento.' },
]

function LogoGenixPet({ tamanho = 'h-8' }: { tamanho?: string }) {
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
        <LogoGenixPet tamanho="h-28 md:h-36" />
        <div className="hidden md:flex items-center gap-8">
          <a href="#problema" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">Por que Genix Pet</a>
          <a href="#funcionalidades" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">Funcionalidades</a>
          <a href="#planos" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">Planos</a>
        </div>
        <Link
          href="/login"
          className="text-sm text-gray-700 border border-gray-200 px-4 py-2 rounded-lg hover:border-blue-400 transition-colors"
        >
          Entrar
        </Link>
      </nav>
      <section className="max-w-6xl mx-auto px-6 pt-4 md:pt-8 pb-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
            Agenda cheia, sem dor de cabeça.
          </h1>
          <p className="text-gray-500 text-base md:text-lg mt-5 leading-relaxed">
            O sistema de agendamento online feito para banho e tosa. Seu cliente marca sozinho,
            você aprova com um toque, e o financeiro se atualiza sozinho.
          </p>

          <ul className="mt-6 flex flex-col gap-3">
            <li className="flex items-center gap-3 text-sm text-gray-700">
              <span className="text-blue-600 flex-shrink-0"><IconeCalendario /></span>
              Agendamento online 24 horas por dia
            </li>
            <li className="flex items-center gap-3 text-sm text-gray-700">
              <span className="text-blue-600 flex-shrink-0"><IconeMensagem /></span>
              Confirmação automática pelo WhatsApp
            </li>
            <li className="flex items-center gap-3 text-sm text-gray-700">
              <span className="text-blue-600 flex-shrink-0"><IconeMoeda /></span>
              Financeiro e comissões calculados sozinhos
            </li>
          </ul>
          <div className="mt-8 flex items-center gap-4">
            <Link
              href="/cadastro"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-lg transition-colors"
            >
              Experimentar grátis por 7 dias
            </Link>
            <span className="text-xs text-gray-400">Sem cartão de crédito</span>
          </div>
        </div>

        <div className="rounded-3xl overflow-hidden shadow-xl">
          <img
            src="https://tufsjmcgvlbrqltagklr.supabase.co/storage/v1/object/public/site-assets/relacao-tutor-cachorro.webp"
            alt="Tutor e pet interagindo com carinho"
            className="w-full h-full object-cover"
          />
        </div>
      </section>
      <section id="problema" className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-2">
            Você já deve ter vivido alguma dessas cenas
          </h2>
          <p className="text-gray-500 text-center mb-10 max-w-xl mx-auto">
            Nada muito grave, isoladamente. Mas junto, elas vão tomando um tempo que você gostaria de ter de volta.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {PROBLEMAS.map(p => (
              <div key={p.texto} className="bg-blue-50 border border-blue-100 rounded-2xl p-7 flex flex-col items-center text-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <span className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-md">
                  <p.Icone />
                </span>
                <p className="text-sm text-gray-700 font-medium leading-relaxed">{p.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          Pois é exatamente isso que muda com o Genix Pet.
        </h2>
        <p className="text-gray-500 leading-relaxed">
          Seu cliente agenda sozinho, você aprova com um toque, e o financeiro fecha sozinho a cada atendimento.
          Menos tempo repetindo tarefa, mais tempo fazendo o que só você sabe fazer: cuidar bem de cada pet
          que passa pela sua porta.
        </p>
        <div className="mt-6">
          <Link
            href="/cadastro"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg transition-colors"
          >
            Quero simplificar minha rotina
          </Link>
        </div>
      </section>
      <section id="funcionalidades" className="bg-blue-600 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10">
            Tudo que resolve isso, em um só lugar
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {FUNCIONALIDADES.map(f => (
              <div key={f.titulo} className="bg-white rounded-2xl p-6">
                <div className="text-blue-600 mb-4">
                  <f.Icone />
                </div>
                <h3 className="text-gray-900 font-semibold text-sm mb-2">{f.titulo}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="planos" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-2">Escolha o plano e comece hoje mesmo</h2>
        <p className="text-gray-500 text-center mb-10">7 dias grátis para sentir a diferença na sua rotina, sem cartão de crédito</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANOS.map(plano => (
            <div
              key={plano.nome}
              className={`rounded-2xl p-6 relative ${
                plano.destaque ? 'border-2 border-orange-400 shadow-lg' : 'border border-gray-200'
              }`}
            >
              {plano.destaque && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
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
                className={`block text-center text-sm font-bold py-2.5 rounded-lg transition-colors ${
                  plano.destaque
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'border border-gray-200 text-gray-700 hover:border-blue-400'
                }`}
              >
                Começar grátis
            </Link>
          </div>
        ))}
        </div>
      </section>

      <footer className="bg-gray-50 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          
          
          <div className="flex items-center gap-6 text-xs text-gray-400">
            <a href="#" className="hover:text-blue-600 transition-colors">Política de privacidade</a>
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