-- ============================================================================
-- patch_05_storage_writes.sql
-- Objetivo: permitir que usuarios autenticados suban/actualicen/borren objetos
--           en el bucket 'productos' (Storage) para gestionar imagenes desde
--           la pantalla de catalogo.
-- Contexto: schema_fase2.sql solo define la politica de SELECT publica del
--           bucket (lectura libre). Sin INSERT/UPDATE/DELETE, supabase.storage
--           .from_('productos').upload(...) desde el navegador falla con 403
--           por RLS de storage.objects.
-- Seguridad: la politica exige que el nombre del objeto empiece con el
--           empresa_id del usuario autenticado (prefijo de path). Esto aisla
--           a cada empresa: nadie puede pisar fotos de otra.
-- Aplicar: pegar en SQL Editor de Supabase una vez (idempotente).
-- ============================================================================

-- Helper: empresa del usuario logueado. SECURITY INVOKER (no necesita revokes
-- extra: el rol authenticated ya lo puede ejecutar y la policy de RLS de
-- usuario limita select a su propia fila via es_de_empresa).
create or replace function public.mi_empresa_id()
returns uuid
language sql
stable
as $$
  select empresa_id from public.usuario where id = auth.uid()
$$;

drop policy if exists "productos_auth_insert" on storage.objects;
create policy "productos_auth_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'productos'
    and (storage.objects.name)::text like (public.mi_empresa_id()::text || '/%')
  );

drop policy if exists "productos_auth_update" on storage.objects;
create policy "productos_auth_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'productos'
    and (storage.objects.name)::text like (public.mi_empresa_id()::text || '/%')
  );

drop policy if exists "productos_auth_delete" on storage.objects;
create policy "productos_auth_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'productos'
    and (storage.objects.name)::text like (public.mi_empresa_id()::text || '/%')
  );
