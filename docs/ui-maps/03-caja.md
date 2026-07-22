# 03 — Caja (PosPage) — 2 pantallas

## Pantalla 1: Venta

```
.pos                              ← contenedor raíz
│
├── .pos-grid                     ← layout 2 columnas (grid CSS)
│   │
│   ├── .pos-productos            ← columna izquierda: catálogo
│   │   ├── .pos-search-row
│   │   │   ├── .pos-busqueda       barra de búsqueda (F2 enfoca)
│   │   │   ├── .pos-view-toggle    toggle grid ↔ lista
│   │   │   └── .pos-readonly-badge "Solo lectura" (caja cerrada)
│   │   │
│   │   ├── [vista lista] .pos-sugerencias
│   │   │   └── .pos-producto-list × N   fila clickeable
│   │   │       ├── .pos-sugerencia-nombre
│   │   │       ├── .pos-sugerencia-sku
│   │   │       ├── .pos-sugerencia-precio
│   │   │       └── .stock-badge         "En stock" / "Stock bajo" / "Agotado"
│   │   │
│   │   └── [vista grid] .pos-productos-grid
│   │       └── .card-producto × N       (con .pos-card-add overlay)
│   │
│   └── .pos-wizard-panel         ← columna derecha: carrito
│       └── .pos-wizard-content
│           ├── <Carrito />         items, totales USD/BS, tasa
│           └── .carrito-ticket-acciones
│               └── btn.primary     "Cobrar — $XX.XX" → pantalla 2
│
├── .pos-vacio                    "Sin productos que coincidan"
└── msg                           mensaje éxito/error
```

## Pantalla 2: Pago

```
.pos
└── .pos-pago-wrapper             ← wrapper centrado
    └── .pos-pago                  ← contenedor del pago
        │
        ├── [ventaExitosa]
        │   └── .pos-pago-exito
        │       ├── .pos-pago-exito-icon    check_circle
        │       ├── .pos-pago-exito-titulo  "Venta registrada"
        │       ├── .pos-pago-exito-total   "$XX.XX"
        │       └── btn.primary             "Nueva venta"
        │
        └── [no exitosa]
            ├── .pos-pago-header
            │   ├── btn.wf-btn-atras        "Volver" → pantalla 1
            │   └── .wf-titulo              "Cobrar"
            │
            ├── .pos-pago-seccion           resumen productos
            │   ├── .wf-pago-label            "Productos"
            │   ├── .wf-resumen-items-header  Item | Cant | P.Unit | Subtotal
            │   └── .wf-resumen-items-row × N
            │
            ├── .pos-pago-sección           cliente (opcional)
            │   └── .wf-cliente-campo       Nombre + Cédula
            │
            ├── .pos-pago-sección           método de pago
            │   └── .wf-pago-radio × N     Contado | Crédito | etc.
            │
            ├── .pos-pago-sección           instrumentos de pago
            │   └── .wf-pago-instrumento × N
            │       ├── select tipo         efectivo/tarjeta/transferencia
            │       ├── select moneda       USD / BS
            │       └── input monto
            │
            ├── .pos-pago-confirmar
            │   └── btn.wf-btn-confirmar    "Confirmar venta"
            │
            └── .pos-pago-msg               error/mensaje
```

## Estados

- `soloLectura` = caja habilitada pero cerrada → productos solo lectura, botones deshabilitados
- `pantalla` = `'venta'` | `'pago'` → alterna entre las dos pantallas
- `ventaExitosa` → muestra pantalla de éxito
