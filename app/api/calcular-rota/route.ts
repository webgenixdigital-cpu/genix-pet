import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const latOrigem = request.nextUrl.searchParams.get('latOrigem')
  const lngOrigem = request.nextUrl.searchParams.get('lngOrigem')
  const latDestino = request.nextUrl.searchParams.get('latDestino')
  const lngDestino = request.nextUrl.searchParams.get('lngDestino')

  if (!latOrigem || !lngOrigem || !latDestino || !lngDestino) {
    return NextResponse.json({ error: 'Coordenadas incompletas' }, { status: 400 })
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lngOrigem},${latOrigem};${lngDestino},${latDestino}?overview=false`

    const res = await fetch(url)
    const data = await res.json()

    if (data.code === 'Ok' && data.routes?.[0]) {
      const distanciaMetros = data.routes[0].distance
      return NextResponse.json({ distanciaKm: distanciaMetros / 1000 })
    }

    return NextResponse.json({ error: 'Rota nao encontrada' }, { status: 404 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}