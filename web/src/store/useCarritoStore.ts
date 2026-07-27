import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CarritoItem, InstrumentoPago, MetodoPago } from '../types/carrito'
import { nuevoInstrumento, parseMonto } from '../types/carrito'

export interface CarritoTotales {
  subtotalUSD: number
  subtotalVES: number
  ivaUSD: number
  ivaVES: number
  igtfUSD: number
  igtfVES: number
  totalUSD: number
  totalVES: number
  tasa: number
  cantidadItems: number
  totalAsignadoUSD: number
  faltante: number
  excedente: number
  pagoCompleto: boolean
}

interface CarritoState {
  items: CarritoItem[]
  tasaBCV: number
  tasaPersonalizada: number | null
  getTasa: () => number
  setTasaBCV: (tasa: number) => void
  setTasaPersonalizada: (tasa: number | null) => void

  metodoPago: MetodoPago
  setMetodoPago: (m: MetodoPago) => void
  instrumentos: InstrumentoPago[]

  cliente: string
  cedula: string
  setCliente: (c: string) => void
  setCedula: (c: string) => void

  permitirVentaSinStock: boolean
  aplicaIva: boolean
  igtfHabilitado: boolean

  agregarProducto: (producto: CarritoItem['producto'], precioOverride?: number) => void
  incrementarCantidad: (id: string) => void
  decrementarCantidad: (id: string) => void
  eliminarItem: (id: string) => void
  actualizarPrecioItem: (id: string, nuevoPrecio: number) => void
  limpiarCarrito: () => void

  agregarInstrumento: () => void
  quitarInstrumento: (id: string) => void
  actualizarInstrumento: (id: string, cambio: Partial<InstrumentoPago>) => void

  getTotales: () => CarritoTotales
}

export const useCarritoStore = create<CarritoState>()(
  persist(
    (set, get) => ({
      items: [],
      tasaBCV: 36.50,
      tasaPersonalizada: null,
      metodoPago: 'contado',
      instrumentos: [nuevoInstrumento()],
      cliente: '',
      cedula: '',
      permitirVentaSinStock: false,
      aplicaIva: true,
      igtfHabilitado: true,

      getTasa: () => get().tasaPersonalizada || get().tasaBCV,
      setTasaBCV: (tasa) => set({ tasaBCV: tasa }),
      setTasaPersonalizada: (tasa) => set({ tasaPersonalizada: tasa }),

      setMetodoPago: (m) => set((state) => ({
        metodoPago: m,
        instrumentos: m === 'contado' && state.instrumentos.length === 0
          ? [nuevoInstrumento()]
          : state.instrumentos,
      })),

      setCliente: (c) => set({ cliente: c }),
      setCedula: (c) => set({ cedula: c }),

      agregarProducto: (producto, precioOverride) => {
        const items = get().items
        const existe = items.find((i) => i.producto.id === producto.id)

        if (existe) {
          if (!get().permitirVentaSinStock && existe.cantidad >= producto.stock_actual) {
            return
          }
          set({
            items: items.map((i) =>
              i.producto.id === producto.id
                ? { ...i, cantidad: i.cantidad + 1 }
                : i
            ),
          })
        } else {
          if (!get().permitirVentaSinStock && producto.stock_actual <= 0) {
            return
          }
          set({
            items: [...items, {
              producto,
              cantidad: 1,
              precio_override: precioOverride ?? null,
              descuento_item: 0,
            }],
          })
        }
      },

      incrementarCantidad: (id) => {
        const items = get().items
        const item = items.find((i) => i.producto.id === id)
        if (!item) return
        if (!get().permitirVentaSinStock && item.cantidad >= item.producto.stock_actual) return
        set({
          items: items.map((i) =>
            i.producto.id === id ? { ...i, cantidad: i.cantidad + 1 } : i
          ),
        })
      },

      decrementarCantidad: (id) => {
        const items = get().items
        const item = items.find((i) => i.producto.id === id)
        if (!item) return
        if (item.cantidad <= 1) {
          get().eliminarItem(id)
          return
        }
        set({
          items: items.map((i) =>
            i.producto.id === id ? { ...i, cantidad: i.cantidad - 1 } : i
          ),
        })
      },

      eliminarItem: (id) => set({ items: get().items.filter((i) => i.producto.id !== id) }),

      actualizarPrecioItem: (id, nuevoPrecio) =>
        set({
          items: get().items.map((i) =>
            i.producto.id === id ? { ...i, precio_override: nuevoPrecio } : i
          ),
        }),

      limpiarCarrito: () => set({
        items: [],
        instrumentos: [nuevoInstrumento()],
        cliente: '',
        cedula: '',
        metodoPago: 'contado',
      }),

      agregarInstrumento: () => {
        if (get().instrumentos.length >= 5) return
        set({ instrumentos: [...get().instrumentos, nuevoInstrumento()] })
      },

      quitarInstrumento: (id) =>
        set({ instrumentos: get().instrumentos.filter((i) => i.id !== id) }),

      actualizarInstrumento: (id, cambio) =>
        set({
          instrumentos: get().instrumentos.map((i) =>
            i.id === id ? { ...i, ...cambio } : i
          ),
        }),

      getTotales: () => {
        const { items, instrumentos, metodoPago, aplicaIva, igtfHabilitado } = get()
        const tasa = get().getTasa()

        const subtotalUSD = items.reduce((acc, i) => {
          const precio = i.precio_override ?? Number(i.producto.precio_usd)
          return acc + (precio - (i.descuento_item || 0)) * i.cantidad
        }, 0)

        const ivaUSD = aplicaIva ? subtotalUSD * 0.16 : 0

        const sumaBs = instrumentos
          .filter((i) => i.moneda === 'BS')
          .reduce((acc, i) => acc + parseMonto(i.monto), 0)
        const igtfUSD = (igtfHabilitado && metodoPago === 'contado') ? (sumaBs / tasa) * 0.03 : 0

        const totalUSD = subtotalUSD + ivaUSD + igtfUSD

        const totalAsignadoUSD = instrumentos.reduce((acc, inst) => {
          const monto = parseMonto(inst.monto)
          return acc + (inst.moneda === 'USD' ? monto : monto / tasa)
        }, 0)

        return {
          subtotalUSD,
          subtotalVES: subtotalUSD * tasa,
          ivaUSD,
          ivaVES: ivaUSD * tasa,
          igtfUSD,
          igtfVES: igtfUSD * tasa,
          totalUSD,
          totalVES: totalUSD * tasa,
          tasa,
          cantidadItems: items.reduce((acc, i) => acc + i.cantidad, 0),
          totalAsignadoUSD,
          faltante: Math.max(0, subtotalUSD - totalAsignadoUSD),
          excedente: Math.max(0, totalAsignadoUSD - subtotalUSD),
          pagoCompleto: totalAsignadoUSD >= subtotalUSD,
        }
      },
    }),
    {
      name: 'pv-carrito',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
