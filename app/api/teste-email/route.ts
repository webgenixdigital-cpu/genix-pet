import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET() {
  try {
    const resultado = await resend.emails.send({
      from: 'Genix Pet <onboarding@resend.dev>',
      to: 'webgenixdigital@gmail.com',
      subject: 'Teste de notificacao - Genix Pet',
      text: 'Se voce recebeu isso, a integracao com Resend esta funcionando.',
    })
    return NextResponse.json({ ok: true, resultado })
  } catch (erro) {
    return NextResponse.json({ ok: false, erro: String(erro) }, { status: 500 })
  }
}