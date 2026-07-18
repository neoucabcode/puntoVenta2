import { useState, useEffect, type FormEvent } from 'react'
import {
  crearProducto,
  actualizarProducto,
  subirImagenProducto,
  verificarSkuDuplicado,
  verificarCodigoDuplicado,
  type Categoria,
  type Producto,
  type ProductoInput,
} from '../lib/productos'
import { obtenerMiEmpresaId } from '../lib/empresa'

type Props = {
  producto: Producto | null
  categorias: Categoria[]
  onClose: () => void
  onSaved: (p: Producto) => void
}

export function ProductoForm({ producto, categorias, onClose, onSaved }: Props) {
  const esEdicion = producto !== null
  const [nombre, setNombre] = useState(producto?.nombre ?? '')
  const [sku, setSku] = useState(producto?.sku ?? '')
  const [codigoBarras, setCodigoBarras] = useState(producto?.codigo_barras ?? '')
  const [categoriaId, setCategoriaId] = useState(producto?.categoria_id ?? '')
  const [unidad, setUnidad] = useState(producto?.unidad ?? 'unidad')
  const [costoUsd, setCostoUsd] = useState(String(producto?.costo_usd ?? 0))
  const [precioUsd, setPrecioUsd] = useState(String(producto?.precio_usd ?? 0))
  const [stockActual, setStockActual] = useState(String(producto?.stock_actual ?? 0))
  const [stockMinimo, setStockMinimo] = useState(String(producto?.stock_minimo ?? 0))
  const [activo, setActivo] = useState(producto?.activo ?? true)
  const [imagenUrl, setImagenUrl] = useState(producto?.imagen_url ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setSaving(true)
    try {
      const base: ProductoInput = {
        nombre: nombre.trim(),
        sku: sku.trim() || null,
        codigo_barras: codigoBarras.trim() || null,
        categoria_id: categoriaId || null,
        unidad: unidad.trim() || 'unidad',
        costo_usd: parseFloat(costoUsd) || 0,
        precio_usd: parseFloat(precioUsd) || 0,
        stock_actual: parseFloat(stockActual) || 0,
        stock_minimo: parseFloat(stockMinimo) || 0,
        activo,
        imagen_url: imagenUrl.trim() || null,
      }
      const skuExistente = await verificarSkuDuplicado(sku.trim() || null, esEdicion ? producto.id : null)
      if (skuExistente) {
        setError(`Ya existe un producto con el SKU "${sku.trim()}" en esta empresa.`)
        setSaving(false)
        return
      }
      const codExistente = await verificarCodigoDuplicado(codigoBarras.trim() || null, esEdicion ? producto.id : null)
      if (codExistente) {
        setError(`Ya existe un producto con el código de barras "${codigoBarras.trim()}" en esta empresa.`)
        setSaving(false)
        return
      }
      let guardado: Producto
      if (esEdicion) {
        guardado = await actualizarProducto(producto.id, base)
      } else {
        guardado = await crearProducto(base)
      }
      // Upload por separado: si falla, el producto ya quedó guardado y el
      // usuario puede reintentar la imagen sin perder los demas datos.
      if (file) {
        try {
          const empresaId = await obtenerMiEmpresaId()
          if (!empresaId) throw new Error('No se pudo determinar la empresa')
          const url = await subirImagenProducto(file, empresaId, guardado.id)
          guardado = await actualizarProducto(guardado.id, { ...base, imagen_url: url })
        } catch (upErr) {
          setError(
            `Producto guardado, pero la imagen no se subió: ${(upErr as Error).message}`
          )
          onSaved(guardado)
          setSaving(false)
          return
        }
      }
      onSaved(guardado)
    } catch (err) {
      const msg = (err as Error).message
      if (/duplicate|unique|sku/i.test(msg)) {
        setError(`Ya existe un producto con el SKU "${sku.trim()}" en esta empresa.`)
      } else if (/codigo|codigo_barras|barras/i.test(msg)) {
        setError(`Ya existe un producto con el código de barras "${codigoBarras.trim()}" en esta empresa.`)
      } else {
        setError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{esEdicion ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <form onSubmit={onSubmit} className="form-grid">
          <label className="span-2">
            Nombre*
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </label>
          <label>
            SKU
            <input value={sku} onChange={(e) => setSku(e.target.value)} />
          </label>
          <label>
            Código de barras
            <input value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} />
          </label>
          <label>
            Categoría
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
              <option value="">— sin categoría —</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
          <label>
            Unidad
            <input value={unidad} onChange={(e) => setUnidad(e.target.value)} />
          </label>
          <label>
            Costo USD
            <input
              type="number"
              step="0.01"
              min="0"
              value={costoUsd}
              onChange={(e) => setCostoUsd(e.target.value)}
            />
          </label>
          <label>
            Precio USD*
            <input
              type="number"
              step="0.01"
              min="0"
              value={precioUsd}
              onChange={(e) => setPrecioUsd(e.target.value)}
              required
            />
          </label>
          <label>
            Stock actual
            <input
              type="number"
              step="0.01"
              min="0"
              value={stockActual}
              onChange={(e) => setStockActual(e.target.value)}
            />
          </label>
          <label>
            Stock mínimo
            <input
              type="number"
              step="0.01"
              min="0"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
            />
          </label>
          <label className="span-2">
            URL de imagen
            <input
              value={imagenUrl}
              onChange={(e) => setImagenUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>
          <label className="span-2">
            Subir imagen (opcional)
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="check span-2">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
            />
            Activo
          </label>
          {error && <p className="error span-2">{error}</p>}
          <footer className="span-2 modal-footer">
            <button type="button" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="primary" disabled={saving}>
              {saving ? 'Guardando…' : esEdicion ? 'Guardar' : 'Crear'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
