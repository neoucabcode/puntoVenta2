# Design: Configuración de Empresa

## Technical Approach

Single-page admin settings at `/configuracion` with 3 tabbed sections (SKU, Empresa, Módulos). Reuses existing `useEmpresaConfig`, `useUsuarioRol`, and `useModulos` hooks. New `actualizarMiEmpresa()` function follows the existing `actualizarConfigSku()` pattern (partial update, mock fallback). Admin-only access enforced at page level via `useUsuarioRol().esAdmin`. No schema changes; purely UI + one new lib function.

## Architecture Decisions

| Decision | Option | Tradeoff | Decision |
|----------|--------|----------|----------|
| Tab UI | CSS tabs (no router) vs nested routes | Router = shareable URLs but heavier; CSS tabs = simpler, all state local | **CSS tabs** — settings page is atomic, no deep-linking needed |
| Empresa update function | `actualizarMiEmpresa()` in `lib/empresa.ts` | Centralized vs inline in page | **`lib/empresa.ts`** — follows existing pattern, reusable |
| Confirmation modal | Reuse `ConfirmarEliminarModal` pattern vs new generic `ConfirmModal` | Copy-paste vs abstraction | **New generic `ConfirmModal`** — module toggle needs simple yes/no, not name-typing |
| Admin gate | Page-level redirect vs route wrapper | Wrapper reusable but adds boilerplate | **Page-level redirect** — single use case, matches `RequireModulo` pattern |
| State management | `useState` per tab vs single form state | Granular save vs global save | **`useState` per tab** — each section saves independently, matches proposal |

## Data Flow

    TopbarUnificada ──→ /configuracion (RequireAuth + admin check)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
          TabSKU          TabEmpresa       TabModulos
              │               │               │
    useEmpresaConfig    useState(local)   useModulos
              │               │               │
    actualizarConfigSku  actualizarMiEmpresa toggleModulo
              │               │               │
              └───── Supabase ────────────────┘

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `web/src/pages/ConfiguracionPage.tsx` | Create | Main page with 3 tabs: SKU, Empresa, Módulos |
| `web/src/pages/ConfiguracionPage.test.tsx` | Create | Page-level tests (admin gate, tab rendering, save flows) |
| `web/src/components/ConfirmModal.tsx` | Create | Generic confirmation modal (replaces native `confirm()`) |
| `web/src/lib/empresa.ts` | Modify | Add `actualizarMiEmpresa()` partial update function |
| `web/src/components/TopbarUnificada.tsx` | Modify | Add admin-only "Configuración" item to avatar dropdown |
| `web/src/main.tsx` | Modify | Add `/configuracion` route with `RequireAuth` |
| `web/src/lib/mock-data.ts` | Modify | Add `actualizarEmpresaMock()` for offline fallback |
| `web/src/index.css` | Modify | Add `config-*` namespace styles (tabs, form layout) |

## Interfaces / Contracts

```typescript
// New function in lib/empresa.ts
export async function actualizarMiEmpresa(
  updates: Partial<Pick<Empresa, 'tasa_activa' | 'igtf_habilitado' | 'venta_sin_stock' | 'stock_negativo'>>
): Promise<void>

// ConfirmModal props (new component)
type ConfirmModalProps = {
  titulo: string
  mensaje: string
  textoConfirmar?: string  // default: "Confirmar"
  onConfirm: () => void
  onCancel: () => void
  variante?: 'peligro' | 'advertencia'  // controls button color
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `actualizarMiEmpresa()` partial update logic | Mock Supabase, verify `.update()` call with correct fields |
| Unit | `ConfirmModal` renders and fires callbacks | `renderToStaticMarkup` + assert button text and click handler |
| Integration | `ConfiguracionPage` admin gate | Render with/without admin role; verify redirect vs page render |
| Integration | Tab switching and form state | Render page, switch tabs, verify correct forms display |
| Integration | SKU save flow | Mock `actualizarConfigSku`, submit form, verify called |
| Integration | Empresa save flow | Mock `actualizarMiEmpresa`, submit form, verify called |
| Integration | Module toggle with confirmation | Toggle module off, verify modal appears, confirm, verify `toggleModulo` called |

## Threat Matrix

N/A — no routing changes beyond adding a new route (no dynamic params, no shell, no subprocess, no VCS/PR automation, no executable-file classification, no process-integration boundary).

## Migration / Rollout

No migration required. All changes are UI + lib function layer. Backend tables and RLS policies already exist. Feature is gated by admin role — no feature flag needed.

## Open Questions

- [ ] Exchange rate input: manual text input or "fetch from BCV" button? (proposal question #1)
- [ ] Module toggle safety: should UI warn when disabling module with active data? (proposal question #2)
- [ ] Per-tab save vs global save button? (proposal question #3 — design assumes per-tab based on proposal approach)
- [ ] SKU config empty state for new empresas? (proposal question #4)
