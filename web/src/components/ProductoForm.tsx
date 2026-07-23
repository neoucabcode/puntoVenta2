import { useState, useEffect, useCallback, type FormEvent } from 'react'
import {
  crearProducto,
  actualizarProducto,
  subirImagenProducto,
  verificarCodigoDuplicado,
  registrarHistorial,
  renombrarImagen,
  type Categoria,
  type Producto,
  type ProductoInput,
} from '../lib/productos'
import { obtenerMiEmpresaId } from '../lib/empresa'
import { generarSku, buscarProductosSimilares } from '../lib/sku'
import { useEmpresaConfig } from '../hooks/useEmpresaConfig'
import { useSkuPreview } from '../hooks/useSkuPreview'
import { useUsuarioRol } from '../hooks/useUsuarioRol'
import { SkuPreview } from './SkuPreview'
import { DuplicadoAlert } from './DuplicadoAlert'
import { ImageEditor } from './ImageEditor'
import { ImageEditorBoundary } from './ImageEditorBoundary'
import { validarImagen } from '../lib/imageUtils'

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
  const [editorImage, setEditorImage] = useState<string | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const { config } = useEmpresaConfig()
  const { esAdmin } = useUsuarioRol()
  const { skuPreview, generando: skuGenerando } = useSkuPreview(categoriaId || null)

  const autogenerarActivo = config?.autogenerar_activo ?? false
  const [autoGenEnabled, setAutoGenEnabled] = useState(autogenerarActivo)
  const [similares, setSimilares] = useState<
    Array<{ nombre: string; sku: string; similitud: number }>
  >([])
  const [showDuplicado, setShowDuplicado] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [confirmRegenerar, setConfirmRegenerar] = useState(false)

  // When config loads, sync admin toggle default
  useEffect(() => {
    setAutoGenEnabled(autogenerarActivo)
  }, [autogenerarActivo])

  // Sync SKU preview into state when auto-gen is active
  useEffect(() => {
    if (autoGenEnabled && skuPreview) {
      setSku(skuPreview)
    }
  }, [autoGenEnabled, skuPreview])

  // Listener para pegar imagen desde el portapapeles (Ctrl+V)
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const f = item.getAsFile()
          if (f) {
            const v = validarImagen(f)
            if (!v.ok) {
              setError(v.error ?? 'Imagen inválida')
              return
            }
            setEditorImage(URL.createObjectURL(f))
            setFile(f)
            setShowEditor(true)
          }
        }
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  // On edit: if product already has SKU and auto-gen is active, keep it read-only
  // (admin can uncheck to override)
  const skuReadOnly =
    esEdicion && producto?.sku
      ? autoGenEnabled && !esAdmin
      : autogenerarActivo && !esAdmin

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    const v = validarImagen(selected)
    if (!v.ok) {
      setError(v.error ?? 'Imagen inválida')
      return
    }
    setEditorImage(URL.createObjectURL(selected))
    setFile(selected)
    setShowEditor(true)
  }

  function handleEditorApply(blob: Blob) {
    console.log('[ProductoForm] handleEditorApply blob:', blob.type, blob.size)
    const processed = new File([blob], file?.name ?? 'imagen.webp', {
      type: 'image/webp',
    })
    console.log('[ProductoForm] file procesado:', processed.type, processed.size, processed.name)
    setFile(processed)
    setShowEditor(false)
    setEditorImage(null)
  }

  function handleEditorCancel() {
    setShowEditor(false)
    setEditorImage(null)
  }

  async function handleEditExisting() {
    if (!imagenUrl) return
    try {
      const res = await fetch(imagenUrl)
      const blob = await res.blob()
      const ext = imagenUrl.split('.').pop()?.split('?')[0] || 'webp'
      const mime = blob.type || `image/${ext}`
      const fileFromUrl = new File([blob], `imagen.${ext}`, { type: mime })
      setEditorImage(URL.createObjectURL(fileFromUrl))
      setFile(fileFromUrl)
      setShowEditor(true)
    } catch {
      setError('No se pudo cargar la imagen existente')
    }
  }

  function handleRemoveExisting() {
    setImagenUrl('')
    setFile(null)
  }

  const handleAutoGenToggle = useCallback(() => {
    setAutoGenEnabled((prev) => {
      const next = !prev
      if (!next) {
        setSku('')
      }
      return next
    })
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit() {
    setError('')
    if (!nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setSaving(true)
    try {
      let skuValue = sku.trim() || null

      // Generate SKU if auto-gen is active
      if (autoGenEnabled) {
        const empresaId = await obtenerMiEmpresaId()
        if (empresaId) {
          skuValue = await generarSku(empresaId, categoriaId || undefined)
        }
      }

      const base: ProductoInput = {
        nombre: nombre.trim(),
        sku: skuValue,
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
        console.log('[ProductoForm] file presente, tipo:', file.type, 'tamaño:', file.size, 'nombre:', file.name)
        try {
          const empresaId = await obtenerMiEmpresaId()
          console.log('[ProductoForm] empresaId:', empresaId)
          if (!empresaId) throw new Error('No se pudo determinar la empresa')
          if (!guardado.sku) {
            setError(
              'Producto guardado, pero no se pudo subir la imagen: el producto no tiene SKU asignado.'
            )
            onSaved(guardado)
            setSaving(false)
            return
          }
          const url = await subirImagenProducto(file, empresaId, guardado.sku)
          console.log('[ProductoForm] imagen subida, url:', url)
          guardado = await actualizarProducto(guardado.id, { ...base, imagen_url: url })
          console.log('[ProductoForm] producto actualizado con imagen_url')
        } catch (upErr) {
          console.error('[ProductoForm] ERROR subida imagen:', upErr)
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    // Fuzzy duplicate check before submit (when auto-gen active; on create always, on edit only if name changed)
    const nombreCambio = esEdicion && nombre.trim() !== (producto?.nombre ?? '').trim()
    if (autoGenEnabled && nombre.trim().length >= 3 && (!esEdicion || nombreCambio)) {
      try {
        const empresaId = await obtenerMiEmpresaId()
        if (empresaId && config?.umbral_similitud !== undefined) {
          const encontrados = await buscarProductosSimilares(
            empresaId,
            nombre.trim(),
            config.umbral_similitud
          )
          const filtrados = esEdicion
            ? encontrados.filter((s) => s.sku !== producto?.sku)
            : encontrados
          if (filtrados.length > 0) {
            setSimilares(filtrados)
            setShowDuplicado(true)
            setSaving(false)
            return
          }
        }
      } catch {
        // Fuzzy check failure is non-blocking — proceed with submit
      }
    }

    await handleSubmit()
  }

  function handleDuplicadoConfirm() {
    setShowDuplicado(false)
    handleSubmit()
  }

  function handleDuplicadoCancel() {
    setShowDuplicado(false)
  }

  async function handleRegenerarSku() {
    setConfirmRegenerar(false)
    if (!producto || !esEdicion) return
    const empresaId = await obtenerMiEmpresaId()
    if (!empresaId) return

    setRegenerating(true)
    setError('')
    try {
      const newSku = await generarSku(empresaId, producto.categoria_id || undefined)
      if (!newSku) {
        setError('No se pudo generar un nuevo SKU')
        setRegenerating(false)
        return
      }

      // Renombrar imagen si existe
      if (producto.imagen_url && producto.sku) {
        const ext = producto.imagen_url.split('.').pop()?.split('?')[0] || 'webp'
        await renombrarImagen(empresaId, producto.sku, newSku, ext)
      }

      // Actualizar producto con el nuevo SKU
      const guardado = await actualizarProducto(producto.id, {
        nombre: producto.nombre,
        sku: newSku,
      })

      // Registrar en historial
      await registrarHistorial(empresaId, producto.id, producto.nombre, 'editado', {
        campo: 'sku',
        valor_anterior: producto.sku,
        valor_nuevo: newSku,
      })

      setSku(newSku)
      onSaved(guardado)
    } catch (err) {
      setError(`Error al regenerar SKU: ${(err as Error).message}`)
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <>
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
              {autogenerarActivo && !esAdmin
                ? 'SKU (generado automáticamente)'
                : 'SKU'}
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                disabled={skuReadOnly}
                readOnly={skuReadOnly}
              />
            </label>
            {esAdmin && autogenerarActivo && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={autoGenEnabled}
                  onChange={handleAutoGenToggle}
                />
                Auto-generar SKU
              </label>
            )}
            <SkuPreview sku={autoGenEnabled ? skuPreview : null} generando={skuGenerando && autoGenEnabled} />
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
            <label className="span-2 image-upload-zone">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileSelect}
                className="sr-only"
              />
              {file ? (
                <div className="image-upload-preview">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Vista previa"
                    className="image-upload-thumb"
                  />
                  <span className="image-upload-text">
                    Imagen seleccionada — haz click para cambiar
                  </span>
                  <button
                    type="button"
                    className="image-upload-edit-btn"
                    onClick={(e) => {
                      e.preventDefault()
                      if (file) {
                        setEditorImage(URL.createObjectURL(file))
                        setShowEditor(true)
                      }
                    }}
                  >
                    <span className="material-symbols-outlined">edit</span>
                    Editar imagen
                  </button>
                </div>
              ) : imagenUrl ? (
                <div className="image-upload-preview">
                  <img
                    src={imagenUrl}
                    alt="Imagen existente"
                    className="image-upload-thumb"
                  />
                  <span className="image-upload-text">
                    Imagen actual — haz click para cambiar
                  </span>
                  <div className="image-upload-existing-actions">
                    <button
                      type="button"
                      className="image-upload-edit-btn"
                      onClick={(e) => {
                        e.preventDefault()
                        handleEditExisting()
                      }}
                    >
                      <span className="material-symbols-outlined">edit</span>
                      Editar imagen
                    </button>
                    <button
                      type="button"
                      className="image-upload-remove-btn"
                      onClick={(e) => {
                        e.preventDefault()
                        handleRemoveExisting()
                      }}
                    >
                      <span className="material-symbols-outlined">delete</span>
                      Quitar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="image-upload-empty">
                  <span className="material-symbols-outlined">add_a_photo</span>
                  <span className="image-upload-text">
                    Arrastra una imagen, pega del portapapeles (Ctrl+V) o haz click
                  </span>
                </div>
              )}
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
            {esEdicion && esAdmin && autogenerarActivo && producto?.sku && (
              <button
                type="button"
                onClick={() => setConfirmRegenerar(true)}
                disabled={saving || regenerating}
                className="secondary"
              >
                {regenerating ? 'Regenerando…' : 'Regenerar SKU'}
              </button>
            )}
            <button type="button" onClick={onClose} disabled={saving || regenerating}>Cancelar</button>
            <button type="submit" className="primary" disabled={saving || regenerating}>
              {saving ? 'Guardando…' : esEdicion ? 'Guardar' : 'Crear'}
            </button>
          </footer>
          </form>
        </div>
      </div>
      {showDuplicado && similares.length > 0 && (
        <DuplicadoAlert
          similares={similares}
          onConfirm={handleDuplicadoConfirm}
          onCancel={handleDuplicadoCancel}
        />
      )}
      {confirmRegenerar && (
        <div className="modal-backdrop" onClick={() => setConfirmRegenerar(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <header className="modal-header">
              <h2>Regenerar SKU</h2>
              <button type="button" onClick={() => setConfirmRegenerar(false)} aria-label="Cerrar">×</button>
            </header>
            <p style={{ padding: '1rem' }}>
              ¿Regenerar el SKU? El SKU actual quedará registrado en el historial.
            </p>
            <footer className="modal-footer" style={{ padding: '0 1rem 1rem' }}>
              <button type="button" onClick={() => setConfirmRegenerar(false)}>Cancelar</button>
              <button type="button" className="primary" onClick={handleRegenerarSku}>
                Confirmar
              </button>
            </footer>
          </div>
        </div>
      )}
      {showEditor && editorImage && (
        <ImageEditorBoundary onDismiss={handleEditorCancel}>
          <ImageEditor
            image={editorImage}
            onApply={handleEditorApply}
            onCancel={handleEditorCancel}
          />
        </ImageEditorBoundary>
      )}
    </>
  )
}
