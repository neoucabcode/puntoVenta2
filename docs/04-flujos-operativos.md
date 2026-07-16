# Flujos Operativos
## Escenarios principales del negocio

**Estado:** Definición (Fase 0) — borrador funcional

## 1. Flujo: registrar producto nuevo

1. El usuario abre el módulo de productos.
2. Busca si el artículo ya existe por código, nombre o coincidencia.
3. Si encuentra coincidencia, el sistema sugiere reutilizar o editar el producto existente.
4. Si no existe, el usuario completa la ficha mínima.
5. El sistema genera o valida identificadores internos.
6. El producto queda disponible para compra, venta y consulta.

## 2. Flujo: registrar entrada por compra

1. El usuario selecciona proveedor.
2. Registra factura de compra.
3. Carga productos, cantidades y costos.
4. El sistema actualiza inventario.
5. El sistema recalcula o conserva costos según política futura.
6. Si queda saldo pendiente, se crea cuenta por pagar.

## 3. Flujo: venta de contado con pago mixto

1. El cajero busca productos.
2. Agrega cantidades al documento.
3. El sistema calcula total en moneda de referencia y equivalente actual.
4. El cajero registra pagos por uno o varios métodos.
5. El sistema valida que el total esté cubierto.
6. Si hay excedente, calcula vuelto.
7. Se cierra venta, descuenta stock y registra movimiento de caja.

## 4. Flujo: venta a crédito

1. El cajero identifica al cliente.
2. El sistema consulta saldo actual y límite disponible.
3. Si el cliente califica, se autoriza la venta.
4. La venta queda registrada con saldo pendiente.
5. El sistema crea o actualiza la cuenta por cobrar.

## 5. Flujo: abono de cliente

1. El usuario busca al cliente o su deuda.
2. Selecciona la cuenta pendiente.
3. Registra monto, moneda y método de pago.
4. El sistema aplica la tasa correspondiente según regla aprobada.
5. Se actualiza el saldo y queda trazado el abono.

## 6. Flujo: cierre diario

1. El usuario ejecuta cierre.
2. El sistema resume ingresos por método y moneda.
3. El usuario contrasta contra caja física.
4. Si hay diferencia, debe registrarse observación o ajuste autorizado.
5. El cierre queda almacenado para auditoría.

## 7. Flujo: operación degradada / sin conexión

1. El sistema detecta indisponibilidad del servicio principal.
2. Habilita modo de continuidad según permisos.
3. Las operaciones nuevas se marcan como pendientes.
4. Cuando el sistema recupera conectividad, intenta conciliación.
5. Si hay conflicto, se eleva a revisión en lugar de sobrescribir silenciosamente.
