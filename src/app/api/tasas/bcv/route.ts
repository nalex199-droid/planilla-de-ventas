import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth'
import { readRange, appendRow, findRowByValue, updateCell } from '@/lib/google-sheets'

export const maxDuration = 30

interface FetchResult {
  source: string
  bcv?: number | null
  monitor?: number | null
  status: string
  error?: string
}

function isValidRate(n: number | null): n is number {
  return n !== null && !isNaN(n) && n > 100 && n < 100000
}

// === Fetchers individuales (corren en paralelo) ===
async function fetchBcvFromErApi(): Promise<number | null> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data: any = await res.json()
    const rate = data?.rates?.VES
    return isValidRate(Number(rate)) ? Number(rate) : null
  } catch { return null }
}

async function fetchBcvFromBcvScrape(): Promise<number | null> {
  try {
    const res = await fetch('https://www.bcv.org.ve/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-VE,es;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const html = await res.text()
    const patterns = [
      /<strong[^>]*>\s*Bs\.\s*([\d.,]+)\s*<\/strong>/i,
      /Bs\.\s*([\d]{1,3}[.,]\d{1,4})/i,
      /\$\s*([\d]{1,3}[.,]\d{1,4})/i,
      /d[óo]lar[\s\S]{0,200}?([\d]{1,3}[.,]\d{1,4})/i,
    ]
    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match) {
        const numStr = match[1].replace(/\./g, '').replace(',', '.')
        const num = Number(numStr)
        if (isValidRate(num)) return num
      }
    }
    return null
  } catch { return null }
}

async function fetchMonitorFromNetVe(): Promise<number | null> {
  try {
    const res = await fetch('https://monitor.net.ve/api/v1/monitor', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data: any = await res.json()
    const monitors = data?.monitors ?? data
    const candidates = ['enparalelovzla', 'monitor', 'dolartoday', 'paypal', 'bcd']
    for (const key of candidates) {
      if (monitors?.[key]?.price) {
        const num = Number(monitors[key].price)
        if (isValidRate(num)) return num
      }
    }
    return null
  } catch { return null }
}

/**
 * GET /api/tasas/bcv
 * Obtiene la tasa BCV y Monitor en paralelo desde múltiples fuentes.
 */
export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const user = await verifySessionToken(token)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const results: FetchResult[] = []
  let bcv: number | null = null
  let monitor: number | null = null

  // === PARALLEL: intentar todas las fuentes de BCV a la vez ===
  console.log('[BCV] Lanzando fetches en paralelo...')
  const [erApiBcv, bcvScrape, monitorNetVe] = await Promise.all([
    fetchBcvFromErApi(),
    fetchBcvFromBcvScrape(),
    fetchMonitorFromNetVe(),
  ])

  // Reportar resultados
  results.push({
    source: 'open.er-api.com',
    bcv: erApiBcv,
    status: erApiBcv !== null ? `OK (${erApiBcv})` : 'no disponible',
  })
  results.push({
    source: 'bcv.org.ve (scraping)',
    bcv: bcvScrape,
    status: bcvScrape !== null ? `OK (${bcvScrape})` : 'no disponible',
  })
  results.push({
    source: 'monitor.net.ve',
    monitor: monitorNetVe,
    status: monitorNetVe !== null ? `OK (${monitorNetVe})` : 'no disponible',
  })

  // Priorizar: erApi > bcvScrape
  bcv = erApiBcv ?? bcvScrape
  monitor = monitorNetVe

  console.log(`[BCV] Resultados: BCV=${bcv}, Monitor=${monitor}`)

  // Si no hay monitor pero hay BCV, estimar como BCV + 10%
  if (monitor === null && bcv !== null) {
    monitor = Math.round(bcv * 1.10 * 100) / 100
    results.push({
      source: 'estimación (BCV + 10%)',
      monitor,
      status: `OK estimado (${monitor})`,
    })
    console.log(`[BCV] Monitor estimado: ${monitor}`)
  }

  // === RESPUESTA ===
  if (bcv === null && monitor === null) {
    return NextResponse.json({
      error: 'No se pudo obtener la tasa automáticamente desde ninguna fuente. Inténtalo más tarde o ingrésala manualmente.',
      bcv: null,
      monitor: null,
      sources_tried: results.map(r => ({ source: r.source, status: r.status })),
    }, { status: 503 })
  }

  return NextResponse.json({
    bcv: bcv !== null ? Number(bcv.toFixed(2)) : null,
    monitor: monitor !== null ? Number(monitor.toFixed(2)) : null,
    fecha: new Date().toISOString(),
    sources_tried: results.map(r => ({ source: r.source, status: r.status })),
  })
}

/**
 * POST /api/tasas/bcv?fecha=YYYY-MM-DD
 * Obtiene las tasas automáticamente y las guarda en el Sheet.
 */
export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const user = await verifySessionToken(token)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const fechaParam = searchParams.get('fecha') ?? new Date().toISOString().slice(0, 10)

    // Llamar al GET internamente para obtener las tasas
    const getRes = await GET()
    if (!getRes.ok) {
      const err = await getRes.json()
      return NextResponse.json({
        error: err.error ?? 'No se pudo obtener la tasa',
        sources_tried: err.sources_tried,
      }, { status: 503 })
    }
    const data: any = await getRes.json()

    if (!data.bcv && !data.monitor) {
      return NextResponse.json({
        error: 'No se pudo obtener ninguna tasa',
        sources_tried: data.sources_tried,
      }, { status: 503 })
    }

    // Buscar si ya existe la tasa para hoy
    const existingRow = await findRowByValue('Tasas', 0, fechaParam)

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
      sources_tried: data.sources_tried,
    })
  } catch (e: any) {
    // Detectar error de permisos de Google Sheets
    const msg = e.message ?? ''
    if (msg.includes('does not have permission') || msg.includes('PERMISSION_DENIED')) {
      return NextResponse.json({
        error: 'La Service Account no tiene permiso de ESCRITURA en el Google Sheet. Abre el Sheet → botón Compartir → busca el email de la Service Account → cambia el permiso de "Viewer" a "Editor" → Guardar.',
        details: msg,
      }, { status: 403 })
    }
    return NextResponse.json({
      error: 'Error inesperado al guardar la tasa',
      details: msg,
    }, { status: 500 })
  }
}
