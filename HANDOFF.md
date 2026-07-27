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
(id `b72bb1ff-9b7d-4e69-bb79-edd6f64c8b9b`). Modelo SaaS multi-tenant.

## Arquitectura de tenants y roles (decisión 2026-07-22)

### Qué es un tenant
Un tenant = una empresa. Cada empresa tiene un `empresa_id` único. Los datos están
**aislados** con Row Level Security (RLS) en Supabase. Un usuario de FerrehogarMart
nunca ve los datos de "El Martillo" ni viceversa.

### Roles (3 niveles)

| Rol | Quién es | Qué puede hacer | Cómo se asigna |
|---|---|---|---|
| **Super Admin** | Vos (dueño de la plataforma) | Ve todo: todas las empresas, todos los datos. Configura la plataforma, crea el catálogo semilla. NO interviene en apps de otros a menos que le pidan soporte. | Acceso directo a Supabase (hoy no hay UI para esto) |
| **Admin de empresa** | Dueño de "El Martillo" (cada empresa tiene hasta 2) | Gestiona SU empresa: usuarios, productos (inventario CRUD), caja, configuración. Asigna roles a sus empleados. | El super admin crea la empresa y le da acceso inicial; el admin gestiona lo demás |
| **Vendedor** | Empleado de "El Martillo" | Vende (caja), ve catálogo (solo lectura). NO ve inventario, NO ve configuración. Operación limitada a su turno. | El admin de empresa le crea usuario y asigna rol `vendedor` |

### Flujo de una nueva empresa
```
1. Super admin (vos) crea la cuenta de "El Martillo" en Supabase
   → le asigna empresa_id único
   → le carga el catálogo semilla (lo que elija)

2. Dueño de "El Martillo" entra a la app
   → ve SU inventario (aislado)
   → crea usuarios para sus empleados
   → les asigna rol: "admin" o "vendedor"

3. Empleados de "El Martillo" entran
   → cada uno ve solo lo que le corresponde

4. Vos no ves nada de "El Martillo" a menos que:
   → él te pida soporte
   → uses el super admin para verificar algo
```

### Estado actual de implementación
- ✅ RLS por `empresa_id` activo (aislamiento de datos)
- ✅ Gate de inventario: solo `rol = 'admin'` accede
- ✅ `obtenerMiRol()` + `useUsuarioRol()` para control de acceso
- ❌ **No hay UI de super admin** (panel para gestionar todas las empresas)
- ❌ **No hay UI de configuración de empresa** (SkuConfigForm existe pero no tiene acceso)

## Deployment (producción)
- **Plataforma:** Netlify (flourishing-chebakia-0d56e1)
- **Rama deployada:** `master`
- **Build command:** `cd web && npm install && npm run build`
- **Publish directory:** `web/dist`
- **Variables de entorno:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (configuradas en Netlify dashboard)
- **RLS:** activo, aislamiento por empresa_id
- **PWA:** sí (service worker + manifest)

### Snapshot de BD (2026-07-27 verificado)
| Entorno | Productos | Con imagen | Categorías | Usuarios | Admins |
|---------|-----------|-----------|------------|----------|--------|
| **Dev** (`pvopcajqersioqlmccwg`) | 586 | 569 (97.1%) | 8 | 1 | 1 |
| **Prod** (`bczpfyguamysdnihwzvl`) | 472 | ~350 (estimado) | 8 | pendiente | pendiente |

> **Nota producción:** 472 productos únicos migrados (de 586 en dev). La diferencia se debe a SKUs
> duplicados en los archivos de lotes batch (mismo SKU, diferentes UUIDs). Se limpiaron manteniendo
> el registro más antiguo por SKU.

