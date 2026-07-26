# Tasks: Infinite Scroll & General Filters Pattern

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~410 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | RPC sort + hook + component + pages | single PR | `cd web && npx vitest run useInfiniteScroll` | `npx vite --port 5173` then navigate each page | Revert all frontend files; RPC stays (backward-compatible param) |

## Phase 1: Foundation (SQL + Types + Hook + Component)

- [x] 1.1 Create `supabase/patch_08_ordenar_productos_rpc.sql` — add `p_order_by text default 'nombre ASC'` param to `buscar_productos`, CASE-based dynamic ORDER BY in both branches (no-search & search), invalid value falls back to `nombre ASC`
- [x] 1.2 Create `web/src/hooks/useInfiniteScroll.ts` — custom hook with interfaces (`FetchResult<T>`, `UseInfiniteScrollOpts`, `UseInfiniteScrollReturn`), offset/loading/hasMore/error state, IntersectionObserver on `sentinelRef`, reset on filter change (`useEffect` dependency array), error handling that keeps existing items
- [x] 1.3 Create `web/src/components/SortDropdown.tsx` — reusable dropdown with `value`/`onChange`/`options`/`className` props, 4 default options (Nombre A-Z, Z-A, Precio↑, Precio↓), renders current selection

## Phase 2: Integration (Productos Lib + Pages)

- [x] 2.1 Modify `web/src/lib/productos.ts` — add `orderBy?: string` to `listarProductos` opts, pass `p_order_by` to RPC call
- [x] 2.2 Modify `web/src/pages/CatalogoPage.tsx` — replace duplicated scroll state/refs/IntersectionObserver (~40 lines) with `useInfiniteScroll` hook, add `SortDropdown` to toolbar
- [x] 2.3 Modify `web/src/pages/InventarioPage.tsx` — same as CatalogoPage: replace duplicated scroll logic with `useInfiniteScroll`, add `SortDropdown`
- [x] 2.4 Modify `web/src/pages/PosPage.tsx` — replace bulk load (`pageSize: 9999`) with `useInfiniteScroll` (PAGE_SIZE=50), debounced server-side search via RPC, category filter, `SortDropdown`, loading/load-more indicators, replace client-side `sugerencias`/`productosFiltrados` with server-paginated list

## Phase 3: Testing

- [x] 3.1 Write unit tests for `useInfiniteScroll` — pure logic tests (initial load, hasMore, empty result, filter passthrough). Note: `renderHook` hangs in happy-dom environment; integration covered by page tests.
- [x] 3.2 Write unit tests for `SortDropdown` — renders default options, calls onChange on selection, supports custom options prop, aria-selected, Escape close
- [x] 3.3 Verify integration — all 64 tests pass (15 test files)

## Phase 4: Cleanup

- [x] 4.1 Remove unused imports from `CatalogoPage.tsx` (`PAGE_SIZE`, `hasMore`)
- [x] 4.2 Remove unused imports from `InventarioPage.tsx` (`PAGE_SIZE`, `hasMore`)
- [x] 4.3 Remove unused imports from `PosPage.tsx` (`PAGE_SIZE`)

## SQL Application (pending user)

- [ ] 5.1 Apply `supabase/patch_08_ordenar_productos_rpc.sql` in Supabase Dashboard → SQL Editor
