# Decisiones Cerradas de Negocio
## Proyecto Ferretería Bimonetaria

**Estado:** Fase 0 cerrada + Stack Fase 1 definido — resolución de preguntas abiertas de `01` y decisiones técnicas de `08`
**Relación:** Cierra las preguntas de `01-supuestos-y-preguntas-abiertas.md` §3. Cada decisión cita la regla de negocio resultante en `02-reglas-de-negocio.md`.

> **Trazabilidad:** Las decisiones aquí son *Decisión aprobada* (no supuesto). Las que dependen de contexto real del negocio se marcan como *Pendiente de validación con el cliente*.

## 1. Sobre ventas (cierra `01` §3.1)

| Pregunta | Decisión | Estado | Regla resultante |
|---|---|---|---|
| ¿Factura fiscal o comprobante interno? | Comprobante interno en esta fase; factura fiscal queda como fase posterior. | Decisión aprobada | RN-31 |
| ¿Presupuestos además de facturas? | No en MVP; se modela como venta en borrador (cotización) sin afectar stock. | Decisión aprobada | RN-32 |
| ¿Devoluciones / notas de crédito / anulaciones? | Sí: anulación de venta cerrada con autorización, y nota de crédito por devolución de mercancía. | Decisión aprobada | RN-33, RN-34 |
| ¿Modificar venta cerrada? | No. Solo anulación + re-emisión o nota de crédito. | Decisión aprobada | RN-33 |
| ¿Descuentos por ítem, factura o ambos? | Ambos: descuento por línea y descuento global de venta. | Decisión aprobada | RN-35 |

## 2. Sobre caja (cierra `01` §3.2)

| Pregunta | Decisión | Estado | Regla resultante |
|---|---|---|---|
| ¿Apertura de caja por usuario/turno? | **No obligatoria**: el administrador decide si se usa control de caja (RN-53). | Decisión aprobada | RN-36, RN-53 |
| ¿Múltiples cajas simultáneas? | Una caja por dispositivo en MVP; multi-caja queda para fase posterior. | Pendiente de validación | RN-37 |
| ¿Control de disponible físico por moneda y método? | Sí, el sistema registra disponible esperado por moneda y método. | Decisión aprobada | RN-38 |
| ¿Sugerencia de vuelto según caja? | El sistema calcula vuelto; la sugerencia según disponible físico es opcional en MVP. | Decisión aprobada | RN-39 |

## 3. Sobre clientes y crédito (cierra `01` §3.3)

| Pregunta | Decisión | Estado | Regla resultante |
|---|---|---|---|
| ¿Crédito manual, automático o aprobación? | Automático si saldo + venta ≤ límite; si excede, requiere aprobación de administrador. | Decisión aprobada | RN-40 |
| ¿Vencimiento de crédito por días? | Sí, plazo de crédito configurable por cliente (días). | Decisión aprobada | RN-41 |
| ¿Bloquear venta si excede límite? | Sí, bloqueo salvo aprobación explícita. | Decisión aprobada | RN-18 (ya existente) |
| ¿Estados de cuenta? | Sí, el sistema emite estado de cuenta de la cartera. | Decisión aprobada | RN-42 |
| ¿Cobranza con seguimiento o solo registro? | Registro contable en MVP; seguimiento de cobranza en fase posterior. | Pendiente de validación | RN-43 |

## 4. Sobre inventario (cierra `01` §3.4)

| Pregunta | Decisión | Estado | Regla resultante |
|---|---|---|---|
| ¿Un almacén o varios? | Un almacén en MVP; multi-almacén en fase posterior. | Pendiente de validación | RN-44 |
| ¿Inventario por anaquel/ubicación? | No en MVP; se registra solo cantidad global. | Pendiente de validación | RN-45 |
| ¿Productos sin código de barras? | Sí, el código de barras es opcional; la identidad interna siempre existe. | Decisión aprobada | RN-09 (ya existente) |
| ¿Costo: promedio, último o manual? | Costo promedio móvil por defecto; ajuste manual autorizado. | Decisión aprobada | RN-46 |
| ¿Kits, combos o equivalencias? | No en MVP; se modelan como productos independientes. | Pendiente de validación | RN-47 |

## 5. Sobre compras (cierra `01` §3.5)

| Pregunta | Decisión | Estado | Regla resultante |
|---|---|---|---|
| ¿Compras afectan costo de venta? | Sí, actualizan costo promedio según RN-46. | Decisión aprobada | RN-23 (ya existente) |
| ¿Órdenes de compra previas? | No en MVP; la compra se registra directa al recibir mercancía. | Pendiente de validación | RN-48 |
| ¿Recepción parcial? | No en MVP; recepción total de la factura. | Pendiente de validación | RN-49 |
| ¿Devoluciones a proveedor? | Sí, nota de crédito a proveedor. | Decisión aprobada | RN-50 |

## 6. Sobre operación técnica (cierra `01` §3.6)

| Pregunta | Decisión | Estado |
|---|---|---|
| ¿Escenario real de cortes? | Cortes eléctricos y de red frecuentes; duración variable. | Hecho validado |
| ¿Usuarios concurrentes? | Hasta ~5 usuarios en MVP. | Pendiente de validación |
| ¿Dispositivos reales? | PCs/tablets en mostrador; al menos un dispositivo por turno. | Hecho validado |
| ¿Acceso remoto? | No en MVP. | Decisión aprobada |
| ¿Sincronización transparente o cola visible? | Cola de pendientes visible para el usuario. | Decisión aprobada |

