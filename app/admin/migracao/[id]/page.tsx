'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const CAMPOS_CLIENTES = [
  { valor: '', label: '(ignorar esta coluna)' },
  { valor: 'codigo_legado', label: 'Código do sistema antigo (cod_cliente)' },
  { valor: 'nome', label: 'Nome' },
  { valor: 'telefone', label: 'Telefone' },
  { valor: 'email', label: 'Email' },
  { valor: 'cpf', label: 'CPF' },
  { valor: 'endereco_rua', label: 'Endereço (rua)' },
  { valor: 'endereco_numero', label: 'Endereço (número)' },
  { valor: 'endereco_bairro', label: 'Bairro' },
  { valor: 'endereco_cidade', label: 'Cidade' },
  { valor: 'endereco_cep', label: 'CEP' },
  { valor: 'observacoes', label: 'Observações' },
]
const CAMPOS_SERVICOS_RACA = [
  { valor: '', label: '(ignorar esta coluna)' },
  { valor: 'raca_nome', label: 'Nome da raça' },
  { valor: 'grupo', label: 'Grupo (principal/adicional/combo)' },
  { valor: 'nome', label: 'Nome do serviço' },
  { valor: 'descricao', label: 'Descrição' },
  { valor: 'preco', label: 'Preço' },
  { valor: 'duracao_min', label: 'Duração (minutos)' },
]

const CAMPOS_SERVICOS_PORTE = [
  { valor: '', label: '(ignorar esta coluna)' },
  { valor: 'grupo', label: 'Grupo (principal/adicional/combo)' },
  { valor: 'nome', label: 'Nome do serviço' },
  { valor: 'descricao', label: 'Descrição' },
  { valor: 'duracao_min', label: 'Duração (minutos)' },
  { valor: 'porte', label: 'Porte (mini/pequeno/medio/grande/extra_grande/gigante)' },
  { valor: 'preco', label: 'Preço para esse porte' },
]

const CAMPOS_PETS = [
  { valor: '', label: '(ignorar esta coluna)' },
  { valor: 'codigo_legado_tutor', label: 'Código do cliente no sistema antigo (cod_cliente)' },
  { valor: 'nome', label: 'Nome do pet' },
  { valor: 'especie', label: 'Espécie' },
  { valor: 'raca', label: 'Raça' },
  { valor: 'porte', label: 'Porte' },
  { valor: 'pelagem', label: 'Pelagem' },
  { valor: 'sexo', label: 'Sexo' },
  { valor: 'data_nascimento', label: 'Data de nascimento' },
  { valor: 'peso_kg', label: 'Peso (kg)' },
  { valor: 'cor', label: 'Cor' },
  { valor: 'observacoes', label: 'Observações' },
]

