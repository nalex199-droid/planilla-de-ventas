"use client"

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { DollarSign, ShoppingCart, Bitcoin, Wallet, Smartphone, CreditCard, Banknote, Plus, Zap } from 'lucide-react'
import { ProductoSearcher } from './producto-searcher'

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

// Catálogo de productos rápidos (estilo supermercado/POS)
interface ProductoRapido {
  id: string
  nombre: string
  descripcion: string
  cantidad: number
  costoUni?: (tasa: TasaInfo | null) => number
  categoria: 'divisas' | 'pagos' | 'rapidos'
  color: string
  icon: any
  // campo de pago a rellenar y monto
  pago?: { campo: string; monto: number }
}

const PRODUCTOS_RAPIDOS: ProductoRapido[] = [
  // Divisas
  { id: 'dolarbcv100', nombre: 'Dólar BCV x100', descripcion: 'DÓLAR BCV x 100', cantidad: 100, costoUni: (t) => t?.bcv ?? 876.79, categoria: 'divisas', color: 'bg-emerald-500 hover:bg-emerald-600', icon: DollarSign },
  { id: 'dolarbcv50', nombre: 'Dólar BCV x50', descripcion: 'DÓLAR BCV x 50', cantidad: 50, costoUni: (t) => t?.bcv ?? 876.79, categoria: 'divisas', color: 'bg-emerald-500 hover:bg-emerald-600', icon: DollarSign },
  { id: 'dolarmointor100', nombre: 'Dólar Monitor x100', descripcion: 'DÓLAR MONITOR x 100', cantidad: 100, costoUni: (t) => t?.monitor ?? 1015, categoria: 'divisas', color: 'bg-amber-500 hover:bg-amber-600', icon: DollarSign },
  { id: 'dolarmointor50', nombre: 'Dólar Monitor x50', descripcion: 'DÓLAR MONITOR x 50', cantidad: 50, costoUni: (t) => t?.monitor ?? 1015, categoria: 'divisas', color: 'bg-amber-500 hover:bg-amber-600', icon: DollarSign },
  // Zelle
  { id: 'zelle50', nombre: 'Zelle $50', descripcion: 'ZELLE $50', cantidad: 1, costoUni: () => 50, categoria: 'pagos', color: 'bg-lime-500 hover:bg-lime-600', icon: CreditCard, pago: { campo: 'zelle', monto: 50 } },
  { id: 'zelle100', nombre: 'Zelle $100', descripcion: 'ZELLE $100', cantidad: 1, costoUni: () => 100, categoria: 'pagos', color: 'bg-lime-500 hover:bg-lime-600', icon: CreditCard, pago: { campo: 'zelle', monto: 100 } },
  { id: 'zelle200', nombre: 'Zelle $200', descripcion: 'ZELLE $200', cantidad: 1, costoUni: () => 200, categoria: 'pagos', color: 'bg-lime-500 hover:bg-lime-600', icon: CreditCard, pago: { campo: 'zelle', monto: 200 } },
  // Binance
  { id: 'binance100', nombre: 'Binance $100', descripcion: 'BINANCE $100', cantidad: 1, costoUni: () => 100, categoria: 'pagos', color: 'bg-orange-500 hover:bg-orange-600', icon: Bitcoin, pago: { campo: 'binance', monto: 100 } },
  { id: 'binance200', nombre: 'Binance $200', descripcion: 'BINANCE $200', cantidad: 1, costoUni: () => 200, categoria: 'pagos', color: 'bg-orange-500 hover:bg-orange-600', icon: Bitcoin, pago: { campo: 'binance', monto: 200 } },
  // Efectivo BS
  { id: 'efecbs5000', nombre: 'Efectivo Bs 5000', descripcion: 'EFECTIVO BS 5000', cantidad: 1, costoUni: () => 5000, categoria: 'rapidos', color: 'bg-amber-600 hover:bg-amber-700', icon: Banknote, pago: { campo: 'pagoEfectivoBs', monto: 5000 } },
  { id: 'efecbs10000', nombre: 'Efectivo Bs 10000', descripcion: 'EFECTIVO BS 10000', cantidad: 1, costoUni: () => 10000, categoria: 'rapidos', color: 'bg-amber-600 hover:bg-amber-700', icon: Banknote, pago: { campo: 'pagoEfectivoBs', monto: 10000 } },
  // Bio Pago
  { id: 'biopago5000', nombre: 'Bio Pago 5000', descripcion: 'BIO PAGO 5000', cantidad: 1, costoUni: () => 5000, categoria: 'rapidos', color: 'bg-rose-500 hover:bg-rose-600', icon: Smartphone, pago: { campo: 'bioPago', monto: 5000 } },
]

