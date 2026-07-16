# Supuestos y Preguntas Abiertas
## Proyecto Ferretería Bimonetaria

**Estado:** Documento de trabajo  
**Objetivo:** Separar hechos observados, supuestos del borrador y puntos que requieren validación.

## 1. Hechos tomados del borrador original

A partir del documento base, hoy podemos asumir provisionalmente que:

- La ferretería necesita inventario, ventas, CxC, CxP, configuración y reportes.
- El negocio opera en entorno bimonetario.
- El inventario y las deudas quieren resguardarse en USD.
- El sistema debe aceptar cobros en VES, USD y pagos mixtos.
- La tasa BCV del día influye en la operación.
- La continuidad offline es importante.
- Habrá más de un dispositivo dentro del negocio.

## 2. Supuestos del borrador que NO están aprobados aún

Los siguientes puntos aparecen en el borrador, pero deben tratarse como hipótesis, no como decisiones:

- Backend en Go
- Frontend en React PWA
- Base principal en SQLite o PostgreSQL local
- Base cliente en IndexedDB
- Sincronización offline-first basada en réplica local
- Generación automática de SKU con formato fijo
- Compresión obligatoria de imágenes a un tamaño específico
- Impresión directa para ciertas marcas de impresoras
- Automatización de consulta BCV
- Aplicación opcional de IGTF según configuración

## 3. Preguntas abiertas de negocio

### 3.1 Sobre ventas
- ¿La venta requiere factura fiscal o solo comprobante interno?
- ¿Se manejarán presupuestos además de facturas?
- ¿Habrá devoluciones, notas de crédito o anulaciones?
- ¿Se permitirá modificar una venta cerrada?
- ¿Habrá descuentos por ítem, por factura o ambos?

### 3.2 Sobre caja
- ¿Habrá apertura de caja por usuario/turno?
- ¿Habrá múltiples cajas simultáneas?
- ¿Se controla el disponible físico por moneda y método de pago?
- ¿El sistema debe sugerir vuelto según disponibilidad real en caja o solo calcularlo?

### 3.3 Sobre clientes y crédito
- ¿El crédito es manual, automático o sujeto a aprobación?
- ¿Se manejará vencimiento de crédito por días?
- ¿Se bloqueará venta si el cliente excede límite?
- ¿Se emitirán estados de cuenta?
- ¿Habrá cobranza con seguimiento o solo registro contable?

### 3.4 Sobre inventario
- ¿Se manejará un solo almacén o varios?
- ¿Habrá inventario por anaquel/ubicación?
- ¿Se permitirán productos sin código de barras?
- ¿El costo del producto será promedio, último costo o manual?
- ¿Se manejarán kits, combos o equivalencias?

### 3.5 Sobre compras
- ¿Las compras afectan inmediatamente el costo de venta?
- ¿Se requieren órdenes de compra previas?
- ¿Se registrará recepción parcial de mercancía?
- ¿Habrá devoluciones a proveedor?

### 3.6 Sobre operación técnica
- ¿Cuál es el escenario real de cortes y fallos?
- ¿Cuántos usuarios concurrentes habrá?
- ¿Qué dispositivos se usarán realmente?
- ¿Se requiere acceso remoto desde fuera del local?
- ¿La sincronización debe ser transparente o puede haber cola de pendientes visible?

## 4. Riesgos de avanzar sin resolver esto

Si una IA constructora recibe el proyecto sin responder estas preguntas, es muy probable que:

- Cierre reglas de negocio incorrectas
- Diseñe pantallas que no reflejen la operación real
- Modele mal los saldos en moneda
- Genere flujos inseguros para ventas, créditos o caja
- Diseñe una arquitectura técnicamente elegante pero operativamente incómoda

## 5. Regla de trabajo para las siguientes fases

Hasta nuevo aviso:

- Las necesidades del negocio sí se pueden redactar y refinar.
- Las decisiones técnicas quedan en estado **pendiente**.
- Toda definición nueva debe indicar si es:
  - Hecho validado
  - Supuesto
  - Decisión pendiente
  - Recomendación técnica futura
