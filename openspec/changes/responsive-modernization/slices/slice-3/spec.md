# Slice 3 — Mobile Navigation

## Purpose

Convert the sidebar from a permanently visible panel to an overlay drawer on viewports < 768px. A hamburger button in the topbar triggers the drawer. A backdrop overlay dims content when open. The drawer auto-closes on navigation.

## Requirements

### Requirement: Sidebar Drawer on Mobile

The system SHALL hide the sidebar on viewports < 768px and display it as a fixed-position overlay drawer when opened.

The sidebar SHALL use `position: fixed; inset: 0; z-index: 40` on mobile, with a slide-in transition.

On viewports ≥ 768px, the sidebar SHALL remain visible as it is today (no change).

#### Scenario: Sidebar hidden on mobile by default

- GIVEN a user on a 375px-wide phone
- WHEN the page loads
- THEN the sidebar SHALL NOT be visible
- AND the main content SHALL fill the full viewport width

#### Scenario: Hamburger button opens drawer

- GIVEN a user on mobile with sidebar closed
- WHEN tapping the hamburger button in the topbar
- THEN the sidebar SHALL slide in from the left
- AND a semi-transparent backdrop SHALL appear behind it
- AND the backdrop SHALL have `background: rgba(0,0,0,0.5)`

#### Scenario: Tapping backdrop closes drawer

- GIVEN the mobile drawer is open
- WHEN the user taps the backdrop overlay
- THEN the sidebar SHALL close
- AND the backdrop SHALL disappear

#### Scenario: Navigation closes drawer

- GIVEN the mobile drawer is open
- WHEN the user taps a navigation link (e.g., Catálogo)
- THEN the sidebar SHALL close automatically
- AND the route SHALL change to the selected page

### Requirement: Hamburger Button

The system SHALL add a hamburger menu button to the topbar, visible ONLY on viewports < 768px.

The button SHALL use the `menu` Material Symbol icon and have `aria-label="Abrir menú"`.

#### Scenario: Hamburger visible on mobile

- GIVEN a user on a 375px phone
- WHEN viewing the topbar
- THEN a hamburger button SHALL be visible on the left side of the topbar
- AND it SHALL have ≥ 44px touch target (per Slice 2)

#### Scenario: Hamburger hidden on desktop

- GIVEN a user on a 1280px desktop
- WHEN viewing the topbar
- THEN the hamburger button SHALL NOT be visible

### Requirement: Layout.tsx State Management

The system SHALL manage a `drawerOpen` boolean state in `Layout.tsx`. The state SHALL be reset to `false` on route change (`useEffect` watching `location.pathname`).

#### Scenario: Route change resets drawer

- GIVEN a user on mobile with the drawer open
- WHEN the URL changes (back/forward or programmatic navigation)
- THEN the drawer SHALL close

## Acceptance Criteria

- [ ] Sidebar hidden below 768px, visible at ≥768px
- [ ] Hamburger button visible only below 768px
- [ ] Drawer slides in with CSS transition (≤300ms)
- [ ] Backdrop overlay present when drawer open
- [ ] Drawer closes on backdrop tap
- [ ] Drawer closes on navigation link tap
- [ ] Drawer closes on route change
- [ ] Desktop layout unchanged
