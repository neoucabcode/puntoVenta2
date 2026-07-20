# Addendum — cierre de WARNINGs W4 / W1 / W2 (modo-caja-offline)

> Fecha: 2026-07-20. Rama: `modo-caja-offline/4-fixes`. Autor: sub-agent `sdd-apply`.
> Cierra los WARNING W4, W1 y W2 del `verify-report.md`. NO se tocó SQL ni el esquema.

## Estado resultante

| WARNING | Estado | Fix aplicado | Tests |
|---|---|---|---|
| **W4** — `usuario_id` vacío rompe sync en silencio | **CERRADO** | Se cachea el uuid del usuario autenticado localmente (`setUsuarioIdCache` en `auth.login`/`registro`, persistido en `localStorage` `pv-uid`; `obtenerMiUsuarioId` lo devuelve primero). Si aún así no hay uuid (offline 100% sin login), el evento se encola como `estado_sync='sync_error'` con `mensaje_error` claro y NO queda "pendiente" infinito reintentando. El badge cuenta `sync_error` vía `cola.contarPendientes`. | `ventaOffline.test.ts` (a: uuid presente → pendiente; b: uuid ausente → sync_error y no lanza) |
| **W1** — catálogo sin caché offline | **CERRADO** | Nuevo `lib/cacheCatalogo.ts` (IndexedDB, solo lectura). `CatalogoPage` usa `obtenerCatalogo(fetcher)` que sirve la caché cuando `navigator.onLine === false` o la query falla, y muestra el indicador "catálogo sin conexión (cached)". No rompe el gating de solo-lectura (REQ-2). | `cacheCatalogo.test.ts` (a: tras carga hay caché; b: offline devuelve caché sin llamar al fetcher) |
| **W2** — backoff / reintento automático incompleto | **CERRADO** | `sincronizarPendientes` ahora reintenta con **backoff exponencial** (1s,2s,4s… cap 30s) para eventos `pendiente`. El heartbeat (`iniciarAutoSync`) usa un `ping` inyectable y, al pasar de caído→conectado, dispara el flush de la cola (`forzarOnline` para no depender de `navigator.onLine`). Los eventos `sync_error` NO se reintentan. El RPC sigue siendo idempotente (no duplica). | `autoSync.test.ts` (backoff: fallo→éxito reintenta con delays 10/20ms y sincroniza; heartbeat: recovery dispara flush) |

## Archivos modificados / creados

- `web/src/lib/empresa.ts` — cache de uuid de usuario (`setUsuarioIdCache`/`limpiarCacheUsuario`, `obtenerMiUsuarioId` usa cache).
- `web/src/lib/auth.ts` — set/clear de cache en login/registro/logout.
- `web/src/lib/colaOffline.ts` — `mensaje_error?`, `listarSyncError`, `contarPendientes` (pendiente+sync_error), `obtenerEvento`.
- `web/src/lib/ventaOffline.ts` — usa uuid cacheado; `sync_error` + `mensaje_error` si falta usuario.
- `web/src/store/useCajaStore.ts` — badge cuenta `sync_error` (`cola.contarPendientes`).
- `web/src/lib/autoSync.ts` — backoff exponencial con reintento autolimpiable; heartbeat recovery vía `ping` inyectable + `forzarOnline`.
- `web/src/lib/cacheCatalogo.ts` — **nuevo**: caché de catálogo solo lectura (IndexedDB).
- `web/src/pages/CatalogoPage.tsx` — usa `obtenerCatalogo`; indicador offline-cache.
- `web/src/index.css` — estilo `.aviso-cache`.
- Tests: `ventaOffline.test.ts` (nuevo), `cacheCatalogo.test.ts` (nuevo), `autoSync.test.ts` (+2 W2).

## Verificación fresca

- `cd web && npm test` → **18/18 pass** (12 previos + 6 nuevos).
- `cd web && npm run build` → **exit 0** (112 módulos, PWA build OK).

## Notas / riesgos

- W4: si el usuario está offline sin login previo, la venta queda `sync_error` (no se pierde, pero requiere iniciar sesión para sincronizar). Es comportamiento intencional, no un hackeo de uuid cero.
- W1: la caché se guarda solo en la carga inicial (`reset=true`); el "load more" no sobreescribe la caché. Es catálogo solo-lectura, acorde a REQ-2.
- W2: los reintentos respetan la idempotencia del RPC; no se duplican ventas.
