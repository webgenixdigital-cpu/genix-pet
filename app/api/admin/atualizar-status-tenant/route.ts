import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = await createServerSupabaseClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()

    if (!user) {
      return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
    }

    const { data: admin } = await supabaseAdmin
      .from('platform_admins')
      .select('id')
      .eq('email', user.email!)
      .maybeSingle()

    if (!admin) {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
    }

    const { tenantId, novoStatus } = await request.json()

    if (!tenantId || !['active', 'inadimplente'].includes(novoStatus)) {
      return NextResponse.json({ erro: 'Parametros invalidos' }, { status: 400 })
    }

    await supabaseAdmin
      .from('tenants')
      .update({ status: novoStatus })
      .eq('id', tenantId)

    return NextResponse.json({ ok: true })
  } catch (erro) {
    return NextResponse.json({ erro: String(erro) }, { status: 500 })
  }
}