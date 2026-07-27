# Slice 4 — Fluid Typography & Spacing

## Purpose

Replace hardcoded `font-size` and spacing values with `clamp()` functions so text and spacing scale fluidly between 320px and 1280px viewports. The existing font family (Inter) is preserved.

## Requirements

### Requirement: Fluid Typography Scale

The system SHALL define CSS custom properties for typography using `clamp()`.

The body text range SHALL be 14px–18px. Headings SHALL scale proportionally.

| Token | Clamp Expression | Usage |
|-------|-----------------|-------|
| `--text-xs` | `clamp(0.65rem, 0.6rem + 0.2vw, 0.78rem)` | Badges, meta |
| `--text-sm` | `clamp(0.75rem, 0.7rem + 0.25vw, 0.9rem)` | Labels, secondary |
| `--text-base` | `clamp(0.875rem, 0.8rem + 0.35vw, 1.125rem)` | Body text |
| `--text-lg` | `clamp(1rem, 0.9rem + 0.5vw, 1.35rem)` | Card titles |
| `--text-xl` | `clamp(1.15rem, 1rem + 0.7vw, 1.6rem)` | Section headings |
| `--text-2xl` | `clamp(1.3rem, 1.1rem + 0.9vw, 2rem)` | Page titles |

#### Scenario: Body text at 320px viewport

- GIVEN a 320px-wide viewport
- WHEN reading body text
- THEN font size SHALL be approximately 14px (0.875rem)

#### Scenario: Body text at 1280px viewport

- GIVEN a 1280px-wide viewport
- WHEN reading body text
- THEN font size SHALL be approximately 18px (1.125rem)

#### Scenario: Smooth transition between sizes

- GIVEN a viewport being resized from 320px to 1280px
- WHEN observing body text
- THEN font size SHALL scale smoothly without jumps

### Requirement: Fluid Spacing Scale

The system SHALL define CSS custom properties for spacing using `clamp()`.

| Token | Clamp Expression | Usage |
|-------|-----------------|-------|
| `--space-xs` | `clamp(0.25rem, 0.2rem + 0.25vw, 0.5rem)` | Tight gaps |
| `--space-sm` | `clamp(0.35rem, 0.3rem + 0.3vw, 0.75rem)` | Component padding |
| `--space-md` | `clamp(0.5rem, 0.4rem + 0.5vw, 1.25rem)` | Section padding |
| `--space-lg` | `clamp(0.75rem, 0.6rem + 0.75vw, 1.75rem)` | Page margins |

#### Scenario: Spacing scales with viewport

- GIVEN a 375px phone and a 1280px desktop
- WHEN comparing `.content` padding
- THEN the phone SHALL have approximately 0.5rem padding
- AND the desktop SHALL have approximately 1.25rem padding

### Requirement: Replace Hardcoded Values

The system SHALL replace hardcoded `font-size` declarations in `index.css` with the new fluid tokens. Selectors to update include:

- `.brand-name`, `.brand-toggle`, `.side-link`, `.side-logout`
- `.topbar-page-title`, `.topbar-user`, `.topbar-theme`
- `.card h1`, `.card input`, `.card button`, `.card a`
- `.dt-table`, `.dt-table th`, `.dt-table td`
- `.card-nombre`, `.card-precio`, `.card-stock`
- All `.wf-*` wizard typography

#### Scenario: No hardcoded font-size remains in key selectors

- GIVEN the updated `index.css`
- WHEN grepping for `font-size:` in affected selectors
- THEN zero values SHALL be raw pixel/rem literals (all use `var(--text-*)`)

## Acceptance Criteria

- [ ] 6 fluid typography tokens defined in `:root`
- [ ] 4 fluid spacing tokens defined in `:root`
- [ ] All key selectors use fluid tokens
- [ ] Body text: 14px at 320px, 18px at 1280px
- [ ] No visual regression on desktop (values match current at 1280px)
