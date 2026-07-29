import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Rotas protegidas — redireciona para login se não autenticado
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Se autenticado e tentando acessar login, redireciona para dashboard
  if (user && (
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/cadastro'
  )) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Checagem de trial expirado / assinatura inativa
  const rotaBloqueavel = request.nextUrl.pathname.startsWith('/dashboard')
    && request.nextUrl.pathname !== '/dashboard/configuracoes'

  if (user && rotaBloqueavel) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('status, trial_termina_em')
      .eq('email', user.email!)
      .single()

    if (tenant) {
      const trialExpirado = tenant.status === 'trial' && new Date(tenant.trial_termina_em) < new Date()
      const semAssinatura = tenant.status !== 'active' && tenant.status !== 'trial'

      if (trialExpirado || semAssinatura) {
        return NextResponse.redirect(new URL('/dashboard/configuracoes?bloqueado=1', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|agendar).*)',
  ],
}