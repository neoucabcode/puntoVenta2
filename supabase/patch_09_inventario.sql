-- ============================================================================
-- patch_09_inventario.sql — Rediseño UI Caja e Inventario (Slice 1)
-- Ajuste de stock con motivo y auditoría (RN-11) + columna logo_url para presupuestos.
-- Seguridad: RPC security invoker, RLS heredada por empresa_id (es_de_empresa).
-- Idempotencia del ajuste por p_id_evento (el cliente reenvía el mismo id al reintentar).
-- ============================================================================

-- Poner tu propio usuario como admin (el dueño). Sustituye el id por el tuyo:
--   SELECT id FROM usuario WHERE email = 'tu@correo.com';
-- UPDATE usuario SET rol = 'admin' WHERE id = '<TU_USER_ID>';

-- Columna para el logo de la empresa (usada en presupuestos, Slice 5).
alter table empresa add column if not exists logo_url text;

-- Ajuste de stock: inserta movimiento_inventario y actualiza stock_actual.
-- Permite stock negativo si la empresa lo habilita (empresa.stock_negativo, RN-55).
create or replace function aplicar_ajuste_stock(
  p_id_evento text,
  p_empresa_id uuid,
  p_producto_id uuid,
  p_cantidad numeric,
  p_tipo text,
  p_motivo text,
  p_usuario_id uuid
)
returns boolean
language plpgsql
security invoker
as $$
declare
  v_neg boolean;
begin
  select stock_negativo into v_neg from empresa where id = p_empresa_id;

  insert into movimiento_inventario (empresa_id, producto_id, tipo, cantidad, usuario_id, observacion)
    values (p_empresa_id, p_producto_id, p_tipo, p_cantidad, p_usuario_id, p_motivo);

  update producto
    set stock_actual = stock_actual + p_cantidad
    where id = p_producto_id
      and empresa_id = p_empresa_id
      and (v_neg or stock_actual + p_cantidad >= 0);

  return true;
end;
$$;