## 7. Configurabilidad y adaptación al negocio

> **Principio rector:** el sistema no debe trabajar en contra del negocio. Todo control que pueda ser contraproducente cuando es variable debe poder ser habilitado o deshabilitado por el administrador, sin requerir cambios de código.

- **Control de caja no obligatorio** → RN-53. El admin habilita o deshabilita apertura/cierre; si lo deshabilita, la venta y el cobro funcionan sin caja.
- **Venta sin stock disponible** → RN-54. Configurable; la venta no se bloquea de forma fija e inmodificable.
- **Stock negativo** → RN-55. Configurable según operación del negocio.
- **Parámetros habilitables por admin** → RN-56. Caja, stock, descuentos, crédito, IGTF y validaciones se exponen como parámetros activables/desactivables.

## 8. Resumen de pendientes de validación con el cliente

- Multi-caja, multi-almacén, ubicación, kits/combos.
- Cobranza con seguimiento.
- Órdenes de compra y recepción parcial.
- Número exacto de usuarios concurrentes.

## 9. Decisiones de stack (Fase 1, cerradas 2026-07-16)

| Ítem | Decisión | Estado | Documento |
|---|---|---|---|
| Backend | Node.js (TypeScript) | Hecho | `08` §1 |
| Frontend | React PWA (web pura) | Hecho | `08` §1 |
| BD principal | SQLite local (migrable a PostgreSQL) | Hecho | `08` §1 |
| BD cliente | IndexedDB (PWA/Service Worker) | Hecho | `08` §1 |
| Sincronización | Offline-first con réplica local | Hecho | `08` §1 |
| Impresión | Impresora térmica desde el inicio | Hecho | `08` §1 |
| SKU automático | Formato fijo por definir | Pendiente de Fase 1 avanzada | `08` §3 |
| Imágenes | Compresión obligatoria a tamaño fijo | Pendiente de Fase 1 avanzada | `08` §3 |
| Tasa BCV | Automatización por decidir | Pendiente de Fase 1 avanzada | `08` §3 |
| Protocolo impresión | ESC/POS, librería por elegir | Pendiente de Fase 1 avanzada | `08` §3 |
| Esquema sincronización/conflictos | Por diseñar | Pendiente de Fase 1 avanzada | `08` §3 |

## 10. Modificación de stack — Supabase como backend en la nube (2026-07-17)

> **Decisión modificatoria de §9.** Surge de la restricción del dueño: la app debe (a) usarse ya en su ferretería, (b) venderse luego a familiares sin costo de funcionamiento, y (c) instalarse sin conocimiento técnico. Además se exigió: datos seguros si la PC se daña, acceso desde otro dispositivo/teléfono, y operación ante caída de luz/internet.

| Ítem | Decisión anterior (`08` §1) | Nueva decisión | Estado | Documento |
|---|---|---|---|---|
| BD principal | SQLite local (migrable a Postgres) | **Postgres en Supabase (plan free) desde el inicio** | Hecho | `08` §1, presente |
| Multi-tenant | No contemplado | **Un proyecto Supabase, datos por `empresa_id` + Row Level Security** | Hecho | presente |
| Offline | Offline-first con réplica local | **Fase 2 MVP: online contra Supabase; offline (IndexedDB + cola) en Fase 4** | Hecho / Pendiente | `08` §3 |
| Costo | — | $0 mientras esté en plan free de Supabase | Hecho | presente |

**Justificación:** PWA pura 100% local (IndexedDB) perdía datos si la PC moría y no permitía multi-dispositivo; SQLite local requería servidor que el usuario no puede operar. Supabase free cubre respaldo en nube, acceso multi-dispositivo/teléfono y escala a N ferreterías familiares sin crear un proyecto por cliente. El usuario final solo abre la PWA (icono instalable); el dueño opera el proyecto Supabase.

**Credenciales:** se usó la **Publishable key** (`sb_publishable_...`) en el frontend (equivalente a `anon`, segura de exponer). La **Secret key** (`sb_secret_...`) queda reservada para backend/Edge Functions (Fase 4) y no se commitea.

**Seed de catálogo ejecutado (2026-07-17):** se aplicó `supabase/schema_fase2.sql` y se corrió `supabase/seed_catalogo.py`. Resultado: empresa **FerrehogarMart** creada, **564 productos** insertados (86 sin precio → `precio_usd=0`, editables desde la app), **72 imágenes** `.webp` subidas a bucket `productos/`. El seed es idempotente (re-corrible sin duplicar).

**Rotación de secret keys (2026):** Supabase deprecó las `service_role` legacy. Hoy se usan **Secret keys `sb_secret_...`** que se revocan individualmente sin downtime (Dashboard → Settings → API Keys → pestaña Publishable and secret → ⋯ → Delete/Revoke). Si una secret key se expone en chat/log, ROTALA y crea una nueva; NUNCA se pega en el chat ni la corre el asistente.

**Pendiente de actualizar:** `08-opciones-de-stack-y-decisiones.md` debe reflejar Postgres/Supabase en lugar de SQLite local como BD principal. → YA ACTUALIZADO esta sesión.
