# Infinite Scroll Pattern Specification

## Purpose

Shared infrastructure for offset-based pagination using IntersectionObserver. Eliminates duplicated scroll logic across CatalogoPage, InventarioPage, and PosPage.

## Requirements

### Requirement: useInfiniteScroll Hook

The system MUST provide a `useInfiniteScroll` hook that manages offset-based pagination state.

The hook SHALL expose: `offset`, `hasMore`, `loadingMore`, `loadMore()`, and `reset()`.

#### Scenario: Initial load

- GIVEN a consumer provides a data fetcher and filter parameters
- WHEN the hook mounts
- THEN `offset` is 0 and `hasMore` is true
- AND the fetcher is called with offset=0

#### Scenario: Scroll to bottom loads more

- GIVEN items are displayed and `hasMore` is true
- WHEN the sentinel element becomes visible in viewport
- THEN `offset` increments by page size
- AND the fetcher is called with the new offset
- AND `loadingMore` is true during the fetch

#### Scenario: End of data

- GIVEN items are displayed
- WHEN the fetcher returns fewer items than page size
- THEN `hasMore` becomes false
- AND no further load attempts occur on scroll

### Requirement: Sentinel Element

The system MUST render a sentinel `<div>` at the end of the item list that triggers pagination when intersecting the viewport.

#### Scenario: Sentinel triggers next page

- GIVEN the list has items and `hasMore` is true
- WHEN the sentinel enters the viewport
- THEN the next page is loaded

#### Scenario: Sentinel hidden when no more data

- GIVEN `hasMore` is false
- WHEN the list renders
- THEN the sentinel is not present in the DOM

### Requirement: Reset on Filter Change

The hook MUST reset pagination to offset=0 when any filter parameter changes.

#### Scenario: Category filter changes

- GIVEN the user is on page 3 (offset=100) with a category filter
- WHEN the user selects a different category
- THEN offset resets to 0
- AND `hasMore` resets to true
- AND the fetcher is called with the new filter at offset=0

#### Scenario: Search text changes

- GIVEN the user is viewing paginated results
- WHEN the search text changes
- THEN offset resets to 0
- AND previous results are replaced (not appended)

### Requirement: Error Handling

The hook MUST handle fetch errors without losing current data.

#### Scenario: Fetch fails on load more

- GIVEN items are displayed from previous successful fetches
- WHEN a load-more fetch fails
- THEN `loadingMore` becomes false
- AND previously loaded items remain visible
- AND `hasMore` remains true (retry possible on next scroll)

### Requirement: Filter State Synchronization

The hook MUST accept filter dependencies and treat them as reset triggers.

#### Scenario: Multiple filters change simultaneously

- GIVEN filters `{category, search, sort}` are active
- WHEN all three change at once (e.g., preset selection)
- THEN pagination resets once (not per filter)
- AND the fetcher is called with all new filter values at offset=0
