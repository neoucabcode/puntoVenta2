-- ============================================================================
-- patch_10_producto_historial.sql — Auditoría de cambios de productos
-- Tabla producto_historial para registrar creaciones, ediciones, eliminaciones
-- y ajustes de stock. RLS heredada por empresa_id (es_de_empresa).
-- ============================================================================

create table if not exists producto_historial (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  producto_id uuid,  -- nullable para productos eliminados
  producto_nombre text not null,
  accion text not null check (accion in ('creado', 'editado', 'eliminado', 'ajuste_stock')),
  detalles jsonb default '{}',
  usuario_id uuid references auth.users(id),
  creado_en timestamptz not null default now()
);

create index if not exists idx_producto_historial_empresa on producto_historial(empresa_id);
create index if not exists idx_producto_historial_producto on producto_historial(producto_id);
create index if not exists idx_producto_historial_creado on producto_historial(creado_en desc);

-- RLS: los usuarios autenticados solo ven/escriben en su propia empresa.
alter table producto_historial enable row level security;

create policy "historial_read_own_empresa" on producto_historial
  for select to authenticated
  using (es_de_empresa(empresa_id));

create policy "historial_insert_own_empresa" on producto_historial
  for insert to authenticated
  with check (es_de_empresa(empresa_id));
