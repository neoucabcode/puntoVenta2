# Slice 1 — Viewport Height Fix

## Purpose

Replace all `100vh` declarations with `100dvh` (dynamic viewport height) to fix mobile Safari address bar resize issues. Also fix `overflow: hidden` on body to allow mobile scrolling.

## Requirements

### Requirement: Dynamic Viewport Height

The system SHALL replace all `100vh` usages with `100dvh`, providing `100vh` as a fallback for older browsers via `@supports`.

The affected declarations in `index.css`:
- `body` `min-height` (line 96)
- `.app-shell` `height` (line 108)
- `.sidebar` `height` (line 122)
- `.main-col` `height` (line 177)
- `.center` `min-height` (line 202)

#### Scenario: Modern browser renders correct viewport height

- GIVEN a browser that supports `dvh` (Chrome 108+, Safari 15.4+)
- WHEN the page loads
- THEN `body` SHALL have `min-height: 100dvh`
- AND `.app-shell` SHALL have `height: 100dvh`
- AND `.sidebar` SHALL have `height: 100dvh`
- AND `.main-col` SHALL have `height: 100dvh`
- AND `.center` SHALL have `min-height: 100dvh`

#### Scenario: Older browser falls back to vh

- GIVEN a browser that does NOT support `dvh`
- WHEN the page loads
- THEN the browser SHALL use the `100vh` fallback declared before the `100dvh` rule

#### Scenario: Mobile Safari address bar resize

- GIVEN an iPhone with Safari dynamic address bar
- WHEN the user scrolls and the address bar shrinks
- THEN the app shell SHALL resize to fill the new visible viewport height
- AND no content SHALL be hidden behind the address bar

### Requirement: Body Overflow Fix

The system SHALL replace `overflow: hidden` on `body` with `overflow-x: hidden; overflow-y: auto`.

The current declaration at line 96:
```css
body { margin: 0; background: var(--bg-base); color: var(--text-primary); min-height: 100vh; overflow: hidden; }
```

#### Scenario: Mobile user can scroll page content

- GIVEN a user on a mobile device (viewport < 768px)
- WHEN page content exceeds the viewport height
- THEN the user SHALL be able to scroll vertically
- AND horizontal overflow SHALL remain hidden

#### Scenario: Desktop layout unchanged

- GIVEN a user on desktop (viewport ≥ 1024px)
- WHEN the page loads
- THEN the layout SHALL behave identically to before (no visible scroll on body since inner containers handle scrolling)

## Acceptance Criteria

- [ ] Zero remaining `100vh` declarations (grep confirms)
- [ ] `body` has `overflow-x: hidden; overflow-y: auto`
- [ ] Mobile Safari: page scrolls correctly with dynamic address bar
- [ ] Desktop: no visual regression in layout height
- [ ] All 5 affected declarations converted with fallback
