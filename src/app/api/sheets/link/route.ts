import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth'
import { isDemoMode } from '@/lib/google-sheets'

// GET /api/sheets/link
// Devuelve el link al Google Sheet completo y al rango de la hoja VENTAS
export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const user = await verifySessionToken(token)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  if (isDemoMode()) {
    return NextResponse.json({
      sheetUrl: null,
      demoMode: true,
      user: { name: user.name, role: user.role },
    })
  }
  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!sheetId) {
    return NextResponse.json({ error: 'GOOGLE_SHEET_ID no configurado' }, { status: 500 })
  }
  return NextResponse.json({
    sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
    ventasUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=0`,
    user: { name: user.name, role: user.role },
  })
}
