# MATRIX — Punto de Retorno (estado vivo del proyecto)

> **Uso:** Al iniciar una sesión nueva, el asistente lee este archivo con la palabra clave **"matrix"** y continúa el hilo sin que el usuario repita contexto.
> Este archivo es la fuente de verdad del estado. Se actualiza al cerrar cada avance.
> **Regla de oro:** si el usuario dice "no sé por dónde quedamos" o "revisa handoff", leer ESTE archivo primero, no inventar.

## Proyecto
Sistema de punto de venta para ferretería bimonetaria (Venezuela: BS / USD). Carpeta: `C:\Proyectos\puntoVenta2`.
Empresa del dueño: **FerrehogarMart** (id `b72bb1ff-9b7d-4e69-bb79-edd6f64c8b9b`).

## Estado actual (última actualización: 2026-07-17, sesión parches SQL)
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

## Próximos pasos sugeridos (Fase 1 avanzada / MVP) — ORDEN RECOMENDADO
1. **[HECHO] Cablear el registro al RPC:** `auth.ts` tiene `crearEmpresaConAdmin()` que llama el RPC; `RegistroPage.tsx` hace `signUp` → RPC. Build OK.
2. **[HECHO] Parches SQL BD del MVP:** patch_01 (alta RPC + linter), patch_02 (revokes), patch_03 (clonar_catalogo + stock condicional), patch_04 (revokes). Quedan 3 warnings 0029 intencionales.
3. **[SIGUIENTE] App shell + guard de sesión + logout:** `main.tsx` solo tiene `/login` y `/registro`; no hay ruta protegida ni logout. Necesario para probar logueado y para el onboarding de sucursales.
4. **[SIGUIENTE] `supabase/alta_sucursal.py`:** script tuyo (service_role en TU terminal) que da de alta una sucursal completa invocando `crear_empresa_con_admin` + `clonar_catalogo` (selectivo: empresas, categorías, modo precio). `clonar_catalogo` ya existe en patch_03.
5. **[SIGUIENTE] Pantalla de edición de catálogo** (alta/edición/borrado lógico `activo=false`, precios, imágenes). La misma pantalla sirve para que la sucursal edite la suya (RLS aísla). El borrado físico NO se usa (FK restrict en venta_detalle).
6. **[SIGUIENTE] Pantalla de venta (carrito):** el carrito vive en estado de React y se vuelca a `venta`+`venta_detalle` al cobrar. Respeta `empresa.venta_sin_stock` (modo ignorar/advertir/bloquear). El descuento de stock es automático solo si `venta_sin_stock=false`.
7. **Impresión térmica (ESC/POS):** pendiente.
8. **Offline (IndexedDB + cola):** Fase 4.
9. **Gap conocido:** `abono.cuenta_por_cobrar_id` apunta a `venta`; el modelo conceptual define `cuenta_por_cobrar` explícita. Corregir en Fase de Crédito.
10. **Deuda (fuera MVP):** margen de ganancia configurable (producto/categoría/grupo) vía `empresa.modo_precio` + `margen_pct`; proveedores/compras; devoluciones; limpiar Advisor moviendo `es_de_empresa` a esquema privado.

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

## Setup desde cero en OTRA PC (no asumir herramientas de la PC original)
Requisitos base (instalar si faltan): **Git**, **Node.js 20+** (trae npm). Python SOLO si se va a re-correr el seed.
1. `git clone <repo>` y entrar a la carpeta.
2. Frontend:
   ```
   cd web
   npm install          # instala deps desde package-lock.json
   ```
3. Crear `web/.env` (NO está en el repo por seguridad). Contenido:
   ```
   VITE_SUPABASE_URL=https://pvopcajqersioqlmccwg.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key del Dashboard: Settings → API Keys>
   ```
   La publishable key es segura para el frontend. La secret key NUNCA va acá ni en el repo.
4. `npm run dev` → levanta Vite (por defecto http://localhost:5173).
5. La BD Supabase ya está aplicada en la nube (proyecto compartido): esquema + 2 parches + seed. NO hace falta re-aplicar nada salvo que se cree un proyecto Supabase nuevo (en ese caso: correr `schema_fase2.sql`, luego `patch_01`, luego `patch_02`, luego el seed, y desactivar "Confirm email" en el Dashboard).
6. graphify (`graphify-out/`, plugin `.opencode/plugins/graphify.js`) es OPCIONAL y específico del entorno opencode. Si esas herramientas no existen en la otra PC, el proyecto funciona igual sin ellas.

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
- `maybe_single()` de supabase-py retorna `None` al no hallar fila → usar `.limit(1).execute()` y chequear `res.data`.
- `.insert().select().limit(1)` no existe en sync builder → usar `.select().execute()` solamente.

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
