# Verify Report — `rediseno-ui-caja-inventario` / Slice 1 (MVP)

- **Cambio:** `rediseno-ui-caja-inventario`
- **Slice verificado:** 1 (MVP — separación UI + Inventario admin)
- **Rama:** `rediseno-ui/1-ui-sep` (HEAD = `d7a1186`)
- **Modo:** Standard verify (TDD estricto inactivo)
- **Verificador:** `sdd-verify` (executor) — re-validación post-fix de aislamiento multi-tenant
- **Status:** **PASS** (con WARNINGS W1/W2 que son acción de usuario, NO bloquean código)

---

## Executive Summary

Re-validación tras el fix `d7a1186`. Los dos CRITICAL previos (**C1** `crearProducto` sin `empresa_id`, **C2** `crearCategoria` sin `empresa_id`) quedaron **resueltos**: ambos `insert` ahora incluyen `empresa_id` vía `obtenerMiEmpresaId()` con guarda `null → throw`, y se añadieron 4 tests que cubren el camino real de `insert` (antes ciego). **`npm test` = 44/44 y `npm run build` = exit 0**, y los 4 archivos de caja offline (`useCajaStore.ts`, `ventaOffline.ts`, `autoSync.ts`, `PosPage.tsx`) **no fueron tocados** en los 5 commits del Slice 1 + fix.

Quedan como **WARNING de acción del usuario** (no bloquean el código):
- **W1:** `supabase/patch_09_inventario.sql` (RPC `aplicar_ajuste_stock` + `empresa.logo_url`) no aplicado en BD → ajuste de stock falla hasta que el usuario lo aplique.
- **W2:** `usuario.rol` null en producción bloquea Inventario; el fallback dev deja pasar. El dueño debe correr `UPDATE usuario SET rol='admin'`.

---

## Evidencia de ejecución

| Comando | Resultado |
|---|---|
| `cd web && npm test` (`vitest run`) | **44/44 pass**, 11 test files, exit 0. (stderr = warnings SSR de `useLayoutEffect` en `renderToStaticMarkup`, no fallos) |
| `cd web && npm run build` (`tsc -b && vite build`) | **exit 0**, `✓ built in 8.10s`, bundle generado (`dist/`, PWA SW ok) |
| `git diff --stat HEAD~5..HEAD` (Slice 1 + fix) | 26 archivos, **sin** `useCajaStore.ts` / `ventaOffline.ts` / `autoSync.ts` / `PosPage.tsx` |
| Grep `productos.ts` por `empresa_id` | `crearProducto` l.153 `empresa_id: empresaId`; `crearCategoria` l.237 `.insert({ nombre, empresa_id: empresaId })`; ambas con guarda `if (!empresaId) throw` (l.147, l.232) |
| Grep `productos.test.ts` | l.100 `inserta en "producto" con empresa_id definido`; l.112 `lanza y NO inserta si no hay empresa_id`; l.131 `inserta en "categoria" con empresa_id definido`; l.142 `lanza y NO inserta si no hay empresa_id` |

`test_exit_code=0`, `build_exit_code=0`. Hashes de salida omitidos por brevedad (evidencia textual arriba).

---

## Compliance Matrix (spec → evidencia)

| Spec / Req | Escenario | Estado | Evidencia |
|---|---|---|---|
| `catalogo-solo-lectura` — Catálogo siempre RO | oculta Crear/Editar/Borrar/Vender | PASS | `CatalogoPage.tsx` (sin `ProductoForm`/`Vender`/`soloLectura`); grep 0 |
| `catalogo-solo-lectura` — Admin no edita desde catálogo | no `ProductoForm`, no `Vender` | PASS | `CatalogoPage.test.tsx:2` (test "no renderiza botón Vender…") |
| `catalogo-solo-lectura` — Lectura offline | cache local | PASS (heredado) | `obtenerCatalogo` en `CatalogoPage.tsx:46`; `cacheCatalogo.test.ts` |
| `catalogo-solo-lectura` — Componentes ausentes | sin nodos `ProductoForm`/`Vender`, sin var `soloLectura` | PASS | grep 0 + `CatalogoPage.test.tsx` |
| `inventory-management` — Acceso gated solo admin | nav oculta + deny | PASS | `Layout.tsx:12-16,33`; `InventarioPage.tsx:30,144-153`; `Layout.test.tsx`, `InventarioPage.test.tsx` |
| `inventory-management` — Vendedor bloqueado | oculta nav + deniega | PASS (componente) | `useUsuarioRol.ts:25` (`cajero`→`false`); tests |
| `inventory-management` — Rol no implementado (fallback) | dev null→admin+warning | PASS* | `useUsuarioRol.ts:26-34` + test "loguea warning en fallback de desarrollo" |
| `inventory-management` — CRUD productos | alta con `empresa_id`+`stock_minimo` | **PASS** (resuelto) | `productos.ts:146-153` inserta `empresa_id: empresaId` + guarda null→throw; tests `productos.test.ts:100,112` |
| `inventory-management` — CRUD categorías | alta con `empresa_id` | **PASS** (resuelto) | `productos.ts:231-237` inserta `empresa_id: empresaId` + guarda null→throw; tests `productos.test.ts:131,142` |
| `inventory-management` — Ajuste stock + motivo + auditoría | RPC `aplicar_ajuste_stock` | PASS (código) / **WARN** (BD no aplica SQL) | `productos.ts:316-339`; `patch_09_inventario.sql` no aplicado |
| `inventory-management` — Alerta bajo stock | badge `stock<=stock_minimo` | PASS | `InventarioPage.tsx:25-27,235-239` + test implícito |
| `inventory-management` — Valuación | Σ(costo×stock)=50 | PASS | `productos.ts:287-291` + `productos.test.ts:20-27` |

