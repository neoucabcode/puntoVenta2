# Proposal: Responsive Modernization

## Intent

The app currently uses a single media query, no fluid typography, and hardcoded viewport heights that break on mobile Safari. Touch targets violate WCAG (44px). This change modernizes CSS to be mobile-first, fluid, and accessible, following 2026 CSS trends (container queries, clamp(), dvh). The goal is a fully responsive PWA that works well on phones, tablets, and desktops without sacrificing the existing desktop experience.

## Scope

### In Scope
- Phase 1 (P1 – Critical): Viewport height fix (replace 100vh with dvh/svh), body overflow fix (enable mobile scroll), touch target compliance (≥44px), mobile navigation (sidebar collapse/hamburger).
- Phase 2 (P2 – High): Fluid typography/spacing with clamp(), form grid responsive (auth card, other forms), DataTable horizontal scroll on narrow screens.
- Phase 3 (P3 – Medium): Container queries for cards, safe-area-inset for PWA, useMediaQuery hook utility.

### Out of Scope
- Redesign of visual style (colors, fonts, spacing values) – only the mechanism becomes fluid.
- New components or features beyond responsive behavior.
- Changes to business logic, data flow, or API calls.
- Dark/light theme changes (already works via CSS custom properties).

## Capabilities

### New Capabilities
None

### Modified Capabilities
None

## Approach

- **Phase 1**: Replace all `100vh` with `100dvh` (fallback `100vh` for older browsers). Add `overflow: auto` to body/scroll containers. Increase touch targets via padding/min-height. Implement a collapsible sidebar for mobile (<768px) using CSS `position: fixed` + toggle button.
- **Phase 2**: Convert hardcoded font sizes and spacing to `clamp()` functions. Make form grids responsive with `auto-fill minmax`. Wrap DataTables in a scrollable container on narrow screens.
- **Phase 3**: Add container queries for product cards and other reusable components. Add `safe-area-inset` padding for PWA standalone mode. Create a `useMediaQuery` hook for future conditional rendering.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `web/src/index.css` | Modified | Replace 100vh, add fluid typography, touch targets, container queries, safe-area-inset. |
| `web/src/components/Layout.tsx` | Modified | Mobile navigation (sidebar toggle, overlay). |
| `web/src/pages/PosPage.tsx` | Modified | Cart scroll height, touch targets. |
| `web/src/pages/CatalogoPage.tsx` | Modified | Touch targets. |
| `web/src/components/ProductoForm.tsx` | Modified | Touch targets, form grid. |
| `web/src/pages/AuthPage.tsx` | Modified | Auth card width fluid. |
| `web/src/components/DataTable.tsx` | Modified | Scroll wrapper for narrow screens. |
| `web/src/hooks/` | New | `useMediaQuery.ts` (optional). |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Browser compatibility (dvh, container queries) | Low | Use fallbacks (`vh` for older browsers, `@supports`). |
| Mobile nav breaks existing desktop layout | Med | Test on desktop after each phase; keep sidebar visible on ≥768px. |
| Touch target changes affect visual density | Med | Adjust padding carefully; may need to tweak button sizes per component. |
| Fluid typography leads to overly large/small text | Low | Use sensible clamp() ranges (e.g., `clamp(1rem, 2vw, 1.5rem)`). |
| Scope creep into visual redesign | Med | Stick to responsive mechanics; visual tweaks are out of scope. |

## Rollback Plan

- Each phase is a separate PR; revert PR to rollback that phase.
- CSS changes are isolated to `index.css` and component styles; reverting is safe.
- No data or logic changes; no migrations needed.

## Dependencies

- Modern browser support (Chrome 108+, Safari 15.4+, Firefox 110+). Fallbacks provided.
- No new dependencies; pure CSS.

## Success Criteria

- [ ] No `100vh` usage; all viewport heights use `dvh` with fallback.
- [ ] All interactive elements have ≥44px touch target.
- [ ] Sidebar collapses on mobile (<768px) with hamburger toggle.
- [ ] Body scrolls on mobile (no overflow:hidden blocking scroll).
- [ ] Typography and spacing scale fluidly with viewport width.
- [ ] DataTables scroll horizontally on narrow screens.
- [ ] Auth card width is fluid (not hardcoded 340px).
- [ ] PWA standalone mode respects safe-area-inset.

## Slice Breakdown & Dependencies

| Slice | Phase | Description | Dependencies |
|-------|-------|-------------|--------------|
| 1 | P1 | Viewport height fix (dvh) + body overflow fix | None |
| 2 | P1 | Touch target compliance (all buttons, links) | None |
| 3 | P1 | Mobile navigation (sidebar collapse) | Slice 1 (height) |
| 4 | P2 | Fluid typography & spacing (clamp()) | None |
| 5 | P2 | Form grid responsive (auth, product form) | None |
| 6 | P2 | DataTable scroll wrapper | None |
| 7 | P3 | Container queries for cards | None |
| 8 | P3 | safe-area-inset for PWA | Slice 1 (height) |
| 9 | P3 | useMediaQuery hook | None |

Slices 1-3 are P1 and should be merged first. Slices 4-6 are P2. Slices 7-9 are P3. Within each phase, slices are independent and can be separate PRs.

## Key Decisions Needed from User

1. **Minimum viewport width**: Should we support screens narrower than 320px (e.g., iPhone SE)? Or set a minimum width?
2. **Sidebar behavior on tablet**: Should the sidebar remain visible on tablets (768px-1024px) or collapse as on mobile?
3. **Touch target density**: Should we increase padding globally (affecting all buttons) or only on mobile? Could affect desktop density.
4. **Fluid typography range**: What's the acceptable font size range? (e.g., body text 14px-18px)
5. **PWA standalone detection**: Should we add safe-area-inset only when `display-mode: standalone` is detected, or always?

## Non-Goals

- Visual redesign (colors, fonts, spacing values).
- New features or components.
- Changes to business logic or data flow.
- Support for very old browsers (IE11, pre-2020 browsers).