> **Objetos en Storage (bucket `productos`):** 577 (vs 569 con imagen — 8 huérfanas o múltiples archivos). Convención: `{empresa_id}/{sku}.webp` — verificado.
>
> Correr este query al inicio de cada sesión para mantener al día al asistente:
> ```sql
> SELECT 
>   (SELECT COUNT(*) FROM producto) AS productos_total,
>   (SELECT COUNT(*) FROM producto WHERE imagen_url IS NOT NULL) AS productos_con_imagen,
>   (SELECT COUNT(*) FROM categoria) AS categorias,
>   (SELECT COUNT(*) FROM usuario) AS usuarios,
>   (SELECT COUNT(*) FROM usuario WHERE rol = 'admin') AS admins,
>   (SELECT COUNT(*) FROM sesion_caja WHERE estado = 'abierta') AS cajas_abiertas,
>   (SELECT COUNT(*) FROM venta_offline_event WHERE estado_sync = 'pendiente') AS ventas_pendientes_sync;
> ```

## Estado actual (última actualización: 2026-07-27, session: auth debugging + mobile testing)

### Arquitectura multi-entorno (2026-07-26)

| Entorno | Supabase | Netlify | Branch | URL |
|---|---|---|---|---|
| **Desarrollo** | `pvopcajqersioqlmccwg` | `flourishing-chebakia-0d56e1` | `develop` | `https://flourishing-chebakia-0d56e1.netlify.app` |
| **Producción** | `bczpfyguamysdnihwzvl` | `puntoventa2-prod` | `master` | `https://puntoventa2-prod.netlify.app` |

**Flujo de código:**
```
feature-branch → develop (dev) → probar → merge a master → producción
```

**Producción — Empresa:** FerrehogarMart (id `b72bb1ff-9b7d-4e69-bb79-edd6f64c8b9b`)
- **Módulos habilitados:** solo `catalogo` (resto deshabilitados hasta aprobación)
- **Productos:** 472 únicos migrados desde dev (2026-07-27)
- **Categorías:** 8 migradas desde dev
- **Usuarios:** pendiente crear 1 admin + 2 vendedores
- **SQL:** `supabase/production_migration.sql` + `supabase/production_seed.sql` aplicados
- **Migración productos (2026-07-27):** Lote batch 0-11 ejecutados vía SQL directo. Índice único `idx_producto_empresa_sku_unico` recreado tras limpieza de duplicados.

**Desarrollo — Empresa:** FerrehogarMart (mismo ID, ambos entornos)
- **Módulos:** todos habilitados (catálogo, venta, inventario, caja)
- **Usuarios:** 1 admin (dueño)

### Sistema de módulos (feature flags)
- **Tabla:** `empresa_modulos` — `(empresa_id, modulo, habilitado)`
- **Hook:** `useModulos` — carga módulos habilitados desde BD
- **Protección de rutas:** `RequireModulo` — redirige a `/catalogo` si módulo deshabilitado
- **Nav dinámica:** solo muestra items de módulos habilitados
- **Toggle:** desde Supabase Dashboard o futura UI admin

### Producción desplegada
- **Plataforma:** Netlify
- **Build:** `cd web && npm install && npm run build`
- **Publish:** `web/dist`
- **Variables de entorno:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- **RLS:** activo, aislamiento por `empresa_id`
- **PWA:** sí (service worker + manifest)
- **Dev server:** `host: true` en vite.config.ts (permite testing desde móvil en red local)

### Módulos completados y mergados
- **Slices 1-2 del rediseño UI:** DONE. Nav 3 secciones (Venta/Catálogo/Inventario), Catálogo solo lectura, Inventario CRUD admin-gated con ajuste stock + valuación + alerta, Caja UX estilo Fina (flujo 2 pantallas). Offline intacto.
- **SKU Configurable:** DONE. Generación automática por empresa, fuzzy matching, 3 plantillas. `patch_11_sku_configurable.sql` aplicado en BD.
- **Modo Caja Offline V1:** DONE. Sesión por dispositivo, cola IndexedDB, auto-sync silencioso, idempotencia. `patch_08` aplicado en BD.
- **Inventario mejoras (2026-07-22):** Editor de imágenes (crop/resize/zoom con react-easy-crop, output 600px webp), paste desde portapapeles (Ctrl+V), display de imágenes corregido (object-fit: contain), validación tipo/tamaño, paths de Storage: `{empresa_id}/{sku}.webp` (verificado en producción), preview SKU sin consumir contador, SkuConfigForm accesible desde InventarioPage, fuzzy check también al editar. **2026-07-23 fixes:** (1) ImageEditor: ref fix para pixelCrop stale state (useRef en vez de useState), (2) ProductoForm: botón de editar imagen existente (re-crop de imágenes guardadas), (3) Storage RLS: mi_empresa_id() con search_path explícito + políticas con foldername(). **2026-07-23 session 2:** (4) Crop mismatch fix: al hacer zoom out para ver imagen completa, el output ahora muestra la imagen entera (no recortada) cuando el crop cubre ≥98% de ambas dimensiones, (5) Paste button CSS fix: variables --surface/--text reemplazadas por --surface-1/--text-primary, (6) ClipboardItem API fix: item.types + getType() en vez de item.items.
- **Estado BD:** 586 productos, 8 categorías, 569 con imagen (577 objetos en Storage verificado).

