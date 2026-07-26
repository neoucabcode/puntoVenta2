# Product Sorting Specification

## Purpose

Add server-side sort parameter to `buscar_productos` RPC and provide a reusable UI control for sort selection across product listing pages.

## Requirements

### Requirement: RPC Sort Parameter

The `buscar_productos` RPC MUST accept an optional `p_order_by` text parameter.

The default value SHALL be `'nombre ASC'` (backward compatible — no caller change required).

#### Scenario: Default sort (no parameter)

- GIVEN a caller invokes `buscar_productos` without `p_order_by`
- WHEN results are returned
- THEN products are ordered alphabetically by name ascending

#### Scenario: Explicit sort parameter

- GIVEN a caller invokes `buscar_productos` with `p_order_by = 'precio DESC'`
- WHEN results are returned
- THEN products are ordered by price descending

#### Scenario: Invalid sort value

- GIVEN a caller passes an unrecognized `p_order_by` value
- WHEN the RPC executes
- THEN it falls back to default sort (`nombre ASC`)
- AND no error is thrown

### Requirement: Supported Sort Options

The system MUST support these sort values: `nombre ASC`, `nombre DESC`, `precio ASC`, `precio DESC`.

#### Scenario: Sort by name ascending

- GIVEN `p_order_by = 'nombre ASC'`
- WHEN results are returned
- THEN products are A→Z by name

#### Scenario: Sort by price descending

- GIVEN `p_order_by = 'precio DESC'`
- WHEN results are returned
- THEN products are highest price first

### Requirement: Sort UI Control

The system MUST provide a reusable sort dropdown component.

The component SHALL display the current sort selection and allow changing it.

#### Scenario: Default state

- GIVEN the sort dropdown renders
- WHEN no sort is selected by the user
- THEN "Nombre A-Z" is displayed as the active option

#### Scenario: User changes sort

- GIVEN the sort dropdown shows "Nombre A-Z"
- WHEN the user selects "Precio (mayor a menor)"
- THEN the dropdown updates to show the new selection
- AND a change event is emitted with the corresponding `p_order_by` value

### Requirement: Sort Integrates with Pagination

Sorting MUST reset pagination to offset=0 when changed.

#### Scenario: Sort changes mid-scroll

- GIVEN the user has scrolled to page 3 (offset=100)
- WHEN the user changes the sort order
- THEN offset resets to 0
- AND results are re-fetched with the new sort and offset=0

### Requirement: Sort Integrates with Filters

Sort MUST work independently of category filter and search text.

#### Scenario: Sort + category filter

- GIVEN category "Tornillos" is selected and sort is "Nombre A-Z"
- WHEN results load
- THEN only "Tornillos" products appear, sorted A→Z

#### Scenario: Sort + search text

- GIVEN search text is "taladro" and sort is "Precio ASC"
- WHEN results load
- THEN only products matching "taladro" appear, sorted by price ascending
