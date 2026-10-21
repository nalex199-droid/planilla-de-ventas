import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth'
import { readRange, appendRow, findRowByValue, updateCell } from '@/lib/google-sheets'

// Aumentar timeout a 30s (default de Vercel es 10s)
export const maxDuration = 30

interface FetchResult {
  source: string
  bcv?: number | null
  monitor?: number | null
  status: string
  error?: string
}

/**
 * GET /api/tasas/bcv
 * Intenta obtener la tasa BCV y Monitor desde múltiples fuentes públicas.
 */
export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const user = await verifySessionToken(token)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  console.log('[BCV] Iniciando obtencion de tasas...')

  const results: FetchResult[] = []
  let bcv: number | null = null
  let monitor: number | null = null

  // Función helper para validar número (BCV normalmente entre 100-10000)
  function isValidRate(n: number | null): n is number {
    return n !== null && !isNaN(n) && n > 100 && n < 100000
  }

  // === FUENTES PARA BCV ===
  // 1. Web scraping directo del BCV (html completo)
  if (bcv === null) {
    const result: FetchResult = { source: 'bcv.org.ve (scraping)', status: 'trying' }
    try {
      const res = await fetch('https://www.bcv.org.ve/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'es-VE,es;q=0.9',
        },
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      })
      if (res.ok) {
        const html = await res.text()
        // Buscar patrones de la tasa en el HTML
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
            if (isValidRate(num)) {
              bcv = num
              result.bcv = num
              result.status = `OK (${num})`
              break
            }
          }
        }
        if (!result.bcv) result.status = 'HTML parseado pero tasa no encontrada'
      } else {
        result.status = `HTTP ${res.status}`
      }
    } catch (e: any) {
      result.status = 'error'
      result.error = e.message
    }
    results.push(result)
    console.log(`[BCV] Fuente 1 (${result.source}): ${result.status}`)
  }

  // 2. bcv-exchange-rates en Vercel
  if (bcv === null) {
    const result: FetchResult = { source: 'bcv-exchange-rates.vercel.app', status: 'trying' }
    try {
      const res = await fetch('https://bcv-exchange-rates.vercel.app/api/latest', {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      })
      if (res.ok) {
        const data: any = await res.json()
        const rate = data?.rates?.VES ?? data?.usd ?? data?.bcv ?? data?.data?.usd
        if (isValidRate(Number(rate))) {
          bcv = Number(rate)
          result.bcv = bcv
          result.status = `OK (${bcv})`
        } else {
          result.status = 'respuesta recibida pero sin tasa reconocida'
        }
      } else {
        result.status = `HTTP ${res.status}`
      }
    } catch (e: any) {
      result.status = 'error'
      result.error = e.message
    }
    results.push(result)
    console.log(`[BCV] Fuente 2 (${result.source}): ${result.status}`)
  }

  // 3. pyves.ooo
  if (bcv === null) {
    const result: FetchResult = { source: 'pyves.ooo', status: 'trying' }
    try {
      const res = await fetch('https://pyves.ooo/bcv/usd', {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      })
      if (res.ok) {
        const data: any = await res.json()
        const rate = data?.price ?? data?.rate ?? data?.value
        if (isValidRate(Number(rate))) {
          bcv = Number(rate)
          result.bcv = bcv
          result.status = `OK (${bcv})`
        } else {
          result.status = 'sin tasa'
        }
      } else {
        result.status = `HTTP ${res.status}`
      }
    } catch (e: any) {
      result.status = 'error'
      result.error = e.message
    }
    results.push(result)
    console.log(`[BCV] Fuente 3 (${result.source}): ${result.status}`)
  }

  // 4. Intercambio Dolar Venezuela
  if (bcv === null) {
    const result: FetchResult = { source: 's3.amazonaws.com/dolarenlinea', status: 'trying' }
    try {
      const res = await fetch('https://s3.amazonaws.com/dolarenlinea/web/dolar.json', {
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      })
      if (res.ok) {
        const data: any = await res.json()
        const rate = data?.bcv ?? data?.data?.bcv
        if (isValidRate(Number(rate))) {
          bcv = Number(rate)
          result.bcv = bcv
          result.status = `OK (${bcv})`
        } else {
          result.status = 'sin tasa'
        }
      } else {
        result.status = `HTTP ${res.status}`
      }
    } catch (e: any) {
      result.status = 'error'
      result.error = e.message
    }
    results.push(result)
    console.log(`[BCV] Fuente 4 (${result.source}): ${result.status}`)
  }

  // === FUENTES PARA MONITOR ===
  // 1. monitor.net.ve
  if (monitor === null) {
    const result: FetchResult = { source: 'monitor.net.ve', status: 'trying' }
    try {
      const res = await fetch('https://monitor.net.ve/api/v1/monitor', {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      })
      if (res.ok) {
        const data: any = await res.json()
        const monitors = data?.monitors ?? data
        const candidates = ['enparalelovzla', 'monitor', 'dolartoday', 'paypal', 'bcd']
        for (const key of candidates) {
          if (monitors?.[key]?.price) {
            const num = Number(monitors[key].price)
            if (isValidRate(num)) {
              monitor = num
              result.monitor = num
              result.status = `OK (${num}) via ${key}`
              break
            }
          }
        }
        if (!result.monitor) result.status = 'sin monitor reconocido'
      } else {
        result.status = `HTTP ${res.status}`
      }
    } catch (e: any) {
      result.status = 'error'
      result.error = e.message
    }
    results.push(result)
    console.log(`[MONITOR] Fuente 1 (${result.source}): ${result.status}`)
  }

  // 2. s3.amazonaws.com/dolarenlinea (suele tener monitor también)
  if (monitor === null) {
    const result: FetchResult = { source: 's3.amazonaws.com/dolarenlinea (monitor)', status: 'trying' }
    try {
      const res = await fetch('https://s3.amazonaws.com/dolarenlinea/web/dolar.json', {
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      })
      if (res.ok) {
        const data: any = await res.json()
        const rate = data?.monitor ?? data?.data?.monitor ?? data?.enparalelovzla
        if (isValidRate(Number(rate))) {
          monitor = Number(rate)
          result.monitor = monitor
          result.status = `OK (${monitor})`
        } else {
          result.status = 'sin monitor'
        }
      } else {
        result.status = `HTTP ${res.status}`
      }
    } catch (e: any) {
      result.status = 'error'
      result.error = e.message
    }
    results.push(result)
    console.log(`[MONITOR] Fuente 2 (${result.source}): ${result.status}`)
  }

  // === RESPUESTA ===
  if (bcv === null && monitor === null) {
    return NextResponse.json({
      error: 'No se pudo obtener la tasa automáticamente desde ninguna fuente. Inténtalo más tarde o ingrésala manualmente.',
      bcv: null,
      monitor: null,
      sources_tried: results.map(r => ({ source: r.source, status: r.status, error: r.error })),
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
    return NextResponse.json({ error: err.error ?? 'No se pudo obtener la tasa', sources_tried: err.sources_tried }, { status: 503 })
  }
  const data: any = await getRes.json()

  if (!data.bcv && !data.monitor) {
    return NextResponse.json({ error: 'No se pudo obtener ninguna tasa', sources_tried: data.sources_tried }, { status: 503 })
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
    sources_tried: data.sources_tried,
  })
}