### Responsive Modernization (completado 2026-07-27)
- **Cambio SDD:** `responsive-modernization` — proposal/specs/design/tasks/apply/verify/archive
- **4 PRs stacked-to-main:** PR1 (viewport dvh + touch targets), PR2 (mobile nav drawer), PR3 (fluid typography + forms + table scroll), PR4 (container queries + safe-area)
- **Commits:** `80f180e` `111f967` `6c433e4` `9d20e46` `92a3fc3` `a63aa80` `6443077`
- **Archivos modificados:** `index.css` (+209 líneas), `Layout.tsx` (+29), `ui-store.ts` (+6), `useMediaQuery.ts` (+22 nuevo), `index.html` (viewport meta)
- **Tests:** 58/58 pass, build OK
- **Verificación:** PASS WITH WARNINGS (warnings son fidelidad a spec, no funcionales)
- **Qué se hizo:**
  - 100vh → 100dvh con fallback (5 elementos)
  - Touch targets ≥44px en móvil (7 grupos de elementos)
  - Sidebar drawer mobile (<768px) con hamburger + backdrop
  - Fluid typography scale con clamp() (--fs-xs a --fs-2xl)
  - Fluid spacing scale con clamp() (--sp-1 a --sp-6)
  - Form grid responsive (1 col en móvil)
  - DataTable horizontal scroll (min-width: 600px)
  - Container queries para cards de producto
  - safe-area-inset para PWA standalone
  - Hook useMediaQuery + useIsMobile/useIsTablet/useIsDesktop
- **Pendiente:** Testing manual en dispositivos reales + Lighthouse mobile audit

### Pendiente (Slices 3-6 del rediseño UI)
- **Slice 3:** Pagos combinados + cliente + cuenta corriente
- **Slice 4:** Devoluciones
- **Slice 5:** Presupuestos
- **Slice 6:** Hardware (lector + impresora)
- Documentación del cambio en `openspec/changes/rediseno-ui-caja-inventario/`

### Scroll infinito + filtros (completado 2026-07-26)
- **Cambio SDD:** `scroll-infinito-filtros-generales` — proposal/specs/design/tasks/apply/verify
- **SQL:** `patch_08_ordenar_productos_rpc.sql` — RPC `buscar_productos` con param `p_order_by` (whitelist seguro). **PENDIENTE APLICAR EN SUPABASE.**
- **Hook reutilizable:** `useInfiniteScroll.ts` — IntersectionObserver, reset en cambio de filtros, manejo de error.
- **Componente:** `SortDropdown.tsx` — 4 opciones (Nombre A-Z/Z-A, Precio ↑/↓), accessible.
- **Pages integradas:** CatalogoPage, InventarioPage, PosPage — todas usan el hook compartido.
- **PosPage mejorado:** búsqueda server-side con debounce 300ms, filtro de categoría, sort dropdown, scroll infinito (reemplaza carga masiva de 9999 productos).
- **Tests:** 64/64 pass (15 test files). Nuevos: `useInfiniteScroll.test.ts` (2 tests), `SortDropdown.test.tsx` (6 tests).
- **Build:** `npm run build` exitoso.
- **Limpieza:** imports sin usar eliminados de las 3 pages, archivos `borrador/` eliminados.

