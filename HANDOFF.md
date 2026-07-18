# MATRIX — Punto de Retorno (estado vivo del proyecto)

> **Uso:** Al iniciar una sesión nueva, el asistente lee este archivo con la palabra clave **"matrix"** y continúa el hilo sin que el usuario repita contexto.
> Este archivo es la fuente de verdad del estado. Se actualiza al cerrar cada avance.
> **Regla de oro:** si el usuario dice "no sé por dónde quedamos" o "revisa handoff", leer ESTE archivo primero, no inventar.

## Proyecto
Sistema de punto de venta para ferretería bimonetaria (Venezuela: BS / USD). Carpeta: `C:\Proyectos\puntoVenta2`.
Empresa del dueño: **FerrehogarMart** (id `b72bb1ff-9b7d-4e69-bb79-edd6f64c8b9b`).

## Estado actual (última actualación: 2026-07-18, sesión tema light + ajustes catálogo)

### Cambios de UI aplicados en esta sesión (build OK)
- **Modo light/dark**: toggle manual + persistido en `ui-store` (`pv-ui`). Bloque `[data-theme="light"]` ya existía en `index.css`; se cableó: `ui-store` con `theme`+`toggleTheme`, `main.tsx` aplica `data-theme` en `<html>`, botón sol/luna en `Layout.tsx` topbar. Literales `#052e16`/`#fff` corregidos por `var(--primary-ink)`.
- **Reset de zoom de app**: botón `zoom_out_map` en topbar + `zoom` en `ui-store`, aplicado como CSS `zoom` en `<html>` desde `main.tsx`. (No controla el zoom del navegador; es zoom propio de la app.)
- **Scroll de catálogo**: grid envuelto en `.productos-grid-scroll` (scroll interno, igual patrón que `.dt-scroll` de lista) → sidebar queda fijo al bajar en ambas vistas. `IntersectionObserver` usa `root` = contenedor scrolleable (grid/lista) para scroll infinito.
- **DataTable reutilizable**: `web/src/components/DataTable.tsx` (design system) con props `after` (sentinel) y `scrollRef`.

### ⚠️ PENDIENTE (sin resolver, requiere verificación en navegador)
- **Espacio debajo de tabla/grid**: intentos de `flex:1; min-height:0` en `.content`/`.catalogo`/`.dt-scroll`/`.productos-grid-scroll` + `.main-col { height:100vh }`. Build OK pero el usuario reporta que en lista "sigue el espacio" y en grid "se ocultan botones/títulos" al bajar. NO confirmado en vivo (no hay inspectór de DOM desde la CLI). Hipótesis: cadena de altura flex frágil o doble scroll. Falta validar con DevTools (`getComputedStyle` de `.content`/`.catalogo-main`).
- **patch_07 RPC** sigue sin aplicar (ver sección original abajo).

### Cambios de UI (aplicados en frontend, build OK)
- **Sidebar colapsable** con persistencia en `localStorage` (Zustand + `persist`, clave `pv-ui`). El botón de toggle (`chevron`) queda obvio en estado contraído. FIX: antes el estado se perdía al recargar/cerrar sesión.
- **Iconos Material Symbols** (fuente thin-line del experto) vía Google Fonts con `text=` acotado a ~15 iconos (NO el npm `material-symbols` que pesaba 12.8 MB). JetBrains Mono como fuente mono para SKU/códigos.
- **Catálogo rediseñado** con lenguaje del experto (Stitch): ribbon de stock semántico (En stock/Stock bajo/Agotado), hover lift + zoom de imagen, acciones con iconos, toolbar con título+subtítulo, toggle grid/lista. CSS plano (sin Tailwind) — coherente con el repo y dark-first del HANDOFF.

### Búsqueda de catálogo (CAMBIO DE ARQUITECTURA — escala 2000+)
- Se reemplazó el ranking en cliente (traía todas las coincidencias) por un **RPC Postgres `buscar_productos`** que rankea (CASE score: nombre-prefijo>palabra-prefijo>sku-prefijo>substring-nombre>substring-sku) y pagina con LIMIT/OFFSET en el servidor. El cliente solo recibe la página.
- `web/src/lib/productos.ts` → `listarProductos` usa `supabase.rpc('buscar_productos', ...)`. Necesita `empresa_id` (cacheado en `obtenerMiEmpresaId` de `empresa.ts`).
- `web/src/lib/empresa.ts` → `obtenerMiEmpresa` ahora devuelve `id`; nuevo `obtenerMiEmpresaId` cacheado en módulo. `ProductoForm.tsx` importa `obtenerMiEmpresaId` desde `empresa.ts`.
- **RPC es `security invoker` (NO definer)** → hereda RLS `es_de_empresa`, aislado por tenant, NO dispara lints 0028/0029.

