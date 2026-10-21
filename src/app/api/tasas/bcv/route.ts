import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth'
import { readRange, appendRow, findRowByValue, updateCell } from '@/lib/google-sheets'

/**
 * GET /api/tasas/bcv
 * Hace scraping del sitio web del BCV (https://www.bcv.org.ve/) y devuelve
 * la tasa USD/BSV actual. No requiere autenticación porque es info pública.
 * 
 * También intenta obtener la tasa Monitor desde monitor.net.ve
 */
export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const user = await verifySessionToken(token)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  console.log('Obteniendo tasa BCV...')

  // 1. Hacer scraping del sitio web del BCV
  let bcv: number | null = null
  try {
    const res = await fetch('https://www.bcv.org.ve/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-VE,es;q=0.9,en;q=0.8',
      },
      cache: 'no-store',
    })
    if (res.ok) {
      const html = await res.text()
      // Buscar la tasa USD en el HTML
      // El BCV usa varios formatos posibles. Intentamos varios regex.
      const patterns = [
        // Formato nuevo: <strong>Bs. 1026.2540</strong> cerca de "USD"
        /USD[\s\S]{0,500}?Bs\.\s*([\d.,]+)/i,
        // Formato: <strong>$ Bs. 1026,2540</strong>
        /\$\s*Bs\.?\s*([\d.,]+)/i,
        // Buscar "Dolar" seguido de un número
        /d[óo]lar[\s\S]{0,500}?([\d]{1,3}[.,][\d]{1,4})/i,
        // Formato: rate="1026.2540"
        /rate[\s\S]{0,50}?([\d]{1,3}[.,][\d]{1,4})/i,
        // Cualquier "Bs. X.XXXX"
        /Bs\.\s*([\d]{1,3}[.,][\d]{1,4})/i,
      ]
      for (const pattern of patterns) {
        const match = html.match(pattern)
        if (match) {
          const numStr = match[1].replace(/\./g, '').replace(',', '.')
          const num = Number(numStr)
          if (!isNaN(num) && num > 100 && num < 10000) { // Sanity check: BCV está entre 100-10000
            bcv = num
            console.log(`BCV encontrado con regex: ${num}`)
            break
          }
        }
      }
    } else {
      console.log('BCV respondió:', res.status)
    }
  } catch (e) {
    console.log('Error scraping BCV:', e)
  }

  // 2. Intentar obtener la tasa Monitor desde monitor.net.ve
  let monitor: number | null = null
  try {
    const res = await fetch('https://monitor.net.ve/api/v1/monitor', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    })
    if (res.ok) {
      const data: any = await res.json()
      // El formato del monitor.net.ve puede variar, intentamos varias rutas
      const m = data?.monitors?.enparalelovzla?.price ?? data?.monitors?.monitor?.price ?? data?.price
      if (m && !isNaN(Number(m))) {
        monitor = Number(m)
        console.log(`Monitor encontrado: ${monitor}`)
      }
    }
  } catch (e) {
    console.log('Monitor falló:', e)
  }

  // 3. Si no se pudo obtener ninguna tasa, devolver error
  if (bcv === null && monitor === null) {
    return NextResponse.json({
      error: 'No se pudo obtener la tasa automáticamente. Inténtalo de nuevo más tarde o ingrésala manualmente.',
      bcv: null,
      monitor: null,
    }, { status: 503 })
  }

  return NextResponse.json({
    bcv: bcv !== null ? Number(bcv.toFixed(2)) : null,
    monitor: monitor !== null ? Number(monitor.toFixed(2)) : null,
    fecha: new Date().toISOString(),
  })
}

/**
 * POST /api/tasas/bcv?fecha=YYYY-MM-DD
 * Hace scraping del BCV + Monitor y guarda las tasas en el Sheet para la fecha indicada.
 */
export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const user = await verifySessionToken(token)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const fechaParam = searchParams.get('fecha') ?? new Date().toISOString().slice(0, 10)

  // Llamar al GET internamente para obtener las tasas
  const getRes = await GET()
  if (!getRes.ok) {
    const err = await getRes.json()
    return NextResponse.json({ error: err.error ?? 'No se pudo obtener la tasa' }, { status: 503 })
  }
  const data: any = await getRes.json()

  if (!data.bcv && !data.monitor) {
    return NextResponse.json({ error: 'No se pudo obtener ninguna tasa' }, { status: 503 })
  }

  // Buscar si ya existe la tasa para hoy
  const existingRow = await findRowByValue('Tasas', 0, fechaParam)

  // Si ya existe, actualizar; si no, crear
  const bcv = Number(data.bcv ?? 0)
  const monitor = Number(data.monitor ?? 0)

  if (existingRow) {
    if (bcv) await updateCell('Tasas', `B${existingRow}`, bcv)
    if (monitor) await updateCell('Tasas', `C${existingRow}`, monitor)
  } else {
    await appendRow('Tasas', [fechaParam, bcv || 0, monitor || 0])
  }

  return NextResponse.json({
    ok: true,
    tasa: { fecha: fechaParam, bcv, monitor },
    message: `Tasa actualizada: BCV=${bcv || '(sin cambio)'} · Monitor=${monitor || '(sin cambio)'}`,
  })
}
