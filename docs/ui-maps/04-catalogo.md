# 04 — Catálogo (CatalogoPage) — SOLO LECTURA

## Paleta de colores (relevantes)

| Elemento | Variable | Dark | Light | Uso |
|---|---|---|---|---|
| Fondo página | `--bg-base` | `#0f0f0f` | `#f6f7f9` | Fondo detrás del toolbar |
| Toolbar fondo | `color-mix(in srgb, var(--bg-base) 88%, transparent)` | ~`#0f0f0f` 88% opaco | ~`#f6f7f9` 88% opaco | Fondo semitransparente del toolbar |
| Toolbar blur | `backdrop-filter: blur(12px)` | — | — | Efecto vidrio esmerilado |
| Toolbar borde | `1px solid var(--border)` | `#2a2a2a` | `#e2e5ea` | Borde del toolbar |
| Toolbar sombra | `box-shadow: 0 10px 28px rgba(0,0,0,0.12)` | — | — | Sombra sutil debajo |
| Card fondo | `--surface-1` | `#1a1a1a` | `#ffffff` | Fondo de cada producto card |
| Card borde | `1px solid var(--border)` | `#2a2a2a` | `#e2e5ea` | Borde de cada card |
| Card sombra | `box-shadow: 0 8px 24px rgba(0,0,0,0.08)` | — | — | Sombra de cards |
| Card radius | `--radius-lg` | `12px` | `12px` | Esquinas redondeadas |
| Texto precio | `--text-primary` | `#ededed` | `#16181d` | Precio del producto |
| Texto muted | `--text-muted` | `#6b6b70` | `#8a93a3` | SKU, meta, subtítulo |
| Badge stock bajo | `--warn` | `#f59e0b` | `#b45309` | Ribbon naranja "Stock bajo" |
| Badge agotado | `--off` | `#ef4444` | `#dc2626` | Ribbon rojo "Agotado" |
| Badge ok | `--ok` | `#22c55e` | `#16a34a` | Ribbon verde "En stock" |
| Accent (filtros) | `--accent` | `#22c55e` | `#16a34a` | Toggle vista activo, focus ring |

## Estructura

