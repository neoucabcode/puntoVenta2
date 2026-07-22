# Specs: Modo Caja Offline (V1)

Delta specs para el cambio `modo-caja-offline`. Cada requirement mapea a una capacidad de la
propuesta (`caja-offline`, `catalogo-solo-lectura`, `cola-offline`, `auto-sync-ventas`).

Convención de archivos: `specs/<req>.md` (un archivo por requirement).

## Trazabilidad con reglas de negocio

| Req | Reglas aplicadas | Capacidad propuesta |
|-----|------------------|---------------------|
| REQ-1 | RN-53 (caja no obligatoria, habilitada por admin) | `caja-offline` |
| REQ-2 | RN-53 (sin caja = solo consulta) | `catalogo-solo-lectura` |
| REQ-3 | RN-11 (auditoría), idempotencia offline | `cola-offline` |
| REQ-4 | RN-54/55 (stock no bloquea), RN-56 (parámetros admin), RN-11 | `auto-sync-ventas` |

> **Fuera de V1 (no cubierto por estos specs):** deuda técnica conocida del HANDOFF (fuga Storage
> multi-tenant, `confirm()` nativo, paginación falsa), resolución de conflictos complejos entre
> cajas, factura fiscal y anulaciones offline. Véase `proposal.md` §Scope / Out of Scope.
