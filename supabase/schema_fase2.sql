-- ============================================================================
-- puntoVenta2 — Esquema inicial (Fase 2: Núcleo transaccional MVP)
-- Ejecutar en Supabase: SQL Editor → pegá esto → Run
-- Multi-tenant por empresa_id + Row Level Security.
-- Moneda: montos en USD (resguardo, RN-01). VES se calcula con tasa activa.
-- ============================================================================

-- Extensión para UUIDs
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. EMPRESA (cada ferretería es un tenant)
-- ----------------------------------------------------------------------------
create table if not exists empresa (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  riff_juridico text,                 -- rif o identificación fiscal
  moneda_resguardo text not null default 'USD',  -- RN-01
  tasa_activa numeric(14,4) not null default 1,  -- RN-03 (1 = sin conversión)
  igtf_habilitado boolean not null default false, -- RN-07 (configurable)
  caja_obligatoria boolean not null default false,-- RN-53 (admin decide)
  venta_sin_stock boolean not null default true,  -- RN-54
  stock_negativo boolean not null default false,  -- RN-55
  creado_en timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. USUARIO (auth de Supabase) + rol dentro de la empresa
-- ----------------------------------------------------------------------------
create table if not exists usuario (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid not null references empresa(id) on delete cascade,
  nombre text not null,
  rol text not null default 'cajero'
    check (rol in ('cajero','inventario','admin','auditor')),  -- R1..R4
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
create index if not exists idx_usuario_empresa on usuario(empresa_id);

-- ----------------------------------------------------------------------------
-- 3. CATEGORIA DE PRODUCTO
-- ----------------------------------------------------------------------------
create table if not exists categoria (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  nombre text not null,
  creado_en timestamptz not null default now()
);
create index if not exists idx_categoria_empresa on categoria(empresa_id);

-- ----------------------------------------------------------------------------
-- 4. PRODUCTO (RN-08..RN-12)
-- ----------------------------------------------------------------------------
create table if not exists producto (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  codigo_barras text,                 -- RN-09 opcional
  sku text,                           -- pendiente Fase 1 avanzada
  nombre text not null,
  categoria_id uuid references categoria(id) on delete set null,
  unidad text not null default 'unidad',
  costo_usd numeric(14,4) not null default 0,   -- RN-01 resguardo USD
  precio_usd numeric(14,4) not null default 0, -- RN-04 doble expresión vía tasa
  imagen_url text,                          -- seed: SKU.webp en Storage bucket 'productos'
  stock_actual numeric(14,4) not null default 0,
  stock_minimo numeric(14,4) not null default 0, -- RN-12 stock crítico
  activo boolean not null default true,        -- RN-10 estado
  creado_en timestamptz not null default now()
);
create index if not exists idx_producto_empresa on producto(empresa_id);
create index if not exists idx_producto_codigo on producto(empresa_id, codigo_barras);
create index if not exists idx_producto_nombre on producto(empresa_id, nombre);

-- ----------------------------------------------------------------------------
-- 5. MOVIMIENTO DE INVENTARIO (RN-11)
-- ----------------------------------------------------------------------------
create table if not exists movimiento_inventario (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  producto_id uuid not null references producto(id) on delete cascade,
  tipo text not null
    check (tipo in ('compra','venta','ajuste','devolucion','merma','correccion')),
  cantidad numeric(14,4) not null,
  usuario_id uuid references usuario(id) on delete set null,
  documento_origen uuid,              -- compra o venta origen
  observacion text,
  creado_en timestamptz not null default now()
);
create index if not exists idx_mov_producto on movimiento_inventario(producto_id);

-- ----------------------------------------------------------------------------
-- 5b. CLIENTE y CUENTA POR COBRAR (RN-17..RN-21) — antes de VENTA (FK)
-- ----------------------------------------------------------------------------
create table if not exists cliente (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  identificacion text,
  nombre text not null,
  limite_credito_usd numeric(14,4) not null default 0,  -- RN-18
  plazo_dias integer not null default 30,               -- RN-41
  saldo_usd numeric(14,4) not null default 0,           -- RN-19 resguardo USD
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
create index if not exists idx_cliente_empresa on cliente(empresa_id);

-- ----------------------------------------------------------------------------
-- 6. VENTA (RN-13..RN-16) — bimonetaria
-- ----------------------------------------------------------------------------
create table if not exists venta (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  usuario_id uuid references usuario(id) on delete set null,
  cliente_id uuid references cliente(id) on delete set null,
  tasa_aplicada numeric(14,4) not null default 1,  -- RN-14
  subtotal_usd numeric(14,4) not null default 0,
  impuestos_usd numeric(14,4) not null default 0,
  total_usd numeric(14,4) not null default 0,
  saldo_pendiente_usd numeric(14,4) not null default 0, -- RN-06 vuelto/saldo
  estado text not null default 'abierta'
    check (estado in ('abierta','cerrada','anulada','borrador')), -- RN-32, RN-33
  creado_en timestamptz not null default now()
);
create index if not exists idx_venta_empresa on venta(empresa_id);

-- ----------------------------------------------------------------------------
-- 7. DETALLE DE VENTA
-- ----------------------------------------------------------------------------
create table if not exists venta_detalle (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references venta(id) on delete cascade,
  producto_id uuid not null references producto(id) on delete restrict,
  cantidad numeric(14,4) not null,
  precio_unit_usd numeric(14,4) not null,
  descuento_linea_usd numeric(14,4) not null default 0,  -- RN-35
  subtotal_usd numeric(14,4) not null
);
create index if not exists idx_detalle_venta on venta_detalle(venta_id);

-- ----------------------------------------------------------------------------
-- 8. PAGO (RN-15, RN-16) — desagregado por método y moneda
-- ----------------------------------------------------------------------------
create table if not exists pago (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  venta_id uuid references venta(id) on delete cascade,
  usuario_id uuid references usuario(id) on delete set null,
  metodo text not null
    check (metodo in ('efectivo_usd','efectivo_ves','transferencia','tarjeta','mixto','otro')),
  moneda text not null default 'USD' check (moneda in ('USD','VES')),
  monto numeric(14,4) not null,        -- en la moneda del pago
  monto_usd numeric(14,4) not null,    -- normalizado a USD (resguardo)
  tasa_aplicada numeric(14,4) not null default 1,
  creado_en timestamptz not null default now()
);
create index if not exists idx_pago_empresa on pago(empresa_id);
create index if not exists idx_pago_venta on pago(venta_id);

-- ----------------------------------------------------------------------------
-- 9. ABONO (RN-17..RN-21) — depende de cliente
-- ----------------------------------------------------------------------------
create table if not exists abono (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  cliente_id uuid not null references cliente(id) on delete cascade,
  cuenta_por_cobrar_id uuid,           -- referencia a venta con saldo
  usuario_id uuid references usuario(id) on delete set null,
  moneda text not null default 'USD' check (moneda in ('USD','VES')),
  monto numeric(14,4) not null,
  monto_usd numeric(14,4) not null,
  tasa_aplicada numeric(14,4) not null default 1,
  creado_en timestamptz not null default now()
);
create index if not exists idx_abono_cliente on abono(cliente_id);

-- ----------------------------------------------------------------------------
-- 10. CONFIGURACIÓN DE CAJA (RN-25, RN-38) — cierre diario
-- ----------------------------------------------------------------------------
create table if not exists caja_cierre (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  usuario_id uuid references usuario(id) on delete set null,
  fecha date not null default current_date,
  total_usd numeric(14,4) not null default 0,
  total_ves numeric(14,4) not null default 0,
  diferencia_usd numeric(14,4) not null default 0,
  observacion text,
  creado_en timestamptz not null default now()
);
create index if not exists idx_caja_empresa on caja_cierre(empresa_id);

-- ============================================================================
-- ROW LEVEL SECURITY (multi-tenant por empresa_id)
-- ============================================================================
alter table empresa enable row level security;
alter table usuario enable row level security;
alter table categoria enable row level security;
alter table producto enable row level security;
alter table movimiento_inventario enable row level security;
alter table venta enable row level security;
alter table venta_detalle enable row level security;
alter table pago enable row level security;
alter table cliente enable row level security;
alter table abono enable row level security;
alter table caja_cierre enable row level security;

-- Función helper: ¿el usuario logueado pertenece a la empresa de la fila?
create or replace function es_de_empresa(empresa_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from usuario u
    where u.id = auth.uid() and u.empresa_id = empresa_uuid
  );
$$;

-- Políticas base: cada usuario solo ve/escribe datos de SU empresa.
create policy empresa_propia on empresa
  for all using (es_de_empresa(id)) with check (es_de_empresa(id));

create policy usuario_propia on usuario
  for all using (es_de_empresa(empresa_id)) with check (es_de_empresa(empresa_id));

create policy categoria_propia on categoria
  for all using (es_de_empresa(empresa_id)) with check (es_de_empresa(empresa_id));

create policy producto_propia on producto
  for all using (es_de_empresa(empresa_id)) with check (es_de_empresa(empresa_id));

create policy movimiento_propia on movimiento_inventario
  for all using (es_de_empresa(empresa_id)) with check (es_de_empresa(empresa_id));

create policy venta_propia on venta
  for all using (es_de_empresa(empresa_id)) with check (es_de_empresa(empresa_id));

create policy detalle_propia on venta_detalle
  for all using (exists (select 1 from venta v where v.id = venta_id and es_de_empresa(v.empresa_id)))
  with check (exists (select 1 from venta v where v.id = venta_id and es_de_empresa(v.empresa_id)));

create policy pago_propia on pago
  for all using (es_de_empresa(empresa_id)) with check (es_de_empresa(empresa_id));

create policy cliente_propia on cliente
  for all using (es_de_empresa(empresa_id)) with check (es_de_empresa(empresa_id));

create policy abono_propia on abono
  for all using (es_de_empresa(empresa_id)) with check (es_de_empresa(empresa_id));

create policy caja_propia on caja_cierre
  for all using (es_de_empresa(empresa_id)) with check (es_de_empresa(empresa_id));

-- ============================================================================
-- TRIGGER: al crear usuario de auth, crear fila en usuario (si viene de signup)
-- (El alta de empresa + primer admin se hace por script/Edge Function en Fase 4)
-- ============================================================================
create or replace function trg_alta_usuario()
returns trigger
language plpgsql
as $$
begin
  insert into usuario (id, empresa_id, nombre, rol)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'empresa_id'::text)::uuid,
          coalesce(new.raw_user_meta_data->>'nombre','Usuario'),
          coalesce(new.raw_user_meta_data->>'rol','cajero'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_alta_usuario on auth.users;
create trigger trg_alta_usuario
  after insert on auth.users
  for each row execute function trg_alta_usuario();

-- ----------------------------------------------------------------------------
-- 11. STORAGE: bucket de imágenes de producto (SKU.webp)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;

-- Política: cualquiera con sesión de la empresa puede leer; el seed usa service_role.
create policy "productos_public_read" on storage.objects
  for select using (bucket_id = 'productos');

-- ============================================================================
-- GAP CONOCIDO (documentado, fuera de MVP de catálogo):
-- El modelo conceptual define CUENTA POR COBRAR como entidad explícita, pero
-- este esquema la omitió y `abono.cuenta_por_cobrar_id` apunta hoy a `venta`.
-- No afecta el seed de catálogo. Se corrige en Fase de Crédito (Clientes y CxC).
-- ============================================================================
