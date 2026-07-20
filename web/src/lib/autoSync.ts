// autoSync.ts — detección online/offline y subida de la cola offline (REQ-4).
//
// - Detecta transición offline->online vía navigator.onLine + eventos window.
// - Al reconectar, sube los eventos pendientes con un RPC upsert idempotente
//   (aplicar_venta_offline por id_evento). El RPC es idempotente, así que los
//   reintentos NO duplican ventas (REQ-3/REQ-4).
// - Guarda en vuelo (flag `syncing`) para que un doble disparo del evento
//   'online' no dispare dos subidas del mismo evento.
// - Heartbeat opcional (solo si hay cliente Supabase) para detectar caída real
//   de Supabase aunque navigator.onLine diga true.

import { supabase } from './supabase'
import { getDeviceId } from './caja'
import * as cola from './colaOffline'

export type RpcParams = {
  id_evento: string
  empresa_id: string
  dispositivo: string
  sesion_caja_id: string | null
  payload: unknown
  auditoria_stock: unknown
}
export type RpcResult = { insertado: boolean }
export type RpcImpl = (params: RpcParams) => Promise<RpcResult>

type Handlers = {
  onCambioEstado?: (online: boolean, pendientes: number) => void
  rpc?: RpcImpl
  heartbeatMs?: number
  // Ping liviano para el heartbeat; por defecto consulta Supabase. Inyectable
  // para testear la recuperación sin cliente real (W2).
  ping?: () => Promise<boolean>
}

// Reintento con backoff exponencial (W2): 1s, 2s, 4s... cap 30s.
const BACKOFF_BASE_MS = 1000
const BACKOFF_CAP_MS = 30000

let syncing = false
// Timer de reintento de la cola. Se autolimpia al iniciar cada sync para
// evitar timers huérfanos/acumulados.
let retryTimer: ReturnType<typeof setTimeout> | null = null
// Contador de reintentos fallidos para escalar el backoff; se reinicia en
// un ciclo totalmente exitoso.
let reintentos = 0

export function estaOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

async function contarPendientes(): Promise<number> {
  return cola.contarPendientes(getDeviceId())
}

// RPC real contra Supabase (aplicar_venta_offline, security invoker).
async function rpcReal(p: RpcParams): Promise<RpcResult> {
  if (!supabase) throw new Error('sin cliente Supabase')
  const { data, error } = await supabase.rpc('aplicar_venta_offline', {
    p_id_evento: p.id_evento,
    p_empresa_id: p.empresa_id,
    p_dispositivo: p.dispositivo,
    p_sesion_caja_id: p.sesion_caja_id,
    p_payload: p.payload,
    p_auditoria_stock: p.auditoria_stock,
  })
  if (error) throw error
  return data as RpcResult
}

// Sube todos los eventos pendientes. Idempotente: cada evento se intenta una
// vez por ciclo (flag `syncing`); si el RPC falla, se incrementa el intento y
// se agenda un reintento con backoff exponencial (W2). Los eventos en
// 'sync_error' (p.ej. sin usuario_id, W4) NO se reintentan: requieren
// intervención. El RPC es idempotente, así que los reintentos no duplican.
export async function sincronizarPendientes(opts?: {
  rpc?: RpcImpl
  backoffBaseMs?: number
  backoffCapMs?: number
  // Fuerza el sync aunque navigator.onLine sea false (usado en recovery de
  // heartbeat: Supabase responde aunque el navegador crea que está offline).
  forzarOnline?: boolean
  // Scheduler del reintento (inyectable para tests). Por defecto setTimeout.
  schedule?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>
}): Promise<void> {
  // Cancela cualquier reintento pendiente: cada sync reevalúa desde cero.
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
  if (syncing) return
  if (!estaOnline() && !opts?.forzarOnline) return
  syncing = true
  let huboFallo = false
  try {
    const dispositivo = getDeviceId()
    const pendientes = await cola.listarPendientes(dispositivo)
    const rpc = opts?.rpc ?? rpcReal
    for (const ev of pendientes) {
      try {
        await rpc({
          id_evento: ev.id_evento,
          empresa_id: ev.empresa_id,
          dispositivo: ev.dispositivo,
          sesion_caja_id: ev.sesion_caja_id ?? null,
          payload: ev.payload,
          auditoria_stock: ev.auditoria_stock,
        })
        await cola.marcarSyncOk(ev.id_evento)
      } catch {
        await cola.incrementarIntento(ev.id_evento)
        huboFallo = true
      }
    }
  } finally {
    syncing = false
  }
  // Backoff: si hubo fallos y seguimos online, agenda el próximo ciclo.
  if (huboFallo && estaOnline()) {
    reintentos += 1
    const base = opts?.backoffBaseMs ?? BACKOFF_BASE_MS
    const cap = opts?.backoffCapMs ?? BACKOFF_CAP_MS
    const delay = Math.min(cap, base * 2 ** (reintentos - 1))
    const schedule = opts?.schedule ?? ((fn, ms) => setTimeout(fn, ms))
    retryTimer = schedule(() => {
      retryTimer = null
      void sincronizarPendientes(opts)
    }, delay)
  } else if (!huboFallo) {
    reintentos = 0
  }
}

// Arranca la detección de conexión y el auto-sync. Devuelve función de limpieza.
export function iniciarAutoSync(handlers: Handlers = {}): () => void {
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null

  const notificar = async () => {
    handlers.onCambioEstado?.(estaOnline(), await contarPendientes())
  }

  const sincronizar = (forzar = false) => {
    void sincronizarPendientes({ rpc: handlers.rpc, forzarOnline: forzar }).then(() => notificar())
  }

  const onOnline = () => {
    void notificar()
    sincronizar()
  }
  const onOffline = () => {
    void notificar()
  }

  // Ping por defecto: select liviano a Supabase. Inyectable para tests (W2).
  const doPing = handlers.ping ?? (async (): Promise<boolean> => {
    if (!supabase) return false
    try {
      await supabase
        .from('sesion_caja')
        .select('id', { count: 'exact', head: true })
        .limit(1)
      return true
    } catch {
      return false
    }
  })

  if (typeof window !== 'undefined') {
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    void notificar()
    if (estaOnline()) sincronizar()

    // Heartbeat: detecta caída real de Supabase aunque navigator.onLine sea true.
    // Al recuperar (caído->conectado) dispara el flush de la cola (W2).
    if (supabase || handlers.ping) {
      const ms = handlers.heartbeatMs ?? 30000
      let ultimoOnline = estaOnline()
      heartbeatTimer = setInterval(async () => {
        const onlineAhora = await doPing()
        handlers.onCambioEstado?.(onlineAhora, await contarPendientes())
        if (onlineAhora && !ultimoOnline) {
          sincronizar(true) // recovery: flush automático de la cola (forza online)
        }
        ultimoOnline = onlineAhora
      }, ms)
    }
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
    if (heartbeatTimer) clearInterval(heartbeatTimer)
  }
}
