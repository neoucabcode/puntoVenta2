# Slice 9 — useMediaQuery Hook

## Purpose

Create a reusable React hook for viewport-based conditional rendering. Returns boolean values for common breakpoints (mobile, tablet, desktop).

## Requirements

### Requirement: Hook API

The system SHALL export a `useMediaQuery` hook from `web/src/hooks/useMediaQuery.ts`.

The hook SHALL accept a CSS media query string and return a boolean.

```typescript
function useMediaQuery(query: string): boolean
```

#### Scenario: Hook returns true when query matches

- GIVEN the viewport is 375px wide
- WHEN calling `useMediaQuery('(max-width: 767px)')`
- THEN the hook SHALL return `true`

#### Scenario: Hook returns false when query doesn't match

- GIVEN the viewport is 1280px wide
- WHEN calling `useMediaQuery('(max-width: 767px)')`
- THEN the hook SHALL return `false`

#### Scenario: Hook updates on resize

- GIVEN the viewport is 375px and `useMediaQuery('(min-width: 768px)')` returns `false`
- WHEN the viewport is resized to 800px
- THEN the hook SHALL re-render and return `true`

### Requirement: Preset Breakpoint Helpers

The system SHALL export convenience constants for common breakpoints.

| Constant | Query | Meaning |
|----------|-------|---------|
| `IS_MOBILE` | `(max-width: 767px)` | Phone viewport |
| `IS_TABLET` | `(min-width: 768px) and (max-width: 1023px)` | Tablet viewport |
| `IS_DESKTOP` | `(min-width: 1024px)` | Desktop viewport |

#### Scenario: IS_MOBILE matches phone

- GIVEN a 375px viewport
- WHEN importing `IS_MOBILE` and using with `useMediaQuery`
- THEN it SHALL return `true`

#### Scenario: IS_TABLET matches tablet

- GIVEN a 768px viewport
- WHEN importing `IS_TABLET` and using with `useMediaQuery`
- THEN it SHALL return `true`

### Requirement: SSR Safety

The hook SHALL handle server-side rendering (or initial render before `window` is available) by returning `false` as the default.

#### Scenario: Initial render before measurement

- GIVEN the app is rendering for the first time (SSR or hydration)
- WHEN `useMediaQuery` is called
- THEN it SHALL return `false` until the `matchMedia` result is available

### Requirement: Event Listener Cleanup

The hook SHALL subscribe to `matchMedia` change events and unsubscribe on unmount.

#### Scenario: No memory leaks on unmount

- GIVEN a component using `useMediaQuery`
- WHEN the component unmounts
- THEN no event listener SHALL remain attached to `matchMedia`

## Acceptance Criteria

- [ ] `useMediaQuery(query: string): boolean` exported
- [ ] `IS_MOBILE`, `IS_TABLET`, `IS_DESKTOP` constants exported
- [ ] Returns `false` during SSR/initial render
- [ ] Updates on viewport resize
- [ ] Cleans up event listener on unmount
- [ ] TypeScript types exported
- [ ] File at `web/src/hooks/useMediaQuery.ts`