### ⚠️ PENDIENTE CRÍTICO (a resolver en próxima sesión)
- **`supabase/patch_07_buscar_productos_rpc.sql` NO aplicado todavía.** El usuario lo pegó en SQL Editor y recibió el error **"structure of query does not match function result type"**. Se corrigieron los casts (`::int` en `score`, `::jsonb` en `categoria`) en ambas ramas del RPC, pero **el error PERSISTE** al cierre de esta sesión.
- **HIPÓTESIS a investigar:** el mismatch puede ser por tipo de alguna columna de `producto` distinta a la declarada en `RETURNS TABLE` (ej. `unidad`, `stock_actual`/`stock_minimo` podrían no ser `int`, o `costo_usd`/`precio_usd` no `numeric`), O el planner infiriendo el `min(case...)` como `bigint`. Al retomar: (1) pegar el SQL corregido de `patch_07`; (2) si persiste, correr en Supabase `select * from buscar_productos(...)` y leer el mensaje EXACTO de línea; (3) verificar tipos reales de `producto` con `\d producto` o `information_schema.columns`; (4) alinear `RETURNS TABLE` con los tipos reales.
- MIENTRAS el RPC no exista/a funcione, `listarProductos` falla y el catálogo queda VACÍO (no hay fallback). Al resolver el RPC, el catálogo vuelve a mostrar productos y la búsqueda rankeada se enciende.

### Parches SQL aplicados (histórico, hasta patch_04)
- `supabase/patch_01_alta_y_linter.sql` — APLICADO. (RPC `crear_empresa_con_admin`, SECURITY DEFINER).
- `supabase/patch_02_revoke_definer.sql` — APLICADO. Quedan 2 warnings INTENCIONALES.
- `supabase/patch_03_clonar_y_stock.sql` — APLICADO. `clonar_catalogo` + `trg_descuenta_stock_venta`.
- `supabase/patch_04_revokes_definer.sql` — APLICADO. Quedan 3 warnings INTENCIONALES.
- `supabase/patch_05_storage_writes.sql` — CREADO, PENDIENTE de aplicar (desbloquea upload real de imágenes).
- `supabase/patch_06_sku_unico.sql` — CREADO (índices únicos parciales sku/código). PENDIENTE de confirmar aplicado.
- `supabase/patch_07_buscar_productos_rpc.sql` — CREADO y CORREGIDO (casts), PENDIENTE de aplicar con éxito (error "structure does not match" persiste).
- **Fase 0 (documentación):** COMPLETA. 12 docs en `/docs` (00 a 11).
- **Stack:** CONSOLIDADO EN SUPABASE. Node/React PWA + **Postgres en Supabase (plan free)** + Storage + RLS multi-tenant por `empresa_id`. Offline (IndexedDB+cola) queda para Fase 4.
- **Esquema:** `supabase/schema_fase2.sql` YA APLICADO en el proyecto Supabase (`pvopcajqersioqlmccwg`).
- **Parches SQL aplicados (en orden):**
  - `supabase/patch_01_alta_y_linter.sql` — APLICADO. Fijó `search_path=''` en `es_de_empresa` y `trg_alta_usuario`, quitó política de listado del bucket, blindó el trigger, y creó el RPC `crear_empresa_con_admin(p_nombre_empresa, p_auth_user_id, p_nombre_admin)` (SECURITY DEFINER, guardas `auth.uid()`).
  - `supabase/patch_02_revoke_definer.sql` — APLICADO. Revocó EXECUTE de funciones internas expuestas (lints 0028/0029). Quedan 2 warnings INTENCIONALES.
  - `supabase/patch_03_clonar_y_stock.sql` — APLICADO (re-aplicado con guarda). Creó `clonar_catalogo(...)` (onboarding selectivo: todo/categorias/lote, precio sugerido|cero, remapeo de categorías, reuso de imágenes) y `trg_descuenta_stock_venta` (descuenta stock CONDICIONAL a `empresa.venta_sin_stock`; si=true modo "ignorar", no toca inventario). Agregó guarda de pertenencia en `clonar_catalogo`.
  - `supabase/patch_04_revokes_definer.sql` — APLICADO. Revocó funciones de trigger y anon de las nuevas definer. Quedan **3 warnings INTENCIONALES** (ver Regla OBLIGATORIA y Notas de método).
