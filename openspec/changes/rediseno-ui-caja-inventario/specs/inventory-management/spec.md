# inventory-management Specification

Gestión de inventario estilo Fina: CRUD de productos y categorías, ajuste de stock con auditoría,
alerta de bajo stock y valuación, accesible SOLO para admin (Slice 1+).

## ADDED Requirements

#### Requirement: Acceso a Inventario gated solo admin

<!-- slice: 1 -->

El sistema DEBE exponer la ruta `/inventario` y `InventarioPage` únicamente a usuarios con
`rol='admin'`; para `rol='vendedor'` u otro, la sección DEBE estar oculta o bloqueada. Si el
modelo de rol aún no existe, se aplica un feature flag que desactiva el acceso por defecto.

##### Scenario: Admin accede a Inventario

- **Given** un usuario autenticado con `rol='admin'`
- **When** pulsa "Inventario" en la nav
- **Then** el sistema navega a `/inventario` y renderiza CRUD + categorías

##### Scenario: Vendedor bloqueado

- **Given** un usuario con `rol='vendedor'`
- **When** intenta abrir `/inventario` (nav o URL directa)
- **Then** el sistema oculta el item de nav y redirige/deniega el acceso

##### Scenario: Rol no implementado aún (fallback)

- **Given** la columna `rol` no existe en `usuario`
- **When** el sistema evalúa el acceso a Inventario
- **Then** aplica el feature flag (default: oculto) y registra la dependencia de design

#### Requirement: CRUD de productos y categorías

<!-- slice: 1 -->

El sistema DEBE permitir alta, modificación y baja de productos (con campo `stock_minimo`) y de
categorías, aislado por `empresa_id` vía RLS. Toda escritura DEBE respetar multi-tenant.

##### Scenario: Alta de producto

- **Given** admin en `/inventario`
- **When** completa el formulario de producto y guarda
- **Then** el sistema crea el producto con `empresa_id` del tenant y `stock_minimo` ingresado

##### Scenario: Baja de producto con referencias

- **Given** un producto ya usado en ventas
- **When** admin lo da de baja
- **Then** el sistema lo marca inactivo (soft delete) sin romper histórico de ventas

#### Requirement: Ajuste de stock con motivo y auditoría

<!-- slice: 1 -->

El sistema DEBE permitir ajustar el stock de un producto indicando un motivo, y DEBE registrar un
`movimiento_stock` (RN-11) con `producto_id`, `cantidad`, `motivo`, `usuario_id` y `empresa_id`.
El ajuste NO DEBE bloquearse si el stock resultante queda negativo cuando la configuración lo permite (RN-55).

##### Scenario: Ajuste positivo registra movimiento

- **Given** admin ajusta stock +10 con motivo "conteo físico"
- **When** confirma
- **Then** el stock se actualiza y se crea `movimiento_stock` con causa "ajuste" y motivo

##### Scenario: Ajuste que deja stock negativo

- **Given** configuración permite stock negativo (RN-55)
- **When** un ajuste deja stock < 0
- **Then** el sistema aplica el ajuste y registra el movimiento sin bloquear

#### Requirement: Alerta de bajo stock

<!-- slice: 1 -->

El sistema DEBE señalar los productos cuyo `stock <= stock_minimo` en la vista de Inventario (y
opcionalmente en caja), sin bloquear la operación.

##### Scenario: Producto bajo mínimo

- **Given** un producto con `stock=2` y `stock_minimo=5`
- **When** se renderiza Inventario
- **Then** el sistema muestra una alerta/badge de "bajo stock" para ese producto

#### Requirement: Valuación de inventario

<!-- slice: 1 -->

El sistema DEBE calcular y mostrar la valuación total como Σ(costo × stock) de los productos del
tenant, actualizada tras altas/ajustes.

##### Scenario: Valuación correcta

- **Given** productos A(costo 10, stock 3) y B(costo 5, stock 4)
- **When** se solicita la valuación
- **Then** el sistema muestra 10×3 + 5×4 = 50
