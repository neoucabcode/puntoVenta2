# Design: Responsive Modernization

## Technical Approach

Mobile-first CSS overhaul of a vanilla-CSS React PWA. Strategy: incremental slices (P1 critical, P2 high, P3 medium) that replace hardcoded viewport heights with `dvh`, add fluid typography via `clamp()`, enforce WCAG touch targets, and introduce mobile navigation drawer. All changes are additive; no visual redesign. Existing CSS stays in `index.css` (~1936 lines) to avoid import churn; new responsive rules appended as clearly separated sections. Component changes limited to Layout.tsx (drawer state) and one new hook.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| CSS file organization | Append to `index.css` vs. split `responsive.css` | Append avoids import changes; split improves maintainability but adds complexity. Current project uses single CSS file. | Append to `index.css` with clear section markers (`/* ---- Responsive: ... */`). |
| CSS naming convention | BEM vs. utility-first vs. existing pattern | Project uses descriptive class names (`.carrito-ticket-cant`). BEM would be inconsistent. | Follow existing pattern; add media queries at point of use or in responsive section. |
| `100vh` → `dvh` migration | `@supports (height: 100dvh)` fallback vs. `@supports not (height: 100dvh)` | Fallback ensures older browsers get `100vh`. Use `@supports (height: 100dvh)` for progressive enhancement. | Provide `100vh` then override with `100dvh` inside `@supports`. |
| Mobile drawer state | Local `useState` in Layout.tsx vs. extend `ui-store.ts` | Global store simplifies route-change coordination and potential future consumers. | `ui-store.ts` (Zustand): `drawerOpen`, `toggleDrawer`, `setDrawer`. |
| Drawer CSS | `transform: translateX` vs. `display: none` toggle | Transform enables smooth transition; display toggle is abrupt. | `transform: translateX(-100%)` with transition `200ms ease`. |
| Hamburger button | Material Symbol `menu` icon | Already using Material Symbols; consistent. | `<span class="material-symbols-outlined">menu</span>` with `aria-label`. |
| Fluid type tokens | CSS custom properties with `clamp()` | Enables global scaling; easy to adjust. | Define `--fs-*` and `--sp-*` in `:root`. |
| Touch target approach | `@media (max-width: 768px)` wrapper | Media query keeps desktop density unchanged. | Add `@media (max-width: 768px)` block with increased padding/min-height. |
| Container queries | `container-type: inline-size` with `@supports` fallback | Modern browsers only; fallback keeps grid layout. | Use `@supports (container-type: inline-size)`. |
| Hook SSR safety | `typeof window !== 'undefined'` check | Standard pattern for matchMedia. | Return `false` initially, update via `useEffect`. |

## Data Flow

Drawer state local to Layout.tsx:

```
Layout.tsx
├── drawerOpen (useState)
│   ├── toggleDrawer → setDrawerOpen(prev => !prev)
│   └── useEffect(location.pathname) → setDrawerOpen(false)
├── hamburger button (visible <768px) → onClick={toggleDrawer}
└── sidebar (CSS transform based on drawerOpen)
```

No external stores affected.

## File Changes

### Slice-to-File Mapping

