"use client"

import { useEffect, useState } from 'react'
import { LoginForm } from '@/components/login-form'
import { Dashboard } from '@/components/dashboard'
import { ResetPasswordForm } from '@/components/reset-password-form'
import { InactivityWarning } from '@/components/inactivity-warning'
import { useInactivityTimer } from '@/hooks/use-inactivity-timer'

interface User {
  id: string
  username: string
  name: string
  role: string
}

const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutos
const INACTIVITY_WARNING = 5 * 60 * 1000 // advertir 5 min antes

/**
 * AppContent se renderiza completamente en el cliente.
 * Esto evita errores de hydration causados por extensiones del navegador.
 * 
 * Maneja:
 * - Sesión activa (login/dashboard)
 * - Recuperación de contraseña via URL (?reset=token)
 * - Auto-logout por inactividad (30 min)
 */
export function AppContent() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [resetToken, setResetToken] = useState<string | null>(null)

  // Función para cerrar sesión
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    setUser(null)
  }

  // Hook de inactividad — solo se activa cuando hay sesión iniciada
  const { showWarning, remainingSeconds, continueSession } = useInactivityTimer({
    timeoutMs: INACTIVITY_TIMEOUT,
    warningMs: INACTIVITY_WARNING,
    onTimeout: logout,
  })

  useEffect(() => {
    setMounted(true)

    // Detectar token de reseteo en la URL
    const urlParams = new URLSearchParams(window.location.search)
    const resetParam = urlParams.get('reset')
    if (resetParam) {
      setResetToken(resetParam)
      setChecking(false)
      return
    }

    // Verificar sesión existente
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(d => { setUser(d.user ?? null) })
      .catch(() => setUser(null))
      .finally(() => setChecking(false))
  }, [])

  // Mientras no esté montado en el cliente, mostrar placeholder
  if (!mounted || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-full mb-3 shadow-lg animate-pulse">
            <span className="text-3xl text-white font-bold">PV</span>
          </div>
          <div className="text-emerald-700 font-medium">Cargando Plantilla de Ventas...</div>
        </div>
      </div>
    )
  }

  // Modo recuperación de contraseña
  if (resetToken) {
    return (
      <ResetPasswordForm
        token={resetToken}
        onDone={() => {
          // Limpiar URL y volver al login
          window.history.replaceState({}, '', '/')
          setResetToken(null)
        }}
      />
    )
  }

  if (!user) {
    return <LoginForm onLogin={(u) => setUser(u as User)} />
  }

  return (
    <>
      <Dashboard user={user} onLogout={() => setUser(null)} />
      <InactivityWarning
        open={showWarning}
        remainingSeconds={remainingSeconds}
        onContinue={continueSession}
        onLogout={logout}
      />
    </>
  )
}
