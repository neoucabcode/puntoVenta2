import { useState, useCallback } from 'react'
import { useEmpresaConfig } from '../hooks/useEmpresaConfig'
import { actualizarConfigSku, regenerarSkusEnLote, type EmpresaConfigSku } from '../lib/sku'
import { exportarCatalogo } from '../lib/catalogo'

type WizardStep = 'intro' | 'config' | 'confirm' | 'executing' | 'result'

type Props = {
  onClose: () => void
}

export function RegenerarSkuWizard({ onClose }: Props) {
  const { config, refetch: refetchConfig } = useEmpresaConfig()

  // ── Wizard state ──
  const [step, setStep] = useState<WizardStep>('intro')
  const [exportedFirst, setExportedFirst] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Form state (initialized from config)
  const [autogenerar, setAutogenerar] = useState(config?.autogenerar_activo ?? false)
  const [plantilla, setPlantilla] = useState<EmpresaConfigSku['plantilla']>(
    config?.plantilla ?? 'solo_secuencial'
  )
  const [modoContador, setModoContador] = useState<EmpresaConfigSku['modo_contador']>(
    config?.modo_contador ?? 'global'
  )
  const [longitud, setLongitud] = useState<number>(config?.longitud_secuencial ?? 4)
  const [prefijo, setPrefijo] = useState<string>(config?.prefijo_manual ?? '')

  // Result state
  const [regenerados, setRegenerados] = useState(0)
  const [errores, setErrores] = useState<Array<{ producto_id: string; error: string }>>([])
  const [execError, setExecError] = useState('')

  // ── Handlers ──
  const handleExportFirst = useCallback(async () => {
    if (!config) return
    setExporting(true)
    try {
      const { blob } = await exportarCatalogo(config.empresa_id)
      // Trigger browser download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `catalogo-backup-${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setExportedFirst(true)
    } catch (err) {
      console.error('[Wizard] Error exportando catálogo:', err)
      // Continuar de todas formas — la export es opcional
    } finally {
      setExporting(false)
    }
  }, [config])

  const handleAdvanceToConfig = useCallback(() => {
    // Reset form from current config (in case user closed/reopened)
    if (config) {
      setAutogenerar(config.autogenerar_activo)
      setPlantilla(config.plantilla)
      setModoContador(config.modo_contador)
      setLongitud(config.longitud_secuencial)
      setPrefijo(config.prefijo_manual ?? '')
    }
    setStep('config')
  }, [config])

  const handleAdvanceToConfirm = useCallback(() => {
    setStep('confirm')
  }, [])

  const handleExecute = useCallback(async () => {
    if (!config) return
    setStep('executing')
    setExecError('')
    try {
      // 1. Save new config first (so generar_sku uses the new template)
      await actualizarConfigSku(config.empresa_id, {
        autogenerar_activo: autogenerar,
        plantilla,
        modo_contador: modoContador,
        longitud_secuencial: longitud,
        prefijo_manual: plantilla === 'prefijo_fijo_secuencial' ? (prefijo || null) : null,
      })
      // 2. Regenerate all SKUs (RPC resets counters internally)
      const result = await regenerarSkusEnLote(config.empresa_id)
      setRegenerados(result.regenerados)
      setErrores(result.errores)
      // 3. Refresh config to reflect changes
      await refetchConfig()
      setStep('result')
    } catch (err) {
      console.error('[Wizard] Error regenerando:', err)
      setExecError((err as Error).message)
      setStep('result')
    }
  }, [config, autogenerar, plantilla, modoContador, longitud, prefijo, refetchConfig])

  // ── Render ──
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wizard" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Regenerar todos los SKU</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <div className="modal-body">
          {step === 'intro' && (
            <div className="wizard-step">
              <p className="wizard-warning">
                <strong>⚠️ Acción irreversible.</strong> Se van a regenerar los SKU de todos
                los productos de tu empresa, reseteando los contadores.
              </p>

              <p className="wizard-explain">
                Te recomendamos <strong>exportar el catálogo actual</strong> como backup
                antes de continuar. Si tenés SKU viejos que querés conservar, este es el
                momento.
              </p>

              <div className="wizard-export-options">
                <button
                  type="button"
                  className="primary"
                  onClick={handleExportFirst}
                  disabled={exporting || !config}
                >
                  {exporting ? 'Exportando…' : '📦 Exportar catálogo primero'}
                </button>
                <button
                  type="button"
                  onClick={handleAdvanceToConfig}
                  disabled={!config}
                >
                  Continuar sin exportar →
                </button>
              </div>

              {exportedFirst && (
                <p className="wizard-info">
                  ✓ Catálogo exportado. Ahora podés continuar.
                </p>
              )}
            </div>
          )}

          {step === 'config' && (
            <div className="wizard-step">
              <p className="wizard-explain">
                Definí cómo querés que se vean los nuevos SKU. Esta configuración
                se va a guardar ANTES de regenerar.
              </p>

              <div className="config-fields-grid">
                <label className="config-field">
                  <span className="config-field-label">Formato</span>
                  <select
                    value={plantilla}
                    onChange={(e) => setPlantilla(e.target.value as EmpresaConfigSku['plantilla'])}
                  >
                    <option value="categoria_secuencial">Categoría secuencial (FER-001)</option>
                    <option value="solo_secuencial">Solo secuencial (001)</option>
                    <option value="prefijo_fijo_secuencial">Prefijo fijo (FER-001)</option>
                  </select>
                </label>

                <label className="config-field">
                  <span className="config-field-label">Contador</span>
                  <select
                    value={modoContador}
                    onChange={(e) => setModoContador(e.target.value as EmpresaConfigSku['modo_contador'])}
                  >
                    <option value="por_categoria">Por categoría</option>
                    <option value="global">Global</option>
                  </select>
                </label>

                <label className="config-field">
                  <span className="config-field-label">Longitud</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={longitud}
                    onChange={(e) => setLongitud(Number(e.target.value))}
                  />
                </label>

                {plantilla === 'prefijo_fijo_secuencial' && (
                  <label className="config-field">
                    <span className="config-field-label">Prefijo</span>
                    <input
                      type="text"
                      value={prefijo}
                      onChange={(e) => setPrefijo(e.target.value.toUpperCase())}
                      placeholder="Ej: FER"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </label>
                )}
              </div>

              <div className="wizard-actions">
                <button type="button" onClick={() => setStep('intro')}>
                  ← Volver
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={handleAdvanceToConfirm}
                  disabled={
                    plantilla === 'prefijo_fijo_secuencial' && !prefijo.trim()
                  }
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="wizard-step">
              <p className="wizard-warning">
                <strong>Última confirmación.</strong> Esta acción no se puede deshacer.
              </p>

              <div className="wizard-summary">
                <p><strong>Formato:</strong> {plantilla === 'categoria_secuencial' ? 'Categoría secuencial' : plantilla === 'solo_secuencial' ? 'Solo secuencial' : 'Prefijo fijo'}</p>
                <p><strong>Contador:</strong> {modoContador === 'por_categoria' ? 'Por categoría' : 'Global'}</p>
                <p><strong>Longitud:</strong> {longitud} dígitos</p>
                {plantilla === 'prefijo_fijo_secuencial' && (
                  <p><strong>Prefijo:</strong> {prefijo || '(vacío)'}</p>
                )}
              </div>

              <p className="wizard-explain">
                Los SKU actuales se van a <strong>borrar y reemplazar</strong> con los nuevos.
                Los contadores arrancan desde 1.
              </p>

              <div className="wizard-actions">
                <button type="button" onClick={() => setStep('config')}>
                  ← Volver
                </button>
                <button
                  type="button"
                  className="primary"
                  style={{ background: 'var(--off)', color: '#fff' }}
                  onClick={handleExecute}
                >
                  Regenerar SKU
                </button>
              </div>
            </div>
          )}

          {step === 'executing' && (
            <div className="wizard-step wizard-center">
              <div className="config-loading-spinner" />
              <p>Regenerando SKU de todos los productos…</p>
              <p className="wizard-explain">
                Esto puede tardar unos segundos.
              </p>
            </div>
          )}

          {step === 'result' && (
            <div className="wizard-step">
              {execError ? (
                <>
                  <p className="wizard-error">
                    <strong>Error:</strong> {execError}
                  </p>
                </>
              ) : (
                <>
                  <p className="wizard-success">
                    ✓ <strong>{regenerados}</strong> productos regenerados.
                  </p>
                  {errores.length > 0 && (
                    <div className="wizard-errors">
                      <p>
                        <strong>{errores.length} errores:</strong>
                      </p>
                      <ul>
                        {errores.slice(0, 5).map((e, i) => (
                          <li key={i}>
                            <code>{e.producto_id.slice(0, 8)}…</code>: {e.error}
                          </li>
                        ))}
                        {errores.length > 5 && (
                          <li>…y {errores.length - 5} más</li>
                        )}
                      </ul>
                    </div>
                  )}
                </>
              )}

              <div className="wizard-actions">
                <button type="button" className="primary" onClick={onClose}>
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
