import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../lib/auth-context'
import { logout } from '../lib/auth'
import { obtenerMiEmpresa, type Empresa } from '../lib/empresa'

export function Layout({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [empresa, setEmpresa] = useState<Empresa | null>(null)

  useEffect(() => {
    if (session) obtenerMiEmpresa().then(setEmpresa).catch(() => setEmpresa(null))
  }, [session])

  async function onLogout() {
    await logout()
  }

  return (
    <div>
      <header className="topbar">
        <strong>{empresa?.nombre ?? 'PuntoVenta2'}</strong>
        <button onClick={onLogout}>Salir</button>
      </header>
      <main className="content">{children}</main>
    </div>
  )
}