### Pendiente del usuario
- ✅ **W1:** `patch_09_inventario.sql` — APLICADO.
- ✅ **W2:** Rol admin asignado.
- ✅ **Imágenes en Storage:** 577 objetos (bucket `productos`, convención `{empresa_id}/{sku}.webp` verificado).
- ⏳ **17 productos sin imagen** (586 total - 569 con imagen) — el usuario las sube desde Inventario → ProductoForm.
- ✅ **Usuario dev:** `neoucab@gmail.com` / `admin123` — creado directo en auth.users con bcrypt hash + email confirmado. Vinculado a FerrehogarMart (admin). **Lección:** NUNCA usar /registro para users dev cuando email confirmation está ON; insertar directo en auth.users con pgcrypto + todos los string columns en '' (no NULL).
- ✅ **buscar_productos overload eliminado:** versión vieja de 6 params eliminada, solo queda la de 7 params (con p_order_by). **Lección:** si da error "could not choose the best candidate function", hay sobrecargas duplicadas.
- ✅ **Dev DB sin productos:** hay categorías pero 0 productos. Catálogo vacío es normal en dev.
- ⏳ **Testing responsive en dispositivo real** —.drawer mobile, touch targets, dvh, container queries

## Estado anterior (2026-07-20, sesión de reestructura de catálogo + Modo Caja Offline V1)

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
- **Imágenes:** viven en Supabase Storage bucket `productos`, en subcarpeta por empresa:
  `productos/{empresa_id}/{sku}.webp`, enlazadas por `producto.imagen_url`
  (`https://pvopcajqersioqlmccwg.supabase.co/storage/v1/object/public/productos/{empresa_id}/{sku}.webp`).
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

### Parches SQL (histórico)
- `schema_fase2.sql` — esquema físico (YA APLICADO).
- `patch_01..04` — aplicados (alta, revokes definer, clonar/stock).
- `patch_05_storage_writes.sql` — ✅ APLICADO (storage writes para imágenes).
- `patch_06_sku_unico.sql` — ✅ APLICADO (índices únicos parciales sku/código).
- `patch_07_buscar_productos_rpc.sql` — ✅ APLICADO (RPC `buscar_productos`, `security invoker`).
- `patch_08` — ✅ APLICADO (sesion_caja + venta_offline_event + RPC aplicar_venta_offline).
- `patch_08_ordenar_productos_rpc.sql` — ⏳ **PENDIENTE APLICAR EN DEV** (RPC con `p_order_by`).
- `patch_09_inventario.sql` — ✅ APLICADO (aplicar_ajuste_stock + empresa.logo_url).
- `patch_10_producto_historial.sql` — ✅ APLICADO (producto_historial + RLS).
- `patch_11_sku_configurable.sql` — ✅ APLICADO (empresa_configuracion_sku, counters, RPCs).
- `patch_12_supabase_warnings.sql` — ✅ APLICADO (search_path fixes).
- `production_migration.sql` — ✅ APLICADO EN PRODUCCIÓN (schema completo consolidado).
- `production_seed.sql` — ✅ APLICADO EN PRODUCCIÓN (empresa + módulos).

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
- **Catálogo solo-lectura (REQ-2) — SUPERADO por rediseño 2026-07-20:** en el cambio `rediseno-ui-caja-inventario`,
  `CatalogoPage` es **permanentemente solo lectura** (sin Crear/Editar/Borrar/Vender, sin depender del estado de
  caja). La edición de productos vive en la nueva página `/inventario` (admin-gated, estilo Fina). `web/src/lib/cacheCatalogo.ts`
  sigue sirviendo el catálogo desde caché IndexedDB sin red.
- **Stock = auditoría:** la venta offline registra `movimiento_stock` causa `venta_offline` (RN-11) y
  **nunca bloquea** la venta (RN-54/55).

