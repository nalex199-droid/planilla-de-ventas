import { NextResponse } from 'next/server'
import { readRange, appendRow, updateCell, findRowByValue, deleteRow } from '@/lib/google-sheets'
import bcrypt from 'bcryptjs'

/**
 * POST /api/auth/reset-password
 * Body: { token: "abc...", newPassword: "..." }
 *
 * Valida el token (debe existir en la hoja Tokens y no estar expirado)
 * Si es válido, actualiza la contraseña del usuario en la hoja Usuarios.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const token = String(body.token ?? '').trim()
    const newPassword = String(body.newPassword ?? '')

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
    }
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    // Buscar el token en la hoja Tokens
    // Headers: token | username | createdAt | expiresAt
    const tokensRows = await readRange('Tokens', 'A:D')
    if (tokensRows.length <= 1) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 400 })
    }

    const tokenRow = tokensRows.slice(1).find(r => r[0] === token)
    if (!tokenRow) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 400 })
    }

    const [_token, username, _createdAt, expiresAtStr] = tokenRow
    const expiresAt = Number(expiresAtStr)
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return NextResponse.json({ error: 'Token expirado. Solicita uno nuevo.' }, { status: 400 })
    }

    // Buscar el usuario en la hoja Usuarios
    const usersRows = await readRange('Usuarios', 'A:E')
    if (usersRows.length <= 1) {
      return NextResponse.json({ error: 'No hay usuarios registrados' }, { status: 500 })
    }

    // Encontrar la fila del usuario (la fila 2 es la primera de datos, así que row_index en Sheet = i+1+1)
    let userRowIndex: number | null = null
    for (let i = 1; i < usersRows.length; i++) {
      if ((usersRows[i][0] ?? '').toLowerCase() === (username ?? '').toLowerCase()) {
        userRowIndex = i + 1  // +1 porque en Sheets la fila 1 es el header
        break
      }
    }

    if (!userRowIndex) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 400 })
    }

    // Generar nuevo hash
    const newHash = await bcrypt.hash(newPassword, 10)

    // Actualizar la celda de password_hash en la hoja Usuarios
    // La columna B (índice 2) tiene el password_hash
    await updateCell('Usuarios', `B${userRowIndex}`, newHash)

    // Eliminar el token usado (cleanup)
    // Buscar la fila del token en la hoja Tokens
    const tokensRowsAfter = await readRange('Tokens', 'A:D')
    let tokenRowIndex: number | null = null
    for (let i = 1; i < tokensRowsAfter.length; i++) {
      if (tokensRowsAfter[i][0] === token) {
        tokenRowIndex = i + 1
        break
      }
    }
    if (tokenRowIndex) {
      try {
        await deleteRow('Tokens', tokenRowIndex)
      } catch (e) {
        console.error('No se pudo eliminar el token usado:', e)
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Contraseña actualizada correctamente. Ahora puedes iniciar sesión con tu nueva contraseña.',
      username,
    })
  } catch (e: any) {
    console.error('Reset password error:', e)
    return NextResponse.json({ error: 'Error: ' + e.message }, { status: 500 })
  }
}
