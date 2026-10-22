import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { readRange } from '@/lib/google-sheets'
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña son requeridos' }, { status: 400 })
    }
    // Leer la hoja Usuarios (todas las filas)
    const rows = await readRange('Usuarios', 'A:E')
    // Saltar encabezado (fila 1)
    // Headers: username, password_hash, name, role, email
    const user = rows.slice(1).find(r => r[0]?.toLowerCase() === String(username).toLowerCase().trim())
    if (!user) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }
    const [usernameDB, passwordHash, name, role] = user
    if (!(await bcrypt.compare(password, passwordHash))) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }
    // Generar un ID pseudoaleatorio basado en username (no necesitamos ID real en Sheets)
    const id = `u_${usernameDB}`
    const token = await createSessionToken({
      id,
      username: usernameDB,
      name,
      role: role as 'admin' | 'asesor',
    })
    const res = NextResponse.json({
      user: { id, username: usernameDB, name, role },
    })
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  } catch (e) {
    return NextResponse.json({ error: 'Error del servidor: ' + (e as Error).message }, { status: 500 })
  }
}