### SQL aplicado (patch_08)
- `openspec/changes/modo-caja-offline/patch_08_sesion_caja.sql` **YA APLICADO** en Supabase
  (tablas `sesion_caja` + `venta_offline_event` y RPC `aplicar_venta_offline` vivos). Rollback aditivo:
  dropear función/tablas no rompe el esquema actual.

### ⚠️ Pendiente del usuario (no es bug)
- **Prueba manual de idempotencia en Supabase:** seguir `openspec/changes/modo-caja-offline/SQL_ACCION_USUARIO.md`.
  El agente no tiene credenciales, así que el reintento real en servidor no se ejecutó en automatizado.
  Esperado: `aplicar_venta_offline('evt-verificacion-001', ...)` → `insertado=true` la 1ª vez, `false` la
  2ª, y **1 sola fila** en `venta_offline_event`. Si difiere, es bug de SQL y se reporta antes de producción.

### Verificación y ramas
- `web/` → `npm test`: **56/56 pass** (Vitest + happy-dom + fake-indexeddb + RTL). `npm run build`: exit 0.
  (Subió 18→44 en Slice 1 y 44→56 en Slice 2 del cambio `rediseno-ui-caja-inventario`.)
- **Merge a master completado.** Feature branches eliminadas (`modo-caja-offline/*`, `rediseno-ui/1-ui-sep`). Queda `rediseno-ui/2-caja-ux` (remoto).

### Relación con la deuda técnica
- V1 **no** corrige la fuga Storage multi-tenant, `confirm()` nativo ni paginación falsa (fuera de scope).
- La caché de catálogo offline lee imágenes por `imagen_url` (Supabase Storage); no cambia la política de Storage.

## Rediseño UI estilo Fina (2026-07-20)

> **Cambio SDD `rediseno-ui-caja-inventario`** — separar edición de productos de la caja y rediseñar la UI
> "estilo Fina" (fidelidad alta, no maquillaje). Proposal/specs/design/tasks en
> `openspec/changes/rediseno-ui-caja-inventario/`. Faseado en 6 slices (16 PRs <400 líneas).

### Decisiones del usuario
- Nav de 3: Venta (caja) · Catálogo (solo lectura) · Inventario (edición, nueva).
- Catálogo 100% solo lectura (sin editar ni vender).
- Inventario estilo Fina: CRUD + categorías + ajuste de stock (RN-11) + alerta bajo stock + valuación, **solo admin**
  (rol en `usuario`).
- Caja estilo Fina COMPLETA menos cajón: UX carrito/tasa/métodos, pagos combinados, cliente→cxc, devoluciones,
  presupuestos, hardware (lector+impresora). Offline multi-dispositivo PRESERVADO siempre.

### Progreso
- **Slice 1 (MVP separación UI):** DONE + VERIFY PASS. Nav 3, CatalogoPage read-only, InventarioPage admin-gated
  (CRUD+categorías+ajuste stock+valuación+alerta), gate rol (`obtenerMiRol`+`useUsuarioRol`). Corregido CRITICAL
  C1/C2 (empresa_id en `crearProducto`/`crearCategoria`). Rama `rediseno-ui/1-ui-sep`.
- **Slice 2 (Caja UX Fina):** DONE + refactorado a **flujo de 2 pantallas** (estilo Fina real).
  - Pantalla 1: catálogo + carrito lateral, botón "Cobrar — $XX.XX".
  - Pantalla 2: pago consolidado (resumen productos + cliente opcional + método contado/crédito + instrumentos + confirmar).
  - Eliminado wizard de 5 pasos. Carrito 100% presentacional. Éxito inline con auto-reset.
  - Componentes eliminados: WizardStepper, ClienteForm, PagoForm, ResumenFinal, SuccessScreen.
  - Offline intacto. Rama `rediseno-ui/2-caja-ux`.
- **Slices 3-6:** PENDIENTES (pagos combinados+cliente+cxc / devoluciones / presupuestos / hardware).

### ⚠️ Pendiente del usuario (no es bug)
- **W1:** aplicar `supabase/patch_09_inventario.sql` (RPC `aplicar_ajuste_stock` + columna `empresa.logo_url`).
  Hasta entonces el ajuste de stock falla en runtime.
