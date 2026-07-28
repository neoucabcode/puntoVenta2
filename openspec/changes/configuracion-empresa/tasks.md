# Tasks: Configuración de Empresa

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 280–360 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Lib + ConfirmModal + Page + Nav + Route | PR 1 | `cd web && npx vitest run` | `cd web && npm run dev` → navigate `/configuracion` | Remove route + page + nav item; revert `empresa.ts` and `mock-data.ts` |

## Phase 1: Foundation (Lib + Mock)

- [x] 1.1 RED: Add test `actualizarMiEmpresa` in `empresa.test.ts` — mock supabase, verify `.update()` with partial fields, verify mock fallback when `!supabase`
- [x] 1.2 GREEN: Add `actualizarMiEmpresa()` to `web/src/lib/empresa.ts` — `Partial<Pick<Empresa, 'tasa_activa' | 'igtf_habilitado' | 'venta_sin_stock' | 'stock_negativo'>>`, follows `actualizarConfigSku` pattern (mock fallback via `actualizarEmpresaMock`)
- [x] 1.3 Add `actualizarEmpresaMock()` to `web/src/lib/mock-data.ts` — updates local mock empresa fields

## Phase 2: ConfirmModal Component

- [x] 2.1 RED: Add test for `ConfirmModal` — renders titulo/mensaje, fires `onConfirm`/`onCancel`, shows variant styles
- [x] 2.2 GREEN: Create `web/src/components/ConfirmModal.tsx` — props: `titulo`, `mensaje`, `textoConfirmar?`, `onConfirm`, `onCancel`, `variante?: 'peligro' | 'advertencia'`; renders modal overlay with two buttons; no native `confirm()`

## Phase 3: ConfiguracionPage

- [x] 3.1 RED: Add admin gate test — render with admin role → page visible; render without → redirected
- [x] 3.2 RED: Add tab rendering test — 3 tabs (SKU, Empresa, Módulos), switching shows correct forms
- [x] 3.3 RED: Add SKU save test — mock `actualizarConfigSku`, submit form, verify called with values
- [x] 3.4 RED: Add empresa save test — mock `actualizarMiEmpresa`, submit form, verify called
- [x] 3.5 RED: Add module toggle test — toggle off → `ConfirmModal` appears → confirm → `toggleModulo` called
- [x] 3.6 GREEN: Create `web/src/pages/ConfiguracionPage.tsx` — 3 CSS tabs, `useEmpresaConfig` for SKU, `useState` for empresa/modules, `useUsuarioRol` for admin gate, per-tab save buttons, inline error/success feedback
- [x] 3.7 Add `config-*` namespace styles to `web/src/index.css` — tabs layout, form groups, save button row

## Phase 4: Integration (Route + Nav)

- [x] 4.1 RED: Add test — non-admin does NOT see "Configuración" in dropdown
- [x] 4.2 GREEN: Modify `web/src/components/TopbarUnificada.tsx` — add admin-only "Configuración" item in avatar dropdown, uses `obtenerMiRol()` or existing role state, links to `/configuracion`
- [x] 4.3 Add `/configuracion` route to `web/src/main.tsx` — `RequireAuth` wrapper, lazy import `ConfiguracionPage`, admin check at page level

## Phase 5: Verify

- [x] 5.1 Run `cd web && npx vitest run` — all 126+ tests pass
- [ ] 5.2 Manual smoke: navigate to `/configuracion` as admin → tabs render, forms load, save works
- [ ] 5.3 Manual smoke: non-admin → redirected away from `/configuracion`
