# UI Design Spec — puntoVenta2 (Catálogo y App Shell)

> **Para un experto en UI/UX:** este documento describe con precisión cómo está
> diseñada actualmente la interfaz de puntoVenta2 (estado al 2026-07-18). Su
> objetivo es servir de base para una mejora profesional de la interfaz. No es
> una propuesta de rediseño: es el inventario exacto del sistema actual.

---

## 1. Stack y tecnología

| Capa | Tecnología |
|------|-----------|
| Framework UI | React 18 + TypeScript |
| Bundler / Dev | Vite 5 (PWA) |
| Router | react-router-dom v6 (BrowserRouter, rutas `/`, `/catalogo`, `/login`, `/registro`) |
| Backend / Datos | Supabase (Postgres + Storage + Auth) vía `@supabase/supabase-js` |
| Estilos | **CSS plano con design tokens en `:root`** (NO Tailwind, NO CSS-in-JS, NO librería de componentes) |
| Fuentes | System font stack (`system-ui`) + monospace stack para códigos/SKU |
| Estado de auth | Context API propio (`AuthProvider` / `useAuth`) |
| Iconos | Glyphs Unicode (▦ ▤ → ⌘), NO librería de iconos |
| Tema | Dark-first (no hay light mode implementado) |

**Archivos clave de UI:**
- `web/src/index.css` — todos los tokens y estilos (212 líneas).
- `web/src/components/Layout.tsx` — app shell (sidebar + topbar + command palette).
- `web/src/components/CommandPalette.tsx` — paleta de comandos Ctrl+K.
- `web/src/pages/CatalogoPage.tsx` — pantalla de catálogo (grid/lista, scroll infinito).
- `web/src/components/ProductoForm.tsx` — modal de alta/edición de producto.

---

## 2. Sistema de color (tokens en `:root`)

Dark-first, superficies por capas (sin pure black, sin sombras — profundidad por
capa de color, según buenas prácticas de dark mode 2026: Orbix, Linear, Supabase).

| Token | Hex | Rol |
|-------|-----|-----|
| `--bg-base` | `#0f0f0f` | Fondo base de la app y content |
| `--bg-sidebar` | `#161616` | Fondo del sidebar (ligeramente más claro que base) |
| `--bg-content` | `#0f0f0f` | Área de contenido |
| `--surface-1` | `#1a1a1a` | Cards, inputs, paneles |
| `--surface-2` | `#232323` | Superficie elevada (sidebar interno, palette) |
| `--surface-3` | `#2d2d2d` | Máxima elevación (hover, dropdowns) |
| `--text-primary` | `#ededed` | Texto principal |
| `--text-secondary` | `#a1a1aa` | Texto secundario / metadatos |
| `--text-muted` | `#6b6b70` | Texto deshabilitado / hint |
| `--border` | `#2a2a2a` | Borde estándar |
| `--border-strong` | `#3a3a3a` | Borde en hover / foco |
| `--accent` | `#22c55e` | **Verde ferretería** — acción primaria y nav activa (RACIONADO) |
| `--accent-hover` | `#16a34a` | Hover del acento |
| `--accent-soft` | `rgba(34,197,94,0.12)` | Fondo de acento (nav activa, focus ring) |
| `--ok` | `#22c55e` | Semántico: éxito / activo |
| `--warn` | `#f59e0b` | Semántico: sin precio / stock mínimo |
| `--off` | `#ef4444` | Semántico: inactivo / error |

**Regla de acento:** se usa SOLO en botón primario (`.primary`), nav activa
(`.side-link.active`, `.catalogo-sidebar li button.active`) y focus ring del
buscador. El resto de la interfaz es acromática (grises).

**Semántica de color (status, no decoración):**
- Verde = producto activo / OK.
- Ámbar = "sin precio" o stock en mínimo.
- Rojo = producto inactivo (ribbon en card, badge en tabla).

---

## 3. Tipografía

| Token | Valor | Uso |
|-------|-------|-----|
| `--font` | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | Todo el texto UI |
| `--mono` | `ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace` | SKU, código de barras, atajos `<kbd>` |