- **W2:** `UPDATE usuario SET rol = 'admin' WHERE id = '<tu_user_id>'` para que Inventario funcione en producción
  (en dev el gate tiene fallback rol null→admin con warning).

### Ramas
- Todos los cambios de Slices 1-2, SKU configurable y Modo Caja Offline están **mergados a `master`**.
- `rediseno-ui/2-caja-ux` existe en remoto (ya mergiado).
- Slices 3-6 se crearán desde `master` cuando se implementen.

## Deuda técnica real (auditoría 2026-07-24 verificada)
- 🔴 **Fuga de Storage multi-tenant** — `productos_public_read` expone objetos sin chequear `empresa_id` (cualquier usuario autenticado ve imágenes de TODAS las empresas). `productos_auth_insert` no existe (cualquiera sube a cualquier carpeta). **Fix:** agregar `foldername(name)[1] = mi_empresa_id()` a SELECT e INSERT policies. (Postergado: dueño único, pero bloquea multi-tenant real).
- 🟠 **`confirm()` nativo del navegador** en `CatalogoPage`/`Layout` para borrar/desactivar. Malo en PWA/móvil, no accesible. *Fix:* diálogo propio.
- 🟡 **Paginación falsa** — "scroll infinito" trae `.limit(500)` hardcodeado. Con 2000+ se rompe.
- 🟠 **`search_path` mutable en 3 funciones** — `clonar_catalogo`, `crear_empresa_con_admin`, `es_de_empresa` siguen como `SECURITY DEFINER` con `search_path` vacío. Cambiar a `SECURITY INVOKER` + `SET search_path = 'public'`.
- 🟠 **pg_trgm en schema `public`** — mover a schema dedicado (ej. `extensions`).
- 🟠 **auth_leaked_password_protection** — habilitar en Supabase Dashboard → Authentication → Settings.

## Herramientas de sesión (2026-07-23)
- **Supabase MCP:** acceso directo vía herramientas MCP (list_projects, apply_migration, etc.) — el orchestrator opera sin preguntar.
- **Netlify MCP:** instalado (`@netlify/mcp` en opencode.json). Reiniciar sesión para activar. Permite deploy, gestión de proyectos, env vars, etc.
- **Policy de bugs:** para bugs de Supabase/Netlify, consultar docs oficiales (context7 o webfetch) antes de proponer fixes. No repetir soluciones que ya fallaron.

## Pendiente decidido (NO hecho aún)
1. **Regla "SKU no editable en la app"** — el código (`sku`) debe ser solo lectura para usuarios
   normales; solo admin con diálogo de confirmación fuerte puede editarlo. Es trabajo de
   `ProductoForm.tsx` + capa `lib/productos.ts` (guarda de negocio, no confiar solo en frontend).
   El Excel es la fuente de códigos; la app no debe dejar editarlos a la ligera.
2. **308 productos sin imagen** — el usuario las sube desde Inventario → ProductoForm.
3. **Llevar lenguaje visual del catálogo a Login/Registro/Venta** para consistencia.
4. **Slices 3-6 del rediseño UI** — pagos combinados, devoluciones, presupuestos, hardware.
5. **Consistencia visual** — Login/Registro/Venta con el mismo estilo del catálogo.
6. **Aplicar SQL** `patch_08_ordenar_productos_rpc.sql` en Supabase Dashboard → SQL Editor.

