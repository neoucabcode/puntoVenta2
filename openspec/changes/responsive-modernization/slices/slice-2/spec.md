# Slice 2 — Touch Target Compliance

## Purpose

Ensure all interactive elements meet WCAG 2.5.8 (≥44×44px) on mobile viewports. Desktop density is preserved by applying padding increases only below 769px.

## Requirements

### Requirement: Minimum Touch Target Size on Mobile

The system SHALL ensure all interactive elements (buttons, links, inputs, toggles) have a minimum touch target of 44×44px on viewports < 769px.

The system SHALL use `@media (max-width: 768px)` to apply increased padding/min-height. On viewports ≥ 769px, existing desktop sizes SHALL be preserved.

#### Scenario: Cart quantity buttons meet target on mobile

- GIVEN a user on a 375px-wide phone
- WHEN viewing the cart ticket
- THEN `.carrito-ticket-cant button` SHALL have at least 44px width and 44px height

#### Scenario: DataTable action buttons meet target on mobile

- GIVEN a user on a mobile device
- WHEN viewing the catalog in list view
- THEN `.dt-actions button` SHALL have at least 44px width and 44px height

#### Scenario: Theme toggle meets target on mobile

- GIVEN a user on a mobile device
- WHEN viewing the topbar
- THEN `.topbar-theme` SHALL have at least 44px width and 44px height

#### Scenario: Instrument remove button meets target on mobile

- GIVEN a user on a mobile device
- WHEN viewing payment instruments in the cart
- THEN `.pago-instrumento-remove` SHALL have at least 44px width and 44px height

#### Scenario: Desktop density preserved

- GIVEN a user on a 1280px desktop viewport
- WHEN viewing any page
- THEN all interactive elements SHALL retain their current (smaller) padding and dimensions
- AND no visual change SHALL be visible

### Requirement: Priority Elements Inventory

The following elements SHALL be audited and adjusted if below 44px:

| Element | Current Size | Selector |
|---------|-------------|----------|
| Cart qty +/- buttons | 20×20px | `.carrito-ticket-cant button` |
| Cart remove button | 22×22px | `.carrito-ticket-remove` |
| DataTable action buttons | 32×32px | `.dt-actions button` |
| Theme toggle | 34×34px | `.topbar-theme` |
| Instrument remove | 18×18px | `.pago-instrumento-remove` |
| POS add-to-cart overlay | 24×24px | `.pos-card-add` |
| Caja button | auto | `.caja-btn` |

#### Scenario: All priority elements pass 44px check

- GIVEN automated accessibility testing at 375px viewport
- WHEN checking each priority element
- THEN each SHALL have width ≥ 44px AND height ≥ 44px

## Acceptance Criteria

- [ ] All priority elements ≥ 44×44px below 769px viewport
- [ ] Desktop (≥769px) shows no visual change
- [ ] `@media (max-width: 768px)` block contains all touch target overrides
- [ ] Lighthouse accessibility score ≥ 90 for touch targets
