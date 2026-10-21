"use client"

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ExternalLink, Table2, Settings, FileSpreadsheet, FileText, Download, RefreshCw, Zap } from 'lucide-react'

interface Props {
  fecha: string
  user: { name: string; role: string }
  onSavedTasa: () => void
}

export function PanelAdmin({ fecha, user, onSavedTasa }: Props) {
  const { toast } = useToast()
  const [bcv, setBcv] = useState('')
  const [monitor, setMonitor] = useState('')
  const [sheetUrl, setSheetUrl] = useState<string | null>(null)
  const [demoMode, setDemoMode] = useState(false)
  const [loadingLink, setLoadingLink] = useState(true)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [autoUpdating, setAutoUpdating] = useState(false)

  useEffect(() => {
    fetch('/api/sheets/link')
      .then(r => r.json())
      .then(d => {
        if (d.sheetUrl) setSheetUrl(d.sheetUrl)
        if (d.demoMode) setDemoMode(true)
      })
      .catch(() => {})
      .finally(() => setLoadingLink(false))
  }, [])

  async function guardarTasa(e: React.FormEvent) {
    e.preventDefault()
    if (!bcv || !monitor) {
      toast({ title: 'Faltan datos', description: 'BCV y Monitor son requeridos', variant: 'destructive' })
      return
    }
    const res = await fetch('/api/tasas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, bcv: Number(bcv), monitor: Number(monitor) }),
    })
    const data = await res.json()
    if (res.ok) {
      toast({ title: 'Tasa guardada', description: `BCV: ${data.tasa.bcv} · Monitor: ${data.tasa.monitor}` })
      onSavedTasa()
    } else {
      toast({ title: 'Error', description: data.error, variant: 'destructive' })
    }
  }

  async function autoActualizarTasa() {
    setAutoUpdating(true)
    try {
      const res = await fetch(`/api/tasas/bcv?fecha=${fecha}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast({
          title: '✅ Tasa actualizada automáticamente',
          description: data.message ?? `BCV: ${data.tasa.bcv} · Monitor: ${data.tasa.monitor}`,
        })
        // Actualizar los inputs con las nuevas tasas
        if (data.tasa.bcv) setBcv(String(data.tasa.bcv))
        if (data.tasa.monitor) setMonitor(String(data.tasa.monitor))
        onSavedTasa()
      } else {
        toast({
          title: '⚠ No se pudo actualizar automáticamente',
          description: data.error ?? 'Error desconocido',
          variant: 'destructive',
        })
      }
    } catch (err) {
      toast({
        title: 'Error de red',
        description: String(err),
        variant: 'destructive',
      })
    } finally {
      setAutoUpdating(false)
    }
  }

  async function soloConsultarBcv() {
    setAutoUpdating(true)
    try {
      const res = await fetch('/api/tasas/bcv')
      const data = await res.json()
      if (res.ok) {
        if (data.bcv) setBcv(String(data.bcv))
        if (data.monitor) setMonitor(String(data.monitor))
        toast({
          title: 'Tasa obtenida del BCV',
          description: `BCV: ${data.bcv ?? 'no disponible'} · Monitor: ${data.monitor ?? 'no disponible'}`,
        })
      } else {
        toast({
          title: 'No se pudo obtener',
          description: data.error ?? 'Error desconocido',
          variant: 'destructive',
        })
      }
    } catch (err) {
      toast({
        title: 'Error de red',
        description: String(err),
        variant: 'destructive',
      })
    } finally {
      setAutoUpdating(false)
    }
  }

  async function descargarReporte(formato: 'excel' | 'pdf') {
    const setter = formato === 'excel' ? setExportingExcel : setExportingPdf
    setter(true)
    try {
      const res = await fetch(`/api/reportes/${formato}?fecha=${fecha}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Error', description: err.error || 'No se pudo descargar', variant: 'destructive' })
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Reporte_Ventas_${fecha}.${formato === 'excel' ? 'xlsx' : 'pdf'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({
        title: `${formato === 'excel' ? 'Excel' : 'PDF'} descargado`,
        description: `Reporte del día ${fecha} con ventas, gastos y resumen financiero.`
      })
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setter(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Descarga de reportes */}
      <Card className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-emerald-700 flex items-center gap-2">
              <FileText className="w-5 h-5" /> Descargar Reporte del Día
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Genera un reporte completo del día <b>{fecha}</b> con:
              <br/>• Resumen general (ventas, gastos, comisiones, neto)
              <br/>• Detalle por asesor
              <br/>• Listado completo de ventas del día
              <br/>• Listado completo de gastos del día (incluye Abonos a Proveedores)
            </p>
          </div>
          <div className="flex flex-col gap-2 min-w-[180px]">
            <Button onClick={() => descargarReporte('excel')} disabled={exportingExcel} className="bg-emerald-600 hover:bg-emerald-700" size="lg">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              {exportingExcel ? 'Generando Excel...' : 'Descargar Excel (.xlsx)'}
            </Button>
            <Button onClick={() => descargarReporte('pdf')} disabled={exportingPdf} className="bg-rose-600 hover:bg-rose-700" size="lg">
              <FileText className="w-4 h-4 mr-2" />
              {exportingPdf ? 'Generando PDF...' : 'Descargar PDF'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Google Sheet en vivo */}
      <Card className="p-6 bg-gradient-to-br from-sky-50 to-emerald-50 border-sky-200">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-sky-700 flex items-center gap-2">
              <Table2 className="w-5 h-5" /> Google Sheet en vivo
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Las ventas y gastos del día se escriben en tiempo real en el Google Sheet compartido.
              Abre el Sheet en una pestaña nueva para ver todo en vivo.
            </p>
          </div>
          <div className="flex flex-col gap-2 min-w-[180px]">
            {sheetUrl ? (
              <Button asChild className="bg-sky-600 hover:bg-sky-700" size="lg">
                <a href={sheetUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Google Sheet
                </a>
              </Button>
            ) : demoMode ? (
              <div className="text-xs bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800">
                <b>Modo demo activo</b><br/>
                Las ventas se guardan en memoria. Para conectar Google Sheet real, sigue las instrucciones del README.
              </div>
            ) : (
              <Button disabled size="lg">
                {loadingLink ? 'Cargando...' : 'No disponible'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {user.role === 'admin' ? (
        <Card className="p-6">
          <h3 className="text-base font-bold text-emerald-700 mb-1 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Configurar Tasa de Cambio del Día
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Solo el administrador puede actualizar las tasas. Estas tasas alimentan las fórmulas del Google Sheet
            y los cálculos automáticos del reporte.
          </p>

          {/* Botón de auto-actualización */}
          <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-md">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" /> Auto-actualización
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Obtiene la tasa automáticamente desde el sitio web del BCV (https://www.bcv.org.ve/) y de Monitor (monitor.net.ve).
                  Guarda la tasa para hoy en el Google Sheet.
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={soloConsultarBcv} disabled={autoUpdating} variant="outline" size="sm">
                  <RefreshCw className={`w-4 h-4 mr-2 ${autoUpdating ? 'animate-spin' : ''}`} />
                  {autoUpdating ? 'Consultando...' : 'Solo consultar BCV'}
                </Button>
                <Button onClick={autoActualizarTasa} disabled={autoUpdating} className="bg-emerald-600 hover:bg-emerald-700" size="sm">
                  <Zap className="w-4 h-4 mr-2" />
                  {autoUpdating ? 'Actualizando...' : 'Actualizar y guardar automáticamente'}
                </Button>
              </div>
            </div>
          </div>

          <form onSubmit={guardarTasa} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="bcv">Tasa BCV (oficial)</Label>
              <Input id="bcv" type="number" step="any" value={bcv} onChange={e => setBcv(e.target.value)} placeholder="876.79" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="monitor">Tasa Monitor (paralelo)</Label>
              <Input id="monitor" type="number" step="any" value={monitor} onChange={e => setMonitor(e.target.value)} placeholder="1015" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
                Guardar Manual para {fecha}
              </Button>
            </div>
          </form>
          <div className="mt-4 flex gap-2 flex-wrap">
            <Badge variant="outline" className="bg-emerald-50">Usuario: {user.name}</Badge>
            <Badge variant="outline" className="bg-amber-50">Rol: {user.role}</Badge>
            <Badge variant="outline" className="bg-rose-50">Permiso: editar tasas</Badge>
          </div>
        </Card>
      ) : (
        <Card className="p-5 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-800">
            <b>Nota:</b> Solo el administrador puede cambiar las tasas de cambio. Como asesor, puedes descargar reportes
            y abrir el Google Sheet.
          </p>
        </Card>
      )}
    </div>
  )
}
