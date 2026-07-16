# Reglas de Negocio
## Ferretería Bimonetaria

**Estado:** Definición (Fase 0) — sujeto a validación
**Referencia de trazabilidad:** cada regla indica su estado. Las reglas monetarias y de continuidad son *Hecho/Supuesto pendiente de validación*; las decisiones de stack que las afectan viven en `08`.

## 1. Reglas monetarias

### RN-01. Moneda de referencia
La moneda de resguardo del negocio será USD para costos, precios base y saldos de crédito, salvo definición futura en contrario. *(Hecho / Supuesto pendiente de validación)*

### RN-02. Moneda de transacción
Las operaciones de venta y cobro podrán registrarse en USD, VES o en combinación de varios métodos y monedas.

### RN-03. Tasa activa
Toda conversión entre USD y VES debe usar una tasa activa de referencia configurada para el día.

### RN-04. Doble expresión
Toda pantalla relevante de venta, cobro, consulta de precios y reportes operativos deberá mostrar montos en USD y VES cuando aplique.

### RN-05. Pagos mixtos
Una misma venta podrá cancelarse con múltiples métodos de pago y en varias monedas.

### RN-06. Vuelto
El sistema debe calcular automáticamente el excedente pagado y determinar el vuelto pendiente según moneda y reglas de caja.

### RN-07. IGTF
La aplicación del IGTF debe modelarse como regla configurable, no como comportamiento fijo. *(Supuesto — ver `01` §3)*

## 2. Reglas de productos e inventario

### RN-08. Identidad del producto
Cada producto debe tener una identidad única en el sistema, independientemente de variaciones de nombre libre.

### RN-09. Prevención de duplicados
El sistema debe ayudar a evitar duplicados mediante código de barras, coincidencia por texto y estructura estándar de ficha.

### RN-10. Datos mínimos de producto
Todo producto debe tener al menos:
- Identificador interno
- Nombre comercial legible
- Categoría
- Unidad o presentación
- Costo
- Precio o regla de precio
- Estado activo/inactivo

### RN-11. Movimiento de inventario
Toda entrada o salida de inventario debe quedar asociada a una causa:
- compra
- venta
- ajuste
- devolución
- merma
- corrección manual autorizada

### RN-12. Stock crítico
El sistema debe permitir definir mínimo operativo por producto y alertar cuando el stock caiga por debajo del umbral.

## 3. Reglas de ventas

### RN-13. Búsqueda rápida
El punto de venta debe permitir ubicar productos por código, SKU, nombre o coincidencia parcial.

### RN-14. Integridad de la venta
Una venta cerrada debe conservar:
- fecha y hora
- usuario responsable
- tasa aplicada
- detalle de productos
- subtotales
- impuestos si aplican
- pagos recibidos
- saldo pendiente si lo hubiera

### RN-15. Métodos de pago
Los métodos de pago deben registrarse de forma desagregada, no como texto libre.

### RN-16. Evidencia de cobro
Todo pago o abono debe quedar trazado con monto, moneda, método, fecha y usuario.

## 4. Reglas de clientes y cuentas por cobrar

### RN-17. Registro de cliente
Para operar crédito, el cliente debe existir previamente con identificación y datos mínimos definidos.

### RN-18. Límite de crédito
Toda venta a crédito debe validar disponibilidad contra un límite aprobado y saldo actual.

### RN-19. Resguardo del saldo
Las deudas de clientes deben conservar un saldo de referencia que evite pérdida de valor por devaluación.

### RN-20. Abonos
Un cliente puede realizar abonos parciales, en distintas fechas, monedas y métodos de pago.

### RN-21. Historial
Todo movimiento sobre una deuda debe ser auditable y reconstruible cronológicamente.

## 5. Reglas de proveedores y cuentas por pagar

### RN-22. Registro de proveedor
Toda compra debe asociarse a un proveedor existente o registrado en el momento.

### RN-23. Ingreso por compra
Una compra aprobada debe generar entrada de inventario y actualización del costo según la política definida.

### RN-24. Deuda con proveedor
Si la compra no se paga completa, debe abrirse una cuenta por pagar con saldo identificable y trazable.

## 6. Reglas de caja y reportes

### RN-25. Cierre diario
El sistema debe consolidar ingresos por método de pago y moneda para el cierre diario.

### RN-26. Reporte de cartera
El sistema debe generar antigüedad de saldos de clientes.

### RN-27. Reporte de inventario
El sistema debe permitir ver inventario valorizado y productos críticos.

## 7. Reglas de continuidad operativa

### RN-28. Operación degradada
Ante fallo de conectividad o indisponibilidad del nodo principal, el sistema debe preservar la continuidad mínima de la operación.

### RN-29. Registro pendiente
Toda operación realizada en modo degradado debe marcarse como pendiente de conciliación o sincronización.

### RN-30. No pérdida silenciosa
El sistema no debe descartar transacciones offline sin trazabilidad ni advertencia.

## 8. Reglas de ventas (complemento)

### RN-31. Comprobante interno
El sistema emite comprobante interno de venta en esta fase; la factura fiscal queda para fase posterior. *(Decisión aprobada — ver `11` §1)*

### RN-32. Presupuesto / cotización
Se permite registrar una venta en borrador (cotización) sin afectar stock ni caja hasta su confirmación. *(Decisión aprobada — ver `11` §1)*

