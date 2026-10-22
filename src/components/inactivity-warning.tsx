"use client"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Clock, LogOut } from 'lucide-react'

interface Props {
  open: boolean
  remainingSeconds: number
  onContinue: () => void
  onLogout: () => void
}

export function InactivityWarning({ open, remainingSeconds, onContinue, onLogout }: Props) {
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            Tu sesión está por cerrarse
          </AlertDialogTitle>
          <AlertDialogDescription>
            Por inactividad, tu sesión se cerrará automáticamente en{' '}
            <b className="text-amber-700 text-base font-mono">{timeStr}</b>.
            <br/>
            <br/>
            ¿Quieres seguir trabajando? Has click en "Continuar" para mantener tu sesión activa.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onLogout}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar sesión ahora
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onContinue}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Continuar trabajando
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
