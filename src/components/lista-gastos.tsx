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

interface GastoRow {
  id: string
  hora: string
  concepto: string
  modalidad: string
  montoBs: number
  montoUsd: number
  asesor: string
}

interface Props {
  gastos: GastoRow[]
  onDelete: (id: string) => void
  canDelete?: boolean
}

function fmt(n: number) {
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function ListaGastos({ gastos, onDelete, canDelete = false }: Props) {
  const { toast } = useToast()
  const [filter, setFilter] = useState('')

  const filtered = filter.trim() === '' ? gastos : gastos.filter(g => {
    const q = filter.toLowerCase()
    return (
      (g.concepto ?? '').toLowerCase().includes(q) ||
      (g.modalidad ?? '').toLowerCase().includes(q) ||
      (g.asesor ?? '').toLowerCase().includes(q)
    )
  })

  async function del(id: string) {
    if (!confirm('¿Eliminar este gasto?')) return
    const res = await fetch(`/api/gastos?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Gasto eliminado' })
      onDelete(id)
    } else {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' })
    }
  }

  const totalBs = gastos.reduce((s, g) => s + g.montoBs, 0)
  const totalUsd = gastos.reduce((s, g) => s + g.montoUsd, 0)

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-rose-700">Gastos del Día ({gastos.length})</h2>
        <Input
          className="w-full max-w-xs"
          placeholder="Buscar por concepto, modalidad o asesor"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      {/* Resumen rápido de totales */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-rose-50 border border-rose-200 rounded-md p-3 text-center">
          <div className="text-xs text-rose-700 uppercase tracking-wide">Total Gastos BS</div>
          <div className="text-xl font-bold text-rose-700">{fmt(totalBs)} Bs</div>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-md p-3 text-center">
          <div className="text-xs text-rose-700 uppercase tracking-wide">Total Gastos $</div>
          <div className="text-xl font-bold text-rose-700">${fmt(totalUsd)}</div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          {gastos.length === 0 ? 'No hay gastos registrados para este día.' : 'Ningún resultado coincide con el filtro.'}
        </p>
      ) : (
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-rose-700 text-white z-10">
              <TableRow className="hover:bg-rose-700 border-rose-800">
                <TableHead className="text-white">Hora</TableHead>
                <TableHead className="text-white">Concepto</TableHead>
                <TableHead className="text-white">Modalidad</TableHead>
                <TableHead className="text-white text-right">Monto BS</TableHead>
                <TableHead className="text-white text-right">Monto $</TableHead>
                <TableHead className="text-white">Asesor</TableHead>
                {canDelete && <TableHead className="text-white">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="text-xs font-mono">{g.hora}</TableCell>
                  <TableCell className="font-medium">{g.concepto}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs">
                      {g.modalidad}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">{fmt(g.montoBs)}</TableCell>
                  <TableCell className="text-right text-sm font-medium">${fmt(g.montoUsd)}</TableCell>
                  <TableCell className="text-sm">{g.asesor}</TableCell>
                  {canDelete && (
                    <TableCell>
                      <Button variant="destructive" size="sm" onClick={() => del(g.id)}>
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
