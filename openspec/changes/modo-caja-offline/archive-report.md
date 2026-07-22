# Archive Report — Modo Caja Offline (V1)

> **Resultado:** cambio SDD `modo-caja-offline` ARCHIVADO el 2026-07-20. Venta offline
> multi-dispositivo completa y verificada (18/18 tests, build OK, sin hallazgos CRITICAL).
> WARNINGs W1/W2/W4 cerrados. SQL `patch_08` ya aplicado por el usuario.
> **Pendiente manual (no es bug):** prueba de idempotencia real en Supabase.

## Estado final

| Comando | Resultado |
|---|---|
| `cd web && npm test` (`vitest run`) | **18/18 pass** (12 base + 6 de cierre W4/W1/W2) |
| `cd web && npm run build` (`tsc -b && vite build`) | exit 0 (PWA build OK) |
| Tasks (`tasks.md`) | **18/18 `[x]`** — todas las fases 1–6 completas |
| Verify verdict | PASS WITH WARNINGS → sin CRITICAL tras cierre de W1/W2/W4 |

## Qué se entregó (REQ-1..REQ-4)

- **REQ-1 — Sesión de caja por dispositivo:** `lib/caja.ts` (`getDeviceId` en `localStorage` `pv-device-id`,
  `abrirCaja`/`cerrarCaja`/`hayCajaAbierta`). Caja opcional (RN-53).
- **REQ-2 — Catálogo solo-lectura condicional:** `CatalogoPage`/`PosPage` ocultan Crear/Editar/Borrar/Vender
  si caja habilitada y no abierta. `cacheCatalogo.ts` sirve caché IndexedDB offline.
- **REQ-3 — Cola offline IndexedDB:** `colaOffline.ts` guarda evento inmutable por `id_evento` (offline-first,
  keyPath idempotente). Badge de pendientes en `Layout.tsx`.
- **REQ-4 — Auto-sync silencioso:** `autoSync.ts` detecta offline→online + heartbeat y sube vía RPC
  `aplicar_venta_offline` (`security invoker`, upsert por PK); backoff exponencial, sin duplicar.
- **Stock = auditoría:** `movimiento_stock` causa `venta_offline` (RN-11), nunca bloquea (RN-54/55).

## Ramas creadas (stacked, sin push)

| Rama | HEAD | Contenido |
|---|---|---|
| `modo-caja-offline/1-foundacion` | `b81bea3` | Entrega `patch_08_sesion_caja.sql` (ACCIÓN USUARIO) + base Vitest |
| `modo-caja-offline/2-libs` | `38619ed` | `colaOffline.ts`, `caja.ts`, `autoSync.ts`, `useCajaStore.ts` (Phases 2–3) |
| `modo-caja-offline/3-ui` | `bff2380` | UI solo-lectura + badge + `cacheCatalogo` inicial (Phase 5) |
| `modo-caja-offline/4-fixes` | `1fc80cf` | Cierre W4/W1/W2 (sin tocar SQL) + addendum |

`HEAD` actual del repo: `modo-caja-offline/4-fixes`. Ninguna rama fue pusheada.

## SQL aplicado

- `openspec/changes/modo-caja-offline/patch_08_sesion_caja.sql` — **YA APLICADO por el usuario** en
  Supabase (tablas `sesion_caja` + `venta_offline_event` y RPC `aplicar_venta_offline` vivos).
- Es aditivo: no modifica tablas existentes. Rollback = dropear función/tablas, sin romper el esquema.

## WARNINGs cerrados (ver `verify-report-addendum.md`)

| WARNING | Estado | Fix |
|---|---|---|
| **W4** — `usuario_id=''` rompía sync en silencio | **CERRADO** | Cache de uuid en `localStorage` `pv-uid`; si falta, evento queda `sync_error` con mensaje, no `pendiente` infinito |
| **W1** — catálogo sin caché offline | **CERRADO** | `lib/cacheCatalogo.ts` (IndexedDB solo-lectura) + indicador "catálogo sin conexión (cached)" |
| **W2** — backoff / reintento incompleto | **CERRADO** | Backoff exponencial (1s→30s) + flush en recovery de heartbeat vía `ping` inyectable |
| W3 — abrir/cerrar reales sin test runtime | Aceptado | Cubierto por verificación manual de idempotencia (ver abajo) |

## PENDIENTE manual (no es bug — agente sin credenciales)

- **Idempotencia real en Supabase:** seguir `SQL_ACCION_USUARIO.md`. El agente no tiene `.env.local`,
  así que el reintento en servidor no se ejecutó en automatizado.
- Esperado: `aplicar_venta_offline('evt-verificacion-001', <empresa_id>, 'disp-verificacion', null, <payload>, '[]')`
  → `insertado=true` la 1ª vez, `false` la 2ª, y **1 sola fila** en `venta_offline_event`.
- Esto no bloquea el archive (la lógica está verificada por lectura y los tests locales de idempotencia pasan).

## Trazabilidad Engram (artifact_store: both)

| Artifact | Observation ID | topic_key |
|---|---|---|
| Proposal | #6 | `sdd/modo-caja-offline/proposal` |
| Specs (REQ-1..4) | #7 | `sdd/modo-caja-offline/spec` |
| Design + patch_08 | #8 | `sdd/modo-caja-offline/design` |
| Tasks | #9 | `sdd/modo-caja-offline/tasks` |
| Apply progress | #10 | `sdd/modo-caja-offline/apply-progress` |
| Verify report | #11 | `sdd/modo-caja-offline/verify-report` |
| Fixes W4/W1/W2 | #12 | `sdd/modo-caja-offline/fixes-w4w1w2` |
| **Archive report** | (este) | `sdd/modo-caja-offline/archive-report` |

## Decisiones de archivo

- `openspec/specs/` central **no existe** en este repo → NO se mueve el change a `archive/`.
  Se deja en `openspec/changes/modo-caja-offline/` y se marca `status: archived` en el header de
  `proposal.md`. Las delta specs REQ-1..4 permanecen como fuente de verdad del cambio.
- No se hace push ni PR (lo resuelve el orchestrator).
- `HANDOFF.md` actualizado con la sección "Modo Caja Offline (V1, 2026-07-20)".

## Checklist de cierre

- [x] Tasks 18/18 en `[x]`
- [x] Tests 18/18 verdes, build OK
- [x] SQL `patch_08` aplicado (confirmado por el usuario)
- [x] WARNINGs W4/W1/W2 cerrados; W3 aceptado
- [x] Archive-report escrito + persistido en Engram
- [x] Change marcado `status: archived`
- [x] HANDOFF.md actualizado
- [ ] **Pendiente usuario:** prueba manual de idempotencia (SQL_ACCION_USUARIO.md)
- [ ] **Pendiente orchestrator:** push / PR de las 4 ramas
