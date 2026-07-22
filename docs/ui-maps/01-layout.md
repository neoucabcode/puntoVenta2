# 01 — Layout (sidebar + topbar)

## Paleta de colores (variables CSS)

### Modo oscuro (default)

| Variable | Valor | Uso |
|---|---|---|
| `--bg-base` | `#0f0f0f` | Fondo general de la app (casi negro) |
| `--bg-sidebar` | `#161616` | Fondo de la sidebar (gris muy oscuro) |
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
| `--primary-ink` | `#052e16` | Texto sobre fondo verde (muy oscuro) |

### Modo claro

| Variable | Valor | Uso |
|---|---|---|
| `--bg-base` | `#f6f7f9` | Fondo general (gris muy claro) |
| `--bg-sidebar` | `#ffffff` | Fondo de la sidebar (blanco puro) |
| `--surface-1` | `#ffffff` | Fondo de cards, inputs |
| `--surface-2` | `#eef0f3` | Fondo hover |
| `--text-primary` | `#16181d` | Texto principal (casi negro) |
| `--text-secondary` | `#475061` | Texto secundario |
| `--text-muted` | `#8a93a3` | Texto deshabilitado |
| `--border` | `#e2e5ea` | Bordes generales |
| `--accent` | `#16a34a` | Verde (más oscuro que dark) |
| `--primary-ink` | `#ffffff` | Texto sobre fondo verde (blanco) |

## Estructura

