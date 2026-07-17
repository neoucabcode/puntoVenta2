-- ============================================================================
-- puntoVenta2 — Parche 04: cerrar lints 0028/0029 de patch_03 (REGLLA OBLIGATORIA)
-- Ejecutar en Supabase: SQL Editor -> pegá esto -> Run, DESPUES de patch_03.
--
-- Aplica la regla del HANDOFF: toda funcion SECURITY DEFINER expuesta dispara
-- los lints 0028 (anon) / 0029 (authenticated). Criterio:
--   - trg_descuenta_stock_venta: es funcion de TRIGGER, nadie la llama por API
--     -> revocar de public, anon y authenticated.
--   - clonar_catalogo: es RPC de negocio (la app/scripts la invocan). Ya tiene
--     guarda interna de pertenencia (auth.uid() = empresa origen). Se revoca de
--     public y anon, se DEJA authenticated.
--   - es_de_empresa: NO se toca (ya lo hizo patch_02); revocar de authenticated
--     romperia TODAS las politicas RLS.
-- ============================================================================

-- Trigger de stock: no debe ser invocable por la API.
revoke all on function public.trg_descuenta_stock_venta() from public;
revoke all on function public.trg_descuenta_stock_venta() from anon;
revoke all on function public.trg_descuenta_stock_venta() from authenticated;

-- RPC de clonado: quitar acceso de anon (no logueado). authenticated LO NECESITA
-- (y esta blindado con guarda de pertenencia dentro de la funcion).
revoke all on function public.clonar_catalogo(uuid, uuid, text, uuid[], uuid[]) from public;
revoke all on function public.clonar_catalogo(uuid, uuid, text, uuid[], uuid[]) from anon;

-- ============================================================================
-- Tras correr esto: de 5/6 warnings bajan a 3 INTENCIONALES y seguros:
--   1. 0029 es_de_empresa (authenticated)        -> necesario para RLS.
--   2. 0029 crear_empresa_con_admin (authenticated) -> RPC de alta, blindado.
--   3. 0029 clonar_catalogo (authenticated)      -> RPC de negocio, blindado.
-- Los 3 se pueden marcar "dismiss" en el Security Advisor.
-- ============================================================================
