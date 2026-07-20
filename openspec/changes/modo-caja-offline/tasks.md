# Tasks: Modo Caja Offline (V1)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~700–900 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 (ver abajo) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | SQL + test runner base | PR 1 | `npm test -- --passWithNoTests` (solo config) | `npm run build` (typecheck) | `web/vitest.config.ts`, `package.json` (revertibles) |
| 2 | Libs offline + store (cola, caja, autoSync, store) + tests | PR 2 | `npm test` (cola + autoSync) | `npm run dev` + DevTools offline → venta → recarga | `web/src/lib/colaOffline.ts`, `caja.ts`, `autoSync.ts`, `store/useCajaStore.ts` |
| 3 | UI (catálogo solo-lectura + badge) | PR 3 | `npm test` (regression) | `npm run dev` abrir/cerrar caja, badge | `CatalogoPage.tsx`, `ProductoForm.tsx`, `Layout.tsx` |

---

## Phase 1: Fundación (Infraestructura + SQL)

- [x] 1.1 Instalar Vitest + `fake-indexeddb` como devDeps en `web/package.json` (`vitest`, `fake-indexeddb`, `happy-dom`). Añadir script `"test": "vitest run"` y `"test:watch": "vitest"`.
- [x] 1.2 Crear `web/vitest.config.ts` con `test.environment='happy-dom'`, `setupFiles` que importe `fake-indexeddb/auto`, y `globals:true`. Scan de `web/src/**/*.test.ts`. (NOTA: IndexedDB requiere DOM-like env; NO usar `environment:'node'`.)
- [x] 1.3 Tarea usuario: aplicar `openspec/changes/modo-caja-offline/patch_08_sesion_caja.sql` en Supabase con `service_role` (SQL ya listo en el archivo; el agente NO ejecuta con secret). Entregar el SQL y la ruta al usuario.
- [x] 1.4 Tarea usuario: crear RPC `aplicar_venta_offline` (incluida en patch_08 §4). Mismo entregable que 1.3 — un solo SQL cubre DDL + RPC. Nota de verificación: script psql con dos llamadas al mismo `id_evento` debe devolver `insertado=true` la primera y `false` la segunda sin fila duplicada.

**Archivos**: `web/package.json`, `web/vitest.config.ts`, `openspec/changes/modo-caja-offline/patch_08_sesion_caja.sql` (entregable usuario).
**Dependencias**: ninguna.
**Tipo**: 1.1/1.2 code; 1.3/1.4 sql-usuario.
**Done**: `npm test` corre (aunque sin suites todavía); SQL aplicado y RPC verificada idempotente por el usuario.

## Phase 2: Núcleo — módulos offline

- [x] 2.1 Crear `web/src/lib/colaOffline.ts`: interfaz `EventoVentaOffline` (`id_evento`, `empresa_id`, `dispositivo`, `sesion_caja_id?`, `estado_sync`, `payload`, `auditoria_stock`, `intentos`, `creado_en`); función `abrirDB()` (IndexedDB `pv-caja`, store `ventas_pendientes`, keyPath `id_evento`, índice `estado_sync`); API `guardarEvento(e)` (idempotente: put), `listarPendientes(dispositivo)`, `marcarSyncOk(id)`, `incrementarIntento(id)`, `eliminarEvento(id)`. numeric→string.
- [x] 2.2 Crear `web/src/lib/caja.ts`: `getDeviceId()` (crypto.randomUUID persistido en localStorage `pv-device-id`); `abrirCaja(saldoInicial:string):Promise<sesion_caja|null>` (insert `sesion_caja` estado `abierta`; si no hay cliente Supabase o caja deshabilitada → devuelve `null`, RN-53); `cerrarCaja(id):Promise<void>`; `hayCajaAbierta(dispositivo):Promise<boolean>`; `obtenerCajaActual(dispositivo):Promise<sesion_caja|null>`.
- [x] 2.3 Crear `web/src/lib/autoSync.ts`: `estaOnline():boolean`; `iniciarAutoSync(handlers)` suscribe `window` eventos `online`/`offline` + `navigator.onLine`; `sincronizarPendientes()` lee cola, llama RPC `aplicar_venta_offline` por evento, en éxito `marcarSyncOk`, en fallo `incrementarIntento` (backoff exponencial); callback `onCambioEstado(online, pendientes)`. Degrada si `supabase` es `null`.

