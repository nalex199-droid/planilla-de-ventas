import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readRange, appendRow } from '@/lib/google-sheets'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth'

async function requireUser() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

// GET /api/gastos?fecha=YYYY-MM-DD
export async function GET(req: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const fechaParam = searchParams.get('fecha')

  const rows = await readRange('Gastos', 'A:I')
  if (rows.length <= 1) return NextResponse.json({ gastos: [] })

  const headers = rows[0] as string[]
  const gastos = rows.slice(1)
    .filter(r => r[0])
    .map((r, idx) => {
      const obj: Record<string, string | number> = { _row: idx + 2, id: `row_${idx + 2}` }
      headers.forEach((h, i) => {
        const val = r[i] ?? ''
        if (val && !isNaN(Number(val)) && val.trim() !== '') {
          obj[h] = Number(val)
        } else {
          obj[h] = val
        }
      })
      return obj
    })
    .filter(g => {
      if (fechaParam && g.fecha !== fechaParam) return false
      return true
    })

  return NextResponse.json({ gastos })
}

// POST /api/gastos
export async function POST(req: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const body = await req.json()
    const fecha = body.fecha ?? new Date().toISOString().slice(0, 10)
    const hora = new Date().toISOString().slice(11, 19)
    const concepto = String(body.concepto ?? '')
    const modalidad = String(body.modalidad ?? 'efectivo_bs')
    const montoBs = Number(body.montoBs ?? 0)
    const montoUsd = Number(body.montoUsd ?? 0)
    const tasaUsdBs = Number(body.tasaUsdBs ?? 0)

    if (!concepto) {
      return NextResponse.json({ error: 'Concepto es requerido' }, { status: 400 })
    }

    // Si montoUsd viene dado y montoBs no, convertir
    let montoBsFinal = montoBs
    let montoUsdFinal = montoUsd
    if (montoBs > 0 && montoUsd === 0 && tasaUsdBs > 0) {
      montoUsdFinal = montoBs / tasaUsdBs
    } else if (montoUsd > 0 && montoBs === 0 && tasaUsdBs > 0) {
      montoBsFinal = montoUsd * tasaUsdBs
    }

    const values = [
      fecha, hora, user.id,
      concepto, modalidad,
      montoBsFinal, montoUsdFinal, tasaUsdBs,
      body.asesor ?? user.name,
    ]

    const rowNum = await appendRow('Gastos', values)

    return NextResponse.json({
      gasto: {
        id: `row_${rowNum}`,
        fecha, hora,
        concepto, modalidad,
        montoBs: montoBsFinal, montoUsd: montoUsdFinal,
        tasaUsdBs,
        asesor: body.asesor ?? user.name,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Error al crear gasto: ' + (e as Error).message }, { status: 500 })
  }
}

// DELETE /api/gastos?id=row_NNN
export async function DELETE(req: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const match = String(id).match(/^row_(\d+)$/)
  if (!match) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const rowIndex = parseInt(match[1], 10)
  const { deleteRow } = await import('@/lib/google-sheets')
  await deleteRow('Gastos', rowIndex)
  return NextResponse.json({ ok: true })
}
