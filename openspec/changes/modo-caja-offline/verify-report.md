# Verification Report — modo-caja-offline (V1)

> Sub-agent: `sdd-verify`. Fecha: 2026-07-20. Cambio: `modo-caja-offline`.
> Modo de verificación: **estándar** (Strict TDD inactivo). Persistencia: Engram + archivo.

## Resultado final

**Verdict: PASS WITH WARNINGS**

No hay hallazgos CRITICAL. Los 4 requerimientos (REQ-1..REQ-4) están implementados y
la capa local (IndexedDB + lógica de sync) tiene 12/12 tests verdes. El build compila
limpio. Las advertencias son de dos tipos: (a) escenarios que necesitan Supabase real
para validarse en runtime (fuera del alcance automatizado, cubiertos por script manual),
y (b) dos desviaciones de diseño reales (backoff y caché offline de catálogo) que no
rompen la funcionalidad central pero deben resolverse/aceptarse antes de producción.

## Evidencia de ejecución (fresca, en este turno)

| Comando | Exit | Hash (SHA256 del log) | Resultado |
|---|---|---|---|
| `cd web && npm test` (`vitest run`) | 0 | `3A779229C7438394A19F46A3D73C6C6A2003B4356146F75427870E7528931016` | 12/12 pass (3 files) |
| `cd web && npm run build` (`tsc -b && vite build`) | 0 | `CC2976C990539680EDD922AFD20D1C66D5F93491AC43D798D268F24A36F6D5BF` | 111 módulos, PWA build OK |

- Cobertura: no configurada en el proyecto (no se mide `coverage`). Los tests son unitarios
  con `fake-indexeddb` (cola/autoSync) y stubs de `navigator`/Supabase (caja).
- Head de implementación verificado: commit `bff2380` (rama `modo-caja-offline/3-ui`).

## Matriz de cumplimiento de specs

### REQ-1 — Sesión de caja por dispositivo
| Escenario | Estado | Evidencia |
|---|---|---|
| Abrir caja en dispositivo autorizado | IMPLEMENTADO · sin test runtime | `lib/caja.ts:52 abrirCaja` inserta `sesion_caja` (estado, dispositivo, empresa_id, saldo_inicial). `abre_at` por default de BD. |
| Vender requiere caja abierta | IMPLEMENTADO | `store/useCajaStore.ts` + `pages/PosPage.tsx:12,72` deshabilita "Registrar venta" si `soloLectura`. Venta asocia `sesionCajaId`. |
| Cerrar caja | IMPLEMENTADO · sin test runtime | `lib/caja.ts:73 cerrarCaja` → update `estado='cerrada'`, `cierre_at`. |
| Caja deshabilitada por admin (RN-53) | IMPLEMENTADO · TEST | `caja.ts:45 cajaHabilitada` + `useCajaStore.refrescar` set `cajaAbierta=true` sin sesión. `caja.test.ts` cubre `abrirCaja=null` (RN-53). |

### REQ-2 — Catálogo solo-lectura condicional
| Escenario | Estado | Evidencia |
|---|---|---|
| Sin caja abierta → solo consulta | IMPLEMENTADO | `CatalogoPage.tsx:43 soloLectura = cajaHabilitada && !cajaAbierta`; oculta Crear/Editar/Borrar/Vender (`puedeEditar`). |
| Con caja abierta → controles completos | IMPLEMENTADO | `puedeEditar = !soloLectura`. |
| **Lectura offline desde caché local** | **GAP (WARNING W1)** | `CatalogoPage` llama `listarProductos` (Supabase) directo. **No hay caché IndexedDB del catálogo**; offline el catálogo no carga desde local. El gating sí aplica. |
| Caja deshabilitada permite venta sin sesión | IMPLEMENTADO | `useCajaStore.refrescar` → `cajaAbierta=true`; `PosPage` habilita venta. |

### REQ-3 — Cola offline
| Escenario | Estado | Evidencia |
|---|---|---|
| Venta sin internet se guarda en cola | IMPLEMENTADO · TEST | `lib/ventaOffline.ts:73 guardarEvento` offline-first (sin red). `colaOffline.test.ts` persistencia+idempotencia. |
| id_evento idempotente (no duplica) | IMPLEMENTADO · TEST local + SERVER-manual | `colaOffline.put` por keyPath (`colaOffline.ts:60`). RPC `ON CONFLICT DO UPDATE` (`patch_08:101`) — **lógica verificada, NO ejecutada en vivo**. |
| No valida ni bloquea stock | IMPLEMENTADO | `ventaOffline` no consulta stock; RPC inserta `movimiento_inventario` tipo `venta` sin validación. |
| Badge de pendientes | IMPLEMENTADO | `Layout.tsx:111` badge `pendientes`. |

### REQ-4 — Auto-sync silencioso
| Escenario | Estado | Evidencia |
|---|---|---|
| Offline→online sincroniza ok | IMPLEMENTADO · TEST (mock) | `autoSync.ts:103 onOnline→sincronizarPendientes`; `autoSync.test.ts` doble disparo = 1 subida, `sync_ok`. |
| Reintento no duplica | IMPLEMENTADO · TEST (mock) | `autoSync.test.ts` reintenta entre ciclos sin duplicar; RPC idempotente. |
| Stock = auditoría sin bloquear | IMPLEMENTADO (server) | RPC `patch_08:156` inserta `movimiento_inventario` causa `venta_offline`. |
| **Fallo de red con reintento (backoff)** | **PARCIAL (WARNING W2)** | Reintenta en el **próximo evento `online`**; **no hay backoff exponencial ni bucle de reintento**. Heartbeat detecta caída de Supabase pero **no dispara sync** al recuperar. |
| Indicador offline/online + pendientes | IMPLEMENTADO | `Layout.tsx:108` + bootstrap `main.tsx:30` `onCambioEstado`. |

