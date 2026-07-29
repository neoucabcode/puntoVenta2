import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { useUsuarioRol } from '../hooks/useUsuarioRol'
import { useEmpresaConfig } from '../hooks/useEmpresaConfig'
import { useModulos } from '../hooks/useModulos'
import { obtenerMiEmpresa, obtenerMiEmpresaId, actualizarMiEmpresa } from '../lib/empresa'
import { actualizarConfigSku } from '../lib/sku'
import { toggleModulo, MODULOS_DISPONIBLES } from '../lib/modulos'
import { ConfirmModal } from '../components/ConfirmModal'

type TabId = 'sku' | 'empresa' | 'modulos'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'sku', label: 'SKU', icon: 'label' },
  { id: 'empresa', label: 'Empresa', icon: 'business' },
  { id: 'modulos', label: 'Módulos', icon: 'view_module' },
]

const MODULO_LABELS: Record<string, string> = {
  catalogo: 'Catálogo',
  venta: 'Venta',
  inventario: 'Inventario',
  caja: 'Caja',
  reportes: 'Reportes',
}

const MODULO_DESCRIPCIONES: Record<string, string> = {
  catalogo: 'Gestión de productos, categorías e imágenes',
  venta: 'Punto de venta y procesamiento de cobros',
  inventario: 'Control de stock, ajustes y movimientos',
  caja: 'Arqueo de caja y arqueo diario',
  reportes: 'Estadísticas, ventas y reportes de negocio',
}

