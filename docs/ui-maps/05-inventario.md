# 05 — Inventario (InventarioPage) + ProductoForm

## Paleta de colores (relevantes)

| Elemento | Variable | Dark | Light | Uso |
|---|---|---|---|---|
| Fondo página | `--bg-base` | `#0f0f0f` | `#f6f7f9` | Fondo detrás del toolbar |
| Toolbar fondo | `color-mix(in srgb, var(--bg-base) 88%, transparent)` | ~`#0f0f0f` 88% opaco | ~`#f6f7f9` 88% opaco | Fondo semitransparente |
| Toolbar blur | `backdrop-filter: blur(12px)` | — | — | Efecto vidrio esmerilado |
| Card fondo | `--surface-1` | `#1a1a1a` | `#ffffff` | Fondo de cada card |
| Card borde | `--border` | `#2a2a2a` | `#e2e5ea` | Borde de cards |
| Card radius | `--radius-lg` | `12px` | `12px` | Esquinas redondeadas |
| Card sombra | `box-shadow: 0 8px 24px rgba(0,0,0,0.08)` | — | — | Sombra sutil |
| Bajo stock badge | `--warn` | `#f59e0b` | `#b45309` | Badge naranja "Bajo stock" |
| Agotado | `--off` | `#ef4444` | `#dc2626` | Ribbon rojo |
| Botón primario | `--accent` | `#22c55e` | `#16a34a` | "Nuevo producto" verde |
| Botón primario texto | `--primary-ink` | `#052e16` | `#ffffff` | Texto sobre botón verde |
| Botón ghost | `--surface-1` | `#1a1a1a` | `#ffffff` | Botones secundarios |
| Botón ghost borde | `--border` | `#2a2a2a` | `#e2e5ea` | Borde de ghost buttons |
| Modal backdrop | `rgba(0,0,0,0.5)` | — | — | Fondo oscuro detrás del modal |
| Modal fondo | `--surface-1` | `#1a1a1a` | `#ffffff` | Fondo del modal |
| Modal borde | `--border` | `#2a2a2a` | `#e2e5ea` | Borde del modal |

## Estructura

