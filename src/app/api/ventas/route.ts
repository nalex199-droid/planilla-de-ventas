import { NextResponse } from 'next/server'
import { readRange, appendRow } from '@/lib/google-sheets'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth'
import { cookies } from 'next/headers'

async function requireUser() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

// GET /api/ventas?fecha=YYYY-MM-DD&asesor=ROXI
export async function GET(req: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const fechaParam = searchParams.get('fecha')
  const asesorParam = searchParams.get('asesor')

  // Leer todas las ventas (columna A hasta Z)
  const rows = await readRange('Ventas', 'A:Z')
  if (rows.length <= 1) return NextResponse.json({ ventas: [] })

  const headers = rows[0] as string[]
  const ventas = rows.slice(1)
    .filter(r => r[0]) // saltar filas vacías
    .map((r, idx) => {
      const obj: Record<string, string | number> = { _row: idx + 2, id: `row_${idx + 2}` }
      headers.forEach((h, i) => {
        const val = r[i] ?? ''
        // Intentar convertir números
        if (val && !isNaN(Number(val)) && val.trim() !== '') {
          obj[h] = Number(val)
        } else {
          obj[h] = val
        }
      })
      return obj
    })
    .filter(v => {
      if (fechaParam && v.fecha !== fechaParam) return false
      if (asesorParam && v.asesor !== asesorParam) return false
      return true
    })

  return NextResponse.json({ ventas })
}

// POST /api/ventas
export async function POST(req: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const body = await req.json()

    const cantidad = Number(body.cantidad ?? 0)
    const costoUni = Number(body.costoUni ?? 0)
    const neto = Number(body.neto ?? cantidad * costoUni)

    const pagoEfectivoUsd = Number(body.pagoEfectivoUsd ?? 0)
    const pagoEfectivoBs  = Number(body.pagoEfectivoBs ?? 0)
    const debitoBAmiga    = Number(body.debitoBAmiga ?? 0)
    const debitoBVZla     = Number(body.debitoBVZla ?? 0)
    const bioPago         = Number(body.bioPago ?? 0)
    const pm              = Number(body.pm ?? 0)
    const binance         = Number(body.binance ?? 0)
    const zelle           = Number(body.zelle ?? 0)
    const vpm             = Number(body.vpm ?? 0)
    const tasaUsdBs       = Number(body.tasaUsdBs ?? 0)

    const montoBs = pagoEfectivoBs + debitoBAmiga + debitoBVZla + bioPago + pm + vpm
    const montoUsd = pagoEfectivoUsd + binance + zelle
    const totalBs = montoBs + montoUsd * tasaUsdBs
    const totalVenta = tasaUsdBs > 0
      ? montoUsd + montoBs / tasaUsdBs
      : montoUsd

    const fecha = body.fecha ?? new Date().toISOString().slice(0, 10)
    const hora = new Date().toISOString().slice(11, 19)
    const userId = user.id

    // Orden de columnas debe coincidir con el header del Sheet (ver seed-google-sheets.ts)
    // Redondear a 2 decimales para evitar problemas de formato con Google Sheets
    const round2 = (x: number) => Math.round(x * 100) / 100
    const values = [
      fecha, hora, userId,
      body.cedula ?? '', body.nombre ?? '', body.celular ?? '',
      body.codigo ?? '', body.descripcion ?? '',
      cantidad, costoUni, round2(neto),
      pagoEfectivoUsd, pagoEfectivoBs, debitoBAmiga, debitoBVZla,
      bioPago, pm, binance, zelle, vpm,
      round2(montoBs), round2(montoUsd), round2(totalBs), tasaUsdBs,
      body.asesor ?? user.name, round2(totalVenta),
    ]

    const rowNum = await appendRow('Ventas', values)

    return NextResponse.json({
      venta: {
        id: `row_${rowNum}`,
        fecha, hora,
        cedula: body.cedula, nombre: body.nombre, celular: body.celular,
        codigo: body.codigo, descripcion: body.descripcion,
        cantidad, costoUni, neto,
        pagoEfectivoUsd, pagoEfectivoBs, debitoBAmiga, debitoBVZla,
        bioPago, pm, binance, zelle, vpm,
        montoBs, montoUsd, totalBs, tasaUsdBs,
        asesor: body.asesor ?? user.name,
        totalVenta,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Error al crear venta: ' + (e as Error).message }, { status: 500 })
  }
}

// DELETE /api/ventas?id=row_NNN
export async function DELETE(req: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  // id es "row_NNN" donde NNN es el índice de fila en el Sheet
  const match = String(id).match(/^row_(\d+)$/)
  if (!match) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const rowIndex = parseInt(match[1], 10)
  const { deleteRow } = await import('@/lib/google-sheets')
  await deleteRow('Ventas', rowIndex)
  return NextResponse.json({ ok: true })
}
