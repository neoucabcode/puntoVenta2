-- ============================================================================
-- puntoVenta2 — Parche 03: clonado de catalogo + descuento de stock condicional
-- Ejecutar en Supabase: SQL Editor -> pegá esto -> Run.
--
-- Contexto de negocio (decisión de diseno, MVP):
--  - La mayoria de las ferreterias (incl. la empresa maestra) NO lleva inventario.
--    Por eso el descuento de stock es CONDICIONAL a empresa.venta_sin_stock.
--    Si venta_sin_stock = true  -> modo "ignorar": el trigger NO descuenta ni
--                                   registra movimiento. La venta funciona igual.
--    Si venta_sin_stock = false -> modo "advertir/bloquear": descuenta stock y
--                                   escribe movimiento_inventario tipo 'venta'.
--                                   (El "advertir" es logica de UI: lee stock_actual
--                                    y avisa; el "bloquear" lo controla la app con
--                                    RN-54/venta_sin_stock antes de guardar.)
--  - El alta de sucursal es SELECTIVA: el usuario elige importar todo el catalogo,
--    por categorias, o un lote de productos; y el precio de llegada (sugerido|cero).
--  - El clon reusa las imagenes del bucket compartido 'productos/' (copia imagen_url,
--    no re-sube). Eliminar producto en la app debe usar borrado logico (activo=false),
--    no DELETE fisico (venta_detalle tiene FK restrict).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. clonar_catalogo: clona categorias + productos de una empresa a otra.
--    SECURITY DEFINER para poder correr con service_role (admin global) o con
--    un usuario dueño de la empresa origen. Remapea categorias para no romper FK.
-- ----------------------------------------------------------------------------
create or replace function public.clonar_catalogo(
  p_empresa_origen uuid,
  p_empresa_destino uuid,
  p_modo_precio text default 'sugerido',  -- 'sugerido' | 'cero'
  p_categorias uuid[] default null,       -- null = todas las de la empresa origen
  p_productos uuid[] default null         -- null = todos los productos filtrados
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cat record;
  v_mapa jsonb := '{}';          -- old_cat_id -> new_cat_id
  v_prod record;
  v_cat_id_nuevo uuid;
  v_cont_cat integer := 0;
  v_cont_prod integer := 0;
begin
  -- Guarda de seguridad (lint 0029): solo quien pertenece a la empresa origen
  -- (o un admin global) puede clonar su catalogo. Evita que un usuario logueado
  -- clone el catalogo de otra empresa via /rest/v1/rpc/clonar_catalogo.
  if not exists (
    select 1 from public.usuario u
    where u.id = auth.uid() and u.empresa_id = p_empresa_origen
  ) then
    raise exception 'no autorizado para clonar esta empresa' using errcode = '42501';
  end if;

  -- Guarda: la empresa destino no debe tener ya productos (idempotencia).
  if exists (select 1 from public.producto where empresa_id = p_empresa_destino) then
    raise exception 'la empresa destino ya tiene productos' using errcode = '23505';
  end if;

  -- 1a) Clonar categorias filtradas (remapeo de ids).
  for v_cat in
    select * from public.categoria
    where empresa_id = p_empresa_origen
      and (p_categorias is null or id = any(p_categorias))
  loop
    insert into public.categoria (empresa_id, nombre)
    values (p_empresa_destino, v_cat.nombre)
    returning id into v_cat_id_nuevo;

    v_mapa := jsonb_set(v_mapa, array[v_cat.id::text], to_jsonb(v_cat_id_nuevo));
    v_cont_cat := v_cont_cat + 1;
  end loop;

  -- 1b) Clonar productos de esas categorias (o los indicados explicitamente).
  for v_prod in
    select * from public.producto
    where empresa_id = p_empresa_origen
      and (p_categorias is null or categoria_id = any(p_categorias))
      and (p_productos is null or id = any(p_productos))
  loop
    insert into public.producto (
      empresa_id, codigo_barras, sku, nombre,
      categoria_id, unidad, costo_usd,
      precio_usd, imagen_url, stock_actual, stock_minimo,
      activo
    )
    values (
      p_empresa_destino,
      v_prod.codigo_barras,
      v_prod.sku,
      v_prod.nombre,
      case when v_prod.categoria_id is not null
           then (v_mapa->>(v_prod.categoria_id::text))::uuid
           else null end,
      v_prod.unidad,
      v_prod.costo_usd,
      case when p_modo_precio = 'cero' then 0 else v_prod.precio_usd end,
      v_prod.imagen_url,   -- reuso del bucket compartido, no se re-sube
      0,                   -- stock inicia en 0 en la sucursal
      v_prod.stock_minimo,
      true
    );
    v_cont_prod := v_cont_prod + 1;
  end loop;

  return json_build_object(
    'categorias_clonadas', v_cont_cat,
    'productos_clonados', v_cont_prod
  );
