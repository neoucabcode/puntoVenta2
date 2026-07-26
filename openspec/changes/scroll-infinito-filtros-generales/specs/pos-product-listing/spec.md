# POS Product Listing Specification

## Purpose

PosPage MUST use server-side pagination via infinite scroll instead of loading all products at once. Applies the shared `useInfiniteScroll` hook and sort controls.

## Requirements

### Requirement: Paginated Product Loading

PosPage MUST load products in pages of 50 using the `useInfiniteScroll` hook.

The page MUST NOT use `pageSize: 9999` or any bulk-load approach.

#### Scenario: Initial load shows 50 products

- GIVEN the user opens PosPage
- WHEN the product list renders
- THEN at most 50 products are displayed
- AND a loading indicator is shown while fetching

#### Scenario: Scroll loads next page

- GIVEN the user has scrolled to the bottom of 50 products
- WHEN the sentinel element enters the viewport
- THEN the next 50 products are appended to the list
- AND the total visible products becomes 100

#### Scenario: All products loaded

- GIVEN the total product count is 80
- WHEN the user has scrolled through both pages (50 + 30)
- THEN no further loading occurs
- AND the sentinel is removed from the DOM

### Requirement: Category Filter in POS

PosPage MUST support category filtering that resets pagination.

#### Scenario: Select category

- GIVEN the user is viewing all products in PosPage
- WHEN the user selects category "Pinturas"
- THEN pagination resets to offset=0
- AND only "Pinturas" products are shown (up to 50)
- AND scrolling loads more "Pinturas" products if available

#### Scenario: Clear category filter

- GIVEN a category filter is active
- WHEN the user clears the category selection
- THEN pagination resets to offset=0
- AND all products are shown again

### Requirement: Sort Control in POS

PosPage MUST include the sort dropdown and apply selected sort to product loading.

#### Scenario: Sort by price in POS

- GIVEN the user is on PosPage
- WHEN the user selects "Precio (mayor a menor)" from the sort dropdown
- THEN pagination resets to offset=0
- AND products are re-fetched sorted by price descending

### Requirement: Search in POS

PosPage search input MUST work with paginated results.

#### Scenario: Search narrows paginated results

- GIVEN the user has scrolled to 100 products
- WHEN the user types "clavo" in the search input
- THEN pagination resets to offset=0
- AND only products matching "clavo" are shown
- AND scrolling loads more matches if available

#### Scenario: Clear search restores pagination

- GIVEN search text "clavo" is active
- WHEN the user clears the search input
- THEN pagination resets to offset=0
- AND all products (respecting category filter) are shown

### Requirement: Loading States

PosPage MUST show appropriate loading indicators during pagination.

#### Scenario: Initial load spinner

- GIVEN PosPage has just mounted
- WHEN products are being fetched
- THEN a full-list loading indicator is displayed

#### Scenario: Load-more indicator

- GIVEN 50 products are visible
- WHEN the next page is being fetched
- THEN a small loading indicator appears below the list (not replacing existing items)
- AND existing products remain visible and interactive
