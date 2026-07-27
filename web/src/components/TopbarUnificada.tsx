import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { logout } from '../lib/auth'
import { useUIStore } from '../lib/ui-store'
import { useCajaStore } from '../store/useCajaStore'
import { abrirCaja, cerrarCaja } from '../lib/caja'
import { SyncStatus } from './SyncStatus'
import { useUsuarioRol } from '../hooks/useUsuarioRol'
import { useModulos } from '../hooks/useModulos'
import { useIsMobile } from '../hooks/useMediaQuery'

type NavItem = { to: string; label: string; icon: string; modulo?: string; adminOnly?: boolean }

const navItems: NavItem[] = [
  { to: '/', label: 'Venta', icon: 'point_of_sale', modulo: 'venta' },
  { to: '/catalogo', label: 'Catálogo', icon: 'inventory_2' },
  { to: '/inventario', label: 'Inventario', icon: 'inventory', modulo: 'inventario', adminOnly: true },
]

export function TopbarUnificada() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()

  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const drawerOpen = useUIStore((s) => s.drawerOpen)
  const toggleDrawer = useUIStore((s) => s.toggleDrawer)
  const setDrawer = useUIStore((s) => s.setDrawer)

  const online = useCajaStore((s) => s.online)
  const cajaAbierta = useCajaStore((s) => s.cajaAbierta)
  const cajaHabilitada = useCajaStore((s) => s.cajaHabilitada)

  const { inventarioHabilitado } = useUsuarioRol()
  const { estaHabilitado } = useModulos()

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Filtrar nav: Catálogo siempre visible; otros módulos requieren habilitación
  const items = navItems.filter((i) => {
    if (!i.modulo) return true
    if (i.adminOnly && !inventarioHabilitado) return false
    return estaHabilitado(i.modulo)
  })

  // Cerrar drawer en navegación
  useEffect(() => { setDrawer(false) }, [location.pathname, setDrawer])

  // Cerrar drawer al pasar a desktop
  useEffect(() => { if (!isMobile) setDrawer(false) }, [isMobile, setDrawer])

  // Cerrar menú avatar al hacer click fuera
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  async function onLogout() {
    setMenuOpen(false)
    if (!confirm('¿Salir de la aplicación? Tendrás que volver a iniciar sesión.')) return
    await logout()
    navigate('/login')
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
      {/* ——— Left: hamburger (mobile) + nav icons ——— */}
      {isMobile && (
        <button className="topbar-hamburger" onClick={toggleDrawer} aria-label="Abrir menú">
          <span className="material-symbols-outlined">menu</span>
        </button>
      )}

      <nav className="topbar-nav">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className="topbar-nav-btn">
            <span className="material-symbols-outlined">{item.icon}</span>
            {!isMobile && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ——— Right: status + caja + avatar ——— */}
      <div className="topbar-right">
        <span
          className={`estado-conexion ${online ? 'on' : 'off'}`}
          aria-label={online ? 'En línea' : 'Sin conexión'}
        />

        <SyncStatus />

        {cajaHabilitada && (
          <button className="caja-btn" onClick={onToggleCaja}>
            {cajaAbierta ? 'Cerrar caja' : 'Abrir caja'}
          </button>
        )}

        {/* ——— Avatar dropdown ——— */}
        <div className="topbar-avatar-wrap" ref={menuRef}>
          <button
            className="topbar-avatar"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menú de usuario"
          >
            {initials}
          </button>
          {menuOpen && (
            <div className="topbar-dropdown">
              <div className="topbar-dropdown-email">{session?.user?.email ?? ''}</div>
              <button className="topbar-dropdown-item" onClick={toggleTheme}>
                <span className="material-symbols-outlined">
                  {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                </span>
                {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              </button>
              <button className="topbar-dropdown-item topbar-dropdown-logout" onClick={onLogout}>
                <span className="material-symbols-outlined">logout</span>
                Salir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ——— Mobile drawer ——— */}
      {isMobile && drawerOpen && (
        <div className="drawer-backdrop" onClick={() => setDrawer(false)} />
      )}
      {isMobile && drawerOpen && (
        <div className="topbar-drawer">
          <nav className="topbar-drawer-nav">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className="topbar-drawer-link">
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
            <button className="topbar-drawer-link topbar-drawer-logout" onClick={onLogout}>
              <span className="material-symbols-outlined">logout</span>
              <span>Salir</span>
            </button>
          </nav>
        </div>
      )}
    </header>
  )
}
