"use client"

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Package, Loader2 } from 'lucide-react'

interface Producto {
  codigo: string
  descripcion: string
  um?: string
  ubicacion?: string
  costo?: number
}

interface Props {
  onSelect: (p: Producto) => void
}

export function ProductoSearcher({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<Producto[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [total, setTotal] = useState(0)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounce de la búsqueda para no spammear la API
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResultados([])
      setShowResults(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/productos?q=${encodeURIComponent(query.trim())}&limit=10`)
        if (res.ok) {
          const data = await res.json()
          setResultados(data.productos ?? [])
          setTotal(data.total ?? 0)
          setShowResults(true)
        }
      } catch (e) {
        console.error('Error buscando productos:', e)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Cerrar resultados al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function seleccionar(p: Producto) {
    onSelect(p)
    setQuery('')
    setResultados([])
    setShowResults(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por código o descripción (ej: reloj, caja, cadena, SERVT2016...)"
          className="pl-10 pr-10"
          onFocus={() => query.length >= 2 && setShowResults(true)}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-emerald-600" />
        )}
      </div>

      {/* Resultados desplegables */}
      {showResults && !loading && resultados.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-emerald-200 rounded-md shadow-lg max-h-[400px] overflow-y-auto">
          {resultados.map((p, i) => (
            <button
              key={`${p.codigo}-${i}`}
              type="button"
              onClick={() => seleccionar(p)}
              className="w-full text-left px-3 py-2 hover:bg-emerald-50 border-b border-emerald-100 last:border-0 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-mono">
                      {p.codigo}
                    </Badge>
                    <span className="text-sm text-foreground truncate">{p.descripcion}</span>
                  </div>
                  {(p.um || p.ubicacion || p.costo) && (
                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                      {p.um && <span>UM: {p.um}</span>}
                      {p.ubicacion && <span>📍 {p.ubicacion}</span>}
                      {p.costo && <span>💰 ${p.costo.toFixed(2)}</span>}
                    </div>
                  )}
                </div>
                <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </button>
          ))}
          <div className="px-3 py-2 text-xs text-muted-foreground bg-emerald-50">
            Mostrando {resultados.length} de {total} productos
          </div>
        </div>
      )}

      {/* Sin resultados */}
      {showResults && !loading && resultados.length === 0 && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-amber-200 rounded-md shadow-lg p-3 text-sm text-amber-700">
          No se encontraron productos para "<b>{query}</b>". Puedes escribir manualmente abajo.
        </div>
      )}
    </div>
  )
}
