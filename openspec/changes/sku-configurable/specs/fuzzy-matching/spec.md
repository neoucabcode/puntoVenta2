# Fuzzy Matching Specification

## Purpose

Prevent duplicate products by detecting similar existing items using trigram similarity before a new product is created or an SKU is regenerated.

## Requirements

### Requirement: Fuzzy Search Availability

The system MUST expose a fuzzy search capability that accepts empresa context, a text input, and a similarity threshold.

#### Scenario: Search with default threshold

- GIVEN an authenticated user in empresa `abc-123`
- WHEN the user calls `buscar_productos_similares` with `texto = 'taladro inalámbrico'` and `umbral = 0.3`
- THEN the system returns all products for that empresa where the trigram similarity of `nombre` to the input exceeds 0.3, ordered by similarity descending

#### Scenario: Search returns no matches

- GIVEN an authenticated user in empresa `abc-123`
- WHEN the user calls `buscar_productos_similares` with `texto = 'xyz123abc'` and `umbral = 0.5`
- THEN the system returns an empty result set

### Requirement: Duplicate Prevention on Product Creation

The system SHOULD warn the user when a product being created has a high similarity to an existing product.

#### Scenario: High similarity detected during creation

- GIVEN a product named "Taladro DeWalt 20V" exists in the empresa
- WHEN a user attempts to create a product named "Taladro Dewalt 20v" with similarity > 0.85
- THEN the system displays a warning dialog: "Se encontró un producto similar: 'Taladro DeWalt 20V'. ¿Desea continuar creando este producto?"

#### Scenario: User confirms despite similarity warning

- GIVEN the duplicate warning dialog is displayed
- WHEN the user clicks "Continuar"
- THEN the product is created with the new name and no further阻断 occurs

#### Scenario: User cancels after similarity warning

- GIVEN the duplicate warning dialog is displayed
- WHEN the user clicks "Cancelar"
- THEN the creation form remains open with the entered values preserved and no product is created

### Requirement: Threshold Configuration

The similarity threshold for duplicate detection MUST be configurable per empresa, with a default of 0.85.

#### Scenario: Default threshold applied

- GIVEN no custom threshold is configured for the empresa
- WHEN a product is created or updated
- THEN the system uses 0.85 as the similarity threshold for duplicate detection

#### Scenario: Custom threshold applied

- GIVEN the empresa has a custom threshold of 0.75
- WHEN a product is created
- THEN the system uses 0.75 as the similarity threshold

### Requirement: Fuzzy Match RPC Performance

The `buscar_productos_similares` RPC MUST use a trigram index on `producto.nombre` scoped to `empresa_id` to ensure performant queries.

#### Scenario: Large product catalog search

- GIVEN an empresa has 10,000+ products
- WHEN `buscar_productos_similares` is called with `umbral = 0.3`
- THEN results MUST return within 500ms under normal load

#### Scenario: Partial text input

- GIVEN an empresa has products with varied names
- WHEN the input text is a partial word (e.g., "talad")
- THEN the system still performs trigram matching and returns results above the threshold

### Requirement: RPC Access Control

The `buscar_productos_similares` RPC MUST enforce multi-tenant isolation via the empresa_id parameter and MUST be accessible to authenticated users with any role.

#### Scenario: Cross-empresa isolation

- GIVEN two empresas `abc-123` and `xyz-789` both have a product "Taladro DeWalt"
- WHEN a user from empresa `abc-123` calls `buscar_productos_similares` with empresa_id `abc-123`
- THEN only products from empresa `abc-123` appear in the results
