import { useEffect, useState, useRef } from 'react'
import { listarProductos, type ProductoJoin } from '../lib/productos'

type Props = {
  onSelect: (producto: ProductoJoin) => void
  onClose: () => void
}

export function ProductoSearchModal({ onSelect, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<ProductoJoin[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await listarProductos({ search: search.trim(), soloActivos: false, pageSize: 20 })
        if (!cancelled) setItems(res.items)
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)
    return () => { clearTimeout(timer); cancelled = true }
  }, [search])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h3>Buscar producto para editar</h3>
          <button onClick={onClose} aria-label="Cerrar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>
        <div className="modal-body">
          <input
            ref={inputRef}
            className="buscador"
            placeholder="Buscar por nombre, SKU o código"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {loading && <p>Cargando…</p>}
          {error && <p className="error">{error}</p>}
          {!loading && items.length === 0 && search.trim().length > 0 && (
            <p>No se encontraron productos</p>
          )}
          <div className="producto-search-list">
            {items.map((p) => (
              <button
                key={p.id}
                className="producto-search-item"
                onClick={() => onSelect(p)}
              >
                <div className="producto-search-info">
                  <span className="producto-search-nombre">{p.nombre}</span>
                  <span className="producto-search-meta">
                    {p.sku && <code>{p.sku}</code>}
                    {p.categoria?.nombre && <span> · {p.categoria.nombre}</span>}
                  </span>
                </div>
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
