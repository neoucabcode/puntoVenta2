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
> 4. **🚨 NUNCA `git checkout HEAD -- <archivo>` cuando hay cambios sin commitear de sesiones
>    anteriores.** Esto BORRA los cambios no commiteados del archivo sin posibilidad de
>    recuperación (el `git stash pop` no los restaura si el archivo ya fue sobrescrito).
>    Si necesito revertir parcialmente, usar un patch selectivo o un editor, NUNCA
>    `git checkout HEAD -- <archivo>` a ciegas. Ver "Lecciones de esta sesión" para el
>    incidente del 2026-07-31 (pérdida de estilos CSS de topbar tasa pill y card-precio-usd).

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

## Estado actual (última actualización: 2026-07-31, session: Backfill imagenes Storage + fallback export)

### ProductoForm — Similitudes solo con foco (2026-07-29)
**Problema:** Los dropdowns de similitudes (nombre y SKU) aparecían siempre al abrir el form de edición, y el de nombre cubría los campos de abajo con `position: absolute`.

**Fix:**
- Nuevo state `campoActivo` — rastrea qué campo tiene foco (`'nombre'` | `'sku'` | `null`)
- Effects de similitud solo se ejecutan cuando `campoActivo` coincide con el campo relevante
- Dropdown de nombre cambió de `position: absolute` a `position relative` — empuja contenido en vez de superponer

### ProductoForm — SKU edit mode fix (2026-07-29)
**Problema:** Al abrir el form de edición, el campo SKU quedaba habilitado antes de que cargue la config. Además, el effect de `skuPreview` sobreescribía el SKU existente con uno nuevo.

**Fix:**
- `autoGenEnabled` ahora arranca en `false` en modo edición (antes de config load)
- `skuPreview` effect ahora tiene guard `!esEdicion` — nunca sobreescribe SKU existente

### Buscador — Ranking mejorado (2026-07-29)
**Problema:** El scoring usaba `MIN()` (peor match entre tokens), así que "CAP 50" y "CAP 1.5MF" obtenían el mismo score. El desempate era puramente alfabético.

**Fix:** `patch_16` — `buscar_productos` ahora usa scoring compuesto:
1. Cantidad de tokens con match de palabra (word-start) — DESC
2. Suma de scores por token — ASC (menor es mejor)
3. Nombre alfabético

Ejemplo: "trans met" → "TRANSMISION METALICA" (2 word-start matches) aparece antes que "TRANSMISION 10 DIENTES" (1 word-start + 1 substring).

**Error corregido:** `RETURNS SETOF record` en vez de `RETURNS TABLE(...)` causaba "materialize mode required". La firma debe ser idéntica a la deployada.

### SKU — Fallback de categoría (2026-07-29)
**Problema:** Con plantilla `categoria_secuencial`, el SKU mostraba solo "001" en vez de "CAP-001". Las categorías no tenían `codigo` en la DB, y el RPC lanzaba excepción.

**Fix:**
- `sku.ts` — `obtenerPreviewSku()` ahora busca `codigo,nombre` y deriva de 3 letras del nombre si `codigo` es NULL
- `productos.ts` — `listarCategorias()` ahora incluye `codigo` en el select
- `patch_15` — RPC `generar_sku` con fallback: `UPPER(LEFT(TRIM(nombre), 3))` cuando `codigo` es NULL + backfill automático de categorías existentes

### SKU — mayúsculas forzadas (2026-07-29)
- `ProductoForm.tsx` — input fuerza `.toUpperCase()` + `text-transform: uppercase`
- `sku.ts` — `verificarSkuDisponible()` normaliza a `.toUpperCase()` antes del RPC
- `patch_14` — `verificar_sku_disponible` compara con `LOWER()` (case-insensitive); `generar_sku` agrega `UPPER()` a categoría y prefijo

### Configuración — Save fix + Space optimization (2026-07-29)
**Problemas resueltos:**
- Save button no funcionaba: `position: fixed` dentro de `overflow: hidden` — el contenido lo cubría
- `handleSaveSku` retornaba silenciosamente si `config` era null (empresa sin fila de config)
- `actualizarConfigSku` escribía `actualizado_en` (columna inexistente en DB) → Supabase 400
- Header + tabs ocupaban 2 filas (~94px) — fusionados en 1 fila compacta (~40px)
- Section descriptions redundantes eliminadas

**Cambios:**
- Save bar: de `position: fixed` a **flex child** del layout — siempre visible
- `actualizarConfigSku`: de UPDATE a **upsert** con `onConflict: 'empresa_id'`
- `handleSaveSku`: obtiene `empresaId` de config o `obtenerMiEmpresaId()` (no más null guard)
- `useEmpresaConfig`: expone `refetch` para recargar después de save
- CSS: header+tabs fusionados, section headers reducidos, content padding optimizado

