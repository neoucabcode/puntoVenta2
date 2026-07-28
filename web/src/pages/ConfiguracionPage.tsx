import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useUsuarioRol } from '../hooks/useUsuarioRol'
import { useEmpresaConfig } from '../hooks/useEmpresaConfig'
import { useModulos } from '../hooks/useModulos'
import { obtenerMiEmpresa, actualizarMiEmpresa } from '../lib/empresa'
import { actualizarConfigSku } from '../lib/sku'
import { toggleModulo, MODULOS_DISPONIBLES } from '../lib/modulos'
import { ConfirmModal } from '../components/ConfirmModal'

type TabId = 'sku' | 'empresa' | 'modulos'

const TAB_LABELS: Record<TabId, string> = {
  sku: 'SKU',
  empresa: 'Empresa',
  modulos: 'Módulos',
}

const MODULO_LABELS: Record<string, string> = {
  catalogo: 'Catálogo',
  venta: 'Venta',
  inventario: 'Inventario',
  caja: 'Caja',
  reportes: 'Reportes',
}

export function ConfiguracionPage() {
  const { esAdmin, loading: rolLoading } = useUsuarioRol()
  const { config, loading: configLoading } = useEmpresaConfig()
  const { modulos, loading: modulosLoading, refrescar: refrescarModulos } = useModulos()

  const [activeTab, setActiveTab] = useState<TabId>('sku')

  // SKU state
  const [skuAutogenerar, setSkuAutogenerar] = useState(false)
  const [skuPlantilla, setSkuPlantilla] = useState<string>('solo_secuencial')
  const [skuModoContador, setSkuModoContador] = useState<string>('global')
  const [skuLongitud, setSkuLongitud] = useState<number>(4)
  const [skuPrefijo, setSkuPrefijo] = useState<string>('')
  const [skuUmbral, setSkuUmbral] = useState<number>(0.3)
  const [skuSaved, setSkuSaved] = useState(false)
  const [skuSaving, setSkuSaving] = useState(false)

  // Empresa state
  const [tasaActiva, setTasaActiva] = useState<number>(0)
  const [igtfHabilitado, setIgtfHabilitado] = useState(false)
  const [ventaSinStock, setVentaSinStock] = useState(false)
  const [stockNegativo, setStockNegativo] = useState(false)
  const [empresaSaved, setEmpresaSaved] = useState(false)
  const [empresaSaving, setEmpresaSaving] = useState(false)

  // Modulos state
  const [moduloToToggle, setModuloToToggle] = useState<{ nombre: string; habilitado: boolean } | null>(null)
  const [moduloSaving, setModuloSaving] = useState(false)

  // Initialize SKU state from config when loaded
  const configRefLoaded = useState({ done: false })
  if (config && !configRefLoaded[0].done) {
    configRefLoaded[0].done = true
    setSkuAutogenerar(config.autogenerar_activo)
    setSkuPlantilla(config.plantilla)
    setSkuModoContador(config.modo_contador)
    setSkuLongitud(config.longitud_secuencial)
    setSkuPrefijo(config.prefijo_manual ?? '')
    setSkuUmbral(config.umbral_similitud)
  }

  // Initialize empresa state
  const empresaRefLoaded = useState({ done: false })
  const [empresaData, setEmpresaData] = useState<Awaited<ReturnType<typeof obtenerMiEmpresa>>>(null)
  useState(() => {
    obtenerMiEmpresa().then((e) => {
      setEmpresaData(e)
      if (e && !empresaRefLoaded[0].done) {
        empresaRefLoaded[0].done = true
        setTasaActiva(e.tasa_activa)
        setIgtfHabilitado(e.igtf_habilitado)
        setVentaSinStock(e.venta_sin_stock)
        setStockNegativo(e.stock_negativo)
      }
    })
  })

  // Guard
  if (rolLoading) return <p className="center">Cargando…</p>
  if (!esAdmin) return <Navigate to="/" replace />

  const loading = configLoading || modulosLoading

  async function handleSaveSku() {
    if (!config) return
    setSkuSaving(true)
    try {
      await actualizarConfigSku(config.empresa_id, {
        autogenerar_activo: skuAutogenerar,
        plantilla: skuPlantilla as any,
        modo_contador: skuModoContador as any,
        longitud_secuencial: skuLongitud,
        prefijo_manual: skuPrefijo || null,
        umbral_similitud: skuUmbral,
      })
      setSkuSaved(true)
      setTimeout(() => setSkuSaved(false), 2000)
    } catch (err) {
      console.error('[Configuracion] Error al guardar SKU:', err)
    } finally {
      setSkuSaving(false)
    }
  }

  async function handleSaveEmpresa() {
    setEmpresaSaving(true)
    try {
      await actualizarMiEmpresa({
        tasa_activa: tasaActiva,
        igtf_habilitado: igtfHabilitado,
        venta_sin_stock: ventaSinStock,
        stock_negativo: stockNegativo,
      })
      setEmpresaSaved(true)
      setTimeout(() => setEmpresaSaved(false), 2000)
    } catch (err) {
      console.error('[Configuracion] Error al guardar empresa:', err)
    } finally {
      setEmpresaSaving(false)
    }
  }

  async function handleToggleModulo() {
    if (!moduloToToggle) return
    setModuloSaving(true)
    try {
      await toggleModulo(moduloToToggle.nombre, moduloToToggle.habilitado)
      await refrescarModulos()
      setModuloToToggle(null)
    } catch (err) {
      console.error('[Configuracion] Error al toggle módulo:', err)
    } finally {
      setModuloSaving(false)
    }
  }

  if (loading) return <p className="center">Cargando…</p>

  return (
    <div className="config-page">
      <h1>Configuración</h1>

      {/* Tabs */}
      <div className="config-tabs">
        {(Object.keys(TAB_LABELS) as TabId[]).map((tab) => (
          <button
            key={tab}
            className={`config-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* SKU Tab */}
      <div className="config-section" hidden={activeTab !== 'sku'}>
          <label className="config-toggle-row">
            <span>Autogenerar SKU</span>
            <input
              type="checkbox"
              checked={skuAutogenerar}
              onChange={(e) => setSkuAutogenerar(e.target.checked)}
            />
          </label>

          <label className="config-field">
            Plantilla
            <select value={skuPlantilla} onChange={(e) => setSkuPlantilla(e.target.value)}>
              <option value="categoria_secuencial">Categoría secuencial</option>
              <option value="solo_secuencial">Solo secuencial</option>
              <option value="prefijo_fijo_secuencial">Prefijo fijo secuencial</option>
            </select>
          </label>

          <label className="config-field">
            Modo contador
            <select value={skuModoContador} onChange={(e) => setSkuModoContador(e.target.value)}>
              <option value="por_categoria">Por categoría</option>
              <option value="global">Global</option>
            </select>
          </label>

          <label className="config-field">
            Longitud secuencial
            <input
              type="number"
              min={1}
              max={10}
              value={skuLongitud}
              onChange={(e) => setSkuLongitud(Number(e.target.value))}
            />
          </label>

          <label className="config-field">
            Prefijo
            <input
              type="text"
              value={skuPrefijo}
              onChange={(e) => setSkuPrefijo(e.target.value)}
              placeholder="Ej: FER"
            />
          </label>

          <label className="config-field">
            Umbral de similitud ({skuUmbral})
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={skuUmbral}
              onChange={(e) => setSkuUmbral(Number(e.target.value))}
            />
          </label>

          <div className="config-save-row">
            {skuSaved && <span className="config-saved">Guardado</span>}
            <button className="primary" onClick={handleSaveSku} disabled={skuSaving}>
              {skuSaving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
      </div>

      {/* Empresa Tab */}
      <div className="config-section" hidden={activeTab !== 'empresa'}>
          <label className="config-field">
            Tasa activa
            <input
              type="number"
              min={0}
              step={0.01}
              value={tasaActiva}
              onChange={(e) => setTasaActiva(Number(e.target.value))}
            />
          </label>

          <label className="config-toggle-row">
            <span>IGTF habilitado</span>
            <input
              type="checkbox"
              checked={igtfHabilitado}
              onChange={(e) => setIgtfHabilitado(e.target.checked)}
            />
          </label>

          <label className="config-toggle-row">
            <span>Venta sin stock</span>
            <input
              type="checkbox"
              checked={ventaSinStock}
              onChange={(e) => setVentaSinStock(e.target.checked)}
            />
          </label>

          <label className="config-toggle-row">
            <span>Stock negativo</span>
            <input
              type="checkbox"
              checked={stockNegativo}
              onChange={(e) => setStockNegativo(e.target.checked)}
            />
          </label>

          <div className="config-save-row">
            {empresaSaved && <span className="config-saved">Guardado</span>}
            <button className="primary" onClick={handleSaveEmpresa} disabled={empresaSaving}>
              {empresaSaving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
      </div>

      {/* Módulos Tab */}
      <div className="config-section" hidden={activeTab !== 'modulos'}>
          {MODULOS_DISPONIBLES.map((nombre) => {
            const mod = modulos.find((m) => m.modulo === nombre)
            const habilitado = mod?.habilitado ?? false
            return (
              <label key={nombre} className="config-toggle-row">
                <span>{MODULO_LABELS[nombre] ?? nombre}</span>
                <input
                  type="checkbox"
                  checked={habilitado}
                  onChange={(e) =>
                    setModuloToToggle({ nombre, habilitado: e.target.checked })
                  }
                />
              </label>
            )
          })}
      </div>

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
