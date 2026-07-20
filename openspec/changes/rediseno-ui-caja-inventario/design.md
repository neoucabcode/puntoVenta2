<!-- status: designed | artifact_store: both (Engram + OpenSpec) -->

# Design: Rediseño UI Caja e Inventario (estilo Fina)

## Contexto y hallazgo clave

El cambio separa la UI en 3 secciones (Venta / Catálogo solo-lectura / Inventario admin),
refresca la caja "estilo Fina" y añade split-pago, cliente/cxc, devoluciones, presupuestos y
hardware, **preservando el offline multi-dispositivo** (RN-53/54/55/56 + `modo-caja-offline`).

**Hallazgo al leer `supabase/schema_fase2.sql`**: el esquema ya define las tres primeras
incógnitas. No se crean tablas/columnas para rol, `stock_minimo` ni movimientos:

- `usuario.rol text check (rol in ('cajero','inventario','admin','auditor'))` (L30-38) → **incógnita 1 resuelta**.
- `producto.stock_minimo numeric(14,4)` (L67) → **incógnita 2 resuelta** (app ya lo lee en `productos.ts`/`CatalogoPage`).
- `movimiento_inventario` (L78-89) con `tipo in ('compra','venta','ajuste','devolucion','merma','correccion')` → **incógnita 3 resuelta**; reusamos esta tabla en vez de crear `movimiento_stock`. El "motivo" mapea a `observacion`.

Solo falta crear `cuenta_por_cobrar` (incógnita 4) y `empresa.logo_url` (para presupuestos).
`patch_08` (`aplicar_venta_offline`, `sesion_caja`, `venta_offline_event`) se asume aplicado
en la BD aunque no esté en el repo → ver Riesgos.

## Decisiones de arquitectura (opción | tradeoff | decisión)

| # | Incógnita | Decisión |
|---|-----------|----------|
| 1 | Rol/admin | **Reusar `usuario.rol`** (gate `rol='admin'`). Mapear "vendedor" de la spec → enum existente `'cajero'`. Sin DDL. Lector `obtenerMiRol()` en `empresa.ts` + hook `useUsuarioRol()`. Fallback: rol `null/undefined` → denegar Inventario. Kill-switch env `VITE_INVENTARIO_ENABLED` (default true). |
| 2 | `stock_minimo` | **Columna ya existe**. Solo superficie alerta en `InventarioPage` (badge cuando `stock_actual <= stock_minimo`). |
| 3 | Movimiento stock | **Reusar `movimiento_inventario`**. RPC `aplicar_ajuste_stock` (`security invoker`) inserta fila + `update producto.stock_actual` (permite negativo si `empresa.stock_negativo`, RN-55). RN-11 cumplida. |
| 4 | CXC | **Nueva tabla `cuenta_por_cobrar`** (`patch_09`). Venta a crédito → crea CXC idempotente. Abonos vía `abono.cuenta_por_cobrar_id` (FK añadida). Resumen en caja/inventario. |
| 5 | Hardware | **Scanner**: la mayoría de lectores USB son HID-keyboard (escriben código+Enter) → path primario = hook `useBarcodeScanner` (captura global keydown con prefijo/sufijo Enter). WebHID como mejora opcional; fallback input manual siempre. **Impresora**: hook `usePrinter` intenta WebUSB (ESC/POS térmica), fallback `window.print()` con recibo estilado. Ninguno rompe offline. |
| 6 | Regresión offline | Vitest + reuso de escenarios `modo-caja-offline`. `autoSync` ya inyecta `rpc`/`schedule` → tests sin red real. Contrato de `colaOffline` y `useCajaStore` queda intacto salvo Slice 3/4. |

Otras decisiones: Slice 2 **no toca** `useCajaStore`/cola (pura capa presentacional). `ProductoForm`
se reubica a `InventarioPage` (no se duplica). Nuevos eventos offline (ajuste, devolución, abono_cxc)
replican el patrón `EventoVentaOffline` + RPC idempotente por `id_evento`.

## Visión de arquitectura

```
Routes (main.tsx)                 Stores (Zustand)            lib/ (Supabase)
/  → PosPage        ─┐            useCajaStore ──────────► caja.ts, ventaOffline.ts
/catalogo → CatalogoPage (RO)  ├─ useUsuarioRol (hook) ─► empresa.ts (obtenerMiRol)
/inventario → InventarioPage   ┘  useInventarioStore ───► productos.ts, ajusteStock.ts
(admin gate)                         (slice 3+) cxc/dev ─► cxc.ts, devoluciones.ts
                                      cotizaciones ─────► cotizaciones.ts, barcode.ts, printer.ts
                                      colaOffline (genérico por store) ──► autoSync.ts
```

