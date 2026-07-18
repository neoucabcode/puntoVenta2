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
  resetZoom: () => void
}

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
      setZoom: (v) => set({ zoom: v }),
      resetZoom: () => set({ zoom: 1 }),
    }),
    { name: 'pv-ui' }
  )
)