## Tabla de corrección (trazabilidad RN)

| RN | Cumplimiento | Nota |
|---|---|---|
| RN-11 (movimiento con causa) | ✅ | RPC inserta `movimiento_inventario` `tipo='venta'`, `observacion='venta_offline'`; frontend envía `auditoria_stock` con misma causa. |
| RN-53 (caja opcional) | ✅ | `cajaHabilitada()` / store `refrescar` operan "sin caja" si admin lo deshabilita. |
| RN-54 (venta sin stock) | ✅ | Nunca se valida stock en el flujo offline. |
| RN-55 (stock negativo) | ✅ | Sin bloqueo; permitido según parámetro de negocio. |
| RN-56 (parámetros habilitables) | ✅ parcial | `caja_obligatoria` cableado; parámetros de stock no aplican a V1. |

## Coherencia con el design

| Decisión de design | Estado |
|---|---|
| RLS `es_de_empresa` idéntico a `schema_fase2.sql` | ✅ (`patch_08:60-66`) |
| `id_evento` PK + RPC `ON CONFLICT DO UPDATE` materializa solo en INSERT (`xmax=0`) | ✅ lógica correcta (verificada por lectura; no en vivo) |
| `colaOffline` offline-first | ✅ |
| `autoSync` usa backoff y no duplica | ⚠️ **DESVIACIÓN (W2)**: no hay backoff; idempotencia sí garantizada. |
| Badge alimentado por store | ✅ |
| Vitest pendiente de aprobación | ✅ resuelto: apply instaló Vitest + happy-dom + fake-indexeddb (`bff2380`). |

## Hallazgos

### CRITICAL
_Ninguno._ Ningún REQ queda roto por el código existente ni por fallo de build/test.

### WARNING
- **W1 — Catálogo offline sin caché local (REQ-2 escenario 3).** `CatalogoPage` depende de
  `listarProductos` (Supabase). Sin internet el catálogo no se sirve desde IndexedDB; el
  usuario ve error, no "modo consulta offline". El gating de solo-lectura sí funciona.
  _Acción_: implementar caché de catálogo en IndexedDB, o aceptar como limitación de V1
  documentada. No bloquea el cierre del cambio pero sí incumple un escenario de spec.
- **W2 — Backoff / reintento automático incompleto (REQ-4 escenario "Fallo de red").** El
  reintento depende de un nuevo evento `online` del navegador; no hay bucle con backoff y el
  heartbeat no dispara `sincronizar()` al recuperar Supabase. Si la red cae a mitad de sync,
  los eventos restantes quedan `pendiente` hasta el próximo cambio de conectividad o reload.
  La idempotencia se mantiene (no duplica). _Acción_: añadir reintento con backoff y disparar
  sync en recovery de heartbeat.
- **W3 — REQ-1 abrir/cerrar reales sin test runtime.** Solo está cubierto el path "sin caja"
  (RN-53). Los flujos felices de apertura/cierre y la consulta `hayCajaAbierta` requieren
  Supabase + RLS; validación manual pendiente (SQL + UI).
- **W4 — `usuario_id` puede quedar `''`.** `ventaOffline.ts:42` usa `usuarioId ?? ''`. Si
  `obtenerMiUsuarioId()` es `null`, el payload envía `usuario_id:''` y el RPC hace
  `(''::uuid)` → excepción → la venta no sincroniza (queda `pendiente`). En sesión auth real
  suele ser uuid, pero es un riesgo de producción. _Acción_: usar `?? null` y omitir/saltar
  si falta, o validar antes de encolar.

### SUGGESTION
- **S1** Disparar `sincronizarPendientes()` en recovery de heartbeat (no solo en evento `online`).
- **S2** Evitar mostrar `cajaAbierta` stale (persistido) antes de `refrescar()`; o invalidar en logout.
- **S3** Tests de componente para el gating de `CatalogoPage`/`PosPage` (happy-dom + store mock).
- **S4** Commitear los artefactos openspec (`specs/`, `design.md`, `proposal.md` están **untracked**)
  antes de `sdd-archive` para que el change quede completo en git.

## Verificación manual OBLIGATORIA (fuera de alcance del agente — sin credenciales)

El agente **no tiene** `.env.local` ni credenciales de Supabase, por lo que la **idempotencia
REAL en servidor no pudo ejecutarse**. Debe validarla el usuario siguiendo
`openspec/changes/modo-caja-offline/SQL_ACCION_USUARIO.md`:

1. Aplicar `patch_08_sesion_caja.sql` en el SQL Editor de Supabase (ya reportado como hecho).
2. Ejecutar el bloque de verificación de idempotencia del doc:
   - `aplicar_venta_offline('evt-verificacion-001', <empresa_id>, 'disp-verificacion', null, <payload>, '[]')` → espera `insertado=true`.
   - Mismo call de nuevo → espera `insertado=false` y **1 sola fila** en `venta_offline_event`.
3. Si devuelve `insertado=true` la 1ª vez y `false` la 2ª con 1 fila → idempotencia confirmada.
   Cualquier otro resultado es un bug de SQL y debe reportarse antes de `sdd-archive`.

## Próximo paso recomendado

**`sdd-archive`** — el cambio es verificable automáticamente como PASS WITH WARNINGS.
Prerrequisitos antes de archivar en producción:
1. Ejecutar la verificación manual de idempotencia (arriba).
2. Resolver o aceptar explícitamente W1, W2 y W4.
3. Commitear artefactos openspec (S4).
