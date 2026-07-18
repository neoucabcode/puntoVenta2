import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarProductos, type ProductoJoin } from '../lib/productos'

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState<ProductoJoin[]>([])
  const [navActiva, setNavActiva] = useState(true)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const s = q.trim()
    if (!s) {
      setNavActiva(true)
      setResultados([])
      return
    }
    setNavActiva(false)
    const t = setTimeout(() => {
      listarProductos({ search: s, soloActivos: false, pageSize: 8 })
        .then((r) => setResultados(r.items))
        .catch(() => setResultados([]))
    }, 200)
    return () => clearTimeout(t)
  }, [q])

  const navItems = [
    { label: 'Ir a Venta', to: '/' },
    { label: 'Ir a Catálogo', to: '/catalogo' },
    { label: 'Nuevo producto', to: '/catalogo', action: () => onClose() },
  ]

  function ir(to: string) {
    navigate(to)
    onClose()
  }

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          placeholder="Buscar producto o escribí un comando…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ul className="palette-list">
          {navActiva ? (
            navItems.map((n) => (
              <li key={n.label}>
                <button onClick={() => ir(n.to)}>
                  <span className="palette-ico">→</span> {n.label}
                </button>
              </li>
            ))
          ) : resultados.length === 0 ? (
            <li className="palette-empty">Sin coincidencias</li>
          ) : (
            resultados.map((p) => (
              <li key={p.id}>
                <button onClick={() => ir('/catalogo')}>
                  <span className="palette-ico">▤</span>
                  <span className="palette-nombre">{p.nombre}</span>
                  <code className="palette-sku">{p.sku ?? '—'}</code>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
