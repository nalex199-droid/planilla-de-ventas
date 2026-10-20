/**
 * Utilidad de autenticación con cookies firmadas (JWT simple).
 * Sesión del lado servidor — sin dependencias externas.
 */
import bcrypt from 'bcryptjs'

const SESSION_COOKIE = 'pv_session'
const SECRET = process.env.AUTH_SECRET || 'plantilla-ventas-secret-key-2026-zai'

export interface SessionUser {
  id: string
  username: string
  name: string
  role: 'admin' | 'asesor'
}

// JWT sencillo: base64(header).base64(payload).hmac
async function hmac(data: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return Buffer.from(new Uint8Array(sig)).toString('base64')
}

function base64Encode(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64')
}

function base64Decode<T>(s: string): T | null {
  try {
    return JSON.parse(Buffer.from(s, 'base64').toString('utf-8')) as T
  } catch {
    return null
  }
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const payload = {
    ...user,
    iat: Date.now(),
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 días
  }
  const body = base64Encode(payload)
  const sig = await hmac(body)
  return `${body}.${sig}`
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = await hmac(body)
  if (sig !== expected) return null
  const payload = base64Decode<{ exp: number } & SessionUser>(body)
  if (!payload) return null
  if (Date.now() > payload.exp) return null
  return {
    id: payload.id,
    username: payload.username,
    name: payload.name,
    role: payload.role as 'admin' | 'asesor',
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE

export async function hashPassword(p: string): Promise<string> {
  return bcrypt.hash(p, 10)
}

export async function comparePassword(p: string, hash: string): Promise<boolean> {
  return bcrypt.compare(p, hash)
}
