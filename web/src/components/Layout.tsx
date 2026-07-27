import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../lib/auth-context'
import { CommandPalette } from './CommandPalette'
import { TopbarUnificada } from './TopbarUnificada'
import { useCajaStore } from '../store/useCajaStore'

export function Layout({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [paletteOpen, setPaletteOpen] = useState(false)

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

  return (
    <div className="app-shell">
      <TopbarUnificada />
      <main className="content">{children}</main>
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  )
}
