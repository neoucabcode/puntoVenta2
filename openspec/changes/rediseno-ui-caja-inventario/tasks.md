<!-- status: planned | artifact_store: both (Engram + OpenSpec) -->

# Tasks: Rediseño UI Caja e Inventario (estilo Fina)

> Desglose por slices 1–6. Cada slice es un entregable aislando UI; el cambio completo se entrega
> como PRs encadenados <400 líneas (stacked-to-main). Sin DDL para rol/`stock_minimo`/`movimiento_inventario`
> (ya existen en `schema_fase2.sql`). Offline multi-dispositivo (RN-53/54/55/56) preservado en todos los slices.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,400 (additions + deletions) en 11 PRs encadenados |
| 400-line budget risk | High (cambio multi-concern) — mitigado: cada PR <400 vía split |
| Chained PRs recommended | Yes |
| Suggested split | S1:PR1→PR5 · S2:PR1→PR2 · S3:PR1→PR3 · S4:PR1→PR2 · S5:PR1→PR2 · S6:PR1→PR2 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| S1-PR1 | Infra rol (obtenerMiRol + hook) | PR 1 | `vitest run src/lib/empresa` | N/A: lógica pura, montar con supabase mock | revierte `empresa.ts` + `hooks/useUsuarioRol.ts` |
| S1-PR2 | Routing + nav + gating | PR 2 | `vitest run src/components/Layout` | N/A: navegación; smoke manual con rol mock | revierte `main.tsx` + `Layout.tsx` |
| S1-PR3 | Catálogo solo lectura | PR 3 | `vitest run src/pages/CatalogoPage` | N/A: UI RO; abrir /catalogo offline | revierte `CatalogoPage.tsx` |
| S1-PR4 | InventarioPage CRUD + ProductoForm | PR 4 | `vitest run src/pages/InventarioPage` | N/A: CRUD UI con supabase mock | elimina `pages/InventarioPage.tsx` |
| S1-PR5 | Ajuste stock + valuación + alertas + tests | PR 5 | `vitest run src/**/slice1` | N/A: RPC mock `aplicar_ajuste_stock` | revierte panel ajuste + tests |
| S2-PR1 | Carrito + tasa + métodos | PR 6 | `vitest run src/components/Carrito` | N/A: UI caja; smoke `PosPage` supabase=null | revierte `Carrito.tsx` + `PosPage.tsx` |
| S2-PR2 | Tests regresión offline Slice 2 | PR 7 | `vitest run src/**/slice2` | reusa `caja.test.ts` cola mock | solo tests; sin código prod |
| S3-PR1 | SQL cxc + verificación patch_08 | PR 8 | `vitest run src/lib/cxc` | N/A: SQL aditivo + check BD | revierte `patch_09_cxc.sql` |
| S3-PR2 | Store split + cxc.ts + cola/autoSync | PR 9 | `vitest run src/store src/lib/colaOffline` | mock `rpc` idempotente en `sincronizarPendientes` | revierte store/cola (no offline base) |
| S3-PR3 | UI split + cliente + tests | PR 10 | `vitest run src/**/slice3` | mock cola offline | revierte UI split en `PosPage` |
| S4-PR1 | devoluciones.ts + DevolucionModal | PR 11 | `vitest run src/lib/devoluciones` | evento encolado idéntico a venta | revierte modal + lib |
| S4-PR2 | Integración + tests devolución | PR 12 | `vitest run src/**/slice4` | mock RPC `aplicar_devolucion` | revierte botón devolución |
| S5-PR1 | cotizaciones.ts + CotizacionModal | PR 13 | `vitest run src/lib/cotizaciones` | N/A: genera PDF/Excel local (jsPDF/SheetJS) | revierte modal + lib |
| S5-PR2 | Botón + tests presupuesto | PR 14 | `vitest run src/**/slice5` | export offline sin red | revierte botón presupuesto |
| S6-PR1 | barcode.ts + printer.ts | PR 15 | `vitest run src/lib/barcode src/lib/printer` | simula keydown+Enter; window.print mock | revierte libs |
| S6-PR2 | Integración hardware + tests | PR 16 | `vitest run src/**/slice6` | WebHID/WebUSB ausentes → fallback | revierte integración PosPage |

