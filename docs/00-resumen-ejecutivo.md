# Resumen Ejecutivo del Proyecto
## Sistema Integral para Ferretería Bimonetaria en Venezuela

**Estado:** Definición (Fase 0)
**Objetivo del documento:** Definir el contexto del proyecto sin cerrar decisiones técnicas.

> **Trazabilidad:** Este documento describe necesidades de negocio (hechos y supuestos). Las decisiones técnicas se manejan en `08-opciones-de-stack-y-decisiones.md` y permanecen pendientes.

## 1. Propósito del sistema

Desarrollar una aplicación integral para una ferretería que permita controlar inventario, ventas, cuentas por cobrar, cuentas por pagar, configuración comercial y reportes operativos, con soporte para operación en entorno bimonetario y continuidad de trabajo ante fallas de electricidad o conectividad local.

## 2. Contexto del negocio

La ferretería opera en Venezuela, con una realidad comercial multimoneda donde:

- Los costos, precios y saldos suelen resguardarse en USD.
- Las ventas y cobros pueden ocurrir en USD, VES o pagos mixtos.
- La tasa de cambio influye diariamente en la operación.
- Puede haber interrupciones eléctricas o de red.
- La continuidad operativa en mostrador es crítica.

## 3. Alcance funcional preliminar

El sistema deberá cubrir, como mínimo:

- Gestión de productos e inventario
- Registro y búsqueda rápida de artículos
- Ventas en mostrador
- Cobros en múltiples métodos y monedas
- Clientes y cuentas por cobrar
- Proveedores y cuentas por pagar
- Configuración comercial
- Reportes operativos
- Mecanismos de continuidad operativa offline

## 4. Principios de diseño del producto

1. **Velocidad en mostrador:** la venta debe ser rápida y simple.
2. **Claridad bimonetaria:** el sistema debe expresar correctamente montos en USD y VES.
3. **Tolerancia a fallos:** cortes de red o energía no deben paralizar completamente la operación.
4. **Baja complejidad operativa:** el sistema debe ser mantenible por un negocio pequeño o mediano.
5. **Escalabilidad razonable:** debe permitir crecer en módulos, usuarios y reglas sin rehacer todo.
6. **Trazabilidad:** cambios de precios, pagos, abonos y movimientos deben quedar auditables.

## 5. Restricciones conocidas al inicio

- El negocio trabaja con aproximadamente 2.000 ítems. *(Hecho)*
- Existe necesidad de operación local o semilocal. *(Hecho)*
- El contexto monetario de Venezuela impacta precios, cobros y créditos. *(Hecho)*
- El sistema debe contemplar trabajo en varios dispositivos dentro del negocio. *(Hecho)*
- La solución debe priorizar robustez y operatividad sobre sofisticación innecesaria. *(Principio)*

## 6. Lo que todavía no se considera decidido

Este documento **no aprueba todavía**:

- Stack tecnológico final *(Decisión pendiente — ver `08`)*
- Base de datos definitiva *(Decisión pendiente — ver `08`)*
- Estrategia exacta de sincronización *(Decisión pendiente — ver `08`)*
- Forma de despliegue final *(Decisión pendiente — ver `08`)*
- Integraciones con impresoras, lectores o servicios externos *(Decisión pendiente)*
- Diseño final de roles y permisos *(En curso — ver `05`)*
- Flujo exacto de anulaciones, devoluciones y auditoría *(Decisión pendiente)*

## 7. Resultado esperado de esta fase

Al finalizar la fase de definición, el proyecto debe contar con:

- Reglas de negocio aprobadas
- Módulos delimitados
- Flujos operativos completos
- Datos conceptuales claros
- Criterios para evaluar y escoger stack
- Roadmap por etapas de implementación
