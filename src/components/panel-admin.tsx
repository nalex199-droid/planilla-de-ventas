"use client"

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ExternalLink, Table2, Settings } from 'lucide-react'

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

  return (
    <div className="space-y-5">
      <Card className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-emerald-700 flex items-center gap-2">
              <Table2 className="w-5 h-5" /> Google Sheet en vivo
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Las ventas del día <b>{fecha}</b> se escriben en tiempo real en el Google Sheet compartido.
              Las hojas <b>VENTAS</b>, <b>REPORTE</b>, <b>TOTALES</b> y <b>CxC</b> se actualizan automáticamente
              a través de fórmulas cruzadas. Abre el Sheet en una pestaña nueva para ver todo en vivo.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {sheetUrl ? (
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700" size="lg">
                <a href={sheetUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Google Sheet
                </a>
              </Button>
            ) : demoMode ? (
              <div className="text-xs bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800 max-w-xs">
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
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-white border border-emerald-200 rounded-md p-3">
            <div className="text-xs text-muted-foreground uppercase">Hoja principal</div>
            <div className="font-mono text-xs">Ventas (fila 2+)</div>
          </div>
          <div className="bg-white border border-emerald-200 rounded-md p-3">
            <div className="text-xs text-muted-foreground uppercase">Reporte cruzado</div>
            <div className="font-mono text-xs">REPORTE · TOTALES · CxC</div>
          </div>
          <div className="bg-white border border-emerald-200 rounded-md p-3">
            <div className="text-xs text-muted-foreground uppercase">Datos en vivo</div>
            <div className="font-mono text-xs">{demoMode ? 'Modo demo (memoria)' : 'Sincronización en tiempo real'}</div>
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
            (celdas B2=BCV y B3=Monitor de la hoja VENTAS).
          </p>
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
                Guardar Tasa para {fecha}
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
            <b>Nota:</b> Solo el administrador puede cambiar las tasas de cambio. Como asesor, puedes abrir el Google Sheet
            para ver el reporte cruzado en vivo.
          </p>
        </Card>
      )}
    </div>
  )
}