**Jerarquía por peso/tamaño (no por color):**
- Título de sección / modal: `1.1rem`–`1.25rem`, peso 700.
- Nombre de producto (card): `0.92rem`, peso 600.
- Cuerpo / metadatos: `0.78rem`–`0.9rem`, `--text-secondary`.
- SKU / código: `0.7rem` mono, `--text-muted`.
- Cabeceras de tabla: `0.78rem` uppercase, letter-spacing `0.03em`, `--text-muted`.
- Precio: `1.05rem` peso 700.

No hay escala tipográfica formal (no hay `--text-xs/--text-lg`). Los tamaños
están hardcodeados por componente.

---

## 4. Espaciado y radios

- **Base de espaciado:** no hay escala de 4px/8px definida como tokens. Se usan
  valores sueltos (`0.5rem`, `0.75rem`, `1rem`, `1.25rem`).
- **Radios:**
  - `--radius: 10px` — cards, modal, sidebar panels.
  - `--radius-sm: 7px` — botones, inputs, links de nav.
  - Badges/pills: `999px` (fully rounded).
- **Gap de grid de cards:** `0.85rem`.
- **Padding de content:** `1.25rem`.
- **Padding de card-info:** `0.6rem 0.7rem`.
- **Contenedor sidebar:** `240px` fijo; **sidebar de filtros de catálogo:** `220px`.

---

## 5. App shell (Layout)

Grid de dos columnas: `grid-template-columns: 240px 1fr`.

### 5.1 Sidebar (`.sidebar`)
- Ancho fijo `240px`, fondo `--bg-sidebar` (`#161616`), borde derecho `1px`.
- `position: sticky; top: 0; height: 100vh` — ocupa toda la altura, no scrollea.
- **Brand:** mark cuadrado `30px` verde con inicial "F" + nombre de empresa
  (`FerrehogarMart`, viene de `obtenerMiEmpresa()`).
- **Nav** (`.side-nav`): links Venta (`/`) y Catálogo (`/catalogo`) con icono
  glyph + label. Activo = fondo `--accent-soft` + texto verde.
- **Botón de comando** (`.side-cmd`): abre la palette, muestra `⌘ Buscar… Ctrl K`.
- **Footer** (`.side-footer`): botón "Salir" (logout → `/login`).

### 5.2 Topbar (`.topbar`)
- `sticky; top: 0; z-index: 20`, borde inferior `1px`.
- Buscador global (`.topbar-cmd`) que abre la palette (`Ctrl K`), max-width `420px`.
- Email del usuario a la derecha (`--text-muted`).

### 5.3 Command palette (`.palette`)
- Atajo **Ctrl/Cmd+K** (global, en `Layout.tsx`).
- Backdrop `rgba(0,0,0,0.55)`, se abre a `12vh` del top.
- Input + lista: navegación (Ir a Venta / Catálogo) cuando está vacío; búsqueda
  de productos (debounce 200ms, `listarProductos`, pageSize 8) al escribir.
- Resultados: icono + nombre + SKU en mono a la derecha.

---

## 6. Pantalla de Catálogo (`CatalogoPage`)

Layout interno: `grid-template-columns: 220px 1fr` (sidebar de categorías + main).

### 6.1 Toolbar (`.catalogo-toolbar`)
- `sticky; top: 60px` (debajo del topbar), fondo `--bg-base`.
- Buscador (`.buscador`) flexible, focus ring verde.
- Checkbox "Solo activos".
- Toggle grid/lista (`.toggle-vista`): dos botones glyph, activo = fondo verde.
- Botón primario "+ Nuevo producto" (`margin-left: auto`).

### 6.2 Buscador (comportamiento, `lib/productos.ts`)
- **Progresivo por palabra:** divide el término en tokens; por cada token arma
  condiciones OR que prueban PREFIJO de palabra primero (`nombre.ilike.token%`,
  `sku.ilike.token%`, `codigo_barras.ilike.token%`) y luego substring (`%token%`).
- Ejemplo: "tran" → primera coincidencia donde el nombre/código EMPIEZA con "tran".
- Búsqueda server-side (Supabase `.or(...)`), no client-side.

