<!-- status: proposed | artifact_store: both (Engram + OpenSpec) -->

# Proposal: Rediseño UI Caja e Inventario (estilo Fina)

## Problema / Contexto

Hoy `CatalogoPage` es híbrido: lista productos **y** embebe CRUD (`ProductoForm`) **y** un botón
"Vender" (`registrarVentaOffline`). Además usa `soloLectura = cajaHabilitada && !cajaAbierta`,
atando la edición de productos al estado de la caja. No existe una sección de Inventario: la
gestión de stock, valuación y ajustes vive acoplada y mezclada con la venta. La caja (`PosPage`)
funciona offline (RN-53) pero su UX no es "estilo Fina": carrito, tasa Bs/$ y métodos de pago no
están explícitos, y faltan pagos combinados, cliente/cxc, devoluciones, presupuestos y hardware.

Dolor: responsabilidades mezcladas, edición de catálogo condicionada a caja, nula gestión de
stock/valuación, y caja por debajo del estándar operativo Fina.

## Objetivos

- Nav de 3 secciones: **Venta** (caja) · **Catálogo** (solo lectura) · **Inventario** (nueva, edición).
- Catálogo 100% solo lectura: pierde `ProductoForm`, botón "Vender" y la bandera `soloLectura`.
  La venta queda solo en caja.
- Inventario estilo Fina: CRUD productos + categorías + ajuste de stock (con motivo → movimiento
  auditoría RN-11) + alerta de bajo stock + valuación (Σ costo×stock). **Gated solo ADMIN**.
- Caja estilo Fina completa **menos cajón físico**: carrito limpio + tasa Bs/$ visible + métodos de
  pago claros; pagos combinados (split); asociar cliente + historial; crédito → cuentas por cobrar
  automático; devoluciones (flujo aparte); presupuestos/cotizaciones (PDF/Excel con logo); hardware
  lector de código (SKU/QR) + impresora. **Se preserva siempre el offline multi-dispositivo** (RN-53).

## No-objetivos

- Cajón de dinero físico (no entra en este cambio).
- Cambiar el comportamiento offline de caja (se preserva; RN-53/54/55/56 intactas).
- Reescribir la capa de cola/auto-sync offline (ya archivada en `modo-caja-offline`).
- Factura fiscal, notas de crédito, anulaciones offline (eran out-of-scope en V1).
- Resolución de conflictos complejos entre cajas offline.
- Corregir la deuda técnica del HANDOFF (fuga Storage, `confirm()` nativo) salvo que un slice la
  toque incidentalmente.

## Alcance

### In Scope
- Slice 1: separación de UI (nav 3 secciones + Catálogo solo lectura + página `/inventario` CRUD gated admin).
- Slice 2: refresh UX visual de la caja (carrito, tasa, métodos) sin tocar offline.
- Slice 3: pagos combinados + cliente + crédito→cxc.
- Slice 4: devoluciones.
- Slice 5: presupuestos/cotizaciones.
- Slice 6: hardware (lector + impresora).

### Out of Scope
- Cajón físico, factura fiscal, anulaciones offline, multi-almacén, kits (pendientes de `11-decisiones-cerradas.md`).
- Deuda técnica del HANDOFF no directamente relacionada.

## Capabilities

### New Capabilities
- `inventory-management`: CRUD productos + categorías, ajuste de stock con motivo (RN-11), alerta de
  bajo stock, valuación Σ costo×stock; gated solo admin.
- `pos-fina-ux`: refresh de UX de caja (carrito limpio, tasa Bs/$ visible, métodos de pago claros) preservando offline.
- `pos-split-payments`: pagos combinados (split divisa/método) + asociar cliente + crédito→cxc.
- `pos-returns`: devoluciones (flujo aparte, con auditoría y ajuste de stock).
- `pos-quotations`: presupuestos/cotizaciones exportables PDF/Excel con logo.
- `pos-hardware`: lector de código (USB HID / SKU/QR) + impresora (WebUSB / print navegador).

### Modified Capabilities
- `catalogo-solo-lectura`: de "consulta sin caja abierta" a **sección permanente solo lectura**;
  elimina `ProductoForm`, botón "Vender" y la bandera `soloLectura`.
- `caja-offline`: se rediseña la capa UX de `PosPage` pero **se preservan** los requisitos offline
  (sesión por dispositivo, cola, auto-sync, RN-53/54/55/56).

## Enfoque de alto nivel

- **Separación de responsabilidades**: `ProductoForm` se mueve de `CatalogoPage` a la nueva
  `InventarioPage`. `CatalogoPage` se reduce a lista + búsqueda en modo lectura.
- **Gating admin**: decisión de modelo de rol resuelta en design (pregunta abierta); Inventario solo
  renderiza para admin, con fallback por feature flag si el rol no existe aún.
- **Preservación offline**: `PosPage` se reestiliza por capas (presentacional) sin modificar
  `useCajaStore` ni la cola/auto-sync salvo donde Slice 3/4 lo requieran explícitamente.
