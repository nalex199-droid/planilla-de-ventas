'use client'

import dynamic from 'next/dynamic'

// Cargar el contenido solo en el cliente (ssr: false).
// Esto evita por completo los errores de hydration causados por
// extensiones del navegador (Google Translate, Grammarly, LastPass, etc.)
// que modifican el DOM durante la carga.
const AppContent = dynamic(() => import('@/components/app-content').then(m => m.AppContent), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-full mb-3 shadow-lg animate-pulse">
          <span className="text-3xl text-white font-bold">PV</span>
        </div>
        <div className="text-emerald-700 font-medium">Cargando Plantilla de Ventas...</div>
      </div>
    </div>
  ),
})

export default function Home() {
  return <AppContent />
}
