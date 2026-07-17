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
  - `supabase/patch_02_revoke_definer.sql` — APLICADO. Revocó EXECUTE de funciones internas expuestas (lints 0028/0029). Quedan 2 warnings INTENCIONALES (ver "Notas de método").
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

## Último hilo de trabajo (sesión parches SQL, 2026-07-17)
1. Se revisó el estado real: backend sólido, frontend MUY verde (solo Login/Registro/libs, sin app shell ni pantallas que usen los 564 productos).
2. Se detectó el bug de raíz del registro: `RegistroPage.tsx` + `auth.ts` no vinculaban `empresa_id`; el trigger corría con `empresa_id=NULL` → violaba NOT NULL; y `crearEmpresa()` fallaba por RLS sin usuario vinculado.
3. Decisión (usuario): resolver el alta con **RPC SECURITY DEFINER** (no Edge Function).
4. Se creó y aplicó `patch_01_alta_y_linter.sql` (linter + RPC `crear_empresa_con_admin`).
5. Aparecieron 5 warnings NUEVOS (lints 0028/0029 de Supabase: SECURITY DEFINER expuestas). Se creó y aplicó `patch_02_revoke_definer.sql`. CLAVE: NO se revocó `es_de_empresa` de `authenticated` porque rompería TODAS las políticas RLS (doc PostgreSQL CREATE POLICY). Quedaron 2 warnings intencionales.
6. Se desactivó "Confirm email" en el Dashboard (decisión de MVP).

## Próximos pasos sugeridos (Fase 1 avanzada / MVP) — ORDEN RECOMENDADO
1. **[HECHO] Cablear el registro al RPC:** `auth.ts` ahora tiene `crearEmpresaConAdmin()` que llama `supabase.rpc('crear_empresa_con_admin', ...)`. `RegistroPage.tsx` hace `signUp` → RPC en orden correcto (antes fallaba por RLS con `crearEmpresa()` suelto). Build OK. Falta redirigir tras login (paso 2 del plan: app shell).
2. **[SIGUIENTE] App shell + guard de sesión + logout:** `main.tsx` solo tiene `/login` y `/registro`; no hay ruta protegida ni logout. Necesario para probar logueado y para el onboarding de sucursales.
2. **App shell + guard de sesión + logout:** hoy `main.tsx` solo tiene rutas `/login` y `/registro`. No hay pantalla protegida ni forma de cerrar sesión. Necesario para probar cualquier cosa logueado.
3. **App de edición de catálogo:** pantalla para editar los 86 productos sin precio y subir imágenes faltantes desde la PWA.
4. **Impresión térmica (ESC/POS):** pendiente desde el inicio.
5. **Offline (IndexedDB + cola):** Fase 4.
6. **Gap conocido:** `abono.cuenta_por_cobrar_id` apunta a `venta`; el modelo conceptual define `cuenta_por_cobrar` explícita. Corregir en Fase de Crédito.
7. **Deuda técnica (opcional):** dejar el Security Advisor 100% limpio moviendo `es_de_empresa` a un esquema privado (ej. `private`) no expuesto por la API, y recrear las políticas apuntando a `private.es_de_empresa`. Documentado en `patch_02_revoke_definer.sql`.

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
