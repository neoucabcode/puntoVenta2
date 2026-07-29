-- ----------------------------------------------------------------------------
-- patch_16_buscar_productos_ranking.sql
-- buscar_productos — mejora de ranking: SUM() + word-start bonus en vez de MIN().
-- Mantiene la misma firma que patch_08 (RETURNS TABLE, 7 params).
-- SECURITY INVOKER: hereda RLS (aislamiento por empresa_id).
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS buscar_productos(uuid, text, uuid, boolean, integer, integer, text);

CREATE OR REPLACE FUNCTION buscar_productos(
  p_empresa_id uuid,
  p_search text DEFAULT '',
  p_categoria_id uuid DEFAULT NULL,
  p_solo_activos boolean DEFAULT true,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_order_by text DEFAULT 'nombre ASC'
)
RETURNS TABLE (
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
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
DECLARE
  v_search text := trim(coalesce(p_search, ''));
  v_tokens text[];
  v_like_any text[];
  i int;
BEGIN
  IF v_search = '' THEN
    RETURN QUERY
    SELECT
      p.id, p.codigo_barras, p.sku, p.nombre, p.categoria_id, p.unidad,
      p.costo_usd, p.precio_usd, p.imagen_url, p.stock_actual, p.stock_minimo,
      p.activo,
      (CASE WHEN c.id IS NOT NULL
        THEN jsonb_build_object('id', c.id, 'nombre', c.nombre)
        ELSE NULL END)::jsonb,
      0::int AS score
    FROM producto p
    LEFT JOIN categoria c ON c.id = p.categoria_id
    WHERE p.empresa_id = p_empresa_id
      AND (NOT p_solo_activos OR p.activo)
      AND (p_categoria_id IS NULL OR p.categoria_id = p_categoria_id)
    ORDER BY
      CASE p_order_by
        WHEN 'nombre DESC' THEN p.nombre END DESC,
      CASE p_order_by
        WHEN 'nombre ASC' THEN p.nombre END ASC,
      CASE p_order_by
        WHEN 'precio DESC' THEN p.precio_usd END DESC,
      CASE p_order_by
        WHEN 'precio ASC' THEN p.precio_usd END ASC,
      p.nombre ASC
    LIMIT p_limit OFFSET p_offset;
    RETURN;
  END IF;

  v_tokens := string_to_array(lower(v_search), ' ');
  v_like_any := ARRAY[]::text[];
  FOR i IN 1..array_length(v_tokens, 1) LOOP
    v_like_any := v_like_any || ARRAY[
      'nombre.ilike.' || v_tokens[i] || '%',
      'sku.ilike.' || v_tokens[i] || '%',
      'codigo_barras.ilike.' || v_tokens[i] || '%',
      'nombre.ilike.%' || v_tokens[i] || '%',
      'sku.ilike.%' || v_tokens[i] || '%',
      'codigo_barras.ilike.%' || v_tokens[i] || '%'
    ];
  END LOOP;

  RETURN QUERY
  SELECT
    p.id, p.codigo_barras, p.sku, p.nombre, p.categoria_id, p.unidad,
    p.costo_usd, p.precio_usd, p.imagen_url, p.stock_actual, p.stock_minimo,
    p.activo,
    (CASE WHEN c.id IS NOT NULL
      THEN jsonb_build_object('id', c.id, 'nombre', c.nombre)
      ELSE NULL END)::jsonb,
    -- Score compuesto: penaliza menos cuantos más tokens matchean al inicio de palabras.
    -- Calcula: (word_start_count * 10) - sum_of_best_scores
    -- Más alto = mejor ranking.
    (
      (SELECT count(*) FROM unnest(v_tokens) t
        WHERE lower(p.nombre) LIKE (t || '%')
           OR EXISTS (
             SELECT 1 FROM unnest(string_to_array(lower(p.nombre), ' ')) w
             WHERE w LIKE (t || '%')
           )
      ) * 10
      -
      (SELECT sum(
        CASE
          WHEN lower(p.nombre) LIKE (t || '%') THEN 0
          WHEN EXISTS (
            SELECT 1 FROM unnest(string_to_array(lower(p.nombre), ' ')) w
            WHERE w LIKE (t || '%')
          ) THEN 1
          WHEN lower(coalesce(p.sku, '')) LIKE (t || '%')
               OR lower(coalesce(p.codigo_barras, '')) LIKE (t || '%') THEN 2
          WHEN lower(p.nombre) LIKE ('%' || t || '%') THEN 3
          WHEN lower(coalesce(p.sku, '')) LIKE ('%' || t || '%')
               OR lower(coalesce(p.codigo_barras, '')) LIKE ('%' || t || '%') THEN 4
          ELSE 9
        END
      ) FROM unnest(v_tokens) t)
    )::int AS score
  FROM producto p
  LEFT JOIN categoria c ON c.id = p.categoria_id
  WHERE p.empresa_id = p_empresa_id
    AND (NOT p_solo_activos OR p.activo)
    AND (p_categoria_id IS NULL OR p.categoria_id = p_categoria_id)
    AND (
      EXISTS (
        SELECT 1 FROM unnest(v_tokens) t
        WHERE lower(p.nombre) LIKE ('%' || t || '%')
           OR lower(coalesce(p.sku, '')) LIKE ('%' || t || '%')
           OR lower(coalesce(p.codigo_barras, '')) LIKE ('%' || t || '%')
      )
    )
  ORDER BY score DESC,
    CASE p_order_by
      WHEN 'nombre DESC' THEN p.nombre END DESC,
    CASE p_order_by
      WHEN 'nombre ASC' THEN p.nombre END ASC,
    CASE p_order_by
      WHEN 'precio DESC' THEN p.precio_usd END DESC,
    CASE p_order_by
      WHEN 'precio ASC' THEN p.precio_usd END ASC,
    p.nombre ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
