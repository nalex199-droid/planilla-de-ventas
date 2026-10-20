"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Database, Search, Calendar } from 'lucide-react'

interface VentaRaw {
  id: string
  fecha: string
  hora: string
  cedula: string | null
  nombre: string | null
  celular: string | null
  codigo: string | null
  descripcion: string | null
  cantidad: number
  costoUni: number
  neto: number
  pagoEfectivoUsd: number
  pagoEfectivoBs: number
  debitoBAmiga: number
  debitoBVZla: number
  bioPago: number
  pm: number
  binance: number
  zelle: number
  vpm: number
  montoBs: number
  montoUsd: number
  totalBs: number
  tasaUsdBs: number
  asesor: string
  totalVenta: number
}

interface GastoRaw {
  id: string
  fecha: string
  hora: string
  concepto: string
  modalidad: string
  montoBs: number
  montoUsd: number
  asesor: string
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '-'
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function VerDatos({ fecha }: { fecha: string }) {
  const [ventas, setVentas] = useState<VentaRaw[]>([])
  const [gastos, setGastos] = useState<GastoRaw[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'ventas' | 'gastos'>('ventas')

  async function load() {
    setLoading(true)
    try {
      const [vRes, gRes] = await Promise.all([
        fetch(`/api/ventas?fecha=${fecha}`),
        fetch(`/api/gastos?fecha=${fecha}`),
      ])
      const vData = await vRes.json()
      const gData = await gRes.json()
      setVentas(vData.ventas ?? [])
      setGastos(gData.gastos ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [fecha])

  const ventasFiltered = search.trim() === '' ? ventas : ventas.filter(v => {
    const q = search.toLowerCase()
    return (
      (v.cedula ?? '').toLowerCase().includes(q) ||
      (v.nombre ?? '').toLowerCase().includes(q) ||
      (v.descripcion ?? '').toLowerCase().includes(q) ||
      (v.asesor ?? '').toLowerCase().includes(q)
    )
  })

  const gastosFiltered = search.trim() === '' ? gastos : gastos.filter(g => {
    const q = search.toLowerCase()
    return (
      (g.concepto ?? '').toLowerCase().includes(q) ||
      (g.modalidad ?? '').toLowerCase().includes(q) ||
      (g.asesor ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-emerald-700 flex items-center gap-2">
          <Database className="w-5 h-5" /> Datos Almacenados (tipo Excel)
        </h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <Calendar className="w-3 h-3 mr-1" /> {fecha}
          </Badge>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? 'Cargando...' : 'Refrescar'}
          </Button>
        </div>
      </div>

      {/* Banner informativo */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800">
        <b>ℹ️ ¿Dónde se guardan estos datos?</b>
        <p className="mt-1">
          {process.env.NODE_ENV === 'production' ? (
            <>
              Esta app está en modo <b>demo</b>: los datos se guardan en memoria del servidor (se reinician
              al redeploy). Para tener los datos en un Google Sheet permanente que puedas ver y editar,
              necesitas configurar las credenciales de Google Service Account (ver README).
            </>
          ) : (
            <>Los datos que ves aquí son los mismos que se sincronizarían con el Google Sheet cuando se configure.</>
          )}
        </p>
      </div>

      {/* Tabs ventas / gastos */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={tab === 'ventas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('ventas')}
          className={tab === 'ventas' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
        >
          Ventas ({ventas.length})
        </Button>
        <Button
          variant={tab === 'gastos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('gastos')}
          className={tab === 'gastos' ? 'bg-rose-600 hover:bg-rose-700' : ''}
        >
          Gastos ({gastos.length})
        </Button>
      </div>

      {/* Buscador */}
      <div className="mb-3 flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          className="max-w-md"
          placeholder={tab === 'ventas' ? 'Buscar en ventas...' : 'Buscar en gastos...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Cargando datos...</p>
      ) : tab === 'ventas' ? (
        ventasFiltered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            No hay ventas registradas para el {fecha}.
          </p>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-emerald-700 text-white z-10">
                <TableRow className="hover:bg-emerald-700 border-emerald-800">
                  <TableHead className="text-white">#</TableHead>
                  <TableHead className="text-white">Fecha</TableHead>
                  <TableHead className="text-white">Hora</TableHead>
                  <TableHead className="text-white">Cédula</TableHead>
                  <TableHead className="text-white">Nombre</TableHead>
                  <TableHead className="text-white">Celular</TableHead>
                  <TableHead className="text-white">Código</TableHead>
                  <TableHead className="text-white">Descripción</TableHead>
                  <TableHead className="text-white text-right">Cant.</TableHead>
                  <TableHead className="text-white text-right">Costo Uni</TableHead>
                  <TableHead className="text-white text-right">Neto</TableHead>
                  <TableHead className="text-white text-right">Efect $</TableHead>
                  <TableHead className="text-white text-right">Efect BS</TableHead>
                  <TableHead className="text-white text-right">B/Amiga</TableHead>
                  <TableHead className="text-white text-right">B/VZLA</TableHead>
                  <TableHead className="text-white text-right">Bio Pago</TableHead>
                  <TableHead className="text-white text-right">PM</TableHead>
                  <TableHead className="text-white text-right">Binance</TableHead>
                  <TableHead className="text-white text-right">Zelle</TableHead>
                  <TableHead className="text-white text-right">VPM</TableHead>
                  <TableHead className="text-white text-right">Monto BS</TableHead>
                  <TableHead className="text-white text-right">Monto $</TableHead>
                  <TableHead className="text-white text-right">Total BS</TableHead>
                  <TableHead className="text-white text-right">Tasa</TableHead>
                  <TableHead className="text-white">Asesor</TableHead>
                  <TableHead className="text-white text-right">Total Venta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventasFiltered.map((v, i) => (
                  <TableRow key={v.id} className="text-xs">
                    <TableCell className="font-mono">{i + 1}</TableCell>
                    <TableCell className="font-mono">{v.fecha}</TableCell>
                    <TableCell className="font-mono">{v.hora}</TableCell>
                    <TableCell>{v.cedula ?? '-'}</TableCell>
                    <TableCell>{v.nombre ?? '-'}</TableCell>
                    <TableCell>{v.celular ?? '-'}</TableCell>
                    <TableCell>{v.codigo ?? '-'}</TableCell>
                    <TableCell>{v.descripcion ?? '-'}</TableCell>
                    <TableCell className="text-right">{v.cantidad}</TableCell>
                    <TableCell className="text-right">{fmt(v.costoUni)}</TableCell>
                    <TableCell className="text-right">{fmt(v.neto)}</TableCell>
                    <TableCell className="text-right">{fmt(v.pagoEfectivoUsd)}</TableCell>
                    <TableCell className="text-right">{fmt(v.pagoEfectivoBs)}</TableCell>
                    <TableCell className="text-right">{fmt(v.debitoBAmiga)}</TableCell>
                    <TableCell className="text-right">{fmt(v.debitoBVZla)}</TableCell>
                    <TableCell className="text-right">{fmt(v.bioPago)}</TableCell>
                    <TableCell className="text-right">{fmt(v.pm)}</TableCell>
                    <TableCell className="text-right">{fmt(v.binance)}</TableCell>
                    <TableCell className="text-right">{fmt(v.zelle)}</TableCell>
                    <TableCell className="text-right">{fmt(v.vpm)}</TableCell>
                    <TableCell className="text-right">{fmt(v.montoBs)}</TableCell>
                    <TableCell className="text-right">{fmt(v.montoUsd)}</TableCell>
                    <TableCell className="text-right">{fmt(v.totalBs)}</TableCell>
                    <TableCell className="text-right">{fmt(v.tasaUsdBs)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                        {v.asesor}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-700">${fmt(v.totalVenta)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <tfoot>
                <TableRow className="bg-emerald-100 font-bold text-xs">
                  <TableCell colSpan={7}>TOTALES ({ventasFiltered.length} ventas)</TableCell>
                  <TableCell className="text-right">{ventasFiltered.reduce((s, v) => s + v.cantidad, 0)}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">{fmt(ventasFiltered.reduce((s, v) => s + v.neto, 0))}</TableCell>
                  <TableCell className="text-right">{fmt(ventasFiltered.reduce((s, v) => s + v.pagoEfectivoUsd, 0))}</TableCell>
                  <TableCell className="text-right">{fmt(ventasFiltered.reduce((s, v) => s + v.pagoEfectivoBs, 0))}</TableCell>
                  <TableCell className="text-right">{fmt(ventasFiltered.reduce((s, v) => s + v.debitoBAmiga, 0))}</TableCell>
                  <TableCell className="text-right">{fmt(ventasFiltered.reduce((s, v) => s + v.debitoBVZla, 0))}</TableCell>
                  <TableCell className="text-right">{fmt(ventasFiltered.reduce((s, v) => s + v.bioPago, 0))}</TableCell>
                  <TableCell className="text-right">{fmt(ventasFiltered.reduce((s, v) => s + v.pm, 0))}</TableCell>
                  <TableCell className="text-right">{fmt(ventasFiltered.reduce((s, v) => s + v.binance, 0))}</TableCell>
                  <TableCell className="text-right">{fmt(ventasFiltered.reduce((s, v) => s + v.zelle, 0))}</TableCell>
                  <TableCell className="text-right">{fmt(ventasFiltered.reduce((s, v) => s + v.vpm, 0))}</TableCell>
                  <TableCell className="text-right">{fmt(ventasFiltered.reduce((s, v) => s + v.montoBs, 0))}</TableCell>
                  <TableCell className="text-right">{fmt(ventasFiltered.reduce((s, v) => s + v.montoUsd, 0))}</TableCell>
                  <TableCell className="text-right">{fmt(ventasFiltered.reduce((s, v) => s + v.totalBs, 0))}</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">${fmt(ventasFiltered.reduce((s, v) => s + v.totalVenta, 0))}</TableCell>
                </TableRow>
              </tfoot>
            </Table>
          </div>
        )
      ) : (
        gastosFiltered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            No hay gastos registrados para el {fecha}.
          </p>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-rose-700 text-white z-10">
                <TableRow className="hover:bg-rose-700 border-rose-800">
                  <TableHead className="text-white">#</TableHead>
                  <TableHead className="text-white">Fecha</TableHead>
                  <TableHead className="text-white">Hora</TableHead>
                  <TableHead className="text-white">Concepto</TableHead>
                  <TableHead className="text-white">Modalidad</TableHead>
                  <TableHead className="text-white text-right">Monto BS</TableHead>
                  <TableHead className="text-white text-right">Monto $</TableHead>
                  <TableHead className="text-white">Asesor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gastosFiltered.map((g, i) => (
                  <TableRow key={g.id} className="text-xs">
                    <TableCell className="font-mono">{i + 1}</TableCell>
                    <TableCell className="font-mono">{g.fecha}</TableCell>
                    <TableCell className="font-mono">{g.hora}</TableCell>
                    <TableCell>{g.concepto}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs">
                        {g.modalidad}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{fmt(g.montoBs)}</TableCell>
                    <TableCell className="text-right">${fmt(g.montoUsd)}</TableCell>
                    <TableCell className="text-xs">{g.asesor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <tfoot>
                <TableRow className="bg-rose-100 font-bold text-xs">
                  <TableCell colSpan={5}>TOTALES ({gastosFiltered.length} gastos)</TableCell>
                  <TableCell className="text-right">{fmt(gastosFiltered.reduce((s, g) => s + g.montoBs, 0))}</TableCell>
                  <TableCell className="text-right">${fmt(gastosFiltered.reduce((s, g) => s + g.montoUsd, 0))}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </tfoot>
            </Table>
          </div>
        )
      )}
    </Card>
  )
}
