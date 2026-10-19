'use client'

import { useEffect, useState } from 'react'
import { LoginForm } from '@/components/login-form'
import { Dashboard } from '@/components/dashboard'

interface User {
  id: string
  username: string
  name: string
  role: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(d => { setUser(d.user ?? null) })
      .finally(() => setChecking(false))
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <div className="text-emerald-700 animate-pulse">Cargando...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm onLogin={(u) => setUser(u as User)} />
  }

  return <Dashboard user={user} onLogout={() => setUser(null)} />
}
