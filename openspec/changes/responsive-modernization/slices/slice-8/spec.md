# Slice 8 — safe-area-inset for PWA

## Purpose

Add `env(safe-area-inset-*)` padding to the app shell so content is not clipped by the iPhone notch, home indicator, or other OS chrome when running in PWA standalone mode.

## Requirements

### Requirement: Safe Area Padding on App Shell

The system SHALL add `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`, `env(safe-area-inset-left)`, and `env(safe-area-inset-right)` padding to the app shell.

The `viewport` meta tag in `index.html` MUST include `viewport-fit=cover` for safe-area-inset to work.

#### Scenario: PWA standalone on iPhone with notch

- GIVEN a user running the app in PWA standalone mode on an iPhone with a notch
- WHEN the page renders
- THEN content SHALL NOT be hidden behind the notch
- AND top padding SHALL match `env(safe-area-inset-top)`

#### Scenario: PWA standalone home indicator

- GIVEN a user running the app in PWA standalone mode on an iPhone with home indicator
- WHEN viewing the bottom of the page
- THEN content SHALL NOT be obscured by the home indicator
- AND bottom padding SHALL match `env(safe-area-inset-bottom)`

#### Scenario: Browser mode (not standalone)

- GIVEN a user viewing the app in a regular browser tab (not PWA standalone)
- WHEN the page renders
- THEN `env(safe-area-inset-*)` SHALL evaluate to 0
- AND no extra padding SHALL be added (harmless)

#### Scenario: Non-Apple devices

- GIVEN a user on an Android device or desktop
- WHEN the page renders
- THEN `env(safe-area-inset-*)` SHALL evaluate to 0
- AND no layout change SHALL occur

### Requirement: Viewport Meta Tag

The system SHALL update the viewport meta tag in `index.html` to include `viewport-fit=cover`.

Current: `<meta name="viewport" content="width=device-width, initial-scale=1" />`

New: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />`

#### Scenario: viewport-fit=cover present

- GIVEN the app's `index.html`
- WHEN inspecting the viewport meta tag
- THEN it SHALL contain `viewport-fit=cover`

## Acceptance Criteria

- [ ] `viewport-fit=cover` in viewport meta tag
- [ ] Safe-area-inset padding on app shell (top, bottom, left, right)
- [ ] PWA standalone: content not clipped by notch or home indicator
- [ ] Browser mode: no extra padding (evaluates to 0)
- [ ] Non-Apple devices: no layout change
