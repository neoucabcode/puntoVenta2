-- ============================================================================
-- puntoVenta2 — Production Migration (consolidated)
-- Single script: schema + functions + RLS + triggers + storage
-- Generated: 2026-07-26
-- Sources: schema_fase2, patch_01..12, openspec/patch_08_sesion_caja
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- pg_trgm: búsqueda fuzzy por trigram (similitud de nombres).
-- NOTA: instalado en schema 'public' por defecto de Supabase.
-- Migrar a schema 'extensions' si Supabase lo requiere en el futuro.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- TABLES (in dependency order)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EMPRESA — cada ferretería es un tenant
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  riff_juridico text,
  moneda_resguardo text NOT NULL DEFAULT 'USD',
  tasa_activa numeric(14,4) NOT NULL DEFAULT 1,
  igtf_habilitado boolean NOT NULL DEFAULT false,
  caja_obligatoria boolean NOT NULL DEFAULT false,
  venta_sin_stock boolean NOT NULL DEFAULT true,
  stock_negativo boolean NOT NULL DEFAULT false,
  logo_url text,
  creado_en timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. USUARIO — auth de Supabase + rol dentro de la empresa
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  rol text NOT NULL DEFAULT 'cajero'
    CHECK (rol IN ('cajero','inventario','admin','auditor')),
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_usuario_empresa ON usuario(empresa_id);

-- ----------------------------------------------------------------------------
-- 3. CATEGORÍA DE PRODUCTO
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  codigo char(3),
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_categoria_empresa ON categoria(empresa_id);

-- ----------------------------------------------------------------------------
-- 4. PRODUCTO (RN-08..RN-12)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS producto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  codigo_barras text,
  sku text,
  nombre text NOT NULL,
  categoria_id uuid REFERENCES categoria(id) ON DELETE SET NULL,
  unidad text NOT NULL DEFAULT 'unidad',
  costo_usd numeric(14,4) NOT NULL DEFAULT 0,
  precio_usd numeric(14,4) NOT NULL DEFAULT 0,
  imagen_url text,
  stock_actual numeric(14,4) NOT NULL DEFAULT 0,
  stock_minimo numeric(14,4) NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_producto_empresa ON producto(empresa_id);
CREATE INDEX IF NOT EXISTS idx_producto_codigo ON producto(empresa_id, codigo_barras);
CREATE INDEX IF NOT EXISTS idx_producto_nombre ON producto(empresa_id, nombre);

