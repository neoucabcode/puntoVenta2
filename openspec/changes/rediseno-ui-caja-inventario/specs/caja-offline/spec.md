# Delta for caja-offline (Preservación)

> **Sin cambios de comportamiento.** Este cambio (`rediseno-ui-caja-inventario`) rediseña la capa
> UX de `PosPage` y añade secciones, pero **NO redefine** los requisitos offline ya aprobados en
> `modo-caja-offline`. Se citan para trazabilidad y se declaran preservados en todos los slices.

## PRESERVED Requirements

Los siguientes requisitos de `modo-caja-offline` permanecen intactos y obligatorios:

- **Sesión de caja por dispositivo** (REQ-1 / RN-53, RN-56): apertura/cierre por `device_id`;
  caja no obligatoria, habilitada por admin.
- **Catálogo solo-lectura cuando aplica** (REQ-2 base): ver delta `catalogo-solo-lectura` (este
  cambio lo hace permanente, pero la parte offline de la restricción se mantiene).
- **Cola offline de ventas** (REQ-3 / RN-11, idempotencia): persistencia en IndexedDB con
  `id_evento` idempotente; la venta offline no bloquea stock (RN-54/55).
- **Auto-sync silencioso** (REQ-4 / RN-54/55/56, RN-11): sync automático al reconectar, upsert
  idempotente por `id_evento`, `movimiento_stock` de auditoría sin bloquear.

### Reglas de negocio preservadas (no redefinidas)

- RN-53: caja habilitada por admin, no obligatoria.
- RN-54 / RN-55: la venta offline no se bloquea ni revierte por falta de stock; stock negativo
  permitido si la configuración lo habilita.
- RN-56: parámetros de caja son configuración de admin (por tenant).
- RN-11: toda salida/entrada de stock se registra como auditoría.

> Cualquier slice que toque `PosPage` (2–6) DEBE verificar regresión contra estos requisitos
> mediante los escenarios de `modo-caja-offline`.
