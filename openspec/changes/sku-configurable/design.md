# Design: SKU Configurable

## Technical Approach

Add configurable SKU auto-generation per empresa, trigram-based fuzzy product matching, and SKU-scoped image storage. Three specs implemented together: `sku-configuration`, `fuzzy-matching`, `image-storage`.

## Architecture Decisions

### Decision: Atomic counter via dedicated table vs Postgres SEQUENCE

**Choice**: `empresa_sku_contador` table with `SELECT ... FOR UPDATE`
**Alternatives**: Postgres `SEQUENCE` per empresa
**Rationale**: Sequences can't be scoped per-category for the `categoria_secuencial` template. A row-per-counter pattern (keyed by empresa+category or empresa-only) is simpler and consistent with RLS.

### Decision: pg_trgm for fuzzy matching vs application-side Levenshtein

**Choice**: `pg_trgm` extension + GiST trigram index on `producto.nombre`
**Alternatives**: Client-side string similarity
**Rationale**: Server-side scales with catalog size, leverages Postgres index, and keeps the RPC fast (spec requires <500ms for 10k+ products).

### Decision: Image rename on SKU change vs UUID-based paths

**Choice**: Rename file to match SKU (`{empresa_id}/{sku}.ext`)
**Alternatives**: UUID-based storage paths
**Rationale**: SKU-based naming is deterministic (no extra lookup needed) and spec-required. Rename on regeneration keeps paths predictable. The existing `subirImagenProducto` already uses `empresaId/productoId.ext` — we migrate to SKU-based paths.

## Data Flow

```
ProductoForm → RPC generar_sku → empresa_sku_contador (atomic INC)
                            ↓
                     returns SKU string → displayed in SkuPreview
                            ↓
                  RPC buscar_productos_similares → DuplicadoAlert
                            ↓
                  crearProducto(sku: generated) → producto table
                            ↓
                  subirImagenProducto → Storage: {empresa_id}/{sku}.ext
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/patch_10_sku.sql` | Create | All DDL + RPCs (see below) |
| `web/src/lib/sku.ts` | Create | `generarSku()`, `buscarSimilares()` API layer |
| `web/src/hooks/useEmpresaConfig.ts` | Create | Hook to fetch `empresa_configuracion_sku` |
| `web/src/hooks/useSkuPreview.ts` | Create | Debounced SKU preview hook |
| `web/src/components/SkuPreview.tsx` | Create | Displays read-only SKU or preview |
| `web/src/components/DuplicadoAlert.tsx` | Create | Fuzzy match warning modal |
| `web/src/components/ProductoForm.tsx` | Modify | Integrate SKU auto-gen + fuzzy check |
| `web/src/lib/productos.ts` | Modify | `subirImagenProducto` SKU-based path; remove `verificarSkuDuplicado` (RPC handles it) |

## DDL (patch_10_sku.sql)

```sql
-- Extensión trigram
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Configuración de SKU por empresa
CREATE TABLE empresa_configuracion_sku (
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
CREATE POLICY config_sku_propia ON empresa_configuracion_sku
  FOR ALL USING (es_de_empresa(empresa_id)) WITH CHECK (es_de_empresa(empresa_id));

-- 2. Contadores atómicos por empresa+categoría (o empresa global)
CREATE TABLE empresa_sku_contador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  categoria_id uuid,  -- NULL para contador global
  ultimo_valor integer NOT NULL DEFAULT 0,
  UNIQUE (empresa_id, categoria_id)
);
ALTER TABLE empresa_sku_contador ENABLE ROW LEVEL SECURITY;
CREATE POLICY contador_propio ON empresa_sku_contador
  FOR ALL USING (es_de_empresa(empresa_id)) WITH CHECK (es_de_empresa(empresa_id));

-- 3. Código corto de categoría (char 3, nullable, único por empresa)
ALTER TABLE categoria ADD COLUMN IF NOT EXISTS codigo char(3);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categoria_codigo_empresa
  ON categoria (empresa_id, codigo) WHERE codigo IS NOT NULL;

-- 4. SKU único por empresa (partial index, solo SKUs no nulos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_producto_sku_empresa
  ON producto (empresa_id, sku) WHERE sku IS NOT NULL;

-- 5. Trigram index para fuzzy search
CREATE INDEX IF NOT EXISTS idx_producto_nombre_trgm
  ON producto USING gin (nombre gin_trgm_ops);

-- 6. RPC: generar_sku (atomic counter increment + SKU string)
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
    RETURN NULL;  -- auto-gen off, caller handles manual SKU
  END IF;

  -- Increment atómico del contador
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

-- 7. RPC: buscar_productos_similares (trigram fuzzy search)
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

-- 8. Trigger: crear config_sku por defecto al insertar empresa
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
```

