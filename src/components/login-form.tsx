"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export function LoginForm({ onLogin }: { onLogin: (user: { id: string; username: string; name: string; role: string }) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

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
    </div>
  )
}
