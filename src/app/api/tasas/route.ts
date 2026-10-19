import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readRange, appendRow, updateCell, findRowByValue } from '@/lib/google-sheets'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth'

async function requireUser() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

// GET /api/tasas?fecha=YYYY-MM-DD
export async function GET(req: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const fechaParam = searchParams.get('fecha') ?? new Date().toISOString().slice(0, 10)

  // Hoja Tasas: fecha (col A) | bcv (col B) | monitor (col C)
  const rows = await readRange('Tasas', 'A:C')
  if (rows.length <= 1) {
    return NextResponse.json({ tasa: null, fecha: fechaParam })
  }
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === fechaParam) {
      return NextResponse.json({
        tasa: { bcv: Number(rows[i][1]), monitor: Number(rows[i][2]) },
        fecha: fechaParam,
      })
    }
  }
  return NextResponse.json({ tasa: null, fecha: fechaParam })
}

// POST /api/tasas { fecha, bcv, monitor }
export async function POST(req: Request) {
  const user = await requireUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Solo admin puede actualizar tasas' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const fecha = body.fecha ?? new Date().toISOString().slice(0, 10)
    const bcv = Number(body.bcv)
    const monitor = Number(body.monitor)
    if (!bcv || !monitor) {
      return NextResponse.json({ error: 'BCV y Monitor son requeridos' }, { status: 400 })
    }
    // Buscar si ya existe la fecha, si sí actualizar, si no agregar
    const existingRow = await findRowByValue('Tasas', 0, fecha) // columna A = 0
    if (existingRow) {
      await updateCell('Tasas', `B${existingRow}`, bcv)
      await updateCell('Tasas', `C${existingRow}`, monitor)
    } else {
      await appendRow('Tasas', [fecha, bcv, monitor])
    }
    return NextResponse.json({ tasa: { fecha, bcv, monitor } })
  } catch (e) {
    return NextResponse.json({ error: 'Error: ' + (e as Error).message }, { status: 500 })
  }
}
