import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth'
import { readRange } from '@/lib/google-sheets'
import ExcelJS from 'exceljs'

function n(v: string | number | undefined): number {
  if (v === undefined || v === '') return 0
  if (typeof v === 'number') return v
  // Limpiar formato español (1.234,56) e inglés (1,234.56)
  let s = String(v).trim()
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (s.includes(',') && !s.includes('.')) {
    s = s.replace(',', '.')
  } else if (s.includes('.') && !s.includes(',')) {
    const parts = s.split('.')
    if (parts.length > 1 && parts.slice(1).every(p => p.length === 3)) {
      s = parts.join('')
    }
  }
  const x = Number(s)
  return isNaN(x) ? 0 : x
}

// GET /api/reportes/excel?fecha=YYYY-MM-DD
export async function GET(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const user = await verifySessionToken(token)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const fechaParam = searchParams.get('fecha') ?? new Date().toISOString().slice(0, 10)

  // Cargar datos
  const [ventasRows, gastosRows, tasasRows] = await Promise.all([
    readRange('Ventas', 'A:Z'),
    readRange('Gastos', 'A:I'),
    readRange('Tasas', 'A:C'),
  ])

  // Buscar tasa
  let tasaBcv = 0, tasaMonitor = 0
  if (tasasRows.length > 1) {
    for (let i = 1; i < tasasRows.length; i++) {
      if (tasasRows[i][0] === fechaParam) {
        tasaBcv = n(tasasRows[i][1])
        tasaMonitor = n(tasasRows[i][2])
        break
      }
    }
  }

  // Crear workbook
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Plantilla de Ventas'
  wb.created = new Date()

  // ====== Hoja 1: Resumen ======
  const wsResumen = wb.addWorksheet('Resumen', {
    properties: { tabColor: '10B981' },
    views: [{ showGridLines: false }],
  })

  // Estilo de títulos
  const titleStyle = { font: { bold: true, size: 16, color: { argb: 'FF047857' } } }
  const subtitleStyle = { font: { bold: true, size: 12, color: { argb: 'FF374151' } } }
  const headerStyle = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } }, alignment: { horizontal: 'center' as const } }
  const totalStyle = { font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } } }

  wsResumen.mergeCells('A1:F1')
  wsResumen.getCell('A1').value = 'REPORTE DIARIO DE VENTAS'
  wsResumen.getCell('A1').style = titleStyle

  wsResumen.mergeCells('A2:F2')
  wsResumen.getCell('A2').value = `Fecha: ${new Date(fechaParam + 'T00:00:00').toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`

  wsResumen.mergeCells('A3:F3')
  wsResumen.getCell('A3').value = `Tasas del día: BCV = ${tasaBcv} BS/$  ·  Monitor = ${tasaMonitor} BS/$`

  // Procesar ventas
  const ventasHeaders = ventasRows[0] ?? []
  const ventas = ventasRows.length > 1
    ? ventasRows.slice(1).filter(r => r[0] && r[0] === fechaParam)
    : []

  // KPIs principales
  let totalVentaDia = 0, totalMontoBs = 0, totalMontoUsd = 0, totalComisiones = 0
  const idx: Record<string, number> = {}
  ventasHeaders.forEach((h, i) => { idx[h] = i })

  const ventasData = ventas.map(r => ({
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
    asesor: r[idx['asesor'] ?? 24] ?? '',
    totalVenta: n(r[idx['totalVenta'] ?? 25]),
  }))

  totalVentaDia = ventasData.reduce((s, v) => s + v.totalVenta, 0)
  totalMontoBs = ventasData.reduce((s, v) => s + v.montoBs, 0)
  totalMontoUsd = ventasData.reduce((s, v) => s + v.montoUsd, 0)
  totalComisiones = ventasData.reduce((s, v) => s + v.neto * 0.02, 0)

  // Procesar gastos
  const gastosHeaders = gastosRows[0] ?? []
  const gastosData = gastosRows.length > 1
    ? gastosRows.slice(1).filter(r => r[0] && r[0] === fechaParam).map(r => ({
        hora: r[1] ?? '',
        concepto: r[3] ?? '',
        modalidad: r[4] ?? '',
        montoBs: n(r[5]),
        montoUsd: n(r[6]),
        asesor: r[8] ?? '',
      }))
    : []
  const totalGastosBs = gastosData.reduce((s, g) => s + g.montoBs, 0)
  const totalGastosUsd = gastosData.reduce((s, g) => s + g.montoUsd, 0)

  // Calcular Abonos a Proveedores
  const abonosProveedores = gastosData.filter(g =>
    (g.concepto ?? '').toUpperCase().startsWith('[ABONO_PROVEEDOR]') ||
    (g.concepto ?? '').toUpperCase().includes('ABONO A PROVEEDOR') ||
    (g.concepto ?? '').toUpperCase().includes('ABONO_PROVEEDOR')
  )
  const totalAbonosBs = abonosProveedores.reduce((s, g) => s + g.montoBs, 0)
  const totalAbonosUsd = abonosProveedores.reduce((s, g) => s + g.montoUsd, 0)
  const otrosGastos = gastosData.filter(g => !abonosProveedores.includes(g))
  const totalOtrosBs = otrosGastos.reduce((s, g) => s + g.montoBs, 0)
  const totalOtrosUsd = otrosGastos.reduce((s, g) => s + g.montoUsd, 0)

  // Por asesor
  const porAsesor = new Map<string, { count: number; totalVenta: number; comision: number; montoBs: number; montoUsd: number }>()
  for (const v of ventasData) {
    const cur = porAsesor.get(v.asesor) ?? { count: 0, totalVenta: 0, comision: 0, montoBs: 0, montoUsd: 0 }
    cur.count += 1
    cur.totalVenta += v.totalVenta
    cur.comision += v.neto * 0.02
    cur.montoBs += v.montoBs
    cur.montoUsd += v.montoUsd
    porAsesor.set(v.asesor, cur)
  }

  // KPIs como celdas
  wsResumen.getCell('A5').value = 'RESUMEN GENERAL'
  wsResumen.getCell('A5').style = subtitleStyle

  wsResumen.getCell('A6').value = 'Total Venta Día'
  wsResumen.getCell('B6').value = totalVentaDia
  wsResumen.getCell('B6').numFmt = '"$"#,##0.00'

  wsResumen.getCell('A7').value = 'Monto en BS'
  wsResumen.getCell('B7').value = totalMontoBs
  wsResumen.getCell('B7').numFmt = '#,##0.00'

  wsResumen.getCell('A8').value = 'Monto en $'
  wsResumen.getCell('B8').value = totalMontoUsd
  wsResumen.getCell('B8').numFmt = '"$"#,##0.00'

  wsResumen.getCell('A9').value = 'Total Gastos'
  wsResumen.getCell('B9').value = totalGastosUsd
  wsResumen.getCell('B9').numFmt = '"$"#,##0.00'

  wsResumen.getCell('A10').value = 'Total Gastos BS'
  wsResumen.getCell('B10').value = totalGastosBs
  wsResumen.getCell('B10').numFmt = '#,##0.00'

  // Desglose: Abonos a Proveedores
  wsResumen.getCell('A14').value = '🤝 ABONOS A PROVEEDORES'
  wsResumen.getCell('A14').style = { font: { bold: true, color: { argb: 'FF047857' } } }
  wsResumen.getCell('A15').value = `Cantidad de abonos`
  wsResumen.getCell('B15').value = abonosProveedores.length
  wsResumen.getCell('A16').value = `Total Abonos $`
  wsResumen.getCell('B16').value = totalAbonosUsd
  wsResumen.getCell('B16').numFmt = '"$"#,##0.00'
  wsResumen.getCell('A17').value = `Total Abonos Bs`
  wsResumen.getCell('B17').value = totalAbonosBs
  wsResumen.getCell('B17').numFmt = '#,##0.00'

  // Otros gastos
  wsResumen.getCell('A19').value = '💼 OTROS GASTOS'
  wsResumen.getCell('A19').style = { font: { bold: true, color: { argb: 'FF92400E' } } }
  wsResumen.getCell('A20').value = `Cantidad`
  wsResumen.getCell('B20').value = otrosGastos.length
  wsResumen.getCell('A21').value = `Total $`
  wsResumen.getCell('B21').value = totalOtrosUsd
  wsResumen.getCell('B21').numFmt = '"$"#,##0.00'
  wsResumen.getCell('A22').value = `Total Bs`
  wsResumen.getCell('B22').value = totalOtrosBs
  wsResumen.getCell('B22').numFmt = '#,##0.00'

  wsResumen.getCell('A11').value = 'Comisiones (2%)'
  wsResumen.getCell('B11').value = totalComisiones
  wsResumen.getCell('B11').numFmt = '"$"#,##0.00'

  wsResumen.getCell('A12').value = 'NETO del Día ($)'
  wsResumen.getCell('A12').style = { font: { bold: true, size: 14, color: { argb: totalVentaDia - totalGastosUsd >= 0 ? 'FF047857' : 'FFB91C1C' } } }
  wsResumen.getCell('B12').value = totalVentaDia - totalGastosUsd
  wsResumen.getCell('B12').style = { font: { bold: true, size: 14 } }
  wsResumen.getCell('B12').numFmt = '"$"#,##0.00'

  wsResumen.getCell('A13').value = 'NETO del Día (Bs)'
  wsResumen.getCell('B13').value = totalMontoBs - totalGastosBs
  wsResumen.getCell('B13').style = { font: { bold: true } }
  wsResumen.getCell('B13').numFmt = '#,##0.00'

  // Tabla por asesor
  wsResumen.getCell('A24').value = 'POR ASESOR'
  wsResumen.getCell('A24').style = subtitleStyle

  wsResumen.getRow(25).values = ['Asesor', '# Ventas', 'Monto BS', 'Monto $', 'Total Venta', 'Comisión']
  wsResumen.getRow(25).eachCell(cell => { cell.style = headerStyle })
  let r = 26
  for (const [asesor, d] of porAsesor.entries()) {
    wsResumen.getRow(r).values = [asesor, d.count, d.montoBs, d.montoUsd, d.totalVenta, d.comision]
    wsResumen.getRow(r).getCell(3).numFmt = '#,##0.00'
    wsResumen.getRow(r).getCell(4).numFmt = '"$"#,##0.00'
    wsResumen.getRow(r).getCell(5).numFmt = '"$"#,##0.00'
    wsResumen.getRow(r).getCell(6).numFmt = '"$"#,##0.00'
    r++
  }
  // Fila de totales
  wsResumen.getRow(r).values = ['TOTAL', ventasData.length, totalMontoBs, totalMontoUsd, totalVentaDia, totalComisiones]
  wsResumen.getRow(r).eachCell(cell => { cell.style = totalStyle })
  wsResumen.getRow(r).getCell(3).numFmt = '#,##0.00'
  wsResumen.getRow(r).getCell(4).numFmt = '"$"#,##0.00'
  wsResumen.getRow(r).getCell(5).numFmt = '"$"#,##0.00'
  wsResumen.getRow(r).getCell(6).numFmt = '"$"#,##0.00'

  // Columnas anchas
  wsResumen.columns = [
    { width: 22 }, { width: 14 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 14 },
  ]

  // ====== Hoja 2: Ventas detalladas ======
  const wsVentas = wb.addWorksheet('Ventas Detalladas', { properties: { tabColor: 'F59E0B' } })
  const colsVentas = ['Hora', 'Cédula', 'Nombre', 'Descripción', 'Cant.', 'Costo Uni', 'NETO', 'Pago $', 'Pago BS', 'Débito B/Amiga', 'Débito B/VZLA', 'Bio Pago', 'PM', 'Binance', 'Zelle', 'VPM', 'Monto BS', 'Monto $', 'TOTAL BS', 'Asesor', 'TOTAL VENTA']
  wsVentas.getRow(1).values = colsVentas
  wsVentas.getRow(1).eachCell(cell => { cell.style = headerStyle })

  ventasData.forEach((v, i) => {
    wsVentas.getRow(i + 2).values = [
      v.hora, v.cedula, v.nombre, v.descripcion, v.cantidad, v.costoUni, v.neto,
      v.pagoEfectivoUsd, v.pagoEfectivoBs, v.debitoBAmiga, v.debitoBVZla, v.bioPago, v.pm, v.binance, v.zelle, v.vpm,
      v.montoBs, v.montoUsd, v.montoBs + v.montoUsd * (v.pagoEfectivoUsd + v.binance + v.zelle > 0 ? 1015 : 1), v.asesor, v.totalVenta,
    ]
  })
  wsVentas.columns = [
    { width: 10 }, { width: 14 }, { width: 22 }, { width: 28 }, { width: 8 }, { width: 12 }, { width: 14 },
    { width: 12 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 10 },
    { width: 14 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 14 },
  ]

  // ====== Hoja 3: Gastos ======
  const wsGastos = wb.addWorksheet('Gastos', { properties: { tabColor: 'E11D48' } })
  wsGastos.getRow(1).values = ['Hora', 'Concepto', 'Modalidad', 'Monto BS', 'Monto $', 'Asesor']
  wsGastos.getRow(1).eachCell(cell => { cell.style = { ...headerStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE11D48' } } } })

  gastosData.forEach((g, i) => {
    wsGastos.getRow(i + 2).values = [g.hora, g.concepto, g.modalidad, g.montoBs, g.montoUsd, g.asesor]
  })
  const gTotalRow = gastosData.length + 2
  wsGastos.getRow(gTotalRow).values = ['', 'TOTAL', '', totalGastosBs, totalGastosUsd, '']
  wsGastos.getRow(gTotalRow).eachCell(cell => { cell.style = totalStyle })

  wsGastos.columns = [
    { width: 10 }, { width: 32 }, { width: 20 }, { width: 14 }, { width: 12 }, { width: 14 },
  ]

  // Generar buffer
  const buffer = await wb.xlsx.writeBuffer()
  const filename = `Reporte_Ventas_${fechaParam}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.byteLength.toString(),
    },
  })
}
