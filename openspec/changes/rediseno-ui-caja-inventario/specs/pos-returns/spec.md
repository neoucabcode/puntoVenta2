# pos-returns Specification

Flujo de devolución separado, con auditoría de stock y sin romper cxc ni offline. Slice 4.

## ADDED Requirements

#### Requirement: Devolución como flujo aparte

<!-- slice: 4 -->

El sistema DEBE ofrecer un flujo de devolución independiente de la venta, permitiendo devolver una
venta completa o ítems específicos, y DEBE registrar un `movimiento_stock` (RN-11) de entrada por
cada ítem devuelto.

##### Scenario: Devolución total

- **Given** una venta previa confirmada
- **When** el usuario inicia devolución total
- **Then** el sistema reversa las líneas, ajusta stock (+) y crea `movimiento_stock` con causa "devolucion"

##### Scenario: Devolución parcial de ítems

- **Given** venta con 3 ítems
- **When** el usuario devuelve solo 1 ítem
- **Then** el sistema ajusta stock solo de ese ítem y registra su movimiento

#### Requirement: Devolución no rompe cxc ni offline

<!-- slice: 4 -->

El sistema DEBE procesar devoluciones preservando cuentas por cobrar y el modelo offline: una
devolución offline se encola y sincroniza igual que una venta.

##### Scenario: Devolución de venta a crédito

- **Given** una venta con cxc pendiente
- **When** se devuelve parcialmente
- **Then** el sistema ajusta el saldo de `cuenta_por_cobrar` y registra el movimiento

##### Scenario: Devolución offline

- **Given** dispositivo sin conexión
- **When** el usuario completa una devolución
- **Then** el evento se encola localmente y sincroniza al reconectar