### Detección de duplicados por nombre (2026-07-29)
**Feature nueva:** Al escribir en "Nombre" del producto, se busca debounceada (400ms) productos similares.

**Implementación:**
- useEffect en `ProductoForm` que llama `buscarProductosSimilares` (RPC trigram) al cambiar el nombre
- **Fallback client-side**: si el RPC falla, usa `listarProductos` + trigram Jaccard local
- Dropdown inline debajo del input muestra: nombre, SKU, % similitud
- Filtra por umbral de config y excluye producto actual en modo edición
- `calcularSimilitud()` — Jaccard en trigrams de 3 chars (extraída para testabilidad)

**Archivos modificados:**
| Archivo | Cambio |
|---------|--------|
| `pages/ConfiguracionPage.tsx` | Header+tabs fusionados, save sin null guard, import obtenerMiEmpresaId |
| `pages/ConfiguracionPage.test.tsx` | Tests actualizados |
| `index.css` | Save bar como flex child, CSS optimizado (~300 líneas reescritas) |
| `lib/sku.ts` | upsert en actualizarConfigSku, eliminado actualizado_en del tipo |
| `lib/sku-format.test.ts` | Eliminado actualizado_en del mock |
| `lib/mock-data.ts` | Eliminado actualizado_en del tipo mock |
| `hooks/useEmpresaConfig.ts` | Agregado refetch |
| `components/ProductoForm.tsx` | Fallback client-side similarity, calcularSimilitud, dropdown nombre |
| `lib/config-save.test.ts` | **Nuevo** — tests de calcularSimilitud + upsert |

### Verificación
- TypeScript: 0 errores
- Tests: 170/170 pasan (161 originales + 9 nuevos)

### UI Inventario — Limpieza (2026-07-28)

**Cambios en toolbar de Inventario:**
- Eliminados botones: "Ajuste de stock", "Historial", "Configurar SKU"
- Eliminado el contador de productos (`div.inv-head`) de la toolbar
- Eliminados componentes: `HistorialModal.tsx`, `SkuConfigForm.tsx` (solo se usaban en inventario)
- Eliminado modal inline de ajuste de stock (~46 líneas)
- Limpiado CSS: bloque `hist-*` de `index.css`

**Reducción de espacio topbar→toolbar:**
- Padding-top de `.content` reducido de `var(--sp-4)` a `var(--sp-1)`
- Aplica a Inventario y Catálogo

#### Archivos modificados
| Archivo | Acción |
|---------|--------|
| `pages/InventarioPage.tsx` | Toolbar simplificada, -160 líneas |
| `pages/InventarioPage.test.tsx` | Test actualizado |
| `components/HistorialModal.tsx` | **Eliminado** |
| `components/SkuConfigForm.tsx` | **Eliminado** |
| `index.css` | Padding reducido, CSS historial removido |

#### Verificación
- TypeScript: 0 errores
- Tests: 61/61 pasan

### Pendiente Inventario
- El toolbar ahora tiene solo: búsqueda, filtro categorías, toggle vista, icono "Nuevo producto"
- Las funcionalidades eliminadas (ajuste stock, historial, config SKU) se pueden re-implementar como componentes separados si se necesitan en el futuro

### SKU Redesign Completo (2026-07-28)

**Cambio SDD:** `sku-redesign-completo` — 3 PRs encadenados implementados.

#### Decisiones de negocio
- SKU es inmutable (no cambia al cambiar categoría)
- Path de Storage por UUID: `{empresa_id}/{producto_id}.webp`
- Huecos se pierden (secuencia crece sin reutilizar)
- Feedback en tiempo real mientras tipea SKU (debounce 300ms)
- Dropdown de productos similares al escribir
- Solo admin puede editar SKU, con confirmación fuerte
- Exportación completa de catálogo (ZIP con JSON + imágenes)
- Importación vía drag & drop

#### PR 1: Storage UUID + SKU Inmutable
- `lib/productos.ts` — path cambia de `{sku}.webp` a `{producto_id}.webp`
- `components/SkuConfirmDialog.tsx` — diálogo de confirmación de 2 pasos
- `lib/sku.ts` — función `verificarSkuDisponible`
- Tests: 15 nuevos

#### PR 2: Feedback Tiempo Real
- `hooks/useSkuDisponibilidad.ts` — hook debounced (300ms)
- `components/SkuAvailabilityIndicator.tsx` — spinner + ✅/❌
- `components/SkuSimilarDropdown.tsx` — dropdown de similares
- Tests: 20 nuevos

#### PR 3: Export/Import Catálogo
- `lib/catalogo.ts` — `exportarCatalogo` + `importarCatalogo` (JSZip)
- `components/CatalogImportModal.tsx` — drag & drop modal
- `pages/InventarioPage.tsx` — botones exportar/importar (admin-gated)
- `supabase/patch_13_backfill_image_paths.sql` — script de migración
- Tests: 30 nuevos