`autoSync.iniciarAutoSync` se generaliza a un **registro de stores+RPC**; cada slice 3+ registra
el suyo. `useCajaStore` conserva firma actual para Slice 2; Slice 3 añade `cliente`, `metodosPago`,
`split` de forma aditiva.

## Modelo de datos (SQL documentado, NO aplicado — `patch_09_*`)

```sql
-- patch_09_cuenta_por_cobrar.sql
alter table empresa add column if not exists logo_url text;

create table if not exists cuenta_por_cobrar (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  cliente_id uuid not null references cliente(id) on delete cascade,
  venta_id uuid references venta(id) on delete set null,
  monto_original_usd numeric(14,4) not null default 0,
  saldo_usd numeric(14,4) not null default 0,
  estado text not null default 'activa' check (estado in ('activa','pagada','anulada')),
  vencimiento date,                       -- derivado: creado_en + cliente.plazo_dias
  creado_en timestamptz not null default now()
);
create index if not exists idx_cxc_empresa on cuenta_por_cobrar(empresa_id);
create index if not exists idx_cxc_cliente on cuenta_por_cobrar(cliente_id);
alter table abono add constraint if not exists fk_abono_cxc
  foreign key (cuenta_por_cobrar_id) references cuenta_por_cobrar(id) on delete set null;
alter table cuenta_por_cobrar enable row level security;
create policy cxc_propia on cuenta_por_cobrar
  for all using (es_de_empresa(empresa_id)) with check (es_de_empresa(empresa_id));
```

```sql
-- patch_09_rpcs.sql  (todas security invoker; idempotencia manejada por id_evento en cliente)
create or replace function aplicar_ajuste_stock(
  p_id_evento text, p_empresa_id uuid, p_producto_id uuid,
  p_cantidad numeric, p_tipo text, p_motivo text, p_usuario_id uuid)
returns boolean language plpgsql security invoker as $$
declare v_neg boolean;
begin
  select stock_negativo into v_neg from empresa where id = p_empresa_id;
  insert into movimiento_inventario (empresa_id, producto_id, tipo, cantidad, usuario_id, observacion)
    values (p_empresa_id, p_producto_id, p_tipo, p_cantidad, p_usuario_id, p_motivo);
  update producto set stock_actual = stock_actual + p_cantidad
    where id = p_producto_id and empresa_id = p_empresa_id
    and (v_neg or stock_actual + p_cantidad >= 0);
  return true;
end; $$;

-- Crédito: EXTENSIÓN de aplicar_venta_offline (CREATE OR REPLACE en patch_09).
-- Tras insertar venta/pago, si payload.cliente_id set y saldo_pendiente_usd>0:
--   insert into cuenta_por_cobrar (empresa_id, cliente_id, venta_id, monto_original_usd, saldo_usd, vencimiento)
--   values (..., p_payload->>'cliente_id', nueva_venta_id, saldo, saldo, creado_en + (select plazo_dias from cliente));
-- Fallback si no se puede modificar patch_08: RPC hermano aplicar_cxc disparado post-sync de la venta.

create or replace function aplicar_devolucion(
  p_id_evento text, p_empresa_id uuid, p_venta_origen_id uuid,
  p_detalles jsonb, p_usuario_id uuid) returns boolean
language plpgsql security invoker as $$ ... inserta movimiento_inventario tipo 'devolucion'
+ ajusta stock (+cantidad) + opcionalmente decrementa saldo de cuenta_por_cobrar ... $$;

create or replace function aplicar_abono_cxc(
  p_id_evento text, p_empresa_id uuid, p_cuenta_id uuid,
  p_monto_usd numeric, p_usuario_id uuid) returns boolean
language plpgsql security invoker as $$ ... inserta abono + decrementa saldo_usd de cxc,
poner estado='pagada' si saldo<=0 ... $$;
```

## Diseño por slice

| Slice | Archivos (crear/modificar) | Enfoque | Límite PR | Offline |
|-------|----------------------------|---------|-----------|---------|
| 1 UI sep | `main.tsx` (ruta `/inventario`), `Layout.tsx` (nav 3), `CatalogoPage.tsx` (quitar `soloLectura`/`ProductoForm`/`Vender`), `pages/InventarioPage.tsx` (new), mover `ProductoForm`, `empresa.ts` (`obtenerMiRol`), hook `useUsuarioRol` | Catálogo 100% RO; Inventario admin-gated con CRUD+categorías | <400 | Catálogo RO offline ya funciona (cache) |
| 2 Caja UX | `PosPage.tsx` + `components/Carrito.tsx` (new) + CSS | Carrito limpio, tasa Bs/$ visible (stale flag), métodos explícitos. **No** toca store/cola | <400 | Intacto (requisito preservado) |
| 3 Split+CXC | `useCajaStore` (add cliente/métodos/split), `PosPage`, `lib/cxc.ts`, `lib/colaOffline` (genérico), `autoSync` (registro), RPC `aplicar_cxc`/`abono` | Split convergente a total; cliente asociado; crédito→cxc | <400 | Evento cxc encolado, idempotente |
| 4 Devoluciones | `components/DevolucionModal.tsx`, `lib/devoluciones.ts`, RPC `aplicar_devolucion` | Flujo aparte; `movimiento_inventario` tipo `devolucion` + ajusta stock ±cxc | <400 | Encolado igual que venta |
| 5 Presupuestos | `lib/cotizaciones.ts` (jsPDF + SheetJS), `components/CotizacionModal.tsx` | Borrador sin afectar stock; export PDF/Excel con `empresa.logo_url` (placeholder si null) | <400 | Genera/exporta local |
| 6 Hardware | `lib/barcode.ts` (`useBarcodeScanner`), `lib/printer.ts` (`usePrinter`), integración en `PosPage` | Scanner HID/keyboard-wedge + input manual; impresión WebUSB/print | <400 | Puramente cliente; no afecta cola |

