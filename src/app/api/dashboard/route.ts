import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readRange } from '@/lib/google-sheets'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth'

function n(v: string | number | undefined): number {
  if (v === undefined || v === '') return 0
  const x = Number(v)
  return isNaN(x) ? 0 : x
}

// GET /api/dashboard?fecha=YYYY-MM-DD
export async function GET(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const user = await verifySessionToken(token)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const fechaParam = searchParams.get('fecha') ?? new Date().toISOString().slice(0, 10)

  // Cargar ventas, gastos y tasas en paralelo
  const [ventasRows, gastosRows, tasasRows] = await Promise.all([
    readRange('Ventas', 'A:Z'),
    readRange('Gastos', 'A:I'),
    readRange('Tasas', 'A:C'),
  ])

  // Buscar tasa del día
  let tasa: { bcv: number; monitor: number } | null = null
  if (tasasRows.length > 1) {
    for (let i = 1; i < tasasRows.length; i++) {
      if (tasasRows[i][0] === fechaParam) {
        tasa = { bcv: n(tasasRows[i][1]), monitor: n(tasasRows[i][2]) }
        break
      }
    }
  }

  if (ventasRows.length <= 1) {
    // Verificar si hay gastos aunque no haya ventas
    const gastos = gastosRows.length > 1
      ? gastosRows.slice(1)
          .filter(r => r[0] && r[0] === fechaParam)
          .map((r, i) => ({
            id: `grow_${i + 2}`,
            hora: r[1] ?? '',
            concepto: r[3] ?? '',
            modalidad: r[4] ?? '',
            montoBs: n(r[5]),
            montoUsd: n(r[6]),
            asesor: r[8] ?? '',
          }))
      : []
    const totalGastosBs = gastos.reduce((s, g) => s + g.montoBs, 0)
    const totalGastosUsd = gastos.reduce((s, g) => s + g.montoUsd, 0)
    return NextResponse.json({
      fecha: fechaParam,
      user: { name: user.name, role: user.role },
      tasa,
      totales: { count: 0, totalVentaDia: 0, totalMontoBs: 0, totalMontoUsd: 0, totalComisiones: 0 },
      porAsesor: [],
      porModalidad: { pagoEfectivoUsd: 0, pagoEfectivoBs: 0, debitoBAmiga: 0, debitoBVZla: 0, bioPago: 0, pm: 0, binance: 0, zelle: 0, vpm: 0 },
      ventas: [],
      gastos,
      totalGastosBs: Number(totalGastosBs.toFixed(2)),
      totalGastosUsd: Number(totalGastosUsd.toFixed(2)),
      netoBs: Number((0 - totalGastosBs).toFixed(2)),
      netoUsd: Number((0 - totalGastosUsd).toFixed(2)),
    })
  }

  const headers = ventasRows[0] as string[]
  // Mapear header → índice
  const idx: Record<string, number> = {}
  headers.forEach((h, i) => { idx[h] = i })

  const ventas = ventasRows.slice(1)
    .filter(r => r[0] && r[0] === fechaParam)
    .map((r, i) => ({
      id: `row_${i + 2}`,
      _row: i + 2,
      hora: r[idx['hora'] ?? 1] ?? '',
      cedula: r[idx['cedula'] ?? 3] ?? '',
      nombre: r[idx['nombre'] ?? 4] ?? '',
      descripcion: r[idx['descripcion'] ?? 7] ?? '',
      cantidad: n(r[idx['cantidad'] ?? 8]),
      costoUni: n(r[idx['costoUni'] ?? 9]),
      neto: n(r[idx['neto'] ?? 10]),
      pagoEfectivoUsd: n(r[idx['pagoEfectivoUsd'] ?? 11]),
      pagoEfectivoBs: n(r[idx['pagoEfectivoBs'] ?? 12]),
      debitoBAmiga: n(r[idx['debitoBAmiga'] ?? 13]),
      debitoBVZla: n(r[idx['debitoBVZla'] ?? 14]),
      bioPago: n(r[idx['bioPago'] ?? 15]),
      pm: n(r[idx['pm'] ?? 16]),
      binance: n(r[idx['binance'] ?? 17]),
      zelle: n(r[idx['zelle'] ?? 18]),
      vpm: n(r[idx['vpm'] ?? 19]),
      montoBs: n(r[idx['montoBs'] ?? 20]),
      montoUsd: n(r[idx['montoUsd'] ?? 21]),
      totalBs: n(r[idx['totalBs'] ?? 22]),
      asesor: r[idx['asesor'] ?? 24] ?? '',
      totalVenta: n(r[idx['totalVenta'] ?? 25]),
    }))

  const totalVentaDia = ventas.reduce((s, v) => s + v.totalVenta, 0)
  const totalMontoBs  = ventas.reduce((s, v) => s + v.montoBs, 0)
  const totalMontoUsd = ventas.reduce((s, v) => s + v.montoUsd, 0)
  const totalComisiones = ventas.reduce((s, v) => s + v.neto * 0.02, 0)

  // Procesar gastos del día
  const gastosArray: Array<{
    id: string
    hora: string
    concepto: string
    modalidad: string
    montoBs: number
    montoUsd: number
    asesor: string
  }> = []
  if (gastosRows.length > 1) {
    for (let i = 1; i < gastosRows.length; i++) {
      const r = gastosRows[i]
      if (!r[0] || r[0] !== fechaParam) continue
      gastosArray.push({
        id: `grow_${i + 1}`,
        hora: String(r[1] ?? ''),
        concepto: String(r[3] ?? ''),
        modalidad: String(r[4] ?? ''),
        montoBs: n(r[5]),
        montoUsd: n(r[6]),
        asesor: String(r[8] ?? ''),
      })
    }
  }
  const totalGastosBs = gastosArray.reduce((s, g) => s + g.montoBs, 0)
  const totalGastosUsd = gastosArray.reduce((s, g) => s + g.montoUsd, 0)

  // Calcular Abonos a Proveedores (categoría especial)
  // Los abonos a proveedores se identifican porque el concepto empieza con [ABONO_PROVEEDOR]
  const abonosProveedores = gastosArray.filter(g =>
    g.concepto?.toUpperCase().startsWith('[ABONO_PROVEEDOR]') ||
    g.concepto?.toUpperCase().includes('ABONO A PROVEEDOR') ||
    g.concepto?.toUpperCase().includes('ABONO_PROVEEDOR')
  )
  const totalAbonosProveedoresBs = abonosProveedores.reduce((s, g) => s + g.montoBs, 0)
  const totalAbonosProveedoresUsd = abonosProveedores.reduce((s, g) => s + g.montoUsd, 0)

  // Otros gastos (excluyendo abonos a proveedores)
  const otrosGastos = gastosArray.filter(g => !abonosProveedores.includes(g))
  const totalOtrosGastosBs = otrosGastos.reduce((s, g) => s + g.montoBs, 0)
  const totalOtrosGastosUsd = otrosGastos.reduce((s, g) => s + g.montoUsd, 0)

  const porAsesorMap = new Map<string, { count: number; totalVenta: number; comision: number; montoBs: number; montoUsd: number }>()
  for (const v of ventas) {
    const cur = porAsesorMap.get(v.asesor) ?? { count: 0, totalVenta: 0, comision: 0, montoBs: 0, montoUsd: 0 }
    cur.count += 1
    cur.totalVenta += v.totalVenta
    cur.comision += v.neto * 0.02
    cur.montoBs += v.montoBs
    cur.montoUsd += v.montoUsd
    porAsesorMap.set(v.asesor, cur)
  }

  return NextResponse.json({
    fecha: fechaParam,
    user: { name: user.name, role: user.role },
    tasa,
    totales: {
      count: ventas.length,
      totalVentaDia: Number(totalVentaDia.toFixed(2)),
      totalMontoBs:  Number(totalMontoBs.toFixed(2)),
      totalMontoUsd: Number(totalMontoUsd.toFixed(2)),
      totalComisiones: Number(totalComisiones.toFixed(2)),
    },
    porAsesor: Array.from(porAsesorMap.entries()).map(([asesor, d]) => ({
      asesor,
      count: d.count,
      totalVenta: Number(d.totalVenta.toFixed(2)),
      comision: Number(d.comision.toFixed(2)),
      montoBs: Number(d.montoBs.toFixed(2)),
      montoUsd: Number(d.montoUsd.toFixed(2)),
    })),
    porModalidad: {
      pagoEfectivoUsd: Number(ventas.reduce((s, v) => s + v.pagoEfectivoUsd, 0).toFixed(2)),
      pagoEfectivoBs:  Number(ventas.reduce((s, v) => s + v.pagoEfectivoBs, 0).toFixed(2)),
      debitoBAmiga:    Number(ventas.reduce((s, v) => s + v.debitoBAmiga, 0).toFixed(2)),
      debitoBVZla:     Number(ventas.reduce((s, v) => s + v.debitoBVZla, 0).toFixed(2)),
      bioPago:         Number(ventas.reduce((s, v) => s + v.bioPago, 0).toFixed(2)),
      pm:              Number(ventas.reduce((s, v) => s + v.pm, 0).toFixed(2)),
      binance:         Number(ventas.reduce((s, v) => s + v.binance, 0).toFixed(2)),
      zelle:           Number(ventas.reduce((s, v) => s + v.zelle, 0).toFixed(2)),
      vpm:             Number(ventas.reduce((s, v) => s + v.vpm, 0).toFixed(2)),
    },
    ventas,
    gastos: gastosArray,
    totalGastosBs: Number(totalGastosBs.toFixed(2)),
    totalGastosUsd: Number(totalGastosUsd.toFixed(2)),
    netoBs: Number((totalMontoBs - totalGastosBs).toFixed(2)),
    netoUsd: Number((totalVentaDia - totalGastosUsd).toFixed(2)),
    abonosProveedores: abonosProveedores.length,
    totalAbonosProveedoresBs: Number(totalAbonosProveedoresBs.toFixed(2)),
    totalAbonosProveedoresUsd: Number(totalAbonosProveedoresUsd.toFixed(2)),
    totalOtrosGastosBs: Number(totalOtrosGastosBs.toFixed(2)),
    totalOtrosGastosUsd: Number(totalOtrosGastosUsd.toFixed(2)),
  })
}
