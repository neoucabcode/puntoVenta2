# 01 — Layout (sidebar + topbar)

```
.app-shell                      ← contenedor raíz (sidebar + main)
│
├── .sidebar                    ← barra lateral izquierda
│   ├── .brand-toggle           ← botón colapsar/expandir sidebar
│   │   └── .side-label          "Colapsar"
│   ├── .brand                  ← logo + nombre empresa
│   │   ├── .brand-mark           "F"
│   │   └── .brand-name           "FerrehogarMart"
│   ├── .side-nav               ← navegación principal
│   │   └── .side-link × N       NavLink (active: clase active)
│   │       ├── .side-ico          ícono Material Symbols
│   │       └── .side-label        "Venta" / "Catálogo" / "Inventario"
│   └── .side-footer            ← pie de sidebar
│       └── .side-logout         botón "Salir"
│
└── .main-col                   ← columna principal
    │
    ├── .topbar                 ← barra superior (sticky)
    │   ├── .topbar-cmd          "Buscar o navegar… Ctrl+K" → CommandPalette
    │   │   └── <kbd>Ctrl K</kbd>
    │   ├── .topbar-user         email del usuario autenticado
    │   ├── .topbar-caja         estado + pendientes + caja
    │   │   ├── .estado-conexion   "En línea" (.on) / "Offline" (.off)
    │   │   ├── .badge-pendientes  "19 pendientes"
    │   │   └── .caja-btn          "Abrir caja" / "Cerrar caja"
    │   └── .topbar-theme        toggle modo oscuro/claro
    │       └── ícono: dark_mode / light_mode
    │
    └── .content                ← área de contenido de cada página
```

## Comportamiento

- `.sidebar.collapsed` → se colapsa (solo muestra íconos)
- `.topbar` es `position: sticky; top: 0; z-index: 20`
- `.content` tiene `padding: 1.25rem`
- Ctrl+K abre `CommandPalette` (excepto en `/`)
