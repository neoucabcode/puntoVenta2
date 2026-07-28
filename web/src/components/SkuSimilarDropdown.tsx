import { useEffect } from 'react'

type ProductoSimilar = {
  id: string
  nombre: string
  sku: string
  similitud: number
}

type Props = {
  productos: ProductoSimilar[]
  onSelect: (producto: ProductoSimilar) => void
  onDismiss: () => void
}

export function SkuSimilarDropdown({ productos, onSelect, onDismiss }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])

  if (productos.length === 0) return null

  return (
    <div className="sku-similar-dropdown" role="listbox">
      {productos.map((producto) => (
        <button
          key={producto.id}
          type="button"
          className="sku-similar-item"
          role="option"
          onClick={() => onSelect(producto)}
        >
          <span className="sku-similar-nombre">{producto.nombre}</span>
          <span className="sku-similar-sku">{producto.sku}</span>
          <span className="sku-similar-similitud badge warn">
            {Math.round(producto.similitud * 100)}%
          </span>
        </button>
      ))}
    </div>
  )
}