---

## Slice 1 (MVP — separación UI + Inventario admin)

<!-- slice: 1 -->

- [x] **T1.0** SQL fundacional inventario (`supabase/patch_09_inventario.sql`)
  - Desc: añadir `alter table empresa add column logo_url text` y RPC `aplicar_ajuste_stock(p_id_evento, p_empresa_id, p_producto_id, p_cantidad, p_tipo, p_motivo, p_usuario_id)` `security invoker` (inserta `movimiento_inventario` + update `stock_actual`, permite negativo si `empresa.stock_negativo`). RLS `es_de_empresa`. Tipar `numeric` (no `string`) para evitar mismatch cliente↔servidor (deuda HANDOFF).
  - Archivos: Crear `supabase/patch_09_inventario.sql`.
  - Dep: ninguna.
  - AC: SQL aditivo; RPC `security invoker`; idempotencia por `p_id_evento`; RLS por `empresa_id`. (spec: inventory-management / Ajuste de stock con motivo y auditoría)
  - Est: ~80 loc.

- [x] **T1.1** `obtenerMiRol()` en `web/src/lib/empresa.ts`
  - Desc: leer `usuario.rol` (enum `'cajero'|'inventario'|'admin'|'auditor'`) vía Supabase con RLS; retornar `null` si sin sesión.
  - Archivos: Modificar `web/src/lib/empresa.ts`.
  - Dep: ninguna.
  - AC: rol='admin'→'admin'; rol='cajero'→'cajero'; sin sesión→null. (spec: inventory-management / Rol no implementado aún; design dec.1)
  - Est: ~40 loc.

- [x] **T1.2** Hook `useUsuarioRol` + kill-switch `VITE_INVENTARIO_ENABLED`
  - Desc: nuevo `web/src/hooks/useUsuarioRol.ts` que usa `obtenerMiRol()` y expone `{ rol, inventarioHabilitado }`; `inventarioHabilitado = rol==='admin' && import.meta.env.VITE_INVENTARIO_ENABLED !== 'false'`.
  - Archivos: Crear `web/src/hooks/useUsuarioRol.ts`.
  - Dep: T1.1.
  - AC: flag `false` → `inventarioHabilitado=false` aunque rol='admin'.
  - Est: ~40 loc.

- [x] **T1.3** Ruta `/inventario` en `web/src/main.tsx`
  - Desc: registrar ruta lazy `InventarioPage` envuelta en `RequireAuth`.
  - Archivos: Modificar `web/src/main.tsx`.
  - Dep: ninguna.
  - AC: `/inventario` existe; sin auth redirige a login. (threat matrix: Routing)
  - Est: ~15 loc.

- [x] **T1.4** Nav 3 secciones en `web/src/components/Layout.tsx`
  - Desc: `navItems` 2→3 (Venta `/`, Catálogo `/catalogo`, Inventario `/inventario`); ocultar item Inventario si `!inventarioHabilitado`.
  - Archivos: Modificar `web/src/components/Layout.tsx`.
  - Dep: T1.2.
  - AC: vendedor no ve item Inventario en nav. (spec: inventory-management / Vendedor bloqueado)
  - Est: ~25 loc.

- [x] **T1.5** `CatalogoPage` 100% solo lectura
  - Desc: eliminar `ProductoForm`, botón "Vender" (`registrarVentaOffline`) y la bandera `soloLectura`; conservar lista + búsqueda en modo consulta.
  - Archivos: Modificar `web/src/pages/CatalogoPage.tsx`.
  - Dep: ninguna.
  - AC: no existen nodos `ProductoForm` ni botón "Vender"; no referencia `soloLectura`; offline sigue RO. (spec: catalogo-solo-lectura / Catálogo siempre RO, Componentes ausentes, Lectura offline)
  - Est: ~90 loc (neto eliminaciones).

