import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebar: (v: boolean) => void
  theme: 'dark' | 'light'
  toggleTheme: () => void
  setTheme: (v: 'dark' | 'light') => void
  zoom: number
  setZoom: (v: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
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
      theme: 'dark',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setTheme: (v) => set({ theme: v }),
      zoom: 1,
      setZoom: (v) => set({ zoom: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(v * 100) / 100)) }),
      zoomIn: () => set((s) => ({ zoom: Math.min(ZOOM_MAX, Math.round((s.zoom + ZOOM_STEP) * 100) / 100) })),
      zoomOut: () => set((s) => ({ zoom: Math.max(ZOOM_MIN, Math.round((s.zoom - ZOOM_STEP) * 100) / 100) })),
      resetZoom: () => set({ zoom: 1 }),
    }),
    { name: 'pv-ui' }
  )
)
