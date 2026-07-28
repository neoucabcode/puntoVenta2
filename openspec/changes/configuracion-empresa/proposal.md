# Proposal: Configuración de Empresa

## Intent

Admin-only settings page (`/configuracion`) to expose existing backend configuration that currently lacks UI. Covers SKU config, company-wide settings (exchange rate, tax, stock rules), and module toggles. Eliminates the need for direct DB or Supabase dashboard changes.

## Scope

### In Scope
- `ConfiguracionPage.tsx` with 3 tabbed sections: SKU, Empresa, Módulos
- `actualizarMiEmpresa()` function in `lib/empresa.ts` (currently missing)
- Avatar dropdown nav item (admin-only) in `TopbarUnificada.tsx`
- Route `/configuracion` with `RequireAuth` + admin role check
- Test file `ConfiguracionPage.test.tsx`

### Out of Scope
- Advanced SKU template editor or live preview
- Audit log for settings changes
- Permission granularity beyond admin/non-admin
- i18n beyond Spanish (neutral/professional)

## Capabilities

### New Capabilities
- `empresa-settings-ui`: Admin settings page covering SKU config, empresa settings (rate/tax/stock), and module toggles with form-based UI

### Modified Capabilities
- None (no existing specs in `openspec/specs/`)

## Approach

- Single page component with 3 tabbed sections using existing form patterns (toggles, selects, inputs)
- Reuse `useEmpresaConfig()` hook for SKU state; add local `useState` for empresa settings and modules
- Admin gate via `obtenerMiRol()` returning `'admin'`
- `actualizarMiEmpresa()` follows `actualizarConfigSku()` pattern: partial update, Supabase + mock fallback
- No native `confirm()` — use existing modal patterns or inline validation
- Route: `RequireAuth` → admin check → `ConfiguracionPage`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `web/src/pages/ConfiguracionPage.tsx` | New | Main settings page |
| `web/src/pages/ConfiguracionPage.test.tsx` | New | Page tests |
| `web/src/lib/empresa.ts` | Modified | Add `actualizarMiEmpresa()` |
| `web/src/components/TopbarUnificada.tsx` | Modified | Admin-only config nav in avatar dropdown |
| `web/src/main.tsx` | Modified | Add `/configuracion` route |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Admin role check bypass if `obtenerMiRol()` returns null | Low | Gate on page load; redirect non-admin |
| Optimistic UI update on empresa settings without rollback | Med | Save before update; revert on error |
| Module toggle disables active feature mid-session | Low | Show confirmation modal (no native `confirm()`) |

## Rollback Plan

1. Remove `/configuracion` route from `main.tsx`
2. Remove nav item from `TopbarUnificada.tsx` avatar dropdown
3. Delete `ConfiguracionPage.tsx` and test file
4. Revert `actualizarMiEmpresa()` addition in `lib/empresa.ts`
5. No data migration — all changes are UI/function layer only

## Dependencies

- Backend functions already exist: `obtenerConfigSku`, `actualizarConfigSku`, `obtenerModulosHabilitados`, `toggleModulo`, `obtenerMiEmpresa`
- Only missing: `actualizarMiEmpresa()` (must be created)
- No schema changes required

## Success Criteria

- [ ] Admin can access `/configuracion`, non-admin is redirected
- [ ] SKU settings save correctly via `actualizarConfigSku()`
- [ ] Empresa settings save correctly via new `actualizarMiEmpresa()`
- [ ] Module toggles save correctly via `toggleModulo()`
- [ ] All changes persist across page reload
- [ ] Tests pass: `cd web && npx vitest run`

## Proposal Question Round

Before finalizing, review these product questions:

1. **Exchange rate (`tasa_activa`)**: Should the admin enter it manually (text input), or should there be a "fetch from BCV" button? If manual, what validation (positive number, max decimals)?

2. **Module toggle safety**: When disabling a module that has active data (e.g., `venta` with open caja session), should the UI warn or block? Currently `toggleModulo()` has no guard.

3. **Settings save pattern**: Should each section save independently (save button per tab), or one global "Guardar" button for the entire page?

4. **Empty state**: If the SKU config row doesn't exist yet (new empresa), should the page show a "Crear configuración" action or auto-create defaults?

5. **IGTF/stock toggles**: These are operational policy changes. Should saving them show a warning about impact (e.g., "Desactivar IGTF eliminará el impuesto de transacciones bancarias")?