```
.catalogo                         ← contenedor raíz
│   │   Display: flex, flex-direction: column
│   │   Flex: 1, min-height: 0
│   │   Padding: 0 (el padding viene de .content del Layout)
│
├── .catalogo-toolbar             ← barra superior sticky
│   │   Position: sticky, top: 0, z-index: 10
│   │   Display: flex, flex-wrap: wrap
│   │   Gap: 0.75rem 1rem (vertical 0.75rem, horizontal 1rem)
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
│   ├── .catalogo-head            ← lado izquierdo (título + subtítulo)
│   │   │   Display: flex, flex-direction: column
│   │   │   Gap: 0.12rem
│   │   │   Min-width: 180px
│   │   │
│   │   └── .catalogo-sub           "582 productos"
│   │       Margin: 0
│   │       Font-size: 0.8rem
│   │       Color: var(--text-muted) → dark: #6b6b70
│   │       (El .catalogo-title se movió al .topbar-page-title)
│   │
│   ├── .catalogo-filtros         ← filtro de categoría
│   │   │   Display: flex, align-items: center, gap: 0.5rem, flex-wrap: wrap
│   │   └── .filtro-cat             select "Todas las categorías" / categoría X
│   │       Padding: 0.55rem 0.7rem
│   │       Border-radius: var(--radius-sm) → 7px
│   │       Border: 1px solid var(--border)
│   │       Background: var(--surface-1) → dark: #1a1a1a
│   │       Color: var(--text-primary)
│   │       Font-size: 0.9rem, max-width: 240px
│   │       Cursor: pointer
│   │       Focus: border-color var(--accent), box-shadow 0 0 0 2px var(--accent-soft)
│   │
│   └── .catalogo-head-actions    ← lado derecho (buscador + toggles)
│       │   Display: flex, flex-wrap: wrap, gap: 0.5rem
│       │   Align-items: center, flex: 1 1 420px
│       │   Justify-content: flex-end
│       │
│       ├── .buscador               "Buscar por nombre, SKU o código"
│       │   Flex: 1 1 260px, min-width: 220px
│       │   Padding: 0.6rem 0.8rem
│       │   Border-radius: var(--radius-sm) → 7px
│       │   Border: 1px solid var(--border)
│       │   Background: var(--surface-1) → dark: #1a1a1a
│       │   Color: var(--text-primary)
│       │   Font-size: 0.95rem
│       │   Focus: border-color var(--accent), box-shadow 0 0 0 2px var(--accent-soft)
│       │           + transform: translateY(-1px) (efecto sutil de "elevarse")
│       │
│       ├── .check                  checkbox "Solo activos"
│       │   Display: inline-flex, align-items: center, gap: 0.35rem
│       │   Font-size: 0.85rem, color: var(--text-secondary)
│       │
│       └── .toggle-vista           grid ↔ lista
│           │   Display: inline-flex
│           │   Border: 1px solid var(--border)
│           │   Border-radius: var(--radius-sm) → 7px
│           │   Overflow: hidden
│           │   Background: var(--surface-1)
│           │
│           ├── button (grid)       .active cuando vista='grid'
│           │   Background: transparent (inactivo) / var(--accent) (activo)
│           │   Color: var(--text-secondary) / var(--primary-ink) (activo)
│           │   Padding: 0.45rem 0.6rem
│           │   Hover: background var(--surface-2)
│           │   Ícono: grid_view
│           │
│           └── button (lista)      .active cuando vista='lista'
│               Mismo estilo que grid
│               Ícono: list
│
├── .catalogo-body               ← wrapper de contenido
│   │   Display: flex, flex-direction: column
│   │   Gap: 1rem
│   │   Flex: 1, min-height: 0
│   │   Align-items: stretch
│   │
│   └── .catalogo-main           ← área scrollable
│       │   Display: flex, flex-direction: column
│       │   Flex: 1, min-height: 0
│       │   Overflow: hidden
│       │
│       ├── .error                  mensaje de error
│       │   Color: #fca5a5 (rojo claro), font-size: 0.85rem
│       │
│       ├── .aviso-cache            "catálogo sin conexión (cached)"
│       │   Color: #fcd34d (amarillo), font-size: 0.85rem, font-weight: 600
│       │
│       ├── [loading]               "Cargando…"
│       │
│       ├── [vista grid] .productos-grid-scroll
│       │   │   Overflow: auto
│       │   │   Border: 1px solid var(--border)
│       │   │   Border-radius: var(--radius) → 10px
│       │   │   Background: linear-gradient(180deg, var(--surface-1) 0%, color-mix(...) 100%)
│       │   │   Flex: 1 1 auto, min-height: 0, height: 100%
│       │   │
│       │   └── .productos-grid
│       │       │   Display: grid
│       │       │   Grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))
│       │       │   Gap: 1rem (entre cards)
│       │       │   Padding: 1rem (dentro del grid)
│       │       │   Align-content: start
│       │       │
│       │       └── .card-producto × N
│       │           │   Background: var(--surface-1) → dark: #1a1a1a
│       │           │   Border: 1px solid var(--border)
│       │           │   Border-radius: var(--radius-lg) → 12px
│       │           │   Overflow: hidden
│       │           │   Display: flex, flex-direction: column
│       │           │   Align-self: start
│       │           │   Box-shadow: 0 8px 24px rgba(0,0,0,0.08)
│       │           │   Transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s
│       │           │   Hover: border-color var(--border-strong), transform translateY(-2px)
│       │           │
│       │           ├── .card-img
│       │           │   │   Position: relative
│       │           │   │   Aspect-ratio: 4/3 (o similar)
│       │           │   │   Overflow: hidden
│       │           │   ├── img → object-fit: cover, width: 100%
│       │           │   ├── .thumb-empty → ícono image (cuando no hay foto)
│       │           │   │   Display: grid, place-items: center
│       │           │   │   Color: var(--text-muted), background: var(--surface-2)
│       │           │   └── .ribbon.ok/.warn/.off
│       │           │       Position: absolute, bottom-left
│       │           │       Padding: 0.15rem 0.5rem
│       │           │       Border-radius: 0 var(--radius-sm) var(--radius-sm) 0
│       │           │       Font-size: 0.7rem, font-weight: 600
│       │           │       .ok → background: var(--ok-soft), color: var(--ok)
│       │           │       .warn → background: var(--warn-soft), color: var(--warn)
│       │           │       .off → background: var(--off-soft), color: var(--off)
│       │           │
│       │           └── .card-info
│       │               │   Padding: 0.75rem
│       │               │   Display: flex, flex-direction: column, gap: 0.35rem
│       │               │
│       │               ├── .card-sku       <code>COC0001</code>
│       │               │   Font-family: var(--mono) → JetBrains Mono
│       │               │   Font-size: 0.75rem, color: var(--text-muted)
│       │               │
│       │               ├── .card-nombre    "Filtro rosca 1/4"
│       │               │   Font-size: 0.9rem, font-weight: 600
│       │               │   Color: var(--text-primary)
│       │               │   Line-height: 1.3
│       │               │
│       │               ├── .card-meta      "Ferretería"
│       │               │   Font-size: 0.8rem, color: var(--text-secondary)
│       │               │
│       │               └── .card-footer
│       │                   │   Display: flex, justify-content: space-between
│       │                   │   Align-items: center
│       │                   │   Margin-top: 0.25rem
│       │                   ├── .card-precio  "$1.50"
│       │                   │   Font-size: 1rem, font-weight: 700
│       │                   │   Color: var(--text-primary)
│       │                   │   .badge.warn "sin precio" → background var(--warn-soft)
│       │                   └── .card-stock   "120 uds"
│       │                       Font-size: 0.85rem
│       │                       .ok → color var(--ok)
│       │                       .warn → color var(--warn)
│       │                       .off → color var(--off)
│       │
│       ├── [vista lista] <DataTable>
│       │   │   Border: 1px solid var(--border)
│       │   │   Border-radius: var(--radius)
│       │   │   Overflow: hidden
│       │   └── columnas: SKU | img | Nombre | Categoría | Precio USD | Stock | Estado
│       │
│       ├── .sentinela              IntersectionObserver → scroll infinito
│       │   Altura: 1px (invisible, solo detecta scroll)
│       │
│       └── .loading-more           "Cargando más…"
│
└── (NO tiene modales ni acciones CRUD)
```

## Comportamiento

- **Solo lectura permanente** — sin crear/editar/borrar/vender
- Scroll infinito via `IntersectionObserver` en `.sentinela` (rootMargin: 200px)
- Caché offline via `obtenerCatalogo()` → muestra `.aviso-cache` cuando usa IndexedDB
- `soloActivos` checkbox filtra solo productos activos (default: true)
- Vista grid por defecto (`vista` state = `'grid'`)
- El título "Catálogo de productos" vive en `.topbar-page-title` del Layout (no en esta página)
