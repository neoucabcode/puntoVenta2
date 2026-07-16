# Supuestos y Preguntas Abiertas
## Proyecto Ferretería Bimonetaria

**Estado:** Definición (Fase 0)
**Objetivo:** Separar hechos observados, supuestos del borrador y puntos que requieren validación.

## 1. Hechos tomados del borrador original

A partir del documento base, hoy podemos asumir provisionalmente que *(Hecho validado)*:

- La ferretería necesita inventario, ventas, CxC, CxP, configuración y reportes.
- El negocio opera en entorno bimonetario.
- El inventario y las deudas quieren resguardarse en USD.
- El sistema debe aceptar cobros en VES, USD y pagos mixtos.
- La tasa BCV del día influye en la operación.
- La continuidad offline es importante.
- Habrá más de un dispositivo dentro del negocio.

## 2. Supuestos del borrador que NO están aprobados aún

Los siguientes puntos aparecen en el borrador, pero deben tratarse como hipótesis, no como decisiones *(Supuesto)*:

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

> Estos supuestos se listan sin resolver en `08-opciones-de-stack-y-decisiones.md`. No constituyen decisión técnica.

## 3. Preguntas abiertas de negocio

> **Estado:** Resueltas en `11-decisiones-cerradas.md`. Las respuestas y reglas resultantes (RN-31 a RN-52) viven en `02-reglas-de-negocio.md`. Lo que queda como *Pendiente de validación con el cliente* está listado en `11` §7.

### 3.1 Sobre ventas — *Cerrada (ver `11` §1, RN-31 a RN-35)*
- ¿Factura fiscal o comprobante interno? → Comprobante interno en MVP.
- ¿Presupuestos además de facturas? → Sí, como venta en borrador.
- ¿Devoluciones / notas de crédito / anulaciones? → Sí, anulación con autorización + nota de crédito.
- ¿Modificar venta cerrada? → No, solo anular/re-emitir.
- ¿Descuentos por ítem o factura? → Ambos.

### 3.2 Sobre caja — *Cerrada (ver `11` §2, RN-36 a RN-39)*
- ¿Apertura por usuario/turno? → Sí, obligatoria.
- ¿Múltiples cajas? → Una por dispositivo en MVP (*pendiente*).
- ¿Disponible por moneda y método? → Sí.
- ¿Sugerencia de vuelto? → Cálculo sí; sugerencia por disponible físico opcional.

### 3.3 Sobre clientes y crédito — *Cerrada (ver `11` §3, RN-40 a RN-43)*
- ¿Crédito manual/automático/aprobación? → Automático si cabe en límite; si no, aprobación.
- ¿Vencimiento por días? → Sí, configurable.
- ¿Bloquear si excede límite? → Sí (RN-18).
- ¿Estados de cuenta? → Sí.
- ¿Cobranza con seguimiento? → Solo registro en MVP (*pendiente*).

### 3.4 Sobre inventario — *Cerrada (ver `11` §4, RN-44 a RN-47)*
- ¿Un almacén o varios? → Uno en MVP (*pendiente*).
- ¿Ubicación por anaquel? → No en MVP (*pendiente*).
- ¿Productos sin código de barras? → Sí, código opcional (RN-09).
- ¿Costo promedio/último/manual? → Promedio móvil; ajuste manual autorizado.
- ¿Kits/combos? → No en MVP (*pendiente*).

### 3.5 Sobre compras — *Cerrada (ver `11` §5, RN-48 a RN-50)*
- ¿Compras afectan costo de venta? → Sí (RN-23).
- ¿Órdenes de compra previas? → No en MVP (*pendiente*).
- ¿Recepción parcial? → No en MVP (*pendiente*).
- ¿Devoluciones a proveedor? → Sí, nota de crédito.

### 3.6 Sobre operación técnica — *Cerrada (ver `11` §6, RN-51 a RN-52)*
- ¿Escenario de cortes? → Cortes eléctricos y de red frecuentes (Hecho).
- ¿Usuarios concurrentes? → Hasta ~5 en MVP (*pendiente*).
- ¿Dispositivos reales? → PCs/tablets en mostrador (Hecho).
- ¿Acceso remoto? → No en MVP.
- ¿Sincronización transparente o cola visible? → Cola visible.

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