## UI/UX (guía Fina — ui-ux-pro-max / frontend-design)

**InventarioPage** (estilo Fina, tabla densa + datos):
- `DataTable` reusada: SKU, nombre, categoría, costo, precio, **stock** (badge "Bajo stock" con
  icono+texto cuando `stock_actual <= stock_minimo` — nunca solo color), valuación footer `Σ costo×stock`
  con números tabulares (`font-variant-numeric: tabular-nums`).
- Toolbar: buscar, filtro categoría, "Nuevo producto", "Ajuste de stock" (panel/modal:
  producto, cantidad +/-, motivo select: conteo físico/merma/devolución/otro). CRUD vía `ProductoForm`.
- Accesibilidad: foco visible, `aria-live` en toasts, estados disabled (opacity 0.5), modal con
  Escape/close + confirm antes de destructivo. Admin-only: redirect si rol≠admin.

**PosPage (refresh)** — mismo lenguaje visual:
- `Carrito`: líneas con desc, cantidad editable, precio unit, subtotal; total visible; estado vacío claro.
- Tasa Bs/$ explícita ("1 USD = X Bs"); si última tasa > N horas offline → badge "puede estar desactualizada".
- Métodos de pago como chips seleccionables (Efectivo Bs, Efectivo USD, Transferencia); split en Slice 3.
- Mobile-first, bottom-nav ≤3 items, CTA primario único por pantalla.

## Estrategia de testing (Vitest)

| Capa | Qué | Cómo |
|------|-----|------|
| Unit | `obtenerMiRol`, `useUsuarioRol` gate, cálculo valuación, split convergente, barcode parse | Vitest + mocks de `empresa`/`colaOffline` |
| Integración offline | cola escribe/lee; RPC idempotente (mock `rpc` inyectado en `sincronizarPendientes`); flush offline→online con `schedule` fake | reusa patrón `caja.test.ts` |
| Regresión offline | contrato `registrarVentaOffline` produce evento idéntico; `useCajaStore`/cola no cambian en Slice 2; escenarios de `modo-caja-offline` siguen verdes | `vitest run` en CI; smoke montando `PosPage` con `supabase=null` |
| E2E/Manual | flujo devolución ajusta stock; cxc abono decrementa saldo | opcional (Playwright) |

Cada slice añade su `*.test.ts`; el suite completo debe correr < umbral CI. Regla: **ningún slice 2–6
puede borrar tests verdes de `modo-caja-offline`**.

## Threat Matrix

Cambios de routing (ruta nueva `/inventario`, gated por `RequireAuth` + rol). Sin shell, subprocess,
exec, VCS/PR automation ni executable classification.

| Frontera | Aplica | Comportamiento esperado / RED test |
|----------|--------|-----------------------------------|
| Routing | **Sí** | `/inventario` redirige/deniega si rol≠admin (nav oculta + guarda URL). RED: acceso directo por URL como cajero → 403/redirect. |
| Shell/Subprocess/Exec/VCS | N/A | No aplica (solo React/Supabase client). |

## Migration / Rollback
SQL aditivo (`patch_09_*`). Rollback = `DROP` de `cuenta_por_cobrar`, columnas añadidas y RPCs. Cada
slice es PR independiente; revertir uno no afecta anteriores. Caja offline intacta salvo Slice 3/4.

## Open Questions
- [ ] **Confirmar que `patch_08` (`aplicar_venta_offline`, `sesion_caja`) está aplicado en la BD
      de destino** (no está en `supabase/` del repo). Slice 3/4 dependen de él. Si no, aplicar primero.
- [ ] ¿Permitir rol `'inventario'` también en Inventario, o solo `'admin'`? (Spec: solo admin — confirmar.)
- [ ] Antigüedad de tasa "desactualizada": fijar N horas (proponer 24h).
