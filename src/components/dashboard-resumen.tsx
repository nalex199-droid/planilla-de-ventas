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
  gastos?: Array<{ id: string; hora: string; concepto: string; modalidad: string; montoBs: number; montoUsd: number; asesor: string }>
  totalGastosBs?: number
  totalGastosUsd?: number
  netoBs?: number
  netoUsd?: number
  abonosProveedores?: number
  totalAbonosProveedoresBs?: number
  totalAbonosProveedoresUsd?: number
  totalOtrosGastosBs?: number
  totalOtrosGastosUsd?: number
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
        <Card className="p-5 bg-gradient-to-br from-rose-500 to-rose-700 text-white">
          <div className="text-xs font-medium opacity-90 uppercase tracking-wide">Total Gastos</div>
          <div className="text-3xl font-bold mt-1">${fmt(data.totalGastosUsd ?? 0)}</div>
          <div className="text-xs opacity-90 mt-1">{fmt(data.totalGastosBs ?? 0)} Bs</div>
        </Card>
        <Card className={`p-5 bg-gradient-to-br ${(data.netoUsd ?? 0) >= 0 ? 'from-teal-500 to-teal-700' : 'from-red-500 to-red-700'} text-white`}>
          <div className="text-xs font-medium opacity-90 uppercase tracking-wide">NETO del Día</div>
          <div className="text-3xl font-bold mt-1">${fmt(data.netoUsd ?? 0)}</div>
          <div className="text-xs opacity-90 mt-1">{fmt(data.netoBs ?? 0)} Bs</div>
        </Card>
      </div>

      {/* Cards específicas para Abonos a Proveedores y Otros Gastos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-2 border-emerald-300 bg-emerald-50">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide">🤝 Abonos a Proveedores ({data.abonosProveedores ?? 0})</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">${fmt(data.totalAbonosProveedoresUsd ?? 0)}</div>
          <div className="text-xs text-emerald-600 mt-1">{fmt(data.totalAbonosProveedoresBs ?? 0)} Bs</div>
        </Card>
        <Card className="p-4 border-2 border-amber-300 bg-amber-50">
          <div className="text-xs font-bold text-amber-700 uppercase tracking-wide">💼 Otros Gastos</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">${fmt(data.totalOtrosGastosUsd ?? 0)}</div>
          <div className="text-xs text-amber-600 mt-1">{fmt(data.totalOtrosGastosBs ?? 0)} Bs</div>
        </Card>
        <Card className="p-4 border-2 border-rose-300 bg-rose-50">
          <div className="text-xs font-bold text-rose-700 uppercase tracking-wide">💸 Comisiones (2%)</div>
          <div className="text-2xl font-bold text-rose-700 mt-1">${fmt(t.totalComisiones)}</div>
          <div className="text-xs text-rose-600 mt-1">Sobre el neto de ventas</div>
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

      {/* Resumen por Modalidad de Pago — cards separadas como en el Excel original */}
      <div>
        <h3 className="text-base font-semibold text-emerald-700 mb-3">Resumen por Modalidad de Pago</h3>

        {/* Grupo BS (Bolívares) */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Modalidades en BS</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <ModalidadCard label="Pago BS (Efectivo)" value={data.porModalidad.pagoEfectivoBs} suffix="Bs" color="amber" />
            <ModalidadCard label="Débito B/Amiga" value={data.porModalidad.debitoBAmiga} suffix="Bs" color="teal" />
            <ModalidadCard label="Débito B/Venezuela" value={data.porModalidad.debitoBVZla} suffix="Bs" color="cyan" />
            <ModalidadCard label="Bio Pago" value={data.porModalidad.bioPago} suffix="Bs" color="rose" />
            <ModalidadCard label="Pago Móvil (PM)" value={data.porModalidad.pm} suffix="Bs" color="purple" />
            <ModalidadCard label="VPM" value={data.porModalidad.vpm} suffix="Bs" color="pink" />
          </div>
          <div className="mt-2 text-sm font-semibold text-amber-700 text-right">
            Total BS: {fmt(data.porModalidad.pagoEfectivoBs + data.porModalidad.debitoBAmiga + data.porModalidad.debitoBVZla + data.porModalidad.bioPago + data.porModalidad.pm + data.porModalidad.vpm)} Bs
          </div>
        </div>

        {/* Grupo USD (Dólares) */}
        <div>
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Modalidades en USD ($)</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <ModalidadCard label="Pago $ (Efectivo)" value={data.porModalidad.pagoEfectivoUsd} suffix="$" color="emerald" />
            <ModalidadCard label="Binance" value={data.porModalidad.binance} suffix="$" color="orange" />
            <ModalidadCard label="Zelle" value={data.porModalidad.zelle} suffix="$" color="lime" />
          </div>
          <div className="mt-2 text-sm font-semibold text-emerald-700 text-right">
            Total $: ${fmt(data.porModalidad.pagoEfectivoUsd + data.porModalidad.binance + data.porModalidad.zelle)}
          </div>
        </div>
      </div>

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
            <ModalidadBar label="Débito B/Venezuela" value={data.porModalidad.debitoBVZla} total={t.totalMontoBs} color="bg-cyan-500" />
            <ModalidadBar label="Bio Pago" value={data.porModalidad.bioPago} total={t.totalMontoBs} color="bg-rose-500" />
            <ModalidadBar label="Pago Móvil (PM)" value={data.porModalidad.pm} total={t.totalMontoBs} color="bg-purple-500" />
            <ModalidadBar label="Binance" value={data.porModalidad.binance} total={t.totalMontoUsd} color="bg-orange-500" />
            <ModalidadBar label="Zelle" value={data.porModalidad.zelle} total={t.totalMontoUsd} color="bg-lime-500" />
            <ModalidadBar label="VPM" value={data.porModalidad.vpm} total={t.totalMontoBs} color="bg-pink-500" />
          </div>
        </Card>
      </div>

      {/* Gastos recientes */}
      {data.gastos && data.gastos.length > 0 && (
        <Card className="p-5 border-rose-200">
          <h3 className="text-base font-semibold text-rose-700 mb-3">Gastos del Día ({data.gastos.length})</h3>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-rose-50 border-b">
                  <th className="text-left p-2 text-rose-700">Hora</th>
                  <th className="text-left p-2 text-rose-700">Concepto</th>
                  <th className="text-left p-2 text-rose-700">Modalidad</th>
                  <th className="text-right p-2 text-rose-700">Monto BS</th>
                  <th className="text-right p-2 text-rose-700">Monto $</th>
                  <th className="text-left p-2 text-rose-700">Asesor</th>
                </tr>
              </thead>
              <tbody>
                {data.gastos.map((g) => (
                  <tr key={g.id} className="border-b last:border-0 hover:bg-rose-50">
                    <td className="p-2 text-xs font-mono">{g.hora}</td>
                    <td className="p-2">{g.concepto}</td>
                    <td className="p-2 text-xs">
                      <span className="inline-block px-2 py-0.5 rounded bg-rose-100 text-rose-700">{g.modalidad}</span>
                    </td>
                    <td className="p-2 text-right">{fmt(g.montoBs)}</td>
                    <td className="p-2 text-right">${fmt(g.montoUsd)}</td>
                    <td className="p-2 text-xs">{g.asesor}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-rose-100 font-bold">
                  <td colSpan={3} className="p-2 text-right text-rose-700">TOTALES</td>
                  <td className="p-2 text-right text-rose-700">{fmt(data.totalGastosBs ?? 0)} Bs</td>
                  <td className="p-2 text-right text-rose-700">${fmt(data.totalGastosUsd ?? 0)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Resumen financiero */}
      <Card className="p-5 bg-gradient-to-r from-emerald-50 to-rose-50 border-2 border-emerald-200">
        <h3 className="text-base font-bold text-emerald-700 mb-3">Resumen Financiero del Día</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-emerald-200 rounded-md p-3">
            <div className="text-xs text-muted-foreground uppercase">Ventas</div>
            <div className="text-xl font-bold text-emerald-700">${fmt(t.totalVentaDia)}</div>
            <div className="text-xs text-muted-foreground">{fmt(t.totalMontoBs)} Bs</div>
          </div>
          <div className="bg-white border border-rose-200 rounded-md p-3">
            <div className="text-xs text-muted-foreground uppercase">Gastos</div>
            <div className="text-xl font-bold text-rose-700">-${fmt(data.totalGastosUsd ?? 0)}</div>
            <div className="text-xs text-muted-foreground">-{fmt(data.totalGastosBs ?? 0)} Bs</div>
          </div>
          <div className="bg-white border border-amber-200 rounded-md p-3">
            <div className="text-xs text-muted-foreground uppercase">Comisiones (2%)</div>
            <div className="text-xl font-bold text-amber-700">${fmt(t.totalComisiones)}</div>
          </div>
          <div className={`border-2 rounded-md p-3 ${(data.netoUsd ?? 0) >= 0 ? 'bg-emerald-50 border-emerald-400' : 'bg-rose-50 border-rose-400'}`}>
            <div className="text-xs text-muted-foreground uppercase">NETO (Ventas - Gastos)</div>
            <div className={`text-xl font-bold ${(data.netoUsd ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              ${fmt(data.netoUsd ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground">{fmt(data.netoBs ?? 0)} Bs</div>
          </div>
        </div>
      </Card>
    </div>
  )
}

function ModalidadCard({ label, value, suffix, color }: { label: string; value: number; suffix: string; color: string }) {
  const colorMap: Record<string, string> = {
    amber: 'border-amber-300 bg-amber-50 text-amber-800',
    teal: 'border-teal-300 bg-teal-50 text-teal-800',
    cyan: 'border-cyan-300 bg-cyan-50 text-cyan-800',
    rose: 'border-rose-300 bg-rose-50 text-rose-800',
    purple: 'border-purple-300 bg-purple-50 text-purple-800',
    pink: 'border-pink-300 bg-pink-50 text-pink-800',
    emerald: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    orange: 'border-orange-300 bg-orange-50 text-orange-800',
    lime: 'border-lime-300 bg-lime-50 text-lime-800',
  }
  return (
    <div className={`border-2 rounded-md p-3 ${colorMap[color] ?? colorMap.amber}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80 mb-1">{label}</div>
      <div className="text-lg font-bold">
        {suffix === '$' ? '$' : ''}{fmt(value)}{suffix === 'Bs' ? ' Bs' : ''}
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
