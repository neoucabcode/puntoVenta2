# Requisitos No Funcionales
## Proyecto Ferretería Bimonetaria

**Estado:** Definición (Fase 0)
**Relación:** Deriva de los principios de diseño en `00-resumen-ejecutivo.md` §4 y de las reglas de continuidad RN-28 a RN-30.

> **Trazabilidad:** Todos los requisitos no funcionales son *Hecho / Supuesto* derivados del contexto del negocio. La forma de cumplirlos depende de decisiones técnicas pendientes (`08`).

## 1. Rendimiento y velocidad
- La operación de venta en mostrador debe ser rápida y simple *(Principio 1, `00`)*.
- La búsqueda de productos debe responder en tiempo corto incluso con ~2.000 ítems.

## 2. Disponibilidad y tolerancia a fallos
- El sistema debe tolerar cortes de red o energía sin paralizar la operación en mostrador *(Principio 3, `00`; RN-28)*.
- Debe preservar continuidad mínima en modo degradado *(RN-28)*.
- No debe descartar transacciones offline sin trazabilidad ni advertencia *(RN-30)*.

## 3. Integridad y trazabilidad
- Todo cambio de precio, pago, abono y movimiento debe quedar auditable *(Principio 6, `00`)*.
- Toda operación en modo degradado se marca como pendiente de conciliación *(RN-29)*.
- Conflictos de sincronización se elevan a revisión en lugar de sobrescribirse *(RN-29)*.

## 4. Claridad monetaria
- El sistema debe expresar montos en USD y VES en pantallas y reportes relevantes *(Principio 2, `00`; RN-04)*.
- Las conversiones usan una tasa activa configurada por día *(RN-03)*.

## 5. Operatividad y mantenibilidad
- El sistema debe ser mantenible por un negocio pequeño o mediano *(Principio 4, `00`)*.
- Debe priorizar robustez y operatividad sobre sofisticación innecesaria *(Restricción, `00` §5)*.

## 6. Escalabilidad razonable
- Debe permitir crecer en módulos, usuarios y reglas sin rehacer todo *(Principio 5, `00`)*.
- Debe contemplar trabajo en varios dispositivos dentro del negocio *(Restricción, `00` §5)*.

## 7. Seguridad
- Autenticación de usuarios y asignación de roles *(Módulo 9, `03`)*.
- Registro de acciones críticas y trazabilidad de cambios sensibles *(Módulo 9, `03`)*.

## 8. Puntos abiertos que afectan requisitos
- Número real de usuarios concurrentes *(ver `01` §3.6)*.
- Escenario real de cortes y fallos *(ver `01` §3.6)*.
- Necesidad de acceso remoto desde fuera del local *(ver `01` §3.6)*.
- Requisitos de impresión y lectores de código de barras *(Decisión pendiente)*.

## 9. Mapeo RNF → Principio / Regla

- **Rendimiento y velocidad** → Principio: Velocidad en mostrador (`00`) → RN-14 Integridad de la venta
- **Disponibilidad y tolerancia a fallos** → RN-28 Operación degradada, RN-29 Registro pendiente, RN-30 No pérdida silenciosa
- **Integridad y trazabilidad** → Principio: Trazabilidad (`00`) → RN-14, RN-16 Evidencia de cobro, RN-21 Historial
- **Claridad monetaria** → Principio: Claridad bimonetaria (`00`) → RN-04 Doble expresión, RN-19 Resguardo de saldo
- **Operatividad y mantenibilidad** → Principio: Baja compleidad operativa (`00`) → RN-46 Costo de producto
- **Escalabilidad razonable** → Principio: Escalabilidad razonable (`00`) → Restricción: Varios dispositivos (`00`)
- **Seguridad** → Módulo Seguridad y Auditoría (`03`) → RN-33 Anulación y no edición, Permisos sensibles elevados (`05`)