- **Faseación por slices**: cada slice es un PR encadenado <400 líneas, revisable de forma aislada.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `web/src/main.tsx` | Modified | rutas: añadir `/inventario`; nav 3 secciones. |
| `web/src/components/Layout.tsx` | Modified | `navItems` de 2 → 3 (Venta, Catálogo, Inventario). |
| `web/src/pages/CatalogoPage.tsx` | Modified | quitar `ProductoForm`, "Vender", `soloLectura`; solo lectura. |
| `web/src/pages/InventarioPage.tsx` | New | CRUD productos + categorías + ajuste stock + valuación; gated admin. |
| `web/src/components/ProductoForm.tsx` | Moved/Reused | reubicado a Inventario (reutilizable). |
| `web/src/lib/productos.ts` | Modified | invocado desde Inventario; ajuste stock con motivo. |
| `web/src/pages/PosPage.tsx` | Modified | UX (Slice 2), split (3), devoluciones (4), presupuestos (5), hardware (6). |
| `web/src/store/useCajaStore.ts` | Modified | campos cliente, cxc, métodos de pago, split. |
| `supabase/` (SQL nuevo, `patch_09_*`) | New | rol/admin, `stock_minimo`, `movimiento_stock`, `cxc`, etc. |

## Faseación (slices + criterio de done)

- **Slice 1 (MVP — UI separation)**: nav 3 secciones + `CatalogoPage` solo lectura (quitar
  `ProductoForm`, "Vender", `soloLectura`) + ruta/página `/inventario` con CRUD + categorías gated
  solo-admin + mover `ProductoForm`.
  - *Done*: nav tiene 3 items; Catálogo no permite edición ni vender; Inventario accesible solo
    admin; alta/baja/modificación de productos y categorías funcional desde Inventario.
- **Slice 2 (Caja UX)**: refresh visual del carrito, tasa Bs/$ visible y métodos de pago claros, sin
  cambiar comportamiento offline.
  - *Done*: carrito con UI limpia y tasa visible; métodos de pago explícitos; cero regresión en
    cola/auto-sync (verificado con los escenarios de `modo-caja-offline`).
- **Slice 3 (Pagos + Cliente + CXC)**: pagos combinados (split), asociar cliente, crédito → cxc automático.
  - *Done*: una venta puede dividirse en ≥2 métodos/divisas; cliente asociado a la venta; venta a
    crédito genera registro cxc.
- **Slice 4 (Devoluciones)**: flujo aparte de devolución.
  - *Done*: devolución registra movimiento auditoría (RN-11) y ajusta stock; no rompe cxc ni offline.
- **Slice 5 (Presupuestos)**: cotizaciones PDF/Excel con logo.
  - *Done*: generar presupuesto y exportar PDF/Excel con logo de la empresa.
- **Slice 6 (Hardware)**: lector de código + impresora.
  - *Done*: lector USB HID llena SKU/QR en caja; impresión de comprobante vía WebUSB/print con fallback.

## Riesgos / Dependencias

| Riesgo | Likelihood | Mitigación |
|--------|------------|------------|
| Regresión offline al refactorizar `PosPage` | High | Slice 2 solo toca capa presentacional; tests de regresión de cola/sync en cada slice que toque caja; preservar `useCajaStore`/cola. |
| Gating admin sin modelo de rol hoy | Med | Resolver en design; feature flag temporal o columna `rol` mínima en Slice 1. |
| Tamaño del cambio | High | Faseación en slices; PRs encadenados <400 líneas (ver `chained-pr`). |
| Migración de datos / columnas nuevas | Low | SQL aditivo (`patch_09_*`); no rompe esquema vigente. |
| APIs navegador (WebUSB/WebHID) con soporte variable | Med | Fallback a input manual / print del navegador. |

Dependencias:
- **Test runner (Vitest)** recomendado antes de implementar (el proyecto no tiene hoy); `sdd-design`
  debe fijar estrategia de test de regresión offline.
- `@supabase/supabase-js` v2 (ya presente) para RLS por `empresa_id` y upserts.
- Decisiones de design (preguntas abiertas) que definen esquema SQL de Slice 1.

## Rollback Plan

- SQL nuevo es aditivo (`patch_09_*`); rollback = `DROP` de los parches y eliminar `InventarioPage`
  + módulos de slice.
- Cada slice es un PR independiente: revertir un slice no afecta a los anteriores (cambios
  presentacionales o columnas aditivas).
- La caja offline queda intacta salvo Slice 3/4; si falla, revertir esos PRs restaura el
  comportamiento previo.

## Preguntas abiertas (resolver en design, NO acá)

1. ¿Campo `rol`/admin en `public.usuario`? (para gating de Inventario)
2. ¿Columna `stock_minimo` en `producto`? (alerta de bajo stock)
3. ¿Tabla de ajustes/movimientos de stock? (RN-11 auditoría)
4. ¿Modelo de cxc / crédito? (crédito → cxc)
5. ¿Integración lector (USB HID barcode) e impresora (WebUSB / print navegador)?

## Success Criteria

- [ ] Nav tiene 3 secciones; Catálogo es solo lectura sin `ProductoForm`/`Vender`/`soloLectura`.
- [ ] Inventario permite CRUD + categorías + ajuste stock con motivo + alerta bajo stock + valuación, solo para admin.
- [ ] Caja muestra carrito limpio, tasa Bs/$ y métodos claros, sin regresión offline.
- [ ] Pagos combinados + cliente + crédito→cxc funcionan.
- [ ] Devoluciones y presupuestos operan; hardware lector/impresora integrado con fallback.
- [ ] Comportamiento offline multi-dispositivo (RN-53) se preserva en todos los slices.