## Bugs abiertos (2026-07-24 verificado)
1. ~~**ImageEditor crash**~~ — **RESUELTO** (2026-07-23). Causa raíz: `aspect={NaN}` en el Cropper original (commit 32dcc23). NaN causa división por cero en el posicionamiento interno de react-easy-crop → error no manejado → pantalla blanca. Fixes aplicados: `aspect={4/3}`, ErrorBoundary, loadImage sin crossOrigin en blob URLs, scaleX/scaleY para coordenadas de crop, errores visibles en UI. Ver memoria `bugfix/imageeditor-crash`.
2. ~~**Storage path 400 / RLS policy**~~ — **RESUELTO** (2026-07-23). Causa raíz: `mi_empresa_id()` no tenía `search_path` fijo, retornando `NULL` en el contexto de Storage RLS → política nunca coincidía → error "new row violates row-level security policy". Fixes: (1) `mi_empresa_id()` recreada con `SET search_path = 'public'`, (2) políticas de Storage reescritas usando `storage.foldername(name)[1]` (método oficial Supabase) en vez de `like` con string. Ver patch_12.
3. **SKU editable sin restricción** — el campo SKU permite ediciones fáciles y no previene duplicados. Falta implementar la regla "SKU no editable para vendedores" con validación backend.
4. **Botón de pegar (portapapeles) no visible** — el botón de pegar imagen desde portapapeles no aparece en el ImageEditor. CSS corregido (session 2026-07-23) pero aún no visible en producción. Verificar si el CSS se deployó correctamente o si hay otro problema de renderizado.
5. **Fuga Storage multi-tenant** — `productos_public_read` expone TODAS las imágenes a CUALQUIER usuario autenticado (sin filtro `empresa_id`). `productos_auth_insert` no existe (cualquiera puede subir a cualquier carpeta). Fix pendiente: agregar `foldername(name)[1] = mi_empresa_id()` a SELECT e INSERT policies.

### Verificación Supabase Warnings (2026-07-24)
| Warning | Estado | Detalle |
|---------|--------|---------|
| **function_search_path_mutable** (7 fn) | ✅ **RESUELTO** | `ALTER FUNCTION ... SET search_path = 'public'` aplicado a las 7 funciones (`trg_crear_config_sku_default`, `mi_empresa_id`, `buscar_productos`, `aplicar_venta_offline`, `generar_sku`, `buscar_productos_similares`, `aplicar_ajuste_stock`). Verificado: `proconfig = 'search_path=public'`. |
| **extension_in_public** (pg_trgm) | ⚠️ **PENDIENTE** | Extensión `pg_trgm` instalada en schema `public`. Mover a schema dedicado (ej. `extensions`). |
| **authenticated_security_definer_function_executable** (3 fn) | ⚠️ **PENDIENTE** | `clonar_catalogo`, `crear_empresa_con_admin`, `es_de_empresa` siguen como `SECURITY DEFINER`. Cambiar a `SECURITY INVOKER`. |
| **auth_leaked_password_protection** | ⚠️ **PENDIENTE** | Configuración en Supabase Dashboard → Authentication → Settings → "Leaked password protection" → **Enable**. |

## Storage RLS — Estado real (verificado 2026-07-24)

| Policy | Comando | Expresión | Aislamiento tenant |
|--------|---------|-----------|-------------------|
| `productos_public_read` | SELECT | `bucket_id = 'productos'` | ❌ **NO** — cualquiera autenticado ve TODAS las imágenes de TODAS las empresas |
| `productos_auth_insert` | INSERT | *(NULL — sin policy)* | ❌ **NO** — cualquiera autenticado puede subir a cualquier carpeta |
| `productos_auth_update` | UPDATE | `foldername(name)[1] = mi_empresa_id()` | ✅ SÍ |
| `productos_auth_delete` | DELETE | `foldername(name)[1] = mi_empresa_id()` | ✅ SÍ |

> **Acción requerida:** Corregir `productos_public_read` (agregar `foldername(name)[1] = mi_empresa_id()`) y crear policy `productos_auth_insert` con misma guarda. Esto cierra la **fuga de Storage multi-tenant** (deuda técnica 🔴).

## Rol del Excel (decisión 2026-07-22)
El Excel (`catalogo_inicial.xlsx`) es una **herramienta de bootstrap**, NO una fuente viva.
- **Estado:** ✅ DATOS COMPLETADOS (2026-07-22). Todos los productos ya están en Supabase.
  El Excel se da por terminado para edición de datos. No se corre más `sync_desde_excel.py`.
- **Único pendiente:** imágenes. El usuario va agregando `{sku}.webp` a la carpeta de Drive
  y las sube manualmente cuando las tenga.