#### Verificación
- TypeScript: 0 errores
- Tests: 126/126 pasan (61 originales + 65 nuevos)

### Pendiente conocido

### Página de Configuración de Empresa (2026-07-28)

**Cambio SDD:** `configuracion-empresa` — página admin con 3 secciones.

#### Funcionalidad
- **Ruta:** `/configuracion` (solo admin)
- **Navegación:** ícono settings en avatar dropdown del topbar
- **3 tabs:**
  - **SKU:** toggle auto-gen, plantilla, modo contador, longitud, prefijo, umbral similitud
  - **Empresa:** tasa activa, IGTF, venta sin stock, stock negativo
  - **Módulos:** habilitar/deshabilitar catálogo, venta, inventario, caja, reportes

#### Archivos creados/modificados
| Archivo | Acción |
|---------|--------|
| `pages/ConfiguracionPage.tsx` | **Nuevo** — página principal con 3 tabs |
| `components/ConfirmModal.tsx` | **Nuevo** — modal de confirmación genérico |
| `lib/empresa.ts` | Modificado — `actualizarMiEmpresa()` |
| `components/TopbarUnificada.tsx` | Modificado — nav item admin-only |
| `main.tsx` | Modificado — ruta `/configuracion` |

#### Verificación
- TypeScript: 0 errores
- Tests: 142/142 pasan (126 + 16 nuevos)

### Refactor POS completo (2026-07-27)

**Cambio SDD:** `pos-refactor-completo` — 5 fases implementadas directamente (sin SDD formal).

#### Fase 1: Topbar Unificada + Layout
- **Archivo nuevo:** `web/src/components/TopbarUnificada.tsx` — topbar de 50px con nav icons + status
- **Layout.tsx:** simplificado de 179→~40 líneas, sidebar eliminada
- **CSS:** layout cambiado de grid 2-col a flex column

#### Fase 2: Cart Zustand Store + Types
- **Archivo nuevo:** `web/src/types/carrito.ts` — tipos compartidos (CarritoItem, InstrumentoPago, etc.)
- **Archivo nuevo:** `web/src/store/useCarritoStore.ts` — Zustand store con persistencia localStorage
- **Carrito.tsx:** refactorizado, tipos movidos a types/, re-exports para backward compat
- **PosPage.tsx:** 19+ useState reemplazados por store selectors

#### Fase 3: Payment Flow
- **Drawer toggle** para tablet/móvil con floating pill button
- **Price override** inline en carrito (tap en precio → input editable)
- **IGTF condicional** (solo en pago BS, con hint visual)
- **Error recovery** mejorado (validación pre-venta, spinner, mensajes específicos)

#### Fase 4: Offline Integration
- **ventaOffline.ts:** reescrito para 1-evento-por-venta (antes era 1-por-producto)
- **SyncStatus.tsx:** componente nuevo con pending count, error count, retry button
- **colaOffline.ts:** extendido con `contarErrores()` y `reintentarErrores()`
- **Payload versionado:** `version: 2` para migración gradual del RPC

#### Fase 5: Responsive Corrections (post-refactor)
- **Breakpoints:** 900px (drawer) / 600px (phone)
- **Drawer desde derecha** con backdrop blur
- **Floating pill button** con badge + total
- **2 columnas exactas en móvil** con texto truncado
- **Topbar flex-wrap** en phones
- **Tasa BCV:** default cambiado a 36.50 (antes era 1)

#### Archivos creados/modificados
| Archivo | Acción |
|---------|--------|
| `components/TopbarUnificada.tsx` | **Nuevo** |
| `components/SyncStatus.tsx` | **Nuevo** |
| `types/carrito.ts` | **Nuevo** |
| `store/useCarritoStore.ts` | **Nuevo** |
| `components/Layout.tsx` | Simplificado |
| `components/Carrito.tsx` | Refactoreado |
| `pages/PosPage.tsx` | Refactoreado |
| `lib/ventaOffline.ts` | Reescrito (1 evento/venta) |
| `lib/colaOffline.ts` | Extendido |
| `index.css` | Actualizado |

#### Verificación
- TypeScript: 0 errores
- Tests: 61/61 pasan
- Build: exitoso

### Pendiente conocido
- RPC server-side (`aplicar_venta_offline`) necesita update para aceptar `version: 2` del payload
- Catch silenciosos en `listarCategorias`/`obtenerMiEmpresa` (deuda conocida)
- IVA 16% y IGTF 3% hardcoded (correcto para Venezuela actual)
- Ajuste de stock, historial y config SKU eliminados del toolbar — re-implementar si se necesitan

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
   normales; solo admin con diálogo de confirmación fuerte puede editarlo. El frontend ya tiene
   `validarFormatoSku()` y `SkuConfirmDialog`, pero falta validación server-side.
