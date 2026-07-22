# 04 — Catálogo (CatalogoPage) — SOLO LECTURA

```
.catalogo                         ← contenedor raíz
│
├── .catalogo-toolbar             ← barra superior (borde + backdrop-blur)
│   ├── .catalogo-head            ← lado izquierdo
│   │   ├── .catalogo-title         "Catálogo de productos"
│   │   └── .catalogo-sub           "582 productos"
│   │
│   ├── .catalogo-filtros         ← filtro de categoría
│   │   └── .filtro-cat             select "Todas las categorías" / categoría X
│   │
│   └── .catalogo-head-actions    ← lado derecho
│       ├── .buscador               "Buscar por nombre, SKU o código"
│       ├── .check                  checkbox "Solo activos"
│       └── .toggle-vista           grid ↔ lista
│
├── .catalogo-body
│   └── .catalogo-main
│       ├── .error                  mensaje de error
│       ├── .aviso-cache            "catálogo sin conexión (cached)"
│       ├── [loading]               "Cargando…"
│       │
│       ├── [vista grid] .productos-grid-scroll (ref: gridScrollRef)
│       │   └── .productos-grid
│       │       └── .card-producto × N
│       │           ├── .card-img
│       │           │   ├── img (o .thumb-empty si no hay imagen)
│       │           │   └── .ribbon.ok/.warn/.off  "En stock"/"Stock bajo"/"Agotado"
│       │           └── .card-info
│       │               ├── .card-sku       <code>COC0001</code>
│       │               ├── .card-nombre    "Filtro rosca 1/4"
│       │               ├── .card-meta      "Ferretería"
│       │               └── .card-footer
│       │                   ├── .card-precio  "$1.50" / .badge.warn "sin precio"
│       │                   └── .card-stock   "120 uds" / .warn / .off
│       │
│       ├── [vista lista] <DataTable> (ref: listaScrollRef)
│       │   └── columnas: SKU | img | Nombre | Categoría | Precio USD | Stock | Estado
│       │
│       ├── .sentinela              IntersectionObserver → scroll infinito
│       └── .loading-more           "Cargando más…"
│
└── (NO tiene modales ni acciones CRUD)
```

## Comportamiento

- **Solo lectura permanente** — sin crear/editar/borrar/vender
- Scroll infinito via `IntersectionObserver` en `.sentinela`
- Caché offline via `obtenerCatalogo()` → `.aviso-cache`
- `soloActivos` checkbox filtra solo productos activos (default: true)
- Vista grid por defecto