### RN-33. Anulación y no edición
Una venta cerrada no se edita; solo se anula con autorización (permiso elevado) generando traza, o se emite nota de crédito. *(Decisión aprobada — ver `11` §1)*

### RN-34. Nota de crédito por devolución
La devolución de mercancía genera nota de crédito y reversa el movimiento de inventario asociado. *(Decisión aprobada — ver `11` §1)*

### RN-35. Descuentos
El sistema debe soportar descuento por línea (ítem) y descuento global de venta. *(Decisión aprobada — ver `11` §1)*

## 9. Reglas de caja (complemento)

### RN-36. Apertura de caja
La apertura de caja por usuario y turno con monto inicial es **opcional y configurable**: el administrador puede habilitarla o deshabilitarla. Cuando está deshabilitada, el sistema opera sin control de caja. *(Decisión aprobada — ver `11` §2, RN-53)*

### RN-37. Multi-caja
En MVP se maneja una caja por dispositivo; la multi-caja queda para fase posterior. *(Pendiente de validación — ver `11` §2)*

### RN-38. Disponible por moneda y método
El sistema debe registrar el disponible esperado de caja desagregado por moneda y método de pago. *(Decisión aprobada — ver `11` §2)*

### RN-39. Vuelto y sugerencia
El sistema calcula el vuelto automáticamente; la sugerencia según disponible físico es opcional en MVP. *(Decisión aprobada — ver `11` §2)*

## 10. Reglas de crédito (complemento)

### RN-40. Aprobación de crédito
El crédito se aprueba automáticamente si saldo actual + nueva venta ≤ límite; si excede, requiere aprobación de administrador. *(Decisión aprobada — ver `11` §3)*

### RN-41. Plazo de crédito
El crédito tiene un plazo configurable en días por cliente para el cálculo de antigüedad. *(Decisión aprobada — ver `11` §3)*

### RN-42. Estado de cuenta
El sistema debe poder emitir estado de cuenta de la cartera de clientes. *(Decisión aprobada — ver `11` §3)*

### RN-43. Seguimiento de cobranza
El seguimiento activo de cobranza queda para fase posterior; en MVP solo registro contable. *(Pendiente de validación — ver `11` §3)*

## 11. Reglas de inventario (complemento)

### RN-44. Almacenes
En MVP se maneja un almacén; el multi-almacén queda para fase posterior. *(Pendiente de validación — ver `11` §4)*

### RN-45. Ubicación física
En MVP no se controla ubicación por anaquel; solo cantidad global. *(Pendiente de validación — ver `11` §4)*

### RN-46. Costo de producto
El costo es promedio móvil por defecto; el ajuste manual requiere autorización. *(Decisión aprobada — ver `11` §4)*

### RN-47. Kits y combos
En MVP no se manejan kits/combos; se modelan como productos independientes. *(Pendiente de validación — ver `11` §4)*

## 12. Reglas de compras (complemento)

### RN-48. Órdenes de compra
En MVP la compra se registra directa al recibir mercancía; no hay órdenes previas. *(Pendiente de validación — ver `11` §5)*

### RN-49. Recepción parcial
En MVP la recepción es total de la factura; la parcial queda para fase posterior. *(Pendiente de validación — ver `11` §5)*

### RN-50. Devolución a proveedor
La devolución a proveedor genera nota de crédito y reversa la entrada de inventario. *(Decisión aprobada — ver `11` §5)*

## 13. Reglas de operación técnica (complemento)

### RN-51. Sin acceso remoto
En MVP no se requiere acceso remoto desde fuera del local. *(Decisión aprobada — ver `11` §6)*

### RN-52. Cola de pendientes visible
La sincronización debe exponer una cola de pendientes visible para el usuario, no transparente. *(Decisión aprobada — ver `11` §6)*

## 14. Reglas de configurabilidad (adaptación al negocio)

> **Principio rector:** El sistema no debe trabajar en contra del negocio. Todo control que pueda ser contraproducente cuando es variable debe poder ser habilitado o deshabilitado por el administrador, sin requerir cambios de código.

### RN-53. Control de caja opcional
El módulo de caja (apertura, cierre, disponible por moneda/método) es **opcional**. El administrador decide si el negocio lo usa. Si lo deshabilita, la venta y el cobro funcionan sin exigir cierre de caja. *(Decisión aprobada — ver `11` §2)*

### RN-54. Venta sin stock disponible
El sistema debe permitir configurar si se permite vender cuando no hay stock (ej. entregas pendientes, notas de entrega). Por defecto puede estar permitido; el administrador lo ajusta. La venta no se bloquea de forma fija e inmodificable. *(Decisión aprobada — ver `11` §4)*

### RN-55. Stock negativo
El manejo de stock negativo (por descuadres, mermas o ventas sin existencia) es **configurable**. El administrador habilita o no el stock negativo según su operación. *(Decisión aprobada — ver `11` §4)*

### RN-56. Parámetros habilitables por administrador
Toda regla de control que sea potencialmente variable para el negocio (caja, stock, descuentos, crédito, IGTF, validaciones) debe exponerse como parámetro de configuración que el administrador puede activar o desactivar. El sistema se adapta al negocio; no impone controles rígidos. *(Decisión aprobada — ver `11` §6, `06`)*
