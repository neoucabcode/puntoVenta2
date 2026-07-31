-- ----------------------------------------------------------------------------
-- patch_17_regenerar_sku_lote.sql
-- Regenera masivamente los SKUs de todos los productos de una empresa,
-- reseteando los contadores y usando la configuracion actual de SKU.
-- SECURITY DEFINER + auth.uid() check: solo admins de la empresa pueden ejecutar.
-- IMPORTANTE: limpia los SKU existentes (SET NULL) ANTES de regenerar para
-- evitar colisiones con el indice unico parcial (idx_producto_sku_empresa).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.regenerar_sku_lote(p_empresa_id uuid)
RETURNS TABLE(regenerados integer, errores jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_count int := 0;
  v_errors jsonb := '[]'::jsonb;
  v_producto record;
  v_new_sku text;
BEGIN
  -- Guard: solo admins de la empresa pueden regenerar SKUs
  IF NOT EXISTS (
    SELECT 1 FROM public.usuario
    WHERE id = auth.uid()
      AND empresa_id = p_empresa_id
      AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden regenerar SKUs';
  END IF;

  -- Limpiar SKU existentes antes de regenerar (NULL no viola el indice unico parcial).
  -- Sin esto, el primer SKU generado colisiona con uno preexistente del mismo valor.
  UPDATE public.producto SET sku = NULL WHERE empresa_id = p_empresa_id;

  -- Resetear contadores de esta empresa (todas las categorias + global)
  DELETE FROM public.empresa_sku_contador WHERE empresa_id = p_empresa_id;

  -- Recorrer productos en orden de creacion, regenerar SKU por cada uno
  FOR v_producto IN
    SELECT id, categoria_id FROM public.producto
    WHERE empresa_id = p_empresa_id
    ORDER BY creado_en ASC, id ASC
  LOOP
    BEGIN
      v_new_sku := public.generar_sku(p_empresa_id, v_producto.categoria_id);
      IF v_new_sku IS NOT NULL THEN
        UPDATE public.producto SET sku = v_new_sku WHERE id = v_producto.id;
        v_count := v_count + 1;
      ELSE
        v_errors := v_errors || jsonb_build_object(
          'producto_id', v_producto.id,
          'error', 'generar_sku devolvio NULL (autogenerar_activo desactivado?)'
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object(
        'producto_id', v_producto.id,
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN QUERY SELECT v_count, v_errors;
END;
$$;

-- Revocar de anon (patron patch_01/patch_02: SECURITY DEFINER expuestas)
REVOKE ALL ON FUNCTION public.regenerar_sku_lote(uuid) FROM anon;