**Archivos**: `web/src/lib/colaOffline.ts`, `web/src/lib/caja.ts`, `web/src/lib/autoSync.ts`.
**Dependencias**: 1.1, 1.2 (Vitest), 1.3 (tablas en Supabase).
**Tipo**: code.
**Done**: los tres módulos compilan con `tsc -b`; `colaOffline` y `caja` tipados; `autoSync` inyecta RPC.

## Phase 3: Store + Integración de estado

- [x] 3.1 Crear `web/src/store/useCajaStore.ts` (Zustand 4): estado `cajaAbierta:boolean`, `sesionCajaId:string|null`, `online:boolean`, `pendientes:number`; acciones `setCajaAbierta`, `setOnline`, `setPendientes`, `refrescar()`. Persistir `cajaAbierta`+`sesionCajaId` (no los eventos). Cablear con `caja.ts` (init `hayCajaAbierta`) y `autoSync` (handlers de `onCambioEstado` y `sincronizarPendientes`).
- [x] 3.2 Arranque: en `main.tsx` o `Layout`, llamar `refrescar()` + `iniciarAutoSync(...)` una vez para poblar `online`/`pendientes` y disparar sync al reconectar.

**Archivos**: `web/src/store/useCajaStore.ts`, `web/src/main.tsx` (o `Layout.tsx`).
**Dependencias**: 2.1, 2.2, 2.3.
**Tipo**: code.
**Done**: al abrir la app el store refleja caja/online/pendientes; al volver online se sincroniza.

## Phase 4: Tests Vitest

- [x] 4.1 `colaOffline.test.ts`: (a) idempotencia — `guardarEvento` dos veces mismo `id_evento` deja 1 registro; (b) persistencia — tras guardar, `listarPendientes` retorna con `estado_sync='pendiente'`; (c) `marcarSyncOk` saca el evento de pendientes; (d) `eliminarEvento` limpia. Usa `fake-indexeddb/auto`.
- [x] 4.2 `autoSync.test.ts`: con RPC mock (falla N veces, luego acierta) y `fake-indexeddb`, simular transición offline→online; assert que la subida por evento se invoca exactamente 1 vez (no N por doble disparo) y el evento queda `sync_ok`.
- [x] 4.3 (opcional) `caja.test.ts`: `getDeviceId` estable; `abrirCaja` sin cliente devuelve `null` (RN-53).

**Archivos**: `web/src/lib/colaOffline.test.ts`, `web/src/lib/autoSync.test.ts`, `web/src/lib/caja.test.ts`.
**Dependencias**: 2.1, 2.2, 2.3, 3.1.
**Tipo**: test.
**Done**: `npm test` verde; cubre REQ-3 (idempotencia/persistencia) y REQ-4 (reintento sin duplicar).

## Phase 5: UI — solo-lectura + badge

- [x] 5.1 `CatalogoPage.tsx`: leer `cajaAbierta` de `useCajaStore`; si caja habilitada y NO abierta → ocultar botones "Crear", "Editar", "Borrar", "Vender" (REQ-2 escenario consulta). Si caja deshabilitada (RN-53) → mostrar controles.
- [x] 5.2 `ProductoForm.tsx` / botones de venta: deshabilitar acción "vender" cuando `!cajaAbierta` y caja habilitada. En `PosPage.tsx` enrutar la venta a `colaOffline.guardarEvento` (offline-first) en vez de insert directo.
- [x] 5.3 `Layout.tsx`: badge de pendientes en `topbar` (leer `pendientes` de `useCajaStore`); mostrar "X pendientes" y estado online/offline. Ocultar si `pendientes===0`.

**Archivos**: `web/src/pages/CatalogoPage.tsx`, `web/src/components/ProductoForm.tsx`, `web/src/pages/PosPage.tsx`, `web/src/components/Layout.tsx`.
**Dependencias**: 3.1 (store).
**Tipo**: code.
**Done**: sin caja abierta los controles de edición/venta están ocultos; con caja abierta habilitados; badge refleja cola.

## Phase 6: Verificación final

- [x] 6.1 Correr `npm test` en `web/` → todos verdes.
- [x] 6.2 Correr `npm run build` (tsc -b + vite build) → sin errores de tipo.
- [x] 6.3 Reportar salida de ambos comandos en el cambio SDD.

**Archivos**: n/a (verificación).
**Dependencias**: 4.x, 5.x.
**Tipo**: test.
**Done**: ambos comandos exitosos; resultado documentado.
