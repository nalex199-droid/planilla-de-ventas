import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth'

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ user: null })
  const user = await verifySessionToken(token)
  return NextResponse.json({ user })
}
