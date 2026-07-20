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
}

let syncing = false

export function estaOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

async function contarPendientes(): Promise<number> {
  const dispositivo = getDeviceId()
  const pend = await cola.listarPendientes(dispositivo)
  return pend.length
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
// vez por ciclo (flag `syncing`); si el RPC falla, se incrementa el intento y el
// evento queda pendiente para el siguiente ciclo (backoff entre ciclos, REQ-4).
export async function sincronizarPendientes(opts?: { rpc?: RpcImpl }): Promise<void> {
  if (syncing) return
  if (!estaOnline()) return
  syncing = true
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
      }
    }
  } finally {
    syncing = false
  }
}

// Arranca la detección de conexión y el auto-sync. Devuelve función de limpieza.
export function iniciarAutoSync(handlers: Handlers = {}): () => void {
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null

  const notificar = async () => {
    handlers.onCambioEstado?.(estaOnline(), await contarPendientes())
  }

  const sincronizar = () => {
    void sincronizarPendientes({ rpc: handlers.rpc }).then(() => notificar())
  }

  const onOnline = () => {
    void notificar()
    sincronizar()
  }
  const onOffline = () => {
    void notificar()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    void notificar()
    if (estaOnline()) sincronizar()

    // Heartbeat: detecta caída real de Supabase aunque navigator.onLine sea true.
    if (supabase) {
      const ms = handlers.heartbeatMs ?? 30000
      heartbeatTimer = setInterval(async () => {
        try {
          await supabase!
            .from('sesion_caja')
            .select('id', { count: 'exact', head: true })
            .limit(1)
          handlers.onCambioEstado?.(true, await contarPendientes())
        } catch {
          handlers.onCambioEstado?.(false, await contarPendientes())
        }
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