2. **17 productos sin imagen** — el usuario las sube desde Inventario → ProductoForm.
3. **Slices 3-6 del rediseño UI** — pagos combinados, devoluciones, presupuestos, hardware.
4. **Consistencia visual** — Login/Registro/Venta con el mismo estilo del catálogo.
5. **Aplicar SQL** `patch_08_ordenar_productos_rpc.sql` en Supabase Dashboard → SQL Editor.
6. **Aplicar SQL** `patch_14_verificar_sku_disponible.sql` en Supabase Dashboard → SQL Editor.

## Bugs abiertos (2026-07-29 verificado)
1. ~~**ImageEditor crash**~~ — **RESUELTO** (2026-07-23). Causa raíz: `aspect={NaN}` en el Cropper original.
2. ~~**Storage path 400 / RLS policy**~~ — **RESUELTO** (2026-07-23). Causa raíz: `mi_empresa_id()` no tenía `search_path` fijo.
3. **SKU editable sin restricción backend** — El frontend ahora valida formato y muestra warnings, pero falta validación server-side. `verificar_sku_disponible` RPC creado (patch_14) pero aún no aplicado en prod.
4. **Botón de pegar (portapapeles) no visible** — el botón de pegar imagen desde portapapeles no aparece en el ImageEditor. CSS corregido pero aún no visible en producción.
5. **Fuga Storage multi-tenant** — `productos_public_read` expone TODAS las imágenes a CUALQUIER usuario autenticado.

## Rol del Excel (decisión 2026-07-22)
El Excel (`catalogo_inicial.xlsx`) es una **herramienta de bootstrap**, NO una fuente viva.
- **Estado:** ✅ DATOS COMPLETADOS (2026-07-22). Todos los productos ya están en Supabase.
- **Único pendiente:** imágenes. El usuario va agregando `{sku}.webp` a la carpeta de Drive
  y las sube manualmente cuando las tenga.
- **Producción:** el Excel se ignora. La app (Supabase) es la única fuente de verdad.

## Cómo retomar al abrir sesión nueva (CHECKLIST para el asistente)
1. Leer este `HANDOFF.md` (palabra clave "matrix").
2. `git status` y `git log --oneline -5`.
3. Confirmar con el usuario el foco (no asumir).
4. Para operar contra Supabase: el usuario define las env vars vía `supabase/.env.local`
   (ya existe, ignorado por git). El asistente NO corre comandos con la secret key.
5. **Engram:** si el MCP server está disponible, guardar resumen de sesión con `mem_session_summary`.

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
- **Topbar unificada:** eliminar sidebar y fusionar nav + search + status en una sola barra de 50px
- **Zustand store para carrito:** reemplazar 19+ useState con store centralizado + persistencia
- **1-evento-por-venta:** no crear un evento offline por línea de producto (sin atomicidad)
- **Drawer desde la derecha:** en ≤900px, el carrito slide desde la derecha con backdrop blur
- **Tasa BCV default:** siempre initialize con un valor razonable (36.50), nunca con 1
- **Breakpoints responsivos:** 900px (tablet/drawer) / 600px (phone/2-col)
- **Floating pill button:** mejor que bottom snippet para acceso rápido al carrito en móvil
- **RETURNS TABLE vs RETURNS SETOF record:** al hacer DROP+CREATE de un RPC existente, la firma (RETURNS TABLE con columnas explícitas) debe ser IDÉNTICA. Cambiar a SETOF record rompe el mapeo de PostgREST y causa "materialize mode required".
- **🚨 NUNCA `git checkout HEAD -- <archivo>` cuando hay cambios visuales sin commitear del
  usuario.** El 2026-07-31 perdí los estilos de topbar-tasa pill y card-precio-usd haciendo
  `git checkout HEAD -- web/src/index.css` mientras separaba mis cambios de los suyos.
  El `git stash pop` no los restauró porque el archivo ya estaba sobrescrito. Si necesito
  revertir parcialmente, usar un patch selectivo o pedirle al usuario que commitee primero.
  REGLA DE ORO #4 (arriba).

---

## Resumen sesión 2026-07-29 (SKU edit mode fix + Search ranking + SKU category prefix)

### Qué hicimos
1. **SKU category prefix** — `obtenerPreviewSku()` deriva prefijo de 3 letras del nombre de categoría cuando `codigo` es NULL
2. **listarCategorias** — ahora incluye `codigo` en el select
3. **patch_15** — RPC `generar_sku` con fallback de nombre + backfill de categorías existentes
4. **patch_16** — RPC `buscar_productos` con scoring compuesto (word-start count * 10 - sum scores)
5. **SKU edit mode fix** — `autoGenEnabled` arranca en `false` en edición + `skuPreview` guard `!esEdicion`

