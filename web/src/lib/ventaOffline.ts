// ventaOffline.ts — registro offline-first de una venta (REQ-3 / REQ-4).
//
// Construye un EventoVentaOffline y lo persiste en IndexedDB ANTES de cualquier
// intento de red (offline-first). Luego autoSync lo sube vía RPC idempotente.
// Si la caja está abierta, asocia la venta a la sesión; si no (caja deshabilitada
// por RN-53) deja sesion_caja_id en null. El stock se envía como auditoría
// (RN-11) y nunca bloquea la operación (RN-54/55).

import { getDeviceId } from './caja'
import * as cola from './colaOffline'
import { obtenerMiEmpresaId, obtenerMiUsuarioId } from './empresa'
import { useCajaStore } from '../store/useCajaStore'
import type { ProductoJoin } from './productos'

function generarIdEvento(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `evt-${crypto.randomUUID()}`
  }
  return `evt-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

export async function registrarVentaOffline(
  p: ProductoJoin,
  cantidad = 1
): Promise<string> {
  const empresaId = await obtenerMiEmpresaId()
  if (!empresaId) throw new Error('No se pudo determinar la empresa')
  const usuarioId = await obtenerMiUsuarioId()
  const sesionCajaId = useCajaStore.getState().sesionCajaId ?? undefined
  const idEvento = generarIdEvento()
  const cant = Math.max(1, cantidad)
  const precioUnit = Number(p.precio_usd) || 0
  const subtotal = (precioUnit * cant).toFixed(2)

  // W4: si no hay uuid de usuario (modo 100% offline sin login previo) NO
  // encolamos un evento que el RPC rechazará en silencio (''::uuid). Lo
  // marcamos 'sync_error' con mensaje claro y lo dejamos para atención manual.
  const sinUsuario = !usuarioId
  const evento: cola.EventoVentaOffline = {
    id_evento: idEvento,
    empresa_id: empresaId,
    dispositivo: getDeviceId(),
    sesion_caja_id: sesionCajaId,
    estado_sync: sinUsuario ? 'sync_error' : 'pendiente',
    payload: {
      usuario_id: usuarioId ?? '',
      subtotal_usd: subtotal,
      impuestos_usd: '0',
      total_usd: subtotal,
      saldo_pendiente_usd: '0',
      detalles: [
        {
          producto_id: p.id,
          cantidad: String(cant),
          precio_unit_usd: String(p.precio_usd),
          descuento_linea_usd: '0',
          subtotal_usd: subtotal,
        },
      ],
      pagos: [
        {
          metodo: 'efectivo',
          moneda: 'USD',
          monto: subtotal,
          monto_usd: subtotal,
          tasa_aplicada: '1',
        },
      ],
    },
    auditoria_stock: [
      { producto_id: p.id, cantidad: String(cant), observacion: 'venta_offline' },
    ],
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
