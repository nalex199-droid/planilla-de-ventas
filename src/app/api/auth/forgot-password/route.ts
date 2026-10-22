import { NextResponse } from 'next/server'
import { readRange, appendRow, deleteRow, findRowByValue } from '@/lib/google-sheets'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// Tiempo de expiración del token (1 hora)
const TOKEN_EXPIRES_MS = 60 * 60 * 1000

/**
 * POST /api/auth/forgot-password
 * Body: { usernameOrEmail: "admin" | "user@email.com" }
 * 
 * Genera un token de recuperación y:
 * - Si RESEND_API_KEY está configurado → envía email con el link
 * - Si no → devuelve el link directamente (modo demo)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const input = String(body.usernameOrEmail ?? '').toLowerCase().trim()

    if (!input) {
      return NextResponse.json({ error: 'Ingresa tu usuario o email' }, { status: 400 })
    }

    // Buscar usuario por username o email
    const rows = await readRange('Usuarios', 'A:E')
    if (rows.length <= 1) {
      return NextResponse.json({ error: 'No hay usuarios registrados' }, { status: 500 })
    }

    const user = rows.slice(1).find(r => {
      const username = (r[0] ?? '').toLowerCase()
      const email = (r[4] ?? '').toLowerCase()  // col E = email
      return username === input || email === input
    })

    if (!user) {
      // Por seguridad, no revelar si el usuario existe o no
      return NextResponse.json({
        ok: true,
        message: 'Si el usuario existe, se envió un enlace de recuperación. Revisa tu correo.',
      })
    }

    const [username, _pwd, name, role, email] = user
    if (!email) {
      // El usuario no tiene email configurado
      return NextResponse.json({
        ok: false,
        error: `El usuario "${username}" no tiene un email configurado. Contacta al administrador para configurar tu email.`,
      }, { status: 400 })
    }

    // Generar token único
    const token = crypto.randomBytes(32).toString('hex')
    const now = Date.now()
    const expiresAt = now + TOKEN_EXPIRES_MS

    // Guardar token en la hoja "Tokens"
    // Primero, eliminar tokens anteriores del mismo usuario (cleanup)
    // (lo omitimos por simplicidad - solo se guardan, se limpian al leer)

    await appendRow('Tokens', [token, username, now, expiresAt])

    // Construir URL de reset
    const host = req.headers.get('origin') ?? 'https://planilla-de-ventas.vercel.app'
    const resetUrl = `${host}/?reset=${token}`

    // Obtener el API key de Resend:
    // 1. Primero de variable de entorno (RESEND_API_KEY)
    // 2. Si no, leer del Google Sheet "Configuracion"
    let resendKey = process.env.RESEND_API_KEY
    let resendFromEmail = process.env.RESEND_FROM_EMAIL

    if (!resendKey) {
      // Leer desde el Sheet
      try {
        const configRows = await readRange('Configuracion', 'A2:B100')
        for (const r of configRows) {
          if (r[0] === 'RESEND_API_KEY') resendKey = String(r[1] ?? '')
          if (r[0] === 'RESEND_FROM_EMAIL') resendFromEmail = String(r[1] ?? '')
        }
        console.log('[forgot-password] RESEND_API_KEY leída del Sheet:', resendKey ? '✓ presente' : '✗ no encontrada')
      } catch (e) {
        console.error('[forgot-password] Error leyendo configuración:', e)
      }
    }

    if (resendKey) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(resendKey)

        const fromEmail = resendFromEmail ?? 'Plantilla de Ventas <onboarding@resend.dev>'

        const { error } = await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: 'Recuperación de contraseña - Plantilla de Ventas',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #047857;">Recuperación de contraseña</h1>
              <p>Hola <b>${name}</b>,</p>
              <p>Solicitaste recuperar tu contraseña en Plantilla de Ventas.</p>
              <p>Haz click en el siguiente botón para restablecer tu contraseña:</p>
              <p style="margin: 24px 0;">
                <a href="${resetUrl}" style="background: #047857; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">
                  Restablecer contraseña
                </a>
              </p>
              <p>O copia y pega esta URL en tu navegador:</p>
              <p style="word-break: break-all; font-family: monospace; background: #f3f4f6; padding: 8px; border-radius: 4px;">${resetUrl}</p>
              <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
                Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este correo.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #6b7280; font-size: 12px;">Plantilla de Ventas</p>
            </div>
          `,
        })

        if (error) {
          console.error('[forgot-password] Error enviando email:', error)
          return NextResponse.json({
            ok: true,
            message: `Se generó un enlace pero el email no se pudo enviar. Contacta al admin.`,
            errorDetail: error.message,
            resetUrl, // devolver como fallback
          })
        }

        return NextResponse.json({
          ok: true,
          message: `✅ Email enviado a ${email}. Revisa tu correo (incluyendo spam) para restablecer tu contraseña.`,
          resetUrl, // también devolver el link como respaldo
        })
      } catch (e: any) {
        console.error('[forgot-password] Error con Resend:', e)
        return NextResponse.json({
          ok: true,
          message: `No se pudo enviar el email automáticamente. Error: ${e.message}`,
          resetUrl, // devolver como fallback
        })
      }
    }

    // Sin API key → modo demo (link directo)
    return NextResponse.json({
      ok: true,
      message: 'Modo demo: el email no se envió porque no está configurado RESEND_API_KEY.',
      resetUrl,
    })
  } catch (e: any) {
    console.error('Forgot password error:', e)
    return NextResponse.json({ error: 'Error: ' + e.message }, { status: 500 })
  }
}
