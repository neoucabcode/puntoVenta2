# MATRIX — Punto de Retorno (estado vivo del proyecto)

> **Uso:** Al iniciar una sesión nueva, el asistente lee este archivo con la palabra clave
> **"matrix"** y continúa el hilo sin que el usuario repita contexto. Este archivo es la
> fuente de verdad del estado. Se actualiza al cerrar cada avance.
>
> **REGLAS DE ORO:**
> 1. Si el usuario dice "no sé por dónde quedamos" o "revisa handoff", leer ESTE archivo primero.
> 2. **El HANDOFF se actualiza a medida que trabajamos.** Las decisiones tomadas en sesión
>    son las que cuentan, por encima del historial viejo. Si algo de abajo contradice lo que
>    el usuario acaba de decidir, manda la decisión nueva.
> 3. La fuente de verdad del PROYECTO es el código funcionando + este archivo, NO GitHub.
>    Lo de GitHub es un espejo; construimos desde aquí.

## Proyecto
Sistema de punto de venta para ferretería bimonetaria (Venezuela: BS / USD). Carpeta:
`C:\Proyectos\puntoVenta2`. Empresa del dueño: **FerrehogarMart**
(id `b72bb1ff-9b7d-4e69-bb79-edd6f64c8b9b`).

## Estado actual (última actualización: 2026-07-20, sesión de reestructura de catálogo + Modo Caja Offline V1)

### Decisión de arquitectura del catálogo (SESÍÓN 2026-07-20 — manda sobre lo viejo)
- **Fuente de datos del catálogo = un Excel en Drive**, NO la app todavía.
  - Archivo: `G:\Mi unidad\puntoVenta2Tabla\catalogo_inicial.xlsx`
  - Hoja: `Productos`. **Dentro de la hoja hay una TABLA con nombre `TablaProductos`**
    (rango `A1:E565`, 564 filas de datos). El script lee SOLO la tabla, no la hoja suelta.
  - Columnas de la tabla: `SKU | PRODUCTO | VENTA $ | CATEGORIA | UND VENTA`.
  - `VENTA $` es **USD directo** → va a `precio_usd` sin conversión.
  - La columna `Imágenes` de la hoja es **CHECKLIST PERSONAL del usuario** (marca "x" para
    llevar cuenta de imágenes procesadas). El script la IGNORA.
- **Supabase es la fuente de verdad en runtime.** El Excel solo se usa al inicio / mientras el
  usuario lo edita como hoja de cálculo. Una vez que la app arranca en uso real, el catálogo se
  gestiona desde la app.
- **Imágenes:** viven en Supabase Storage bucket `productos`, en la **RAÍZ** del bucket:
  `productos/{sku}.webp`, enlazadas por `producto.imagen_url`
  (`https://pvopcajqersioqlmccwg.supabase.co/storage/v1/object/public/productos/{sku}.webp`).
  - Convención: el usuario nombra el archivo local igual que el SKU (`{sku}.webp`).
  - Carpeta local de imágenes en Drive: `G:\Mi unidad\puntoVenta2Tabla\imagenes\{sku}.webp`.
- **NO se pierden las imágenes ya vinculadas en Supabase.** El script de sync nunca pisa una
  `imagen_url` existente (modo seguro). Flag `--forzar-drive` para sobreescribir explícitamente.

### Scripts vigentes (en `supabase/`)
| Archivo | Qué hace | Uso |
|---|---|---|
| `sync_desde_excel.py` | Lee `TablaProductos`, upsert por SKU (solo campos que cambiaron), crea categorías nuevas, sube `{sku}.webp` de Drive solo si el producto no tiene `imagen_url`. Valida SKUs duplicados y aborta si los hay. | `py supabase/sync_desde_excel.py [--forzar-drive]` (carga credenciales de `supabase/.env.local`) |
| `auditar_imagenes.py` | SOLO LECTURA. Cruza Storage vs `producto.imagen_url` y reporta huérfanas / rotas / vinculadas. No borra nada. | `py supabase/auditar_imagenes.py` |
| `SYNC_README.md` | Instrucciones de uso del sync. | — |