- [x] **T1.6** Reubicar `ProductoForm` a Inventario
  - Desc: mover `web/src/components/ProductoForm.tsx` a `web/src/components/inventario/ProductoForm.tsx` (reutilizable) y ajustar imports.
  - Archivos: Mover `web/src/components/ProductoForm.tsx`.
  - Dep: ninguna.
  - AC: `ProductoForm` no importado por `CatalogoPage`. (spec: catalogo-solo-lectura / Eliminación de componentes)
  - Est: ~20 loc.

- [x] **T1.7** `InventarioPage` shell + DataTable + CRUD
  - Desc: nuevo `web/src/pages/InventarioPage.tsx` admin-gated (redirect si `!inventarioHabilitado`); `DataTable` (SKU, nombre, categoría, costo, precio, stock, badge "Bajo stock" si `stock_actual<=stock_minimo`, valuación footer Σ costo×stock) + toolbar (buscar, filtro categoría, "Nuevo producto"); CRUD vía `ProductoForm`.
  - Archivos: Crear `web/src/pages/InventarioPage.tsx`; usa `web/src/components/inventario/ProductoForm.tsx`; `lib/productos.ts`.
  - Dep: T1.4, T1.6.
  - AC: admin ve CRUD+categorías; alta crea producto con `empresa_id`+`stock_minimo`; baja soft-delete. (spec: inventory-management / Admin accede, CRUD alta, Baja con referencias)
  - Est: ~280 loc.

- [x] **T1.8** Ajuste de stock + valuación + alerta bajo stock
  - Desc: panel/modal en `InventarioPage` que llama `aplicar_ajuste_stock` (cantidad +/-, motivo select: conteo físico/merma/devolución/otro); recalcular valuación tras altas/ajustes; badge bajo stock.
  - Archivos: Modificar `web/src/pages/InventarioPage.tsx`; `lib/productos.ts`.
  - Dep: T1.7, T1.0.
  - AC: ajuste +10 "conteo físico" crea `movimiento_inventario` causa 'ajuste'; stock negativo permitido si config; badge cuando `stock<=stock_minimo`; valuación 10×3+5×4=50. (spec: inventory-management / Ajuste positivo, Ajuste negativo, Alerta bajo stock, Valuación correcta)
  - Est: ~90 loc.

- [x] **T1.9** Tests Vitest Slice 1 (incluye RED threat-matrix)
  - Desc: RED: `/inventario` por URL como cajero → redirect/deny. `CatalogoPage` no renderiza `ProductoForm` ni "Vender". `obtenerMiRol` mapea enums; `useUsuarioRol` respeta flag. Valuación Σ=50. Alerta bajo stock. Ajuste crea movimiento.
  - Archivos: Crear `web/src/**/__tests__/slice1*.test.ts`.
  - Dep: T1.1–T1.8.
  - AC: `vitest run` verde; cubre escenarios catalogo + inventory citados.
  - Est: ~150 loc.

## Slice 2 (Caja UX — sin tocar store/cola)

<!-- slice: 2 -->

- [x] **T2.1** `Carrito.tsx` limpio
  - Desc: nuevo `web/src/components/Carrito.tsx` (ítem, cantidad editable, precio unit, subtotal, total, estado vacío) consumiendo store existente en modo lectura.
  - Archivos: Crear `web/src/components/Carrito.tsx`.
  - Dep: ninguna.
  - AC: 3 líneas muestran desc/cant/subtotal/total; vacío claro. (spec: pos-fina-ux / Carrito múltiples ítems, Carrito vacío)
  - Est: ~120 loc.

