# Módulos del Sistema
## Definición funcional inicial

**Estado:** Borrador estructural

## 1. Módulo de productos e inventario

### Objetivo
Centralizar la definición de productos y el control de existencias.

### Responsabilidades
- Crear y editar fichas de producto
- Clasificar por categorías y atributos
- Administrar identificadores internos y códigos de barras
- Consultar stock actual
- Registrar movimientos de inventario
- Marcar productos críticos o inactivos

### Entradas principales
- Alta de producto
- Compra
- Venta
- Ajuste
- Devolución
- Conteo físico

### Salidas principales
- Stock disponible
- Kardex o historial de movimientos
- Alertas de bajo inventario
- Valorización del inventario

## 2. Módulo de ventas / POS

### Objetivo
Permitir ventas rápidas y controladas en mostrador.

### Responsabilidades
- Buscar productos
- Construir carrito o documento de venta
- Calcular subtotales y total
- Aplicar tasa activa
- Registrar uno o varios pagos
- Determinar saldo pendiente o vuelto
- Emitir comprobante

### Entradas principales
- Selección de productos
- Cantidades
- Precio aplicable
- Método(s) de pago
- Cliente, si corresponde

### Salidas principales
- Venta cerrada
- Comprobante
- Movimiento de inventario
- Registro de caja
- Cuenta por cobrar, si queda saldo

## 3. Módulo de clientes y cuentas por cobrar

### Objetivo
Gestionar clientes y deudas comerciales.

### Responsabilidades
- Registrar clientes
- Consultar saldo y límite disponible
- Aprobar o bloquear ventas a crédito según reglas
- Registrar abonos parciales
- Consultar historial de deuda
- Emitir estado de cuenta

### Entradas principales
- Datos del cliente
- Venta a crédito
- Abono
- Ajuste autorizado

### Salidas principales
- Saldo por cliente
- Historial de movimientos
- Antigüedad de deuda
- Alertas de vencimiento o exceso

## 4. Módulo de compras y cuentas por pagar

### Objetivo
Registrar abastecimiento y compromisos con proveedores.

### Responsabilidades
- Registrar proveedores
- Cargar compras
- Actualizar costo de productos
- Registrar pagos a proveedor
- Consultar saldos pendientes

### Entradas principales
- Factura de compra
- Detalle de productos
- Condiciones de pago
- Pago a proveedor

### Salidas principales
- Entrada de inventario
- Actualización de costo
- Cuenta por pagar
- Historial de compras por proveedor

## 5. Módulo de caja y pagos

### Objetivo
Ordenar el flujo monetario real del negocio.

### Responsabilidades
- Registrar ingresos por venta
- Identificar método de pago
- Llevar control por moneda
- Preparar cierre diario
- Servir de base para arqueo y conciliación

### Entradas principales
- Cobros
- Abonos
- Pagos diversos
- Aperturas y cierres

### Salidas principales
- Resumen por método de pago
- Resumen por moneda
- Diferencias de caja
- Consolidado diario

## 6. Módulo de configuración comercial

### Objetivo
Administrar parámetros operativos del negocio.

### Responsabilidades
- Definir tasa de cambio activa
- Configurar datos de la empresa
- Ajustar políticas de precio
- Configurar impuestos y recargos
- Parametrizar catálogos auxiliares

## 7. Módulo de reportes

### Objetivo
Transformar la operación en información útil.

### Reportes mínimos esperados
- Cierre de caja diario
- Inventario crítico
- Inventario valorizado
- Ventas por período
- Cuentas por cobrar
- Antigüedad de saldos
- Compras por proveedor

## 8. Módulo de sincronización y continuidad

### Objetivo
Mantener la operación funcional bajo fallas parciales.

### Responsabilidades
- Detectar desconexión o indisponibilidad
- Permitir operación degradada según reglas
- Registrar pendientes
- Reintentar sincronización
- Informar conflictos
- Preservar integridad de datos

## 9. Módulo de seguridad y auditoría

### Objetivo
Controlar acceso, permisos y trazabilidad.

### Responsabilidades
- Autenticación de usuarios
- Asignación de roles
- Registro de acciones críticas
- Trazabilidad de cambios sensibles
- Soporte a revisión administrativa
