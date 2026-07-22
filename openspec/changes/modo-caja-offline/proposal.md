<!-- status: archived | archived-at: 2026-07-20 | by: sdd-archive | artifact_store: both (Engram + OpenSpec) -->

# Proposal: Modo Caja Offline (V1)

## Intent

El negocio opera en entornos con caídas frecuentes de luz/internet. Hoy la app depende de
conexión a Supabase para vender. Si se cae la red en la PC principal, se pierde la operación.
V1 introduce un **modo caja offline multi-dispositivo**: cualquier equipo autorizado puede abrir
sesión de caja y vender sin internet; al volver la conexión, la cola offline se sincroniza sola
y se reconcilian las ventas. Equipos que NO abrieron caja consultan el catálogo en solo-lectura.

Respeta reglas cerradas: RN-54 (venta sin stock no se bloquea de forma fija), RN-55 (stock
negativo configurable), RN-56 (parámetros habilitables por admin). El stock offline se registra
como **auditoría** (RN-11: toda salida asociada a causa) y **nunca bloquea** la venta.

## Scope

### In Scope
- Sesión de caja por **dispositivo** (ID local generado en navegador; sin login extra para vender).
- Tabla `sesion_caja` (estado: abierta/cerrada, dispositivo, empresa, timestamps, saldo inicial).
- Cola offline en **IndexedDB** (`ventas_pendientes`) con eventos de venta inmutables.
- Detección online/offline (`navigator.onLine` + heartbeat a Supabase).
- **Auto-sync silencioso**: al recuperar conexión, sube la cola y reconcilia; el usuario no hace nada.
- Catálogo de **solo-lectura** en equipos que no abrieron caja.
- Registro de stock offline como auditoría (evento de salida con causa; no bloqueante).

### Out of Scope
- Resolución de conflictos complejos (dos cajas editan el mismo producto al mismo tiempo).
- Multi-almacén / ubicación / kits (pendientes de validación en `11-decisiones-cerradas.md`).
- Factura fiscal, notas de crédito, anulaciones offline (solo venta directa en V1).
- Corrección de deuda técnica conocida: fuga Storage multi-tenant, `confirm()` nativo, paginación falsa
  (no requeridas por V1; se dejan para su propio cambio).
- UI de cola visible (decidido en `11` §6 como "cola visible", pero V1 prioriza auto-sync silencioso;
  **asunción**: mostrar un badge de "pendientes por sync" mínimo, no gestión manual).

## Capabilities

### New Capabilities
- `caja-offline`: sesión de caja por dispositivo, estado y ciclo de vida (abrir/cerrar).
- `cola-offline`: persistencia de eventos de venta en IndexedDB y detección online/offline.
- `auto-sync-ventas`: subida automática de la cola y reconciliación al recuperar conexión.
- `catalogo-solo-lectura`: modo consulta sin sesión de caja abierta.

### Modified Capabilities
- None (V1 no cambia requisitos de specs existentes; introduce capacidades nuevas).

## Approach

- **ID de dispositivo**: `crypto.randomUUID()` persistido en `localStorage`; viaja en cada evento de
  venta para trazabilidad multi-caja.
- **IndexedDB**: store `ventas_pendientes` (clave `id_evento`, índice por `estado`). La capa Zustand
  escribe el evento localmente ANTES de intentar la red (offline-first).
- **Online/offline**: listener `online/offline` + heartbeat periódico; estado en store central.
- **Auto-sync**: al pasar a online, un worker lee la cola, hace upsert de ventas vía Supabase client
  (respetando RLS por `empresa_id`), y marca eventos como `sync_ok`. Fallo → reintento con backoff.
- **Auditoría de stock**: cada venta offline genera evento de salida (`movimiento_stock` con causa =
  `venta_offline`), pero el flujo de venta NO consulta ni valida stock (RN-54/55).
- **Catálogo solo-lectura**: si no hay `sesion_caja` activa en el dispositivo, la UI de venta se
  bloquea a consulta; el catálogo se lee desde caché IndexedDB/sync previo.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `web/src/lib/caja.ts` (nuevo) | New | sesión de caja por dispositivo, estado. |
| `web/src/lib/colaOffline.ts` (nuevo) | New | IndexedDB + eventos de venta. |
| `web/src/lib/autoSync.ts` (nuevo) | New | subida y reconciliación. |
| `web/src/store/` (Zustand) | Modified | estado online/offline + cola. |
| `supabase/` (SQL nuevo, `patch_08_*`) | New | tabla `sesion_caja`, índices por `empresa_id`. |
| `web/src/pages/VentaPage.tsx` | Modified | bifurca caja abierta vs solo-lectura. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Duplicación de venta al reintentar sync | Med | `id_evento` idempotente (upsert por PK en Supabase). |
| Conflícto de stock entre cajas offline | Med | V1: stock es auditoría, no bloquea (RN-54); conciliación en fase posterior. |
| Pérdida de IndexedDB por limpieza del navegador | Low | backup a Storage/Supabase en cada sync exitoso. |
| RLS mal aplicada en upsert offline | Med | SQL nuevo bajo el mismo patrón `es_de_empresa` que el esquema vigente. |

## Rollback Plan

- Las nuevas tablas `sesion_caja` son aditivas (no rompen esquema actual). Rollback = `DROP` de
  `patch_08_*` y eliminar los módulos `lib/caja.ts`, `lib/colaOffline.ts`, `lib/autoSync.ts`.
- La app sigue funcionando en modo online puro si se desactiva la cola (flag `OFFLINE_ENABLED=false`).

## Dependencies

- **Vitest recomendado antes de implementar** (Strict TDD = false hoy; el proyecto no tiene test runner).
  La fase `sdd-design` debe definir la estrategia de test de la cola/auto-sync.
- `@supabase/supabase-js` v2 (ya presente) para upsert idempotente.

## Success Criteria

- [ ] Un equipo sin internet puede abrir caja y completar una venta; la venta queda en IndexedDB.
- [ ] Al volver internet, la venta se sube sola a Supabase sin acción del usuario y queda marcada `sync_ok`.
- [ ] Un equipo sin caja abierta solo puede consultar el catálogo (sin botón de vender).
- [ ] El stock offline se registra como auditoría y NO bloquea ninguna venta (RN-54/55).
- [ ] No hay duplicados al reintentar sync (idempotencia por `id_evento`).
- [ ] Sin conexión, la UI muestra estado offline y conteo de pendientes (badge mínimo).
