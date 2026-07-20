# REQ-1: Sesión de caja por dispositivo

Cualquier equipo autorizado puede abrir una sesión de caja identificada por un ID local de
dispositivo/navegador, sin login extra para vender. La sesión tiene ciclo de vida
(abrir → activa → cerrar) y estado persistente por dispositivo.

Respeta RN-53: la apertura/cierre de caja es control habilitado por el administrador; si el
admin lo deshabilita, la venta y el cobro funcionan sin caja.

#### Requirement: Sesión de caja por dispositivo

El sistema DEBE permitir abrir y cerrar una sesión de caja por dispositivo, identificada por un
`device_id` local persistente, y DEBE exponer el estado de la sesión (activa/cerrada) al resto de
la app y a la UI de venta.

##### Scenario: Abrir caja en un dispositivo autorizado
- **Given** un dispositivo con `device_id` persistido en `localStorage` y la función de caja habilitada por el admin (RN-53/RN-56)
- **When** el usuario pulsa "Abrir caja" e indica saldo inicial
- **Then** el sistema crea un registro `sesion_caja` con `estado='abierta'`, `dispositivo=device_id`, `empresa_id` del tenant, `saldo_inicial` y `abre_at`
- **And** el estado de la app pasa a "caja activa" para ese dispositivo

##### Scenario: Vender requiere caja abierta en ese dispositivo
- **Given** el dispositivo tiene una `sesion_caja` con `estado='abierta'`
- **When** el usuario accede a la pantalla de venta
- **Then** la UI habilita las acciones de venta y registra las ventas asociadas a esa `sesion_caja`

##### Scenario: Cerrar caja
- **Given** una `sesion_caja` activa en el dispositivo
- **When** el usuario pulsa "Cerrar caja" (cierre de turno)
- **Then** el sistema marca `estado='cerrada'`, registra `cierre_at` y el saldo/conteo de ventas del turno
- **And** el dispositivo vuelve a modo solo-lectura hasta que se abra una nueva caja

##### Scenario: Caja deshabilitada por el admin
- **Given** el parámetro de caja está desactivado en la configuración del tenant (RN-53)
- **When** el usuario usa la app en el dispositivo
- **Then** el sistema NO exige sesión de caja para vender; la venta y el cobro operan sin `sesion_caja`
- **And** no se bloquea ninguna operación por falta de caja
