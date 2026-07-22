# 08 — Prefijos CSS

Referencia rápida de prefijos por módulo.

| Prefijo | Módulo | Ejemplos |
|---------|--------|----------|
| `pos-` | Caja (POS) | `.pos-grid`, `.pos-productos`, `.pos-busqueda`, `.pos-pago` |
| `inv-` | Inventario | `.inv-toolbar`, `.inv-head`, `.inv-acciones`, `.inv-valuacion` |
| `catalogo-` | Catálogo | `.catalogo-toolbar`, `.catalogo-head`, `.catalogo-body` |
| `wf-` | Workflow (pago) | `.wf-titulo`, `.wf-btn-atras`, `.wf-pago-radio`, `.wf-btn-confirmar` |
| `card-` | Tarjeta producto | `.card-producto`, `.card-img`, `.card-info`, `.card-actions` |
| `dt-` | DataTable | `.dt`, `.dt-scroll`, `.dt-table`, `.dt-actions` |
| `modal-` | Modales | `.modal-backdrop`, `.modal-header`, `.modal-footer` |
| `topbar-` | Topbar | `.topbar-cmd`, `.topbar-user`, `.topbar-caja`, `.topbar-theme` |
| `side-` | Sidebar | `.side-nav`, `.side-link`, `.side-ico`, `.side-label` |
| `brand-` | Marca | `.brand-mark`, `.brand-name`, `.brand-toggle` |
| `palette-` | CommandPalette | `.palette-backdrop`, `.palette-input`, `.palette-list` |
| `filtro-` | Filtros compartidos | `.filtro-cat` (catálogo + inventario) |
| `toggle-` | Toggle compartido | `.toggle-vista` (catálogo + inventario) |
| `btn-` | Botones genéricos | `.caja-btn`, `.side-logout` |

## Clases compartidas entre módulos

| Clase | Usada en |
|-------|----------|
| `.buscador` | Caja, Catálogo, Inventario |
| `.filtro-cat` | Catálogo, Inventario |
| `.toggle-vista` | Catálogo, Inventario |
| `.card-producto` | Catálogo (grid), Caja (grid), Inventario (grid) |
| `.card-img`, `.card-info`, `.card-sku`, `.card-nombre` | Catálogo, Inventario |
| `.primary` | Todos los módulos |
| `.error` | Todos los módulos |
| `.check` | Catálogo, Inventario, ProductoForm |
| `.badge` | Catálogo (.ok/.warn/.off) |
| `.num-tab` | Inventario, Caja |
| `.material-symbols-outlined` | Global (iconos) |