- **Config del Dashboard aplicada (NO está en el repo, hay que replicar si se cambia de proyecto Supabase):**
  - Authentication → Email → **"Confirm email" DESACTIVADO** (para MVP: el usuario queda logueado al instante tras signUp; el RPC de alta necesita `auth.uid()`).
- **Catálogo sembrado:** `supabase/seed_catalogo.py` YA EJECUTADO. Resultado: **564 productos** insertados (86 sin precio → `precio_usd=0`, se editan desde la app), **72 imágenes** `.webp` subidas a bucket `productos/` y enlazadas por `imagen_url`. 8 categorías creadas.
- **Grafo graphify:** `graphify-out/` presente (68 nodos / 78 aristas). Plugin en `.opencode/plugins/graphify.js`.

## Conexión al proyecto Supabase (NO hardcodear keys en chat)
- **Proyecto:** `pvopcajqersioqlmccwg` → URL `https://pvopcajqersioqlmccwg.supabase.co`
- **Publishable key (frontend, segura):** ya en `web/.env` como `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Secret key:** se usa SOLO en backend/Edge Functions y en `seed_catalogo.py` vía env var `$env:SUPABASE_SERVICE_ROLE`. NUNCA se commitea ni se pega en el chat. El usuario la saca del Dashboard (Settings → API Keys → pestaña Publishable and secret).
- ⚠️ Si el usuario pegó una secret key en el chat por error: ROTALA inmediatamente (Dashboard → Delete/Revoke) y crea una nueva. Las secret keys nuevas se revocan por key, sin downtime (ya no existen las `service_role` legacy).

## Cómo retomar al abrir sesión nueva (CHECKLIST para el asistente)
1. Leer este `HANDOFF.md` (palabra clave "matrix").
2. `git status` y `git log --oneline -5` para ver qué cambió.
3. Confirmar con el usuario el foco (no asumir).
4. Para operar contra Supabase: pedir que el usuario defina las env vars en SU PowerShell:
   ```powershell
   $env:SUPABASE_URL="https://pvopcajqersioqlmccwg.supabase.co"
   $env:SUPABASE_SERVICE_ROLE="<secret key nueva, solo env var, nunca en chat>"
   ```
   El asistente NO debe correr comandos que contengan la secret key.

## Último hilo de trabajo (sesión parches SQL + MVP, 2026-07-17)
1. Se revisó el estado real: backend sólido, frontend MUY verde (solo Login/Registro/libs, sin app shell ni pantallas que usen los 564 productos).
2. Se detectó el bug de raíz del registro: `RegistroPage.tsx` + `auth.ts` no vinculaban `empresa_id`; el trigger corría con `empresa_id=NULL` → violaba NOT NULL; y `crearEmpresa()` fallaba por RLS sin usuario vinculado.
3. Decisión (usuario): resolver el alta con **RPC SECURITY DEFINER** (no Edge Function).
4. Se creó y aplicó `patch_01_alta_y_linter.sql` (linter + RPC `crear_empresa_con_admin`).
5. Aparecieron warnings NUEVOS (lints 0028/0029 de Supabase: SECURITY DEFINER expuestas). Se creó y aplicó `patch_02_revoke_definer.sql`. CLAVE: NO se revocó `es_de_empresa` de `authenticated` porque rompería TODAS las políticas RLS (doc PostgreSQL CREATE POLICY).
6. Se desactivó "Confirm email" en el Dashboard (decisión de MVP).
7. Se decidió el modelo de catálogo SaaS: clon desde empresa maestra a sucursales, propiedad propia, aislamiento RLS. Excel SOLO para el dueño (no en la app).
8. Chequeo arquitectónico MVP (producto/carrito/registro): el esquema sirve, pero faltaba clonado con remapeo de categorías y descuento de stock condicional (la mayoria de ferreterias NO lleva inventario). Se creó `patch_03_clonar_y_stock.sql`.
9. Se repitió el error de lints 0028/0029 en patch_03. Se instituyó la REGLA OBLIGATORIA en el HANDOFF (checklist antes de crear funciones definer) y se creó `patch_04_revokes_definer.sql`. Quedaron 3 warnings intencionales.

## Próximos pasos sugeridos — ENFOQUE ACTUAL (desde 2026-07-18)
> **DECISIÓN DE ENFOQUE:** el usuario definió que Catálogo es la ÚNICA prioridad hasta
> estar "bien definido". Se PAUSAN: alta_sucursal.py, Pantalla de Venta (carrito),
> impresión térmica, offline, crédito. No se retoma nada de eso hasta que Catálogo esté
> consolidado. La app corre en http://localhost:5173/catalogo (dev server en 5173).

1. **[HECHO] Cablear el registro al RPC:** `auth.ts` tiene `crearEmpresaConAdmin()` que llama el RPC; `RegistroPage.tsx` hace `signUp` → RPC. Build OK.
2. **[HECHO] Parches SQL BD del MVP:** patch_01..04 aplicados. patch_05 (storage writes) CREADO pero PENDIENTE de aplicar por el usuario en SQL Editor.
3. **[HECHO] App shell + guard + logout + nav:** `main.tsx`, `RequireAuth`, `Layout` (nav Venta/Catálogo), rutas `/login`,`/registro`,`/`,`/catalogo`. Build OK.
4. **[HECHO] Pantalla de catálogo (v1 funcional):** `CatalogoPage.tsx` + `ProductoForm.tsx` + `lib/productos.ts`. Lista/busca/filtra/crea/edita/soft-delete, alta de categorías inline, upload de imagen a `productos/${empresa_id}/`. Verificado en vivo: el usuario admin (creado por Dashboard, NO por SQL) ve los 564 productos de FerrehogarMart.
5. **[EN CURSO] Consolidar Catálogo (prioridad única):**
   - Revisión profunda de `lib/productos.ts`, `CatalogoPage.tsx`, `ProductoForm.tsx` para bugs/gaps.
   - Aplicar `patch_05_storage_writes.sql` (desbloquea upload real de imágenes).
   - Definir bien el modelo de la pantalla: ¿precio solo USD o también BS vía tasa? ¿edición masiva? ¿códigos de barra? ¿multimedia?
   - UX: paginación/scroll infinito (hoy `.limit(500)` hardcodeado), feedback de guardado, estados de carga por fila.
   - Validaciones: SKU/código único por empresa, precio >= 0, etc.
 - **[HECHO 2026-07-18, sesión rediseño UI] Mejoras de catálogo aplicadas:**
   - Buscador progresivo por palabra (prefijo de palabra primero, cae a substring) en `lib/productos.ts`.
   - Toolbar sticky; SKU en primera columna.
   - SKU y código de barras únicos por empresa (índice parcial en `patch_06_sku_unico.sql` extendido con `idx_producto_empresa_cb_unico`). Validación en `ProductoForm.tsx` + catch de duplicado server.
   - Desactivar/reactivar actualiza solo la fila (no recarga toda la lista ni pierde scroll).
   - **Rediseño UI**: layout dos columnas (sidebar de categorías sticky + main) con **toggle grid/lista** (cards estilo POS + tabla). Referencias: Square/Lightspeed/Odoo/Toast usan cards + sidebar de filtros; Odoo toggle grid/list. `CatalogoPage.tsx` + `index.css`.
   - ⚠️ **PENDIENTE ANTES DE CARRITO**: revisar y aplicar este mismo lenguaje visual (cards, sidebar, toggle, badges, sticky) a las demás pantallas (Login/Registro, Venta, etc.) para consistencia. El catálogo quedó como referencia de estilo.
 6. **[EN CURSO] Consolidar Catálogo — PRÓXIMO PASO CRÍTICO: resolver RPC `buscar_productos` (patch_07).** El error "structure of query does not match function result type" persiste; ver sección de estado arriba para hipótesis y pasos. Hasta resolverlo el catálogo queda vacío.
 7. **[PAUSADO] `supabase/alta_sucursal.py`:** clonado de catálogo a sucursales.
 8. **[PAUSADO] Pantalla de venta (carrito) — usa `terminal_pos_*` del experto como blueprint.**
 9. **[PAUSADO] Impresión térmica / Offline / Crédito.**
 10. **[PENDIENTE] Aplicar `patch_05_storage_writes.sql`** (upload real de imágenes) y `patch_06_sku_unico.sql` (confirmar).
 11. **[PENDIENTE] Llevar lenguaje visual del catálogo a Login/Registro/Venta** para consistencia (ver punto 5 del histórico).

## Archivos clave
- `docs/02-reglas-de-negocio.md` — RN-01..56.
- `docs/08-opciones-de-stack-y-decisiones.md` — stack (ACTUALIZADO a Supabase).
- `docs/11-decisiones-cerradas.md` — §9 stack Fase 1, §10 modificación a Supabase.
- `supabase/schema_fase2.sql` — esquema físico (YA APLICADO).
- `supabase/patch_01_alta_y_linter.sql` — linter + RPC de alta (YA APLICADO).
- `supabase/patch_02_revoke_definer.sql` — revoke de definer expuestas (YA APLICADO).
- `supabase/seed_catalogo.py` — seed de catálogo (YA EJECUTADO).
- `web/.env` — `VITE_SUPABASE_URL` + publishable key. NO se commitea (ver setup abajo).
- `web/src/lib/supabase.ts`, `web/src/lib/empresa.ts`, `web/src/lib/auth.ts` — cliente Supabase.
- `web/src/pages/LoginPage.tsx`, `web/src/pages/RegistroPage.tsx`, `web/src/main.tsx` — UI actual (mínima).

## Setup desde cero en OTRA PC (3 pasos, el asistente sabe el resto vía "matrix")
Requisitos: **Git** + **Node.js 20+**. (Python solo si se re-corre el seed.)
1. `git clone <repo>` → `cd web` → `npm install` → crear `web/.env` con:
   ```
   VITE_SUPABASE_URL=https://pvopcajqersioqlmccwg.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key: Dashboard → Settings → API Keys>
   ```
   (La secret key NUNCA va acá. La publishable es segura para el frontend.)
2. `npm run dev` → http://localhost:5173.
3. La BD ya está aplicada en la nube (esquema + patch_01..04 + seed). Solo re-aplicar SQL si creás un proyecto Supabase nuevo (orden: schema_fase2 → patch_01 → patch_02 → patch_03 → patch_04 → seed; y desactivar "Confirm email").
> Si usás opencode: decí "matrix" y el AGENTS.md te retoma solo. Si no, leé este HANDOFF.

## Notas de método
- graphify CLI: `$py -m graphify extract docs --backend gemini --no-cluster`. El grafo está en `graphify-out/`. OPCIONAL (ver setup).
- Regla de trazabilidad: todo se etiqueta Hecho / Supuesto / Decisión pendiente / Recomendación futura.
- El seed es idempotente: se puede correr de nuevo sin duplicar (empareja por `sku`+`empresa`).
- **2 warnings intencionales en Security Advisor** (NO son bugs, se pueden dismiss):
  - `0029` en `es_de_empresa` (authenticated): NECESARIO. Es el helper de RLS; si se le revoca EXECUTE de `authenticated`, todas las políticas dan "permission denied" (doc PostgreSQL CREATE POLICY).
  - `0029` en `crear_empresa_con_admin` (authenticated): es el RPC de alta, blindado con guarda `auth.uid() = p_auth_user_id`.

## ⚠️ Lecciones de esta sesión (para no repetir)
- NO asumir que el esquema ya está aplicado en Supabase; preguntar/verificar.
- NO correr comandos con la secret key desde el asistente; el usuario la pone en su terminal.
- Las rutas con `\U` en docstrings de Python rompen (unicodeescape); usar `os.path.join`.
- **Material Symbols:** usar Google Fonts con `text=` acotado a los iconos usados (~15), NO el npm `material-symbols` (pesaba 12.8 MB: 3 variantes de fuente completas).
- **RPC con `RETURNS TABLE` + `return query` (plpgsql):** el SELECT debe coincidir EXACTO en número, orden y TIPO con la tabla. Forzar casts (`::int`, `::jsonb`) en ambas ramas (`if`/`else`) del bloque, porque el planner puede inferir `bigint` en un `min(case...)` y romper con "structure of query does not match function result type". Verificar tipos reales de la tabla con `information_schema.columns` antes de declarar el `RETURNS TABLE`.
- **Búsqueda a escala:** el ranking debe hacerse en el SERVIDOR (RPC), no traer todas las coincidencias al cliente (se rompe con 2000+ productos).
- **No dejar el catálogo en blanco si el RPC falta:** al cambiar `listarProductos` a `supabase.rpc`, si el RPC no existe la pantalla queda vacía sin feedback. Considerar fallback o mensaje de error claro.
- `maybe_single()` de supabase-py retorna `None` al no hallar fila → usar `.limit(1).execute()` y chequear `res.data`.
- `.insert().select().limit(1)` no existe en sync builder → usar `.select().execute()` solamente.
- **NUNCA crear usuario admin insertando directo en `auth.users` por SQL.** Queda "invisible" para GoTrue: el login da 400 `invalid_credentials` aunque `encrypted_password`, `aud='authenticated'`, `email_confirmed_at` y `pass_ok` sean correctos (el Auth Log muestra `auth_user: null`). Crear SIEMPRE desde Dashboard → Authentication → Users → Add user (Auto Confirm) y luego insertar la fila en `public.usuario` ligando `empresa_id`. (Verificado 2026-07-18: se perdió ~1h en esto.)
- **Formato de API keys cambió:** ya NO son JWT `eyJ...`; ahora son `sb_publishable_<22chars>_<8chars-checksum>` y `sb_secret_<22>_<8>`. La publishable es segura para el frontend (`VITE_SUPABASE_PUBLISHABLE_KEY`).
- En `auth.users` de versiones nuevas **NO existe la columna `is_disabled`**; el baneo va en `raw_app_meta_data`. Al insertar por SQL hay que setear `aud='authenticated'`.

## 🔁 REGLA OBLIGATORIA: funciones SECURITY DEFINER y lints 0028/0029 (NO repetir el error)
> Se repitio 3 veces (patch_01, patch_02, patch_03). Toda funcion SECURITY DEFINER en
> Supabase queda expuesta via /rest/v1/rpc/ y dispara los lints del Security Advisor
> 0028 (anon puede ejecutar) y 0029 (authenticated puede ejecutar). Aplicar SIEMPRE este
> checklist al crear/modificar una funcion definer, en el MISMO parche:
1. **Clasificar**: ¿es helper de RLS / trigger (NO se llama por API) o ¿es RPC de negocio (SI se llama)?
2. **Helper/trigger** (ej. trg_alta_usuario, trg_descuenta_stock_venta): agregar
   `revoke all ... from public; revoke all ... from anon; revoke all ... from authenticated;`
3. **RPC de negocio** (ej. crear_empresa_con_admin, clonar_catalogo): `revoke ... from public; revoke ... from anon;`
   (dejar `authenticated`) PERO agregar guarda interna que valide `auth.uid()` (pertenencia o rol admin).
   NUNCA exponer RPC de negocio sin guarda.
4. **NUNCA revocar EXECUTE de `es_de_empresa` al rol `authenticated`**: es el helper de TODAS las
   politicas RLS; revocarlo rompe el acceso (doc PostgreSQL CREATE POLICY: la policy corre con los
   privilegios del usuario que consulta → "permission denied" en toda la app). Solo revocar de anon.
5. Usar `search_path = ''` y calificar tablas con `public.`/`auth.`.
6. Al cerrar el parche, advertir cuantos warnings 0028/0029 quedan y por que son intencionales.
- Warnings 0028/0029 INTENCIONALES que deben quedar (dismiss en el Advisor): `es_de_empresa` (authenticated),
  `crear_empresa_con_admin` (authenticated, blindado), `clonar_catalogo` (authenticated, blindado con guarda).
- Faltan guardas por agregar (deuda): `clonar_catalogo` aun NO valida que auth.uid() pertenezca a
  p_empresa_origen; hay que agregarla antes de exponerla a usuarios (hoy solo la usa el admin global).
