# AGENTS.md — puntoVenta2

> **Asistente: leé esto ANTES de tocar nada.**

## Ritual de arranque (OBLIGATORIO)
1. Abrí y leé **`HANDOFF.md`** en la raíz. Es la fuente de verdad del estado del proyecto.
   La palabra clave del usuario para pedir esto es **"matrix"**.
2. Corré `git status` y `git log --oneline -5` para ver qué cambió.
3. Confirmá el foco con el usuario antes de asumir.

Este ritual retoma el estado del proyecto leyendo `HANDOFF.md`. El orchestrator de este
proyecto usa **CodeGraph** como mapa de código vivo (`.codegraph/`, generado localmente con
`codegraph init`); no se usa graphify. `HANDOFF.md` es la fuente de verdad del estado.

## Qué es este proyecto
Punto de venta para ferretería bimonetaria (Venezuela: BS/USD). Multi-tenant: la misma app
sirve a varias empresas (SaaS), aisladas por `empresa_id` con Row Level Security en Supabase.
Stack: React PWA (Vite) + Supabase (Postgres + Storage + Auth + RLS). Ver `docs/` para detalle.

## Deuda técnica conocida (léelo antes de "mejorar" algo)
El `HANDOFF.md` tiene una sección **"Deuda técnica real"** con los hallazgos verificados de la
auditoría 2026-07-19. Resumen para no repetir errores:
- **Críticos (postergados, dueño único):** fuga de Storage multi-tenant (`schema_fase2.sql:288`
  `productos_public_read` sin `es_de_empresa`); `empresaIdCache` no se invalida en logout
  (`web/src/lib/empresa.ts:35-49`).
- **Altos:** catch silenciosos (`CommandPalette.tsx:27`, `listarCategorias`); tipado `numeric`→`string`
  roto en `web/src/lib/productos.ts` (esta era la "causa del catálogo vacío", NO el SQL del RPC);
  `confirm()` nativo en `CatalogoPage`/`Layout`.
- **Mito aclarado:** el error "structure of query does not match function result type" del RPC
  `buscar_productos` NO es de SQL (el RPC está bien tipado y es `security invoker`). Es un mismatch
  cliente↔servidor por `numeric`→`string`. No vuelvas a parchear el SQL.

## Setup rápido (otra PC)
Ver la sección "Setup desde cero en OTRA PC" dentro de `HANDOFF.md`. Requiere Git + Node 20+.
`web/.env` NO está en el repo (contiene keys); se recrea siguiendo el HANDOFF.

## Reglas de trabajo
- No commitear secrets. `web/.env` está en `.gitignore`; nunca lo agregues.
- Comentarios, identificadores y UI: en español neutro/profesional (el usuario final es hispanohablante).
- Al cerrar un avance, ACTUALIZÁ `HANDOFF.md` (estado, próximos pasos, decisiones).
- Los SQL aplicados viven en `supabase/` numerados (`schema_fase2.sql`, `patch_01...`, `patch_02...`).
  Si aplicás SQL nuevo, agregalo como archivo numerado y anotalo en el HANDOFF.
- **Config de agentes OpenCode:** NO crear `opencode.json` en la raíz del repo. La distribución de
  sub-agentes (`gentle-orchestrator`, `sdd-*`, `review-*`, `jd-*`) vive en la config GLOBAL del
  usuario (`~/.config/opencode/opencode.json`), que ya tiene los modelos asignados con el formato
  correcto `opencode/<modelo>` (ej. `opencode/hy3-free`, `opencode/mimo-v2.5-free`). Para perfiles
  con nombre usar `gentle-ai sync --profile`, no edición manual. (Aprendido 2026-07-19: un
  `opencode.json` de proyecto redundante pelea con el global y el formato `opencode/zen/...` es
  incorrecto.)