end;
$$;

-- Permisos: solo usuarios autenticados (el alta la opera el admin global con
-- service_role, o un dueño logueado). No se expone a anon.
revoke all on function public.clonar_catalogo(uuid, uuid, text, uuid[], uuid[]) from public;
revoke all on function public.clonar_catalogo(uuid, uuid, text, uuid[], uuid[]) from anon;
grant execute on function public.clonar_catalogo(uuid, uuid, text, uuid[], uuid[]) to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Trigger de descuento de stock CONDICIONAL (solo si la empresa lleva stock).
--    Se dispara al insertar venta_detalle. Si empresa.venta_sin_stock = true,
--    NO hace nada (modo "ignorar" -> la mayoria de las ferreterias).
--    Si = false, descuenta stock_actual y registra movimiento_inventario 'venta'.
--   Respeta stock_negativo: si la empresa no lo permite y quedaria < 0, el UPDATE
--    igual ocurre (el bloqueo estricto lo hace la app antes de guardar la venta).
-- ----------------------------------------------------------------------------
create or replace function public.trg_descuenta_stock_venta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa_id uuid;
  v_venta_sin_stock boolean;
  v_producto record;
begin
  -- Empresa de la venta.
  select v.empresa_id into v_empresa_id from public.venta v where v.id = new.venta_id;
  select e.venta_sin_stock into v_venta_sin_stock
  from public.empresa e where e.id = v_empresa_id;

  -- Modo "ignorar": no tocar inventario.
  if v_venta_sin_stock then
    return new;
  end if;

  -- Descontar stock y registrar movimiento.
  update public.producto
  set stock_actual = stock_actual - new.cantidad
  where id = new.producto_id;

  insert into public.movimiento_inventario (
    empresa_id, producto_id, tipo, cantidad, usuario_id, documento_origen, observacion
  )
  values (
    v_empresa_id, new.producto_id, 'venta', new.cantidad,
    (select usuario_id from public.venta where id = new.venta_id),
    new.venta_id,
    'Venta'
  );

  return new;
end;
$$;

drop trigger if exists trg_descuenta_stock_venta on public.venta_detalle;
create trigger trg_descuenta_stock_venta
  after insert on public.venta_detalle
  for each row execute function public.trg_descuenta_stock_venta();

-- ----------------------------------------------------------------------------
-- Notas de uso (frontend / script de alta de sucursal):
--  - Alta completa: crear_empresa_con_admin(...) -> clonar_catalogo(
--      empresa_maestra, nueva_empresa, 'sugerido'|'cero', cats[], prods[]).
--  - Si la sucursal NO lleva inventario: dejar empresa.venta_sin_stock = true
--    (default). El trigger no descuenta. El "advertir" se hace en UI leyendo
--    stock_actual.
--  - Eliminar producto en la app: usar UPDATE activo=false (soft delete), no DELETE.
-- ============================================================================
