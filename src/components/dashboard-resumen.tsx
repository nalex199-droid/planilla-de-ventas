"use client"

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

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
}

function fmt(n: number) {
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function DashboardResumen({ data }: { data: DashboardData }) {
  const t = data.totales
  return (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
          <div className="text-xs font-medium opacity-90 uppercase tracking-wide">Total Venta del Día</div>
          <div className="text-3xl font-bold mt-1">${fmt(t.totalVentaDia)}</div>
          <div className="text-xs opacity-90 mt-1">{t.count} transacciones</div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <div className="text-xs font-medium opacity-90 uppercase tracking-wide">Monto en BS</div>
          <div className="text-3xl font-bold mt-1">{fmt(t.totalMontoBs)}</div>
          <div className="text-xs opacity-90 mt-1">Bolívares totales</div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-teal-500 to-teal-700 text-white">
          <div className="text-xs font-medium opacity-90 uppercase tracking-wide">Monto en $</div>
          <div className="text-3xl font-bold mt-1">${fmt(t.totalMontoUsd)}</div>
          <div className="text-xs opacity-90 mt-1">Divisas</div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-rose-500 to-rose-700 text-white">
          <div className="text-xs font-medium opacity-90 uppercase tracking-wide">Comisiones (2%)</div>
          <div className="text-3xl font-bold mt-1">${fmt(t.totalComisiones)}</div>
          <div className="text-xs opacity-90 mt-1">Sobre el neto</div>
        </Card>
      </div>

      {/* Info del día */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Reporte del día</div>
            <div className="text-2xl font-bold text-emerald-700">
              {new Date(data.fecha + 'T00:00:00').toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {data.tasa ? (
              <>
                <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">
                  Tasa BCV: {data.tasa.bcv} BS/$
                </Badge>
                <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700">
                  Tasa Monitor: {data.tasa.monitor} BS/$
                </Badge>
              </>
            ) : (
              <Badge variant="destructive">Sin tasa configurada</Badge>
            )}
            <Badge variant="outline">Usuario: {data.user.name}</Badge>
          </div>
        </div>
      </Card>

      {/* Por asesor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-base font-semibold text-emerald-700 mb-3">Ventas por Asesor</h3>
          {data.porAsesor.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay ventas registradas hoy.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Asesor</th>
                    <th className="text-right py-2">#</th>
                    <th className="text-right py-2">Monto BS</th>
                    <th className="text-right py-2">Monto $</th>
                    <th className="text-right py-2">Total Venta</th>
                    <th className="text-right py-2">Comisión</th>
                  </tr>
                </thead>
                <tbody>
                  {data.porAsesor.map(a => (
                    <tr key={a.asesor} className="border-b last:border-0 hover:bg-emerald-50">
                      <td className="py-2 font-medium">{a.asesor}</td>
                      <td className="py-2 text-right">{a.count}</td>
                      <td className="py-2 text-right">{fmt(a.montoBs)}</td>
                      <td className="py-2 text-right">${fmt(a.montoUsd)}</td>
                      <td className="py-2 text-right font-semibold text-emerald-700">${fmt(a.totalVenta)}</td>
                      <td className="py-2 text-right text-rose-600">${fmt(a.comision)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-base font-semibold text-emerald-700 mb-3">Distribución por Modalidad de Pago</h3>
          <div className="space-y-2">
            <ModalidadBar label="Pago $ (Efectivo)" value={data.porModalidad.pagoEfectivoUsd} total={t.totalMontoUsd} color="bg-emerald-500" />
            <ModalidadBar label="Pago BS (Efectivo)" value={data.porModalidad.pagoEfectivoBs} total={t.totalMontoBs} color="bg-amber-500" />
            <ModalidadBar label="Débito B/Amiga" value={data.porModalidad.debitoBAmiga} total={t.totalMontoBs} color="bg-teal-500" />
            <ModalidadBar label="Débito B/VZLA" value={data.porModalidad.debitoBVZla} total={t.totalMontoBs} color="bg-cyan-500" />
            <ModalidadBar label="Bio Pago" value={data.porModalidad.bioPago} total={t.totalMontoBs} color="bg-rose-500" />
            <ModalidadBar label="Pago Móvil" value={data.porModalidad.pm} total={t.totalMontoBs} color="bg-purple-500" />
            <ModalidadBar label="Binance" value={data.porModalidad.binance} total={t.totalMontoUsd} color="bg-orange-500" />
            <ModalidadBar label="Zelle" value={data.porModalidad.zelle} total={t.totalMontoUsd} color="bg-lime-500" />
            <ModalidadBar label="VPM" value={data.porModalidad.vpm} total={t.totalMontoBs} color="bg-pink-500" />
          </div>
        </Card>
      </div>
    </div>
  )
}

function ModalidadBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="font-medium">{fmt(value)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