```
.inventario                       ← contenedor raíz
│   │   Display: flex, flex-direction: column
│   │   Flex: 1, min-height: 0
│   │   Padding: 0 (viene de .content del Layout)
│
├── .inv-toolbar                  ← barra superior sticky (= catálogo)
│   │   Position: sticky, top: 0, z-index: 10
│   │   Display: flex, flex-wrap: wrap
│   │   Gap: 0.75rem 1rem
│   │   Align-items: flex-end
│   │   Justify-content: space-between
│   │   Margin-bottom: 1rem
│   │   Padding: 0.8rem 0.95rem
│   │   Background: color-mix(in srgb, var(--bg-base) 88%, transparent)
│   │   Backdrop-filter: blur(12px)
│   │   Border: 1px solid var(--border)
│   │   Border-radius: var(--radius-lg) → 12px
│   │   Box-shadow: 0 10px 28px rgba(0,0,0,0.12)
│   │
│   ├── .inv-head                 ← lado izquierdo
│   │   │   Display: flex, flex-direction: column
│   │   │   Gap: 0.15rem
│   │   │
│   │   └── .inv-sub                "582 productos · 3 con bajo stock"
│   │       Color: var(--text-secondary) → dark: #a1a1aa
│   │       Font-size: 0.85rem
│   │       Display: flex, align-items: center, gap: 0.5rem
│   │       (El .inv-title se movió al .topbar-page-title)
│   │
│   ├── .inv-filtros              ← filtro de categoría
│   │   │   Display: flex, gap: 0.5rem
│   │   └── .filtro-cat             select (= catálogo)
│   │
│   └── .inv-acciones             ← lado derecho
│       │   Display: flex, flex-wrap: wrap, gap: 0.5rem
│       │   Align-items: center, flex: 1 1 420px
│       │   Justify-content: flex-end
│       │
│       ├── .buscador               "Buscar por nombre, SKU o código"
│       │   (= catálogo)
│       │
│       ├── .toggle-vista           grid ↔ lista
│       │   (= catálogo, default: 'lista')
│       │
│       ├── .nueva-cat              "+ Categoría" (details/summary)
│       │   Summary: cursor pointer, font-weight 600
│       │   .row: display flex, gap 0.5rem
│       │   Input + button "Crear"
│       │
│       ├── btn.ghost               Historial (ícono history)
│       │   Background: var(--surface-1)
│       │   Border: 1px solid var(--border)
│       │   Padding: 0.55rem 0.9rem
│       │   Border-radius: var(--radius-sm) → 7px
│       │   Color: var(--text-primary)
│       │   Font-weight: 600, font-size: 0.9rem
│       │   Hover: border-color var(--border-strong), background var(--surface-2)
│       │
│       ├── btn.ghost               Ajuste de stock (ícono scale)
│       │   (= ghost anterior)
│       │
│       └── btn.primary             Nuevo producto (ícono add)
│           Background: var(--accent) → #22c55e
│           Color: var(--primary-ink) → #052e16
│           Padding: 0.55rem 0.9rem
│           Border: 0 (sin borde)
│           Border-radius: var(--radius-sm) → 7px
│           Font-weight: 700
│           Box-shadow: 0 8px 18px rgba(34, 197, 94, 0.16)
│           Hover: background var(--accent-hover) → #16a34a
│
├── .inv-body                     ← wrapper de contenido (= .catalogo-body)
│   │   Display: flex, flex-direction: column
│   │   Gap: 1rem
│   │   Flex: 1, min-height: 0
│   │
│   └── .inv-main                 ← área scrollable (= .catalogo-main)
│       │   Display: flex, flex-direction: column
│       │   Flex: 1, min-height: 0
│       │   Overflow: hidden
│       │
│       ├── .error                  mensaje de error (= catálogo)
│       ├── [loading]               "Cargando…"
│       │
│       ├── [vista grid] .productos-grid-scroll > .productos-grid
│       │   (= catálogo, pero con acciones extras en .card-info)
│       │   └── .card-producto × N
│       │       ├── .card-img          (= catálogo)
│       │       │   └── .ribbon.warn   "⚠ Bajo stock" (solo si esBajoStock)
│       │       └── .card-info
│       │           ├── .card-sku       (= catálogo)
│       │           ├── .card-nombre    (= catálogo)
│       │           ├── .card-meta      (= catálogo)
│       │           ├── .card-footer    (= catálogo)
│       │           ├── .card-costo     ← EXTRA vs catálogo
│       │           │   Font-size: 0.85rem
│       │           │   Color: var(--text-secondary)
│       │           │   .num-tab → font-variant-numeric: tabular-nums
│       │           └── .card-actions   ← EXTRA vs catálogo
│       │               │   Display: flex, gap: 0.25rem
│       │               │   Margin-top: 0.5rem
│       │               ├── btn edit → ícono edit
│       │               ├── btn desactivar → ícono visibility_off
│       │               ├── btn eliminar → ícono delete (color var(--off))
│       │               └── btn reactivar → ícono check_circle (solo si !activo)
│       │
│       ├── [vista lista] <DataTable>
│       │   │   (= catálogo, pero con columnas extra)
│       │   └── columnas: SKU | Nombre | Categoría | Costo | Precio | Stock | Acciones
│       │       .inv-stock → display inline-flex, align-items center, gap 0.4rem
│       │       .inv-badge-bajo → badge naranja inline en columna stock
│       │       .dt-actions → botones de acción por fila
│       │
│       └── .sentinela              (scroll infinito, no aplica aquí — carga todo)
│
├── .inv-valuacion                ← footer fijo debajo del contenido
│   │   Display: flex, align-items: baseline
│   │   Gap: 0.75rem, flex-wrap: wrap
│   │   Padding: 0.75rem 1rem
│   │   Border: 1px solid var(--border)
│   │   Border-radius: var(--radius) → 10px
│   │   Background: var(--surface-2) → dark: #232323
│   │
│   ├── .inv-valuacion-label       "Valuación de inventario"
│   │   Font-weight: 600, color: var(--text-secondary)
│   │
│   ├── .inv-valuacion-monto       "$X.XX"
│   │   Font-size: 1.25rem, font-weight: 700
│   │   .num-tab → font-variant-numeric: tabular-nums
│   │
│   └── .inv-valuacion-nota        "Σ (costo × stock)"
│       Font-size: 0.78rem, color: var(--text-secondary)
│
├── [ProductoForm]                ← modal creación/edición
├── [AjusteStockModal]            ← modal ajuste de stock
├── [ConfirmarEliminarModal]      ← modal doble confirmación
└── [HistorialModal]              ← modal historial de cambios
```