- [x] **T2.2** Refresh `PosPage` (tasa + métodos)
  - Desc: integrar `Carrito`; mostrar "1 USD = X Bs" con badge "puede estar desactualizada" si >24h (propuesta design); métodos como chips seleccionables (Efectivo Bs, Efectivo USD, Transferencia). No modificar `useCajaStore`/cola/autoSync.
  - Archivos: Modificar `web/src/pages/PosPage.tsx` + CSS.
  - Dep: T2.1.
  - AC: tasa visible; tasa offline >24h marcada; método registrado y monto convertido. (spec: pos-fina-ux / Tasa visible, Tasa desactualizada, Métodos claros, Refresh sin regresión de cola)
  - Est: ~120 loc.

- [x] **T2.3** Tests regresión offline Slice 2
  - Desc: reusa patrón `caja.test.ts`; venta offline produce evento idéntico en `ventas_pendientes`; badge tasa desactualizada; método registrado. No borrar tests de `modo-caja-offline`.
  - Archivos: Crear `web/src/**/__tests__/slice2*.test.ts`.
  - Dep: T2.1, T2.2.
  - AC: `vitest run` verde; escenario "Refresh sin regresión de cola" pasa.
  - Est: ~80 loc.

## Slice 3 (Split + Cliente + CXC) — requiere verificación patch_08

<!-- slice: 3 -->

- [ ] **T3.0** SQL cxc (`supabase/patch_09_cxc.sql`)
  - Desc: tabla `cuenta_por_cobrar` + FK `abono.cuenta_por_cobrar_id` + RLS `es_de_empresa` + RPCs `aplicar_cxc`, `aplicar_abono_cxc` (`security invoker`, idempotentes por `id_evento`).
  - Archivos: Crear `supabase/patch_09_cxc.sql`.
  - Dep: T3.1.
  - AC: RPC crea cxc idempotente; abono decrementa saldo y marca 'pagada' si saldo<=0. (spec: pos-split-payments / Crédito genera cxc)
  - Est: ~90 loc.

- [ ] **T3.1** VERIFICACIÓN patch_08 en BD (riesgo crítico)
  - Desc: confirmar que `aplicar_venta_offline`, `sesion_caja`, `venta_offline_event` (patch_08) están aplicados en BD destino. Si no: generar/registrar `supabase/patch_08_*.sql` desde design y aplicar antes de T3.0/T4.0. Tarea de precondición, no cuenta como líneas de feature.
  - Archivos: `supabase/` (solo si falta patch_08).
  - Dep: ninguna.
  - AC: patch_08 presente y funcional en BD destino; documentado en HANDOFF.
  - Est: 0 loc feature (verificación).

- [ ] **T3.2** `useCajaStore` campos aditivos
  - Desc: añadir `cliente`, `metodosPago[]`, `split[]` (parte: método, divisa, monto) convergentes al total; conservar firma actual.
  - Archivos: Modificar `web/src/store/useCajaStore.ts`.
  - Dep: T3.1.
  - AC: split no altera venta base; suma converge a total con tasa vigente. (spec: pos-split-payments / Pago dividido)
  - Est: ~60 loc.

- [ ] **T3.3** `lib/cxc.ts`
  - Desc: crear/abonar cxc vía `aplicar_cxc`/`aplicar_abono_cxc`; registrar evento offline idempotente (`id_evento`).
  - Archivos: Crear `web/src/lib/cxc.ts`.
  - Dep: T3.0, T3.2.
  - AC: venta a crédito crea cxc enlazada a venta; cxc offline se encola. (spec: pos-split-payments / Venta a crédito→cxc, Crédito offline)
  - Est: ~90 loc.

- [ ] **T3.4** Cola offline genérica + autoSync registro
  - Desc: generalizar `web/src/lib/colaOffline.ts` a registro por store; `autoSync.iniciarAutoSync` acepta registro stores+RPC (cxc/dev).
  - Archivos: Modificar `web/src/lib/colaOffline.ts`, `web/src/lib/autoSync.ts`.
  - Dep: T3.3.
  - AC: evento cxc flush offline→online con `rpc` mock idempotente. (spec: caja-offline preservado)
  - Est: ~100 loc.

