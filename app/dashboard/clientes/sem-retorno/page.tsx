'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type ClienteSemRetorno = {
  id: string
  nome: string
  telefone: string
  ultimoAtendimento: string
  diasSemRetorno: number
  ultimoPet: string
}

function formatarDataISO(data: Date): string {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export default function ClientesSemRetornoPage() {
  const [clientes, setClientes] = useState<ClienteSemRetorno[]>([])
  const [carregando, setCarregando] = useState(true)
  const supabase = createClient()

  async function carregarDados() {
    setCarregando(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setCarregando(false)
      return
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('email', user.email)
      .single()

    if (!tenant) {
      setCarregando(false)
      return
    }

    const { data: todosClientes } = await supabase
      .from('customers')
      .select('id, nome, telefone')
      .eq('tenant_id', tenant.id)
      .eq('ativo', true)

    const { data: agendamentos } = await supabase
      .from('appointments')
      .select('customer_id, inicio, pets ( nome )')
      .eq('tenant_id', tenant.id)
      .neq('status', 'cancelado')
      .order('inicio', { ascending: false })

    const ultimoPorCliente: Record<string, { data: string; pet: string }> = {}
    ;(agendamentos || []).forEach((a: any) => {
      if (!ultimoPorCliente[a.customer_id]) {
        ultimoPorCliente[a.customer_id] = { data: a.inicio, pet: a.pets?.nome || '' }
      }
    })

    const limite30dias = new Date()
    limite30dias.setDate(limite30dias.getDate() - 30)

    const resultado: ClienteSemRetorno[] = []

    ;(todosClientes || []).forEach(c => {
      const ultimo = ultimoPorCliente[c.id]
      if (!ultimo) return

      const dataUltimo = new Date(ultimo.data)
      if (dataUltimo < limite30dias) {
        const diffMs = Date.now() - dataUltimo.getTime()
        const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        resultado.push({
          id: c.id,
          nome: c.nome,
          telefone: c.telefone,
          ultimoAtendimento: formatarDataISO(dataUltimo),
          diasSemRetorno: dias,
          ultimoPet: ultimo.pet,
        })
      }
    })

    resultado.sort((a, b) => b.diasSemRetorno - a.diasSemRetorno)
    setClientes(resultado)
    setCarregando(false)
  }

  useEffect(() => { carregarDados() }, [])

  function enviarMensagemPosVenda(cliente: ClienteSemRetorno) {
    const telefone = (cliente.telefone || '').replace(/\D/g, '')
    if (!telefone) {
      alert('Cliente sem telefone cadastrado.')
      return
    }

    const telefoneComDDI = telefone.startsWith('55') ? telefone : `55${telefone}`

    const mensagem = `Ola, ${cliente.nome}! Tudo bem? 🐾\n\nFaz um tempinho que o(a) ${cliente.ultimoPet || 'seu pet'} nao vem nos visitar, e sentimos falta de voces por aqui!\n\nQue tal agendar um banho? Temos horarios disponiveis essa semana. E so responder aqui que a gente ja separa um horario especial para voces.`

    const link = `https://wa.me/${telefoneComDDI}?text=${encodeURIComponent(mensagem)}`
    window.open(link, '_blank')
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Clientes sem retorno</h2>
      <p className="text-sm text-gray-500 mb-6">
        Clientes que nao agendam ha mais de 30 dias
      </p>

      {carregando ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : clientes.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum cliente sem retorno no momento. 🎉</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {clientes.map(c => (
            <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{c.nome}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {c.ultimoPet && `Ultimo pet: ${c.ultimoPet} • `}
                  Ultimo atendimento: {new Date(c.ultimoAtendimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>

              <span className="text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full whitespace-nowrap">
                {c.diasSemRetorno} dias sem retorno
              </span>

              <button
                onClick={() => enviarMensagemPosVenda(c)}
                className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                💬 Enviar mensagem
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}