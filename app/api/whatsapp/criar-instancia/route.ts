import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('zapi_instance_id, zapi_token')
    .eq('email', user.email!)
    .single()

  if (!tenant?.zapi_instance_id || !tenant?.zapi_token) {
    return NextResponse.json({ error: 'Instancia nao configurada' }, { status: 400 })
  }

  const url = `https://api.z-api.io/instances/${tenant.zapi_instance_id}/token/${tenant.zapi_token}/qr-code/image`

  const res = await fetch(url)
  const data = await res.json()

  return NextResponse.json(data)
}