### 6.3 Vista Grid (`.productos-grid`)
- `grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))`, gap `0.85rem`.
- **Card (`.card-producto`):** surface-1, borde `1px`, radius 10px, flex column.
  - Hover: borde más claro + `translateY(-2px)`.
  - Inactivo: `opacity: 0.55`.
  - `.card-img`: aspect-ratio `1/1`, borde inferior; img `object-fit: cover`;
    ribbon "inactivo" (rojo) arriba-izquierda si está inactivo.
  - `.card-info`: SKU (mono muted) → nombre (600) → categoría (secondary) →
    precio (700) → stock (secondary, badge "mín" ámbar si `stock ≤ mínimo`).
  - `.card-actions`: Editar / Desactivar-Reactivar, fondo surface-2.
- **Scroll infinito:** `IntersectionObserver` sobre `.sentinela`; `range()` de
  Supabase, `PAGE_SIZE = 50`. `hasMore` controla si carga más.

### 6.4 Vista Lista (`.tabla`)
- Tabla estándar, `border-collapse`, bordes `--border` por fila.
- Columnas: SKU (mono) | imagen thumb 40px | nombre | categoría | precio (right,
  badge "sin precio" ámbar si `precio_usd = 0`) | stock (right, badge "mín") |
  estado (badge semántico) | acciones.
- Cabeceras uppercase muted.

### 6.5 Sidebar de categorías (`.catalogo-sidebar`)
- `sticky; top: 110px`, surface-1, radius 10px.
- Lista de botones: "Todas" + categorías; activo = fondo verde suave + texto verde.
- `<details>` para crear nueva categoría inline.

### 6.6 Badges (`.badge`)
- Fully rounded, `0.7rem`, peso 600.
- `.ok` verde, `.off` rojo, `.warn` ámbar (fondos con alpha 0.12–0.15).

---

## 7. Modal de producto (`ProductoForm`)

- Backdrop `rgba(0,0,0,0.6)`, modal centrado `min(640px, 100%)`, max-height `90vh`.
- Form grid 2 columnas (`1fr 1fr`), labels `span-2` cuando ocupan todo.
- Campos: nombre*, SKU, código de barras, categoría (select), unidad, costo USD,
  precio USD*, stock actual, stock mínimo, URL imagen, subir archivo, activo.
- Validaciones: nombre obligatorio; SKU y código únicos por empresa (cliente +
  índice único parcial en BD `patch_06`); upload de imagen separado del guardado
  (si falla, el producto queda guardado y avisa).
- Cierre con Escape.

---

## 8. Estado actual vs. referencias de la industria

La dirección actual se alinea con los líderes (Square, Lightspeed, Shopify,
Linear, Supabase): dark-first calm, sidebar, un acento racionado, color = status,
command palette (Ctrl+K), cards estilo POS.

**Gaps conocidos que un experto UI debería atacar:**
1. **Sin escala de espaciado ni tipográfica formal** (tokens sueltos hardcodeados).
2. **Sin light mode** (toggle opcional; hoy dark-only).
3. **Sidebar no colapsable** en pantallas chicas; **sin breakpoint responsive**
   (el grid de 240px + 220px se rompe en móvil/tablet).
4. **Sin micro-interacciones / estados de carga por fila** (al desactivar se
   actualiza la fila localmente, pero no hay skeleton/shimmer).
5. **Sin empty states** ni estados de error de red elaborados.
6. **Iconos glyph** (▦ ▤) en lugar de librería de iconos (lucide/heroicons).
7. **Sin focus-visible global** ni contraste auditado WCAG (aunque los grises
   actuales sugieren >4.5:1 en texto primario).
8. **Edición masiva** de productos aún no existe (pendiente de definir).

---

## 9. Cómo levantar y ver la UI

```powershell
cd C:\Proyectos\puntoVenta2\web
npm install
npm run dev   # http://localhost:5173/catalogo
```

Variables en `web/.env`: `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`
(no se commitea). Para cambios de Storage/SQL, ver `supabase/patch_05` y
`supabase/patch_06` en el Dashboard SQL Editor.

---

*Este spec es la fuente de verdad del diseño actual. Cualquier mejora (light mode,
responsive, design tokens formales, librería de iconos) debe partir de aquí y
actualizar este archivo.*
