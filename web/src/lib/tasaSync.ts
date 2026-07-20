// tasaSync.ts — seguimiento client-side de la última sincronización REAL de la
// tasa con el servidor.
//
// La tabla `empresa` (schema_fase2.sql) NO tiene columna de timestamp de la
// tasa, así que no podemos saber su antigüedad desde la BD. Para marcar la tasa
// como "desactualizada" cuando el dispositivo lleva >TASA_STALE_HOURS sin
// conectarse, guardamos localmente el momento de la última sincronización que
// provino de una fuente en línea. Es un detalle puramente presentacional: no
// afecta la cola offline ni el flujo de venta (Slice 2 = 100% presentacional).

const KEY = 'pv-tasa-sync'

// Umbral de antigüedad (horas) a partir del cual la tasa se considera
// "puede estar desactualizada". Fácil de cambiar desde un solo lugar.
export const TASA_STALE_HOURS = 24

// Registra que la tasa fue sincronizada ahora mismo desde el servidor.
export function marcarTasaSincronizada(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(KEY, new Date().toISOString())
}

// Lee la última sincronización conocida (ISO) o null si nunca se registró.
export function leerTasaSincronizada(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(KEY)
}

// Devuelve true si la tasa supera el umbral de antigüedad. Un valor null se
// trata como "fresco" (no tenemos evidencia de desactualización).
export function tasaEstaDesactualizada(tasaActualizadaEn: string | null): boolean {
  if (!tasaActualizadaEn) return false
  const ms = Date.now() - new Date(tasaActualizadaEn).getTime()
  return ms > TASA_STALE_HOURS * 60 * 60 * 1000
}
