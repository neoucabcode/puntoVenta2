# Delta for SKU Configuration

## MODIFIED Requirements

### Requirement: SKU Read-Only for Normal Users

The system MUST prevent non-admin users from manually editing the `sku` field. For existing products, the SKU field MUST be disabled by default for ALL users (including admins) until the admin explicitly enables editing via a confirmation dialog.

(Previously: SKU was read-only only when autogenerar_activo was true; admins could freely edit SKU without confirmation.)

#### Scenario: Normal user sees disabled SKU field

- GIVEN `autogenerar_activo = true`
- WHEN a non-admin user opens the product creation form
- THEN the `sku` input is disabled with label "SKU (generado automáticamente)"

#### Scenario: Existing product SKU disabled by default

- GIVEN an existing product with SKU `FER-0012` is loaded in the form
- WHEN any user (including admin) views the product form
- THEN the SKU field is disabled and shows the current value

#### Scenario: Admin enables SKU editing with confirmation

- GIVEN an admin views an existing product form with SKU disabled
- WHEN the admin clicks "Editar SKU" button
- THEN a `SkuConfirmDialog` appears with warning text: "Cambiar el SKU no afecta el inventario, pero las imágenes NO se renombran. ¿Continuar?"

#### Scenario: Admin cancels SKU edit

- GIVEN the `SkuConfirmDialog` is open
- WHEN the admin clicks "Cancelar"
- THEN the dialog closes and the SKU field remains disabled

#### Scenario: Admin confirms SKU edit

- GIVEN the `SkuConfirmDialog` is open
- WHEN the admin clicks "Confirmar" in the dialog
- THEN the dialog closes and the SKU field becomes editable

### Requirement: SKU Regeneration

The system SHALL allow admins to regenerate the SKU of an existing product one-by-one with confirmation. The SKU is IMMUTABLE after creation — regeneration is the ONLY mechanism to change it.

(Previously: SKU regeneration also renamed the image file to match the new SKU.)

#### Scenario: Admin regenerates SKU

- GIVEN a product with SKU `FER-0012` exists
- WHEN the admin selects "Regenerar SKU" and confirms via `SkuConfirmDialog`
- THEN a new SKU is generated and the old value is logged in the audit table

#### Scenario: Image path unaffected by SKU regeneration

- GIVEN a product with SKU `FER-0012` and an image stored at `empresa_id/producto_id.webp`
- WHEN the admin regenerates the SKU to `FER-0013`
- THEN the image file is NOT renamed and `imagen_url` continues to point to `empresa_id/producto_id.webp`

#### Scenario: Admin cancels regeneration

- GIVEN the admin selects "Regenerar SKU" for a product
- WHEN the admin clicks "Cancelar" on the confirmation dialog
- THEN no changes occur and the original SKU remains

### Requirement: Admin Confirmation Dialog for SKU Changes

The system MUST use a custom React confirmation dialog component (`SkuConfirmDialog`) for all SKU modification operations. The system MUST NOT use native `confirm()` for SKU-related flows.

(Previously: No confirmation dialog existed; SKU was freely editable or used native confirm().)

#### Scenario: Confirmation dialog renders with warning

- GIVEN an admin triggers a SKU change operation
- WHEN the `SkuConfirmDialog` opens
- THEN it displays a title "Confirmar cambio de SKU", warning text about image implications, and "Confirmar" / "Cancelar" buttons

#### Scenario: No native confirm in SKU flows

- GIVEN a user performs any SKU-related operation (edit, regenerate)
- WHEN the operation triggers a confirmation step
- THEN the system uses `SkuConfirmDialog` and NOT `window.confirm()`

## REMOVED Requirements

### Requirement: Image Rename on SKU Regeneration

(Reason: Image storage is now UUID-based (`{empresa_id}/{producto_id}.webp`), decoupled from SKU. SKU changes no longer affect image paths.)
(Migration: None — behavior removed by design.)

## ADDED Requirements

### Requirement: SKU Immutability

The system SHALL treat SKU as immutable after product creation. Changing a product's category MUST NOT change its SKU. The only way to change a SKU is through explicit admin regeneration with confirmation.

#### Scenario: Category change preserves SKU

- GIVEN a product with SKU `FER-0012` in category "Ferretes"
- WHEN an admin moves the product to category "Tornillos"
- THEN the SKU remains `FER-0012`

#### Scenario: SKU gaps are not reused

- GIVEN sequential SKU counters produce `FER-0001`, `FER-0002`, `FER-0003`
- WHEN products with `FER-0001` and `FER-0003` are deleted
- THEN the next generated SKU is `FER-0004`, not `FER-0001`

### Requirement: SKU Availability Check

The system MUST provide real-time SKU availability feedback when a user types a SKU value. The check MUST use debounced input (300ms) and call the `verificar_sku_disponible` RPC.

#### Scenario: SKU is available

- GIVEN a user types `CUSTOM-001` in the SKU field
- WHEN the 300ms debounce elapses and the RPC returns available
- THEN the form displays an availability indicator (checkmark icon) and no duplicate warning

#### Scenario: SKU is taken

- GIVEN a user types `FER-0012` in the SKU field
- WHEN the 300ms debounce elapses and the RPC returns taken
- THEN the form displays a warning indicator (X icon) with text "Este SKU ya está en uso"

#### Scenario: Similar products dropdown

- GIVEN a user types `FER` in the SKU field
- WHEN the debounced search returns similar products
- THEN a dropdown shows matching products with their name and current SKU
