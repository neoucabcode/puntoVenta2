-- ============================================================================
-- puntoVenta2 — Production Seed Data
-- Datos iniciales para producción. Ejecutar DESPUÉS de production_migration.sql.
-- ============================================================================

-- Empresa FerrehogarMart (tenant principal)
INSERT INTO empresa (id, nombre) VALUES
  ('b72bb1ff-9b7d-4e69-bb79-edd6f64c8b9b', 'FerrehogarMart')
ON CONFLICT (id) DO NOTHING;

-- Habilitar solo catálogo por defecto (resto deshabilitados)
INSERT INTO empresa_modulos (empresa_id, modulo, habilitado) VALUES
  ('b72bb1ff-9b7d-4e69-bb79-edd6f64c8b9b', 'catalogo', true),
  ('b72bb1ff-9b7d-4e69-bb79-edd6f64c8b9b', 'venta', false),
  ('b72bb1ff-9b7d-4e69-bb79-edd6f64c8b9b', 'inventario', false),
  ('b72bb1ff-9b7d-4e69-bb79-edd6f64c8b9b', 'caja', false),
  ('b72bb1ff-9b7d-4e69-bb79-edd6f64c8b9b', 'reportes', false)
ON CONFLICT (empresa_id, modulo) DO NOTHING;

-- Configuración SKU default para FerrehogarMart
INSERT INTO empresa_configuracion_sku (empresa_id, autogenerar_activo, plantilla, prefijo_manual) VALUES
  ('b72bb1ff-9b7d-4e69-bb79-edd6f64c8b9b', false, 'prefijo_fijo_secuencial', 'FER')
ON CONFLICT (empresa_id) DO NOTHING;
