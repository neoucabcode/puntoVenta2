# pos-split-payments Specification

Pagos combinados (split divisa/método), asociación de cliente y crédito → cuentas por cobrar. Slice 3.

## ADDED Requirements

#### Requirement: Pago dividido en múltiples métodos/divisas

<!-- slice: 3 -->

El sistema DEBE permitir dividir el pago de una venta en ≥2 partes (método y/o divisa distintos)
cuya suma converja al total usando la tasa Bs/$ vigente. El pago NO DEBE aceptarse si la suma de
partes ≠ total.

##### Scenario: Split Bs + USD

- **Given** total 200 Bs, tasa 100 Bs/USD
- **When** el usuario paga 100 Bs + 1 USD
- **Then** el sistema acepta y registra ambas partes cubriendo el total

##### Scenario: Suma insuficiente rechazada

- **Given** total 200 Bs
- **When** el usuario paga solo 150 Bs en partes
- **Then** el sistema bloquea el cierre y exige completar el total

#### Requirement: Asociar cliente a la venta

<!-- slice: 3 -->

El sistema DEBE permitir asociar un cliente (existente o nuevo) a la venta antes del cobro,
guardando `cliente_id` en el evento de venta (offline y online).

##### Scenario: Cliente asociado

- **Given** usuario selecciona cliente "Ferretería X"
- **When** completa la venta
- **Then** el evento de venta lleva `cliente_id` y queda visible en el histórico

##### Scenario: Cliente nuevo desde caja

- **Given** cliente no existe
- **When** el usuario crea el cliente rápido en caja
- **Then** el sistema guarda el cliente (local/online) y lo asocia a la venta

#### Requirement: Crédito genera cuenta por cobrar

<!-- slice: 3 -->

El sistema DEBE, cuando la venta es a crédito (saldo pendiente), crear automáticamente un registro
`cuenta_por_cobrar` con cliente, monto, divisa y `empresa_id`, y DEBE permitir registrar abonos.

##### Scenario: Venta a crédito → cxc

- **Given** venta por 500 Bs a crédito parcial
- **When** se confirma
- **Then** el sistema crea `cuenta_por_cobrar` por el saldo y lo enlaza a la venta

##### Scenario: Crédito offline

- **Given** dispositivo offline
- **When** se registra venta a crédito
- **Then** el cxc se guarda localmente y se encola para sync (RN-11/auto-sync)
