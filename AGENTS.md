# AGENTS.md — puntoVenta2

> **Asistente: leé esto ANTES de tocar nada.**

## Ritual de arranque (OBLIGATORIO)
1. Abrí y leé **`HANDOFF.md`** en la raíz. Es la fuente de verdad del estado del proyecto.
   La palabra clave del usuario para pedir esto es **"matrix"**.
2. Corré `git status` y `git log --oneline -5` para ver qué cambió.
3. Confirmá el foco con el usuario antes de asumir.

Este ritual funciona SIN herramientas externas (Engram, graphify, CodeGraph). Esas son
opcionales y locales a la PC del autor; el proyecto NO depende de ellas. `HANDOFF.md` es
autosuficiente: cualquier asistente en cualquier PC retoma leyéndolo.

## Qué es este proyecto
Punto de venta para ferretería bimonetaria (Venezuela: BS/USD). Multi-tenant: la misma app
sirve a varias empresas (SaaS), aisladas por `empresa_id` con Row Level Security en Supabase.
Stack: React PWA (Vite) + Supabase (Postgres + Storage + Auth + RLS). Ver `docs/` para detalle.

## Setup rápido (otra PC)
Ver la sección "Setup desde cero en OTRA PC" dentro de `HANDOFF.md`. Requiere Git + Node 20+.
`web/.env` NO está en el repo (contiene keys); se recrea siguiendo el HANDOFF.

## Reglas de trabajo
- No commitear secrets. `web/.env` está en `.gitignore`; nunca lo agregues.
- Comentarios, identificadores y UI: en español neutro/profesional (el usuario final es hispanohablante).
- Al cerrar un avance, ACTUALIZÁ `HANDOFF.md` (estado, próximos pasos, decisiones).
- Los SQL aplicados viven en `supabase/` numerados (`schema_fase2.sql`, `patch_01...`, `patch_02...`).
  Si aplicás SQL nuevo, agregalo como archivo numerado y anotalo en el HANDOFF.