(*) El design dec.1 decía "rol null → denegar"; la impl usa dev→admin (es lo que el task pidió confirmar). Ver SUGGESTION-3.

---

## Findings

### CRITICAL

**Ninguno.** Los dos CRITICAL previos (C1, C2) fueron resueltos por el commit `d7a1186` y verificados con tests de cobertura del camino real de `insert` (no mocks ciegos).

### WARNING

**W1 — `patch_09_inventario.sql` NO aplicado en BD.** (Acción del usuario — NO bloquea código)
- La RPC `aplicar_ajuste_stock` (security invoker) y `empresa.logo_url` viven sólo en el repo (`supabase/patch_09_inventario.sql`), no en la BD de destino.
- `web/src/lib/productos.ts:330` llama `supabase.rpc('aplicar_ajuste_stock', …)`. Hasta aplicar el SQL, el ajuste de stock falla en runtime (RPC inexistente).
- Acción: el usuario debe ejecutar `patch_09_inventario.sql` en Supabase. (El ajuste negativo respeta RN-55 vía `empresa.stock_negativo` en la RPC.)

**W2 — Rol nulo en producción deniega Inventario (bloqueo hasta definir admin).** (Acción del usuario — NO bloquea código)
- `web/src/hooks/useUsuarioRol.ts:33-34`: en producción (`dev=false`), `rol null` → `esAdmin=false` → `inventarioHabilitado=false` → pantalla "Acceso restringido".
- `web/src/lib/empresa.ts:80-91`: `obtenerMiRol` devuelve `null` si hay error (p.ej. columna `rol` ausente o usuario sin rol).
- Acción: el dueño debe ejecutar el `UPDATE usuario SET rol='admin'` documentado en `patch_09_inventario.sql:8-10`. En dev el fallback administra con warning (esperado).

### SUGGESTION

**S1 — `ProductoForm` no se reubicó al subdir planeado.** T1.6 decía mover a `web/src/components/inventario/ProductoForm.tsx`, pero quedó en `web/src/components/ProductoForm.tsx`. El AC ("no importado por `CatalogoPage`") se cumple (grep limpio en `CatalogoPage.tsx`). Reubicar para alinear con design.md.

**S2 — Falta test de ruteo para acceso directo por URL.** El threat matrix (design.md) pide RED: "acceso directo por URL como cajero → 403/redirect". Hoy el deny es a nivel de componente (`InventarioPage` gate), no un `<Navigate>` de ruta. Está cubierto indirectamente (nav oculta + gate), pero no hay test que monte `<Routes>` y verifique la denegación/redirección por URL. Añadir test de ruta.

**S3 — Alinear design.md con el fallback de rol.** Design dec.1 dice literalmente "Fallback: rol null/undefined → denegar Inventario"; la implementación usa dev→admin (lo que el task pidió confirmar, con warning). Actualizar design.md para reflejar el fallback de desarrollo.

---

## Artifacts

- `openspec/changes/rediseno-ui-caja-inventario/verify-report.md` (este archivo)
- Engram `topic_key = sdd/rediseno-ui-caja-inventario/verify-report` (capture_prompt=false)

## Next Recommended

**`apply` (Slice 2)** — no hay CRITICAL pendientes. Los WARNING (W1, W2) son dependencias de BD/rol a cargo del usuario y no bloquean el código; deben resolverse antes de usar Inventario en producción, pero no detienen la continuación del pipeline hacia Slice 2.

## Risks

- **Riesgo conocido (W1):** `patch_09_inventario.sql` no aplicado → ajuste de stock falla hasta aplicar SQL. (Acción usuario)
- **Riesgo conocido (W2):** rol null en producción bloquea Inventario hasta definir admin. (Acción usuario)
- **Riesgo mitigado:** defecto de aislamiento multi-tenant en alta de producto/categoría por `empresa_id` faltante → **resuelto** en `d7a1186` con guarda null→throw y tests de cobertura del camino real de `insert`.
- **Riesgo residual de cobertura:** los tests de `productos.ts` usan mock de `supabase` para el `insert`, no una BD real; la validación real contra RLS/NOT NULL en producción depende de que `obtenerMiEmpresaId()` devuelva el `empresa_id` correcto (ya respaldado por `empresa.test.ts`).

## Skill Resolution

- `sdd-verify`: ejecutado como executor (no delegó). Se leyeron specs, design.md (Slice 1) y tasks.md. Verificación full (spec+design+tasks) con tests y build reales + inspección de fuente + grep + git diff.
- `verification-before-completion`: se ejecutaron `npm test` y `npm run build` en esta sesión y se leyó la salida completa antes de emitir el veredicto. No se afirmó "pass" sin evidencia fresca.
- Tareas Slice 1 marcadas `[x]`; C1/C2 corregidos y verificados con tests nuevos en `productos.test.ts`.
