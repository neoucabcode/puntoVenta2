# Slice 5 — Form Grid Responsive

## Purpose

Make `.form-grid` and the auth card responsive so forms don't overflow on narrow screens.

## Requirements

### Requirement: Form Grid Single Column on Narrow Screens

The system SHALL change `.form-grid` from a fixed 2-column grid to a responsive grid that collapses to 1 column on viewports < 480px.

Current: `grid-template-columns: 1fr 1fr` (always 2 columns).

New: `grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr))`.

#### Scenario: Form grid on 375px phone

- GIVEN a user on a 375px phone
- WHEN viewing a form with `.form-grid` (e.g., ProductoForm modal)
- THEN all form fields SHALL stack in a single column
- AND each field SHALL have full width

#### Scenario: Form grid on 768px tablet

- GIVEN a user on a 768px tablet
- WHEN viewing a form with `.form-grid`
- THEN fields SHALL display in 2 columns where space permits

#### Scenario: Form grid on 1280px desktop

- GIVEN a user on a 1280px desktop
- WHEN viewing a form with `.form-grid`
- THEN fields SHALL display in 2 columns (no change from current)

### Requirement: Auth Card Fluid Width

The system SHALL change `.card` width from `width: 340px` to `width: min(340px, 100%)` (with horizontal padding).

Current at line 203: `.card { ... width: 340px; ... }`

#### Scenario: Auth card on 320px phone

- GIVEN a user on a 320px phone
- WHEN viewing the login page
- THEN the auth card SHALL fit within the viewport with padding
- AND no horizontal overflow SHALL occur

#### Scenario: Auth card on desktop

- GIVEN a user on a 1280px desktop
- WHEN viewing the login page
- THEN the auth card SHALL be 340px wide (no change)

### Requirement: Auth Center Container

The system SHALL update `.center` to add horizontal padding on narrow screens.

Current: `.center { min-height: 100vh; display: grid; place-items: center; }`

Add: `padding: 1rem; width: 100%;` and use `min-height: 100dvh` (from Slice 1).

#### Scenario: Auth page has horizontal padding on mobile

- GIVEN a user on a 320px phone
- WHEN viewing the login page
- THEN the card SHALL have at least 1rem horizontal spacing from viewport edges

## Acceptance Criteria

- [ ] `.form-grid` uses `auto-fit minmax` responsive columns
- [ ] `.card` width is `min(340px, 100%)`
- [ ] `.center` has horizontal padding for narrow screens
- [ ] Forms are usable on 320px viewport
- [ ] Desktop layout unchanged
