import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth'
import { readRange } from '@/lib/google-sheets'
import productosData from '@/data/productos.json'

interface Producto {
  codigo: string
  descripcion: string
  um?: string
  ubicacion?: string
  costo?: number
  categoria?: string
}

// Caché en memoria (Vercel reusa instancias calientes)
let cachedProductos: Producto[] | null = null
let cachedAt: number = 0
const CACHE_TTL = 10 * 60 * 1000 // 10 minutos

async function getProductos(): Promise<Producto[]> {
  // Si hay caché y no expiró, usarlo
  if (cachedProductos && Date.now() - cachedAt < CACHE_TTL) {
    return cachedProductos
  }

  // Si estamos en modo demo (sin Google configurado), usar el JSON local
  const isDemoMode = !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
                     !process.env.GOOGLE_PRIVATE_KEY ||
                     !process.env.GOOGLE_SHEET_ID
  if (isDemoMode) {
    cachedProductos = productosData as Producto[]
    cachedAt = Date.now()
    return cachedProductos
  }

  // Cargar desde el Sheet (hoja Productos)
  try {
    const rows = await readRange('Productos', 'A:F')
    if (rows.length <= 1) {
      // Hoja Productos vacía → fallback a JSON
      cachedProductos = productosData as Producto[]
      cachedAt = Date.now()
      return cachedProductos
    }

    const headers = rows[0] as string[]
    const productos: Producto[] = rows.slice(1)
      .filter(r => r[0] && r[1])  // solo filas con código y descripción
      .map(r => {
        const p: Producto = {
          codigo: String(r[0] ?? ''),
          descripcion: String(r[1] ?? ''),
        }
        // Mapear columnas opcionales
        if (r[2]) p.um = String(r[2])
        if (r[3]) p.ubicacion = String(r[3])
        const costoRaw = r[4]
        if (costoRaw !== '' && costoRaw !== undefined && costoRaw !== null) {
          const num = Number(costoRaw)
          if (!isNaN(num) && num > 0) p.costo = num
        }
        if (r[5]) p.categoria = String(r[5])
        return p
      })

    cachedProductos = productos
    cachedAt = Date.now()
    console.log(`[productos] Cargados ${productos.length} productos desde Sheet (caché por 10 min)`)
    return cachedProductos
  } catch (e) {
    console.error('[productos] Error cargando desde Sheet:', e)
    // Fallback a JSON
    cachedProductos = productosData as Producto[]
    cachedAt = Date.now()
    return cachedProductos
  }
}

/**
 * GET /api/productos?q=...&limit=20&refresh=1
 * Busca productos por código o descripción.
 * Lee desde el Sheet "Productos" (con caché en memoria de 10 min).
 *
 * Parámetros:
 * - q: texto a buscar (vacío = devolver primeros N)
 * - limit: máximo de resultados (default 20, max 100)
 * - refresh=1: fuerza recarga del Sheet (ignora caché)
 */
export async function GET(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const user = await verifySessionToken(token)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const query = (searchParams.get('q') ?? '').trim().toLowerCase()
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
  const refresh = searchParams.get('refresh') === '1'

  // Si refresh=1, invalidar caché
  if (refresh) {
    cachedProductos = null
    cachedAt = 0
    console.log('[productos] Caché invalidada manualmente')
  }

  const productos = await getProductos()

  if (!query) {
    // Sin query → devolver los primeros 20 productos
    return NextResponse.json({
      productos: productos.slice(0, 20),
      total: productos.length,
      cached: Date.now() - cachedAt < CACHE_TTL,
      source: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'Google Sheet' : 'JSON local',
    })
  }

  // Búsqueda: por código o descripción (case-insensitive)
  const resultados: Producto[] = []
  for (const p of productos) {
    if (resultados.length >= limit) break
    const cod = p.codigo.toLowerCase()
    const desc = p.descripcion.toLowerCase()
    if (cod.includes(query) || desc.includes(query)) {
      resultados.push(p)
    }
  }

  return NextResponse.json({
    productos: resultados,
    total: productos.length,
    query,
    cached: Date.now() - cachedAt < CACHE_TTL,
    source: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'Google Sheet' : 'JSON local',
  })
}
