import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { logout } from '../lib/auth'
import { obtenerMiEmpresa, type Empresa } from '../lib/empresa'
import { CommandPalette } from './CommandPalette'
import { useUIStore } from '../lib/ui-store'
import { useCajaStore } from '../store/useCajaStore'
import { abrirCaja, cerrarCaja } from '../lib/caja'
import { useUsuarioRol } from '../hooks/useUsuarioRol'

const navItems = [
  { to: '/', label: 'Venta', icon: 'point_of_sale', adminOnly: false },
  { to: '/catalogo', label: 'Catálogo', icon: 'inventory_2', adminOnly: false },
  { to: '/inventario', label: 'Inventario', icon: 'inventory', adminOnly: true },
] as const

export function Layout({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const pendientes = useCajaStore((s) => s.pendientes)
  const online = useCajaStore((s) => s.online)
  const cajaAbierta = useCajaStore((s) => s.cajaAbierta)
  const cajaHabilitada = useCajaStore((s) => s.cajaHabilitada)
  const { inventarioHabilitado } = useUsuarioRol()
  const items = navItems.filter((i) => !i.adminOnly || inventarioHabilitado)

  useEffect(() => {
    if (session) obtenerMiEmpresa().then(setEmpresa).catch(() => setEmpresa(null))
  }, [session])

  // Refresca el estado de caja/online/pendientes al autenticarse (REQ-1/2/4).
  const refrescarCaja = useCajaStore((s) => s.refrescar)
  useEffect(() => {
    if (session) void refrescarCaja()
  }, [session, refrescarCaja])

  useEffect(() => {
      function onKey(e: KeyboardEvent) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault()
          setPaletteOpen((v) => !v)
        }
      }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }, [])

  async function onLogout() {
    if (!confirm('¿Salir de la aplicación? Tendrás que volver a iniciar sesión.')) return
    await logout()
    navigate('/login')
  }

  // Abre/cierra la caja del dispositivo (REQ-1). Tras la acción, refresca el estado.
  async function onToggleCaja() {
    const s = useCajaStore.getState()
    try {
      if (s.cajaAbierta) {
        if (s.sesionCajaId) await cerrarCaja(s.sesionCajaId)
      } else {
        await abrirCaja('0')
      }
      await s.refrescar()
    } catch {
      // La UI refleja el estado real al refrescar; no bloquea la navegación.
    }
  }

  return (
    <div className={`app-shell${collapsed ? ' collapsed' : ''}`}>
      <aside className="sidebar">
        <button className="brand-toggle" onClick={toggleSidebar} aria-label="Colapsar menú" title={collapsed ? 'Expandir' : 'Colapsar'}>
          <span className="material-symbols-outlined">{collapsed ? 'chevron_right' : 'chevron_left'}</span>
          <span className="side-label">Colapsar</span>
        </button>
        <div className="brand">
          <span className="brand-mark">F</span>
          <span className="brand-name">{empresa?.nombre ?? 'FerrehogarMart'}</span>
        </div>
        <nav className="side-nav">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className="side-link">
              <span className="side-ico material-symbols-outlined">{item.icon}</span>
              <span className="side-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="side-footer">
          <button className="side-logout" onClick={onLogout}>
            <span className="material-symbols-outlined">logout</span>
            <span className="side-label">Salir</span>
          </button>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          {location.pathname !== '/' && (
            <button className="topbar-cmd" onClick={() => setPaletteOpen(true)}>
              <span className="material-symbols-outlined">search</span>
              Buscar o navegar… <kbd>Ctrl K</kbd>
            </button>
          )}
          {location.pathname === '/catalogo' && (
            <div className="topbar-page-title">
              <span className="material-symbols-outlined">inventory_2</span>
              Catálogo de productos
            </div>
          )}
          {location.pathname === '/inventario' && (
            <div className="topbar-page-title">
              <span className="material-symbols-outlined">inventory</span>
              Inventario
            </div>
          )}
          <div className="topbar-user">{session?.user?.email ?? ''}</div>
          <div className="topbar-caja">
            <span className={`estado-conexion ${online ? 'on' : 'off'}`} aria-label={online ? 'En línea' : 'Sin conexión'}>
              {online ? 'En línea' : 'Offline'}
            </span>
            {pendientes > 0 && (
              <span className="badge-pendientes" title="Ventas pendientes de sincronizar">
                {pendientes} pendiente{pendientes === 1 ? '' : 's'}
              </span>
            )}
            {cajaHabilitada && (
              <button className="caja-btn" onClick={onToggleCaja}>
                {cajaAbierta ? 'Cerrar caja' : 'Abrir caja'}
              </button>
            )}
          </div>
          <button className="topbar-theme" onClick={toggleTheme} aria-label="Cambiar tema" title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
            <span className="material-symbols-outlined">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
          </button>
        </header>
        <main className="content">{children}</main>
      </div>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  )
}
