"use client"

import { useEffect, useState } from 'react'
import { LoginForm } from '@/components/login-form'
import { Dashboard } from '@/components/dashboard'

interface User {
  id: string
  username: string
  name: string
  role: string
}

/**
 * AppContent se renderiza completamente en el cliente.
 * Esto evita errores de hydration causados por extensiones del navegador
 * (Google Translate, Grammarly, LastPass, etc.) que modifican el DOM.
 */
export function AppContent() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Esperar a que el componente esté montado en el cliente antes de hacer nada.
  // Esto previene cualquier hydration mismatch.
  useEffect(() => {
    setMounted(true)
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(d => { setUser(d.user ?? null) })
      .catch(() => setUser(null))
      .finally(() => setChecking(false))
  }, [])

  // Mientras no esté montado en el cliente, mostrar placeholder.
  // El servidor y el cliente renderizan exactamente lo mismo → no hay hydration mismatch.
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

  if (!user) {
    return <LoginForm onLogin={(u) => setUser(u as User)} />
  }

  return <Dashboard user={user} onLogout={() => setUser(null)} />
}
