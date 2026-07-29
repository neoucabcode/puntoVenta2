-- ----------------------------------------------------------------------------
-- patch_15_sku_categoria_fallback.sql
-- 1. generar_sku — fallback a primeras 3 letras del nombre cuando codigo IS NULL.
-- 2. Backfill: deriva codigo desde nombre para categorias existentes sin codigo.
-- SECURITY INVOKER: hereda RLS (aislamiento por empresa_id).
-- ----------------------------------------------------------------------------

-- 1. generar_sku con fallback de nombre
CREATE OR REPLACE FUNCTION public.generar_sku(
  p_empresa_id uuid,
  p_categoria_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
DECLARE
  v_config RECORD;
  v_contador integer;
  v_codigo_cat text;
  v_nombre_cat text;
  v_sku text;
BEGIN
  SELECT * INTO v_config FROM empresa_configuracion_sku
    WHERE empresa_id = p_empresa_id;

  IF v_config IS NULL OR NOT v_config.autogenerar_activo THEN
    RETURN NULL;
  END IF;

  IF v_config.modo_contador = 'por_categoria' AND p_categoria_id IS NOT NULL THEN
    INSERT INTO empresa_sku_contador (empresa_id, categoria_id, ultimo_valor)
      VALUES (p_empresa_id, p_categoria_id, 1)
      ON CONFLICT (empresa_id, categoria_id)
      DO UPDATE SET ultimo_valor = empresa_sku_contador.ultimo_valor + 1
      RETURNING ultimo_valor INTO v_contador;

    SELECT codigo, nombre INTO v_codigo_cat, v_nombre_cat FROM categoria
      WHERE id = p_categoria_id AND empresa_id = p_empresa_id;
  ELSE
    INSERT INTO empresa_sku_contador (empresa_id, categoria_id, ultimo_valor)
      VALUES (p_empresa_id, NULL, 1)
      ON CONFLICT (empresa_id, categoria_id)
      DO UPDATE SET ultimo_valor = empresa_sku_contador.ultimo_valor + 1
      RETURNING ultimo_valor INTO v_contador;
  END IF;

  CASE v_config.plantilla
    WHEN 'categoria_secuencial' THEN
      IF v_codigo_cat IS NULL THEN
        IF v_nombre_cat IS NULL OR TRIM(v_nombre_cat) = '' THEN
          RAISE EXCEPTION 'La categoría no tiene código ni nombre. Asignele un código de 3 letras.';
        END IF;
        v_codigo_cat := UPPER(LEFT(TRIM(v_nombre_cat), 3));
      END IF;
      v_sku := UPPER(v_codigo_cat) || '-' || LPAD(v_contador::text, v_config.longitud_secuencial, '0');
    WHEN 'solo_secuencial' THEN
      v_sku := LPAD(v_contador::text, v_config.longitud_secuencial, '0');
    WHEN 'prefijo_fijo_secuencial' THEN
      IF v_config.prefijo_manual IS NULL OR v_config.prefijo_manual = '' THEN
        RAISE EXCEPTION 'Configure un prefijo manual antes de generar SKUs';
      END IF;
      v_sku := UPPER(v_config.prefijo_manual) || '-' || LPAD(v_contador::text, v_config.longitud_secuencial, '0');
  END CASE;

  RETURN v_sku;
END;
$$;

-- 2. Backfill: derivar codigo desde nombre para categorias existentes sin codigo
UPDATE categoria SET codigo = UPPER(LEFT(TRIM(nombre), 3)) WHERE codigo IS NULL;
