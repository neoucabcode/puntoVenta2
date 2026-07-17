-- ============================================================================
-- puntoVenta2 — Parche 02: cerrar warnings 0028/0029 (SECURITY DEFINER expuestas)
-- Ejecutar en Supabase: SQL Editor -> pegá esto -> Run.
--
-- ⚠️ IMPORTANTE (doc oficial PostgreSQL, CREATE POLICY):
-- "users who are using a given policy must be able to access any tables or
--  functions referenced in the expression or they will simply receive a
--  permission denied error."
-- => es_de_empresa la usan TODAS las políticas RLS. Si le revocamos EXECUTE a
--    'authenticated', la app entera da permission denied. Por eso a esa función
--    SOLO le revocamos 'anon' (nunca logueado) y le DEJAMOS 'authenticated'.
--
-- trg_alta_usuario es función de trigger: nadie la llama por API, se revoca todo.
-- crear_empresa_con_admin debe seguir siendo llamable por 'authenticated' (RPC de
--    alta, ya blindado con guarda auth.uid()). Su warning 0029 es intencional.
-- ============================================================================

-- Helper de RLS: quitar acceso de anon (no logueado). authenticated LO NECESITA.
revoke all on function public.es_de_empresa(uuid) from public;
revoke all on function public.es_de_empresa(uuid) from anon;
-- NO revocar de authenticated: rompería todas las políticas RLS.

-- Función de trigger: nadie la invoca por API, revocar de todos.
revoke all on function public.trg_alta_usuario() from public;
revoke all on function public.trg_alta_usuario() from anon;
revoke all on function public.trg_alta_usuario() from authenticated;

-- ============================================================================
-- Warnings que quedan tras correr esto (ambos INTENCIONALES y seguros):
--   1. 0029 en es_de_empresa (authenticated): necesario para que RLS funcione.
--   2. 0029 en crear_empresa_con_admin (authenticated): RPC de alta, blindado
--      con auth.uid() = p_auth_user_id y chequeo de empresa previa.
-- Ambos se pueden marcar como "dismiss/ignore" en el Security Advisor.
--
-- (Alternativa futura para dejar el Advisor 100% limpio: mover es_de_empresa a
--  un esquema privado no expuesto por la API, ej. 'private', y recrear las
--  políticas apuntando a private.es_de_empresa. Más invasivo; se deja para después.)
-- ============================================================================
