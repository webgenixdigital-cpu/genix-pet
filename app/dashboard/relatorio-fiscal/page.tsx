'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Lancamento = {
  id: string
  tipo: string
  categoria: string | null
  valor: number
  forma_pagamento: string | null
  status: string
  data_lancamento: string
}

function formatarDataISO(data: Date): string {
  return data.toISOString().split('T')[0]
}

function primeiroDiaDoMes(): string {
  const d = new Date()
  return formatarDataISO(new Date(d.getFullYear(), d.getMonth(), 1))
}

function formatarMoeda(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`
}

export default function RelatorioFiscalPage() {
  const [dataInicio, setDataInicio] = useState(primeiroDiaDoMes())
  const [dataFim, setDataFim] = useState(formatarDataISO(new Date()))
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [nomeTenant, setNomeTenant] = useState('')
  const [carregando, setCarregando] = useState(true)
  const supabase = createClient()

  async function carregarDados() {
    setCarregando(true)
    const { data: tenant } = await supabase.from('tenants').select('id, nome').single()
    if (!tenant) {
      setCarregando(false)
      return
    }
    setNomeTenant(tenant.nome)

    const { data } = await supabase
      .from('financial_transactions')
      .select('id, tipo, categoria, valor, forma_pagamento, status, data_lancamento')
      .eq('tenant_id', tenant.id)
      .eq('tipo', 'receita')
      .eq('status', 'pago')
      .gte('data_lancamento', dataInicio)
      .lte('data_lancamento', dataFim)
      .order('data_lancamento')

    setLancamentos(data || [])
    setCarregando(false)
  }

  useEffect(() => { carregarDados() }, [dataInicio, dataFim])

  const totalServicos = lancamentos.filter(l => l.categoria === 'Servico' || l.categoria === 'Pacote').reduce((s, l) => s + Number(l.valor), 0)
  const totalProdutos = lancamentos.filter(l => l.categoria === 'Produto').reduce((s, l) => s + Number(l.valor), 0)
  const totalOutros = lancamentos.filter(l => !['Servico', 'Produto', 'Pacote'].includes(l.categoria || '')).reduce((s, l) => s + Number(l.valor), 0)
  const totalGeral = totalServicos + totalProdutos + totalOutros

  const porFormaPagamento = lancamentos.reduce((acc: Record<string, number>, l) => {
    const forma = l.forma_pagamento || 'Nao informado'
    acc[forma] = (acc[forma] || 0) + Number(l.valor)
    return acc
  }, {})
  function exportarPDF() {
    const jsPDF = require('jspdf').default
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text('Relatorio Fiscal', 14, 18)
    doc.setFontSize(10)
    doc.text(nomeTenant, 14, 25)
    doc.text(`Periodo: ${new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR')}`, 14, 31)

    let y = 45
    doc.setFontSize(12)
    doc.text('Resumo por categoria (base de calculo)', 14, y)
    y += 8
    doc.setFontSize(10)
    doc.text(`Servicos (ISS / NFS-e): ${formatarMoeda(totalServicos)}`, 14, y)
    y += 6
    doc.text(`Produtos (ICMS / NF-e): ${formatarMoeda(totalProdutos)}`, 14, y)
    y += 6
    if (totalOutros > 0) {
      doc.text(`Outras receitas: ${formatarMoeda(totalOutros)}`, 14, y)
      y += 6
    }
    doc.setFontSize(11)
    doc.text(`Total geral: ${formatarMoeda(totalGeral)}`, 14, y + 4)

    y += 20
    doc.setFontSize(12)
    doc.text('Resumo por forma de pagamento', 14, y)
    y += 8
    doc.setFontSize(10)
    Object.entries(porFormaPagamento).forEach(([forma, valor]) => {
      doc.text(`${forma}: ${formatarMoeda(valor)}`, 14, y)
      y += 6
    })

    doc.save(`relatorio-fiscal-${dataInicio}-a-${dataFim}.pdf`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Relatorio Fiscal</h2>
          <p className="text-sm text-gray-500 mt-0.5">Fechamento por periodo para comunicacao fiscal</p>
        </div>
        <button
          onClick={exportarPDF}
          disabled={carregando}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          Exportar PDF
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">De</label>
          <input
            type="date"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Ate</label>
          <input
            type="date"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      {carregando ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <p className="text-xs text-gray-400">Servicos</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{formatarMoeda(totalServicos)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Base ISS / NFS-e</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <p className="text-xs text-gray-400">Produtos</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{formatarMoeda(totalProdutos)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Base ICMS / NF-e</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <p className="text-xs text-gray-400">Outras receitas</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{formatarMoeda(totalOutros)}</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <p className="text-xs text-blue-600">Total geral</p>
              <p className="text-lg font-semibold text-blue-700 mt-1">{formatarMoeda(totalGeral)}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Por forma de pagamento</h3>
            {Object.keys(porFormaPagamento).length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum recebimento neste periodo.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {Object.entries(porFormaPagamento).map(([forma, valor]) => (
                  <div key={forma} className="flex items-center justify-between border-b border-gray-50 pb-2">
                    <p className="text-sm text-gray-600">{forma}</p>
                    <p className="text-sm font-medium text-gray-900">{formatarMoeda(valor)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Este relatorio nao emite nota fiscal automaticamente. Use os valores para lancamento manual
            no sistema do seu contador, app do MEI ou portal da prefeitura/estado.
          </p>
        </>
      )}
    </div>
  )
}