Credenciales: `supabase/.env.local` (formato `SUPABASE_URL=...` / `SUPABASE_SERVICE_ROLE=...`).
**Está en `.gitignore`, NUNCA se commitea.** El asistente no corre comandos con la secret key.

### Parches SQL (histórico, aplicados hasta patch_04; patch_05..07 pendientes de confirmar)
- `schema_fase2.sql` — esquema físico (YA APLICADO).
- `patch_01..04` — aplicados (alta, revokes definer, clonar/stock).
- `patch_05_storage_writes.sql` — CREADO, pendiente de aplicar (desbloquea upload real de imágenes; hoy el sync usa service_role que bypasea RLS, así que sube igual).
- `patch_06_sku_unico.sql` — índices únicos parciales sku/código. Pendiente de confirmar aplicado.
- `patch_07_buscar_productos_rpc.sql` — RPC `buscar_productos` (BIEN tipado, `security invoker`).
  El error histórico "structure does not match" era MITO: era bug frontend `numeric`→`string`, ya resuelto.

### App (frontend)
- React PWA (Vite) + Supabase. Corre en `http://localhost:5173/catalogo` (dev server: `cd web && npm run dev`).
- El frontend carga imágenes desde `producto.imagen_url` (Supabase Storage), NO desde archivos estáticos.
- `web/public/catalogo/` fue ELIMINADO (era basura estática no usada).

## Modo Caja Offline (V1, 2026-07-20)

> **Qué es:** la app ahora vende sin internet. Cualquier equipo autorizado abre sesión de caja por
> dispositivo y vende offline; al volver la red, la cola se sincroniza sola. Equipos sin caja abierta
> solo consultan el catálogo. Cambio SDD completo y **archivado** (sin CRITICAL; WARNINGs W1/W2/W4
> cerrados). Documentación viva en `openspec/changes/modo-caja-offline/`
> (`proposal.md`, `specs/REQ-1..4`, `design.md`, `tasks.md`, `verify-report*.md`, `archive-report.md`).

### Cómo funciona
- **Sesión por dispositivo (REQ-1):** `crypto.randomUUID()` persistido en `localStorage` (`pv-device-id`).
  `abrirCaja`/`cerrarCaja` en `web/src/lib/caja.ts`. Si el admin deshabilita la caja (RN-53), la venta
  opera sin sesión de caja.
- **Cola IndexedDB (REQ-3):** `web/src/lib/colaOffline.ts` guarda cada venta como evento inmutable en
  `ventas_pendientes` (clave `id_evento`, offline-first) ANTES de tocar la red. `id_evento` idempotente.
- **Auto-sync silencioso (REQ-4):** `web/src/lib/autoSync.ts` detecta offline→online + heartbeat y sube
  la cola vía RPC `aplicar_venta_offline` (upsert por PK, `security invoker`); reintenta con backoff
  exponencial y **no duplica**. Estado en `web/src/store/useCajaStore.ts`; badge de pendientes en `Layout.tsx`.
- **Catálogo solo-lectura (REQ-2):** `CatalogoPage`/`PosPage` ocultan Crear/Editar/Borrar/Vender si hay
  caja habilitada y no está abierta. `web/src/lib/cacheCatalogo.ts` sirve el catálogo desde caché
  IndexedDB cuando no hay red.
- **Stock = auditoría:** la venta offline registra `movimiento_stock` causa `venta_offline` (RN-11) y
  **nunca bloquea** la venta (RN-54/55).

### SQL aplicado (patch_08)
- `openspec/changes/modo-caja-offline/patch_08_sesion_caja.sql` **YA APLICADO por el usuario** en Supabase
  (tablas `sesion_caja` + `venta_offline_event` y RPC `aplicar_venta_offline` vivos). Rollback aditivo:
  dropear función/tablas no rompe el esquema actual.

### ⚠️ Pendiente del usuario (no es bug)
- **Prueba manual de idempotencia en Supabase:** seguir `openspec/changes/modo-caja-offline/SQL_ACCION_USUARIO.md`.
  El agente no tiene credenciales, así que el reintento real en servidor no se ejecutó en automatizado.
  Esperado: `aplicar_venta_offline('evt-verificacion-001', ...)` → `insertado=true` la 1ª vez, `false` la
  2ª, y **1 sola fila** en `venta_offline_event`. Si difiere, es bug de SQL y se reporta antes de producción.

