import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { useUIStore } from '../lib/ui-store'
import { useCajaStore } from '../store/useCajaStore'
import { abrirCaja, cerrarCaja } from '../lib/caja'
import { leerTasaSincronizada } from '../lib/tasaSync'
import { SyncStatus } from './SyncStatus'
import { HistorialVenta } from './HistorialVenta'
import { useUsuarioRol } from '../hooks/useUsuarioRol'
import { useModulos } from '../hooks/useModulos'

const TASA_EDIT_KEY = 'pv-tasa-last-edit'
const TASA_STALE_MS = 12 * 60 * 60 * 1000 // 12 horas

type NavItem = { to: string; label: string; icon: string; modulo?: string; adminOnly?: boolean }

const navItems: NavItem[] = [
  { to: '/', label: 'Venta', icon: 'point_of_sale', modulo: 'venta' },
  { to: '/catalogo', label: 'Catálogo', icon: 'inventory_2' },
  { to: '/inventario', label: 'Inventario', icon: 'inventory', modulo: 'inventario', adminOnly: true },
]

function fmtTiempoRelativo(iso: string | null): string {
  if (!iso) return 'sin registro'
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min}m`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const dias = Math.floor(hrs / 24)
  return `hace ${dias}d`
}

export function TopbarUnificada() {
  const { session } = useAuth()
  const location = useLocation()

  const setDrawer = useUIStore((s) => s.setDrawer)

  const soloActivos = useUIStore((s) => s.soloActivos)
  const toggleSoloActivos = useUIStore((s) => s.toggleSoloActivos)
  const ocultarAgotados = useUIStore((s) => s.ocultarAgotados)
  const toggleOcultarAgotados = useUIStore((s) => s.toggleOcultarAgotados)
  const setInventarioAccion = useUIStore((s) => s.setInventarioAccion)
  const triggerExportarCatalogo = useUIStore((s) => s.triggerExportarCatalogo)
  const triggerImportarCatalogo = useUIStore((s) => s.triggerImportarCatalogo)

  const cajaAbierta = useCajaStore((s) => s.cajaAbierta)
  const cajaHabilitada = useCajaStore((s) => s.cajaHabilitada)
  const tasaBCV = useCajaStore((s) => s.tasaBCV)
  const tasaActualizadaEn = useCajaStore((s) => s.tasaActualizadaEn)

  const { inventarioHabilitado } = useUsuarioRol()
  const { estaHabilitado } = useModulos()

  // Dropdown states
  const [ventasOpen, setVentasOpen] = useState(false)
  const [catalogoOpen, setCatalogoOpen] = useState(false)
  const [inventarioOpen, setInventarioOpen] = useState(false)

  // Tasa edit state
  const [editandoTasa, setEditandoTasa] = useState(false)
  const [tasaInput, setTasaInput] = useState('')
  const [tasaDesactualizada, setTasaDesactualizada] = useState(false)
  const tasaInputRef = useRef<HTMLInputElement>(null)
  const tasaValueRef = useRef('')
  const editandoTasaRef = useRef(false)  // guard: only iniciarEdicionTasa sets true, guardarTasa consumes

  // Refs for click-outside
  const ventasRef = useRef<HTMLDivElement>(null)
  const catalogoRef = useRef<HTMLDivElement>(null)
  const inventarioRef = useRef<HTMLDivElement>(null)

  // Refrescar tiempo relativo cada 60s
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

  // Chequear si la tasa está desactualizada (>12h sin editar)
  useEffect(() => {
    function checkStale() {
      try {
        const raw = localStorage.getItem(TASA_EDIT_KEY)
        if (!raw) { setTasaDesactualizada(false); return }
        const ms = Date.now() - new Date(raw).getTime()
        setTasaDesactualizada(ms > TASA_STALE_MS)
      } catch { setTasaDesactualizada(false) }
    }
    checkStale()
  }, [])

  function iniciarEdicionTasa() {
    const val = String(tasaBCV)
    setTasaInput(val)
    tasaValueRef.current = val
    editandoTasaRef.current = true
    setEditandoTasa(true)
    setTimeout(() => tasaInputRef.current?.select(), 50)
  }

  function guardarTasa() {
    if (!editandoTasaRef.current) return
    editandoTasaRef.current = false

    const raw = tasaValueRef.current
    const num = parseFloat(raw.replace(',', '.'))
    if (!isNaN(num) && num > 0) {
      useCajaStore.getState().setTasaBCV(num)
      const now = new Date().toISOString()
      localStorage.setItem(TASA_EDIT_KEY, now)
      setTasaDesactualizada(false)
    }
    setEditandoTasa(false)
  }

  function cancelarEdicionTasa() {
    setEditandoTasa(false)
  }

  // Filtrar nav: otros módulos requieren habilitación
  const items = navItems.filter((i) => {
    if (!i.modulo) return true
    if (i.adminOnly && !inventarioHabilitado) return false
    return estaHabilitado(i.modulo)
  })

  // Cerrar drawer en navegación
  useEffect(() => { setDrawer(false) }, [location.pathname, setDrawer])

  // Click-outside: close all dropdowns
  useEffect(() => {
    const anyOpen = ventasOpen || catalogoOpen || inventarioOpen
    if (!anyOpen) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (ventasRef.current && !ventasRef.current.contains(target)) setVentasOpen(false)
      if (catalogoRef.current && !catalogoRef.current.contains(target)) setCatalogoOpen(false)
      if (inventarioRef.current && !inventarioRef.current.contains(target)) setInventarioOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [ventasOpen, catalogoOpen, inventarioOpen])

  // Close all dropdowns on navigation
  useEffect(() => {
    setVentasOpen(false)
    setCatalogoOpen(false)
    setInventarioOpen(false)
  }, [location.pathname])

  function closeAllDropdowns() {
    setVentasOpen(false)
    setCatalogoOpen(false)
    setInventarioOpen(false)
  }

  async function onToggleCaja() {
    const s = useCajaStore.getState()
    try {
      if (s.cajaAbierta) {
        if (s.sesionCajaId) await cerrarCaja(s.sesionCajaId)
      } else {
        await abrirCaja('0')
      }
      await s.refrescar()
    } catch { /* silently reflected by refrescar */ }
  }

  const initials = (session?.user?.email ?? '?').slice(0, 1).toUpperCase()

  return (
    <header className="topbar-unified">
      {/* ——— Left: nav icons ——— */}
      <nav className="topbar-nav">
        {items.map((item) => {
          // Venta dropdown
          if (item.to === '/') {
            return (
              <div key={item.to} className="topbar-nav-item" ref={ventasRef}>
                <NavLink to="/" end className="topbar-nav-btn">
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
                <button
                  className="topbar-dropdown-trigger"
                  onClick={(e) => { e.stopPropagation(); setVentasOpen((v) => !v) }}
                  aria-label="Abrir menú de Venta"
                >
                  <span className="material-symbols-outlined topbar-dropdown-arrow">
                    {ventasOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {ventasOpen && (
                  <div className="topbar-dropdown topbar-nav-dropdown">
                    {cajaHabilitada && (
                      <button className="topbar-dropdown-item" onClick={() => { onToggleCaja(); closeAllDropdowns() }}>
                        <span className="material-symbols-outlined">
                          {cajaAbierta ? 'lock_open' : 'lock'}
                        </span>
                        {cajaAbierta ? 'Cerrar caja' : 'Abrir caja'}
                      </button>
                    )}
                    <HistorialVenta />
                  </div>
                )}
              </div>
            )
          }

          // Catálogo dropdown
          if (item.to === '/catalogo') {
            return (
              <div key={item.to} className="topbar-nav-item" ref={catalogoRef}>
                <NavLink to="/catalogo" className="topbar-nav-btn">
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
                <button
                  className="topbar-dropdown-trigger"
                  onClick={(e) => { e.stopPropagation(); setCatalogoOpen((v) => !v) }}
                  aria-label="Abrir menú de Catálogo"
                >
                  <span className="material-symbols-outlined topbar-dropdown-arrow">
                    {catalogoOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {catalogoOpen && (
                  <div className="topbar-dropdown topbar-nav-dropdown">
                    <button className="topbar-dropdown-item" onClick={toggleSoloActivos}>
                      <span className="material-symbols-outlined">
                        {soloActivos ? 'check_box' : 'check_box_outline_blank'}
                      </span>
                      Solo activos
                    </button>
                    <button className="topbar-dropdown-item" onClick={toggleOcultarAgotados}>
                      <span className="material-symbols-outlined">
                        {ocultarAgotados ? 'check_box' : 'check_box_outline_blank'}
                      </span>
                      Ocultar agotados
                    </button>
                  </div>
                )}
              </div>
            )
          }

          // Inventario dropdown (admin-only)
          if (item.to === '/inventario') {
            return (
              <div key={item.to} className="topbar-nav-item" ref={inventarioRef}>
                <NavLink to="/inventario" className="topbar-nav-btn">
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
                <button
                  className="topbar-dropdown-trigger"
                  onClick={(e) => { e.stopPropagation(); setInventarioOpen((v) => !v) }}
                  aria-label="Abrir menú de Inventario"
                >
                  <span className="material-symbols-outlined topbar-dropdown-arrow">
                    {inventarioOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {inventarioOpen && (
                  <div className="topbar-dropdown topbar-nav-dropdown">
                    <button className="topbar-dropdown-item" onClick={() => { setInventarioAccion('nuevo'); closeAllDropdowns() }}>
                      <span className="material-symbols-outlined">add_circle</span>
                      Producto nuevo
                    </button>
                    <button className="topbar-dropdown-item" onClick={() => { setInventarioAccion('editar'); closeAllDropdowns() }}>
                      <span className="material-symbols-outlined">edit</span>
                      Editar producto
                    </button>
                    <div className="topbar-dropdown-divider" />
                    <button className="topbar-dropdown-item" onClick={() => { triggerImportarCatalogo(); closeAllDropdowns() }}>
                      <span className="material-symbols-outlined">upload</span>
                      Importar catálogo
                    </button>
                    <button className="topbar-dropdown-item" onClick={() => { triggerExportarCatalogo(); closeAllDropdowns() }}>
                      <span className="material-symbols-outlined">download</span>
                      Exportar catálogo
                    </button>
                  </div>
                )}
              </div>
            )
          }

          // Default: plain NavLink (fallback)
          return (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className="topbar-nav-btn">
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* ——— Center: tasa BCV ——— */}
      <div className="topbar-center">
        <span
          className={`topbar-tasa ${tasaDesactualizada ? 'topbar-tasa-stale' : ''}`}
          onClick={!editandoTasa ? iniciarEdicionTasa : undefined}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') iniciarEdicionTasa() }}
          title="Click para editar tasa"
        >
          <span className="material-symbols-outlined topbar-tasa-icon">currency_exchange</span>
          {editandoTasa ? (
            <input
              ref={tasaInputRef}
              className="topbar-tasa-input"
              type="text"
              inputMode="decimal"
              value={tasaInput}
              onChange={(e) => { tasaValueRef.current = e.target.value; setTasaInput(e.target.value) }}
              onBlur={guardarTasa}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); guardarTasa() }
                if (e.key === 'Escape') cancelarEdicionTasa()
              }}
            />
          ) : (
            <span className="topbar-tasa-value">{tasaBCV} Bs</span>
          )}
        </span>
        <span className={`topbar-tasa-update ${tasaDesactualizada ? 'topbar-tasa-update-stale' : ''}`}>
          {tasaDesactualizada ? '⚠ pendiente de actualización' : fmtTiempoRelativo(tasaActualizadaEn ?? leerTasaSincronizada())}
        </span>
      </div>

      {/* ——— Right: status + config + avatar ——— */}
      <div className="topbar-right">
        <SyncStatus />

        <NavLink to="/configuracion" className="topbar-nav-btn" aria-label="Configuración">
          <span className="material-symbols-outlined">settings</span>
        </NavLink>

        {/* Avatar — minimal, just initials as visual element */}
        <div className="topbar-avatar">
          {initials}
        </div>
      </div>
    </header>
  )
}
