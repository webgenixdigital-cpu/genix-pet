import { NextRequest, NextResponse } from 'next/server'

async function buscarCoordenadas(endereco: string) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(endereco)}&format=json&limit=1&countrycodes=br`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'GenixPet/1.0 (contato@genixpet.com.br)' },
  })
  const data = await res.json()
  if (data && data.length > 0) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  }
  return null
}

async function buscarEstruturado(rua: string, numero: string, cidade: string, uf: string) {
  const params = new URLSearchParams({
    street: `${numero} ${rua}`.trim(),
    city: cidade,
    state: uf,
    country: 'Brazil',
    format: 'json',
    limit: '1',
  })

  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'GenixPet/1.0 (contato@genixpet.com.br)' },
  })
  const data = await res.json()
  if (data && data.length > 0) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  }
  return null
}

export async function GET(request: NextRequest) {
  const endereco = request.nextUrl.searchParams.get('endereco')
  const rua = request.nextUrl.searchParams.get('rua')
  const numero = request.nextUrl.searchParams.get('numero') || ''
  const cidade = request.nextUrl.searchParams.get('cidade')
  const uf = request.nextUrl.searchParams.get('uf')

  if (!endereco && !rua) {
    return NextResponse.json({ error: 'Endereco nao informado' }, { status: 400 })
  }

  try {
    if (rua && cidade && uf) {
      const resultadoEstruturado = await buscarEstruturado(rua, numero, cidade, uf)
      if (resultadoEstruturado) {
        return NextResponse.json(resultadoEstruturado)
      }
      await new Promise(r => setTimeout(r, 1000))
    }

    if (!endereco) {
      return NextResponse.json({ error: 'Endereco nao encontrado' }, { status: 404 })
    }

    const partes = endereco.split(',').map(p => p.trim())

    const tentativas = [
      endereco,
      partes.slice(1).join(', '),
      partes.slice(2).join(', '),
      partes.slice(-1).join(', '),
    ].filter(Boolean)

    for (const tentativa of tentativas) {
      const resultado = await buscarCoordenadas(tentativa)
      if (resultado) {
        return NextResponse.json(resultado)
      }
      await new Promise(r => setTimeout(r, 1000))
    }

    return NextResponse.json({ error: 'Endereco nao encontrado' }, { status: 404 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}