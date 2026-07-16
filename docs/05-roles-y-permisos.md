# Roles y Permisos
## Proyecto Ferretería Bimonetaria

**Estado:** Definición (Fase 0) — diseño preliminar
**Relación:** Deriva del Módulo 9 (Seguridad y auditoría) en `03-modulos-del-sistema.md` y de las reglas RN-14, RN-16, RN-18, RN-21, RN-29.

> **Trazabilidad:** El diseño final de roles y permisos es una *Decisión pendiente*. Aquí se proponen roles funcionales mínimos y principios de autorización; no constituye definición técnica de implementación.

## 1. Principios de autorización

- Toda acción crítica requiere usuario autenticado y queda registrada (RN-21).
- La asignación de permisos se hace por rol, no por usuario individual.
- Un mismo usuario puede tener un rol por turno o dispositivo, según política futura.
- Las acciones de ajuste, anulación y corrección manual requieren privilegio elevado.

## 1.1 Autoridad de configuración

El administrador tiene la autoridad final para adaptar el programa a su negocio: puede activar o desactivar cualquier control que sea potencialmente variable (caja, stock, descuentos, crédito, validaciones), según RN-53 a RN-56. El sistema nunca impone un control rígido que trabaje en contra de la operación.

## 2. Roles funcionales propuestos

### R1. Cajero / Vendedor
- Buscar y vender productos (Módulo 2).
- Registrar cobros y pagos mixtos (RN-05, RN-06).
- Identificar clientes y registrar ventas a crédito autorizadas (RN-18).
- Registrar abonos (RN-20).
- Ejecutar cierre diario de su turno (RN-25).

### R2. Encargado de Inventario
- Alta y edición de productos (Módulo 1, RN-08 a RN-12).
- Registro de compras y entradas (Módulo 4, RN-22 a RN-24).
- Ajustes y conteo físico con autorización.
- Consulta de stock y valorización.

### R3. Administrador / Gerente
- Configuración comercial: tasa, políticas de precio, impuestos y recargos (Módulo 6, RN-03, RN-07).
- Aprobación de créditos y límites (RN-18).
- Consulta de reportes y cartera (Módulo 7, RN-26, RN-27).
- Revisión de conflictos de sincronización (Módulo 8, RN-29).
- Gestión de usuarios y roles.
- **Habilitar / deshabilitar controles del sistema** (RN-53 a RN-56): decide si se usa control de caja, si se permite venta sin stock, stock negativo, y cualquier parámetro de validación. El programa se adapta al negocio por su decisión, no por lógica rígida.

### R4. Auditor (opcional)
- Solo lectura de históricos y trazas.
- Acceso a reportes y eventos críticos sin capacidad de modificación.

## 3. Permisos sensibles (requieren privilegio elevado)

- Anulación o modificación de venta cerrada *(RN-14)*.
- Ajuste manual de inventario y corrección autorizada *(RN-11)*.
- Cambio de tasa activa *(RN-03)*.
- Autorización de crédito que excede límite *(RN-18)*.
- Resolución de conflictos de sincronización *(RN-29)*.

## 4. Puntos abiertos

- ¿Los roles varían por dispositivo o por sesión? *(ver `01` §3.6)*
- ¿Se requiere separación estricta cajero vs inventario, o un rol mixto para negocios pequeños?
- ¿El auditor es un rol real o solo un modo de vista? *(Decisión pendiente)*
