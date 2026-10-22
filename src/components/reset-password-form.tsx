"use client"

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { KeyRound, Check } from 'lucide-react'

interface Props {
  token: string
  onDone: () => void
}

export function ResetPasswordForm({ token, onDone }: Props) {
  const { toast } = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!password || password.length < 6) {
      toast({ title: 'Contraseña muy corta', description: 'Mínimo 6 caracteres', variant: 'destructive' })
      return
    }
    if (password !== confirm) {
      toast({ title: 'Las contraseñas no coinciden', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: '✅ Contraseña actualizada', description: 'Ahora puedes iniciar sesión con tu nueva contraseña' })
        setDone(true)
        setTimeout(() => onDone(), 2500)
      } else {
        toast({ title: 'Error', description: data.error ?? 'No se pudo resetear', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error de red', description: String(err), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-emerald-100 to-teal-100 p-4">
      <Card className="w-full max-w-md p-8 shadow-2xl border-emerald-200">
        {done ? (
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-full mb-4 shadow-lg">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-emerald-800 mb-2">¡Contraseña actualizada!</h2>
            <p className="text-sm text-muted-foreground">
              Redirigiendo al login para que entres con tu nueva contraseña...
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-full mb-3 shadow-lg">
                <KeyRound className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-emerald-800">Nueva contraseña</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Ingresa tu nueva contraseña para continuar
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva contraseña *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  disabled={saving}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar contraseña *</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  autoComplete="new-password"
                  disabled={saving}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={saving}>
                {saving ? 'Guardando...' : 'Actualizar contraseña'}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  )
}
