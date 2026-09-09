import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 })
  }

  const hoje = new Date().toISOString().split('T')[0]

    const { data: atrasados, error } = await supabaseAdmin
    .from('tenants')
    .update({ mensalidade_status: 'atrasado', status: 'inadimplente' })
    .lt('mensalidade_vence_em', hoje)
    .not('mensalidade_vence_em', 'is', null)
    .neq('mensalidade_status', 'atrasado')
    .select('id, nome')

  if (error) {
    console.error('Erro ao verificar mensalidades:', error)
    return NextResponse.json({ ok: false, erro: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, atualizados: atrasados?.length || 0, tenants: atrasados })
}