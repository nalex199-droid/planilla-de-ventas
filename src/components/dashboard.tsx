"use client"

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Calendar, LogOut, BarChart3, Plus, List, Table2, Settings, Receipt, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { FormVenta } from './form-venta'
import { ListaVentas } from './lista-ventas'
import { DashboardResumen } from './dashboard-resumen'
import { PanelAdmin } from './panel-admin'
import { GastosForm } from './gastos-form'
import { ListaGastos } from './lista-gastos'

interface User {
  id: string
  username: string
  name: string
  role: string
}

interface DashboardData {
  fecha: string
  user: { name: string; role: string }
  tasa: { bcv: number; monitor: number } | null
  totales: {
    count: number
    totalVentaDia: number
    totalMontoBs: number
    totalMontoUsd: number
    totalComisiones: number
  }
  porAsesor: Array<{ asesor: string; count: number; totalVenta: number; comision: number; montoBs: number; montoUsd: number }>
  porModalidad: {
    pagoEfectivoUsd: number
    pagoEfectivoBs: number
    debitoBAmiga: number
    debitoBVZla: number
    bioPago: number
    pm: number
    binance: number
    zelle: number
    vpm: number
  }
  ventas: Array<{
    id: string
    hora: string
    cedula: string | null
    nombre: string | null
    descripcion: string | null
    cantidad: number
    costoUni: number
    neto: number
    totalVenta: number
    montoBs: number
    montoUsd: number
    asesor: string
    pagoEfectivoUsd: number
    pagoEfectivoBs: number
    debitoBAmiga: number
    debitoBVZla: number
    bioPago: number
    pm: number
    binance: number
    zelle: number
    vpm: number
  }>
  gastos?: Array<{
    id: string
    hora: string
    concepto: string
    modalidad: string
    montoBs: number
    montoUsd: number
    asesor: string
  }>
  totalGastosBs?: number
  totalGastosUsd?: number
  netoBs?: number
  netoUsd?: number
}

export function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { toast } = useToast()
  const today = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useState(today)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('resumen')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard?fecha=${fecha}`)
      const d = await res.json()
      if (res.ok) {
        setData(d)
      } else {
        toast({ title: 'Error', description: d.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error de red', description: String(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [fecha, toast])

  useEffect(() => { load() }, [load])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    onLogout()
  }

  function onDelete(id: string) {
    setData(prev => prev ? {
      ...prev,
      ventas: prev.ventas.filter(v => v.id !== id),
      totales: {
        ...prev.totales,
        count: prev.totales.count - 1,
      }
    } : prev)
    load()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-emerald-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold">PV</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-emerald-700 leading-tight">Plantilla de Ventas</h1>
              <p className="text-xs text-muted-foreground leading-tight">Sistema integral · Reporte cruzado</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <Input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="border-0 bg-transparent p-0 w-36 text-sm focus:outline-none focus:ring-0"
              />
            </div>
            <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">
              {user.name} · {user.role}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 mb-6 bg-emerald-50">
            <TabsTrigger value="resumen" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" /> Resumen
            </TabsTrigger>
            <TabsTrigger value="nueva" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Plus className="w-4 h-4 mr-2" /> Nueva Venta
            </TabsTrigger>
            <TabsTrigger value="lista" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <List className="w-4 h-4 mr-2" /> Ventas
            </TabsTrigger>
            <TabsTrigger value="gastos" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white">
              <Receipt className="w-4 h-4 mr-2" /> Gastos
            </TabsTrigger>
            <TabsTrigger value="excel" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" /> Reporte
            </TabsTrigger>
            <TabsTrigger value="admin" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Settings className="w-4 h-4 mr-2" /> Tasas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resumen">
            {loading || !data ? (
              <div className="text-center py-20 text-muted-foreground">Cargando datos...</div>
            ) : (
              <DashboardResumen data={data} />
            )}
          </TabsContent>

          <TabsContent value="nueva">
            <FormVenta user={user} onSaved={() => { setTab('lista'); load() }} />
          </TabsContent>

          <TabsContent value="lista">
            {loading || !data ? (
              <div className="text-center py-20 text-muted-foreground">Cargando ventas...</div>
            ) : (
              <ListaVentas
                ventas={data.ventas}
                onDelete={onDelete}
                canDelete={user.role === 'admin'}
              />
            )}
          </TabsContent>

          <TabsContent value="gastos">
            <div className="space-y-4">
              <GastosForm onSaved={() => load()} />
              {loading || !data ? (
                <div className="text-center py-10 text-muted-foreground">Cargando gastos...</div>
              ) : (
                <ListaGastos
                  gastos={data.gastos ?? []}
                  onDelete={() => load()}
                  canDelete={user.role === 'admin'}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="excel">
            <PanelAdmin fecha={fecha} user={user} onSavedTasa={load} />
          </TabsContent>

          <TabsContent value="admin">
            <PanelAdmin fecha={fecha} user={user} onSavedTasa={load} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-emerald-200 py-3 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-muted-foreground">
          Plantilla de Ventas · Ventas + Gastos + Reportes Excel/PDF · Conectado a Google Sheets
        </div>
      </footer>
    </div>
  )
}
