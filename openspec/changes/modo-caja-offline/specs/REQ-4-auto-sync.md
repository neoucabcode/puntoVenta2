# REQ-4: Auto-sync silencioso

Al recuperar la conexión, el sistema sube automáticamente la cola offline y reconcilia las ventas,
sin acción del usuario. El stock resultante se registra como auditoría y nunca bloquea. La UI
informa estado online/offline y el conteo de pendientes.

#### Requirement: Sincronización automática al reconectar

El sistema DEBE detectar la transición offline→online y DEBE disparar un proceso de auto-sync que
sube los eventos pendientes (upsert idempotente por `id_evento`, respetando RLS por `empresa_id`) y
marca cada evento como `sync_ok`. El stock asociado se registra como auditoría y no bloquea.

##### Scenario: Vende offline, reconecta y sincroniza ok
- **Given** el dispositivo vendió offline y hay eventos en `ventas_pendientes` con `estado='pendiente'`
- **When** el dispositivo recupera conexión (online detectado + heartbeat OK)
- **Then** el auto-sync sube los eventos a Supabase vía upsert idempotente
- **And** los eventos pasan a `estado='sync_ok'` y el badge de pendientes desaparece o baja a cero

##### Scenario: Reintento de sync no duplica ventas
- **Given** un evento `evt-123` ya fue sincronizado (`sync_ok`) pero el acuse local se perdió
- **When** el auto-sync reintenta el envío de `evt-123`
- **Then** el upsert por PK `id_evento` actualiza la fila existente, no inserta una venta duplicada
- **And** el evento local queda `sync_ok` tras el reintento

##### Scenario: Stock offline se registra como auditoría sin bloquear
- **Given** la venta offline implicó salida de stock
- **When** el auto-sync procesa el evento
- **Then** el sistema registra un `movimiento_stock` con causa `venta_offline` (RN-11) y empresa_id
- **And** la venta NO se bloquea ni se revierte por falta de stock (RN-54/55), incluso si el stock quedó negativo y está configurado como permitido

##### Scenario: Fallo de red durante sync con reintento
- **Given** durante el auto-sync la red cae otra vez o Supabase rechaza temporalmente
- **When** el upsert falla para un evento
- **Then** el evento conserva `estado='pendiente'` y el sistema reintenta con backoff
- **And** no se marca `sync_ok` ningún evento no confirmado

##### Scenario: Indicador de estado offline/online y pendientes
- **Given** el estado de conexión del dispositivo (cualquiera)
- **When** la UI muestra el estado de operación
- **Then** el sistema indica claramente offline/online y el conteo de pendientes por sincronizar (badge mínimo)
