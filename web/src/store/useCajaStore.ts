// useCajaStore.ts — estado global de caja/online/pendientes (Zustand 4).
//
// El estado se usa para: (a) decidir solo-lectura del catálogo (REQ-2);
// (b) mostrar el badge de pendientes y el indicador online/offline (REQ-4);
// (c) asociar la venta offline a la sesión de caja abierta.
// Solo se persiste cajaAbierta + sesionCajaId (los eventos viven en IndexedDB).

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { obtenerMiEmpresa } from '../lib/empresa'
import { getDeviceId, obtenerCajaActual } from '../lib/caja'
import * as cola from '../lib/colaOffline'

interface CajaState {
  cajaAbierta: boolean
  sesionCajaId: string | null
  online: boolean
  pendientes: number
  cajaHabilitada: boolean
  setCajaAbierta: (abierta: boolean, id?: string | null) => void
  setOnline: (online: boolean) => void
  setPendientes: (n: number) => void
  setCajaHabilitada: (v: boolean) => void
  refrescar: () => Promise<void>
}

export const useCajaStore = create<CajaState>()(
  persist(
    (set) => ({
      cajaAbierta: false,
      sesionCajaId: null,
      online: true,
      pendientes: 0,
      cajaHabilitada: true,
      setCajaAbierta: (abierta, id = null) =>
        set({ cajaAbierta: abierta, sesionCajaId: id }),
      setOnline: (online) => set({ online }),
      setPendientes: (n) => set({ pendientes: n }),
      setCajaHabilitada: (v) => set({ cajaHabilitada: v }),
      refrescar: async () => {
        try {
          const emp = await obtenerMiEmpresa()
          const habilitada = emp?.caja_obligatoria ?? false
          set({ cajaHabilitada: habilitada })
          const dispositivo = getDeviceId()
          if (!habilitada) {
            // RN-53: caja deshabilitada -> se vende sin caja (modo abierto).
            set({ cajaAbierta: true, sesionCajaId: null })
            const pend = (await cola.listarPendientes(dispositivo)).length
            set({ pendientes: pend })
            return
          }
          const actual = await obtenerCajaActual(dispositivo)
          if (actual && actual.estado === 'abierta') {
            set({ cajaAbierta: true, sesionCajaId: actual.id })
          } else {
            set({ cajaAbierta: false, sesionCajaId: null })
          }
          const pend = (await cola.listarPendientes(dispositivo)).length
          set({ pendientes: pend })
        } catch {
          // offline-safe: mantener valores por defecto, no romper la UI.
        }
      },
    }),
    {
      name: 'pv-caja',
      partialize: (s) => ({
        cajaAbierta: s.cajaAbierta,
        sesionCajaId: s.sesionCajaId,
      }),
    }
  )
)