- [ ] **T3.5** UI split + cliente en `PosPage`
  - Desc: UI split (≥2 partes, rechaza si suma≠total), selector cliente (existente/nuevo rápido), crédito→cxc.
  - Archivos: Modificar `web/src/pages/PosPage.tsx`.
  - Dep: T3.2, T3.3.
  - AC: 100 Bs + 1 USD (tasa 100) cubre 200; 150 Bs se bloquea; cliente asociado visible en histórico. (spec: pos-split-payments / Split Bs+USD, Suma insuficiente, Cliente asociado, Cliente nuevo)
  - Est: ~120 loc.

- [ ] **T3.6** Tests Vitest Slice 3
  - Desc: split convergente, suma insuficiente rechazada, cliente asociado, crédito→cxc, cxc offline encolado, RPC idempotente (mock `rpc`).
  - Archivos: Crear `web/src/**/__tests__/slice3*.test.ts`.
  - Dep: T3.2–T3.5.
  - AC: `vitest run` verde; cubre escenarios split-payments citados.
  - Est: ~120 loc.

## Slice 4 (Devoluciones)

<!-- slice: 4 -->

- [ ] **T4.0** SQL devolución (`supabase/patch_09_devolucion.sql`)
  - Desc: RPC `aplicar_devolucion(p_id_evento, p_empresa_id, p_venta_origen_id, p_detalles, p_usuario_id)` `security invoker`: inserta `movimiento_inventario` tipo 'devolucion' + ajusta stock (+cantidad) + opcional decrementa saldo cxc.
  - Archivos: Crear `supabase/patch_09_devolucion.sql`.
  - Dep: T3.1.
  - AC: RPC idempotente; ajusta stock y cxc. (spec: pos-returns / Devolución no rompe cxc)
  - Est: ~40 loc.

- [ ] **T4.1** `lib/devoluciones.ts`
  - Desc: construir evento devolución (total o ítems) + llamar `aplicar_devolucion`; encolar offline igual que venta.
  - Archivos: Crear `web/src/lib/devoluciones.ts`.
  - Dep: T4.0.
  - AC: devolución offline se encola y sincroniza. (spec: pos-returns / Devolución offline)
  - Est: ~100 loc.

- [ ] **T4.2** `DevolucionModal.tsx`
  - Desc: flujo aparte (total o ítems específicos), confirm antes de destructivo, Escape/close.
  - Archivos: Crear `web/src/components/DevolucionModal.tsx`.
  - Dep: T4.1.
  - AC: devolución total reversa líneas + stock(+)+movimiento 'devolucion'; parcial solo ítem. (spec: pos-returns / Devolución total, Devolución parcial)
  - Est: ~120 loc.

- [ ] **T4.3** Integrar devolución en `PosPage`
  - Desc: botón "Devolución" que abre `DevolucionModal`.
  - Archivos: Modificar `web/src/pages/PosPage.tsx`.
  - Dep: T4.2.
  - AC: acceso a flujo aparte desde caja.
  - Est: ~20 loc.

- [ ] **T4.4** Tests Vitest Slice 4
  - Desc: devolución total/parcial ajusta stock + movimiento 'devolucion'; no rompe cxc (decrementa saldo); offline encolado.
  - Archivos: Crear `web/src/**/__tests__/slice4*.test.ts`.
  - Dep: T4.1–T4.3.
  - AC: `vitest run` verde; cubre escenarios returns citados.
  - Est: ~100 loc.

## Slice 5 (Presupuestos)

<!-- slice: 5 -->

- [ ] **T5.1** `lib/cotizaciones.ts` (jsPDF + SheetJS)
  - Desc: generar borrador (ítems, cantidades, precios, cliente) sin afectar stock; export PDF (jsPDF) + Excel (SheetJS) incluyendo `empresa.logo_url` (placeholder nombre si null).
  - Archivos: Crear `web/src/lib/cotizaciones.ts`; requiere `empresa.logo_url` (T1.0) y `lib/empresa.ts`.
  - Dep: T1.0.
  - AC: presupuesto NO descuenta stock; export incluye logo o placeholder nombre; offline genera local. (spec: pos-quotations / Presupuesto sin afectar stock, Export PDF con logo, sin logo, Presupuesto offline)
  - Est: ~150 loc.

