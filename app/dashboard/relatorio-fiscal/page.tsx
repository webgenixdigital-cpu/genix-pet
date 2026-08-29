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
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
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
  const [aba, setAba] = useState<'periodo' | 'anual'>('periodo')
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear() - 1)
  const [lancamentosAno, setLancamentosAno] = useState<Lancamento[]>([])
  const [carregandoAno, setCarregandoAno] = useState(false)
  const [teveFuncionario, setTeveFuncionario] = useState<boolean | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
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
      .select('id, nome')
      .eq('email', user.email)
      .single()

        if (!tenant) {
      setCarregando(false)
      return
    }
    setNomeTenant(tenant.nome)
    setTenantId(tenant.id)

        const { data, error } = await supabase
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
  useEffect(() => { if (aba === 'anual' && tenantId) carregarDadosAnuais() }, [aba, anoSelecionado, tenantId])

  const totalServicos = lancamentos.filter(l => l.categoria === 'Servico' || l.categoria === 'Pacote').reduce((s, l) => s + Number(l.valor), 0)
  const totalProdutos = lancamentos.filter(l => l.categoria === 'Produto').reduce((s, l) => s + Number(l.valor), 0)
  const totalOutros = lancamentos.filter(l => !['Servico', 'Produto', 'Pacote'].includes(l.categoria || '')).reduce((s, l) => s + Number(l.valor), 0)
  const totalGeral = totalServicos + totalProdutos + totalOutros

  const porFormaPagamento = lancamentos.reduce((acc: Record<string, number>, l) => {
    const forma = l.forma_pagamento || 'Nao informado'
    acc[forma] = (acc[forma] || 0) + Number(l.valor)
    return acc
  }, {})
    async function carregarDadosAnuais() {
    if (!tenantId) return
    setCarregandoAno(true)

    const inicio = `${anoSelecionado}-01-01`
    const fim = `${anoSelecionado}-12-31`

    const { data } = await supabase
      .from('financial_transactions')
      .select('id, tipo, categoria, valor, forma_pagamento, status, data_lancamento')
      .eq('tenant_id', tenantId)
      .eq('tipo', 'receita')
      .eq('status', 'pago')
      .gte('data_lancamento', inicio)
      .lte('data_lancamento', fim)
      .order('data_lancamento')

    setLancamentosAno(data || [])

    const { data: tenantData } = await supabase
      .from('tenants')
      .select('dasn_funcionario_por_ano')
      .eq('id', tenantId)
      .single()

    const respostas = (tenantData?.dasn_funcionario_por_ano as any) || {}
    setTeveFuncionario(respostas[anoSelecionado] ?? null)

    setCarregandoAno(false)
  }

  async function salvarFuncionario(valor: boolean) {
    if (!tenantId) return
    setTeveFuncionario(valor)

    const { data: tenantData } = await supabase
      .from('tenants')
      .select('dasn_funcionario_por_ano')
      .eq('id', tenantId)
      .single()

    const respostas = (tenantData?.dasn_funcionario_por_ano as any) || {}
    respostas[anoSelecionado] = valor

    await supabase
      .from('tenants')
      .update({ dasn_funcionario_por_ano: respostas })
      .eq('id', tenantId)
  }
    const receitaComercioAno = lancamentosAno.filter(l => l.categoria === 'Produto').reduce((s, l) => s + Number(l.valor), 0)
  const receitaServicosAno = lancamentosAno.filter(l => l.categoria !== 'Produto').reduce((s, l) => s + Number(l.valor), 0)
  const receitaTotalAno = receitaComercioAno + receitaServicosAno

  const mesesResumo = Array.from({ length: 12 }, (_, i) => {
    const mesLancamentos = lancamentosAno.filter(l => new Date(l.data_lancamento + 'T00:00:00').getMonth() === i)
    return {
      mes: i,
      comercio: mesLancamentos.filter(l => l.categoria === 'Produto').reduce((s, l) => s + Number(l.valor), 0),
      servicos: mesLancamentos.filter(l => l.categoria !== 'Produto').reduce((s, l) => s + Number(l.valor), 0),
    }
  })

  const NOMES_MESES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  function exportarPDFAnual() {
    const jsPDF = require('jspdf').default
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text('Fechamento Anual - Base DASN-SIMEI', 14, 18)
    doc.setFontSize(10)
    doc.text(nomeTenant, 14, 25)
    doc.text(`Ano-calendario: ${anoSelecionado}`, 14, 31)

    let y = 45
    doc.setFontSize(12)
    doc.text('Valores para a declaracao (Portal do Empreendedor)', 14, y)
    y += 8
    doc.setFontSize(10)
    doc.text(`Receita de comercio/industria: ${formatarMoeda(receitaComercioAno)}`, 14, y)
    y += 6
    doc.text(`Receita de prestacao de servicos: ${formatarMoeda(receitaServicosAno)}`, 14, y)
    y += 6
    doc.setFontSize(11)
    doc.text(`Receita bruta total: ${formatarMoeda(receitaTotalAno)}`, 14, y)
    y += 6
    doc.setFontSize(10)
    doc.text(`Teve empregado no ano: ${teveFuncionario === true ? 'Sim' : teveFuncionario === false ? 'Nao' : 'Nao informado'}`, 14, y)

    y += 15
    doc.setFontSize(12)
    doc.text('Detalhamento mensal (para o contador)', 14, y)
    y += 8
    doc.setFontSize(9)
    doc.text('Mes', 14, y)
    doc.text('Comercio', 80, y)
    doc.text('Servicos', 130, y)
    doc.text('Total', 175, y)
    y += 5
    mesesResumo.forEach(m => {
      doc.text(NOMES_MESES[m.mes], 14, y)
      doc.text(formatarMoeda(m.comercio), 80, y)
      doc.text(formatarMoeda(m.servicos), 130, y)
      doc.text(formatarMoeda(m.comercio + m.servicos), 175, y)
      y += 6
    })

    doc.save(`fechamento-anual-dasn-${anoSelecionado}.pdf`)
  }

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
        {aba === 'periodo' && (
          <button
            onClick={exportarPDF}
            disabled={carregando}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Exportar PDF
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setAba('periodo')}
          className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
            aba === 'periodo' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          Por periodo
        </button>
        <button
          onClick={() => setAba('anual')}
          className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
            aba === 'anual' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          📋 Fechamento Anual (DASN-SIMEI)
        </button>
      </div>

      {aba === 'periodo' && (
      <>
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
      </>
      )}

      {aba === 'anual' && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Ano-calendario</label>
              <select
                value={anoSelecionado}
                onChange={e => setAnoSelecionado(parseInt(e.target.value))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>
            <button
              onClick={exportarPDFAnual}
              disabled={carregandoAno}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50 self-end"
            >
              Exportar PDF (com detalhamento mensal)
            </button>
          </div>

          {carregandoAno ? (
            <p className="text-sm text-gray-400">Carregando...</p>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-6">
                <p className="text-sm font-medium text-blue-900 mb-4">
                  Valores para preencher na DASN-SIMEI ({anoSelecionado})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-xs text-gray-400">Receita de comercio/industria</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">{formatarMoeda(receitaComercioAno)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-xs text-gray-400">Receita de prestacao de servicos</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">{formatarMoeda(receitaServicosAno)}</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 mb-4">
                  <p className="text-xs text-gray-400">Receita bruta total do ano</p>
                  <p className="text-2xl font-semibold text-blue-700 mt-1">{formatarMoeda(receitaTotalAno)}</p>
                </div>

                <p className="text-sm text-blue-900 font-medium mb-2">Teve empregado em algum momento do ano?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => salvarFuncionario(true)}
                    className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                      teveFuncionario === true ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => salvarFuncionario(false)}
                    className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                      teveFuncionario === false ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    Nao
                  </button>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Detalhamento mensal (para o contador)</h3>
                <div className="flex flex-col gap-1">
                  {mesesResumo.map(m => (
                    <div key={m.mes} className="flex items-center justify-between border-b border-gray-50 py-2 text-sm">
                      <p className="text-gray-600 w-28">{NOMES_MESES[m.mes]}</p>
                      <p className="text-gray-500 flex-1 text-right">{formatarMoeda(m.comercio)}</p>
                      <p className="text-gray-500 flex-1 text-right">{formatarMoeda(m.servicos)}</p>
                      <p className="text-gray-900 font-medium w-24 text-right">{formatarMoeda(m.comercio + m.servicos)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-4">
                Declaracao gratuita e obrigatoria ate 31 de maio de cada ano, feita pelo Portal do Empreendedor
                (gov.br/mei). Este relatorio nao transmite a declaracao automaticamente.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}