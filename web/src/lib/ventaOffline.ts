// ventaOffline.ts — registro offline-first de una venta completa (REQ-3 / REQ-4).
//
// Construye UN EventoVentaOffline por VENTA (no por línea de producto) y lo
// persiste en IndexedDB ANTES de cualquier intento de red (offline-first).
// Luego autoSync lo sube vía RPC idempotente.
// El payload incluye `version: 2` para que el servidor pueda distinguir el
// formato multi-item del viejo formato single-item (migration segura, REQ-4).
// El stock se envía como auditoría (RN-11) y nunca bloquea la operación.

import { getDeviceId } from './caja'
import * as cola from './colaOffline'
import { obtenerMiEmpresaId, obtenerMiUsuarioId } from './empresa'
import { useCajaStore } from '../store/useCajaStore'
import type { CarritoItem } from '../types/carrito'

function generarIdEvento(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `evt-${crypto.randomUUID()}`
  }
  return `evt-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

export interface PagoInfo {
  metodo: string
  moneda: string
  monto: string
  monto_usd: string
  tasa_aplicada: string
}

export async function registrarVentaOffline(
  items: CarritoItem[],
  pagos: PagoInfo[],
  cliente: string,
  cedula: string,
  metodoPago: 'contado' | 'credito',
  totalUSD: number,
  totalBS: number,
  tasa: number
): Promise<string> {
  if (items.length === 0) throw new Error('Carrito vacío')

  const empresaId = await obtenerMiEmpresaId()
  if (!empresaId) throw new Error('No se pudo determinar la empresa')
  const usuarioId = await obtenerMiUsuarioId()
  const sesionCajaId = useCajaStore.getState().sesionCajaId ?? undefined
  const idEvento = generarIdEvento()

  const sinUsuario = !usuarioId
  const evento: cola.EventoVentaOffline = {
    id_evento: idEvento,
    empresa_id: empresaId,
    dispositivo: getDeviceId(),
    sesion_caja_id: sesionCajaId,
    estado_sync: sinUsuario ? 'sync_error' : 'pendiente',
    payload: {
      version: 2,
      usuario_id: usuarioId ?? '',
      items: items.map((it) => ({
        producto_id: it.producto.id,
        sku: it.producto.sku,
        nombre: it.producto.nombre,
        cantidad: it.cantidad,
        precio_usd: Number(it.producto.precio_usd),
        precio_override: it.precio_override ?? null,
        descuento_item: it.descuento_item ?? 0,
      })),
      pagos,
      cliente,
      cedula,
      metodo_pago: metodoPago,
      total_usd: totalUSD,
      total_bs: totalBS,
      tasa_aplicada: tasa,
    },
    auditoria_stock: items.map((it) => ({
      producto_id: it.producto.id,
      cantidad: String(it.cantidad),
      observacion: 'venta_offline',
    })),
    intentos: 0,
    creado_en: new Date().toISOString(),
    mensaje_error: sinUsuario
      ? 'Sin usuario autenticado (uuid) para firmar la venta offline; la venta no se sincronizará hasta iniciar sesión.'
      : undefined,
  }

  await cola.guardarEvento(evento)
  const pend = await cola.contarPendientes(getDeviceId())
  useCajaStore.getState().setPendientes(pend)
  return idEvento
}
