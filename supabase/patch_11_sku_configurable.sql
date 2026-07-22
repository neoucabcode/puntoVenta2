-- ============================================================================
-- patch_11_sku_configurable.sql — SKU auto-generation + fuzzy matching
-- Agrega configuración de SKU por empresa, contadores atómicos, búsqueda
-- por similitud de trigram, e índices necesarios.
-- Idempotente: TODO usa IF NOT EXISTS / IF EXISTS.
-- ============================================================================

-- Extensión para búsqueda por trigram
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ----------------------------------------------------------------------------
-- 1. Configuración de SKU por empresa
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresa_configuracion_sku (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL UNIQUE REFERENCES empresa(id) ON DELETE CASCADE,
  autogenerar_activo boolean NOT NULL DEFAULT false,
  plantilla text NOT NULL DEFAULT 'categoria_secuencial'
    CHECK (plantilla IN ('categoria_secuencial','solo_secuencial','prefijo_fijo_secuencial')),
  modo_contador text NOT NULL DEFAULT 'por_categoria'
    CHECK (modo_contador IN ('por_categoria','global')),
  longitud_secuencial integer NOT NULL DEFAULT 4
    CHECK (longitud_secuencial BETWEEN 1 AND 10),
  prefijo_manual text,
  umbral_similitud numeric(3,2) NOT NULL DEFAULT 0.85,
  creado_en timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE empresa_configuracion_sku ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'config_sku_propia'
      AND tablename = 'empresa_configuracion_sku'
  ) THEN
    CREATE POLICY config_sku_propia ON empresa_configuracion_sku
      FOR ALL USING (es_de_empresa(empresa_id))
      WITH CHECK (es_de_empresa(empresa_id));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Contadores atómicos por empresa+categoría (o empresa global)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresa_sku_contador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  categoria_id uuid,  -- NULL para contador global
  ultimo_valor integer NOT NULL DEFAULT 0,
  UNIQUE (empresa_id, categoria_id)
);

ALTER TABLE empresa_sku_contador ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'contador_propio'
      AND tablename = 'empresa_sku_contador'
  ) THEN
    CREATE POLICY contador_propio ON empresa_sku_contador
      FOR ALL USING (es_de_empresa(empresa_id))
      WITH CHECK (es_de_empresa(empresa_id));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Código corto de categoría (char 3, nullable, único por empresa)
-- ----------------------------------------------------------------------------
ALTER TABLE categoria ADD COLUMN IF NOT EXISTS codigo char(3);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categoria_codigo_empresa
  ON categoria (empresa_id, codigo) WHERE codigo IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 4. SKU único por empresa (partial index, solo SKUs no nulos)
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_producto_sku_empresa
  ON producto (empresa_id, sku) WHERE sku IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 5. Trigram index para fuzzy search en nombre de producto
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_producto_nombre_trgm
  ON producto USING gin (nombre gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 6. Trigger: crear config_sku por defecto al insertar empresa
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_crear_config_sku_default()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO empresa_configuracion_sku (empresa_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_config_sku_default ON empresa;
CREATE TRIGGER trg_config_sku_default
  AFTER INSERT ON empresa
  FOR EACH ROW EXECUTE FUNCTION trg_crear_config_sku_default();

-- ============================================================================
-- RPCs
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 7. generar_sku — Incremento atómico de contador + construcción de SKU
--    Retorna NULL si auto-gen está desactivado.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generar_sku(
  p_empresa_id uuid,
  p_categoria_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
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

  -- Incremento atómico del contador
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

  -- Construir SKU según plantilla
  CASE v_config.plantilla
    WHEN 'categoria_secuencial' THEN
      IF v_codigo_cat IS NULL THEN
        RAISE EXCEPTION 'La categoría no tiene código. Asignele un código de 3 letras.';
      END IF;
      v_sku := v_codigo_cat || '-' || LPAD(v_contador::text, v_config.longitud_secuencial, '0');
    WHEN 'solo_secuencial' THEN
      v_sku := LPAD(v_contador::text, v_config.longitud_secuencial, '0');
    WHEN 'prefijo_fijo_secuencial' THEN
      IF v_config.prefijo_manual IS NULL OR v_config.prefijo_manual = '' THEN
        RAISE EXCEPTION 'Configure un prefijo manual antes de generar SKUs';
      END IF;
      v_sku := v_config.prefijo_manual || '-' || LPAD(v_contador::text, v_config.longitud_secuencial, '0');
  END CASE;

  RETURN v_sku;
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. buscar_productos_similares — Búsqueda fuzzy por trigram
--    Retorna productos con similitud superior al umbral, limitado a 10.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION buscar_productos_similares(
  p_empresa_id uuid,
  p_texto text,
  p_umbral numeric DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  nombre text,
  sku text,
  similitud numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT p.id, p.nombre, p.sku,
         similarity(p.nombre, p_texto) AS similitud
  FROM producto p
  WHERE p.empresa_id = p_empresa_id
    AND p.activo = true
    AND similarity(p.nombre, p_texto) > p_umbral
  ORDER BY similitud DESC
  LIMIT 10;
$$;