const CATEGORIAS = [
  { id: 'divisas', label: '💱 Divisas', color: 'text-emerald-700' },
  { id: 'pagos', label: '💳 Pagos Digitales', color: 'text-lime-700' },
  { id: 'rapidos', label: '⚡ Montos Rápidos', color: 'text-amber-700' },
]

export function FormVenta({ user, onSaved }: Props) {
  const { toast } = useToast()
  const [tasa, setTasa] = useState<TasaInfo | null>(null)
  const [tasaSel, setTasaSel] = useState<'bcv' | 'monitor'>('monitor')
  const [saving, setSaving] = useState(false)
  const [categoriaActiva, setCategoriaActiva] = useState<string>('divisas')

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

  // Aplicar producto rápido: rellena campos automáticamente
  function aplicarProducto(p: ProductoRapido) {
    setDescripcion(p.descripcion)
    setCantidad(p.cantidad)
    setCostoUni(p.costoUni ? p.costoUni(tasa) : 0)
    // Limpiar todos los campos de pago primero
    setPagoEfectivoUsd(''); setPagoEfectivoBs(''); setDebitoBAmiga(''); setDebitoBVZla('')
    setBioPago(''); setPm(''); setBinance(''); setZelle(''); setVpm('')
    // Si el producto tiene un campo de pago, lo rellenamos
    if (p.pago) {
      const monto = p.pago.monto
      switch (p.pago.campo) {
        case 'pagoEfectivoBs': setPagoEfectivoBs(monto); break
        case 'zelle': setZelle(monto); break
        case 'binance': setBinance(monto); break
        case 'bioPago': setBioPago(monto); break
        case 'pm': setPm(monto); break
        case 'pagoEfectivoUsd': setPagoEfectivoUsd(monto); break
      }
      toast({ title: `Producto agregado: ${p.nombre}`, description: `Pago: ${monto}` })
    } else {
      toast({ title: `Producto agregado: ${p.nombre}`, description: 'Revisa los campos antes de guardar' })
    }
  }

  // Productos filtrados por categoría activa
  const productosFiltrados = PRODUCTOS_RAPIDOS.filter(p => p.categoria === categoriaActiva)

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-emerald-700 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" /> Registrar Nueva Venta
        </h2>
        {tasa ? (
          <div className="text-sm text-right">
            <span className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-md">
              <span className="text-emerald-700 font-medium">Tasa: {tasaSel === 'bcv' ? tasa.bcv : tasa.monitor} BS/$</span>
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

      {/* CATÁLOGO estilo supermercado */}
      <div className="mb-5 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border-2 border-emerald-200">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-emerald-700" />
          <h3 className="text-sm font-bold text-emerald-700">Productos Rápidos (1 click rellena todo)</h3>
        </div>

        {/* Tabs de categorías */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {CATEGORIAS.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoriaActiva(c.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border-2 transition-all ${
                categoriaActiva === c.id
                  ? 'bg-emerald-600 text-white border-transparent shadow-md'
                  : 'bg-white border-emerald-200 text-emerald-700 hover:border-emerald-400'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Grid de productos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {productosFiltrados.map(p => {
            const Icon = p.icon
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => aplicarProducto(p)}
                className={`${p.color} text-white rounded-lg p-3 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-1 min-h-[80px]`}
              >
                <Icon className="w-6 h-6" />
                <div className="text-xs font-bold text-center leading-tight">{p.nombre}</div>
              </button>
            )
          })}
        </div>
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

        {/* Datos del producto con buscador de catálogo */}
        <div>
          <h3 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
            🔍 Buscar producto del catálogo (9,207 productos)
          </h3>
          <ProductoSearcher
            onSelect={(p) => {
              setCodigo(p.codigo)
              setDescripcion(p.descripcion)
              if (p.costo) setCostoUni(p.costo)
              toast({ title: 'Producto cargado', description: `${p.codigo}: ${p.descripcion}` })
            }}
          />
        </div>

        <Separator />

        {/* Datos del producto (campos manuales) */}
        <div>
          <h3 className="text-sm font-semibold text-emerald-700 mb-2">Producto / Servicio (también puedes escribir manual)</h3>
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
