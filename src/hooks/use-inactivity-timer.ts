"use client"

import { useEffect, useRef, useState, useCallback } from 'react'

interface Options {
  timeoutMs: number        // tiempo total de inactividad antes de logout
  warningMs: number       // mostrar advertencia X ms antes del logout
  onTimeout: () => void   // callback cuando se cumple el timeout
}

/**
 * Hook que rastrea la actividad del usuario y dispara un callback
 * después de un tiempo de inactividad.
 * Muestra advertencia X segundos antes del timeout.
 */
export function useInactivityTimer({ timeoutMs, warningMs, onTimeout }: Options) {
  const [showWarning, setShowWarning] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const lastActivityRef = useRef<number>(Date.now())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Resetear el timer en cualquier actividad del usuario
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
    setShowWarning(false)
  }, [])

  // Escuchar eventos de actividad
  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']

    function handleActivity() {
      resetTimer()
    }

    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }))

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity))
    }
  }, [resetTimer])

  // Verificar cada segundo si se cumplió el timeout o si hay que mostrar advertencia
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const now = Date.now()
      const elapsed = now - lastActivityRef.current
      const remaining = timeoutMs - elapsed

      if (elapsed >= timeoutMs) {
        // Tiempo agotado, logout
        setShowWarning(false)
        if (intervalRef.current) clearInterval(intervalRef.current)
        onTimeout()
        return
      }

      if (remaining <= warningMs) {
        // Mostrar advertencia
        setShowWarning(true)
        setRemainingSeconds(Math.ceil(remaining / 1000))
      } else {
        setShowWarning(false)
      }
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timeoutMs, warningMs, onTimeout])

  // Función para "continuar" la sesión desde la advertencia
  const continueSession = useCallback(() => {
    resetTimer()
  }, [resetTimer])

  return {
    showWarning,
    remainingSeconds,
    continueSession,
    resetTimer,
  }
}
