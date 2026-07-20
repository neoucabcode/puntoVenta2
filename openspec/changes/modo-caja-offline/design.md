# Diseño técnico: Modo Caja Offline (V1)

> **Decisión de arranque:** diseño el esquema, los módulos frontend, el flujo, la estrategia de
> test y los riesgos del cambio `modo-caja-offline`. El documento es la arquitectura + el DDL
> (`patch_08_sesion_caja.sql`); **no implementa código ni instala dependencias**.

## Resumen ejecutivo

V1 introduce venta offline multi-dispositivo respetando las reglas cerradas: sesión de caja por
`device_id` local (sin login extra), cola de eventos inmutables en IndexedDB con `id_evento`
idempotente, auto-sync silencioso al reconectar vía upsert RPC `security invoker`, y catálogo de
solo-lectura en equipos sin caja. El stock offline se registra como **auditoría** (RN-11) y **nunca
bloquea** (RN-54/55). RLS multi-tenant bajo el patrón `es_de_empresa` vigente; no se toca la deuda
Storage. El esquema es aditivo y reversible.

## Estado de conexión y restricciones del proyecto

| Tema | Valor |
|------|-------|
| Stack | React 18 + Vite 5 + TS 5 + Supabase JS 2 + Zustand 4 + vite-plugin-pwa |
| Strict TDD | `false` — **no hay test runner**; requiere instalar Vitest (pendiente de aprobación) |
| Copy / comentarios | español neutro/profesional |
| `numeric` de Postgres | se tipa como `string` en frontend (lección HANDOFF) |
| Supabase client | `web/src/lib/supabase.ts` exporta `supabase` (puede ser `null` si faltan env vars) |

## A. Esquema / SQL (`patch_08_sesion_caja.sql`)

DDL completo en `patch_08_sesion_caja.sql` (este mismo directorio). Resumen de decisiones:

### Tabla `sesion_caja` (REQ-1)
- `id uuid pk`, `empresa_id` (FK `empresa`), `dispositivo text` (device_id local), `estado`
  (`abierta`|`cerrada`), `saldo_inicial`, `abre_at`, `cierre_at`, `conteo_ventas`,
  `total_ventas_usd`. Índices por `empresa_id`, `(empresa_id, dispositivo)` y
  `(empresa_id, dispositivo, estado)` para la consulta "¿hay caja abierta en este dispositivo?".
- La caja es **opcional** (RN-53): si el admin la deshabilita, las ventas operan sin
  `sesion_caja_id` (se deja `null`).

### Tabla `venta_offline_event` (REQ-3 / REQ-4)
- **PK = `id_evento text`** generado en cliente (`evt-<uuid>`). Es la clave de idempotencia: el
  upsert por PK nunca crea dos ventas del mismo evento.
- `empresa_id` (FK), `dispositivo`, `sesion_caja_id` (FK opcional), `estado_sync`
  (`pendiente`|`sync_ok`|`sync_error`) para el badge de pendientes, `payload jsonb` (venta +
  detalles + pagos), `auditoria_stock jsonb` (salidas con causa `venta_offline`, RN-11),
  `intentos`, `ultimo_intento_at`, `sincronizado_en`. Índice
  `(empresa_id, dispositivo, estado_sync)` para listar pendientes.

### RLS
- Mismo patrón exacto que `schema_fase2.sql`: `enable row level security` + policy
  `..._propia on <tabla> for all using (public.es_de_empresa(empresa_id)) with check (...)`.
- **No se corrige la deuda Storage** aquí (fuera de scope por decisión del HANDOFF).

### RPC `aplicar_venta_offline(...)` — idempotencia en servidor
- `security invoker` (hereda RLS del usuario autenticado, patrón `patch_07`).
- `insert ... on conflict (id_evento) do update`: primer intento INSERTA y materializa
  `venta` + `venta_detalle` + `pago` + `movimiento_inventario` (auditoría); reintentos caen en
  `UPDATE` y **no** re-materializan (usa `xmax = 0` para distinguir INSERT vs UPDATE).
