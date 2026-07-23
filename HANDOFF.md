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

### Snapshot de BD (2026-07-22)
| Productos | Con imagen | Categorías | Usuarios | Admins | Cajas abiertas | Ventas pendientes |
|-----------|-----------|------------|----------|--------|----------------|-------------------|
| 589 | 262 | 8 | 1 | 1 | 0 | 0 |

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

## Estado actual (última actualización: 2026-07-23, session: Netlify MCP + Supabase access + image bug RESUELTO)

### Producción desplegada
- **Plataforma:** Netlify (flourishing-chebakia-0d56e1)
- **URL:** `https://flourishing-chebakia-0d56e1.netlify.app`
- **Rama deployada:** `master`
- **Build:** `cd web && npm install && npm run build`
- **Publish:** `web/dist`
- **Variables de entorno:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (configuradas en Netlify dashboard)
- **RLS:** activo, aislamiento por `empresa_id`
- **PWA:** sí (service worker + manifest)

### Módulos completados y mergados
- **Slices 1-2 del rediseño UI:** DONE. Nav 3 secciones (Venta/Catálogo/Inventario), Catálogo solo lectura, Inventario CRUD admin-gated con ajuste stock + valuación + alerta, Caja UX estilo Fina (flujo 2 pantallas). Offline intacto.
- **SKU Configurable:** DONE. Generación automática por empresa, fuzzy matching, 3 plantillas. `patch_11_sku_configurable.sql` aplicado en BD.
- **Modo Caja Offline V1:** DONE. Sesión por dispositivo, cola IndexedDB, auto-sync silencioso, idempotencia. `patch_08` aplicado en BD.
- **Inventario mejoras (2026-07-22):** Editor de imágenes (crop/resize/zoom con react-easy-crop, output 600px webp), paste desde portapapeles (Ctrl+V), display de imágenes corregido (object-fit: contain), validación tipo/tamaño, paths de Storage unificados a raíz (`productos/{sku}.webp`), preview SKU sin consumir contador, SkuConfigForm accesible desde InventarioPage, fuzzy check también al editar.
- **Estado BD:** 589 productos, 8 categorías, 262 con imagen.

### Pendiente (Slices 3-6 del rediseño UI)
- **Slice 3:** Pagos combinados + cliente + cuenta corriente
- **Slice 4:** Devoluciones
- **Slice 5:** Presupuestos
- **Slice 6:** Hardware (lector + impresora)
- Documentación del cambio en `openspec/changes/rediseno-ui-caja-inventario/`

### Pendiente del usuario
- ✅ **W1:** `patch_09_inventario.sql` — APLICADO.
- ✅ **W2:** Rol admin asignado.

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

### Parches SQL (histórico)
- `schema_fase2.sql` — esquema físico (YA APLICADO).
- `patch_01..04` — aplicados (alta, revokes definer, clonar/stock).
- `patch_05_storage_writes.sql` — ✅ APLICADO (storage writes para imágenes).
- `patch_06_sku_unico.sql` — ✅ APLICADO (índices únicos parciales sku/código).
- `patch_07_buscar_productos_rpc.sql` — ✅ APLICADO (RPC `buscar_productos`, `security invoker`).
- `patch_08` — ✅ APLICADO (sesion_caja + venta_offline_event + RPC aplicar_venta_offline).
- `patch_09_inventario.sql` — ✅ APLICADO (aplicar_ajuste_stock + empresa.logo_url).
- `patch_10_producto_historial.sql` — ✅ APLICADO (producto_historial + RLS).
- `patch_11_sku_configurable.sql` — ✅ APLICADO (empresa_configuracion_sku, counters, RPCs).
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

## Deuda técnica real (auditoría 2026-07-19, vigente)
- 🔴 **Fuga de Storage multi-tenant** — `schema_fase2.sql` (`productos_public_read`) expone objetos
  sin chequear `es_de_empresa`. Hoy cualquier empresa podría leer imágenes de otra. Postergado
  (dueño único). *Fix futuro:* agregar guarda `es_de_empresa(empresa_id)` en la policy de SELECT.
