# pos-quotations Specification

Presupuestos/cotizaciones exportables en PDF/Excel con el logo de la empresa. Slice 5.

## ADDED Requirements

#### Requirement: Generar presupuesto

<!-- slice: 5 -->

El sistema DEBE permitir crear un presupuesto desde la caja (ítems, cantidades, precios, cliente
opcional) sin convertirlo en venta ni afectar stock.

##### Scenario: Presupuesto sin afectar stock

- **Given** usuario arma un presupuesto de 3 ítems
- **When** lo guarda como borrador
- **Then** el sistema lo almacena y NO descuenta stock ni crea venta

#### Requirement: Exportar PDF/Excel con logo

<!-- slice: 5 -->

El sistema DEBE exportar el presupuesto a PDF y a Excel incluyendo el logo de la empresa del tenant
desde `empresa_id`. Si no hay logo, DEBE usar un placeholder de texto de la empresa.

##### Scenario: Exportación PDF con logo

- **Given** presupuesto y logo configurado
- **When** el usuario exporta PDF
- **Then** el archivo incluye logo, ítems, totales y tasa Bs/$ si aplica

##### Scenario: Exportación sin logo configurado

- **Given** tenant sin logo
- **When** exporta Excel
- **Then** el sistema usa el nombre de la empresa como encabezado (sin romper la exportación)

##### Scenario: Presupuesto offline

- **Given** dispositivo offline
- **When** genera/exporta el presupuesto
- **Then** el sistema lo genera localmente sin requerir red