### Verificación y ramas
- `web/` → `npm test`: **18/18 pass** (Vitest + happy-dom + fake-indexeddb). `npm run build`: exit 0.
- Ramas (sin push, stacked): `modo-caja-offline/1-foundacion` → `2-libs` → `3-ui` → `4-fixes`.
  El orchestrator decidirá push/PR.

### Relación con la deuda técnica
- V1 **no** corrige la fuga Storage multi-tenant, `confirm()` nativo ni paginación falsa (fuera de scope).
- La caché de catálogo offline lee imágenes por `imagen_url` (Supabase Storage); no cambia la política de Storage.

## Deuda técnica real (auditoría 2026-07-19, vigente)
- 🔴 **Fuga de Storage multi-tenant** — `schema_fase2.sql` (`productos_public_read`) expone objetos
  sin chequear `es_de_empresa`. Hoy cualquier empresa podría leer imágenes de otra. Postergado
  (dueño único). *Fix futuro:* agregar guarda `es_de_empresa(empresa_id)` en la policy de SELECT.
- 🟠 **`confirm()` nativo del navegador** en `CatalogoPage`/`Layout` para borrar/desactivar. Malo en
  PWA/móvil, no accesible. *Fix:* diálogo propio.
- 🟡 **Paginación falsa** — "scroll infinito" trae `.limit(500)` hardcodeado. Con 2000+ se rompe.

## Pendiente decidido (NO hecho aún)
1. **Regla "SKU no editable en la app"** — el código (`sku`) debe ser solo lectura para usuarios
   normales; solo admin con diálogo de confirmación fuerte puede editarlo. Es trabajo de
   `ProductoForm.tsx` + capa `lib/productos.ts` (guarda de negocio, no confiar solo en frontend).
   El Excel es la fuente de códigos; la app no debe dejar editarlos a la ligera.
2. **492 productos sin imagen** — el usuario va agregando `{sku}.webp` a
   `G:\Mi unidad\puntoVenta2Tabla\imagenes\` y corre `sync_desde_excel.py` para subirlas.
3. **Aplicar `patch_05` (storage writes)** y confirmar `patch_06`/`patch_07` en Supabase.
4. **Llevar lenguaje visual del catálogo a Login/Registro/Venta** para consistencia.

## Cómo retomar al abrir sesión nueva (CHECKLIST para el asistente)
1. Leer este `HANDOFF.md` (palabra clave "matrix").
2. `git status` y `git log --oneline -5`.
3. Confirmar con el usuario el foco (no asumir).
4. Para operar contra Supabase: el usuario define las env vars vía `supabase/.env.local`
   (ya existe, ignorado por git). El asistente NO corre comandos con la secret key.

## Notas de método
- El asistente actúa como ORCHESTRATOR: delega implementación a sub-agents; el usuario corre los
  scripts de Supabase a mano desde PowerShell (no se usan accesos directos del escritorio).
- No commitear secrets. `supabase/.env.local` está en `.gitignore`.
- Comentarios, identificadores y UI: español neutro/profesional (usuario final hispanohablante).
- NUMERIC de Postgres = STRING en JSON (PostgREST): tipar `numeric` como `string` en frontend.

## ⚠️ Lecciones de esta sesión (para no repetir)
- **Storage `.list()` devuelve `list`, NO `.data`** como las queries de tabla. No pasar por `_safe()`.
- **Convención de imágenes en Storage = raíz `productos/{sku}.webp`** (no subcarpeta `empresa_id`).
  El seed original y las URLs existentes usan la raíz; el sync nuevo debe usar la misma.
- **El auditor debe listar la raíz del bucket**, no `productos/{empresa_id}/`, si no marca falsos
  positivos de "rotas".
- No asumir que el frontend usa archivos estáticos (`web/public/`); verificar con grep en `src`.
- Los scripts de lanzador (`.ps1` del escritorio) dieron problemas; el usuario prefiere correr los
  `.py` a mano desde PowerShell. No crear más accesos directos.
