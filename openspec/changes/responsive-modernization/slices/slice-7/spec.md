# Slice 7 — Container Queries for Cards

## Purpose

Use CSS Container Queries to adapt card layouts based on their container width rather than the viewport. This enables cards to respond to sidebar collapse, resizable panels, or future layout changes.

## Requirements

### Requirement: Container Query Setup

The system SHALL add `container-type: inline-size` to card grid containers.

Affected containers:
- `.productos-grid-scroll` (catalog product grid)
- `.pos-productos-grid` (POS product grid)

#### Scenario: Container type applied to product grid

- GIVEN the catalog page renders
- WHEN the `.productos-grid-scroll` element is painted
- THEN it SHALL have `container-type: inline-size`

### Requirement: Card Layout Adaptation via Container

The system SHALL use `@container` rules to adapt `.card-producto` layout based on container width.

| Container Width | Card Behavior |
|----------------|---------------|
| < 200px | Compact: hide image, show name + price only |
| 200px–350px | Standard: image + info + actions |
| > 350px | Expanded: larger image aspect ratio |

#### Scenario: Cards adapt to container width

- GIVEN a product grid container that is 300px wide
- WHEN cards render inside
- THEN each card SHALL display image, info, and actions in standard layout

#### Scenario: Cards in narrow container

- GIVEN a product grid container that is 180px wide (sidebar collapsed + narrow viewport)
- WHEN cards render inside
- THEN cards SHALL use compact layout (name + price only, no image)

#### Scenario: Cards in wide container

- GIVEN a product grid container that is 400px wide
- WHEN cards render inside
- THEN cards SHALL use expanded layout with larger image

### Requirement: Graceful Fallback

The system SHALL provide a `@supports not (container-type: inline-size)` fallback that keeps current grid behavior.

#### Scenario: Browser without container query support

- GIVEN a browser that does NOT support container queries
- WHEN the product grid renders
- THEN cards SHALL use the standard `grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))` layout

## Acceptance Criteria

- [ ] `container-type: inline-size` on product grid containers
- [ ] `@container` rules for 3 card layouts
- [ ] Fallback for browsers without container query support
- [ ] Desktop layout matches current behavior at standard widths
