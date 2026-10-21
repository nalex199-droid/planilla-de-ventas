"use client"

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Search, Package, Loader2, Database } from 'lucide-react'

interface Producto {
  codigo: string
  descripcion: string
  um?: string
  ubicacion?: string
  costo?: number
}

export function CatalogoProductos() {
  const [query, setQuery] = useState('')
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Cargar primeros productos al montar
  useEffect(() => {
    cargarProductos('')
  }, [])

  function cargarProductos(q: string) {
    setLoading(true)
    const url = q.trim() ? `/api/productos?q=${encodeURIComponent(q.trim())}&limit=50` : '/api/productos?limit=50'
    fetch(url)
      .then(r => r.json())
      .then(d => {
        setProductos(d.productos ?? [])
        setTotal(d.total ?? 0)
        setHasSearched(true)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  // Debounce para búsqueda
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      cargarProductos(query)
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-emerald-700 flex items-center gap-2">
          <Database className="w-5 h-5" /> Catálogo de Productos
        </h2>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          {total.toLocaleString('es-VE')} productos
        </Badge>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          className="max-w-md"
          placeholder="Buscar por código o descripción..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {loading && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
      </div>

      {!hasSearched ? (
        <p className="text-sm text-muted-foreground text-center py-10">Cargando productos...</p>
      ) : productos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          No se encontraron productos para "{query}"
        </p>
      ) : (
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-emerald-700 text-white z-10">
              <TableRow className="hover:bg-emerald-700 border-emerald-800">
                <TableHead className="text-white">#</TableHead>
                <TableHead className="text-white">Código</TableHead>
                <TableHead className="text-white">Descripción</TableHead>
                <TableHead className="text-white">U.M</TableHead>
                <TableHead className="text-white">Ubicación</TableHead>
                <TableHead className="text-white text-right">Costo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productos.map((p, i) => (
                <TableRow key={`${p.codigo}-${i}`} className="text-xs">
                  <TableCell className="font-mono">{i + 1}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-mono">
                      {p.codigo}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{p.descripcion}</TableCell>
                  <TableCell className="text-xs">{p.um ?? '-'}</TableCell>
                  <TableCell className="text-xs">{p.ubicacion ?? '-'}</TableCell>
                  <TableCell className="text-right font-medium">
                    {p.costo ? `$${p.costo.toFixed(2)}` : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {hasSearched && (
        <div className="mt-3 text-xs text-muted-foreground text-center">
          Mostrando {productos.length} de {total.toLocaleString('es-VE')} productos
          {query && ` para "${query}"`}
        </div>
      )}
    </Card>
  )
}