## Interfaces / Contracts

```typescript
// web/src/lib/sku.ts
export type EmpresaConfigSku = {
  autogenerar_activo: boolean
  plantilla: 'categoria_secuencial' | 'solo_secuencial' | 'prefijo_fijo_secuencial'
  modo_contador: 'por_categoria' | 'global'
  longitud_secuencial: number
  prefijo_manual: string | null
  umbral_similitud: number
}

export async function generarSku(empresaId: string, categoriaId?: string): Promise<string | null>
export async function buscarProductosSimilares(empresaId: string, texto: string, umbral?: number): Promise<{id: string; nombre: string; sku: string; similitud: number}[]>
export async function obtenerConfigSku(empresaId: string): Promise<EmpresaConfigSku | null>
```

```typescript
// web/src/hooks/useEmpresaConfig.ts
export function useEmpresaConfig(): { config: EmpresaConfigSku | null; loading: boolean }
```

```typescript
// web/src/components/SkuPreview.tsx
type Props = { sku: string | null; generando: boolean }
// Renders: "SKU: FER-0012" or "SKU: ..." while generating
```

```typescript
// web/src/components/DuplicadoAlert.tsx
type Props = { similares: Array<{nombre: string; sku: string; similitud: number}>; onConfirm: () => void; onCancel: () => void }
// Warning modal: "Se encontró un producto similar..."
```

## Key Changes to Existing Code

**`ProductoForm.tsx`** — On mount: fetch config. If `autogenerar_activo`:
- Non-admin: SKU input disabled, label "SKU (generado automáticamente)"
- Admin: checkbox to override, SKU becomes editable
- On category change or form open: call `generarSku()`, show result in `SkuPreview`
- Before submit: call `buscarProductosSimilares()`, show `DuplicadoAlert` if matches > threshold

**`productos.ts`** — `subirImagenProducto` changes path from `empresaId/productoId.ext` to `empresaId/{sku}.ext`. Add `renombrarImagen` for SKU regeneration.

## Migration Strategy

No data migration. All changes are additive:
- `empresa_configuracion_sku` rows auto-created via trigger for existing empresas (`autogenerar_activo = false`)
- `categoria.codigo` nullable — existing categories unaffected
- `producto.sku` partial index — only enforces uniqueness for new non-null SKUs
- Storage path change is backward compatible (new uploads use SKU path; old images at product ID paths remain accessible)

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | SKU generation logic (3 templates) | Test `generarSku` RPC via supabase client |
| Unit | Fuzzy matching threshold | Test `buscar_productos_similares` with known data |
| Integration | Counter atomicity under concurrency | Two parallel inserts, verify distinct SKUs |
| Integration | Image rename on SKU regeneration | Create, rename, verify storage path |
| E2E | Full product creation flow with auto-SKU | InventarioPage → ProductoForm → saved with SKU |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Open Questions

- Should `categoria.codigo` defaults be auto-generated (e.g., first 3 chars of nombre)?
- Image rename: should we copy+delete or use Supabase storage `move` API (if available)?
