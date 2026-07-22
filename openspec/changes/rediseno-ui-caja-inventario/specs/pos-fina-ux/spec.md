# pos-fina-ux Specification

Refresh visual de la caja (estilo Fina): carrito limpio, tasa Bs/$ visible y métodos de pago claros,
SIN alterar el comportamiento offline (RN-53/54/55/56). Slice 2.

## ADDED Requirements

#### Requirement: Carrito limpio y legible

<!-- slice: 2 -->

El sistema DEBE presentar el carrito de `PosPage` con layout claro: ítem, cantidad, precio unitario,
subtotal y total, separando visualmente las líneas y permitiendo quitar/modificar cantidad.

##### Scenario: Carrito con múltiples ítems

- **Given** una venta con 3 líneas distintas
- **When** el usuario ve el carrito
- **Then** cada línea muestra descripción, cantidad editable y subtotal; el total es visible

##### Scenario: Carrito vacío

- **Given** sin líneas
- **When** se abre la caja
- **Then** el sistema muestra estado vacío claro, no un carrito roto

#### Requirement: Tasa Bs/$ visible

<!-- slice: 2 -->

El sistema DEBE mostrar la tasa de cambio Bs/$ vigente de forma explícita en la UI de caja, y DEBE
indicar si la tasa está desactualizada respecto al último sync.

##### Scenario: Tasa visible en caja

- **Given** tasa sincronizada recientemente
- **When** el usuario opera la caja
- **Then** la UI muestra "1 USD = X Bs" junto al total o conversión

##### Scenario: Tasa desactualizada offline

- **Given** el dispositivo offline y la última tasa tiene más de N horas
- **When** se muestra la tasa
- **Then** el sistema la presenta marcada como "puede estar desactualizada"

#### Requirement: Métodos de pago claros

<!-- slice: 2 -->

El sistema DEBE listar los métodos de pago disponibles (efectivo Bs, efectivo USD, transferencia,
etc.) de forma explícita y seleccionable, sin cambiar la lógica de cobro offline.

##### Scenario: Selección de método

- **Given** usuario en cobro
- **When** elige "Transferencia USD"
- **Then** el sistema registra el método y muestra el monto convertido con la tasa visible

#### Requirement: Preservación de comportamiento offline en el refresh

<!-- slice: 2 -->

El sistema NO DEBE modificar `useCajaStore`, la cola offline ni el auto-sync al aplicar este refresh
visual; la UX es puramente presentacional.

##### Scenario: Refresh sin regresión de cola

- **Given** venta offline con el nuevo carrito
- **When** se completa la venta
- **Then** el evento se encola en `ventas_pendientes` idéntico a antes del refresh
