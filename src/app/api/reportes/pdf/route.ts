import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth'
import { readRange } from '@/lib/google-sheets'

// Tipos de fuentes para pdfmake (cargados dinámicamente)
const fonts = {
  Roboto: {
    normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf',
    bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf',
    italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Italic.ttf',
    bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-MediumItalic.ttf',
  },
}

// pdfmake v0.3.x: require devuelve una instancia ya creada con método setFonts + createPdf
async function getPdfBuffer(docDefinition: any): Promise<Buffer> {
  // Cargar pdfmake dinámicamente (evita problemas en build)
  const pdfmake: any = await import('pdfmake').then(m => (m as any).default ?? m)
  // Si es un módulo ES, default es la instancia
  const instance = pdfmake.default ?? pdfmake
  // Configurar fonts
  if (typeof instance.setFonts === 'function') {
    instance.setFonts(fonts)
  }
  // Crear el PDF
  const doc = instance.createPdf(docDefinition)
  // getBuffer() devuelve una Promise<Buffer>
  return await doc.getBuffer()
}

function n(v: string | number | undefined): number {
  if (v === undefined || v === '') return 0
  const x = Number(v)
  return isNaN(x) ? 0 : x
}

function fmt(n: number): string {
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// GET /api/reportes/pdf?fecha=YYYY-MM-DD
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

  // Procesar ventas
  const ventasHeaders = ventasRows[0] ?? []
  const idx: Record<string, number> = {}
  ventasHeaders.forEach((h, i) => { idx[h] = i })

  const ventasData = ventasRows.length > 1
    ? ventasRows.slice(1).filter(r => r[0] && r[0] === fechaParam).map(r => ({
        hora: r[idx['hora'] ?? 1] ?? '',
        cedula: r[idx['cedula'] ?? 3] ?? '',
        nombre: r[idx['nombre'] ?? 4] ?? '',
        descripcion: r[idx['descripcion'] ?? 7] ?? '',
        cantidad: n(r[idx['cantidad'] ?? 8]),
        neto: n(r[idx['neto'] ?? 10]),
        montoBs: n(r[idx['montoBs'] ?? 20]),
        montoUsd: n(r[idx['montoUsd'] ?? 21]),
        asesor: r[idx['asesor'] ?? 24] ?? '',
        totalVenta: n(r[idx['totalVenta'] ?? 25]),
      }))
    : []

  const totalVentaDia = ventasData.reduce((s, v) => s + v.totalVenta, 0)
  const totalMontoBs = ventasData.reduce((s, v) => s + v.montoBs, 0)
  const totalMontoUsd = ventasData.reduce((s, v) => s + v.montoUsd, 0)
  const totalComisiones = ventasData.reduce((s, v) => s + v.neto * 0.02, 0)

  // Procesar gastos
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

  // Por asesor
  const porAsesorMap = new Map<string, { count: number; totalVenta: number; comision: number; montoBs: number; montoUsd: number }>()
  for (const v of ventasData) {
    const cur = porAsesorMap.get(v.asesor) ?? { count: 0, totalVenta: 0, comision: 0, montoBs: 0, montoUsd: 0 }
    cur.count += 1
    cur.totalVenta += v.totalVenta
    cur.comision += v.neto * 0.02
    cur.montoBs += v.montoBs
    cur.montoUsd += v.montoUsd
    porAsesorMap.set(v.asesor, cur)
  }

  const fechaLarga = new Date(fechaParam + 'T00:00:00').toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const netoUsd = totalVentaDia - totalGastosUsd
  const netoBs = totalMontoBs - totalGastosBs

  // Construir documento PDF
  const docDefinition = {
    pageSize: 'LETTER' as const,
    pageMargins: [40, 60, 40, 60],
    pageOrientation: 'portrait' as const,
    defaultStyle: { font: 'Roboto', fontSize: 9 },
    content: [
      // Header
      {
        text: 'PLANTILLA DE VENTAS',
        style: 'title',
        alignment: 'center',
        margin: [0, 0, 0, 5],
      },
      {
        text: `Reporte Diario — ${fechaLarga}`,
        style: 'subtitle',
        alignment: 'center',
        margin: [0, 0, 0, 5],
      },
      {
        text: `Tasas: BCV = ${tasaBcv} BS/$   ·   Monitor = ${tasaMonitor} BS/$`,
        alignment: 'center',
        fontSize: 10,
        color: '#6B7280',
        margin: [0, 0, 0, 20],
      },

      // KPIs principales
      {
        columns: [
          { text: 'VENTAS', style: 'kpiLabel', alignment: 'center' },
          { text: 'GASTOS', style: 'kpiLabel', alignment: 'center' },
          { text: 'COMISIONES', style: 'kpiLabel', alignment: 'center' },
          { text: 'NETO', style: 'kpiLabel', alignment: 'center' },
        ],
        margin: [0, 0, 0, 5],
      },
      {
        table: {
          widths: ['*', '*', '*', '*'],
          body: [[
            { text: `$${fmt(totalVentaDia)}\n${fmt(totalMontoBs)} Bs`, style: 'kpiValue', alignment: 'center' },
            { text: `$${fmt(totalGastosUsd)}\n${fmt(totalGastosBs)} Bs`, style: 'kpiValueRed', alignment: 'center' },
            { text: `$${fmt(totalComisiones)}`, style: 'kpiValue', alignment: 'center' },
            { text: `$${fmt(netoUsd)}\n${fmt(netoBs)} Bs`, style: netoUsd >= 0 ? 'kpiValueGreen' : 'kpiValueRed', alignment: 'center' },
          ]],
        },
        margin: [0, 0, 0, 20],
      },

      // Tabla por asesor
      { text: 'POR ASESOR', style: 'sectionTitle', margin: [0, 0, 0, 5] },
      {
        table: {
          widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
          headerRows: 1,
          body: [
            [
              { text: 'Asesor', style: 'tableHeader' },
              { text: '#', style: 'tableHeader', alignment: 'right' },
              { text: 'Monto BS', style: 'tableHeader', alignment: 'right' },
              { text: 'Monto $', style: 'tableHeader', alignment: 'right' },
              { text: 'Total Venta', style: 'tableHeader', alignment: 'right' },
              { text: 'Comisión', style: 'tableHeader', alignment: 'right' },
            ],
            ...Array.from(porAsesorMap.entries()).map(([asesor, d]) => [
              asesor,
              { text: String(d.count), alignment: 'right' },
              { text: fmt(d.montoBs), alignment: 'right' },
              { text: `$${fmt(d.montoUsd)}`, alignment: 'right' },
              { text: `$${fmt(d.totalVenta)}`, alignment: 'right', bold: true },
              { text: `$${fmt(d.comision)}`, alignment: 'right', color: '#B91C1C' },
            ]),
            [
              { text: 'TOTAL', bold: true, fillColor: '#D1FAE5' },
              { text: String(ventasData.length), alignment: 'right', bold: true, fillColor: '#D1FAE5' },
              { text: fmt(totalMontoBs), alignment: 'right', bold: true, fillColor: '#D1FAE5' },
              { text: `$${fmt(totalMontoUsd)}`, alignment: 'right', bold: true, fillColor: '#D1FAE5' },
              { text: `$${fmt(totalVentaDia)}`, alignment: 'right', bold: true, fillColor: '#D1FAE5' },
              { text: `$${fmt(totalComisiones)}`, alignment: 'right', bold: true, fillColor: '#D1FAE5' },
            ],
          ],
        },
        margin: [0, 0, 0, 20],
      },

      // Ventas detalladas
      { text: `VENTAS DEL DÍA (${ventasData.length})`, style: 'sectionTitle', margin: [0, 0, 0, 5] },
      ventasData.length === 0
        ? { text: 'No hay ventas registradas.', color: '#6B7280', margin: [0, 0, 0, 20] }
        : {
            table: {
              widths: ['auto', '*', 'auto', 'auto', 'auto'],
              headerRows: 1,
              body: [
                [
                  { text: 'Hora', style: 'tableHeader' },
                  { text: 'Descripción / Cliente', style: 'tableHeader' },
                  { text: 'Monto BS', style: 'tableHeader', alignment: 'right' },
                  { text: 'Monto $', style: 'tableHeader', alignment: 'right' },
                  { text: 'Total', style: 'tableHeader', alignment: 'right' },
                ],
                ...ventasData.map(v => [
                  v.hora,
                  `${v.descripcion}${v.nombre ? ` (${v.nombre})` : ''}`,
                  { text: fmt(v.montoBs), alignment: 'right' },
                  { text: `$${fmt(v.montoUsd)}`, alignment: 'right' },
                  { text: `$${fmt(v.totalVenta)}`, alignment: 'right', bold: true },
                ]),
              ],
            },
            margin: [0, 0, 0, 20],
          },

      // Gastos
      { text: `GASTOS DEL DÍA (${gastosData.length})`, style: 'sectionTitleRed', margin: [0, 0, 0, 5] },
      gastosData.length === 0
        ? { text: 'No hay gastos registrados.', color: '#6B7280', margin: [0, 0, 0, 20] }
        : {
            table: {
              widths: ['auto', '*', 'auto', 'auto', 'auto'],
              headerRows: 1,
              body: [
                [
                  { text: 'Hora', style: 'tableHeaderRed' },
                  { text: 'Concepto', style: 'tableHeaderRed' },
                  { text: 'Modalidad', style: 'tableHeaderRed' },
                  { text: 'Monto BS', style: 'tableHeaderRed', alignment: 'right' },
                  { text: 'Monto $', style: 'tableHeaderRed', alignment: 'right' },
                ],
                ...gastosData.map(g => [
                  g.hora,
                  g.concepto,
                  g.modalidad,
                  { text: fmt(g.montoBs), alignment: 'right' },
                  { text: `$${fmt(g.montoUsd)}`, alignment: 'right' },
                ]),
                [
                  { text: '', colSpan: 3 },
                  '',
                  '',
                  { text: fmt(totalGastosBs), alignment: 'right', bold: true, fillColor: '#FECDD3' },
                  { text: `$${fmt(totalGastosUsd)}`, alignment: 'right', bold: true, fillColor: '#FECDD3' },
                ],
              ],
            },
            margin: [0, 0, 0, 20],
          },

      // Resumen final
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [{ text: 'TOTAL VENTAS ($)', bold: true, fillColor: '#D1FAE5' }, { text: `$${fmt(totalVentaDia)}`, alignment: 'right', bold: true, fillColor: '#D1FAE5' }],
            [{ text: 'TOTAL GASTOS ($)', bold: true, fillColor: '#FECDD3' }, { text: `$${fmt(totalGastosUsd)}`, alignment: 'right', bold: true, fillColor: '#FECDD3' }],
            [{ text: 'NETO del DÍA ($)', bold: true, fontSize: 14, fillColor: netoUsd >= 0 ? '#A7F3D0' : '#FECACA' }, { text: `$${fmt(netoUsd)}`, alignment: 'right', bold: true, fontSize: 14, fillColor: netoUsd >= 0 ? '#A7F3D0' : '#FECACA' }],
          ],
        },
        margin: [0, 10, 0, 30],
      },

      // Footer
      {
        text: `Generado por ${user.name} · Plantilla de Ventas · ${new Date().toLocaleString('es-VE')}`,
        alignment: 'center',
        fontSize: 8,
        color: '#9CA3AF',
      },
    ],
    styles: {
      title: { fontSize: 22, bold: true, color: '#047857' },
      subtitle: { fontSize: 12, color: '#374151' },
      sectionTitle: { fontSize: 14, bold: true, color: '#047857' },
      sectionTitleRed: { fontSize: 14, bold: true, color: '#B91C1C' },
      kpiLabel: { fontSize: 9, bold: true, color: '#6B7280' },
      kpiValue: { fontSize: 14, bold: true, color: '#047857', margin: [0, 5, 0, 5] },
      kpiValueRed: { fontSize: 14, bold: true, color: '#B91C1C', margin: [0, 5, 0, 5] },
      kpiValueGreen: { fontSize: 14, bold: true, color: '#059669', margin: [0, 5, 0, 5] },
      tableHeader: { fontSize: 9, bold: true, color: '#FFFFFF', fillColor: '#047857' },
      tableHeaderRed: { fontSize: 9, bold: true, color: '#FFFFFF', fillColor: '#B91C1C' },
    },
  }

  const buffer = await getPdfBuffer(docDefinition)
  const filename = `Reporte_Ventas_${fechaParam}.pdf`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.byteLength.toString(),
    },
  })
}
