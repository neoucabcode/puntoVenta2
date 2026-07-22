-- ============================================================================
-- patch_08_sesion_caja.sql
-- Modo Caja Offline (V1): sesión de caja por dispositivo + eventos de venta offline
-- Idempotencia por PK id_evento para upsert sin duplicados en reintentos.
-- RLS multi-tenant bajo el patrón vigente es_de_empresa (NO toca deuda Storage).
-- ADITIVO: no rompe esquema actual. Rollback = DROP de este patch.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SESION_CAJA — ciclo de vida de caja por dispositivo (REQ-1)
-- ----------------------------------------------------------------------------
create table if not exists public.sesion_caja (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  dispositivo text not null,                 -- device_id local (crypto.randomUUID en localStorage)
  estado text not null default 'abierta'
    check (estado in ('abierta','cerrada')),  -- REQ-1: abrir -> activa -> cerrar
  saldo_inicial numeric(14,4) not null default 0,   -- RN-01 resguardo USD
  abre_at timestamptz not null default now(),
  cierre_at timestamptz,                      -- se setea al cerrar
  conteo_ventas integer not null default 0,   -- ventas del turno (para cierre)
  total_ventas_usd numeric(14,4) not null default 0,
  creado_en timestamptz not null default now()
);

create index if not exists idx_sesion_caja_empresa on public.sesion_caja(empresa_id);
create index if not exists idx_sesion_caja_dispositivo on public.sesion_caja(empresa_id, dispositivo);
create index if not exists idx_sesion_caja_abierta on public.sesion_caja(empresa_id, dispositivo, estado);

-- ----------------------------------------------------------------------------
-- 2. VENTA_OFFLINE_EVENT — cola de eventos inmutables (REQ-3 / REQ-4)
--    Un evento = una venta offline completa + su auditoría de stock.
--    id_evento es la PK: el upsert desde el cliente es idempotente.
-- ----------------------------------------------------------------------------
create table if not exists public.venta_offline_event (
  id_evento text primary key,                -- generado en cliente (ej. evt-<uuid>); idempotencia
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  dispositivo text not null,
  sesion_caja_id uuid references public.sesion_caja(id) on delete set null,
  estado_sync text not null default 'pendiente'
    check (estado_sync in ('pendiente','sync_ok','sync_error')),  -- badge de pendientes (REQ-3/4)
  payload jsonb not null,                     -- venta + detalles + pagos (contrato estable)
  auditoria_stock jsonb not null default '[]'::jsonb,  -- RN-11: salidas con causa venta_offline
  intentos integer not null default 0,        -- reintentos para backoff (REQ-4)
  ultimo_intento_at timestamptz,
  creado_en timestamptz not null default now(),
  sincronizado_en timestamptz
);

create index if not exists idx_venta_event_empresa on public.venta_offline_event(empresa_id);
create index if not exists idx_venta_event_dispositivo on public.venta_offline_event(empresa_id, dispositivo);
create index if not exists idx_venta_event_pendientes on public.venta_offline_event(empresa_id, dispositivo, estado_sync);

-- ----------------------------------------------------------------------------
-- 3. RLS — mismo patrón es_de_empresa que el esquema vigente (schema_fase2.sql)
-- ----------------------------------------------------------------------------
alter table public.sesion_caja enable row level security;
alter table public.venta_offline_event enable row level security;

create policy sesion_caja_propia on public.sesion_caja
  for all using (public.es_de_empresa(empresa_id))
  with check (public.es_de_empresa(empresa_id));

create policy venta_event_propia on public.venta_offline_event
  for all using (public.es_de_empresa(empresa_id))
  with check (public.es_de_empresa(empresa_id));

