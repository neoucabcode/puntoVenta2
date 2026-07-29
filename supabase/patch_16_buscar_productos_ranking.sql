-- ----------------------------------------------------------------------------
-- patch_16_buscar_productos_ranking.sql
-- buscar_productos — mejora de ranking: scoring compuesto en vez de MIN().
-- Usa LATERAL para evitar el error "materialize mode required" de PostgreSQL.
-- SECURITY INVOKER: hereda RLS (aislamiento por empresa_id).
-- NOTA: requiere DROP previo porque la función original tiene OUT parameters.
-- ----------------------------------------------------------------------------

-- 1. Drop the old function (has different return type with OUT parameters)
DROP FUNCTION IF EXISTS buscar_productos(uuid, text, uuid, boolean, integer, integer, text);

-- 2. Create the improved version
CREATE OR REPLACE FUNCTION buscar_productos(
  p_empresa_id uuid,
  p_search text DEFAULT '',
  p_categoria_id uuid DEFAULT NULL,
  p_solo_activos boolean DEFAULT true,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_order_by text DEFAULT 'nombre ASC'
)
RETURNS SETOF record
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
DECLARE
  v_search text := trim(coalesce(p_search, ''));
  v_tokens text[];
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
    ORDER BY p.nombre ASC
    LIMIT p_limit OFFSET p_offset;
    RETURN;
  END IF;

  v_tokens := string_to_array(lower(v_search), ' ');

  RETURN QUERY
  SELECT
    p.id, p.codigo_barras, p.sku, p.nombre, p.categoria_id, p.unidad,
    p.costo_usd, p.precio_usd, p.imagen_url, p.stock_actual, p.stock_minimo,
    p.activo,
    (CASE WHEN c.id IS NOT NULL
      THEN jsonb_build_object('id', c.id, 'nombre', c.nombre)
      ELSE NULL END)::jsonb,
    -- Score compuesto: word-start matches (DESC) + sum scores (ASC)
    (sc.word_matches - sc.score_sum)::int AS score
  FROM producto p
  LEFT JOIN categoria c ON c.id = p.categoria_id
  -- LATERAL: computa score por producto, evita materialize mode error
  LEFT JOIN LATERAL (
    SELECT
      (SELECT count(*) FROM unnest(v_tokens) t
        WHERE lower(p.nombre) LIKE (t || '%')
           OR EXISTS (
             SELECT 1 FROM unnest(string_to_array(lower(p.nombre), ' ')) w
             WHERE w LIKE (t || '%')
           )
      ) AS word_matches,
      (SELECT coalesce(sum(
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
      ), 0) FROM unnest(v_tokens) t) AS score_sum
  ) sc ON true
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
  ORDER BY score ASC, p.nombre ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
