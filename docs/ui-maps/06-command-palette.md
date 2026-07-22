# 06 — CommandPalette (Ctrl+K)

```
.palette-backdrop                 ← fondo oscuro (click cierra)
└── .palette                      ← contenedor del palette
    ├── .palette-input            ← input de búsqueda (auto-focus)
    │   placeholder="Buscar producto o escribí un comando…"
    │
    └── .palette-list             ← lista de resultados
        │
        ├── [sin query]            items de navegación
        │   └── li > button
        │       ├── .palette-ico    arrow_forward
        │       └── label           "Ir a Venta" / "Ir a Catálogo" / "Nuevo producto"
        │
        ├── [query + 0 resultados]
        │   └── .palette-empty     "Sin coincidencias"
        │
        └── [query + resultados]   productos encontrados
            └── li > button
                ├── .palette-ico    inventory_2
                ├── .palette-nombre nombre del producto
                └── .palette-sku    <code>COC0001</code>
```

## Comportamiento

- Se abre con Ctrl+K (o Cmd+K en Mac) desde cualquier página excepto `/`
- Búsqueda con debounce de 200ms → `listarProductos({ search, pageSize: 8 })`
- Click en resultado → navega a `/catalogo`
- Click en backdrop o Escape → cierra
- Muestra solo 8 resultados máximo
