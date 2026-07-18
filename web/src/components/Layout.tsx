import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { logout } from '../lib/auth'
import { obtenerMiEmpresa, type Empresa } from '../lib/empresa'
import { CommandPalette } from './CommandPalette'
import { useUIStore } from '../lib/ui-store'

const navItems = [
  { to: '/', label: 'Venta', icon: 'point_of_sale' },
  { to: '/catalogo', label: 'Catálogo', icon: 'inventory_2' },
]

export function Layout({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const navigate = useNavigate()
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const resetZoom = useUIStore((s) => s.resetZoom)

  useEffect(() => {
    if (session) obtenerMiEmpresa().then(setEmpresa).catch(() => setEmpresa(null))
  }, [session])

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
          {navItems.map((item) => (
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
          <button className="topbar-cmd" onClick={() => setPaletteOpen(true)}>
            <span className="material-symbols-outlined">search</span>
            Buscar o navegar… <kbd>Ctrl K</kbd>
          </button>
          <div className="topbar-user">{session?.user?.email ?? ''}</div>
          <button className="topbar-reset-zoom" onClick={resetZoom} aria-label="Restablecer zoom" title="Restablecer zoom (100%)">
            <span className="material-symbols-outlined">zoom_out_map</span>
          </button>
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