### Archivos modificados
- `web/src/lib/sku.ts` — fallback de código desde nombre
- `web/src/lib/productos.ts` — listarCategorias incluye codigo
- `web/src/components/ProductoForm.tsx` — SKU edit mode fix
- `supabase/patch_15_sku_categoria_fallback.sql` (NUEVO)
- `supabase/patch_16_buscar_productos_ranking.sql` (NUEVO)
- `HANDOFF.md` — actualizado

### Estado
- TypeScript: 0 errores
- Tests: 170/170 pasan (24 archivos)
- Git: develop, 4 commits ahead (ya pusheados)

### Pendiente para próxima sesión
- Regla "SKU no editable" — validación server-side
- 17 productos sin imagen
- Slices 3-6 del rediseño UI

---

## Resumen sesión 2026-07-31 (Backfill imagenes Storage + fallback export)

### Problema
Auditoria del ZIP exportado mostro que solo 7 de 576 imagenes referenciadas se incluian. La app muestra casi todas las imagenes bien, pero el export solo encontraba 7. **Esto es bloqueante para deploy a prod.**

### Causa raiz
- Migracion del 2026-07-28 (commit `8aa033b`) cambio el path de Storage de `${sku}.webp` a `${producto_id}.webp`
- `subirImagenProducto` usa el path nuevo (UUID), pero los archivos viejos (~569) quedaron en el path viejo (SKU)
- La app los muestra bien porque hace `<img src={imagen_url}>` directo — la URL en DB apunta al path viejo y el browser la carga
- `exportarCatalogo` IGNORA la URL de la DB y construye su propio path `${empresaId}/${p.id}.webp` — falla silenciosamente
- `patch_13_backfill_image_paths.sql` se aplico pero era audit-only; el script cliente que prometia NUNCA SE ESCRIBIO

### Solucion (3 partes)

**Parte 1: Fix inmediato del export con fallback**
- `lib/catalogo.ts` exportarCatalogo ahora intenta el path nuevo (UUID), y si falla, hace fallback al viejo (SKU)
- Ya no falla silenciosamente — loguea warnings con `console.warn`
- Reporta al final cuantos productos quedaron sin imagen y sugiere correr el backfill

**Parte 2: Script de backfill idempotente**
- `web/src/lib/backfill-images.ts` — `backfillImagenes({ dryRun?, empresaId?, keepOld? })`
- Detecta productos con `imagen_url` apuntando al path viejo (URL no contiene el UUID)
- Para cada uno: descarga viejo → sube nuevo (upsert) → actualiza imagen_url en DB → borra viejo (opcional)
- Idempotente: si el nuevo ya existe, skip
- Logging claro con resumen al final
- Soporta dry-run para simular sin hacer cambios

**Parte 3: Tests**
- 6 tests para el backfill (idempotencia, dry-run, skip si no existe, migracion exitosa, keepOld)
- 3 tests nuevos para el fallback del export
- Total: 182 tests pasan (174 anteriores + 8 nuevos)

### Como usar antes de deploy a prod

**Paso 1 (opcional pero recomendado): dry-run para ver cuantos se migrarian**
```ts
import { backfillImagenes } from './lib/backfill-images'
const result = await backfillImagenes({ dryRun: true })
console.log(result) // { total, migrados, yaMigrados, noEncontrados, errores }
```

**Paso 2: ejecutar el backfill real**
```ts
await backfillImagenes() // migra y borra viejos
```

**Paso 3: re-exportar el catalogo y verificar**
- Las URLs en `catalogo.json` ahora apuntan al path nuevo
- El ZIP deberia tener casi todas las imagenes
- Si quedan `missingImages`, son productos sin archivo en Storage (no son por la migracion)

**Paso 4: deploy a prod**
- Prod tiene su propio bucket — correr el backfill ahi tambien si tiene imagenes pre-migracion

### Archivos modificados
| Archivo | Cambio |
|---------|--------|
| `lib/catalogo.ts` | exportarCatalogo: fallback al path viejo + warnings |
| `lib/backfill-images.ts` | **Nuevo** — script idempotente de migracion |
| `lib/catalogo.test.ts` | +3 tests del fallback |
| `lib/backfill-images.test.ts` | **Nuevo** — 6 tests del backfill |

### Verificacion
- TypeScript: 0 errores
- Tests: 182/182 pasan (26 archivos)

### Lección
**Toda migracion de path en Storage DEBE incluir un script que mueva los archivos existentes.** Un SQL audit-only no migra nada. Si esto se repite en el futuro (cambio de path, cambio de bucket, etc.), el script de migracion debe escribirse ANTES de cambiar el path de upload, no después.

---

## Resumen sesión 2026-07-31 (Catálogo export portable)

### Problema
La exportación de catálogo usaba UUIDs internos para nombrar archivos de imagen (`imagenes/abc-123-def.webp`). Esto hacía que el ZIP no fuera portable — otro programa no sabía qué era `abc-123-def`. Además, la importación buscaba imágenes por SKU pero el archivo tenía el UUID, causando pérdida silenciosa de imágenes al reimportar.

