# 01 — Layout (sidebar + topbar)

## Paleta de colores (variables CSS)

### Modo oscuro (default)

| Variable | Valor | Uso |
|---|---|---|
| `--bg-base` | `#0f0f0f` | Fondo general de la app (casi negro) |
| `--bg-sidebar` | `#161616` | Fondo de la sidebar (gris muy oscuro) |
| `--bg-content` | `#0f0f0f` | Fondo del área de contenido |
| `--surface-1` | `#1a1a1a` | Fondo de cards, inputs, botones secundarios |
| `--surface-2` | `#232323` | Fondo hover de botones, elementos elevados |
| `--surface-3` | `#2d2d2d` | Fondo hover activo, elementos más elevados |
| `--text-primary` | `#ededed` | Texto principal (casi blanco) |
| `--text-secondary` | `#a1a1aa` | Texto secundario (gris claro) |
| `--text-muted` | `#6b6b70` | Texto deshabilitado, hints (gris oscuro) |
| `--border` | `#2a2a2a` | Bordes generales (gris muy oscuro) |
| `--border-strong` | `#3a3a3a` | Bordes en hover o énfasis |
| `--accent` | `#22c55e` | Verde ferretería (botones primarios, acentos) |
| `--accent-hover` | `#16a34a` | Verde más oscuro en hover |
| `--accent-soft` | `rgba(34, 197, 94, 0.12)` | Fondo sutil para active states |
| `--primary-ink` | `#052e16` | Texto sobre fondo verde (muy oscuro) |

### Modo claro

| Variable | Valor | Uso |
|---|---|---|
| `--bg-base` | `#f6f7f9` | Fondo general (gris muy claro) |
| `--bg-sidebar` | `#ffffff` | Fondo de la sidebar (blanco puro) |
| `--bg-content` | `#f6f7f9` | Fondo del área de contenido |
| `--surface-1` | `#ffffff` | Fondo de cards, inputs |
| `--surface-2` | `#eef0f3` | Fondo hover |
| `--surface-3` | `#e2e5ea` | Fondo hover activo |
| `--text-primary` | `#16181d` | Texto principal (casi negro) |
| `--text-secondary` | `#475061` | Texto secundario |
| `--text-muted` | `#8a93a3` | Texto deshabilitado |
| `--border` | `#e2e5ea` | Bordes generales |
| `--border-strong` | `#cbd1da` | Bordes en hover |
| `--accent` | `#16a34a` | Verde (más oscuro que dark) |
| `--accent-hover` | `#15803d` | Verde hover |
| `--accent-soft` | `rgba(22, 163, 74, 0.12)` | Fondo sutil para active states |
| `--primary-ink` | `#ffffff` | Texto sobre fondo verde (blanco) |

### Tokens semánticos

| Variable | Dark | Light | Uso |
|---|---|---|---|
| `--ok` | `#22c55e` | `#16a34a` | Estado online, éxito |
| `--ok-soft` | `rgba(34,197,94,0.14)` | `rgba(22,163,74,0.14)` | Background sutil ok |
| `--warn` | `#f59e0b` | `#b45309` | Advertencia, pendientes |
| `--warn-soft` | `rgba(245,158,11,0.15)` | `rgba(180,83,9,0.14)` | Background sutil warn |
| `--off` | `#ef4444` | `#dc2626` | Error, logout |
| `--off-soft` | `rgba(239,68,68,0.14)` | `rgba(220,38,38,0.12)` | Background sutil off |

### Tokens de sistema

| Variable | Valor | Uso |
|---|---|---|
| `--radius` | `10px` | Border radius default |
| `--radius-sm` | `7px` | Border radius pequeño |
| `--radius-lg` | `12px` | Border radius grande |
| `--radius-xl` | `16px` | Border radius muy grande |
| `--font` | `"Inter", system-ui, ...` | Stack de fuentes |
| `--mono` | `"JetBrains Mono", ...` | Stack monoespaciado |
| `--elev-0..3` | `#0f0f0f → #2d2d2d` | Capas de elevación (dark) |
| `--sidebar-w` | `240px` | Ancho sidebar expandida |
| `--sidebar-w-collapsed` | `72px` | Ancho sidebar colapsada |

## Estructura

