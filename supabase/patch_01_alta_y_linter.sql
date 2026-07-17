-- ============================================================================
-- puntoVenta2 — Parche 01: linter + alta atómica empresa+admin
-- Ejecutar en Supabase: SQL Editor -> pegá esto -> Run (una sola vez).
-- Agrupa: 3 warnings del Database Linter + reemplazo del trigger frágil
-- por un RPC SECURITY DEFINER que crea empresa + usuario admin atómicamente.
--
-- NOTA: search_path = '' (vacío) es la práctica recomendada por Supabase para
-- funciones SECURITY DEFINER (evita escalada de privilegios). Por eso todas las
-- tablas se referencian con esquema explícito: public.usuario, auth.uid(), etc.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. LINTER: fijar search_path en es_de_empresa (function_search_path_mutable)
-- ----------------------------------------------------------------------------
create or replace function public.es_de_empresa(empresa_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.usuario u
    where u.id = auth.uid() and u.empresa_id = empresa_uuid
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. LINTER: fijar search_path en trg_alta_usuario (function_search_path_mutable)
--    (La función se mantiene para altas manuales/legacy, pero el alta real
--     ahora la hace crear_empresa_con_admin. Se fija search_path y se blinda.)
-- ----------------------------------------------------------------------------
create or replace function public.trg_alta_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Solo si viene empresa_id en la metadata (altas hechas a mano).
  -- Si no viene, NO inserta fila (evita violar NOT NULL empresa_id).
  if (new.raw_user_meta_data->>'empresa_id') is not null then
    insert into public.usuario (id, empresa_id, nombre, rol)
    values (new.id,
            (new.raw_user_meta_data->>'empresa_id')::uuid,
            coalesce(new.raw_user_meta_data->>'nombre','Usuario'),
            coalesce(new.raw_user_meta_data->>'rol','cajero'))
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_alta_usuario on auth.users;
create trigger trg_alta_usuario
  after insert on auth.users
  for each row execute function public.trg_alta_usuario();

-- ----------------------------------------------------------------------------
-- 3. LINTER: public_bucket_allows_listing en bucket productos
--    Se quita la política SELECT pública que exponía listado. La lectura de
--    objetos individuales sigue siendo pública por ser bucket public=true,
--    pero ya no se permite listar el contenido del bucket.
-- ----------------------------------------------------------------------------
drop policy if exists "productos_public_read" on storage.objects;

-- ----------------------------------------------------------------------------
-- 4. RPC: alta atómica empresa + usuario admin (reemplaza el flujo roto)
--    SECURITY DEFINER: corre con permisos de owner, salta RLS (necesario
--    porque al crear la empresa aún no hay fila de usuario vinculada).
--    Orden correcto: empresa -> usuario -> NO depende del trigger.
--    Guardas anti-abuso: solo el propio usuario autenticado, y solo si aún
--    no pertenece a ninguna empresa.
-- ----------------------------------------------------------------------------
create or replace function public.crear_empresa_con_admin(
  p_nombre_empresa text,
  p_auth_user_id uuid,
  p_nombre_admin text default 'Admin'
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa_id uuid;
  v_usuario record;
begin
  -- Guarda: solo el propio usuario autenticado puede darse de alta.
  if auth.uid() is null or auth.uid() <> p_auth_user_id then
    raise exception 'no autorizado' using errcode = '42501';
  end if;

  -- Guarda: si ya tiene empresa, no crear otra (idempotente y anti-abuso).
  if exists (select 1 from public.usuario where id = p_auth_user_id) then
    raise exception 'el usuario ya pertenece a una empresa' using errcode = '23505';
  end if;

  -- 1) crear empresa
  insert into public.empresa (nombre) values (p_nombre_empresa)
  returning id into v_empresa_id;

  -- 2) crear fila de usuario admin vinculada (atómico, sin trigger)
  insert into public.usuario (id, empresa_id, nombre, rol)
  values (p_auth_user_id, v_empresa_id, p_nombre_admin, 'admin')
  returning * into v_usuario;

  return json_build_object(
    'empresa_id', v_empresa_id,
    'usuario_id', v_usuario.id,
    'rol', v_usuario.rol
  );
end;
$$;

-- Permisos: solo usuarios autenticados pueden llamar el RPC.
-- Se revoca de public y anon (evita lint 0028: SECURITY DEFINER ejecutable por anon).
revoke all on function public.crear_empresa_con_admin(text, uuid, text) from public;
revoke all on function public.crear_empresa_con_admin(text, uuid, text) from anon;
grant execute on function public.crear_empresa_con_admin(text, uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Notas de uso (frontend):
--   1. supabase.auth.signUp({ email, password })  -> devuelve user.id
--   2. supabase.rpc('crear_empresa_con_admin', {
--        p_nombre_empresa, p_auth_user_id: user.id, p_nombre_admin })
--   3. El usuario ya queda vinculado a su empresa; login directo.
-- ============================================================================
