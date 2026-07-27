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
| Badge stock bajo | `--warn-soft` / `#fcd34d` | `rgba(245,158,11,0.15)` / `#fcd34d` | `rgba(180,83,9,0.14)` / `#fcd34d` | Ribbon naranja "Stock bajo" |
| Badge agotado | `--off-soft` / `#fca5a5` | `rgba(239,68,68,0.14)` / `#fca5a5` | `rgba(220,38,38,0.12)` / `#fca5a5` | Ribbon rojo "Agotado" |
| Badge ok | `--ok-soft` / `#86efac` | `rgba(34,197,94,0.14)` / `#86efac` | `rgba(22,163,74,0.14)` / `#86efac` | Ribbon verde "En stock" |
| Accent (filtros) | `--accent` | `#22c55e` | `#16a34a` | Toggle vista activo, focus ring |

## Estructura

```
.catalogo                         ← contenedor raíz
│   │   display: flex, flex-direction: column
│   │   flex: 1, min-height: 0
│   │   padding: 0 (el padding viene de .content del Layout)
│
├── .catalogo-toolbar             ← barra superior sticky
│   │   position: sticky, top: 0, z-index: 10
│   │   display: flex, flex-wrap: wrap
│   │   gap: 0.75rem 1rem (vertical 0.75rem, horizontal 1rem)
│   │   align-items: flex-end
│   │   justify-content: space-between
│   │   margin-bottom: 1rem
│   │   padding: 0.8rem 0.95rem
│   │   background: color-mix(in srgb, var(--bg-base) 88%, transparent)
│   │   backdrop-filter: blur(12px)
│   │   border: 1px solid var(--border)
│   │   border-radius: var(--radius-lg) → 12px
│   │   box-shadow: 0 10px 28px rgba(0,0,0,0.12)
│   │
│   ├── .catalogo-filtros         ← filtro de categoría
│   │   │   display: flex, align-items: center, gap: 0.5rem, flex-wrap: wrap
│   │   │
│   │   └── .filtro-cat             select "Todas las categorías" / categoría X
│   │   │   padding: 0.55rem 0.7rem
│   │   │   border-radius: var(--radius-sm) → 7px
│   │   │   border: 1px solid var(--border)
│   │   │   background: var(--surface-1) → dark: #1a1a1a
│   │   │   color: var(--text-primary)
│   │   │   font-size: 0.9rem, max-width: 240px
│   │   │   cursor: pointer
│   │   │   transition: border-color 0.15s ease, box-shadow 0.15s ease
│   │   │   Focus: border-color var(--accent), box-shadow 0 0 0 2px var(--accent-soft)
│   │   │
│   └── .catalogo-head-actions    ← lado derecho (buscador + toggles)
│       │   display: flex, flex-wrap: wrap, gap: 0.5rem
│       │   align-items: center, flex: 1 1 420px
│       │   justify-content: flex-end
│       │
│       ├── .buscador               "Buscar por nombre, SKU o código"
│       │   flex: 1 1 260px, min-width: 220px
│       │   padding: 0.6rem 0.8rem
│       │   border-radius: var(--radius-sm) → 7px
│       │   border: 1px solid var(--border)
│       │   background: var(--surface-1) → dark: #1a1a1a
│       │   color: var(--text-primary)
│       │   font-size: 0.95rem
│       │   transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease
│       │   Focus: border-color var(--accent), box-shadow 0 0 0 2px var(--accent-soft)
│       │           + transform: translateY(-1px) (efecto sutil de "elevarse")
│       │
│       ├── .check                  checkbox "Solo activos"
│       │   display: inline-flex, align-items: center, gap: 0.35rem
│       │   font-size: 0.85rem, color: var(--text-secondary)
│       │
│       └── .toggle-vista           grid ↔ lista
│           │   display: inline-flex
│           │   border: 1px solid var(--border)
│           │   border-radius: var(--radius-sm) → 7px
│           │   overflow: hidden
│           │   background: var(--surface-1)
│           │
│           ├── button (grid)       .active cuando vista='grid'
│           │   background: transparent (inactivo) / var(--accent) (activo)
│           │   color: var(--text-secondary) / var(--primary-ink) (activo)
│           │   padding: 0.45rem 0.6rem
│           │   Hover: background var(--surface-2)
│           │   Ícono: grid_view
│           │
│           └── button (lista)      .active cuando vista='lista'
│               Mismo estilo que grid
│               Ícono: list
│
├── .catalogo-body               ← wrapper de contenido
│   │   display: flex, flex-direction: column
│   │   gap: 1rem
│   │   flex: 1, min-height: 0
│   │   align-items: stretch
│   │
│   └── .catalogo-main           ← área scrollable
│       │   display: flex, flex-direction: column
│       │   flex: 1, min-height: 0
│       │   overflow: hidden
│       │
│       ├── .error                  mensaje de error
│       │   color: #fca5a5 (rojo claro), font-size: 0.85rem
│       │
│       ├── .aviso-cache            "catálogo sin conexión (cached)"
│       │   color: #fcd34d (amarillo), font-size: 0.85rem, font-weight: 600
│       │
│       ├── [loading]               "Cargando…"
│       │
│       ├── [vista grid] .productos-grid-scroll
│       │   │   overflow: auto
│       │   │   border: 1px solid var(--border)
│       │   │   border-radius: var(--radius) → 10px
│       │   │   background: linear-gradient(180deg, var(--surface-1) 0%, var(--bg-base) 100%)
│       │   │   flex: 1 1 auto, min-height: 0, height: 100%
│       │   │
│       │   └── .productos-grid
│       │       │   display: grid
│       │       │   grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))
│       │       │   gap: 1rem (entre cards)
│       │       │   padding: 1rem (dentro del grid)
│       │       │   align-content: start
│       │       │   min-height: 100%
│       │       │
│       │       └── .card-producto × N
│       │           │   background: var(--surface-1) → dark: #1a1a1a
│       │           │   border: 1px solid var(--border)
│       │           │   border-radius: var(--radius-lg) → 12px
│       │           │   overflow: hidden
│       │           │   display: flex, flex-direction: column
│       │           │   align-self: start
│       │           │   box-shadow: 0 8px 24px rgba(0,0,0,0.08)
│       │           │   transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s
│       │           │   Hover: border-color var(--border-strong)
│       │           │          transform translateY(-3px)
│       │           │          box-shadow 0 14px 30px rgba(0,0,0,0.18)
│       │           │   .inactivo → opacity: 0.55
│       │           │
│       │           ├── .card-img
│       │           │   │   position: relative
│       │           │   │   aspect-ratio: 4/3
│       │           │   │   background: linear-gradient(135deg, var(--surface-2) 0%, var(--bg-base) 100%)
│       │           │   │   display: grid, place-items: center
│       │           │   │   border-bottom: 1px solid var(--border)
│       │           │   │   overflow: hidden
│       │           │   ├── img → object-fit: contain, width/height: 100%, absolute inset 0
│       │           │   │       background: var(--bg-base)
│       │           │   │       transition: transform 0.4s ease
│       │           │   │       onError → cambia a broken_image
│       │           │   │       Hover del card → transform: scale(1.02)
│       │           │   ├── .thumb-empty → inventory_2 (sin imagen) / broken_image (error de carga)
│       │           │   │   color: var(--text-muted), font-size: 2.2rem, opacity: 0.7
│       │           │   └── .ribbon.ok/.warn/.off
│       │           │       position: absolute, top: 0.6rem, right: 0.6rem, z-index: 2
│       │           │       padding: 0.18rem 0.5rem
│       │           │       border-radius: 999px (pill)
│       │           │       font-size: 0.6rem, font-weight: 700
│       │           │       letter-spacing: 0.04em, text-transform: uppercase
│       │           │       backdrop-filter: blur(4px)
│       │           │       .ok → background: var(--ok-soft), color: #86efac
│       │           │       .warn → background: var(--warn-soft), color: #fcd34d
│       │           │       .off → background: var(--off-soft), color: #fca5a5
│       │           │
│       │           └── .card-info
│       │               │   padding: 0.7rem 0.8rem
│       │               │   display: flex, flex-direction: column, gap: 0.24rem
│       │               │   flex: 1
│       │               │
│       │               ├── .card-sku       <code>COC0001</code>
│       │               │   font-family: var(--mono) → JetBrains Mono
│       │               │   font-size: 0.7rem, color: var(--text-muted)
│       │               │   letter-spacing: 0.02em
│       │               │
│       │               ├── .card-nombre    "Filtro rosca 1/4"
│       │               │   font-size: 0.92rem, font-weight: 600
│       │               │   color: var(--text-primary)
│       │               │   line-height: 1.2
│       │               │   min-height: 2.4em
│       │               │
│       │               ├── .card-meta      "Ferretería"
│       │               │   font-size: 0.78rem, color: var(--text-secondary)
│       │               │
│       │               └── .card-footer
│       │                   │   display: flex, justify-content: space-between
│       │                   │   align-items: flex-end
│       │                   │   margin-top: 0.35rem
│       │                   │   gap: 0.5rem
│       │                   ├── .card-precio  "$1.50"
│       │                   │   font-size: 1rem, font-weight: 700
│       │                   │   color: var(--text-primary)
│       │                   │   .badge.warn "sin precio" → background var(--warn-soft)
│       │                   └── .card-stock   "120 uds"
│       │                       font-size: 0.78rem, text-align: right
│       │                       default → color var(--text-secondary)
│       │                       .warn → color: #fcd34d, font-weight: 600
│       │                       .off → color: #fca5a5, font-weight: 600
│       │
│       ├── .sentinela              IntersectionObserver → scroll infinito
│       │   Dentro de .productos-grid (grid view)
│       │   Height: 1px (invisible, solo detecta scroll)
│       │
│       ├── [vista lista] <DataTable>
│       │   │   border: 1px solid var(--border)
│       │   │   border-radius: var(--radius)
│       │   │   overflow: hidden
│       │   └── columnas: SKU | img | Nombre | Categoría | Precio USD | Stock | Estado
│       │
│       └── .loading-more           "Cargando más…" (fuera del scroll container)
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
- **Sin debounce en buscador** — cada keystroke actualiza el filtro directamente
- **Cards inactivas** — opacity reducida (0.55) para indicar producto desactivado
- **Hover en cards** — translateY(-3px) + sombra enhanced + imagen scale(1.02)
- **Placeholder adaptativo** — `inventory_2` cuando `imagen_url` es null, `broken_image` cuando la imagen falla al cargar (onError)