```
.app-shell                      ← contenedor raíz (grid, sidebar + main)
│                               display: grid
│                               grid-template-columns: var(--sidebar-w) 1fr
│                               height: 100vh, overflow: hidden
│                               transition: grid-template-columns 0.3s ease
│
├── .sidebar                    ← barra lateral izquierda
│   │   background: var(--bg-sidebar)
│   │   border-right: 1px solid var(--border)
│   │   display: flex, flex-direction: column
│   │   padding: 1rem 0.75rem
│   │   width: var(--sidebar-w)
│   │   height: 100vh
│   │   overflow: hidden
│   │   transition: width 0.3s ease
│   │
│   ├── .brand-toggle           ← botón colapsar/expandir
│   │   │   display: flex, align-items: center, gap: 0.5rem, width: 100%
│   │   │   background: var(--surface-2)
│   │   │   border: 1px solid var(--border)
│   │   │   color: var(--text-secondary)
│   │   │   border-radius: var(--radius-sm)
│   │   │   padding: 0.5rem 0.6rem
│   │   │   font-size: 0.85rem
│   │   │   Hover: bg var(--surface-3), color var(--text-primary), border-color var(--border-strong)
│   │   └── .side-label          "Colapsar"
│   │
│   ├── .brand                  ← logo + nombre empresa
│   │   │   display: flex, align-items: center, gap: 0.6rem
│   │   │   padding: 0.4rem 0.5rem 1rem
│   │   │   min-height: 48px
│   │   ├── .brand-mark           "F" (fondo accent, texto primary-ink)
│   │   │   Ancho: 30px, alto: 30px, border-radius: 8px
│   │   │   Fondo: var(--primary) → #22c55e
│   │   │   Texto: var(--primary-ink) → #052e16
│   │   │   Font-weight: 800, font-size: 1.1rem
│   │   └── .brand-name           "FerrehogarMart"
│   │       Font-weight: 700, font-size: 0.95rem
│   │       Letter-spacing: -0.01em
│   │       Color: var(--text-primary)
│   │
│   ├── .side-nav               ← navegación principal
│   │   │   display: flex, flex-direction: column, gap: 0.25rem
│   │   └── .side-link × N       NavLink (active: clase .active)
│   │       │   display: flex, align-items: center, gap: 0.75rem
│   │       │   padding: 0.55rem 0.6rem
│   │       │   border-radius: var(--radius-sm) → 7px
│   │       │   color: var(--text-secondary)
│   │       │   text-decoration: none
│   │       │   font-size: 0.9rem
│   │       │   white-space: nowrap
│   │       │   Hover: background var(--surface-1), color var(--text-primary)
│   │       │   Activo (.active): background var(--accent-soft), color var(--accent), font-weight: 600
│   │       ├── .side-ico          ícono Material Symbols (font-size: 1.25rem)
│   │       └── .side-label        "Venta" / "Catálogo" / "Inventario"
│   │                               Font-size: 0.9rem
│   │
│   └── .side-footer            ← pie de sidebar (margin-top: auto)
│       └── .side-logout         botón "Salir"
│           │   width: 100%
│           │   background: var(--off-soft)
│           │   border: 1px solid var(--off)
│           │   color: var(--off)
│           │   border-radius: var(--radius-sm)
│           │   padding: 0.5rem
│           │   font-size: 0.85rem, font-weight: 600
│           │   display: flex, align-items: center, gap: 0.6rem, justify-content: center
│           │   Hover: background var(--off), color: #fff
│           ├── ícono: logout
│           └── .side-label: "Salir"
│
└── .main-col                   ← columna principal
    │   display: flex, flex-direction: column
    │   min-width: 0, height: 100vh, overflow: hidden
    │
    ├── .topbar                 ← barra superior (sticky)
    │   │   display: flex, align-items: center, gap: 1rem
    │   │   padding: 0.5rem 1rem
    │   │   border-bottom: 1px solid var(--border)
    │   │   background: var(--bg-base)
    │   │   position: sticky, top: 0, z-index: 20
    │   │
    │   ├── .topbar-page-title    ← título de página (solo /catalogo y /inventario)
    │   │   │   display: inline-flex, align-items: center, gap: 0.35rem
    │   │   │   background: var(--accent) → #22c55e (verde)
    │   │   │   color: var(--primary-ink) → #052e16 (texto oscuro sobre verde)
    │   │   │   padding: 0.55rem 0.9rem
    │   │   │   border-radius: var(--radius-sm) → 7px
    │   │   │   font-weight: 700, font-size: 0.95rem
    │   │   │   box-shadow: 0 8px 18px rgba(34, 197, 94, 0.16)
    │   │   │   white-space: nowrap
    │   │   ├── ícono: inventory_2 (catálogo) / inventory (inventario) (font-size: 1.1rem)
    │   │   └── texto: "Catálogo de productos" / "Inventario"
    │   │
    │   ├── .topbar-user         email del usuario
    │   │   Font-size: 0.8rem, color: var(--text-muted)
    │   │
    │   ├── .topbar-caja         estado + pendientes + caja
    │   │   │   display: flex, align-items: center, gap: 0.5rem
    │   │   │   margin-left: 0.75rem
    │   │   ├── .estado-conexion   "En línea" (.on) / "Offline" (.off)
    │   │   │   │   font-size: 0.75rem, font-weight: 600
    │   │   │   │   padding: 0.25rem 0.55rem, border-radius: 999px
    │   │   │   │   display: inline-flex, align-items: center, gap: 0.35rem
    │   │   │   │   ::before → dot indicator (8px, border-radius 50%, background: currentColor)
    │   │   │   .on → color: #16a34a, background: rgba(22,163,74,0.12)
    │   │   │   .off → color: #dc2626, background: rgba(220,38,38,0.12)
    │   │   ├── .badge-pendientes  "19 pendientes"
    │   │   │   │   font-size: 0.75rem, font-weight: 700
    │   │   │   │   padding: 0.25rem 0.55rem, border-radius: 999px
    │   │   │   │   color: #b45309, background: rgba(245,158,11,0.14)
    │   │   │   │   border: 1px solid rgba(245,158,11,0.35)
    │   │   └── .caja-btn          "Abrir caja" / "Cerrar caja"
    │   │       │   margin-left: 0.25rem
    │   │       │   background: var(--surface-1)
    │   │       │   border: 1px solid var(--border)
    │   │       │   color: var(--text-secondary)
    │   │       │   border-radius: var(--radius-sm)
    │   │       │   padding: 0.4rem 0.7rem
    │   │       │   font-size: 0.8rem, font-weight: 600
    │   │       │   cursor: pointer
    │   │       │   Hover: bg var(--surface-3), color var(--text-primary), border-color var(--border-strong)
    │   │
    │   └── .topbar-theme        toggle modo oscuro/claro
    │       │   margin-left: 0.5rem
    │       │   background: var(--surface-1)
    │       │   border: 1px solid var(--border)
    │       │   color: var(--text-secondary)
    │       │   border-radius: var(--radius-sm)
    │       │   width: 34px, height: 34px
    │       │   display: grid, place-items: center
    │       │   cursor: pointer, flex-shrink: 0
    │       │   Hover: bg var(--surface-3), color var(--text-primary), border-color var(--border-strong)
    │       └── Ícono: dark_mode (modo oscuro) / light_mode (modo claro)
    │
    └── .content                ← área de contenido de cada página
        padding: 1.25rem, flex: 1, min-height: 0, overflow: hidden
        display: flex, flex-direction: column
```

## Comportamiento

- `.app-shell.collapsed` → se colapsa a `--sidebar-w-collapsed` (72px), oculta `.side-label`, `.brand-name` y `.side-cmd-text`, solo muestra íconos
- `.topbar` es `position: sticky; top: 0; z-index: 20` → siempre visible al hacer scroll
- `.content` tiene `padding: 1.25rem` → el contenido de cada página tiene ese resguardo
- Ctrl+K abre `CommandPalette` (excepto en `/` que es la pantalla de venta)
- `.topbar-page-title` se muestra solo en `/catalogo` e `/inventario`
- La sidebar tiene `--sidebar-w: 240px` expandida, `--sidebar-w-collapsed: 72px` colapsada
- Transiciones suaves: sidebar width 0.3s, grid-template-columns 0.3s (cubic-bezier 0.4, 0, 0.2, 1)
- `.side-logout` tiene estilo propio desde el inicio (rojo con `--off-soft`), no hereda de `.side-link`
- `.estado-conexion` tiene pseudo-elemento `::before` como dot indicator
- `.caja-btn` se oculta si `cajaHabilitada` es false
- `.badge-pendientes` se muestra solo si `pendientes > 0`