### Fix
- **Export:** imágenes ahora se nombran por SKU (`imagenes/FER-001.webp`) en vez de UUID
- **Import:** ya buscaba por SKU, así que ahora cuadra con el formato del export
- **Guard:** productos sin SKU no exportan imagen (no tendría nombre válido)

### Formato del ZIP resultante
```
catalogo.json
imagenes/
  FER-001.webp
  PIN-001.webp
  ...
```

### JSON exportado
```json
{
  "version": "1.0",
  "exportado_en": "2026-07-31T...",
  "categorias": [{ "nombre": "Ferretes", "codigo": "FER" }],
  "productos": [{
    "sku": "FER-001",
    "nombre": "Tornillo 1/4",
    "categoria_nombre": "Ferretes",
    "unidad": "unidad",
    "costo_usd": 0.1,
    "precio_usd": 0.25,
    "imagen_archivo": "imagenes/FER-001.webp"
  }]
}
```

### Archivos modificados
| Archivo | Cambio |
|---------|--------|
| `lib/catalogo.ts` | Export usa SKU para nombres de imagen, guard en productos sin SKU |
| `lib/catalogo.test.ts` | Tests actualizados para nuevo formato (SKU-based filenames) |

### Verificación
- TypeScript: 0 errores
- Tests: 32/32 pasan (19 catalogo + 13 productos)

---

## Resumen sesión 2026-07-31 (Regeneración masiva de SKU)

### Feature nueva
Wizard multi-paso para regenerar todos los SKU de una empresa con reset de contadores.

### Flujo del wizard
1. **Intro**: advertencia + opción de exportar catálogo actual como backup (opcional pero recomendado)
2. **Config**: formulario con plantilla (categoría/solo/prefijo), modo contador, longitud, prefijo manual
3. **Confirm**: muestra resumen de la config + última advertencia
4. **Executing**: spinner mientras se ejecuta
5. **Result**: muestra regenerados + errores (si los hay)

### Implementación

**SQL** (`patch_17_regenerar_sku_lote.sql`):
- RPC `regenerar_sku_lote(p_empresa_id uuid) RETURNS TABLE(regenerados int, errores jsonb)`
- SECURITY DEFINER + check admin via `auth.uid()`
- DELETE contadores → loop productos (ORDER BY creado_en) → llamar `generar_sku` por cada uno
- Captura errores por producto sin abortar todo el batch

**Frontend**:
- `lib/sku.ts`: nueva función `regenerarSkusEnLote(empresaId)` que llama al RPC
- `components/RegenerarSkuWizard.tsx`: wizard multi-paso
- `pages/ConfiguracionPage.tsx`: nueva card "Zona peligrosa" en tab SKU con botón que abre el wizard (admin-only)
- `index.css`: estilos para wizard + danger zone

### Decisiones de diseño
- **No se delega a actualizarConfigSku + regenerarSkusEnLote en el frontend**: el wizard primero guarda la config nueva vía `actualizarConfigSku`, luego llama `regenerarSkusEnLote` (que usa la config ya actualizada)
- **Producto que devuelve NULL**: se reporta como error (autogenerar_activo probablemente desactivado)
- **Export opcional, no bloqueante**: si la export falla, el wizard continúa

### Archivos modificados
| Archivo | Cambio |
|---------|--------|
| `supabase/patch_17_regenerar_sku_lote.sql` | **Nuevo** — RPC regenerar_sku_lote |
| `web/src/lib/sku.ts` | Agregado regenerarSkusEnLote + tipo ResultadoRegenerarSku |
| `web/src/lib/regenerar-sku.test.ts` | **Nuevo** — 5 tests |
| `web/src/components/RegenerarSkuWizard.tsx` | **Nuevo** — wizard multi-paso |
| `web/src/pages/ConfiguracionPage.tsx` | Import + estado + card "Zona peligrosa" + render del wizard |
| `web/src/index.css` | Estilos wizard + danger zone |

### Verificación
- TypeScript: 0 errores
- Tests: 174/174 pasan (169 anteriores + 5 nuevos)

### Bug encontrado y corregido (2026-07-31)
**Síntoma**: 364 errores `duplicate key value violates unique constraint "idx_producto_sku_empresa"` al ejecutar la regeneración en dev.

**Causa raíz**: El RPC regeneraba SKU de a uno con `UPDATE producto SET sku = 'FER-001' WHERE id = X`, pero los contadores arrancaban en 0 y los SKU viejos (FER-001, FER-002, etc.) seguían en la tabla. El primer producto procesado sobrescribía OK, pero cuando le tocaba a otro producto que originalmente tenía `FER-001`, el `generar_sku` volvía a generar `FER-001` y colisionaba con el producto que recién se actualizó.

