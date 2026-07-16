# Modelo de Datos Conceptual
## Proyecto Ferretería Bimonetaria

**Estado:** Definición (Fase 0) — modelo conceptual (no relacional)
**Relación:** Deriva de los módulos en `03-modulos-del-sistema.md` y de las reglas de negocio en `02-reglas-de-negocio.md`.

> **Trazabilidad:** Modelo conceptual independiente del stack. Las decisiones de base de datos y esquema físico son *Decisión pendiente* (`08`). Aquí solo se describen entidades, atributos clave y relaciones de negocio.

## 1. Entidades principales

### Producto
- Identificador interno (RN-08)
- Nombre comercial
- Categoría
- Unidad / presentación
- Código de barras (opcional, RN-09)
- Costo (en USD, RN-01, RN-19)
- Precio o regla de precio
- Stock actual
- Mínimo operativo / stock crítico (RN-12)
- Estado activo / inactivo

### Movimiento de Inventario
- Producto
- Tipo de causa: compra, venta, ajuste, devolución, merma, corrección (RN-11)
- Cantidad
- Fecha / hora
- Usuario responsable
- Documento origen (compra o venta)

### Cliente
- Identificación
- Datos mínimos (RN-17)
- Límite de crédito (RN-18)
- Saldo actual (en USD, RN-19)

### Cuenta por Cobrar
- Cliente
- Saldo pendiente (USD, RN-19)
- Histórico de abonos (RN-20, RN-21)
- Antigüedad de saldos (RN-26)

### Abono
- Cuenta por cobrar
- Monto
- Moneda
- Método de pago (RN-15)
- Tasa aplicada (RN-03)
- Fecha y usuario (RN-16)

### Proveedor
- Identificación
- Datos mínimos (RN-22)

### Compra
- Proveedor (RN-22)
- Detalle de productos y costos
- Condiciones de pago
- Entrada de inventario generada (RN-23)
- Cuenta por pagar si hay saldo (RN-24)

### Venta
- Fecha / hora (RN-14)
- Usuario responsable
- Tasa aplicada (RN-14)
- Detalle de productos
- Subtotales
- Impuestos si aplican
- Pagos recibidos (RN-14)
- Saldo pendiente / vuelto (RN-06)
- Cliente si es a crédito (RN-18)

### Pago
- Método de pago desagregado (RN-15)
- Moneda (RN-02)
- Monto
- Fecha y usuario (RN-16)

### Caja / Cierre
- Ingresos por método y moneda (RN-25)
- Diferencias de caja
- Observaciones de ajuste

### Configuración Comercial
- Tasa activa (RN-03)
- Datos de empresa
- Políticas de precio
- Regla de IGTF (RN-07)

### Pendiente de Sincronización
- Operación realizada en modo degradado (RN-28, RN-29)
- Marca de pendiente de conciliación
- Estado de conflicto (RN-29, RN-30)

## 2. Relaciones clave

- Producto 1─* Movimiento de Inventario
- Venta 1─* Pago (pagos mixtos, RN-05)
- Venta 1─1 Cuenta por Cobrar (si saldo)
- Cliente 1─* Cuenta por Cobrar
- Cuenta por Cobrar 1─* Abono
- Compra 1─* Movimiento de Inventario (entrada)
- Compra 1─1 Cuenta por Pagar (si saldo)
- Proveedor 1─* Compra

## 2.1 Mapeo entidad → módulo → flujo

Cada entidad del modelo se origina y se consume en los módulos y flujos siguientes:

- **Producto** → Módulo Productos e Inventario (`03`) → Flujo: Registrar producto nuevo (`04`)
- **Movimiento de Inventario** → Módulo Productos e Inventario (`03`) → Flujo: Entrada por compra (`04`)
- **Cliente** → Módulo Clientes y CxC (`03`) → Flujo: Venta a crédito (`04`)
- **Cuenta por Cobrar** → Módulo Clientes y CxC (`03`) → Flujo: Venta a crédito (`04`)
- **Abono** → Módulo Clientes y CxC (`03`) → Flujo: Abono de cliente (`04`)
- **Proveedor** → Módulo Compras y CxP (`03`) → Flujo: Entrada por compra (`04`)
- **Compra** → Módulo Compras y CxP (`03`) → Flujo: Entrada por compra (`04`)
- **Venta** → Módulo Ventas / POS (`03`) → Flujo: Venta contado pago mixto (`04`), Flujo: Venta a crédito (`04`)
- **Pago** → Módulo Caja y Pagos (`03`) → Flujo: Venta contado pago mixto (`04`), Flujo: Cierre diario (`04`)
- **Caja / Cierre** → Módulo Caja y Pagos (`03`) → Flujo: Cierre diario (`04`)
- **Configuración Comercial** → Módulo Configuración Comercial (`03`) → Flujo: Venta contado pago mixto (`04`)
- **Pendiente de Sincronización** → Módulo Sincronización y Continuidad (`03`) → Flujo: Operación degradada/offline (`04`)

## 3. Principios de modelo

- Los saldos monetarios se resguardan en USD y se expresan también en VES (RN-01, RN-04).
- Toda conversión usa la tasa activa del día (RN-03).
- Toda entidad transaccional conserva trazabilidad de usuario, fecha y tasa (RN-14, RN-16, RN-21).
- Las operaciones offline quedan como pendientes sin pérdida (RN-29, RN-30).