export default function MapeamentoPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [lote, setLote] = useState<any>(null)
  const [linhas, setLinhas] = useState<any[]>([])
  const [colunas, setColunas] = useState<string[]>([])
  const [mapeamento, setMapeamento] = useState<Record<string, string>>({})
  const [carregando, setCarregando] = useState(true)
  const [aplicando, setAplicando] = useState(false)
  const [resultado, setResultado] = useState('')

  useEffect(() => {
    carregarLote()
  }, [id])

  async function carregarLote() {
    setCarregando(true)
    const { data: loteData } = await supabase
      .from('migracao_uploads')
      .select('id, categoria, nome_arquivo, total_linhas, status, tenant_id, tenants ( nome )')
      .eq('id', id)
      .single()

        let todasLinhas: any[] = []
    let pagina = 0
    const tamanhoPagina = 1000
    while (true) {
      const { data: linhasData } = await supabase
        .from('migracao_linhas_raw')
        .select('id, linha_numero, dados, status')
        .eq('upload_id', id)
        .order('linha_numero')
        .range(pagina * tamanhoPagina, pagina * tamanhoPagina + tamanhoPagina - 1)

      if (!linhasData || linhasData.length === 0) break
      todasLinhas = [...todasLinhas, ...linhasData]
      if (linhasData.length < tamanhoPagina) break
      pagina++
    }

        setLote(loteData)
    setLinhas(todasLinhas)
    if (todasLinhas.length > 0) {
      setColunas(Object.keys(todasLinhas[0].dados))
    }
    setCarregando(false)
  }

  function atualizarMapeamento(coluna: string, campo: string) {
    setMapeamento((prev) => ({ ...prev, [coluna]: campo }))
  }

  const camposDisponiveis =
    lote?.categoria === 'pets' ? CAMPOS_PETS :
    lote?.categoria === 'servicos_raca' ? CAMPOS_SERVICOS_RACA :
    lote?.categoria === 'servicos_porte' ? CAMPOS_SERVICOS_PORTE :
    CAMPOS_CLIENTES

  if (carregando) return <p className="text-sm text-gray-400">Carregando...</p>
  if (!lote) return <p className="text-sm text-red-500">Lote não encontrado.</p>

  return (
    <div>
      <button onClick={() => router.push('/admin/migracao')} className="text-xs text-gray-400 hover:text-gray-600 mb-4">
        ← Voltar
      </button>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Mapear colunas — {lote.tenants?.nome}</h2>
      <p className="text-sm text-gray-500 mb-6">
        {lote.categoria} · {lote.nome_arquivo} · {lote.total_linhas} linhas
      </p>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Para cada coluna da planilha, selecione o campo correspondente</h3>
        <div className="flex flex-col gap-3">
          {colunas.map((coluna) => (
            <div key={coluna} className="flex items-center gap-3">
              <span className="text-sm text-gray-700 w-48 truncate">{coluna}</span>
              <span className="text-gray-300">→</span>
              <select
                value={mapeamento[coluna] || ''}
                onChange={(e) => atualizarMapeamento(coluna, e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
              >
                {camposDisponiveis.map((c) => (
                  <option key={c.valor} value={c.valor}>{c.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => aplicarMigracao({ lote, linhas, mapeamento, supabase, setAplicando, setResultado })}
        disabled={aplicando}
        className="bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {aplicando ? 'Aplicando...' : 'Aplicar migração'}
      </button>

      {resultado && <p className="text-sm mt-4 text-gray-700 whitespace-pre-line">{resultado}</p>}
    </div>
  )
}

async function aplicarMigracao({ lote, linhas, mapeamento, supabase, setAplicando, setResultado }: any) {
  setAplicando(true)
  setResultado('')

  let sucesso = 0
  let erros = 0
  const mensagensErro: string[] = []

  for (const linha of linhas) {
       const registro: Record<string, any> = { tenant_id: lote.tenant_id }
    let codigoLegadoTutor = ''

    for (const [coluna, campo] of Object.entries(mapeamento)) {
      if (!campo) continue
      const valor = linha.dados[coluna]
      if (campo === 'codigo_legado_tutor') {
        codigoLegadoTutor = String(valor || '').trim()
      } else {
        registro[campo as string] = valor
      }
    }

    try {
      if (lote.categoria === 'clientes') {
        if (!String(registro.nome || '').trim()) throw new Error('linha vazia (sem nome) — ignorada')
        const { error } = await supabase.from('customers').insert(registro)
        if (error) throw error
      } else if (lote.categoria === 'servicos_raca') {
        const racaNome = String(registro.raca_nome || '').trim()
        if (!racaNome) throw new Error('nome da raça não informado')
        delete registro.raca_nome

        let { data: raca } = await supabase
          .from('catalogo_racas')
          .select('id')
          .eq('tenant_id', lote.tenant_id)
          .ilike('nome', racaNome)
          .maybeSingle()

        if (!raca) {
          const { data: novaRaca, error: erroRaca } = await supabase
            .from('catalogo_racas')
            .insert({ tenant_id: lote.tenant_id, nome: racaNome })
            .select('id')
            .single()
          if (erroRaca) throw erroRaca
          raca = novaRaca
        }

        registro.raca_id = raca!.id
        registro.tenant_id = lote.tenant_id
        const { error } = await supabase.from('catalogo_raca_itens').insert(registro)
        if (error) throw error
      } else if (lote.categoria === 'servicos_porte') {
        const porte = String(registro.porte || '').trim()
        const preco = registro.preco
        if (!porte) throw new Error('porte não informado')
        delete registro.porte
        delete registro.preco

        let { data: item } = await supabase
          .from('catalogo_porte_itens')
          .select('id')
          .eq('tenant_id', lote.tenant_id)
          .ilike('nome', registro.nome)
          .eq('grupo', registro.grupo)
          .maybeSingle()

        if (!item) {
          const { data: novoItem, error: erroItem } = await supabase
            .from('catalogo_porte_itens')
            .insert(registro)
            .select('id')
            .single()
          if (erroItem) throw erroItem
          item = novoItem
        }

        const { error } = await supabase
          .from('catalogo_porte_precos')
          .upsert({ item_id: item!.id, porte, preco }, { onConflict: 'item_id,porte' })
        if (error) throw error
            } else if (lote.categoria === 'pets') {
        if (!String(registro.nome || '').trim()) throw new Error('linha vazia (sem nome do pet) — ignorada')
        if (!codigoLegadoTutor) throw new Error('código do cliente não informado')
        const { data: cliente } = await supabase
          .from('customers')
          .select('id')
          .eq('tenant_id', lote.tenant_id)
          .eq('codigo_legado', codigoLegadoTutor)
          .maybeSingle()
        if (!cliente) throw new Error(`cliente com código ${codigoLegadoTutor} não encontrado`)
        registro.customer_id = cliente.id
        const { error } = await supabase.from('pets').insert(registro)
        if (error) throw error
      }
      sucesso++
      await supabase.from('migracao_linhas_raw').update({ status: 'aplicado' }).eq('id', linha.id)
    } catch (e: any) {
      erros++
      mensagensErro.push(`Linha ${linha.linha_numero}: ${e.message}`)
      await supabase.from('migracao_linhas_raw').update({ status: 'erro', erro_mensagem: e.message }).eq('id', linha.id)
    }
  }

  await supabase
    .from('migracao_uploads')
    .update({
      status: erros === 0 ? 'aplicado' : 'erro',
      mapeamento,
      linhas_aplicadas: sucesso,
    })
    .eq('id', lote.id)

  setResultado(
    `${sucesso} registros criados com sucesso. ${erros} erros.` +
    (mensagensErro.length > 0 ? '\n\n' + mensagensErro.slice(0, 10).join('\n') : '')
  )
  setAplicando(false)
}