**Fix**: Agregar `UPDATE producto SET sku = NULL WHERE empresa_id = X` ANTES de resetear contadores. Los NULLs no entran en el índice único parcial (`WHERE sku IS NOT NULL`), así que el loop puede regenerar limpiamente sin colisiones.

**Estado de la base después del bug**: ~222 productos con SKU nuevo, ~364 con SKU viejo (los que estaban después en el orden y fallaron). Inconsistente pero NO dañado (Storage usa UUID, imágenes intactas).

**Resolución**: Aplicar patch_17 v2 (con el fix) y volver a ejecutar el wizard. La regeneración va a SET NULL todos los SKU primero (incluyendo los nuevos) y regenerar todo limpio.

**Lección**: Cuando un RPC regenera valores únicos en bulk, **primero limpiar el destino antes de regenerar**. Confiar en que el UPDATE "sobrescribe" sin conflicto es un error — puede colisionar con valores no procesados todavía.

---

## Resumen sesión 2026-07-30 (Topbar tasa pill + Card precio USD pill + Card height fix)

### Topbar — Tasa BCV resaltada (2026-07-30)
**Problema:** La tasa del día se veía igual que los nav items, sin resaltar视觉mente.

**Fix:**
- `.topbar-tasa` cambió de texto plano a **pill azul brillante** (`linear-gradient #0d6efd → #0b5ed7`)
- Texto blanco, sombra sutil (`box-shadow: 0 2px 8px rgba(13,110,253,0.3)`)
- Hover con elevación (`translateY(-1px)`, sombra más intensa)
- Tasa desactualizada (>12h): pill rojo (`linear-gradient #dc3545 → #bb2d3b`)
- Input de edición: fondo blanco, texto azul, sin borde
- Label de tiempo relativo: badge pill sutil

### Cards Grid — Precio USD resaltado (2026-07-30)
**Problema:** El precio en dólares se veía igual que el resto del texto de la card.

**Fix:**
- Nuevo `.card-precio-usd`: pill azul mismo estilo que la tasa del topbar
  - `font-size: 0.95rem`, `font-weight: 700`, `padding: 0.3rem 0.75rem`
  - Gradiente azul, texto blanco, sombra, hover con elevación
- Aplica en PosPage, CatalogoPage e InventarioPage (vista cuadrícula)
- Badge "sin precio": ahora mide igual que el pill de precio

### Cards Grid — Altura uniforme (2026-07-30)
**Problema:** Cards sin precio ("sin precio") tenían distinta altura que cards con precio.

**Fix:**
- Eliminado `align-self: start` de `.card-producto` y `.pos-productos-grid .card-producto`
- Grid ahora estira todas las cards de la misma fila a la misma altura
- `.card-footer` con `min-height: 2rem` para consistencia
- `.card-nombre` cambiado de `calc(1rem * var(--scale))` a `0.875rem` (14px) fijo

### Archivos modificados
| Archivo | Cambio principal |
|---------|-----------------|
| `index.css` | Pills tasa+precio USD, alturas uniformes, card-nombre 14px |
| `pages/PosPage.tsx` | `<span className="card-precio-usd">` |
| `pages/CatalogoPage.tsx` | `<span className="card-precio-usd">` |
| `pages/InventarioPage.tsx` | `<span className="card-precio-usd">` |

### Verificación
- TypeScript: 0 errores
- Tests: 170/170 pasan (24 archivos)

### Pendiente conocido
- RPC server-side (`aplicar_venta_offline`) necesita update para aceptar `version: 2` del payload
- Catch silenciosos en `listarCategorias`/`obtenerMiEmpresa` (deuda conocida)
- IVA 16% y IGTF 3% hardcoded (correcto para Venezuela actual)
- Regla "SKU no editable" — validación server-side
- 17 productos sin imagen
- Slices 3-6 del rediseño UI
- Verificar en prod que el upsert de config funciona (puede que la empresa no tenga fila de config)

---

## Resumen sesión 2026-07-30 (Topbar restructure + Cards grid unification + Light mode)

### Topbar — Restructura completa (2026-07-30)
**Cambios:**
- **Dropdowns en nav items:** Venta (Caja + HistorialVenta), Catálogo (Solo Activos, Ocultar Agotados), Inventario (Producto Nuevo, Editar, Importar, Exportar). Label navega, arrow toggle dropdown.
- **Tasa BCV editable inline:** click → input → Enter o click-fuera guarda. Persiste en Zustand store (`useCajaStore.tasaBCV` + `partialize`). PosPage ya NO sobreescribe desde Supabase.
- **Fix Enter bug:** causa raíz = `onBlur` se dispara 2 veces al presionar Enter. Fix: `editandoTasaRef` (useRef boolean) — solo `iniciarEdicionTasa` pone `true`, `guardarTasa` consume en primera línea y pone `false`. El que llega primero gana.
- **Eliminado hamburger/drawer mobile** — labels siempre visibles, sin menú lateral.
- **Eliminado estado-conexion** (icono wifi inline) del topbar — `SyncStatus` sigue existente.
- **Dropdowns ya no se cortan** — CSS `right: 0` → `left: 0` en `.topbar-dropdown`.
- **Topbar verde light mode** — fondo `#d4edda`.

