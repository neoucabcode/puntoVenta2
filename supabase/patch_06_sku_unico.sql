-- ============================================================================
-- patch_06_sku_unico.sql
-- Objetivo: garantizar SKU unico por empresa (evita duplicados reales en
--           catalogo). El HANDOFF lo pide como validacion obligatoria.
-- Nota: sku puede ser NULL (productos sin codigo). Un indice unico parcial
--       con WHERE sku IS NOT NULL permite multiples NULLs (varios productos
--       sin sku) pero bloquea dos skus iguales no-nulos en la misma empresa.
-- Aplicar: pegar en SQL Editor de Supabase una vez (idempotente).
-- ============================================================================

-- Indice unico parcial: sku no-nulo unico dentro de cada empresa.
drop index if exists idx_producto_empresa_sku_unico;
create unique index idx_producto_empresa_sku_unico
  on producto (empresa_id, sku)
  where sku is not null;

-- Indice unico parcial: codigo_barras no-nulo unico dentro de cada empresa.
drop index if exists idx_producto_empresa_cb_unico;
create unique index idx_producto_empresa_cb_unico
  on producto (empresa_id, codigo_barras)
  where codigo_barras is not null;