- El stock se registra como salida tipo `venta` con `documento_origen = venta_id` y observación
  `venta_offline`; **no** se valida ni bloquea stock (RN-54/55). Si `p_sesion_caja_id` existe,
  incrementa `conteo_ventas` / `total_ventas_usd`.

## B. Módulos frontend

Todos en `web/src/lib/` salvo el store. Tipado `numeric` → `string`. El client puede ser `null`
(sin env), así que cada módulo debe degradar a offline-safe.

### `lib/caja.ts` — sesión de caja por dispositivo
- `getDeviceId(): string` — `crypto.randomUUID()` persistido en `localStorage` (`pv-device-id`).
- `abrirCaja(saldoInicial: string): Promise<sesion_caja>` — insert en `sesion_caja` (estado
  `abierta`); si la caja está deshabilitada por admin (parámetro tenant) o no hay cliente Supabase,
  opera en modo "sin caja" (devuelve `null` y la app vende igual, RN-53).
- `cerrarCaja(id): Promise<void>` — `update` a `cerrada` + `cierre_at`.
- `hayCajaAbierta(dispositivo): Promise<boolean>` — consulta `estado='abierta'` para ese
  dispositivo (RESTRICCIÓN solo-lectura REQ-2).

### `lib/colaOffline.ts` — wrapper tipado IndexedDB
- Store `ventas_pendientes`, clave `id_evento`, índice por `estado`.
- Interfaz `EventoVentaOffline`: `{ id_evento, empresa_id, dispositivo, sesion_caja_id?, estado_sync, payload, auditoria_stock, intentos, creado_en }`.
- API: `guardarEvento(e)`, `listarPendientes(dispositivo)`, `marcarSyncOk(id_evento)`,
  `incrementarIntento(id_evento)`, `eliminarEvento(id_evento)`.
- **Offline-first**: se escribe localmente ANTES de cualquier intento de red (REQ-3).

### `lib/autoSync.ts` — detección y subida
- Estado online/offline vía `navigator.onLine` + `window` eventos `online`/`offline` + heartbeat
  periódico a Supabase (`select 1` o `rpc` liviano).
- `iniciarAutoSync()` — suscribe listeners; al pasar offline→online dispara `sincronizarPendientes()`.
- `sincronizarPendientes()` — lee pendientes de `colaOffline`, llama `aplicar_venta_offline` por
  cada uno; en éxito `marcarSyncOk`; en fallo `incrementarIntento` y reintenta con **backoff
  exponencial** (sin duplicar: el RPC es idempotente). Actualiza el badge de pendientes en el store.
- Expuye `estaOnline(): boolean` y un callback de cambio de estado para la UI.

### Store `store/useCajaStore.ts` (Zustand 4)
- Estado: `cajaAbierta: boolean`, `sesionCajaId: string | null`, `online: boolean`,
  `pendientes: number`. Acciones: `setCajaAbierta`, `setOnline`, `setPendientes`, `refrescar()`.
- No persiste en `localStorage` los eventos (eso es IndexedDB); sí persiste `cajaAbierta` para
  arranque rápido de la UI (con re-validación contra Supabase al volver online).

## C. Flujo — secuencia "vende offline → reconecta → auto-sync"

