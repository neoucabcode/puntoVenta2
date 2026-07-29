-- ----------------------------------------------------------------------------
-- patch_14_verificar_sku_disponible.sql
-- 1. RPC verificar_sku_disponible — compara case-insensitive (LOWER).
-- 2..generar_sku — normaliza resultado a mayúsculas (UPPER).
-- SECURITY INVOKER: hereda RLS (aislamiento por empresa_id).
-- ----------------------------------------------------------------------------

-- 1. verificar_sku_disponible
CREATE OR REPLACE FUNCTION public.verificar_sku_disponible(
  p_empresa_id uuid,
  p_sku text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM producto
    WHERE empresa_id = p_empresa_id
      AND LOWER(sku) = LOWER(p_sku)
      AND activo = true
  );
$$;

-- 2. generar_sku — normaliza a mayúsculas para consistencia
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

    SELECT codigo INTO v_codigo_cat FROM categoria
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
        RAISE EXCEPTION 'La categoría no tiene código. Asignele un código de 3 letras.';
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