- **Producción:** el Excel se ignora. La app (Supabase) es la única fuente de verdad.
- **No hay sincronización inversa** (app → Excel). Si se edita un producto en la app, el Excel
  no se actualiza.
- **Pendiente futuro:** feature "Catálogo semilla" para onboarding de nuevos tenants
  (ver sección abajo).

### Configuración de Netlify (deploy)
- **Plataforma:** Netlify (flourishing-chebakia-0d56e1)
- **Build command:** `cd web && npm install && npm run build`
- **Publish directory:** `web/dist`
- **Rama deployada:** `master`
- **netlify.toml:** está en la raíz del repo con configuración base. **IMPORTANTE:** si el Netlify dashboard tiene campos de build configurados, esos valores tienen prioridad sobre `netlify.toml`. Si los campos del dashboard están vacíos, Netlify usa el `netlify.toml`.

## Catálogo semilla — onboarding de nuevos tenants (idea 2026-07-22)
Cuando una nueva empresa instala la app por primera vez, recibe el catálogo semilla
(los ~582 productos de ferretería) como punto de partida. La empresa puede elegir:
- **Categorías:** cargar todo, o seleccionar categorías específicas.
- **SKU:** conservar los códigos originales, o pedir que la app genere SKU nuevos.
- **Imágenes:** incluir las imágenes del catálogo semilla, o omitirlas (las sube después).

Una vez que la empresa confirma la carga, los productos se insertan en Supabase con su
`empresa_id` y el catálogo semilla ya no le importa. La app es su fuente de verdad.

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
- **🚨 REGLA ESTRICTA: SIEMPRE verificar en dev antes de cualquier deploy.** Antes de push a master,
  merge, o cualquier operación de deploy: (1) `cd web && npm run dev`, (2) probar la funcionalidad
  afectada en el navegador, (3) revisar la consola del navegador por errores, (4) SOLO DESPUÉS
  ejecutar el deploy. Sin excepciones.

## ⚠️ Lecciones de esta sesión (para no repetir)
- **react-easy-crop `aspect={NaN}` causa crash blanco** — NaN genera división por cero en posicionamiento interno, propagándose como error no manejado hasta la raíz de React. Siempre usar un número válido.
- **`loadImage` con `crossOrigin='anonymous'` en blob URLs causa CORS failure silencioso** — el Image no carga pero no hay error visible. Verificar `src.startsWith('blob:')` antes de setear crossOrigin.
- **`onCropComplete` devuelve coordenadas relativas al tamaño displayado**, NO al tamaño natural. Hay que escalar con `naturalWidth/displayedWidth` antes de dibujar en canvas.
- **Storage `.list()` devuelve `list`, NO `.data`** como las queries de tabla. No pasar por `_safe()`.
- **Storage path para uploads autenticados DEBE empezar con `{empresaId}/`** (patch_05 storage policies). El sync script usa service role que bypasea RLS, pero el frontend NO.
- **Convención de imágenes en Storage = raíz `productos/{sku}.webp`** (no subcarpeta `empresa_id`). El seed original y las URLs existentes usan la raíz; el sync nuevo debe usar la misma.
- **El auditor debe listar la raíz del bucket**, no `productos/{empresa_id}/`, si no marca falsos positivos de "rotas".
- No asumir que el frontend usa archivos estáticos (`web/public/`); verificar con grep en `src`.
- Los scripts de lanzador (`.ps1` del escritorio) dieron problemas; el usuario prefiere correr los `.py` a mano desde PowerShell. No crear más accesos directos.
- **Netlify dashboard override:** si el dashboard tiene campos de build configurados, esos valores tienen prioridad sobre `netlify.toml`. Si los campos del dashboard están vacíos, Netlify usa el `netlify.toml` de la raíz.
- **Build necesita `npm install` antes de `npm run build`** porque `package.json` está en `web/`, no en la raíz. El build command completo es `cd web && npm install && npm run build`.
- **Deploying from master es obligatorio para producción** — las feature branches no auto-deploy a menos que se configure deploy preview explícitamente.
