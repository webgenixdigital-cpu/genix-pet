'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

type LinhaImportacao = {
  cliente_nome: string
  cliente_telefone: string
  cliente_endereco: string
  pet_nome: string
  pet_especie: string
  pet_porte: string
  pacote_nome: string
  pacote_sessoes_restantes: string
  status: 'pendente' | 'sucesso' | 'erro'
  mensagem?: string
}

const CAMPOS = [
  { chave: 'cliente_nome', label: 'Nome do cliente', obrigatorio: true, sinonimos: ['nome', 'cliente', 'cliente_nome', 'tutor', 'nome do cliente', 'nome do tutor', 'proprietario'] },
  { chave: 'cliente_telefone', label: 'Telefone do cliente', obrigatorio: true, sinonimos: ['telefone', 'fone', 'celular', 'whatsapp', 'contato', 'telefone1', 'phone'] },
  { chave: 'cliente_endereco', label: 'Endereco do cliente', obrigatorio: false, sinonimos: ['endereco', 'rua', 'logradouro', 'address'] },
  { chave: 'pet_nome', label: 'Nome do pet', obrigatorio: false, sinonimos: ['pet', 'nome do pet', 'animal', 'nome animal', 'pet_nome'] },
  { chave: 'pet_especie', label: 'Especie do pet', obrigatorio: false, sinonimos: ['especie', 'tipo', 'tipo animal', 'especie animal'] },
  { chave: 'pet_porte', label: 'Porte do pet', obrigatorio: false, sinonimos: ['porte', 'tamanho'] },
  { chave: 'pacote_nome', label: 'Nome do pacote', obrigatorio: false, sinonimos: ['pacote', 'plano', 'nome do pacote', 'nome do plano'] },
  { chave: 'pacote_sessoes_restantes', label: 'Sessoes restantes do pacote', obrigatorio: false, sinonimos: ['sessoes', 'sessoes restantes', 'creditos', 'saldo', 'restantes'] },
]

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export default function ImportarClientesPage() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [cabecalhoOriginal, setCabecalhoOriginal] = useState<string[]>([])
  const [linhasCru, setLinhasCru] = useState<string[][]>([])
  const [mapeamento, setMapeamento] = useState<Record<string, string>>({})
  const [etapaMapeamento, setEtapaMapeamento] = useState(false)
  const [linhas, setLinhas] = useState<LinhaImportacao[]>([])
  const [processando, setProcessando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const supabase = createClient()
  function detectarMapeamentoAutomatico(cabecalho: string[]): Record<string, string> {
    const mapa: Record<string, string> = {}

    for (const campo of CAMPOS) {
      const encontrado = cabecalho.find(h => campo.sinonimos.includes(normalizar(h)))
      if (encontrado) mapa[campo.chave] = encontrado
    }

    return mapa
  }

  function handleArquivo(file: File) {
    setArquivo(file)
    setConcluido(false)
    const reader = new FileReader()
    reader.onload = e => {
      const texto = e.target?.result as string
      const linhasTexto = texto.split('\n').filter(l => l.trim())
      const separador = linhasTexto[0].includes(';') ? ';' : ','
      const cabecalho = linhasTexto[0].split(separador).map(h => h.trim())
      const linhasDados = linhasTexto.slice(1).map(l => l.split(separador).map(c => c.trim()))

      setCabecalhoOriginal(cabecalho)
      setLinhasCru(linhasDados)
      setMapeamento(detectarMapeamentoAutomatico(cabecalho))
      setEtapaMapeamento(true)
    }
    reader.readAsText(file)
  }

  function confirmarMapeamento() {
    const resultado: LinhaImportacao[] = linhasCru.map(colunas => {
      function pegar(chave: string): string {
        const nomeColuna = mapeamento[chave]
        if (!nomeColuna) return ''
        const idx = cabecalhoOriginal.indexOf(nomeColuna)
        return idx >= 0 ? (colunas[idx] || '') : ''
      }

      return {
        cliente_nome: pegar('cliente_nome'),
        cliente_telefone: pegar('cliente_telefone'),
        cliente_endereco: pegar('cliente_endereco'),
        pet_nome: pegar('pet_nome'),
        pet_especie: pegar('pet_especie') || 'cachorro',
        pet_porte: pegar('pet_porte') || 'medio',
        pacote_nome: pegar('pacote_nome'),
        pacote_sessoes_restantes: pegar('pacote_sessoes_restantes'),
        status: 'pendente' as const,
      }
    }).filter(l => l.cliente_nome && l.cliente_telefone)

    setLinhas(resultado)
    setEtapaMapeamento(false)
  }
  async function importar() {
    setProcessando(true)
    const { data: tenant } = await supabase.from('tenants').select('id').single()
    if (!tenant) return

    const novasLinhas = [...linhas]

    for (let i = 0; i < novasLinhas.length; i++) {
      const linha = novasLinhas[i]

      try {
        const { data: clienteExistente } = await supabase
          .from('customers')
          .select('id')
          .eq('tenant_id', tenant.id)
          .eq('telefone', linha.cliente_telefone)
          .maybeSingle()

        let clienteId = clienteExistente?.id

        if (!clienteId) {
          const { data: novoCliente, error: erroCliente } = await supabase
            .from('customers')
            .insert({
              tenant_id: tenant.id,
              nome: linha.cliente_nome,
              telefone: linha.cliente_telefone,
              endereco_rua: linha.cliente_endereco || null,
            })
            .select('id')
            .single()

          if (erroCliente || !novoCliente) throw new Error(erroCliente?.message)
          clienteId = novoCliente.id
        }

        let petId: string | null = null

        if (linha.pet_nome) {
          const { data: novoPet, error: erroPet } = await supabase
            .from('pets')
            .insert({
              tenant_id: tenant.id,
              customer_id: clienteId,
              nome: linha.pet_nome,
              especie: linha.pet_especie,
              porte: linha.pet_porte,
            })
            .select('id')
            .single()

          if (erroPet) throw new Error(erroPet.message)
          petId = novoPet?.id || null
        }

        if (linha.pacote_nome && linha.pacote_sessoes_restantes && petId) {
          const sessoesRestantes = parseInt(linha.pacote_sessoes_restantes) || 0

          await supabase.from('customer_packages').insert({
            tenant_id: tenant.id,
            customer_id: clienteId,
            pet_id: petId,
            package_id: null,
            sessoes_total: sessoesRestantes,
            sessoes_usadas: 0,
            preco_pago: 0,
            status: 'ativo',
            expira_em: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          })
        }

        novasLinhas[i] = { ...linha, status: 'sucesso' }
      } catch (error: any) {
        novasLinhas[i] = { ...linha, status: 'erro', mensagem: error.message }
      }

      setLinhas([...novasLinhas])
    }

    setProcessando(false)
    setConcluido(true)
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Importar clientes</h2>
      <p className="text-sm text-gray-500 mb-6">
        Migre seus clientes de qualquer sistema usando um arquivo CSV ou Excel exportado como CSV
      </p>

      {!etapaMapeamento && linhas.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
          <label className="text-sm text-gray-600 mb-2 block">Selecione o arquivo CSV</label>
          <input
            type="file"
            accept=".csv"
            onChange={e => e.target.files?.[0] && handleArquivo(e.target.files[0])}
            className="text-sm"
          />
          <p className="text-xs text-gray-400 mt-2">
            Aceita qualquer arquivo CSV — o sistema vai identificar as colunas automaticamente.
          </p>
        </div>
      )}

      {etapaMapeamento && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-1">Confirme as colunas</h3>
          <p className="text-xs text-gray-500 mb-4">
            Identificamos {cabecalhoOriginal.length} colunas no seu arquivo. Confira se o mapeamento esta correto.
          </p>

          <div className="flex flex-col gap-3">
            {CAMPOS.map(campo => (
              <div key={campo.chave} className="flex items-center gap-3">
                <label className="text-sm text-gray-600 w-48 flex-shrink-0">
                  {campo.label} {campo.obrigatorio && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={mapeamento[campo.chave] || ''}
                  onChange={e => setMapeamento(prev => ({ ...prev, [campo.chave]: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Nao importar</option>
                  {cabecalhoOriginal.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {linhasCru[0] && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">Exemplo (primeira linha do arquivo):</p>
              <p className="text-xs text-gray-600">
                {CAMPOS.filter(c => mapeamento[c.chave]).map(c => {
                  const idx = cabecalhoOriginal.indexOf(mapeamento[c.chave])
                  return `${c.label}: ${linhasCru[0][idx] || '-'}`
                }).join(' • ')}
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => { setEtapaMapeamento(false); setArquivo(null) }}
              className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarMapeamento}
              disabled={!mapeamento['cliente_nome'] || !mapeamento['cliente_telefone']}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              Confirmar mapeamento
            </button>
          </div>
        </div>
      )}

      {linhas.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">
              {linhas.length} registro(s) encontrado(s)
            </h3>
            {!concluido && (
              <button
                onClick={importar}
                disabled={processando}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {processando ? 'Importando...' : 'Iniciar importacao'}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
            {linhas.map((l, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{l.cliente_nome} • {l.cliente_telefone}</p>
                  <p className="text-xs text-gray-400">
                    {l.pet_nome && `Pet: ${l.pet_nome}`}
                    {l.pacote_nome && ` • Pacote: ${l.pacote_nome} (${l.pacote_sessoes_restantes} sessoes)`}
                  </p>
                </div>
                {l.status === 'sucesso' && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Importado</span>
                )}
                {l.status === 'erro' && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full" title={l.mensagem}>Erro</span>
                )}
                {l.status === 'pendente' && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Aguardando</span>
                )}
              </div>
            ))}
          </div>

          {concluido && (
            <p className="text-sm text-green-600 mt-4">
              Importacao concluida! {linhas.filter(l => l.status === 'sucesso').length} de {linhas.length} importados com sucesso.
            </p>
          )}
        </div>
      )}
    </div>
  )
}