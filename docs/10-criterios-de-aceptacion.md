# Criterios de Aceptación
## Proyecto Ferretería Bimonetaria

**Estado:** Definición (Fase 0)
**Relación:** Deriva del roadmap en `09-roadmap-y-fases.md`. Cada fase cierra con alcance aprobado, criterios de aceptación, riesgos conocidos y prioridad de la siguiente fase.

> **Nota:** Los criterios de las Fases 1 a 6 son preview de la Fase 0; su contenido detallado se construye en cada fase correspondiente.

## Fase 0. Descubrimiento y definición

### Criterios de aceptación
- Los 11 documentos de `/docs` existen y son coherentes entre sí.
- Toda regla de negocio lleva etiqueta de trazabilidad (Hecho / Supuesto / Pendiente / Recomendación).
- Las preguntas abiertas de `01` están documentadas y asignadas a la fase que las resolverá.
- Las decisiones cerradas de negocio están en `11` y vinculadas a reglas `02` (RN-31 a RN-52).
- El modelo conceptual `06` cubre las entidades de los módulos `03`.
- Existe grafo de conocimiento generado por Graphify sobre `/docs`.

### Riesgos conocidos
- Respuestas pendientes en `01` pueden invalidar reglas o flujos.
- Decisiones de stack precipitadas (ver `08`).

## Fase 1. Decisión de arquitectura y stack

### Criterios de aceptación (preview)
- Criterios de selección documentados.
- Al menos dos opciones comparadas con riesgos.
- Recomendación argumentada y aprobada.
- Estructura del proyecto y repositorios definida.

## Fase 2. Núcleo transaccional MVP

### Criterios de aceptación (preview)
- La ferretería puede vender y controlar stock de forma confiable.
- Productos, inventario, ventas básicas, pagos y configuración de tasa funcionan.
- Reporte básico de cierre operativo.

## Fase 3. Crédito, compras y cartera
- Clientes, límites, ventas a crédito y abonos operativos.
- Proveedores, compras y cuentas por pagar.
- Reportes de cartera y antigüedad de saldos.

## Fase 4. Continuidad operativa y sincronización
- Modo degradado funcional.
- Cola de pendientes y estrategia de sincronización.
- Manejo de conflictos y respaldo/recuperación.

## Fase 5. Reportes, auditoría y endurecimiento
- Auditoría de eventos y reportes avanzados.
- Indicadores de negocio y permisos finos.
- Validaciones administrativas y optimización.

## Fase 6. Piloto y salida a producción
- Datos de prueba, migración inicial y entrenamiento.
- Prueba en entorno real y ajustes post piloto.
- Checklist de salida cumplido.

## Regla general
Cada fase debe cerrar con: alcance aprobado, criterios de aceptación definidos, riesgos conocidos y prioridad de la siguiente fase.