- [ ] **T5.2** `CotizacionModal.tsx`
  - Desc: armar presupuesto desde caja, guardar borrador local, botones exportar PDF/Excel.
  - Archivos: Crear `web/src/components/CotizacionModal.tsx`.
  - Dep: T5.1.
  - AC: borrador almacenado; export dispara PDF/Excel.
  - Est: ~120 loc.

- [ ] **T5.3** Integrar presupuesto en `PosPage`
  - Desc: botón "Presupuesto" que abre `CotizacionModal`.
  - Archivos: Modificar `web/src/pages/PosPage.tsx`.
  - Dep: T5.2.
  - Est: ~15 loc.

- [ ] **T5.4** Tests Vitest Slice 5
  - Desc: presupuesto no descuenta stock; export incluye logo/placeholder; generación offline sin red.
  - Archivos: Crear `web/src/**/__tests__/slice5*.test.ts`.
  - Dep: T5.1–T5.3.
  - AC: `vitest run` verde; cubre escenarios quotations citados.
  - Est: ~90 loc.

## Slice 6 (Hardware)

<!-- slice: 6 -->

- [ ] **T6.1** `lib/barcode.ts` (`useBarcodeScanner`)
  - Desc: hook captura global keydown con prefijo/sufijo Enter (keyboard-wedge primario), WebHID como mejora, fallback input manual siempre.
  - Archivos: Crear `web/src/lib/barcode.ts`.
  - Dep: ninguna.
  - AC: código por keydown+Enter llena campo; sin WebHID ofrece input manual. (spec: pos-hardware / Lectura por WebHID, Fallback manual)
  - Est: ~90 loc.

- [ ] **T6.2** `lib/printer.ts` (`usePrinter`)
  - Desc: hook intenta WebUSB ESC/POS; fallback `window.print()` con recibo estilado.
  - Archivos: Crear `web/src/lib/printer.ts`.
  - Dep: ninguna.
  - AC: WebUSB emparejado envía ticket; sin WebUSB abre diálogo print. (spec: pos-hardware / Impresión WebUSB, Fallback print)
  - Est: ~90 loc.

- [ ] **T6.3** Integrar hardware en `PosPage`
  - Desc: `useBarcodeScanner` llena búsqueda/carrito; `usePrinter` botón imprimir comprobante.
  - Archivos: Modificar `web/src/pages/PosPage.tsx`.
  - Dep: T6.1, T6.2.
  - AC: escaneo precarga SKU; impresión usa WebUSB o fallback.
  - Est: ~40 loc.

- [ ] **T6.4** Tests Vitest Slice 6
  - Desc: parse código keydown+Enter; fallback input manual; print fallback invoca `window.print` cuando WebUSB ausente.
  - Archivos: Crear `web/src/**/__tests__/slice6*.test.ts`.
  - Dep: T6.1–T6.3.
  - AC: `vitest run` verde; cubre escenarios hardware citados.
  - Est: ~80 loc.

---

## Notas de ejecución

- **Orden**: Slice 1 (MVP independiente) primero; Slice 2 preserva offline (no toca store); Slice 3/4 requieren **T3.1 (verificación patch_08)** como precondición; Slice 5 usa `empresa.logo_url` de T1.0; Slice 6 es puramente cliente.
- **Offline preservado**: todo slice 2–6 debe correr `vitest run` sin borrar tests de `modo-caja-offline`; contrato `useCajaStore`/cola intacto salvo Slice 3/4.
- **SQL aditivo** (`patch_09_*`, `patch_08` si falta): rollback = DROP de tablas/columnas/RPCs.
- **Vitest ya configurado** (`vitest.config.ts` presente) — no requiere setup previo.
- **Threat matrix**: único caso aplicable (Routing) cubierto por RED test en T1.9.