### Cards Grid — Unificación visual (2026-07-30)
**Aplica a:** PosPage, CatalogoPage, InventarioPage (vista cuadrícula)

**Cambios por página:**
| Cambio | PosPage | CatalogoPage | InventarioPage |
|--------|---------|--------------|----------------|
| Sin `card-sku` | ✅ | ✅ | ✅ |
| Sin `card-costo` | — | — | ✅ |
| Stock solo en imagen | ✅ (reemplazó ribbon) | ✅ (ya estaba) | ✅ (reemplazó ribbon) |
| Sin `card-stock` en footer | ✅ | — | ✅ |
| Precio Bs al lado de $ | ✅ | ✅ | ✅ |

- **Stock badge en imagen:** `.card-img .card-stock` con posición absoluta, fondo semitransparente (ok=verde, warn=naranja, off=rojo), opacidad 0.4.
- **Precio Bs:** `fmtBs(p.precio_usd * tasaBCV)` en `<span className="card-precio-bs">` — font-size 0.7em, color `var(--text-muted)`.
- **Card heights fix:** `.card-nombre` con `min-height` fijo para 2 líneas — todas las cards quedan igual altura.
- **Images:** `object-fit: cover` en `.card-img img` para consistencia visual.

### Light Mode — Ajustes (2026-07-30)
**Variables cambiadas:**
| Variable | Antes | Ahora |
|----------|-------|-------|
| `--bg-base` | `#f6f7f9` | `#ffffff` |
| `--bg-content` | `#f6f7f9` | `#ffffff` |
| `--elev-0` | `#f6f7f9` | `#ffffff` |
| `--bg-sidebar` | `#ffffff` | `#f6f7f9` |
| `--surface-1` | `#ffffff` | `#f6f7f9` |
| `--elev-1` | `#ffffff` | `#f6f7f9` |
| `--primary-ink` | `#ffffff` | `#f6f7f9` |

**Topbar:** fondo `#d4edda` (verde intenso sutil), grids matching `#d4edda`.

### Configuración — Tasa eliminada (2026-07-30)
- Sección "Tasa de cambio" eliminada de ConfiguraciónPage (solo se edita desde topbar).
- `tasaActiva` state eliminado, `tasa_activa` ya no se envía en `handleSaveEmpresa`.

### Store — useCajaStore (2026-07-30)
- `tasaBCV` agregado a `partialize` — persiste en localStorage (`pv-caja`).
- `tasaActualizadaEn` agregado al state.
- PosPage ya no sobreescribe `tasaBCV` desde Supabase al cargar.

### Nuevos componentes
- `HistorialVenta.tsx` — muestra ventas del día en dropdown de Venta.
- `ProductoSearchModal.tsx` — búsqueda de productos por nombre/SKU para flujo de edición.

### Archivos modificados
| Archivo | Cambio principal |
|---------|-----------------|
| `components/TopbarUnificada.tsx` | Restructura completa, dropdowns, tasa editable, sin drawer |
| `components/HistorialVenta.tsx` | **Nuevo** — historial de ventas del día |
| `components/ProductoSearchModal.tsx` | **Nuevo** — búsqueda de productos |
| `pages/PosPage.tsx` | Cards grid unificado, sin ribbon, stock en imagen, precio Bs |
| `pages/CatalogoPage.tsx` | Cards grid unificado, sin SKU, precio Bs |
| `pages/InventarioPage.tsx` | Cards grid unificado, sin SKU/costo, stock en imagen, precio Bs |
| `pages/ConfiguracionPage.tsx` | Eliminada config de tasa |
| `store/useCajaStore.ts` | tasaBCV en partialize |
| `index.css` | Light mode, topbar verde, cards stock overlay, card-precio-bs |
| `web/index.html` | Google Fonts Material Symbols actualizado |

### Verificación
- TypeScript: 0 errores
- Tests: 170/170 pasan (24 archivos)
- Git: develop, commit `e74ee02` pusheado

### Pendiente conocido
- RPC server-side (`aplicar_venta_offline`) necesita update para aceptar `version: 2` del payload
- Catch silenciosos en `listarCategorias`/`obtenerMiEmpresa` (deuda conocida)
- IVA 16% y IGTF 3% hardcoded (correcto para Venezuela actual)
- Regla "SKU no editable" — validación server-side
- 17 productos sin imagen
- Slices 3-6 del rediseño UI
