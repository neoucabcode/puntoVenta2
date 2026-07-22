# ACCIÓN USUARIO — Aplicar SQL de Modo Caja Offline (patch_08)

> **El agente NO ejecuta este SQL.** No se usa `service_role`/secret en ningún paso
> automatizado. Este archivo es un entregable para que **tú** lo corras en el SQL
> Editor de Supabase (o con `psql` usando tus credenciales de administrador).

## Archivo a ejecutar

`openspec/changes/modo-caja-offline/patch_08_sesion_caja.sql`

Contenido:
1. Tabla `sesion_caja` (ciclo de vida de caja por dispositivo, REQ-1).
2. Tabla `venta_offline_event` (cola de eventos inmutables, REQ-3/REQ-4).
3. RLS `es_de_empresa` idéntico al esquema vigente (no toca la deuda Storage).
4. RPC `aplicar_venta_offline(...)` — upsert idempotente por `id_evento`
   (`security invoker`, materializa la venta solo en el primer INSERT).

## Cómo aplicarlo

### Opción A — SQL Editor de Supabase
1. Abrí el proyecto en supabase.com → **SQL Editor**.
2. Pegá el contenido de `patch_08_sesion_caja.sql`.
3. Ejecutarlo (botón **Run**).

### Opción B — psql
```bash
psql "$DATABASE_URL" -f openspec/changes/modo-caja-offline/patch_08_sesion_caja.sql
```

## Verificación de idempotencia (lo corrés vos)

Después de aplicar, probá que el reintento no duplica la venta:

```sql
-- Primer intento: inserta y materializa.
select public.aplicar_venta_offline(
  'evt-verificacion-001',
  '<tu_empresa_id>',
  'disp-verificacion',
  null,
  '{"usuario_id":"<uuid>","subtotal_usd":1,"total_usd":1,"detalles":[],"pagos":[]}'::jsonb,
  '[]'::jsonb
);
-- Segundo intento (mismo id_evento): NO debe crear fila nueva.
select public.aplicar_venta_offline(
  'evt-verificacion-001',
  '<tu_empresa_id>',
  'disp-verificacion',
  null,
  '{"usuario_id":"<uuid>","subtotal_usd":1,"total_usd":1,"detalles":[],"pagos":[]}'::jsonb,
  '[]'::jsonb
);

-- Debe devolver insertado=true la primera vez e insertado=false la segunda,
-- y debe existir UNA sola fila en venta_offline_event con ese id_evento.
select count(*) from public.venta_offline_event where id_evento = 'evt-verificacion-001'; -- esperado: 1
```

## Rollback (si hacés falta)

```sql
drop function if exists public.aplicar_venta_offline(text, uuid, text, uuid, jsonb, jsonb);
drop table if exists public.venta_offline_event;
drop table if exists public.sesion_caja;
```

El patch es **aditivo**: no modifica tablas existentes, así que dropearlo no rompe
el esquema actual.
