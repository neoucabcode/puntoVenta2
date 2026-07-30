import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebar: (v: boolean) => void
  drawerOpen: boolean
  toggleDrawer: () => void
  setDrawer: (v: boolean) => void
  theme: 'dark' | 'light'
  toggleTheme: () => void
  setTheme: (v: 'dark' | 'light') => void
  zoom: number
  setZoom: (v: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void

  // Catálogo filters (controlled from topbar dropdown)
  soloActivos: boolean
  toggleSoloActivos: () => void
  setSoloActivos: (v: boolean) => void
  ocultarAgotados: boolean
  toggleOcultarAgotados: () => void
  setOcultarAgotados: (v: boolean) => void

  // Inventario actions (triggered from topbar dropdown, consumed by InventarioPage)
  inventarioAccion: 'nuevo' | 'editar' | null
  setInventarioAccion: (v: 'nuevo' | 'editar' | null) => void
  exportarCatalogoTrigger: number
  triggerExportarCatalogo: () => void
  importarCatalogoTrigger: number
  triggerImportarCatalogo: () => void
}

export const ZOOM_MIN = 0.75
export const ZOOM_MAX = 1.5
export const ZOOM_STEP = 0.1

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebar: (v) => set({ sidebarCollapsed: v }),
      drawerOpen: false,
      toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
      setDrawer: (v) => set({ drawerOpen: v }),
      theme: 'dark',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setTheme: (v) => set({ theme: v }),
      zoom: 1,
      setZoom: (v) => set({ zoom: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(v * 100) / 100)) }),
      zoomIn: () => set((s) => ({ zoom: Math.min(ZOOM_MAX, Math.round((s.zoom + ZOOM_STEP) * 100) / 100) })),
      zoomOut: () => set((s) => ({ zoom: Math.max(ZOOM_MIN, Math.round((s.zoom - ZOOM_STEP) * 100) / 100) })),
      resetZoom: () => set({ zoom: 1 }),

      soloActivos: true,
      toggleSoloActivos: () => set((s) => ({ soloActivos: !s.soloActivos })),
      setSoloActivos: (v) => set({ soloActivos: v }),
      ocultarAgotados: false,
      toggleOcultarAgotados: () => set((s) => ({ ocultarAgotados: !s.ocultarAgotados })),
      setOcultarAgotados: (v) => set({ ocultarAgotados: v }),

      inventarioAccion: null,
      setInventarioAccion: (v) => set({ inventarioAccion: v }),
      exportarCatalogoTrigger: 0,
      triggerExportarCatalogo: () => set((s) => ({ exportarCatalogoTrigger: s.exportarCatalogoTrigger + 1 })),
      importarCatalogoTrigger: 0,
      triggerImportarCatalogo: () => set((s) => ({ importarCatalogoTrigger: s.importarCatalogoTrigger + 1 })),
    }),
    { name: 'pv-ui' }
  )
)