| Slice | Files Changed | Description |
|-------|---------------|-------------|
| Slice 1 | `web/src/index.css` | Add `@supports (height: 100dvh)` overrides for 5 selectors; change body overflow to `overflow-x: hidden; overflow-y: auto`. |
| Slice 2 | `web/src/index.css` | Add `@media (max-width: 768px)` block with increased padding/min-height for priority elements. |
| Slice 3 | `web/src/index.css`, `web/src/components/Layout.tsx` | CSS: drawer transform, backdrop, hamburger visibility. TSX: drawerOpen state, hamburger button, backdrop element, route-change effect. |
| Slice 4 | `web/src/index.css` | Add fluid typography tokens (`--fs-*`) and spacing tokens (`--sp-*`) in `:root`; replace hardcoded font-size declarations with tokens. |
| Slice 5 | `web/src/index.css` | Change `.form-grid` to `repeat(auto-fit, minmax(min(100%, 280px), 1fr))`; change `.card` width to `min(340px, 100%)`; add padding to `.center`. |
| Slice 6 | `web/src/index.css` | Add `.dt-table { min-width: 600px; }` (already exists? verify). |
| Slice 7 | `web/src/index.css` | Add `container-type: inline-size` to product grid containers; add `@container` rules for card layouts; add fallback. |
| Slice 8 | `web/src/index.css`, `web/index.html` | CSS: add safe-area-inset padding to `.app-shell`. HTML: update viewport meta with `viewport-fit=cover`. |
| Slice 9 | `web/src/hooks/useMediaQuery.ts` | Create new hook file. |

### Summary of All Affected Files

| File | Action | Description |
|------|--------|-------------|
| `web/src/index.css` | Modify | Append responsive sections: dvh overrides, fluid tokens, touch targets, drawer CSS, container queries, safe-area-inset. |
| `web/src/components/Layout.tsx` | Modify | Add `drawerOpen` state, hamburger button, backdrop overlay, route-change close effect. |
| `web/index.html` | Modify | Update viewport meta: add `viewport-fit=cover`. |
| `web/src/hooks/useMediaQuery.ts` | Create | New hook with `IS_MOBILE`, `IS_TABLET`, `IS_DESKTOP` constants. |
| `web/src/pages/PosPage.tsx` | Modify | Ensure cart scroll container uses `dvh` (already via `.main-col`). No other changes needed. |
| `web/src/pages/CatalogoPage.tsx` | Modify | None (touch targets handled via CSS). |
| `web/src/components/ProductoForm.tsx` | Modify | None (form grid responsive via CSS). |
| `web/src/pages/AuthPage.tsx` | Modify | None (card width via CSS). |
| `web/src/components/DataTable.tsx` | Modify | Ensure `.dt-scroll` wrapper exists (already present). No TSX changes. |

## Interfaces / Contracts

### useMediaQuery hook API (final implementation)

```typescript
// web/src/hooks/useMediaQuery.ts
export function useMediaQuery(query: string): boolean
export const useIsMobile = () => useMediaQuery('(max-width: 768px)')
export const useIsTablet = () => useMediaQuery('(min-width: 769px) and (max-width: 1024px)')
export const useIsDesktop = () => useMediaQuery('(min-width: 1025px)')
```

### Fluid typography tokens (added to `:root`)

```css
--fs-xs: clamp(0.65rem, 0.6rem + 0.2vw, 0.78rem);
--fs-sm: clamp(0.75rem, 0.7rem + 0.25vw, 0.9rem);
--fs-base: clamp(0.875rem, 0.8rem + 0.35vw, 1.125rem);
--fs-lg: clamp(1rem, 0.9rem + 0.5vw, 1.35rem);
--fs-xl: clamp(1.15rem, 1rem + 0.7vw, 1.6rem);
--fs-2xl: clamp(1.3rem, 1.1rem + 0.9vw, 2rem);
```

### Fluid spacing tokens

