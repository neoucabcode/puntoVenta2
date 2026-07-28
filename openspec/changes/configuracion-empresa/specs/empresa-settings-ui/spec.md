# Empresa Settings UI Specification

## Purpose

Admin-only settings page (`/configuracion`) exposing existing backend configuration that currently lacks UI. Covers SKU config, company-wide settings (exchange rate, tax, stock rules), and module toggles.

## Requirements

### Requirement: Admin Access Control

The system SHALL restrict `/configuracion` access to users with admin role.

#### Scenario: Admin accesses settings page

- GIVEN the user is authenticated with admin role
- WHEN the user navigates to `/configuracion`
- THEN the settings page renders with all 3 tabs visible

#### Scenario: Non-admin redirected

- GIVEN the user is authenticated but NOT admin
- WHEN the user navigates to `/configuracion`
- THEN the user is redirected away and the settings page is NOT rendered

### Requirement: SKU Configuration

The system SHALL allow admins to view and update SKU generation settings.

#### Scenario: Load SKU config

- GIVEN the admin is on the settings page
- WHEN the SKU tab is active
- THEN the form shows current values for `autogenerar_activo`, `plantilla`, `modo_contador`, `longitud_secuencial`, `prefijo_manual`, and `umbral_similitud`

#### Scenario: Save SKU config

- GIVEN the admin modified at least one SKU field
- WHEN the admin submits the SKU form
- THEN `actualizarConfigSku()` is called with the updated values
- AND a success indication is shown

#### Scenario: SKU config save fails

- GIVEN `actualizarConfigSku()` returns an error
- WHEN the admin submits the SKU form
- THEN an error message is displayed and local state reverts to pre-save values

### Requirement: Empresa Settings

The system SHALL allow admins to view and update company-wide settings.

#### Scenario: Load empresa settings

- GIVEN the admin is on the settings page
- WHEN the Empresa tab is active
- THEN the form shows current values for `tasa_activa`, `igtf_habilitado`, `venta_sin_stock`, and `stock_negativo`

#### Scenario: Save empresa settings

- GIVEN the admin modified at least one empresa field
- WHEN the admin submits the empresa form
- THEN `actualizarMiEmpresa()` is called with the updated values
- AND a success indication is shown

#### Scenario: empresa settings save fails

- GIVEN `actualizarMiEmpresa()` returns an error
- WHEN the admin submits the empresa form
- THEN an error message is displayed and local state reverts to pre-save values

### Requirement: Module Toggles

The system SHALL allow admins to enable or disable individual system modules.

#### Scenario: Load module states

- GIVEN the admin is on the settings page
- WHEN the Modules tab is active
- THEN each module (catalogo, venta, inventario, caja, reportes) shows its current enabled/disabled state

#### Scenario: Toggle a module

- GIVEN a module is currently enabled
- WHEN the admin toggles it off
- THEN `toggleModulo()` is called for that module
- AND the module state updates in the UI

#### Scenario: Disable module with active data warning

- GIVEN a module has potentially active data (e.g., open caja session)
- WHEN the admin toggles it off
- THEN a confirmation modal appears (NOT native `confirm()`)
- AND the toggle only applies if the admin confirms

### Requirement: Empresa Update Function

The system SHALL provide `actualizarMiEmpresa()` for partial updates to empresa settings.

#### Scenario: Partial update

- GIVEN the admin updates only `tasa_activa`
- WHEN `actualizarMiEmpresa()` is called with `{ tasa_activa: 36.5 }`
- THEN only `tasa_activa` is updated in the database
- AND other empresa fields remain unchanged

#### Scenario: Mock fallback when offline

- GIVEN the Supabase connection fails
- WHEN `actualizarMiEmpresa()` is called
- THEN the update is applied locally with mock fallback
- AND the function returns success

### Requirement: Navigation Entry

The system SHALL provide admin-only navigation to the settings page.

#### Scenario: Admin sees config option

- GIVEN the user is authenticated as admin
- WHEN the avatar dropdown in TopbarUnificada is open
- THEN a "Configuración" menu item is visible

#### Scenario: Non-admin hidden from config nav

- GIVEN the user is authenticated but NOT admin
- WHEN the avatar dropdown in TopbarUnificada is open
- THEN the "Configuración" menu item is NOT visible
