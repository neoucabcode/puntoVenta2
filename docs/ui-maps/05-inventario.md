# 05 — Inventario (InventarioPage) + ProductoForm

## InventarioPage

```
.inventario                       ← contenedor raíz
│
├── .inv-toolbar                  ← barra superior (borde + backdrop-blur, = catálogo)
│   ├── .inv-head                 ← lado izquierdo
│   │   ├── .inv-title              "Inventario"
│   │   └── .inv-sub                "582 productos · 3 con bajo stock"
│   │
│   ├── .inv-filtros              ← filtro de categoría
│   │   └── .filtro-cat             select
│   │
│   └── .inv-acciones             ← lado derecho
│       ├── .buscador               "Buscar por nombre, SKU o código"
│       ├── .toggle-vista           grid ↔ lista
│       ├── .nueva-cat              "+ Categoría" (details/summary)
│       ├── btn.ghost               Historial (ícono history)
│       ├── btn.ghost               Ajuste de stock (ícono scale)
│       └── btn.primary             Nuevo producto (ícono add)
│
├── .error                        mensaje de error
├── [loading]                     "Cargando…"
│
├── [vista grid] .productos-grid-scroll > .productos-grid
│   └── .card-producto × N
│       ├── .card-img              imagen + ribbon de stock
│       ├── .card-info
│       │   ├── .card-sku           <code>COC0001</code>
│       │   ├── .card-nombre        "Filtro rosca 1/4"
│       │   ├── .card-meta          "Ferretería"
│       │   ├── .card-footer        .card-precio + .card-stock
│       │   ├── .card-costo         "$0.50"
│       │   └── .card-actions       editar | desactivar | eliminar
│       └── .card-producto.inactivo → opacity 0.55
│
├── [vista lista] <DataTable>
│   └── columnas: SKU | Nombre | Categoría | Costo | Precio | Stock | Acciones
│
├── .inv-valuacion                footer valuación
│   ├── .inv-valuacion-label       "Valuación de inventario"
│   ├── .inv-valuacion-monto       "$X.XX"
│   └── .inv-valuacion-nota        "Σ (costo × stock)"
│
├── [ProductoForm]                modal creación/edición
├── [AjusteStockModal]            modal ajuste de stock
├── [ConfirmarEliminarModal]      modal doble confirmación
└── [HistorialModal]              modal historial de cambios
```

## ProductoForm (modal)

```
.modal-backdrop                   ← fondo oscuro (click cierra)
└── .modal                        ← contenedor del formulario
    ├── .modal-header
    │   ├── h2                      "Editar producto" / "Nuevo producto"
    │   └── btn ×                   cerrar (Escape también cierra)
    │
    ├── form.form-grid             ← grid 2 columnas
    │   ├── .span-2  Nombre* (input)
    │   ├── SKU (input, read-only si auto-gen activo)
    │   ├── .check   Auto-generar SKU (solo admin)
    │   ├── <SkuPreview />          preview SKU generado
    │   ├── Código barras (input)
    │   ├── Categoría (select)
    │   ├── Unidad (input)
    │   ├── Costo USD (input number)
    │   ├── Precio USD* (input number)
    │   ├── Stock actual (input number)
    │   ├── Stock mínimo (input number)
    │   ├── .span-2  URL imagen (input)
    │   ├── .span-2  Subir imagen (file input)
    │   ├── .check .span-2  Activo (checkbox)
    │   └── .error .span-2  mensaje de error
    │
    └── .span-2.modal-footer
        ├── btn "Regenerar SKU" (solo admin + edición + auto-gen)
        ├── btn "Cancelar"
        └── btn.primary "Guardar" / "Crear"
```

## ConfirmarEliminarModal (doble paso)

```
.modal-backdrop
└── .modal
    ├── .modal-header
    │   ├── h2  "Eliminar producto" (paso 1) / "Confirmar eliminación" (paso 2)
    │   └── btn ×
    └── form.form-grid
        ├── [paso 1]
        │   ├── .confirmar-delete-step  warning + "¿Eliminar X?"
        │   └── .modal-footer  Cancelar | Eliminar
        │
        └── [paso 2]
            ├── .confirmar-delete-step  "Escribe el nombre para confirmar"
            ├── .confirmar-delete-input  input (debe coincidir con nombre)
            └── .modal-footer  Cancelar | Confirmar eliminación
```

## States

- `editId` → null (nuevo) | string (edición) → muestra ProductoForm
- `showNuevo` → boolean → muestra ProductoForm para crear
- `ajusteOpen` → boolean → muestra modal ajuste de stock
- `deleteTarget` → null | {producto, mode} → muestra ConfirmarEliminarModal
- `historialOpen` → boolean → muestra HistorialModal
- `vista` → `'grid'` | `'lista'` (default: `'lista'`)
