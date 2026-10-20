"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ShoppingCart, Utensils, Truck, Zap, Wallet, Plus } from 'lucide-react'

interface TasaInfo { bcv: number; monitor: number }

// Botones rápidos de conceptos comunes (estilo supermercado)
const CONCEPTOS_RAPIDOS = [
  { id: 'compra_mercancia', label: 'Compra Mercancía', icon: ShoppingCart, color: 'bg-blue-500' },
  { id: 'comida', label: 'Comida/Desayuno', icon: Utensils, color: 'bg-orange-500' },
  { id: 'envio', label: 'Envío/Transporte', icon: Truck, color: 'bg-purple-500' },
  { id: 'servicio', label: 'Servicio/Luz/Agua', icon: Zap, color: 'bg-yellow-500' },
  { id: 'prooveedor', label: 'Pago Proveedor', icon: Wallet, color: 'bg-emerald-500' },
  { id: 'otro', label: 'Otro', icon: Plus, color: 'bg-gray-500' },
]

const MODALIDADES = [
  { value: 'efectivo_bs', label: 'Efectivo BS' },
  { value: 'efectivo_usd', label: 'Efectivo $' },
  { value: 'debito_b_amiga', label: 'Débito B/Amiga' },
  { value: 'debito_b_vzla', label: 'Débito B/Venezuela' },
  { value: 'bio_pago', label: 'Bio Pago' },
  { value: 'pm', label: 'Pago Móvil' },
  { value: 'binance', label: 'Binance' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'vpm', label: 'VPM' },
]

export function GastosForm({ onSaved }: { onSaved: () => void }) {
  const { toast } = useToast()
  const [tasa, setTasa] = useState<TasaInfo | null>(null)
  const [tasaSel, setTasaSel] = useState<'bcv' | 'monitor'>('monitor')
  const [saving, setSaving] = useState(false)

  const [concepto, setConcepto] = useState('')
  const [modalidad, setModalidad] = useState('efectivo_bs')
  const [montoInput, setMontoInput] = useState<number | ''>('')
  const [montoEsUsd, setMontoEsUsd] = useState(false) // false = BS, true = USD

  useEffect(() => {
    fetch('/api/tasas')
      .then(r => r.json())
      .then(d => { if (d.tasa) setTasa({ bcv: d.tasa.bcv, monitor: d.tasa.monitor }) })
      .catch(() => {})
  }, [])

  const tasaUsdBs = tasa ? (tasaSel === 'bcv' ? tasa.bcv : tasa.monitor) : 0

  function quickConcepto(c: { id: string; label: string }) {
    setConcepto(c.label)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!concepto) {
      toast({ title: 'Falta concepto', description: 'Escribe o selecciona un concepto', variant: 'destructive' })
      return
    }
    if (!montoInput) {
      toast({ title: 'Falta monto', description: 'Ingresa el monto del gasto', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const body = {
        concepto,
        modalidad,
        tasaUsdBs,
        // Si el monto es USD, mandar montoUsd. Si es BS, mandar montoBs.
        montoBs: montoEsUsd ? 0 : Number(montoInput),
        montoUsd: montoEsUsd ? Number(montoInput) : 0,
      }
      const res = await fetch('/api/gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      } else {
        const total = montoEsUsd ? `$${data.gasto.montoUsd.toFixed(2)}` : `${data.gasto.montoBs.toFixed(2)} Bs`
        toast({ title: 'Gasto registrado', description: `${concepto} — ${total}` })
        setConcepto('')
        setMontoInput('')
        onSaved()
      }
    } catch (err) {
      toast({ title: 'Error de red', description: String(err), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold text-rose-700 mb-4">Registrar Gasto</h2>

      <form onSubmit={submit} className="space-y-5">
        {/* Botones rápidos estilo supermercado */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">Concepto rápido</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {CONCEPTOS_RAPIDOS.map(c => {
              const Icon = c.icon
              const isSelected = concepto === c.label
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => quickConcepto(c)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border-2 transition-all ${
                    isSelected
                      ? `${c.color} text-white border-transparent shadow-md`
                      : 'bg-white border-muted hover:border-rose-300 hover:bg-rose-50'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-medium">{c.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Concepto manual */}
        <div className="space-y-1.5">
          <Label htmlFor="concepto">Concepto del gasto *</Label>
          <Input
            id="concepto"
            value={concepto}
            onChange={e => setConcepto(e.target.value)}
            placeholder="Ej: Pago a proveedor Juan, Alquiler del local..."
          />
        </div>

        {/* Modalidad + Monto */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Modalidad de pago</Label>
            <Select value={modalidad} onValueChange={setModalidad}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODALIDADES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tasa a aplicar</Label>
            <Select value={tasaSel} onValueChange={(v) => setTasaSel(v as 'bcv' | 'monitor')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bcv">BCV ({tasa?.bcv ?? 0})</SelectItem>
                <SelectItem value="monitor">Monitor ({tasa?.monitor ?? 0})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de monto</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={!montoEsUsd ? 'default' : 'outline'}
                className={!montoEsUsd ? 'bg-amber-600 hover:bg-amber-700' : ''}
                onClick={() => setMontoEsUsd(false)}
              >
                Bolívares
              </Button>
              <Button
                type="button"
                size="sm"
                variant={montoEsUsd ? 'default' : 'outline'}
                className={montoEsUsd ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                onClick={() => setMontoEsUsd(true)}
              >
                Dólares
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="monto">Monto *</Label>
            <Input
              id="monto"
              type="number"
              step="any"
              value={montoInput}
              onChange={e => setMontoInput(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder={montoEsUsd ? '0.00 (en $)' : '0.00 (en Bs)'}
            />
          </div>
          <div className="text-sm bg-rose-50 border border-rose-200 rounded-md p-3 text-rose-800">
            {montoInput && tasaUsdBs > 0 ? (
              <>
                <b>Equivalente:</b>{' '}
                {montoEsUsd
                  ? `${(Number(montoInput) * tasaUsdBs).toFixed(2)} Bs`
                  : `$${(Number(montoInput) / tasaUsdBs).toFixed(2)}`}
              </>
            ) : (
              'Ingresa un monto para ver el equivalente'
            )}
          </div>
        </div>

        <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700" disabled={saving}>
          {saving ? 'Guardando...' : 'Registrar Gasto'}
        </Button>
      </form>
    </Card>
  )
}
