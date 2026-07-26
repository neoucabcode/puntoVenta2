# Design: Infinite Scroll & General Filters Pattern

## Technical Approach

Extract duplicated infinite-scroll logic from `CatalogoPage` and `InventarioPage` into a shared `useInfiniteScroll` hook, add server-side sorting to `buscar_productos` RPC, and refactor `PosPage` from bulk-loading all products (`pageSize: 9999`) to paginated infinite scroll. All three product-listing pages will share the same hook + sort component.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Hook shape | Custom hook returning `{ items, hasMore, loadingMore, loadMore, reset, sentinelRef }` | Render-prop component; React Query `useInfiniteQuery` | Existing codebase uses plain hooks + `useCallback`/`useRef` (no React Query dependency). Keeps the migration minimal — drop-in replacement for duplicated code. |
| Sort in RPC | Add `p_order_by text default 'nombre ASC'` parameter | Client-side sort after fetch; new RPC | Optional param with safe fallback preserves backward compatibility. Client-side sort would still require fetching all rows. |
| Sort validation | Whitelist valid values in SQL, fall back to default | Trust caller; throw error | Defensive: invalid input silently falls back to `nombre ASC` — prevents runtime errors from typos. |
| PosPage search | Debounced server-side search via RPC (same as other pages) | Client-side filter on paginated results | Client-side search only works on the loaded page. Server-side search respects pagination and returns ranked results. |
| Sentinel placement | Rendered by the hook consumer (page component), not the hook | Hook renders sentinel internally | Consumers need the sentinel inside different containers (`grid-scroll`, `DataTable.after`). Keeping it as a ref lets the consumer control DOM placement. |

## Data Flow

```
Page Component (PosPage / CatalogoPage / InventarioPage)
  │
  ├─ filter state (search, category, sort) — local useState
  │
  ▼
useInfiniteScroll({ fetcher, filters: { search, category, sort } })
  │
  ├─ manages: offset, hasMore, loadingMore, items[]
  ├─ resets offset=0 when filters change (useEffect dependency)
  ├─ sets up IntersectionObserver on sentinelRef
  │
  ▼
fetcher({ search, category, sort, offset, pageSize })
  │
  ▼
listarProductos({ ...opts, orderBy })
  │
  ▼
supabase.rpc('buscar_productos', { ...params, p_order_by })
  │
  ▼
Postgres (RLS-filtered, ranked, paginated results)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `web/src/hooks/useInfiniteScroll.ts` | Create | Shared hook: offset management, IntersectionObserver, reset on filter change, error handling |
| `web/src/components/SortDropdown.tsx` | Create | Reusable sort dropdown: value/onChange props, 4 default options (A-Z, Z-A, Precio↑, Precio↓) |
| `web/src/lib/productos.ts` | Modify | Add `orderBy?: string` param to `listarProductos`, pass `p_order_by` to RPC call |
| `supabase/patch_08_ordenar_productos_rpc.sql` | Create | Add `p_order_by text default 'nombre ASC'` to `buscar_productos`, CASE-based dynamic ORDER BY |
| `web/src/pages/PosPage.tsx` | Modify | Replace bulk load with `useInfiniteScroll` + debounced search + category filter + `SortDropdown` |
| `web/src/pages/CatalogoPage.tsx` | Modify | Replace ~40 lines of duplicated scroll logic with `useInfiniteScroll` usage |
| `web/src/pages/InventarioPage.tsx` | Modify | Same as CatalogoPage — replace duplicated scroll logic with hook |

## Interfaces

```ts
// web/src/hooks/useInfiniteScroll.ts
type FetchResult<T> = { items: T[]; hasMore: boolean }

type UseInfiniteScrollOpts<T, F extends Record<string, unknown>> = {
  fetcher: (args: { offset: number; pageSize: number } & F) => Promise<FetchResult<T>>
  filters: F                    // reset triggers: changes → offset=0
  pageSize?: number             // default PAGE_SIZE (50)
  rootMargin?: string           // default '200px'
}

type UseInfiniteScrollReturn<T> = {
  items: T[]
  hasMore: boolean
  loadingMore: boolean
  loading: boolean
  error: string
  sentinelRef: React.RefObject<HTMLDivElement>
  reset: () => void             // manual reset (e.g., after delete)
}

// web/src/components/SortDropdown.tsx
type SortOption = { label: string; value: string }
type SortDropdownProps = {
  value: string
  onChange: (value: string) => void
  options?: SortOption[]        // default: A-Z, Z-A, Precio↑, Precio↓
  className?: string
}
```

**RPC change** (SQL):
```sql
-- Add parameter (backward compatible):
p_order_by text default 'nombre ASC'

-- Dynamic ORDER BY in both branches (no-search and search):
ORDER BY
  CASE p_order_by
    WHEN 'nombre DESC' THEN p.nombre END DESC,
  CASE p_order_by
    WHEN 'nombre ASC' THEN p.nombre END ASC,
  CASE p_order_by
    WHEN 'precio DESC' THEN p.precio_usd END DESC,
  CASE p_order_by
    WHEN 'precio ASC' THEN p.precio_usd END ASC,
  -- fallback
  p.nombre ASC
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `useInfiniteScroll` reset behavior, offset increment, end-of-data | Mock fetcher, render hook with `@testing-library/react-hooks` |
| Unit | `SortDropdown` renders options, calls onChange | Render + simulate click |
| Integration | PosPage initial load shows 50 items, scroll loads more | Cypress/Playwright: scroll to bottom, assert item count increases |
| Integration | Filter change resets scroll to top | Select category → assert offset resets, items replaced |
| E2E | POS search + sort + category filter work together | End-to-end flow in POS: search, change sort, filter by category |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

1. Deploy SQL migration (`patch_08`) first — it's backward compatible (new optional param).
2. Deploy frontend — `listarProductos` passes `p_order_by` (ignored if old RPC).
3. No data migration needed. No feature flags required — all changes are additive.
4. Rollback: revert frontend changes; RPC stays (harmless unused param).

## Open Questions

- [ ] Should `SortDropdown` live in `components/` or `components/filters/`? → Follow existing flat structure in `components/`.
- [ ] PosPage currently uses `sugerencias` (top 8 by name match) for list view — with server-side pagination, this becomes the first page of ranked results. Confirm this is acceptable UX.
