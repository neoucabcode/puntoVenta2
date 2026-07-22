# UI Maps — PuntoVenta2

Mapas detallados de la estructura CSS de cada módulo. Cada archivo describe
elementos por nombre, colores, espaciados, fuentes y comportamiento.

> Última actualización: 2026-07-22

## Mapas

| # | Archivo | Módulo | Descripción | Estado |
|---|---------|--------|-------------|--------|
| 01 | [01-layout.md](01-layout.md) | Layout | Sidebar + topbar + envoltorio global | ⚠️ pendiente actualizar |
| 02 | [02-login-registro.md](02-login-registro.md) | Login / Registro | Formularios de autenticación | |
| 03 | [03-caja.md](03-caja.md) | Caja (POS) | Pantalla venta + pantalla pago | |
| 04 | [04-catalogo.md](04-catalogo.md) | Catálogo | Vista solo lectura (grid + lista) | ⚠️ pendiente actualizar |
| 05 | [05-inventario.md](05-inventario.md) | Inventario | CRUD + modales (ProductoForm, Ajuste, etc.) | ⚠️ pendiente actualizar |
| 06 | [06-command-palette.md](06-command-palette.md) | CommandPalette | Búsqueda global Ctrl+K | |
| 07 | [07-modales.md](07-modales.md) | Modales genéricos | ConfirmarEliminar, Historial, DuplicadoAlert | |
| 08 | [08-prefijos.md](08-prefijos.md) | Prefijos CSS | Referencia rápida de prefijos por módulo | |

## Reglas

1. **Al modificar CSS o JSX de un componente → marcar el mapa del módulo como "⚠️ pendiente actualizar".** No se actualiza automáticamente; el orchestrator y el usuario deciden cuándo hacerlo.
2. Al agregar un nuevo módulo → crear su mapa y agregarlo a esta tabla.
3. Los mapas usan notación de árbol con clases CSS (no IDs ni data- attributes).
4. Los estados se indican con `[condición]` o `→` para describir el comportamiento.
5. Cada archivo incluye: colores (variables CSS), espaciados, fuentes, sombras, y modo claro/oscuro cuando aplica.
