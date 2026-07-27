# Slice 6 — DataTable Scroll

## Purpose

Ensure DataTables scroll horizontally on narrow viewports instead of compressing columns to illegible widths.

## Requirements

### Requirement: Horizontal Scroll Wrapper

The system SHALL ensure `.dt-scroll` provides horizontal scrolling when the table width exceeds the container.

The `.dt-table` SHALL have a `min-width` (e.g., `600px`) to prevent column compression on narrow screens.

Current `.dt-scroll` already has `overflow: auto`. The fix is ensuring the table has a minimum width.

#### Scenario: DataTable on 375px phone

- GIVEN a user on a 375px phone
- WHEN viewing the catalog in list view (DataTable)
- THEN the table SHALL scroll horizontally
- AND column content SHALL NOT be compressed or truncated below legibility

#### Scenario: DataTable on 1280px desktop

- GIVEN a user on a 1280px desktop
- WHEN viewing the catalog in list view
- THEN the table SHALL fit within the container without horizontal scroll
- AND no visual change SHALL occur

### Requirement: Table Minimum Width

The system SHALL set `.dt-table { min-width: 600px; }` to prevent columns from collapsing below a readable size.

#### Scenario: Table preserves column proportions on mobile

- GIVEN a DataTable with 6 columns on a 375px screen
- WHEN the table renders
- THEN each column SHALL maintain its proportional width
- AND horizontal scroll SHALL allow viewing all columns

## Acceptance Criteria

- [ ] `.dt-table` has `min-width: 600px`
- [ ] `.dt-scroll` provides horizontal scroll on narrow viewports
- [ ] Table content is readable at 375px with scroll
- [ ] Desktop layout unchanged
