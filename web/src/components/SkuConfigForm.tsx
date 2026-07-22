import { useState, useEffect, type FormEvent } from 'react'
import { useEmpresaConfig } from '../hooks/useEmpresaConfig'
import { useUsuarioRol } from '../hooks/useUsuarioRol'
import { obtenerMiEmpresaId } from '../lib/empresa'
import {
  actualizarConfigSku,
  type EmpresaConfigSku,
} from '../lib/sku'

type Props = {
  onClose: () => void
}

const PLANTILLAS: Array<{ value: EmpresaConfigSku['plantilla']; label: string }> = [
  { value: 'categoria_secuencial', label: 'Categoría + Secuencial (FER-0001)' },
  { value: 'solo_secuencial', label: 'Solo Secuencial (0001)' },
  { value: 'prefijo_fijo_secuencial', label: 'Prefijo Fijo + Secuencial (MI-0001)' },
]

const MODOS_CONTADOR: Array<{ value: EmpresaConfigSku['modo_contador']; label: string }> = [
  { value: 'por_categoria', label: 'Por categoría' },
  { value: 'global', label: 'Global' },
]

export function SkuConfigForm({ onClose }: Props) {
  const { esAdmin } = useUsuarioRol()
  const { config, loading: configLoading } = useEmpresaConfig()

  const [plantilla, setPlantilla] = useState<EmpresaConfigSku['plantilla']>('categoria_secuencial')
  const [modoContador, setModoContador] = useState<EmpresaConfigSku['modo_contador']>('por_categoria')
  const [longitudSecuencial, setLongitudSecuencial] = useState('4')
  const [prefijoManual, setPrefijoManual] = useState('')
  const [umbralSimilitud, setUmbralSimilitud] = useState('0.3')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (config) {
      setPlantilla(config.plantilla)
      setModoContador(config.modo_contador)
      setLongitudSecuencial(String(config.longitud_secuencial))
      setPrefijoManual(config.prefijo_manual ?? '')
      setUmbralSimilitud(String(config.umbral_similitud))
    }
  }, [config])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!esAdmin) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <header className="modal-header">
            <h2>Configuración de SKU</h2>
            <button type="button" onClick={onClose} aria-label="Cerrar">×</button>
          </header>
          <div className="form-grid">
            <p className="error span-2">Solo los administradores pueden modificar la configuración de SKU.</p>
            <footer className="span-2 modal-footer">
              <button type="button" onClick={onClose}>Cerrar</button>
            </footer>
          </div>
        </div>
      </div>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const longitud = parseInt(longitudSecuencial, 10)
    if (!Number.isFinite(longitud) || longitud < 1 || longitud > 10) {
      setError('La longitud secuencial debe ser un número entre 1 y 10')
      return
    }

    const umbral = parseFloat(umbralSimilitud)
    if (!Number.isFinite(umbral) || umbral < 0 || umbral > 1) {
      setError('El umbral de similitud debe ser un número entre 0 y 1')
      return
    }

    if (plantilla === 'prefijo_fijo_secuencial' && !prefijoManual.trim()) {
      setError('El prefijo manual es obligatorio con la plantilla "Prefijo Fijo + Secuencial"')
      return
    }

    setSaving(true)
    try {
      const empresaId = await obtenerMiEmpresaId()
      if (!empresaId) throw new Error('No se pudo determinar la empresa')

      await actualizarConfigSku(empresaId, {
        plantilla,
        modo_contador: modoContador,
        longitud_secuencial: longitud,
        prefijo_manual: prefijoManual.trim() || null,
        umbral_similitud: umbral,
      })
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (configLoading) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <header className="modal-header">
            <h2>Configuración de SKU</h2>
            <button type="button" onClick={onClose} aria-label="Cerrar">×</button>
          </header>
          <div className="form-grid">
            <p className="span-2">Cargando configuración…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Configuración de SKU</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <form onSubmit={onSubmit} className="form-grid">
          <label className="span-2">
            Plantilla de SKU
            <select value={plantilla} onChange={(e) => setPlantilla(e.target.value as EmpresaConfigSku['plantilla'])}>
              {PLANTILLAS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>
          <label>
            Modo de contador
            <select value={modoContador} onChange={(e) => setModoContador(e.target.value as EmpresaConfigSku['modo_contador'])}>
              {MODOS_CONTADOR.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </label>
          <label>
            Longitud secuencial
            <input
              type="number"
              min="1"
              max="10"
              value={longitudSecuencial}
              onChange={(e) => setLongitudSecuencial(e.target.value)}
            />
          </label>
          <label className="span-2">
            Prefijo manual
            <input
              value={prefijoManual}
              onChange={(e) => setPrefijoManual(e.target.value)}
              placeholder={plantilla === 'prefijo_fijo_secuencial' ? 'Requerido con esta plantilla' : 'Opcional'}
            />
          </label>
          <label>
            Umbral de similitud (0–1)
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={umbralSimilitud}
              onChange={(e) => setUmbralSimilitud(e.target.value)}
            />
          </label>
          {error && <p className="error span-2">{error}</p>}
          <footer className="span-2 modal-footer">
            <button type="button" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar configuración'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
