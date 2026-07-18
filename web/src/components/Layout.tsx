import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { logout } from '../lib/auth'
import { obtenerMiEmpresa, type Empresa } from '../lib/empresa'
import { CommandPalette } from './CommandPalette'

export function Layout({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const navigate = useNavigate()

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
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">F</span>
          <span className="brand-name">{empresa?.nombre ?? 'FerrehogarMart'}</span>
        </div>
        <nav className="side-nav">
          <NavLink to="/" end className="side-link">
            <span className="side-ico">▦</span> Venta
          </NavLink>
          <NavLink to="/catalogo" className="side-link">
            <span className="side-ico">▤</span> Catálogo
          </NavLink>
        </nav>
        <button className="side-cmd" onClick={() => setPaletteOpen(true)}>
          <span>⌘</span> Buscar… <kbd>Ctrl K</kbd>
        </button>
        <div className="side-footer">
          <button className="side-logout" onClick={onLogout}>Salir</button>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <button className="topbar-cmd" onClick={() => setPaletteOpen(true)}>
            ⌘ Buscar o navegar… <kbd>Ctrl K</kbd>
          </button>
          <div className="topbar-user">{session?.user?.email ?? ''}</div>
        </header>
        <main className="content">{children}</main>
      </div>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  )
}
