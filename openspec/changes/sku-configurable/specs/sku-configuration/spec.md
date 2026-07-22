# SKU Configuration Specification

## Purpose

Define how each company (empresa) configures SKU generation rules, including template selection, counter behavior, and admin-only SKU editing.

## Requirements

### Requirement: SKU Configuration Defaults

The system MUST create a default SKU configuration for every new empresa with `autogenerar_activo` set to false and `plantilla` set to `categoria_secuencial`.

#### Scenario: New company registration

- GIVEN a new empresa is created
- WHEN the empresa row is inserted
- THEN a corresponding `empresa_configuracion_sku` row exists with `autogenerar_activo = false`, `plantilla = 'categoria_secuencial'`, `modo_contador = 'por_categoria'`, `longitud_secuencial = 4`, and `prefijo_manual = null`

### Requirement: Admin Configuration Access

The system SHALL allow only users with admin role to view and modify SKU configuration for their empresa.

#### Scenario: Admin updates SKU configuration

- GIVEN a user with admin role is authenticated
- WHEN the user changes `plantilla` to `solo_secuencial` in "Configuración de SKU"
- THEN the configuration is updated and the change takes effect immediately for subsequent product creations

#### Scenario: Non-admin denied access

- GIVEN a user without admin role is authenticated
- WHEN the user attempts to access the SKU configuration endpoint
- THEN the system returns 403 and displays "No tiene permisos para acceder a esta configuración"

### Requirement: Template Selection

The system MUST support three SKU templates and enforce the corresponding output format.

#### Scenario: `categoria_secuencial` template

- GIVEN `plantilla = 'categoria_secuencial'` and `usa_categoria = true`
- WHEN a product is created in category with `codigo = 'FER'` and counter at 12
- THEN the generated SKU matches `{codigo}-{secuencia:04d}` (e.g., `FER-0012`)

#### Scenario: `solo_secuencial` template

- GIVEN `plantilla = 'solo_secuencial'`
- WHEN a product is created and the global counter is at 5
- THEN the generated SKU is a numeric sequence with `longitud_secuencial` digits (e.g., `0005`)

#### Scenario: `prefijo_fijo_secuencial` template

- GIVEN `plantilla = 'prefijo_fijo_secuencial'` and `prefijo_manual = 'HERR'`
- WHEN a product is created and the global counter is at 8
- THEN the generated SKU matches `{prefijo_manual}-{secuencia:04d}` (e.g., `HERR-0008`)

#### Scenario: Missing prefijo for prefijo_fijo template

- GIVEN `plantilla = 'prefijo_fijo_secuencial'` and `prefijo_manual` is null or empty
- WHEN a user attempts to create a product
- THEN the system rejects the operation and displays "Configure un prefijo manual antes de generar SKUs"

### Requirement: Sequential Counter Uniqueness

The system MUST guarantee SKU uniqueness within each empresa. Counters MUST be atomic to prevent race conditions.

#### Scenario: Concurrent product creation

- GIVEN two admin users create products simultaneously in the same empresa
- WHEN both triggers execute against the same counter
- THEN each product receives a distinct SKU with no duplicates or counter resets

### Requirement: SKU Read-Only for Normal Users

The system MUST prevent non-admin users from manually editing the `sku` field when auto-generation is active.

#### Scenario: Normal user sees disabled SKU field

- GIVEN `autogenerar_activo = true`
- WHEN a non-admin user opens the product creation form
- THEN the `sku` input is disabled with label "SKU (generado automáticamente)"

#### Scenario: Admin override on specific product

- GIVEN `autogenerar_activo = true`
- WHEN an admin unchecks "Auto-generar SKU" on a product form
- THEN the SKU field becomes editable and the manually entered value is persisted

### Requirement: SKU Regeneration

The system SHALL allow admins to regenerate the SKU of an existing product one-by-one with confirmation.

#### Scenario: Admin regenerates SKU

- GIVEN a product with SKU `FER-0012` exists
- WHEN the admin selects "Regenerar SKU" and confirms
- THEN a new SKU is generated, the old value is logged in the audit table, and the product image is renamed to match the new SKU

#### Scenario: Admin cancels regeneration

- GIVEN the admin selects "Regenerar SKU" for a product
- WHEN the admin clicks "Cancelar" on the confirmation dialog
- THEN no changes occur and the original SKU remains