```css
--sp-xs: clamp(0.25rem, 0.2rem + 0.25vw, 0.5rem);
--sp-sm: clamp(0.35rem, 0.3rem + 0.3vw, 0.75rem);
--sp-md: clamp(0.5rem, 0.4rem + 0.5vw, 1.25rem);
--sp-lg: clamp(0.75rem, 0.6rem + 0.75vw, 1.75rem);
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `useMediaQuery` hook returns correct boolean | Vitest with mocked `matchMedia` |
| Integration | Drawer opens/closes, route change resets | Manual test on mobile viewport (Chrome DevTools) |
| E2E | Touch target sizes, fluid typography scaling | Lighthouse accessibility audit at 375px, manual resize test |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No data migration. CSS changes are additive. Feature flags not needed; media queries handle progressive enhancement. Deploy as single PR after all slices implemented.

## Open Questions

- [ ] Should we define fluid tokens in `:root` or inside a `@media` block? (Proposed: `:root` for global availability)
- [ ] Minimum viewport width: support 320px (iPhone SE) or set 320px min-width? (Proposal suggests supporting 320px)
- [ ] Tablet breakpoint: keep sidebar visible at 768-1023px or collapse? (Current design collapses at <768px only)

---

## Implementation Retrospective

The following decisions diverged from the original design during implementation. These are not errors — they reflect real-world adjustments discovered during coding and review.

| Original Design Decision | Actual Implementation | Why |
|--------------------------|----------------------|-----|
| Drawer state: local `useState` in Layout.tsx | Zustand `ui-store.ts` (`drawerOpen`, `toggleDrawer`, `setDrawer`) | Drawer needed to be accessible from nav link clicks and route changes; global store simplified coordination without prop-drilling |
| Convenience API: exported constants `IS_MOBILE`, `IS_TABLET`, `IS_DESKTOP` | Exported hooks `useIsMobile()`, `useIsTablet()`, `useIsDesktop()` | Hooks are more ergonomic in React; the constants would need a hook wrapper anyway |
| Fluid tokens: `--text-*` and `--space-*` prefix | `--fs-*` and `--sp-*` prefix | Shorter, consistent with CSS shorthand conventions in the existing codebase |
| Fluid body text: `clamp(0.875rem, 0.8rem + 0.35vw, 1.125rem)` | `clamp(0.875rem, 0.8rem + 0.375vw, 1rem)` | Tighter max range (16px vs 18px) — better desktop visual density after visual review |
| Form grid: `auto-fit minmax(min(100%, 280px), 1fr)` | Media query `grid-template-columns: 1fr` at ≤768px | Simpler, avoids edge cases where `auto-fit` creates empty columns or unexpected wrapping |
| Hamburger co-exists with CmdK search button | Hamburger REPLACES CmdK on mobile | Topbar space is extremely limited on mobile; search is still accessible via Ctrl+K keyboard shortcut |

**Final fluid typography tokens** (as implemented):

```css
--fs-xs: clamp(0.65rem, 0.6rem + 0.25vw, 0.75rem);
--fs-sm: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
--fs-base: clamp(0.875rem, 0.8rem + 0.375vw, 1rem);
--fs-lg: clamp(1rem, 0.9rem + 0.5vw, 1.25rem);
--fs-xl: clamp(1.25rem, 1rem + 1.25vw, 1.75rem);
--fs-2xl: clamp(1.5rem, 1rem + 2.5vw, 2.5rem);
```

**Final spacing tokens** (as implemented):

```css
--sp-1: clamp(0.25rem, 0.2rem + 0.25vw, 0.5rem);
--sp-2: clamp(0.5rem, 0.4rem + 0.5vw, 0.75rem);
--sp-3: clamp(0.75rem, 0.5rem + 1.25vw, 1.25rem);
--sp-4: clamp(1rem, 0.75rem + 1.25vw, 1.5rem);
--sp-5: clamp(1.5rem, 1rem + 2.5vw, 2.5rem);
--sp-6: clamp(2rem, 1.5rem + 2.5vw, 3rem);
```

**Final useMediaQuery hook API** (as implemented):

```typescript
// web/src/hooks/useMediaQuery.ts
export function useMediaQuery(query: string): boolean
export const useIsMobile = () => useMediaQuery('(max-width: 768px)')
export const useIsTablet = () => useMediaQuery('(min-width: 769px) and (max-width: 1024px)')
export const useIsDesktop = () => useMediaQuery('(min-width: 1025px)')
```

---

**Size budget**: ~650 words. Architecture decisions as tables. Code snippets only for non-obvious patterns.