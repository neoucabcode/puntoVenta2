-- ============================================================================
-- patch_07_buscar_productos_rpc.sql
-- Objetivo: búsqueda progresiva por palabra con RANKING EN EL SERVIDOR.
--   Antes el ranking se hacia en el cliente (traia todas las coincidencias),
--   lo cual se rompe con miles de productos. Este RPC rankea y pagina en
--   Postgres: el cliente solo recibe la pagina (LIMIT/OFFSET).
--
-- Regla de relevancia (score menor = mas relevante):
--   0 = nombre empieza con el termino
--   1 = una palabra del nombre empieza con el termino
--   2 = sku o codigo_barras empieza con el termino
--   3 = el termino aparece en cualquier parte del nombre
--   4 = el termino aparece en sku/codigo
--   Sin coincidencia de ningun tipo = 9 (no debe devolverse, pero por seguridad)
--
-- Seguridad: funcion NORMAL (no SECURITY DEFINER). Corre con el rol del
--   usuario autenticado => hereda RLS de 'producto' (es_de_empresa).
--   NO expone nada ni rompe el aislamiento multi-tenant.
--   Por eso NO se toca el checklist de lints 0028/0029 del HANDOFF.
--
-- Aplicar: pegar en SQL Editor de Supabase una vez (idempotente: drop + create).
-- ============================================================================

create or replace function buscar_productos(
  p_empresa_id uuid,
  p_search text default '',
  p_categoria_id uuid default null,
  p_solo_activos boolean default true,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  codigo_barras text,
  sku text,
  nombre text,
  categoria_id uuid,
  unidad text,
  costo_usd numeric(14,4),
  precio_usd numeric(14,4),
  imagen_url text,
  stock_actual numeric(14,4),
  stock_minimo numeric(14,4),
  activo boolean,
  categoria jsonb,
  score int
)
language plpgsql
stable
security invoker
as $$
declare
  v_search text := trim(coalesce(p_search, ''));
  v_tokens text[];
  v_like_any text[];
  i int;
begin
  -- Sin filtro de texto: lista alfabetica simple (el caso "sin busqueda").
  if v_search = '' then
    return query
    select
      p.id, p.codigo_barras, p.sku, p.nombre, p.categoria_id, p.unidad,
      p.costo_usd, p.precio_usd, p.imagen_url, p.stock_actual, p.stock_minimo,
      p.activo,
      (case when c.id is not null
        then jsonb_build_object('id', c.id, 'nombre', c.nombre)
        else null end)::jsonb,
      0::int as score
    from producto p
    left join categoria c on c.id = p.categoria_id
    where p.empresa_id = p_empresa_id
      and (not p_solo_activos or p.activo)
      and (p_categoria_id is null or p.categoria_id = p_categoria_id)
    order by p.nombre asc
    limit p_limit offset p_offset;
    return;
  end if;

  -- Tokenizamos la consulta para ampliar el match (varias palabras).
  v_tokens := string_to_array(lower(v_search), ' ');
  -- Condiciones ILIKE amplias (prefijo + substring en nombre/sku/codigo).
  v_like_any := array[]::text[];
  for i in 1..array_length(v_tokens, 1) loop
    v_like_any := v_like_any || array[
      'nombre.ilike.' || v_tokens[i] || '%',
      'sku.ilike.' || v_tokens[i] || '%',
      'codigo_barras.ilike.' || v_tokens[i] || '%',
      'nombre.ilike.%' || v_tokens[i] || '%',
      'sku.ilike.%' || v_tokens[i] || '%',
      'codigo_barras.ilike.%' || v_tokens[i] || '%'
    ];
  end loop;

  return query
  select
    p.id, p.codigo_barras, p.sku, p.nombre, p.categoria_id, p.unidad,
    p.costo_usd, p.precio_usd, p.imagen_url, p.stock_actual, p.stock_minimo,
    p.activo,
    (case when c.id is not null
      then jsonb_build_object('id', c.id, 'nombre', c.nombre)
      else null end)::jsonb,
    -- Score de relevancia: el mejor token gana.
    (
      select min(
        case
          when lower(p.nombre) like (t || '%') then 0
          when exists (
            select 1 from unnest(string_to_array(lower(p.nombre), ' ')) w
            where w like (t || '%')
          ) then 1
          when lower(coalesce(p.sku, '')) like (t || '%')
               or lower(coalesce(p.codigo_barras, '')) like (t || '%') then 2
          when lower(p.nombre) like ('%' || t || '%') then 3
          when lower(coalesce(p.sku, '')) like ('%' || t || '%')
               or lower(coalesce(p.codigo_barras, '')) like ('%' || t || '%') then 4
          else 9
        end
      )
      from unnest(v_tokens) t
    )::int as score
  from producto p
  left join categoria c on c.id = p.categoria_id
  where p.empresa_id = p_empresa_id
    and (not p_solo_activos or p.activo)
    and (p_categoria_id is null or p.categoria_id = p_categoria_id)
    and (
      -- Al menos un token matchea en algun campo (prefijo o substring).
      exists (
        select 1 from unnest(v_tokens) t
        where lower(p.nombre) like ('%' || t || '%')
           or lower(coalesce(p.sku, '')) like ('%' || t || '%')
           or lower(coalesce(p.codigo_barras, '')) like ('%' || t || '%')
      )
    )
  order by score asc, p.nombre asc
  limit p_limit offset p_offset;
end;
$$;
