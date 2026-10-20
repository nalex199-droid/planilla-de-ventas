"use client"

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'

interface TasaInfo { bcv: number; monitor: number }
interface Props {
  user: { name: string; role: string }
  onSaved: () => void
}

const ASESORES = ['ROXI', 'MILAGROS', 'DIEGO']
const TASA_OPTIONS = [
  { value: 'bcv',     label: 'BCV (oficial)' },
  { value: 'monitor', label: 'Monitor (paralelo)' },
]

export function FormVenta({ user, onSaved }: Props) {
  const { toast } = useToast()
  const [tasa, setTasa] = useState<TasaInfo | null>(null)
  const [tasaSel, setTasaSel] = useState<'bcv' | 'monitor'>('monitor')
  const [saving, setSaving] = useState(false)

  // Campos del formulario
  const [cedula, setCedula] = useState('')
  const [nombre, setNombre] = useState('')
  const [celular, setCelular] = useState('')
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [cantidad, setCantidad] = useState<number | ''>('')
  const [costoUni, setCostoUni] = useState<number | ''>('')

  // Modalidades de pago
  const [pagoEfectivoUsd, setPagoEfectivoUsd] = useState<number | ''>('')
  const [pagoEfectivoBs, setPagoEfectivoBs] = useState<number | ''>('')
  const [debitoBAmiga, setDebitoBAmiga] = useState<number | ''>('')
  const [debitoBVZla, setDebitoBVZla] = useState<number | ''>('')
  const [bioPago, setBioPago] = useState<number | ''>('')
  const [pm, setPm] = useState<number | ''>('')
  const [binance, setBinance] = useState<number | ''>('')
  const [zelle, setZelle] = useState<number | ''>('')
  const [vpm, setVpm] = useState<number | ''>('')
  const [asesor, setAsesor] = useState<string>(
    ASESORES.find(a => user.name.toUpperCase().includes(a)) ?? 'ROXI'
  )

  useEffect(() => {
    fetch('/api/tasas')
      .then(r => r.json())
      .then(d => { if (d.tasa) setTasa({ bcv: d.tasa.bcv, monitor: d.tasa.monitor }) })
      .catch(() => {})
  }, [])

  // Tasa efectiva según selección
  const tasaUsdBs = tasa ? (tasaSel === 'bcv' ? tasa.bcv : tasa.monitor) : 0
  const neto = (typeof cantidad === 'number' && typeof costoUni === 'number') ? cantidad * costoUni : 0

  // Cálculos automáticos
  const montoBs = (n(pagoEfectivoBs) + n(debitoBAmiga) + n(debitoBVZla) + n(bioPago) + n(pm) + n(vpm))
  const montoUsd = (n(pagoEfectivoUsd) + n(binance) + n(zelle))
  const totalBs = montoBs + montoUsd * tasaUsdBs
  const totalVenta = tasaUsdBs > 0 ? montoUsd + montoBs / tasaUsdBs : montoUsd

  function n(x: number | ''): number { return typeof x === 'number' ? x : 0 }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!descripcion || !asesor) {
      toast({ title: 'Faltan datos', description: 'Descripción y asesor son obligatorios', variant: 'destructive' })
      return
    }
    if (!tasa) {
      toast({ title: 'Sin tasa', description: 'No hay tasa de cambio para hoy. Pide al admin que la configure.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const body = {
        cedula, nombre, celular, codigo, descripcion,
        cantidad: n(cantidad), costoUni: n(costoUni), neto,
        pagoEfectivoUsd: n(pagoEfectivoUsd),
        pagoEfectivoBs: n(pagoEfectivoBs),
        debitoBAmiga: n(debitoBAmiga),
        debitoBVZla: n(debitoBVZla),
        bioPago: n(bioPago),
        pm: n(pm),
        binance: n(binance),
        zelle: n(zelle),
        vpm: n(vpm),
        asesor,
        tasaUsdBs,
      }
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      } else {
        toast({ title: 'Venta registrada', description: `Total: $${data.venta.totalVenta.toFixed(2)} / Bs ${data.venta.totalBs.toFixed(2)}` })
        // Limpiar
        setCedula(''); setNombre(''); setCelular(''); setCodigo(''); setDescripcion('')
        setCantidad(''); setCostoUni('')
        setPagoEfectivoUsd(''); setPagoEfectivoBs(''); setDebitoBAmiga(''); setDebitoBVZla('')
        setBioPago(''); setPm(''); setBinance(''); setZelle(''); setVpm('')
        onSaved()
      }
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-emerald-700">Registrar Nueva Venta</h2>
        {tasa ? (
          <div className="text-sm text-right">
            <span className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-md">
              <span className="text-emerald-700 font-medium">Tasa seleccionada: {tasaSel === 'bcv' ? tasa.bcv : tasa.monitor} BS/$</span>
            </span>
            <div className="text-xs text-muted-foreground mt-1">
              BCV: {tasa.bcv} · Monitor: {tasa.monitor}
            </div>
          </div>
        ) : (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-md">
            ⚠ Sin tasa configurada para hoy
          </div>
        )}
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* Datos del cliente */}
        <div>
          <h3 className="text-sm font-semibold text-emerald-700 mb-2">Datos del Cliente</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cedula">Cédula</Label>
              <Input id="cedula" value={cedula} onChange={e => setCedula(e.target.value)} placeholder="V-12345678" />
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del cliente" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="celular">Celular</Label>
              <Input id="celular" value={celular} onChange={e => setCelular(e.target.value)} placeholder="0412-1234567" />
            </div>
          </div>
        </div>

        <Separator />

        {/* Datos del producto */}
        <div>
          <h3 className="text-sm font-semibold text-emerald-700 mb-2">Producto / Servicio</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="codigo">Código</Label>
              <Input id="codigo" value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="P001" />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="descripcion">Descripción *</Label>
              <Input id="descripcion" value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Dólar BCV x 100, Zelle, etc." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cantidad">Cantidad</Label>
              <Input id="cantidad" type="number" step="any" value={cantidad} onChange={e => setCantidad(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="costoUni">Costo Unit.</Label>
              <Input id="costoUni" type="number" step="any" value={costoUni} onChange={e => setCostoUni(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
          </div>
          {neto > 0 && (
            <div className="mt-2 text-sm text-emerald-700 font-medium">
              NETO calculado: {neto.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
            </div>
          )}
        </div>

        <Separator />

        {/* Tasa a usar */}
        <div>
          <h3 className="text-sm font-semibold text-emerald-700 mb-2">Tasa a Aplicar</h3>
          <div className="flex items-center gap-3">
            <Select value={tasaSel} onValueChange={(v) => setTasaSel(v as 'bcv' | 'monitor')}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TASA_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              Tasa: <b>{tasaUsdBs} BS/$</b>
            </span>
          </div>
        </div>

        <Separator />

        {/* Modalidades de pago */}
        <div>
          <h3 className="text-sm font-semibold text-emerald-700 mb-2">Modalidades de Pago</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <PayField label="Pago $ (Efectivo)" value={pagoEfectivoUsd} onChange={setPagoEfectivoUsd} />
            <PayField label="Pago BS (Efectivo)" value={pagoEfectivoBs} onChange={setPagoEfectivoBs} />
            <PayField label="Débito B/Amiga" value={debitoBAmiga} onChange={setDebitoBAmiga} />
            <PayField label="Débito B/VZLA" value={debitoBVZla} onChange={setDebitoBVZla} />
            <PayField label="Bio Pago" value={bioPago} onChange={setBioPago} />
            <PayField label="PM (Pago Móvil)" value={pm} onChange={setPm} />
            <PayField label="Binance" value={binance} onChange={setBinance} />
            <PayField label="Zelle" value={zelle} onChange={setZelle} />
            <PayField label="VPM" value={vpm} onChange={setVpm} />
          </div>
        </div>

        <Separator />

        {/* Asesor */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="asesor">Asesor *</Label>
            <Select value={asesor} onValueChange={setAsesor}>
              <SelectTrigger id="asesor"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASESORES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Totales calculados</Label>
            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-2 text-sm space-y-1">
              <div className="flex justify-between"><span>Monto BS:</span><b>{montoBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</b></div>
              <div className="flex justify-between"><span>Monto $:</span><b>{montoUsd.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</b></div>
              <div className="flex justify-between"><span>TOTAL BS:</span><b>{totalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</b></div>
              <div className="flex justify-between text-emerald-800"><span>TOTAL VENTA:</span><b>${totalVenta.toFixed(2)}</b></div>
            </div>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={saving}>
              {saving ? 'Guardando...' : 'Registrar Venta'}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  )
}

function PayField({ label, value, onChange }: { label: string; value: number | ''; onChange: (v: number | '') => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step="any"
        value={value}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder="0"
      />
    </div>
  )
}
