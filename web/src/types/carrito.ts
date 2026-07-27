import type { ProductoJoin } from '../lib/productos'

export interface CarritoItem {
  producto: ProductoJoin
  cantidad: number
  precio_override?: number | null
  descuento_item?: number
}

export type MetodoPago = 'contado' | 'credito'
export type MonedaPago = 'BS' | 'USD'
export type TipoInstrumento = 'efectivo' | 'transferencia' | 'pago_movil' | 'zelle'

export interface InstrumentoPago {
  id: string
  tipo: TipoInstrumento
  moneda: MonedaPago
  monto: string
}

export const NOMBRES_TIPO: Record<TipoInstrumento, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  pago_movil: 'Pago Móvil',
  zelle: 'Zelle',
}

export const TIPOS_DISPONIBLES: TipoInstrumento[] = [
  'efectivo', 'transferencia', 'pago_movil', 'zelle',
]

export const fmtUsd = (n: number) => `$${n.toFixed(2)}`
export const fmtBs = (n: number) => `Bs ${n.toFixed(2)}`

export const parseMonto = (v: string): number => {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}

export function nuevoInstrumento(): InstrumentoPago {
  return {
    id: crypto.randomUUID(),
    tipo: 'efectivo',
    moneda: 'USD',
    monto: '',
  }
}
