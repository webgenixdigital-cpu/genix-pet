'use client'

import { useState } from 'react'

const PLANOS = [
  { id: 'starter', nome: 'Starter', preco: 'R$ 89,90', desc: '1 profissional' },
  { id: 'premium', nome: 'Premium', preco: 'R$ 189,90', desc: 'Ate 3 profissionais' },
  { id: 'pro', nome: 'Pro', preco: 'R$ 349,90', desc: 'Ate 10 profissionais' },
]

export default function ConfiguracoesPage() {
  const [carregando, setCarregando] = useState<string | null>(null)

  async function assinar(plano: string) {
    setCarregando(plano)

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plano }),
    })

    const data = await res.json()

    if (data.url) {
      window.location.href = data.url
    } else {
      alert('Erro ao iniciar checkout: ' + (data.error || 'desconhecido'))
      setCarregando(null)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Configuracoes</h2>
      <p className="text-sm text-gray-500 mb-6">Escolha o plano da sua assinatura</p>

      <div className="grid grid-cols-3 gap-4">
        {PLANOS.map(p => (
          <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-sm font-medium text-gray-900">{p.nome}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{p.preco}<span className="text-xs text-gray-400 font-normal">/mes</span></p>
            <p className="text-xs text-gray-400 mt-1 mb-4">{p.desc}</p>
            <button
              onClick={() => assinar(p.id)}
              disabled={carregando === p.id}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {carregando === p.id ? 'Redirecionando...' : 'Assinar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}