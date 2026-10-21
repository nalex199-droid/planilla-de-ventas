import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth'
import productosData from '@/data/productos.json'

interface Producto {
  codigo: string
  descripcion: string
  um?: string
  ubicacion?: string
  costo?: number
}

// GET /api/productos?q=...&limit=10
// Busca productos por código o descripción (búsqueda case-insensitive)
export async function GET(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const user = await verifySessionToken(token)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const query = (searchParams.get('q') ?? '').trim().toLowerCase()
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)

  if (!query) {
    // Sin query → devolver los primeros 20 productos
    return NextResponse.json({
      productos: (productosData as Producto[]).slice(0, 20),
      total: productosData.length,
    })
  }

  const productos = productosData as Producto[]
  const resultados: Producto[] = []

  // Búsqueda: primero por coincidencia exacta en código, luego por descripción
  for (const p of productos) {
    if (resultados.length >= limit) break
    const cod = p.codigo.toLowerCase()
    const desc = p.descripcion.toLowerCase()
    // Coincidencia por código (prioridad) o descripción
    if (cod.includes(query) || desc.includes(query)) {
      resultados.push(p)
    }
  }

  return NextResponse.json({
    productos: resultados,
    total: productos.length,
    query,
  })
}
