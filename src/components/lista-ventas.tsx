"use client"

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

interface VentaRow {
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
}

interface Props {
  ventas: VentaRow[]
  onDelete: (id: string) => void
  canDelete?: boolean
}

function fmt(n: number) {
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function ListaVentas({ ventas, onDelete, canDelete = false }: Props) {
  const { toast } = useToast()
  const [filter, setFilter] = useState('')

  const filtered = filter.trim() === '' ? ventas : ventas.filter(v => {
    const q = filter.toLowerCase()
    return (
      (v.nombre ?? '').toLowerCase().includes(q) ||
      (v.cedula ?? '').toLowerCase().includes(q) ||
      (v.descripcion ?? '').toLowerCase().includes(q) ||
      v.asesor.toLowerCase().includes(q)
    )
  })

  async function del(id: string) {
    if (!confirm('¿Eliminar esta venta? Esta acción no se puede deshacer.')) return
    const res = await fetch(`/api/ventas?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Venta eliminada' })
      onDelete(id)
    } else {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' })
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-emerald-700">Ventas del Día ({ventas.length})</h2>
        <Input
          className="w-full max-w-xs"
          placeholder="Buscar por cliente, cédula, descripción o asesor"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          {ventas.length === 0 ? 'No hay ventas registradas para este día.' : 'Ningún resultado coincide con el filtro.'}
        </p>
      ) : (
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-emerald-700 text-white z-10">
              <TableRow className="hover:bg-emerald-700 border-emerald-800">
                <TableHead className="text-white">Hora</TableHead>
                <TableHead className="text-white">Cliente</TableHead>
                <TableHead className="text-white">Cédula</TableHead>
                <TableHead className="text-white">Descripción</TableHead>
                <TableHead className="text-white text-right">Cant.</TableHead>
                <TableHead className="text-white text-right">Neto</TableHead>
                <TableHead className="text-white text-right">Monto BS</TableHead>
                <TableHead className="text-white text-right">Monto $</TableHead>
                <TableHead className="text-white text-right">Total Venta</TableHead>
                <TableHead className="text-white">Asesor</TableHead>
                <TableHead className="text-white">Modalidad</TableHead>
                {canDelete && <TableHead className="text-white">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="text-xs font-mono">{v.hora}</TableCell>
                  <TableCell className="font-medium">{v.nombre || '-'}</TableCell>
                  <TableCell className="text-xs">{v.cedula || '-'}</TableCell>
                  <TableCell className="text-sm">{v.descripcion || '-'}</TableCell>
                  <TableCell className="text-right text-sm">{v.cantidad}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(v.neto)}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(v.montoBs)}</TableCell>
                  <TableCell className="text-right text-sm">${fmt(v.montoUsd)}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-700">${fmt(v.totalVenta)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{v.asesor}</Badge>
                  </TableCell>
                  <TableCell className="text-xs space-x-1">
                    {v.pagoEfectivoUsd > 0 && <Badge variant="secondary" className="text-[10px]">Efect $</Badge>}
                    {v.pagoEfectivoBs > 0 && <Badge variant="secondary" className="text-[10px]">Efect BS</Badge>}
                    {v.debitoBAmiga > 0 && <Badge variant="secondary" className="text-[10px]">B/Amiga</Badge>}
                    {v.debitoBVZla > 0 && <Badge variant="secondary" className="text-[10px]">B/VZLA</Badge>}
                    {v.bioPago > 0 && <Badge variant="secondary" className="text-[10px]">Bio</Badge>}
                    {v.pm > 0 && <Badge variant="secondary" className="text-[10px]">PM</Badge>}
                    {v.binance > 0 && <Badge variant="secondary" className="text-[10px]">Binan</Badge>}
                    {v.zelle > 0 && <Badge variant="secondary" className="text-[10px]">Zelle</Badge>}
                    {v.vpm > 0 && <Badge variant="secondary" className="text-[10px]">VPM</Badge>}
                  </TableCell>
                  {canDelete && (
                    <TableCell>
                      <Button variant="destructive" size="sm" onClick={() => del(v.id)}>
                        Eliminar
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  )
}