## ProductoForm (modal)

```
.modal-backdrop                   ← fondo oscuro (click cierra)
│   Position: fixed, inset: 0
│   Background: rgba(0, 0, 0, 0.5)
│   Display: grid, place-items: center
│   Z-index: 100
│
└── .modal                        ← contenedor del formulario
    │   Background: var(--surface-1) → dark: #1a1a1a
    │   Border: 1px solid var(--border)
    │   Border-radius: var(--radius-lg) → 12px
    │   Padding: 1.5rem
    │   Width: max 540px, max-height: 90vh
    │   Overflow-y: auto
    │   Box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3)
    │
    ├── .modal-header
    │   │   Display: flex, justify-content: space-between, align-items: center
    │   │   Margin-bottom: 1rem
    │   ├── h2                      "Editar producto" / "Nuevo producto"
    │   │   Font-size: 1.15rem, font-weight: 700
    │   └── btn ×                   cerrar (Escape también cierra)
    │       Background: transparente, border: 0
    │       Color: var(--text-muted)
    │       Font-size: 1.5rem, cursor: pointer
    │       Hover: color var(--text-primary)
    │
    ├── form.form-grid             ← grid 2 columnas
    │   │   Display: grid, grid-template-columns: 1fr 1fr
    │   │   Gap: 0.75rem
    │   │
    │   ├── .span-2  Nombre* (input) → ocupa ambas columnas
    │   ├── SKU (input, read-only si auto-gen activo)
    │   ├── .check   Auto-generar SKU (solo admin)
    │   ├── <SkuPreview />          preview SKU generado (badge verde)
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
    │   Inputs: padding 0.6rem, border-radius var(--radius-sm)
    │           border 1px solid var(--border), background var(--surface-1)
    │           color var(--text-primary)
    │           Focus: border-color var(--accent), box-shadow 0 0 0 2px var(--accent-soft)
    │
    └── .span-2.modal-footer
        │   Display: flex, justify-content: flex-end, gap: 0.5rem
        │   Margin-top: 1rem, padding-top: 1rem
        │   Border-top: 1px solid var(--border)
        ├── btn "Regenerar SKU" (solo admin + edición + auto-gen)
        │   (= ghost button)
        ├── btn "Cancelar"
        │   (= ghost button)
        └── btn.primary "Guardar" / "Crear"
            (= primary button, verde)
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
        │   │   Color: var(--warn), font-weight: 600
        │   └── .modal-footer  Cancelar | Eliminar
        │       Eliminar: background var(--off), color #fff
        │
        └── [paso 2]
            ├── .confirmar-delete-step  "Escribe el nombre para confirmar"
            ├── .confirmar-delete-input  input (debe coincidir con nombre)
            │   Ancho: 100%, padding 0.6rem
            └── .modal-footer  Cancelar | Confirmar eliminación
                Confirmar: background var(--off), color #fff, disabled si no coincide
```

## AjusteStockModal

```
.modal-backdrop
└── .modal
    ├── .modal-header  "Ajuste de stock"
    └── form.form-grid
        ├── .span-2  Producto (select con lista de productos)
        ├── Cantidad +/- (input number, step 0.01)
        ├── Motivo (select: conteo físico, merma, devolución, otro)
        ├── .error .span-2  mensaje de error
        └── .span-2.modal-footer  Cancelar | Aplicar ajuste
            Aplicar: btn.primary (verde)
```

## States

| State | Tipo | Descripción |
|---|---|---|
| `editId` | `null \| string` | null = sin editar, string = ID del producto en edición → muestra ProductoForm |
| `showNuevo` | `boolean` | true = muestra ProductoForm para crear nuevo |
| `ajusteOpen` | `boolean` | true = muestra modal ajuste de stock |
| `deleteTarget` | `null \| {producto, mode}` | null = sin eliminar, objeto = muestra ConfirmarEliminarModal |
| `historialOpen` | `boolean` | true = muestra HistorialModal |
| `vista` | `'grid' \| 'lista'` | Default: `'lista'` (diferente al catálogo que usa `'grid'`) |
| `inventarioHabilitado` | `boolean` |来自 useUsuarioRol — si false, muestra pantalla "Acceso restringido" |