```
Usuario (sin internet)          VentaPage (caja abierta)        colaOffline (IndexedDB)        autoSync
      |                               |                              |                            |
      | pulsa "Vender"                |                              |                            |
      |------------------------------>|                              |                            |
      |                               | arma EventoVentaOffline      |                            |
      |                               | (id_evento=evt-<uuid>)       |                            |
      |                               |----------------------------->| guardarEvento(e)           |
      |                               |                              | (estado_sync='pendiente')  |
      |<------------------------------| comprobante local OK        |                            |
      |                               | setPendientes(+1)            |                            |
      |                               | (badge: 1 pendiente)         |                            |
      |                               |                              |                            |
== conexión vuelve ==                  |                              |                            |
                                evento 'online'                  |                            |
                                       |--------------------------|--------------------------->|
                                       |                           sincronizarPendientes()      |
                                       |                           listaPendientes(dispositivo) |
                                       |                           por cada evento:             |
                                       |                           rpc aplicar_venta_offline()  |
                                       |                           (upsert idempotente)         |
                                       |<--------------------------| marcarSyncOk(id_evento)     |
                                       | setPendientes(0)          |                            |
                                       |<--------------------------| (badge desaparece)          |
```

Reintento si el acuse local se pierde: al volver a correr, `aplicar_venta_offline` cae en
`ON CONFLICT DO UPDATE` → no duplica venta; el evento queda `sync_ok`.

## D. Estrategia de test (Vitest, pendiente de aprobación)

**No se instala Vitest en esta fase.** Requiere aprobación del usuario para añadir la dependencia
dev. La configuración propuesta:

- Archivo `web/vitest.config.ts` (o sección `test` en `vite.config.ts`) con `environment: 'node'`
  para `colaOffline` (IndexedDB se mockea con `fake-indexeddb`) y `environment: 'happy-dom'` para
  `autoSync` (stub de `navigator.onLine` / eventos).
- Tests unitarios mínimos:

| Módulo | Caso | Assert |
|--------|------|--------|
| `colaOffline` | idempotencia | guardar dos veces el mismo `id_evento` deja **un** registro |
| `colaOffline` | persistencia | tras `guardarEvento`, `listarPendientes` lo retorna con `estado_sync='pendiente'` |
| `colaOffline` | marcar sync | `marcarSyncOk` cambia estado y `listarPendientes` ya no lo cuenta |
| `autoSync` | reintento sin duplicar | con RPC mockeado que falla y luego acierta, el callback de subida se invoca 1 vez por evento, no N |

- `autoSync` se testea inyectando el cliente Supabase mock y un `fake-indexeddb`, simulando
  transición offline→online para verificar que dispara exactamente una subida idempotente por
  evento.

## E. Riesgos y mitigaciones

| Riesgo | Prob. | Mitigación |
|--------|-------|------------|
| Pérdida de IndexedDB (limpieza de navegador) | Baja | Backup implícito: cada sync exitoso deja la venta en Supabase; el badge cero confirma. Fuera de V1: snapshot a Storage. |
| Idempotencia en reintento | Med | PK `id_evento` + RPC `ON CONFLICT DO UPDATE` que solo materializa en INSERT (`xmax=0`). |
| RLS mal aplicada en upsert | Med | SQL bajo patrón `es_de_empresa` idéntico al vigente; RPC `security invoker`. |
| Conflictos de stock entre cajas | Med | **Aceptado**: stock = auditoría (RN-11), nunca bloquea (RN-54/55). Conciliación en fase posterior. |
| Cliente Supabase `null` (sin env) | Baja | Módulos degradan a offline-safe; `caja.ts` opera "sin caja" si aplica RN-53. |
| Doble envío por doble disparo de `online` | Baja | `autoSync` marca en vuelo los eventos (`intentos`) y el RPC es idempotente de todos modos. |

## Checklist de revisión

- [ ] El DDL aplica `es_de_empresa` igual que `schema_fase2.sql` (no rompe RLS).
- [ ] `id_evento` es PK y el RPC no duplica en reintento.
- [ ] `colaOffline` escribe antes de la red (offline-first).
- [ ] `autoSync` usa backoff y no duplica.
- [ ] El badge de pendientes se alimenta del store.
- [ ] Vitest queda pendiente de aprobación (no instalado aquí).

## Next step

Fase `sdd-tasks`: descomponer en tareas (DDL → módulos → store → flujo → tests).
