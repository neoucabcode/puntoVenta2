# REQ-3: Cola offline de ventas

Toda venta realizada sin conexión a Supabase se persiste localmente en IndexedDB como un evento
inmutable antes de cualquier intento de red (offline-first). Cada evento lleva un `id_evento`
idempotente para que los reintentos de sincronización no generen ventas duplicadas.

#### Requirement: Persistencia offline de ventas con idempotencia

El sistema DEBE guardar cada venta offline como un evento en IndexedDB (store `ventas_pendientes`,
clave `id_evento`) con estado `pendiente`, y DEBE garantizar que el `id_evento` es único e
idempotente frente a reintentos de sync.

##### Scenario: Venta sin internet se guarda en la cola
- **Given** el dispositivo está offline (`navigator.onLine=false` o heartbeat caído)
- **When** el usuario completa una venta con caja abierta
- **Then** el sistema escribe un evento en `ventas_pendientes` con `id_evento` generado, `estado='pendiente'`, `dispositivo`, `empresa_id` y el payload de la venta
- **And** la venta queda confirmada localmente para el usuario (comprobante local) sin esperar a la red

##### Scenario: id_evento idempotente evita duplicados en reintento
- **Given** un evento de venta ya existe en `ventas_pendientes` con `id_evento='evt-123'`
- **When** el sistema intenta registrar nuevamente la misma venta (reintento de sync o doble envío)
- **Then** el upsert en Supabase por PK `id_evento` NO crea una segunda fila de venta
- **And** el evento local conserva un único registro asociado a `evt-123`

##### Scenario: La venta offline no valida ni bloquea stock
- **Given** el producto tiene stock insuficiente o cero
- **When** el usuario completa la venta offline
- **Then** el sistema registra la venta y el evento de salida de stock como auditoría (RN-11) SIN bloquear la operación (RN-54/55)
- **And** el evento de stock lleva causa `venta_offline` para trazabilidad

##### Scenario: Cola visible mínima (badge de pendientes)
- **Given** hay uno o más eventos en `ventas_pendientes` con `estado='pendiente'`
- **When** la UI renderiza el estado de sincronización
- **Then** el sistema muestra un badge con el conteo de pendientes (sin gestión manual de la cola en V1)
