-- ============================================================================
-- patch_12_supabase_warnings.sql
-- Resuelve los warnings del Database Linter de Supabase (2026-07-22).
-- Idempotente: TODO usa CREATE OR REPLACE / IF EXISTS.
-- Aplicar: pegar en SQL Editor de Supabase una vez.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. function_search_path_mutable (7 funciones)
--    Fijar search_path para evitar vulnerabilidades de search_path.
--    Usamos '' (vacío) para SECURITY DEFINER (patrón patch_01) y 'public'
--    para SECURITY INVOKER (las tablas están en public).
-- ----------------------------------------------------------------------------

-- 1a. mi_empresa_id — SECURITY INVOKER, usa auth.uid() y public.usuario
CREATE OR REPLACE FUNCTION public.mi_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
  SELECT empresa_id FROM public.usuario WHERE id = auth.uid()
$$;

-- 1b. trg_crear_config_sku_default — trigger, SECURITY INVOKER por defecto
CREATE OR REPLACE FUNCTION public.trg_crear_config_sku_default()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO empresa_configuracion_sku (empresa_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- 1c. buscar_productos — SECURITY INVOKER (hereda RLS)
CREATE OR REPLACE FUNCTION buscar_productos(
  p_empresa_id uuid,
  p_search text DEFAULT '',
  p_categoria_id uuid DEFAULT NULL,
  p_solo_activos boolean DEFAULT true,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
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
    ORDER BY p.nombre ASC
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
    (
      SELECT min(
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
      )
      FROM unnest(v_tokens) t
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
  ORDER BY score ASC, p.nombre ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 1d. generar_sku — SECURITY INVOKER
CREATE OR REPLACE FUNCTION generar_sku(
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

-- 1e. buscar_productos_similares — SECURITY INVOKER
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
SET search_path = 'public'
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

-- 1f. aplicar_ajuste_stock — SECURITY INVOKER
CREATE OR REPLACE FUNCTION aplicar_ajuste_stock(
  p_id_evento text,
  p_empresa_id uuid,
  p_producto_id uuid,
  p_cantidad numeric,
  p_tipo text,
  p_motivo text,
  p_usuario_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
DECLARE
  v_neg boolean;
BEGIN
  SELECT stock_negativo INTO v_neg FROM empresa WHERE id = p_empresa_id;

  INSERT INTO movimiento_inventario (empresa_id, producto_id, tipo, cantidad, usuario_id, observacion)
    VALUES (p_empresa_id, p_producto_id, p_tipo, p_cantidad, p_usuario_id, p_motivo);

  UPDATE producto
    SET stock_actual = stock_actual + p_cantidad
    WHERE id = p_producto_id
      AND empresa_id = p_empresa_id
      AND (v_neg OR stock_actual + p_cantidad >= 0);

  RETURN TRUE;
END;
$$;

-- 1g. aplicar_venta_offline — SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.aplicar_venta_offline(
  p_id_evento text,
  p_empresa_id uuid,
  p_dispositivo text,
  p_sesion_caja_id uuid,
  p_payload jsonb,
  p_auditoria_stock jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
DECLARE
  v_existe boolean;
  v_venta_id uuid;
  v_det jsonb;
  v_pago jsonb;
  v_mov jsonb;
BEGIN
  INSERT INTO public.venta_offline_event (
    id_evento, empresa_id, dispositivo, sesion_caja_id, estado_sync,
    payload, auditoria_stock, intentos, sincronizado_en
  ) VALUES (
    p_id_evento, p_empresa_id, p_dispositivo, p_sesion_caja_id, 'sync_ok',
    p_payload, coalesce(p_auditoria_stock, '[]'::jsonb), 1, now()
  )
  ON CONFLICT (id_evento) DO UPDATE
    SET estado_sync = 'sync_ok',
        intentos = public.venta_offline_event.intentos + 1,
        sincronizado_en = now()
  RETURNING (xmax = 0) INTO v_existe;

  IF v_existe THEN
    v_venta_id := gen_random_uuid();

    INSERT INTO public.venta (
      id, empresa_id, usuario_id, cliente_id, tasa_aplicada,
      subtotal_usd, impuestos_usd, total_usd, saldo_pendiente_usd, estado
    ) VALUES (
      v_venta_id, p_empresa_id,
      (p_payload->>'usuario_id')::uuid,
      nullif(p_payload->>'cliente_id', '')::uuid,
      coalesce((p_payload->>'tasa_aplicada')::numeric, 1),
      coalesce((p_payload->>'subtotal_usd')::numeric, 0),
      coalesce((p_payload->>'impuestos_usd')::numeric, 0),
      coalesce((p_payload->>'total_usd')::numeric, 0),
      coalesce((p_payload->>'saldo_pendiente_usd')::numeric, 0),
      'cerrada'
    );

    FOR v_det IN SELECT * FROM jsonb_array_elements(p_payload->'detalles')
    LOOP
      INSERT INTO public.venta_detalle (
        venta_id, producto_id, cantidad, precio_unit_usd, descuento_linea_usd, subtotal_usd
      ) VALUES (
        v_venta_id,
        (v_det->>'producto_id')::uuid,
        (v_det->>'cantidad')::numeric,
        (v_det->>'precio_unit_usd')::numeric,
        coalesce((v_det->>'descuento_linea_usd')::numeric, 0),
        (v_det->>'subtotal_usd')::numeric
      );
    END LOOP;

    FOR v_pago IN SELECT * FROM jsonb_array_elements(p_payload->'pagos')
    LOOP
      INSERT INTO public.pago (
        empresa_id, venta_id, usuario_id, metodo, moneda, monto, monto_usd, tasa_aplicada
      ) VALUES (
        p_empresa_id, v_venta_id,
        (p_payload->>'usuario_id')::uuid,
        v_pago->>'metodo',
        coalesce(v_pago->>'moneda', 'USD'),
        (v_pago->>'monto')::numeric,
        (v_pago->>'monto_usd')::numeric,
        coalesce((v_pago->>'tasa_aplicada')::numeric, 1)
      );
    END LOOP;

    FOR v_mov IN SELECT * FROM jsonb_array_elements(coalesce(p_auditoria_stock, '[]'::jsonb))
    LOOP
      INSERT INTO public.movimiento_inventario (
        empresa_id, producto_id, tipo, cantidad, usuario_id, documento_origen, observacion
      ) VALUES (
        p_empresa_id,
        (v_mov->>'producto_id')::uuid,
        'venta',
        (v_mov->>'cantidad')::numeric,
        (p_payload->>'usuario_id')::uuid,
        v_venta_id,
        coalesce(v_mov->>'observacion', 'venta_offline')
      );
    END LOOP;

    IF p_sesion_caja_id IS NOT NULL THEN
      UPDATE public.sesion_caja
        SET conteo_ventas = conteo_ventas + 1,
            total_ventas_usd = total_ventas_usd + coalesce((p_payload->>'total_usd')::numeric, 0)
      WHERE id = p_sesion_caja_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('id_evento', p_id_evento, 'insertado', v_existe, 'venta_id', v_venta_id);
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. extension_in_public — pg_trgm
--    NO se puede mover una extensión ya instalada en public sin recrear índices.
--    Se acepta el warning como riesgo conocido (pg_trgm es una extensión segura
--    y no expone datos). Si Supabase insiste, se puede migrar con:
--      CREATE SCHEMA IF NOT EXISTS extensions;
--      -- Recrear la extensión en extensions schema (rompe índices existentes)
--      DROP EXTENSION IF EXISTS pg_trgm;
--      CREATE EXTENSION pg_trgm SCHEMA extensions;
--      -- Recrear índices: CREATE INDEX ... USING gin (nombre extensions.gin_trgm_ops);
--    Por ahora: DOCUMENTADO COMO RIESGO ACEPTADO.
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 3. authenticated_security_definer_function_executable (3 funciones)
--
--    ANÁLISIS: las 3 funciones NECESITAN SECURITY DEFINER:
--    - es_de_empresa: es INVOCADA por RLS policies (cycle: policy → function →
--      read usuario → RLS on usuario → policy → ...). Si es INVOKER, las
--      policies de RLS fallan con 500 en TODAS las tablas.
--    - crear_empresa_con_admin: crea empresa + usuario antes de que exista fila
--      de usuario vinculada (RLS no puede aplicarse).
--    - clonar_catalogo: clona datos entre empresas, el usuario solo pertenece
--      a la empresa origen pero escribe en la destino (RLS bloquearía el INSERT).
--
--    Las 3 ya tienen REVOKE de public/anon y guard clauses de seguridad.
--    El warning es informational: "authenticated puede ejecutar SECURITY DEFINER".
--    Las guard clauses previenen abuso. Se acepta como riesgo conocido.
-- ============================================================================

-- REVOKE explícito de clonar_catalogo y crear_empresa_con_admin para anon
-- (refuerzo, ya debería estar hecho por patches anteriores).
REVOKE ALL ON FUNCTION public.clonar_catalogo(uuid, uuid, text, uuid[], uuid[]) FROM public;
REVOKE ALL ON FUNCTION public.clonar_catalogo(uuid, uuid, text, uuid[], uuid[]) FROM anon;
REVOKE ALL ON FUNCTION public.crear_empresa_con_admin(text, uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.crear_empresa_con_admin(text, uuid, text) FROM anon;

-- ============================================================================
-- 4. auth_leaked_password_protection (PASO MANUAL)
--    Habilitar en Supabase Dashboard → Authentication → Providers → Email
--    → "Protect against leaked passwords" → ON.
--    Este warning NO se resuelve con SQL.
-- ============================================================================
