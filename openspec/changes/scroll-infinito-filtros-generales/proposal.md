# Proposal: Infinite Scroll & General Filters Pattern

## Intent

Convert duplicated infinite scroll logic into a reusable pattern, add alphabetical sorting as a general filter, and apply consistent pagination across all product listing pages (Catalog, Inventory, POS). Currently POS loads all products at once (pageSize: 9999), while Catalog and Inventory have copy-pasted infinite scroll code.

## Scope

### In Scope
- Extract shared `useInfiniteScroll` hook encapsulating offset, hasMore, loading, IntersectionObserver
- Add sort parameter to `buscar_productos` RPC and TypeScript types
- Create sort dropdown UI component (reusable across modules)
- Refactor PosPage to use server-side pagination instead of bulk load
- Ensure category filter works with infinite scroll (respecting filtered limit)
- Make infrastructure extensible for future modules (reports, accounts receivable, etc.)

### Out of Scope
- New filter types beyond category and sort (future work)
- Changes to CommandPalette (small result set, no pagination needed)
- Performance optimization of existing RPC queries
- Mobile-specific infinite scroll behaviors

## Capabilities

### New Capabilities
- `infinite-scroll-pattern`: Shared hook + sentinel component for offset-based pagination with IntersectionObserver
- `product-sorting`: Sort parameter in RPC + UI controls for alphabetical and other sort criteria

### Modified Capabilities
- `pos-product-listing`: Add infinite scroll to PosPage (currently loads all products)

## Approach

1. Create `useInfiniteScroll` hook in `web/src/hooks/` encapsulating:
   - Offset state management
   - hasMore/loadingMore flags
   - IntersectionObserver for scroll detection
   - Reset on filter/search changes

2. Extend `buscar_productos` RPC with `p_order_by` parameter (default: 'nombre ASC')
   - Maintain backward compatibility (optional parameter)
   - Support: 'nombre ASC', 'nombre DESC', 'precio ASC', 'precio DESC'

3. Create `SortDropdown` component with extensible sort options

4. Refactor PosPage to use shared hook with PAGE_SIZE=50 (consistent with other pages)

5. Update CatalogoPage and InventarioPage to use shared hook (remove duplication)

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `web/src/hooks/useInfiniteScroll.ts` | New | Shared infinite scroll hook |
| `web/src/components/SortDropdown.tsx` | New | Reusable sort UI component |
| `web/src/lib/productos.ts` | Modified | Add sort parameter to listarProductos |
| `supabase/functions/buscar_productos.sql` | Modified | Add p_order_by parameter |
| `web/src/pages/PosPage.tsx` | Modified | Replace bulk load with infinite scroll |
| `web/src/pages/CatalogoPage.tsx` | Modified | Use shared hook (remove duplication) |
| `web/src/pages/InventarioPage.tsx` | Modified | Use shared hook (remove duplication) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| RPC backward compatibility | Low | Optional parameter with default value |
| PosPage UX change (instant → paginated) | Medium | Maintain same PAGE_SIZE=50, smooth loading states |
| Performance regression | Low | Server-side pagination reduces initial load |
| Filter state synchronization | Medium | Centralize filter state in hook, test edge cases |

## Rollback Plan

1. Revert hook creation and component changes
2. Restore original PosPage bulk load (pageSize: 9999)
3. Remove sort parameter from RPC (optional, no breaking change)
4. Revert CatalogoPage and InventarioPage to original infinite scroll implementations

## Dependencies

- Supabase RPC `buscar_productos` must accept optional `p_order_by` parameter
- React IntersectionObserver API support (already used in current implementation)

## Success Criteria

- [ ] All 3 pages (Catalog, Inventory, POS) use shared `useInfiniteScroll` hook
- [ ] Sort dropdown works across all product listing pages
- [ ] PosPage loads 50 products initially with infinite scroll (not all 9999)
- [ ] Category filter respects pagination limits
- [ ] No performance regression in product loading
- [ ] Infrastructure is extensible for future modules