-- SKU y código de barras únicos por empresa (parcial, solo no-nulos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_producto_empresa_sku_unico
  ON producto (empresa_id, sku) WHERE sku IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_producto_empresa_cb_unico
  ON producto (empresa_id, codigo_barras) WHERE codigo_barras IS NOT NULL;

-- Trigram index para fuzzy search
CREATE INDEX IF NOT EXISTS idx_producto_nombre_trgm
  ON producto USING gin (nombre gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 5. MOVIMIENTO DE INVENTARIO (RN-11)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movimiento_inventario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
  tipo text NOT NULL
    CHECK (tipo IN ('compra','venta','ajuste','devolucion','merma','correccion')),
  cantidad numeric(14,4) NOT NULL,
  usuario_id uuid REFERENCES usuario(id) ON DELETE SET NULL,
  documento_origen uuid,
  observacion text,
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mov_producto ON movimiento_inventario(producto_id);

-- ----------------------------------------------------------------------------
-- 5b. CLIENTE y CUENTA POR COBRAR (RN-17..RN-21)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  identificacion text,
  nombre text NOT NULL,
  limite_credito_usd numeric(14,4) NOT NULL DEFAULT 0,
  plazo_dias integer NOT NULL DEFAULT 30,
  saldo_usd numeric(14,4) NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cliente_empresa ON cliente(empresa_id);

-- ----------------------------------------------------------------------------
-- 6. VENTA (RN-13..RN-16) — bimonetaria
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS venta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuario(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES cliente(id) ON DELETE SET NULL,
  tasa_aplicada numeric(14,4) NOT NULL DEFAULT 1,
  subtotal_usd numeric(14,4) NOT NULL DEFAULT 0,
  impuestos_usd numeric(14,4) NOT NULL DEFAULT 0,
  total_usd numeric(14,4) NOT NULL DEFAULT 0,
  saldo_pendiente_usd numeric(14,4) NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'abierta'
    CHECK (estado IN ('abierta','cerrada','anulada','borrador')),
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_venta_empresa ON venta(empresa_id);

-- ----------------------------------------------------------------------------
-- 7. DETALLE DE VENTA
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS venta_detalle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id uuid NOT NULL REFERENCES venta(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES producto(id) ON DELETE RESTRICT,
  cantidad numeric(14,4) NOT NULL,
  precio_unit_usd numeric(14,4) NOT NULL,
  descuento_linea_usd numeric(14,4) NOT NULL DEFAULT 0,
  subtotal_usd numeric(14,4) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_detalle_venta ON venta_detalle(venta_id);

-- ----------------------------------------------------------------------------
-- 8. PAGO (RN-15, RN-16)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pago (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  venta_id uuid REFERENCES venta(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuario(id) ON DELETE SET NULL,
  metodo text NOT NULL
    CHECK (metodo IN ('efectivo_usd','efectivo_ves','transferencia','tarjeta','mixto','otro')),
  moneda text NOT NULL DEFAULT 'USD' CHECK (moneda IN ('USD','VES')),
  monto numeric(14,4) NOT NULL,
  monto_usd numeric(14,4) NOT NULL,
  tasa_aplicada numeric(14,4) NOT NULL DEFAULT 1,
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pago_empresa ON pago(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pago_venta ON pago(venta_id);

-- ----------------------------------------------------------------------------
-- 9. ABONO (RN-17..RN-21)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS abono (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES cliente(id) ON DELETE CASCADE,
  cuenta_por_cobrar_id uuid,
  usuario_id uuid REFERENCES usuario(id) ON DELETE SET NULL,
  moneda text NOT NULL DEFAULT 'USD' CHECK (moneda IN ('USD','VES')),
  monto numeric(14,4) NOT NULL,
  monto_usd numeric(14,4) NOT NULL,
  tasa_aplicada numeric(14,4) NOT NULL DEFAULT 1,
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_abono_cliente ON abono(cliente_id);

-- ----------------------------------------------------------------------------
-- 10. CAJA CIERRE (RN-25, RN-38)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS caja_cierre (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuario(id) ON DELETE SET NULL,
  fecha date NOT NULL DEFAULT current_date,
  total_usd numeric(14,4) NOT NULL DEFAULT 0,
  total_ves numeric(14,4) NOT NULL DEFAULT 0,
  diferencia_usd numeric(14,4) NOT NULL DEFAULT 0,
  observacion text,
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_caja_empresa ON caja_cierre(empresa_id);

-- ----------------------------------------------------------------------------
-- 11. SESIÓN DE CAJA — ciclo de vida por dispositivo (Modo Offline V1)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sesion_caja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  dispositivo text NOT NULL,
  estado text NOT NULL DEFAULT 'abierta'
    CHECK (estado IN ('abierta','cerrada')),
  saldo_inicial numeric(14,4) NOT NULL DEFAULT 0,
  abre_at timestamptz NOT NULL DEFAULT now(),
  cierre_at timestamptz,
  conteo_ventas integer NOT NULL DEFAULT 0,
  total_ventas_usd numeric(14,4) NOT NULL DEFAULT 0,
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sesion_caja_empresa ON sesion_caja(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sesion_caja_dispositivo ON sesion_caja(empresa_id, dispositivo);
CREATE INDEX IF NOT EXISTS idx_sesion_caja_abierta ON sesion_caja(empresa_id, dispositivo, estado);

-- ----------------------------------------------------------------------------
-- 12. VENTA OFFLINE EVENT — cola de eventos inmutables (REQ-3/REQ-4)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS venta_offline_event (
  id_evento text PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  dispositivo text NOT NULL,
  sesion_caja_id uuid REFERENCES sesion_caja(id) ON DELETE SET NULL,
  estado_sync text NOT NULL DEFAULT 'pendiente'
    CHECK (estado_sync IN ('pendiente','sync_ok','sync_error')),
  payload jsonb NOT NULL,
  auditoria_stock jsonb NOT NULL DEFAULT '[]'::jsonb,
  intentos integer NOT NULL DEFAULT 0,
  ultimo_intento_at timestamptz,
  creado_en timestamptz NOT NULL DEFAULT now(),
  sincronizado_en timestamptz
);
CREATE INDEX IF NOT EXISTS idx_venta_event_empresa ON venta_offline_event(empresa_id);
CREATE INDEX IF NOT EXISTS idx_venta_event_dispositivo ON venta_offline_event(empresa_id, dispositivo);
CREATE INDEX IF NOT EXISTS idx_venta_event_pendientes ON venta_offline_event(empresa_id, dispositivo, estado_sync);

-- ----------------------------------------------------------------------------
-- 13. PRODUCTO HISTORIAL — auditoría de cambios de productos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS producto_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  producto_id uuid,
  producto_nombre text NOT NULL,
  accion text NOT NULL CHECK (accion IN ('creado', 'editado', 'eliminado', 'ajuste_stock')),
  detalles jsonb DEFAULT '{}',
  usuario_id uuid REFERENCES auth.users(id),
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_producto_historial_empresa ON producto_historial(empresa_id);
CREATE INDEX IF NOT EXISTS idx_producto_historial_producto ON producto_historial(producto_id);
CREATE INDEX IF NOT EXISTS idx_producto_historial_creado ON producto_historial(creado_en DESC);

-- ----------------------------------------------------------------------------
-- 14. CONFIGURACIÓN SKU POR EMPRESA
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
CREATE INDEX IF NOT EXISTS idx_empresa_config_sku_empresa ON empresa_configuracion_sku(empresa_id);

-- ----------------------------------------------------------------------------
-- 15. CONTADORES SKU ATÓMICOS POR EMPRESA+CATEGORÍA
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresa_sku_contador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  categoria_id uuid,
  ultimo_valor integer NOT NULL DEFAULT 0,
  UNIQUE (empresa_id, categoria_id)
);

-- ----------------------------------------------------------------------------
-- 16. EMPRESA MÓDULOS — feature flags por empresa
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresa_modulos (
  empresa_id uuid REFERENCES empresa(id) ON DELETE CASCADE,
  modulo text NOT NULL CHECK (modulo IN ('catalogo', 'venta', 'inventario', 'caja', 'reportes')),
  habilitado boolean DEFAULT false,
  PRIMARY KEY (empresa_id, modulo)
);

-- ============================================================================
-- INDEXES ADICIONALES
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_categoria_codigo_empresa
  ON categoria (empresa_id, codigo) WHERE codigo IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_producto_sku_empresa
  ON producto (empresa_id, sku) WHERE sku IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimiento_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE abono ENABLE ROW LEVEL SECURITY;
ALTER TABLE caja_cierre ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesion_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_offline_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_configuracion_sku ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_sku_contador ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_modulos ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FUNCTIONS (final versions, CREATE OR REPLACE)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- mi_empresa_id — retorna empresa_id del usuario logueado
-- SECURITY INVOKER: hereda RLS del usuario.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mi_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
  SELECT empresa_id FROM public.usuario WHERE id = auth.uid()
$$;

-- ----------------------------------------------------------------------------
-- es_de_empresa — ¿el usuario logueado pertenece a la empresa dada?
-- SECURITY DEFINER: necesario para que las políticas RLS funcionen (ciclo
-- policy → function → read usuario → RLS on usuario → policy).
-- Revocado de anon en patch_02; authenticated lo necesita para RLS.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.es_de_empresa(empresa_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuario u
    WHERE u.id = auth.uid() AND u.empresa_id = empresa_uuid
  );
$$;

-- ----------------------------------------------------------------------------
-- crear_empresa_con_admin — alta atómica empresa + usuario admin
-- SECURITY DEFINER: crea empresa + usuario antes de que exista fila vinculada.
-- Guardas: auth.uid() = p_auth_user_id, solo si aún no tiene empresa.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_empresa_con_admin(
  p_nombre_empresa text,
  p_auth_user_id uuid,
  p_nombre_admin text DEFAULT 'Admin'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_empresa_id uuid;
  v_usuario record;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_auth_user_id THEN
    RAISE EXCEPTION 'no autorizado' USING errcode = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.usuario WHERE id = p_auth_user_id) THEN
    RAISE EXCEPTION 'el usuario ya pertenece a una empresa' USING errcode = '23505';
  END IF;

  INSERT INTO public.empresa (nombre) VALUES (p_nombre_empresa)
  RETURNING id INTO v_empresa_id;

  INSERT INTO public.usuario (id, empresa_id, nombre, rol)
  VALUES (p_auth_user_id, v_empresa_id, p_nombre_admin, 'admin')
  RETURNING * INTO v_usuario;

  RETURN json_build_object(
    'empresa_id', v_empresa_id,
    'usuario_id', v_usuario.id,
    'rol', v_usuario.rol
  );
END;
$$;

REVOKE ALL ON FUNCTION public.crear_empresa_con_admin(text, uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.crear_empresa_con_admin(text, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.crear_empresa_con_admin(text, uuid, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- clonar_catalogo — clona categorías + productos de una empresa a otra
-- SECURITY DEFINER: escribe en empresa destino donde el usuario no tiene fila.
-- Guarda interna: solo usuario de empresa origen puede clonar.
-- REVOKE de anon ya está en patch_04.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clonar_catalogo(
  p_empresa_origen uuid,
  p_empresa_destino uuid,
  p_modo_precio text DEFAULT 'sugerido',
  p_categorias uuid[] DEFAULT NULL,
  p_productos uuid[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_cat record;
  v_mapa jsonb := '{}';
  v_prod record;
  v_cat_id_nuevo uuid;
  v_cont_cat integer := 0;
  v_cont_prod integer := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM usuario u
    WHERE u.id = auth.uid() AND u.empresa_id = p_empresa_origen
  ) THEN
    RAISE EXCEPTION 'no autorizado para clonar esta empresa' USING errcode = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM producto WHERE empresa_id = p_empresa_destino) THEN
    RAISE EXCEPTION 'la empresa destino ya tiene productos' USING errcode = '23505';
  END IF;

  FOR v_cat IN
    SELECT * FROM categoria
    WHERE empresa_id = p_empresa_origen
      AND (p_categorias IS NULL OR id = ANY(p_categorias))
  LOOP
    INSERT INTO categoria (empresa_id, nombre)
    VALUES (p_empresa_destino, v_cat.nombre)
    RETURNING id INTO v_cat_id_nuevo;

    v_mapa := jsonb_set(v_mapa, array[v_cat.id::text], to_jsonb(v_cat_id_nuevo));
    v_cont_cat := v_cont_cat + 1;
  END LOOP;

  FOR v_prod IN
    SELECT * FROM producto
    WHERE empresa_id = p_empresa_origen
      AND (p_categorias IS NULL OR categoria_id = ANY(p_categorias))
      AND (p_productos IS NULL OR id = ANY(p_productos))
  LOOP
    INSERT INTO producto (
      empresa_id, codigo_barras, sku, nombre,
      categoria_id, unidad, costo_usd,
      precio_usd, imagen_url, stock_actual, stock_minimo,
      activo
    )
    VALUES (
      p_empresa_destino,
      v_prod.codigo_barras,
      v_prod.sku,
      v_prod.nombre,
      CASE WHEN v_prod.categoria_id IS NOT NULL
           THEN (v_mapa->>(v_prod.categoria_id::text))::uuid
           ELSE NULL END,
      v_prod.unidad,
      v_prod.costo_usd,
      CASE WHEN p_modo_precio = 'cero' THEN 0 ELSE v_prod.precio_usd END,
      v_prod.imagen_url,
      0,
      v_prod.stock_minimo,
      true
    );
    v_cont_prod := v_cont_prod + 1;
  END LOOP;

  RETURN json_build_object(
    'categorias_clonadas', v_cont_cat,
    'productos_clonados', v_cont_prod
  );
END;
$$;

REVOKE ALL ON FUNCTION public.clonar_catalogo(uuid, uuid, text, uuid[], uuid[]) FROM public;
REVOKE ALL ON FUNCTION public.clonar_catalogo(uuid, uuid, text, uuid[], uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.clonar_catalogo(uuid, uuid, text, uuid[], uuid[]) TO authenticated;

-- ----------------------------------------------------------------------------
-- buscar_productos — búsqueda con ranking por relevancia + orden configurable
-- SECURITY INVOKER: hereda RLS. Parámetro p_order_by con whitelist.
-- Versión final: patch_08 (p_order_by) + patch_12 (search_path).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.buscar_productos(
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
  ORDER BY score ASC,
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

-- ----------------------------------------------------------------------------
-- buscar_productos_similares — búsqueda fuzzy por trigram
-- SECURITY INVOKER: hereda RLS.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.buscar_productos_similares(
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

-- ----------------------------------------------------------------------------
-- generar_sku — incremento atómico de contador + construcción de SKU
-- SECURITY INVOKER: hereda RLS.
-- ----------------------------------------------------------------------------
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
-- aplicar_ajuste_stock — inserta movimiento_inventario y actualiza stock
-- SECURITY INVOKER: hereda RLS.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aplicar_ajuste_stock(
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

-- ----------------------------------------------------------------------------
-- aplicar_venta_offline — upsert idempotente de venta offline
-- SECURITY INVOKER: hereda RLS.
-- ----------------------------------------------------------------------------
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
  INSERT INTO venta_offline_event (
    id_evento, empresa_id, dispositivo, sesion_caja_id, estado_sync,
    payload, auditoria_stock, intentos, sincronizado_en
  ) VALUES (
    p_id_evento, p_empresa_id, p_dispositivo, p_sesion_caja_id, 'sync_ok',
    p_payload, coalesce(p_auditoria_stock, '[]'::jsonb), 1, now()
  )
  ON CONFLICT (id_evento) DO UPDATE
    SET estado_sync = 'sync_ok',
        intentos = venta_offline_event.intentos + 1,
        sincronizado_en = now()
  RETURNING (xmax = 0) INTO v_existe;

  IF v_existe THEN
    v_venta_id := gen_random_uuid();

    INSERT INTO venta (
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
      INSERT INTO venta_detalle (
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
      INSERT INTO pago (
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
      INSERT INTO movimiento_inventario (
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
      UPDATE sesion_caja
        SET conteo_ventas = conteo_ventas + 1,
            total_ventas_usd = total_ventas_usd + coalesce((p_payload->>'total_usd')::numeric, 0)
      WHERE id = p_sesion_caja_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('id_evento', p_id_evento, 'insertado', v_existe, 'venta_id', v_venta_id);
END;
$$;

-- ----------------------------------------------------------------------------
-- trg_alta_usuario — trigger: al crear usuario de auth, crear fila en usuario
-- SECURITY DEFINER: necesario para insertar en public.usuario desde auth trigger.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_alta_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (new.raw_user_meta_data->>'empresa_id') IS NOT NULL THEN
    INSERT INTO public.usuario (id, empresa_id, nombre, rol)
    VALUES (new.id,
            (new.raw_user_meta_data->>'empresa_id')::uuid,
            coalesce(new.raw_user_meta_data->>'nombre','Usuario'),
            coalesce(new.raw_user_meta_data->>'rol','cajero'))
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_alta_usuario ON auth.users;
CREATE TRIGGER trg_alta_usuario
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.trg_alta_usuario();

-- ----------------------------------------------------------------------------
-- trg_descuenta_stock_venta — trigger: descuento condicional de stock
-- SECURITY DEFINER: necesario para UPDATE en producto + INSERT en movimiento.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_descuenta_stock_venta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_empresa_id uuid;
  v_venta_sin_stock boolean;
BEGIN
  SELECT v.empresa_id INTO v_empresa_id FROM public.venta v WHERE v.id = new.venta_id;
  SELECT e.venta_sin_stock INTO v_venta_sin_stock
  FROM public.empresa e WHERE e.id = v_empresa_id;

  IF v_venta_sin_stock THEN
    RETURN new;
  END IF;

  UPDATE public.producto
  SET stock_actual = stock_actual - new.cantidad
  WHERE id = new.producto_id;

  INSERT INTO public.movimiento_inventario (
    empresa_id, producto_id, tipo, cantidad, usuario_id, documento_origen, observacion
  )
  VALUES (
    v_empresa_id, new.producto_id, 'venta', new.cantidad,
    (SELECT usuario_id FROM public.venta WHERE id = new.venta_id),
    new.venta_id,
    'Venta'
  );

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_descuenta_stock_venta ON venta_detalle;
CREATE TRIGGER trg_descuenta_stock_venta
  AFTER INSERT ON venta_detalle
  FOR EACH ROW EXECUTE FUNCTION public.trg_descuenta_stock_venta();

-- ----------------------------------------------------------------------------
-- trg_crear_config_sku_default — trigger: config SKU por defecto al crear empresa
-- SECURITY INVOKER (default).
-- ----------------------------------------------------------------------------
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

DROP TRIGGER IF EXISTS trg_config_sku_default ON empresa;
CREATE TRIGGER trg_config_sku_default
  AFTER INSERT ON empresa
  FOR EACH ROW EXECUTE FUNCTION public.trg_crear_config_sku_default();

-- ============================================================================
-- REVOKE permissions (lint compliance)
-- ============================================================================

-- es_de_empresa: revoke anon (authenticated LO NECESITA para RLS)
REVOKE ALL ON FUNCTION public.es_de_empresa(uuid) FROM public;
REVOKE ALL ON FUNCTION public.es_de_empresa(uuid) FROM anon;

-- trg_alta_usuario: trigger function, no invocable por API
REVOKE ALL ON FUNCTION public.trg_alta_usuario() FROM public;
REVOKE ALL ON FUNCTION public.trg_alta_usuario() FROM anon;
REVOKE ALL ON FUNCTION public.trg_alta_usuario() FROM authenticated;

-- trg_descuenta_stock_venta: trigger function, no invocable por API
REVOKE ALL ON FUNCTION public.trg_descuenta_stock_venta() FROM public;
REVOKE ALL ON FUNCTION public.trg_descuenta_stock_venta() FROM anon;
REVOKE ALL ON FUNCTION public.trg_descuenta_stock_venta() FROM authenticated;

-- ============================================================================
-- RLS POLICIES (multi-tenant por empresa_id)
-- ============================================================================

-- Políticas base: cada usuario solo ve/escribe datos de SU empresa.
CREATE POLICY empresa_propia ON empresa
  FOR ALL USING (es_de_empresa(id)) WITH CHECK (es_de_empresa(id));

CREATE POLICY usuario_propia ON usuario
  FOR ALL USING (es_de_empresa(empresa_id)) WITH CHECK (es_de_empresa(empresa_id));

CREATE POLICY categoria_propia ON categoria
  FOR ALL USING (es_de_empresa(empresa_id)) WITH CHECK (es_de_empresa(empresa_id));

CREATE POLICY producto_propia ON producto
  FOR ALL USING (es_de_empresa(empresa_id)) WITH CHECK (es_de_empresa(empresa_id));

CREATE POLICY movimiento_propia ON movimiento_inventario
  FOR ALL USING (es_de_empresa(empresa_id)) WITH CHECK (es_de_empresa(empresa_id));

CREATE POLICY venta_propia ON venta
  FOR ALL USING (es_de_empresa(empresa_id)) WITH CHECK (es_de_empresa(empresa_id));

CREATE POLICY detalle_propia ON venta_detalle
  FOR ALL USING (EXISTS (SELECT 1 FROM venta v WHERE v.id = venta_id AND es_de_empresa(v.empresa_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM venta v WHERE v.id = venta_id AND es_de_empresa(v.empresa_id)));

CREATE POLICY pago_propia ON pago
  FOR ALL USING (es_de_empresa(empresa_id)) WITH CHECK (es_de_empresa(empresa_id));

CREATE POLICY cliente_propia ON cliente
  FOR ALL USING (es_de_empresa(empresa_id)) WITH CHECK (es_de_empresa(empresa_id));

CREATE POLICY abono_propia ON abono
  FOR ALL USING (es_de_empresa(empresa_id)) WITH CHECK (es_de_empresa(empresa_id));

CREATE POLICY caja_propia ON caja_cierre
  FOR ALL USING (es_de_empresa(empresa_id)) WITH CHECK (es_de_empresa(empresa_id));

-- Sesión de caja: multi-tenant
CREATE POLICY sesion_caja_propia ON sesion_caja
  FOR ALL USING (es_de_empresa(empresa_id))
  WITH CHECK (es_de_empresa(empresa_id));

-- Eventos offline: multi-tenant
CREATE POLICY venta_event_propia ON venta_offline_event
  FOR ALL USING (es_de_empresa(empresa_id))
  WITH CHECK (es_de_empresa(empresa_id));

-- Historial de productos: read + insert por empresa
CREATE POLICY historial_read_own_empresa ON producto_historial
  FOR SELECT TO authenticated
  USING (es_de_empresa(empresa_id));

CREATE POLICY historial_insert_own_empresa ON producto_historial
  FOR INSERT TO authenticated
  WITH CHECK (es_de_empresa(empresa_id));

-- Configuración SKU: multi-tenant
CREATE POLICY config_sku_propia ON empresa_configuracion_sku
  FOR ALL USING (es_de_empresa(empresa_id))
  WITH CHECK (es_de_empresa(empresa_id));

-- Contadores SKU: multi-tenant
CREATE POLICY contador_propio ON empresa_sku_contador
  FOR ALL USING (es_de_empresa(empresa_id))
  WITH CHECK (es_de_empresa(empresa_id));

-- Módulos de empresa: multi-tenant
CREATE POLICY empresa_modulos_empresa ON empresa_modulos
  FOR ALL USING (es_de_empresa(empresa_id))
  WITH CHECK (es_de_empresa(empresa_id));

-- ============================================================================
-- STORAGE: bucket de imágenes de producto
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('productos', 'productos', true)
ON CONFLICT (id) DO NOTHING;

-- Lectura pública (bucket público, SELECT libre)
DROP POLICY IF EXISTS "productos_public_read" ON storage.objects;
CREATE POLICY "productos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'productos');

-- Escritura autenticada: solo subcarpeta del empresa_id del usuario
DROP POLICY IF EXISTS "productos_auth_insert" ON storage.objects;
CREATE POLICY "productos_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'productos'
    AND (storage.objects.name)::text LIKE (public.mi_empresa_id()::text || '/%')
  );

DROP POLICY IF EXISTS "productos_auth_update" ON storage.objects;
CREATE POLICY "productos_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'productos'
    AND (storage.objects.name)::text LIKE (public.mi_empresa_id()::text || '/%')
  );

DROP POLICY IF EXISTS "productos_auth_delete" ON storage.objects;
CREATE POLICY "productos_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'productos'
    AND (storage.objects.name)::text LIKE (public.mi_empresa_id()::text || '/%')
  );

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