```
.app-shell                      ← contenedor raíz (flex, sidebar + main)
│
├── .sidebar                    ← barra lateral izquierda
│   │   Ancho: 240px (colapsada: 72px)
│   │   Fondo: var(--bg-sidebar) → dark: #161616, light: #ffffff
│   │   Borde derecho: 1px solid var(--border)
│   │
│   ├── .brand-toggle           ← botón colapsar/expandir
│   │   │   Fondo: transparente
│   │   │   Hover: var(--surface-2)
│   │   │   Ícono: chevron_left / chevron_right
│   │   └── .side-label          "Colapsar"
│   │
│   ├── .brand                  ← logo + nombre empresa
│   │   │   Padding: 0.75rem 1rem
│   │   ├── .brand-mark           "F" (fondo accent, texto primary-ink)
│   │   │   Ancho: 32px, alto: 32px, border-radius: 8px
│   │   │   Fondo: var(--accent) → #22c55e
│   │   │   Texto: var(--primary-ink) → #052e16
│   │   │   Font-weight: 700, font-size: 1rem
│   │   └── .brand-name           "FerrehogarMart"
│   │       Font-weight: 600, font-size: 0.95rem
│   │       Color: var(--text-primary)
│   │
│   ├── .side-nav               ← navegación principal
│   │   │   Padding: 0.5rem 0
│   │   └── .side-link × N       NavLink (active: clase .active)
│   │       │   Display: flex, align-items: center, gap: 0.75rem
│   │       │   Padding: 0.6rem 1rem
│   │       │   Border-radius: var(--radius-sm) → 7px
│   │       │   Color: var(--text-secondary)
│   │       │   Text-decoration: none
│   │       │   Hover: background var(--surface-2), color var(--text-primary)
│   │       │   Activo (.active): background var(--accent-soft), color var(--accent)
│   │       ├── .side-ico          ícono Material Symbols (font-size: 1.25rem)
│   │       └── .side-label        "Venta" / "Catálogo" / "Inventario"
│   │                               Font-size: 0.9rem
│   │
│   └── .side-footer            ← pie de sidebar
│       └── .side-logout         botón "Salir"
│           │   Mismo estilo que .side-link
│           │   Hover: background var(--off-soft), color var(--off) → rojo
│           ├── ícono: logout
│           └── .side-label: "Salir"
│
└── .main-col                   ← columna principal (flex: 1, min-width: 0)
    │   Altura: 100vh, overflow: hidden
    │
    ├── .topbar                 ← barra superior (sticky)
    │   │   Display: flex, align-items: center, gap: 1rem
    │   │   Padding: 0.5rem 1rem
    │   │   Border-bottom: 1px solid var(--border)
    │   │   Background: var(--bg-base)
    │   │   Position: sticky, top: 0, z-index: 20
    │   │
    │   ├── .topbar-cmd          "Buscar o navegar… Ctrl+K"
    │   │   │   Flex: 1 1 260px, max-width: 360px
    │   │   │   Background: var(--surface-1) → dark: #1a1a1a
    │   │   │   Border: 1px solid var(--border)
    │   │   │   Border-radius: var(--radius-sm) → 7px
    │   │   │   Padding: 0.55rem 0.8rem
    │   │   │   Color: var(--text-secondary)
    │   │   │   Font-size: 0.85rem
    │   │   │   Cursor: pointer
    │   │   │   Hover: border-color var(--border-strong)
    │   │   ├── ícono: search (font-size: 1.1rem)
    │   │   └── <kbd>Ctrl K</kbd>
    │   │
    │   ├── .topbar-page-title    ← título de página (solo /catalogo y /inventario)
    │   │   │   Background: var(--accent) → #22c55e (verde)
    │   │   │   Color: var(--primary-ink) → #052e16 (texto oscuro sobre verde)
    │   │   │   Padding: 0.55rem 0.9rem
    │   │   │   Border-radius: var(--radius-sm) → 7px
    │   │   │   Font-weight: 700, font-size: 0.95rem
    │   │   │   Box-shadow: 0 8px 18px rgba(34, 197, 94, 0.16)
    │   │   │   White-space: nowrap
    │   │   ├── ícono: inventory_2 (catálogo) / inventory (inventario)
    │   │   └── texto: "Catálogo de productos" / "Inventario"
    │   │
    │   ├── .topbar-user         email del usuario
    │   │   Font-size: 0.8rem, color: var(--text-muted)
    │   │
    │   ├── .topbar-caja         estado + pendientes + caja
    │   │   │   Display: flex, align-items: center, gap: 0.5rem
    │   │   │   Margin-left: 0.75rem
    │   │   ├── .estado-conexion   "En línea" (.on) / "Offline" (.off)
    │   │   │   .on → color: var(--ok) → #22c55e
    │   │   │   .off → color: var(--off) → #ef4444
    │   │   ├── .badge-pendientes  "19 pendientes"
    │   │   │   Background: var(--warn-soft), color: var(--warn)
    │   │   │   Padding: 0.15rem 0.5rem, border-radius: 999px
    │   │   │   Font-size: 0.75rem, font-weight: 600
    │   │   └── .caja-btn          "Abrir caja" / "Cerrar caja"
    │   │       Background: var(--surface-1), border: 1px solid var(--border)
    │   │       Padding: 0.4rem 0.75rem, border-radius: var(--radius-sm)
    │   │       Font-size: 0.85rem, cursor: pointer
    │   │
    │   └── .topbar-theme        toggle modo oscuro/claro
    │       │   Background: var(--surface-1), border: 1px solid var(--border)
    │       │   Ancho: 34px, alto: 34px, border-radius: var(--radius-sm)
    │       │   Display: grid, place-items: center
    │       │   Hover: background var(--surface-3), color var(--text-primary)
    │       └── Ícono: dark_mode (modo oscuro) / light_mode (modo claro)
    │
    └── .content                ← área de contenido de cada página
        Padding: 1.25rem, flex: 1, min-height: 0, overflow: hidden
```

## Comportamiento

- `.sidebar.collapsed` → se colapsa a 72px, oculta `.side-label`, solo muestra íconos
- `.topbar` es `position: sticky; top: 0; z-index: 20` → siempre visible al hacer scroll
- `.content` tiene `padding: 1.25rem` → el contenido de cada página tiene ese resguardo
- Ctrl+K abre `CommandPalette` (excepto en `/` que es la pantalla de venta)
- El topbar muestra `.topbar-page-title` solo en `/catalogo` e `/inventario`
- La sidebar tiene `--sidebar-w: 240px` expandida, `--sidebar-w-collapsed: 72px` colapsada
