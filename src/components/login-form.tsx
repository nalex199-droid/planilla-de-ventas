"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Mail, KeyRound } from 'lucide-react'

export function LoginForm({ onLogin }: { onLogin: (user: { id: string; username: string; name: string; role: string }) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Estado del modal de recuperación
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotUsername, setForgotUsername] = useState('')
  const [forgotSending, setForgotSending] = useState(false)
  const [forgotResult, setForgotResult] = useState<{ ok: boolean; message: string; resetUrl?: string; expiresStr?: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) {
      toast({ title: 'Campos requeridos', description: 'Ingresa usuario y contraseña', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'Credenciales inválidas', variant: 'destructive' })
      } else {
        toast({ title: 'Bienvenido', description: `Hola ${data.user.name}` })
        onLogin(data.user)
      }
    } catch (err) {
      toast({ title: 'Error de red', description: String(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function enviarRecuperacion() {
    if (!forgotUsername.trim()) {
      toast({ title: 'Ingresa tu usuario o email', variant: 'destructive' })
      return
    }
    setForgotSending(true)
    setForgotResult(null)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: forgotUsername.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (res.ok) {
        setForgotResult({
          ok: true,
          message: data.message ?? 'Solicitud procesada',
          resetUrl: data.resetUrl,
          expiresStr: data.expiresStr,
        })
      } else {
        setForgotResult({
          ok: false,
          message: data.error ?? 'Error',
        })
      }
    } catch (err) {
      setForgotResult({ ok: false, message: String(err) })
    } finally {
      setForgotSending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-emerald-100 to-teal-100 p-4">
      <Card className="w-full max-w-md p-8 shadow-2xl border-emerald-200">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-full mb-3 shadow-lg">
            <span className="text-3xl text-white font-bold">PV</span>
          </div>
          <h1 className="text-2xl font-bold text-emerald-800">Plantilla de Ventas</h1>
          <p className="text-sm text-muted-foreground mt-1">Sistema integral de registro y reporte</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Usuario</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin, roxi, milagros, diego"
              autoComplete="username"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </Button>
        </form>

        {/* Link de recuperación */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => { setForgotOpen(true); setForgotResult(null); setForgotUsername('') }}
            className="text-sm text-emerald-700 hover:text-emerald-900 hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <p className="text-xs font-semibold text-emerald-700 mb-2">Cuentas de prueba:</p>
          <ul className="text-xs text-emerald-600 space-y-1">
            <li><b>admin / admin123</b> — Administrador (configura tasas)</li>
            <li><b>roxi / roxi123</b> — Asesora ROXI</li>
            <li><b>milagros / mila123</b> — Asesora MILAGROS</li>
            <li><b>diego / diego123</b> — Asesor DIEGO</li>
          </ul>
        </div>
      </Card>

      {/* Modal de recuperación de contraseña */}
      <AlertDialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-emerald-700" />
              Recuperar contraseña
            </AlertDialogTitle>
            <AlertDialogDescription>
              {!forgotResult && (
                <>
                  Ingresa tu <b>usuario</b> o <b>email</b> registrado. Te enviaremos
                  un enlace para restablecer tu contraseña.
                  <br/>
                  <br/>
                  <Input
                    placeholder="ej: admin o tu@email.com"
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    disabled={forgotSending}
                    className="mt-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        enviarRecuperacion()
                      }
                    }}
                  />
                </>
              )}
              {forgotResult && (
                <div className="space-y-3">
                  <p className={forgotResult.ok ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>
                    {forgotResult.message}
                  </p>
                  {forgotResult.expiresStr && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
                      ⏰ <b>Por seguridad, el link expira en 10 minutos</b>
                      <br/>
                      Vence el: <b>{forgotResult.expiresStr}</b> (hora de Venezuela)
                    </div>
                  )}
                  {forgotResult.resetUrl && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                      <p className="text-xs font-semibold text-emerald-800 mb-2">
                        🔗 Link de recuperación (ábrelo si no recibiste el correo):
                      </p>
                      <div className="flex gap-2 mb-2">
                        <Input
                          readOnly
                          value={forgotResult.resetUrl}
                          className="font-mono text-xs"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(forgotResult.resetUrl ?? '')
                            toast({ title: 'Link copiado' })
                          }}
                        >
                          Copiar
                        </Button>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => {
                          if (forgotResult.resetUrl) window.location.href = forgotResult.resetUrl
                        }}
                      >
                        Abrir link ahora
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {!forgotResult ? (
              <>
                <Button variant="outline" onClick={() => setForgotOpen(false)} disabled={forgotSending}>
                  Cancelar
                </Button>
                <Button
                  onClick={enviarRecuperacion}
                  disabled={forgotSending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {forgotSending ? 'Enviando...' : 'Enviar enlace'}
                </Button>
              </>
            ) : (
              <AlertDialogAction onClick={() => setForgotOpen(false)} className="bg-emerald-600 hover:bg-emerald-700">
                Cerrar
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
