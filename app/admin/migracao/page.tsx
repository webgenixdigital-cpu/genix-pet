'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase'

type TenantResultado = {
  id: string
  nome: string
  email: string
}

type Categoria = 'clientes' | 'pets' | 'servicos' | 'agendamentos' | 'financeiro' | 'pacotes'

const CATEGORIAS: { id: Categoria; label: string }[] = [
  { id: 'clientes', label: 'Clientes' },
  { id: 'pets', label: 'Pets' },
  { id: 'servicos', label: 'Servicos' },
  { id: 'agendamentos', label: 'Agendamentos (historico)' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'pacotes', label: 'Pacotes' },
]

export default function MigracaoPage() {
  const supabase = createClient()

  const [buscaTenant, setBuscaTenant] = useState('')
  const [resultadosTenant, setResultadosTenant] = useState<TenantResultado[]>([])
  const [tenantSelecionado, setTenantSelecionado] = useState<TenantResultado | null>(null)
  const [buscando, setBuscando] = useState(false)

    const [categoria, setCategoria] = useState<Categoria>('clientes')
  const [tipoServico, setTipoServico] = useState<'raca' | 'porte'>('raca')
  const [colunas, setColunas] = useState<string[]>([])
  const [linhas, setLinhas] = useState<Record<string, any>[]>([])
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  async function buscarTenants() {
    if (!buscaTenant.trim()) return
    setBuscando(true)
    const { data } = await supabase
      .from('tenants')
      .select('id, nome, email')
      .or(`nome.ilike.%${buscaTenant}%,email.ilike.%${buscaTenant}%`)
      .limit(10)
    setResultadosTenant(data || [])
    setBuscando(false)
  }

  function selecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setNomeArquivo(arquivo.name)

    const leitor = new FileReader()
    leitor.onload = (evento) => {
      const dados = evento.target?.result
      const workbook = XLSX.read(dados, { type: 'binary' })
      const primeiraAba = workbook.SheetNames[0]
      const planilha = workbook.Sheets[primeiraAba]
      const json = XLSX.utils.sheet_to_json(planilha, { defval: '' }) as Record<string, any>[]

      if (json.length > 0) {
        setColunas(Object.keys(json[0]))
        setLinhas(json)
      }
    }
    leitor.readAsBinaryString(arquivo)
  }

  async function criarLoteMigracao() {
    if (!tenantSelecionado || linhas.length === 0) return
    setEnviando(true)
    setMensagem('')

        const { data: upload, error: erroUpload } = await supabase
      .from('migracao_uploads')
      .insert({
        tenant_id: tenantSelecionado.id,
        nome_arquivo: nomeArquivo,
        categoria: categoria === 'servicos' ? `servicos_${tipoServico}` : categoria,
        status: 'pendente',
        total_linhas: linhas.length,
      })
      .select('id')
      .single()

    if (erroUpload || !upload) {
      setMensagem('Erro ao criar lote: ' + erroUpload?.message)
      setEnviando(false)
      return
    }

    const linhasParaInserir = linhas.map((linha, indice) => ({
      upload_id: upload.id,
      linha_numero: indice + 1,
      dados: linha,
      status: 'pendente',
    }))

    // insere em blocos de 500 pra evitar payload gigante
    const tamanhoBloco = 500
    for (let i = 0; i < linhasParaInserir.length; i += tamanhoBloco) {
      const bloco = linhasParaInserir.slice(i, i + tamanhoBloco)
      const { error: erroLinhas } = await supabase.from('migracao_linhas_raw').insert(bloco)
      if (erroLinhas) {
        setMensagem('Erro ao gravar linhas: ' + erroLinhas.message)
        setEnviando(false)
        return
      }
    }

    setMensagem(`Lote criado com sucesso! ${linhas.length} linhas gravadas para ${tenantSelecionado.nome}.`)
    setLinhas([])
    setColunas([])
    setNomeArquivo('')
    setEnviando(false)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Migração de dados</h2>
      <p className="text-sm text-gray-500 mb-6">Importe dados de outros sistemas para um pet shop.</p>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">1. Selecionar pet shop</h3>
        {tenantSelecionado ? (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl p-3">
            <div>
              <p className="text-sm font-medium text-blue-900">{tenantSelecionado.nome}</p>
              <p className="text-xs text-blue-600">{tenantSelecionado.email}</p>
            </div>
            <button
              onClick={() => setTenantSelecionado(null)}
              className="text-xs text-blue-600 hover:underline"
            >
              Trocar
            </button>
          </div>
        ) : (
          <div>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={buscaTenant}
                onChange={(e) => setBuscaTenant(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarTenants()}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={buscarTenants}
                disabled={buscando}
                className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800"
              >
                {buscando ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            {resultadosTenant.length > 0 && (
              <div className="flex flex-col gap-1">
                {resultadosTenant.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setTenantSelecionado(t); setResultadosTenant([]) }}
                    className="text-left p-2.5 rounded-lg hover:bg-gray-50 border border-gray-100 text-sm"
                  >
                    <span className="font-medium text-gray-900">{t.nome}</span>
                    <span className="text-xs text-gray-400 ml-2">{t.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

            {tenantSelecionado && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">2. Categoria dos dados</h3>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoria(c.id)}
                className={`text-sm px-3 py-1.5 rounded-lg border ${
                  categoria === c.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {categoria === 'servicos' && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Os serviços são organizados por raça ou por porte?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setTipoServico('raca')}
                  className={`text-sm px-3 py-1.5 rounded-lg border ${
                    tipoServico === 'raca' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  Por raça
                </button>
                <button
                  onClick={() => setTipoServico('porte')}
                  className={`text-sm px-3 py-1.5 rounded-lg border ${
                    tipoServico === 'porte' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  Por porte (SRD)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tenantSelecionado && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">3. Enviar planilha (.xlsx ou .csv)</h3>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={selecionarArquivo} className="text-sm" />

          {linhas.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">
                {linhas.length} linhas encontradas · Colunas: {colunas.join(', ')}
              </p>
              <div className="overflow-x-auto border border-gray-100 rounded-lg">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      {colunas.map((c) => (
                        <th key={c} className="p-2 text-left font-medium text-gray-500 whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.slice(0, 5).map((linha, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        {colunas.map((c) => (
                          <td key={c} className="p-2 whitespace-nowrap text-gray-600">{String(linha[c])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-1">Mostrando as primeiras 5 linhas de {linhas.length}.</p>
            </div>
          )}
        </div>
      )}

      {tenantSelecionado && linhas.length > 0 && (
        <button
          onClick={criarLoteMigracao}
          disabled={enviando}
          className="bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {enviando ? 'Gravando...' : 'Criar lote de migração'}
        </button>
      )}

            {mensagem && <p className="text-sm mt-4 text-gray-700">{mensagem}</p>}

      <ListaLotesPendentes />
    </div>
  )
}

function ListaLotesPendentes() {
  const supabase = createClient()
  const [lotes, setLotes] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

  useState(() => {
    supabase
      .from('migracao_uploads')
      .select('id, nome_arquivo, categoria, status, total_linhas, criado_em, tenants ( nome )')
      .neq('status', 'aplicado')
      .order('criado_em', { ascending: false })
      .then(({ data }) => {
        setLotes(data || [])
        setCarregando(false)
      })
  })

  if (carregando) return null
  if (lotes.length === 0) return null

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 mt-6">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Lotes pendentes de mapeamento</h3>
      <div className="flex flex-col gap-2">
        {lotes.map((l) => (
        <a  
            key={l.id}
            href={`/admin/migracao/${l.id}`}
            className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 text-sm"
          >
            <div>
              <span className="font-medium text-gray-900">{l.tenants?.nome}</span>
              <span className="text-gray-400 ml-2">{l.categoria} · {l.nome_arquivo}</span>
            </div>
            <span className="text-xs text-gray-500">{l.total_linhas} linhas · {l.status}</span>
          </a>
        ))}
      </div>
    </div>
  )
}