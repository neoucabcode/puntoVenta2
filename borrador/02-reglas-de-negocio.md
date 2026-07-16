# Reglas de Negocio
## Ferretería Bimonetaria

**Estado:** Borrador funcional sujeto a validación

## 1. Reglas monetarias

### RN-01. Moneda de referencia
La moneda de resguardo del negocio será USD para costos, precios base y saldos de crédito, salvo definición futura en contrario.

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
La aplicación del IGTF debe modelarse como regla configurable, no como comportamiento fijo.

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