-- ----------------------------------------------------------------------------
-- 4. RPC: aplicar un evento offline idempotentemente (upsert por id_evento)
--    security invoker: hereda RLS del usuario autenticado (patrón patch_07).
--    Inserta la venta + detalles + pagos + movimientos de stock (auditoría RN-11)
--    SOLO si id_evento no existe todavía. Devuelve si fue insertado o ya existía.
-- ----------------------------------------------------------------------------
create or replace function public.aplicar_venta_offline(
  p_id_evento text,
  p_empresa_id uuid,
  p_dispositivo text,
  p_sesion_caja_id uuid,
  p_payload jsonb,
  p_auditoria_stock jsonb
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_existe boolean;
  v_venta_id uuid;
  v_det jsonb;
  v_pago jsonb;
  v_mov jsonb;
begin
  -- Guarda temprana: si el evento ya existe, es reintento -> NO duplicar (REQ-3/4).
  insert into public.venta_offline_event (
    id_evento, empresa_id, dispositivo, sesion_caja_id, estado_sync,
    payload, auditoria_stock, intentos, sincronizado_en
  ) values (
    p_id_evento, p_empresa_id, p_dispositivo, p_sesion_caja_id, 'sync_ok',
    p_payload, coalesce(p_auditoria_stock, '[]'::jsonb), 1, now()
  )
  on conflict (id_evento) do update
    set estado_sync = 'sync_ok',
        intentos = public.venta_offline_event.intentos + 1,
        sincronizado_en = now()
  returning (xmax = 0) into v_existe;  -- xmax=0 => INSERT; xmax<>0 => UPDATE (reintento)

  if v_existe then
    -- Primera vez: materializar la venta real + auditoría de stock.
    v_venta_id := gen_random_uuid();

    insert into public.venta (
      id, empresa_id, usuario_id, cliente_id, tasa_aplicada,
      subtotal_usd, impuestos_usd, total_usd, saldo_pendiente_usd, estado
    ) values (
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

    for v_det in select * from jsonb_array_elements(p_payload->'detalles')
    loop
      insert into public.venta_detalle (
        venta_id, producto_id, cantidad, precio_unit_usd, descuento_linea_usd, subtotal_usd
      ) values (
        v_venta_id,
        (v_det->>'producto_id')::uuid,
        (v_det->>'cantidad')::numeric,
        (v_det->>'precio_unit_usd')::numeric,
        coalesce((v_det->>'descuento_linea_usd')::numeric, 0),
        (v_det->>'subtotal_usd')::numeric
      );
    end loop;

    for v_pago in select * from jsonb_array_elements(p_payload->'pagos')
    loop
      insert into public.pago (
        empresa_id, venta_id, usuario_id, metodo, moneda, monto, monto_usd, tasa_aplicada
      ) values (
        p_empresa_id, v_venta_id,
        (p_payload->>'usuario_id')::uuid,
        v_pago->>'metodo',
        coalesce(v_pago->>'moneda', 'USD'),
        (v_pago->>'monto')::numeric,
        (v_pago->>'monto_usd')::numeric,
        coalesce((v_pago->>'tasa_aplicada')::numeric, 1)
      );
    end loop;

    -- Auditoría de stock: salida con causa venta_offline (RN-11). NO bloquea (RN-54/55).
    for v_mov in select * from jsonb_array_elements(coalesce(p_auditoria_stock, '[]'::jsonb))
    loop
      insert into public.movimiento_inventario (
        empresa_id, producto_id, tipo, cantidad, usuario_id, documento_origen, observacion
      ) values (
        p_empresa_id,
        (v_mov->>'producto_id')::uuid,
        'venta',
        (v_mov->>'cantidad')::numeric,
        (p_payload->>'usuario_id')::uuid,
        v_venta_id,
        coalesce(v_mov->>'observacion', 'venta_offline')
      );
    end loop;

    -- Reflejar conteo/total en la sesión de caja (si aplica).
    if p_sesion_caja_id is not null then
      update public.sesion_caja
        set conteo_ventas = conteo_ventas + 1,
            total_ventas_usd = total_ventas_usd + coalesce((p_payload->>'total_usd')::numeric, 0)
      where id = p_sesion_caja_id;
    end if;
  end if;

  return jsonb_build_object('id_evento', p_id_evento, 'insertado', v_existe, 'venta_id', v_venta_id);
end;
$$;

comment on function public.aplicar_venta_offline(text, uuid, text, uuid, jsonb, jsonb)
  is 'Upsert idempotente de venta offline por id_evento. Materializa venta solo en primer INSERT; reintentos no duplican (REQ-3/4, RN-11/54/55).';
