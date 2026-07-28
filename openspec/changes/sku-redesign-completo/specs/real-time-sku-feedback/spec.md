# Real-Time SKU Feedback Specification

## Purpose

Provide real-time availability checking and similar product suggestions while a user types a SKU value, reducing duplicates and improving UX during product creation.

## Requirements

### Requirement: Debounced Availability Check

The system MUST check SKU availability in real-time as the user types, using a 300ms debounce. The check MUST call the `verificar_sku_disponible` RPC.

#### Scenario: SKU is available

- GIVEN a user types `CUSTOM-001` in the SKU field
- WHEN the 300ms debounce elapses
- THEN the system calls `verificar_sku_disponible` with the typed value
- AND displays a green checkmark indicator with no duplicate warning

#### Scenario: SKU is taken

- GIVEN a user types `FER-0012` in the SKU field
- WHEN the 300ms debounce elapses and the RPC returns `taken`
- THEN the system displays a red X indicator with text "Este SKU ya está en uso"

#### Scenario: Debounce resets on new input

- GIVEN a user types `FER-` and the debounce timer starts
- WHEN the user types `0012` before the 300ms elapses
- THEN the debounce timer resets and the RPC is called only after 300ms of inactivity

#### Scenario: Empty SKU field

- GIVEN the SKU field is empty or cleared
- WHEN no input is present
- THEN no availability check is triggered and no indicator is shown

### Requirement: Similar Products Dropdown

The system MUST display a dropdown of similar products while the user types a SKU, using the `buscar_productos_similares` RPC.

#### Scenario: Similar products found

- GIVEN a user types `FER` in the SKU field
- WHEN the debounced search returns matching products
- THEN a dropdown appears below the SKU field showing product name and current SKU for each match

#### Scenario: No similar products

- GIVEN a user types `XYZ-999` in the SKU field
- WHEN the debounced search returns no matches
- THEN no dropdown is displayed

#### Scenario: Dropdown selection populates field

- GIVEN the similar products dropdown is visible with 3 results
- WHEN the user clicks on a result
- THEN the SKU field is populated with the selected SKU value and the dropdown closes

#### Scenario: Dropdown closes on blur

- GIVEN the similar products dropdown is visible
- WHEN the user clicks outside the SKU field
- THEN the dropdown closes

### Requirement: Loading State

The system MUST display a subtle loading indicator while the availability check RPC is in flight.

#### Scenario: Loading indicator during check

- GIVEN a user types in the SKU field
- WHEN the debounce triggers an RPC call
- THEN a loading spinner or pulse indicator appears next to the field
- AND the indicator disappears when the RPC responds

### Requirement: Error Handling

The system MUST gracefully handle RPC failures without blocking the user from typing or submitting.

#### Scenario: RPC fails

- GIVEN a user types a SKU value
- WHEN the `verificar_sku_disponible` RPC call fails (network error, timeout)
- THEN the system logs the error, hides any loading indicator, and does NOT show an availability status
- AND the user can still submit the form normally
