-- patch_13_backfill_image_paths.sql
-- Idempotent script: maps old SKU-based image paths to new UUID-based paths.
-- Safe to re-run — only processes products that haven't been migrated yet.
--
-- Usage:
--   1. Run this SQL to log the mapping (for audit trail).
--   2. Run the client-side backfill script (web/src/lib/backfill-images.ts)
--      to actually copy files in Supabase Storage.
--
-- The actual file copy is done client-side because Supabase Storage RPC
-- doesn't expose a server-side copy between paths. This SQL just documents
-- which products need migration.

-- Create a temporary table with the migration mapping
CREATE TEMPORARY TABLE IF NOT EXISTS _backfill_image_mapping AS
SELECT
  p.id AS producto_id,
  p.empresa_id,
  p.sku,
  p.imagen_url,
  -- Old path pattern: {empresa_id}/{sku}.webp
  p.empresa_id || '/' || p.sku || '.webp' AS old_path,
  -- New path pattern: {empresa_id}/{producto_id}.webp
  p.empresa_id || '/' || p.id || '.webp' AS new_path
FROM producto p
WHERE
  p.imagen_url IS NOT NULL
  AND p.sku IS NOT NULL
  AND p.imagen_url LIKE '%/productos/%'
  -- Exclude products that are already at the new path
  AND p.imagen_url NOT LIKE '%' || p.id || '.webp%';

-- Log the mapping for audit purposes
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM _backfill_image_mapping;
  RAISE NOTICE 'Backfill: % products need image path migration', v_count;

  -- Show details for verification
  FOR rec IN SELECT * FROM _backfill_image_mapping LOOP
    RAISE NOTICE '  producto_id=%, sku=%, old=%, new=%',
      rec.producto_id, rec.sku, rec.old_path, rec.new_path;
  END LOOP;
END $$;

-- Drop the temp table (it was just for logging)
DROP TABLE IF EXISTS _backfill_image_mapping;

-- Summary comment:
-- This SQL is for AUDIT purposes only. The actual file migration happens
-- in the client-side script (web/src/lib/backfill-images.ts) which uses
-- the Supabase Storage SDK to:
--   1. Download from old_path
--   2. Upload to new_path
--   3. Verify the copy
--   4. Delete old_path
--
-- The script is idempotent: it checks if new_path exists before copying.
