'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function CadastroPage() {
  const [nome, setNome] = useState('')
  const [slug, setSlug] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function gerarSlug(valor: string) {
    return valor
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  async function handleCadastro() {
    setCarregando(true)
    setErro('')

    if (!nome || !slug || !email || !password) {
      setErro('Preencha todos os campos.')
      setCarregando(false)
      return
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError || !authData.user) {
      setErro('Erro ao criar conta: ' + authError?.message)
      setCarregando(false)
      return
    }

    const { error: tenantError } = await supabase
      .from('tenants')
      .insert({ nome, slug, email, status: 'trial' })

    if (tenantError) {
      setErro('Erro ao cadastrar pet shop: ' + tenantError.message)
      setCarregando(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Genix Pet</h1>
        <p className="text-gray-500 text-sm mb-8">Cadastre seu pet shop — 7 dias gratis</p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Nome do pet shop</label>
            <input
              type="text"
              value={nome}
              onChange={e => {
                setNome(e.target.value)
                setSlug(gerarSlug(e.target.value))
              }}
              placeholder="Pet Shop da Maria"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Link de agendamento</label>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden text-sm">
              <span className="bg-gray-50 px-3 py-2 text-gray-400 border-r border-gray-200">
                genixpet.com/agendar/
              </span>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(gerarSlug(e.target.value))}
                placeholder="pet-shop-da-maria"
                className="flex-1 px-3 py-2 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="minimo 6 caracteres"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {erro && <p className="text-red-500 text-sm">{erro}</p>}

          <button
            onClick={handleCadastro}
            disabled={carregando}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {carregando ? 'Cadastrando...' : 'Criar conta gratis'}
          </button>

          <p className="text-center text-sm text-gray-500">
            ja tem conta?{' '}
            <a href="/login" className="text-blue-600 hover:underline">
              Entrar
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}