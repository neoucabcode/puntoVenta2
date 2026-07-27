# Tasks: Responsive Modernization

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Est. changed lines | ~750 across 4 PRs |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|----|----------------------|-----------------|-------------------|
| 1 | Fix viewport & touch targets | PR 1 | `npx playwright test --grep "viewport"` | dev + mobile | `web/src/index.css` revert |
| 2 | Add mobile navigation drawer | PR 2 | `npx playwright test --grep "drawer"` | dev + mobile | Layout TSX + CSS revert |
| 3 | Fluid type, forms, table scroll | PR 3 | `npx playwright test --grep "typography"` | dev | CSS custom props revert |
| 4 | Container queries, safe-area, hook | PR 4 | `npx playwright test --grep "container"` | dev | New files + CSS revert |

## Phase 1: Foundation

- [ ] 1.1 Replace `100vh` → `100dvh` in `web/src/index.css` (5 instances). Trivial. Depends: none. Mobile viewport check.
- [ ] 1.2 Change body `overflow: hidden` → `overflow: auto` in `web/src/index.css`. Trivial. Depends: 1.1. Scroll works on mobile.
- [ ] 1.3 Fix cart buttons min-height 20→44px. Easy. File: CSS. No deps. Verification: touch target ≥44px.
- [ ] 1.4 Fix DataTable action buttons min-height 32→44px. Easy. Depends: none. Verification: touch target ≥44px.
- [ ] 1.5 Fix remaining touch targets (theme toggle, instrument remove) to 44px. Easy. No deps. Audit all <44px.
- [ ] 1.6 Create `web/src/hooks/useMediaQuery.ts` — SSR-safe matchMedia hook. Medium. Depends: none. Unit test needed.

## Phase 2: Core CSS

- [ ] 2.1 Define fluid type scale CSS custom properties in `web/src/index.css`. Medium. Depends: 1.1.
- [ ] 2.2 Replace hardcoded `font-size` with `clamp()` values. Medium. Depends: 2.1. Inspect computed sizes.
- [ ] 2.3 Make `.form-grid` responsive (1 col mobile). Easy. Depends: 2.1. Verification: layout at 375px.
- [ ] 2.4 Add `overflow-x: auto` wrapper to DataTable in `web/src/components/DataTable.tsx`. Easy. Depends: none.
- [ ] 2.5 Add `container-type` to grid containers in `web/src/index.css`. Medium. Depends: 2.1.
- [ ] 2.6 Create `@container` rules for card adaptation in `web/src/index.css`. Medium. Depends: 2.5.
- [ ] 2.7 Add `env(safe-area-inset-*)` padding to app shell in `web/src/index.css`. Easy. Depends: 2.1.

## Phase 3: Integration

- [ ] 3.1 Add hamburger button to topbar in `web/src/components/Layout.tsx`. Medium. Depends: 1.6.
- [ ] 3.2 Implement drawer CSS (fixed, transform, backdrop) in `web/src/index.css`. Medium. Depends: 3.1.
- [ ] 3.3 Integrate drawer state with Layout.tsx and Zustand ui-store. Medium. Depends: 1.6, 3.1, 3.2.
- [ ] 3.4 Wire hamburger click to toggle drawer. Medium. Depends: 3.1, 3.3.

## Phase 4: Verification

- [ ] 4.1 Run responsive tests: `npx playwright test --grep "viewport|touch|drawer|typography"`. Medium. Depends: all above.
- [ ] 4.2 Manual QA on mobile viewport (375px). Medium. Depends: 4.1.