export function ConfiguracionPage() {
  const { esAdmin, loading: rolLoading } = useUsuarioRol()
  const { config, loading: configLoading, refetch: refetchConfig } = useEmpresaConfig()
  const { modulos, loading: modulosLoading, refrescar: refrescarModulos } = useModulos()

  const [activeTab, setActiveTab] = useState<TabId>('sku')

  // ── SKU state ──
  const [skuAutogenerar, setSkuAutogenerar] = useState(false)
  const [skuPlantilla, setSkuPlantilla] = useState<string>('solo_secuencial')
  const [skuModoContador, setSkuModoContador] = useState<string>('global')
  const [skuLongitud, setSkuLongitud] = useState<number>(4)
  const [skuPrefijo, setSkuPrefijo] = useState<string>('')
  const [skuUmbral, setSkuUmbral] = useState<number>(0.3)
  const [skuSaved, setSkuSaved] = useState(false)
  const [skuSaving, setSkuSaving] = useState(false)
  const [skuError, setSkuError] = useState('')

  // ── Empresa state ──
  const [tasaActiva, setTasaActiva] = useState<number>(0)
  const [igtfHabilitado, setIgtfHabilitado] = useState(false)
  const [ventaSinStock, setVentaSinStock] = useState(false)
  const [stockNegativo, setStockNegativo] = useState(false)
  const [empresaSaved, setEmpresaSaved] = useState(false)
  const [empresaSaving, setEmpresaSaving] = useState(false)
  const [empresaError, setEmpresaError] = useState('')

  // ── Modulos state ──
  const [moduloToToggle, setModuloToToggle] = useState<{ nombre: string; habilitado: boolean } | null>(null)
  const [moduloToggling, setModuloToggling] = useState(false)

  // ── Initialize SKU from config (proper useEffect) ──
  useEffect(() => {
    if (!config) return
    setSkuAutogenerar(config.autogenerar_activo)
    setSkuPlantilla(config.plantilla)
    setSkuModoContador(config.modo_contador)
    setSkuLongitud(config.longitud_secuencial)
    setSkuPrefijo(config.prefijo_manual ?? '')
    setSkuUmbral(config.umbral_similitud)
  }, [config])

  // ── Initialize empresa data ──
  const cargarEmpresa = useCallback(async () => {
    try {
      const data = await obtenerMiEmpresa()
      if (data) {
        setTasaActiva(data.tasa_activa)
        setIgtfHabilitado(data.igtf_habilitado)
        setVentaSinStock(data.venta_sin_stock)
        setStockNegativo(data.stock_negativo)
      }
    } catch (err) {
      console.error('[Configuracion] Error cargando empresa:', err)
    }
  }, [])

  useEffect(() => {
    cargarEmpresa()
  }, [cargarEmpresa])

  // ── Guards ──
  if (rolLoading) {
    return (
      <div className="config-page">
        <div className="config-loading">
          <span className="config-loading-spinner" />
          <span>Cargando configuración…</span>
        </div>
      </div>
    )
  }
  if (!esAdmin) return <Navigate to="/" replace />

  const loading = configLoading || modulosLoading

  // ── SKU Save ──
  async function handleSaveSku() {
    setSkuSaving(true)
    setSkuError('')
    try {
      const eid = config?.empresa_id ?? await obtenerMiEmpresaId()
      if (!eid) {
        setSkuError('No se pudo determinar la empresa')
        return
      }
      await actualizarConfigSku(eid, {
        autogenerar_activo: skuAutogenerar,
        plantilla: skuPlantilla as any,
        modo_contador: skuModoContador as any,
        longitud_secuencial: skuLongitud,
        prefijo_manual: skuPrefijo || null,
        umbral_similitud: skuUmbral,
      })
      setSkuSaved(true)
      refetchConfig()
      setTimeout(() => setSkuSaved(false), 2000)
    } catch (err) {
      setSkuError((err as Error).message)
    } finally {
      setSkuSaving(false)
    }
  }

  // ── Empresa Save ──
  async function handleSaveEmpresa() {
    setEmpresaSaving(true)
    setEmpresaError('')
    try {
      await actualizarMiEmpresa({
        tasa_activa: tasaActiva,
        igtf_habilitado: igtfHabilitado,
        venta_sin_stock: ventaSinStock,
        stock_negativo: stockNegativo,
      })
      setEmpresaSaved(true)
      refetchConfig()
      setTimeout(() => setEmpresaSaved(false), 2000)
    } catch (err) {
      setEmpresaError((err as Error).message)
    } finally {
      setEmpresaSaving(false)
    }
  }

  // ── Modulo Toggle ──
  async function handleToggleModulo() {
    if (!moduloToToggle) return
    setModuloToggling(true)
    try {
      await toggleModulo(moduloToToggle.nombre, moduloToToggle.habilitado)
      await refrescarModulos()
      setModuloToToggle(null)
    } catch (err) {
      console.error('[Configuracion] Error al toggle módulo:', err)
    } finally {
      setModuloToggling(false)
    }
  }

  if (loading) {
    return (
      <div className="config-page">
        <div className="config-loading">
          <span className="config-loading-spinner" />
          <span>Cargando configuración…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="config-page">
      <header className="config-topbar">
        <h1 className="config-title">Configuración</h1>
        <nav className="config-tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`config-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="material-symbols-outlined config-tab-icon">{tab.icon}</span>
              <span className="config-tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <div className="config-content">
        {/* ═══ SKU Tab ═══ */}
        {activeTab === 'sku' && (
          <div className="config-section" role="tabpanel">
            <div className="config-section-header">
              <h2>Generación automática de SKU</h2>
            </div>

            <div className="config-card">
              <div className="config-card-body">
                <label className="config-toggle-row">
                  <div className="config-toggle-info">
                    <span className="config-toggle-label">Autogenerar SKU</span>
                    <span className="config-toggle-desc">
                      Cuando está activo, los SKUs se generan automáticamente al crear productos
                    </span>
                  </div>
                  <div className={`config-switch ${skuAutogenerar ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={skuAutogenerar}
                      onChange={(e) => setSkuAutogenerar(e.target.checked)}
                    />
                    <span className="config-switch-slider" />
                  </div>
                </label>
              </div>
            </div>

            <div className="config-card">
              <div className="config-card-header">
                <h3>Plantilla de SKU</h3>
              </div>
              <div className="config-card-body">
                <div className="config-fields-grid">
                  <label className="config-field">
                    <span className="config-field-label">Formato</span>
                    <select value={skuPlantilla} onChange={(e) => setSkuPlantilla(e.target.value)}>
                      <option value="categoria_secuencial">Categoría secuencial (FER-001)</option>
                      <option value="solo_secuencial">Solo secuencial (001)</option>
                      <option value="prefijo_fijo_secuencial">Prefijo fijo (FER-001)</option>
                    </select>
                  </label>

                  <label className="config-field">
                    <span className="config-field-label">Contador</span>
                    <select value={skuModoContador} onChange={(e) => setSkuModoContador(e.target.value)}>
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
                      value={skuLongitud}
                      onChange={(e) => setSkuLongitud(Number(e.target.value))}
                    />
                  </label>

                  {(skuPlantilla === 'prefijo_fijo_secuencial') && (
                    <label className="config-field">
                      <span className="config-field-label">Prefijo</span>
                      <input
                        type="text"
                        value={skuPrefijo}
                        onChange={(e) => setSkuPrefijo(e.target.value.toUpperCase())}
                        placeholder="Ej: FER"
                        style={{ textTransform: 'uppercase' }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="config-card">
              <div className="config-card-header">
                <h3>Detección de duplicados</h3>
              </div>
              <div className="config-card-body">
                <label className="config-field">
                  <span className="config-field-label">
                    Umbral de similitud: <strong>{(skuUmbral * 100).toFixed(0)}%</strong>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={skuUmbral}
                    onChange={(e) => setSkuUmbral(Number(e.target.value))}
                  />
                  <span className="config-field-hint">
                    Productos con más de este porcentaje de similitud se marcan como posibles duplicados
                  </span>
                </label>
              </div>
            </div>

            {skuError && <p className="config-error">{skuError}</p>}
          </div>
        )}

        {/* ═══ Empresa Tab ═══ */}
        {activeTab === 'empresa' && (
          <div className="config-section" role="tabpanel">
            <div className="config-section-header">
              <h2>Datos de la empresa</h2>
            </div>

            <div className="config-card">
              <div className="config-card-header">
                <h3>Tasa de cambio</h3>
              </div>
              <div className="config-card-body">
                <label className="config-field">
                  <span className="config-field-label">Tasa activa (Bs/USD)</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={tasaActiva}
                    onChange={(e) => setTasaActiva(Number(e.target.value))}
                  />
                  <span className="config-field-hint">
                    Tasa del BCV para conversión de precios
                  </span>
                </label>
              </div>
            </div>

            <div className="config-card">
              <div className="config-card-header">
                <h3>Impuestos y reglas</h3>
              </div>
              <div className="config-card-body">
                <label className="config-toggle-row">
                  <div className="config-toggle-info">
                    <span className="config-toggle-label">IGTF habilitado</span>
                    <span className="config-toggle-desc">
                      Impuesto al Grandes Transacciones Financieras (3% en pagos BS)
                    </span>
                  </div>
                  <div className={`config-switch ${igtfHabilitado ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={igtfHabilitado}
                      onChange={(e) => setIgtfHabilitado(e.target.checked)}
                    />
                    <span className="config-switch-slider" />
                  </div>
                </label>

                <label className="config-toggle-row">
                  <div className="config-toggle-info">
                    <span className="config-toggle-label">Venta sin stock</span>
                    <span className="config-toggle-desc">
                      Permitir vender aunque no haya stock disponible
                    </span>
                  </div>
                  <div className={`config-switch ${ventaSinStock ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={ventaSinStock}
                      onChange={(e) => setVentaSinStock(e.target.checked)}
                    />
                    <span className="config-switch-slider" />
                  </div>
                </label>

                <label className="config-toggle-row">
                  <div className="config-toggle-info">
                    <span className="config-toggle-label">Stock negativo</span>
                    <span className="config-toggle-desc">
                      Permitir que el stock baje de cero
                    </span>
                  </div>
                  <div className={`config-switch ${stockNegativo ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={stockNegativo}
                      onChange={(e) => setStockNegativo(e.target.checked)}
                    />
                    <span className="config-switch-slider" />
                  </div>
                </label>
              </div>
            </div>

            {empresaError && <p className="config-error">{empresaError}</p>}
          </div>
        )}

        {/* ═══ Modulos Tab ═══ */}
        {activeTab === 'modulos' && (
          <div className="config-section" role="tabpanel">
            <div className="config-section-header">
              <h2>Módulos de la aplicación</h2>
            </div>

            <div className="config-modulos-grid">
              {MODULOS_DISPONIBLES.map((nombre) => {
                const mod = modulos.find((m) => m.modulo === nombre)
                const habilitado = mod?.habilitado ?? false
                return (
                  <div key={nombre} className={`config-modulo-card ${habilitado ? 'enabled' : 'disabled'}`}>
                    <div className="config-modulo-info">
                      <span className="config-modulo-name">{MODULO_LABELS[nombre] ?? nombre}</span>
                      <span className="config-modulo-desc">{MODULO_DESCRIPCIONES[nombre] ?? ''}</span>
                    </div>
                    <div className={`config-switch ${habilitado ? 'on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={habilitado}
                        disabled={moduloToggling}
                        onChange={(e) =>
                          setModuloToToggle({ nombre, habilitado: e.target.checked })
                        }
                      />
                      <span className="config-switch-slider" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sticky save bar */}
      {activeTab !== 'modulos' && (
        <div className="config-save-bar">
          <div className="config-save-inner">
            {activeTab === 'sku' && skuSaved && <span className="config-saved">✓ Guardado</span>}
            {activeTab === 'empresa' && empresaSaved && <span className="config-saved">✓ Guardado</span>}
            <button
              className="config-btn-primary"
              onClick={activeTab === 'sku' ? handleSaveSku : handleSaveEmpresa}
              disabled={activeTab === 'sku' ? skuSaving : empresaSaving}
            >
              {(activeTab === 'sku' ? skuSaving : empresaSaving) ? 'Guardando…' : activeTab === 'sku' ? 'Guardar SKU' : 'Guardar Empresa'}
            </button>
          </div>
        </div>
      )}

      {/* Confirm modal for module toggle */}
      {moduloToToggle && (
        <ConfirmModal
          titulo={moduloToToggle.habilitado ? 'Habilitar módulo' : 'Deshabilitar módulo'}
          mensaje={
            moduloToToggle.habilitado
              ? `¿Habilitar el módulo "${MODULO_LABELS[moduloToToggle.nombre] ?? moduloToToggle.nombre}"?`
              : `¿Deshabilitar el módulo "${MODULO_LABELS[moduloToToggle.nombre] ?? moduloToToggle.nombre}"? Esto puede afectar funciones activas.`
          }
          textoConfirmar={moduloToToggle.habilitado ? 'Habilitar' : 'Deshabilitar'}
          variante={moduloToToggle.habilitado ? 'advertencia' : 'peligro'}
          onConfirm={handleToggleModulo}
          onCancel={() => setModuloToToggle(null)}
        />
      )}
    </div>
  )
}