- 🟠 **`confirm()` nativo del navegador** en `CatalogoPage`/`Layout` para borrar/desactivar. Malo en
  PWA/móvil, no accesible. *Fix:* diálogo propio.
- 🟡 **Paginación falsa** — "scroll infinito" trae `.limit(500)` hardcodeado. Con 2000+ se rompe.

## Herramientas de sesión (2026-07-23)
- **Supabase MCP:** acceso directo vía herramientas MCP (list_projects, apply_migration, etc.) — el orchestrator opera sin preguntar.
- **Netlify MCP:** instalado (`@netlify/mcp` en opencode.json). Reiniciar sesión para activar. Permite deploy, gestión de proyectos, env vars, etc.
- **Policy de bugs:** para bugs de Supabase/Netlify, consultar docs oficiales (context7 o webfetch) antes de proponer fixes. No repetir soluciones que ya fallaron.

## Pendiente decidido (NO hecho aún)
1. **Regla "SKU no editable en la app"** — el código (`sku`) debe ser solo lectura para usuarios
   normales; solo admin con diálogo de confirmación fuerte puede editarlo. Es trabajo de
   `ProductoForm.tsx` + capa `lib/productos.ts` (guarda de negocio, no confiar solo en frontend).
   El Excel es la fuente de códigos; la app no debe dejar editarlos a la ligera.
2. **327 productos sin imagen** — el usuario las sube desde Inventario → ProductoForm.
3. **Llevar lenguaje visual del catálogo a Login/Registro/Venta** para consistencia.
4. **Slices 3-6 del rediseño UI** — pagos combinados, devoluciones, presupuestos, hardware.
5. **Consistencia visual** — Login/Registro/Venta con el mismo estilo del catálogo.

## Bugs abiertos (2026-07-23)
1. ~~**ImageEditor crash**~~ — **RESUELTO** (2026-07-23). Causa raíz: `aspect={NaN}` en el Cropper original (commit 32dcc23). NaN causa división por cero en el posicionamiento interno de react-easy-crop → error no manejado → pantalla blanca. Fixes aplicados: `aspect={4/3}`, ErrorBoundary, loadImage sin crossOrigin en blob URLs, scaleX/scaleY para coordenadas de crop, errores visibles en UI. Ver memoria `bugfix/imageeditor-crash`.
2. ~~**Storage path 400 / RLS policy**~~ — **RESUELTO** (2026-07-23). Causa raíz: `mi_empresa_id()` no tenía `search_path` fijo, retornando `NULL` en el contexto de Storage RLS → política nunca coincidía → error "new row violates row-level security policy". Fixes: (1) `mi_empresa_id()` recreada con `SET search_path = 'public'`, (2) políticas de Storage reescritas usando `storage.foldername(name)[1]` (método oficial Supabase) en vez de `like` con string. Ver patch_12.
3. **SKU editable sin restricción** — el campo SKU permite ediciones fáciles y no previene duplicados. Falta implementar la regla "SKU no editable para vendedores" con validación backend.

## Warnings de Supabase (2026-07-22) — pendientes de resolver
### function_search_path_mutable (7 funciones)
Fijar `search_path` en estas funciones para evitar vulnerabilidades de search_path:
- `trg_crear_config_sku_default`
- `mi_empresa_id`
- `buscar_productos`
- `aplicar_venta_offline`
- `generar_sku`
- `buscar_productos_similares`
- `aplicar_ajuste_stock`

Fix: `ALTER FUNCTION nombre_funcion SET search_path = 'public';`

### extension_in_public (1)
- `pg_trgm` instalado en schema `public`. Mover a otro schema.

### authenticated_security_definer_function_executable (3 funciones)
Funciones `SECURITY DEFINER` ejecutables por `authenticated`:
- `clonar_catalogo` → switching a `SECURITY INVOKER`
- `crear_empresa_con_admin` → switching a `SECURITY INVOKER`
- `es_de_empresa` → switching a `SECURITY INVOKER`

### auth_leaked_password_protection
- Protección de contraseñas filtradas deshabilitada. Habilitar en Supabase Auth settings.

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
