# Opciones de Stack y Decisiones
## Proyecto Ferretería Bimonetaria

**Estado:** Stack definido (Fase 1)
**Propósito de este documento:** Listar las opciones técnicas y registrar las decisiones cerradas de Fase 1.

> **Cierre de Fase 1:** El usuario aprobó el stack el 2026-07-16. Las hipótesis del borrador se resuelven a continuación; lo no elegido pasa a *Descartado* o *Pendiente de Fase 1 avanzada*.

## 1. Decisiones de stack (cerradas)

| Ítem | Decisión | Estado | Justificación |
|---|---|---|---|
| Lenguaje de backend | **Node.js (TypeScript)** | Hecho | Un solo lenguaje con el front (React PWA); ecosistema maduro para offline (Service Workers/Workbox) y SQLite local (`better-sqlite3`); migración a Postgres trivial con ORM (Prisma/Drizzle). Baja complejidad operativa (Principio 4). |
| Framework de frontend | **React PWA (web pura)** | Hecho | Multidispositivo vía navegador, instalable, funciona offline. Sin instalación nativa. |
| Base de datos principal | **SQLite local** (migrable a PostgreSQL si escala) | Hecho | Cero servidor para un solo negocio; archivo local. Postgres queda como opción de escalabilidad, no requerida al inicio. |
| Base de datos cliente | **IndexedDB** (vía PWA/Service Worker) | Hecho | Replica offline en el navegador; sincronización con SQLite local. |
| Estrategia de sincronización | **Offline-first con réplica local** | Hecho | Continuidad ante caídas (RN-28 a RN-30); el cliente opera sin red y replica al servidor SQLite. |
| Impresión | **Impresora térmica** desde el inicio | Hecho | Tickets en impresora térmica (58/80mm) conectada al mostrador. |
| Generación de SKU | Automática con formato fijo | Supuesto / Pendiente | Requiere definir formato en Fase 1 avanzada. |
| Imágenes de producto | Compresión obligatoria a tamaño fijo | Supuesto / Pendiente | Detalle técnico de almacenamiento. |
| Tasa de cambio | Automatización de consulta BCV | Supuesto / Pendiente | Decide en Fase 1 avanzada (RN sobre tasa). |
| IGTF | Aplicable según configuración | Supuesto / Pendiente (RN-07) | Ya configurable por regla de negocio. |

### Opciones descartadas
- **Go (backend):** más performante pero añade contexto/despliegue separado; no justifica el costo operativo para PyME local.
- **Electron/escritorio nativo (Tauri/Qt):** se eligió PWA web pura para evitar instalación nativa y facilitar multi-dispositivo.
- **Solo frontend local (sin backend):** se requiere servidor SQLite para conciliar caja, inventario y multi-usuario.
- **PostgreSQL como BD inicial:** descartado para el arranque por complejidad; queda como opción de escalabilidad futura.

## 2. Criterios usados para decidir

- Velocidad en mostrador (Principio 1, `00`).
- Tolerancia a fallos y continuidad offline (RN-28 a RN-30).
- Baja complejidad operativa para negocio PyME (Principio 4, `00`).
- Capacidad multi-dispositivo local (Restricción, `00` §5).
- Escalabilidad razonable (Principio 5, `00`) — vía migración a Postgres.
- Facilidad de mantenimiento y despliegue local (un solo lenguaje TS).

## 3. Lo que queda pendiente de Fase 1 avanzada

- Formato exacto de SKU automático.
- Estrategia de compresión de imágenes.
- Automatización de tasa BCV (si aplica).
- Diseño técnico de roles/permisos (aplicación de `05`).
- Protocolo de impresión térmica (ESC/POS, librería a elegir).
- Esquema de sincronización y resolución de conflictos offline.
