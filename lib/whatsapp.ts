export async function enviarWhatsApp(
  instanceId: string,
  token: string,
  telefone: string,
  mensagem: string
) {
  const telefoneFormatado = telefone.replace(/\D/g, '')
  const telefoneComDDI = telefoneFormatado.startsWith('55')
    ? telefoneFormatado
    : `55${telefoneFormatado}`

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: telefoneComDDI,
        message: mensagem,
      }),
    })

    const data = await res.json()
    return { sucesso: true, data }
  } catch (error: any) {
    return { sucesso: false, erro: error.message }
  }
}