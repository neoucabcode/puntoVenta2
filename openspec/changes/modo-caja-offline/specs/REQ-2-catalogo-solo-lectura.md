# REQ-2: Catálogo de solo-lectura condicional

Los equipos que NO tienen una sesión de caja abierta en el dispositivo pueden consultar el
catálogo, pero no deben poder crear, editar, borrar ni vender. Esto protege la operación de
mostrador cuando un dispositivo se usa solo para consulta o está offline sin caja.

#### Requirement: Catálogo de solo-lectura cuando no hay caja abierta

El sistema DEBE restringir la UI de catálogo/venta a solo-lectura cuando el dispositivo no tiene
una `sesion_caja` activa (y la caja está habilitada por el admin), ocultando los controles de
edición, creación, borrado y venta.

##### Scenario: Equipo sin caja abierta solo consulta
- **Given** el dispositivo no tiene `sesion_caja` con `estado='abierta'` y la caja está habilitada
- **When** el usuario abre el catálogo
- **Then** el sistema muestra los productos en modo consulta
- **And** oculta los botones "Crear", "Editar", "Borrar" y "Vender"

##### Scenario: Equipo con caja abierta tiene controles completos
- **Given** el dispositivo tiene `sesion_caja` activa
- **When** el usuario abre el catálogo/venta
- **Then** el sistema muestra los controles de crear, editar, borrar y vender habilitados

##### Scenario: Lectura offline del catálogo sin caja
- **Given** el dispositivo está sin internet y sin caja abierta
- **When** el usuario abre el catálogo
- **Then** el sistema sirve el catálogo desde la caché local (IndexedDB / último sync)
- **And** mantiene los controles ocultos (solo-lectura), sin ofrecer venta

##### Scenario: Caja deshabilitada por admin permite venta sin sesión
- **Given** el parámetro de caja está desactivado (RN-53)
- **When** el usuario usa la app en el dispositivo
- **Then** el sistema NO aplica la restricción de solo-lectura derivada de "sin caja"; la venta queda habilitada
