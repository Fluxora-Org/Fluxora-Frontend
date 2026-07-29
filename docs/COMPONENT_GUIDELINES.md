# Component Guidelines

This document is the canonical reference for the four core UI components used throughout
Fluxora's dashboard and recipient portal. Use it to understand each component's API,
accessibility contract, and design-token integration before contributing.

For a **live visual reference** of every variant and state, open the ComponentGallery dev
route at `/app/component-gallery` (available in development builds only — guarded by
`IS_DEV` exactly like `/app/empty-state-demo`).

---

## Table of Contents

1. [Button](#button)
2. [Input](#input)
3. [StatusPill](#statuspill)
4. [MetricCard](#metriccard)
5. [Design tokens quick reference](#design-tokens-quick-reference)
6. [Accessibility standards](#accessibility-standards)
7. [ComponentGallery dev route](#componentgallery-dev-route)
8. [Adding a new component to the gallery](#adding-a-new-component-to-the-gallery)

---

## Button

**Source:** `src/components/Button.tsx`  
**Styles:** `src/components/Button.module.css`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'success' \| 'ghost'` | `'primary'` | Visual style |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Touch target and font size |
| `disabled` | `boolean` | `false` | Non-interactive and visually muted |
| `loading` | `boolean` | `false` | Shows spinner, sets `aria-busy="true"`, blocks clicks |
| `icon` | `ReactNode` | — | Icon element rendered before text |
| `iconOnly` | `boolean` | `false` | Icon with no text; **requires `aria-label`** |
| `iconSize` | `'xs' \| 'sm' \| 'md' \| 'lg'` | `'sm'` | Size class applied to icon wrapper |
| `fullWidth` | `boolean` | `false` | Stretches button to fill container width |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML button type |
| `loadingContent` | `ReactNode` | — | Custom loading text/node (replaces spinner text) |

All standard `ButtonHTMLAttributes` are passed through to the underlying `<button>`.

### Variants

| Variant | Use case |
|---------|----------|
| `primary` | Main call-to-action (create stream, withdraw, confirm) |
| `secondary` | Alternative or lower-priority actions |
| `danger` | Destructive actions (cancel stream, delete) |
| `success` | Positive confirmations |
| `ghost` | Subtle/tertiary actions, toolbar controls |

### Usage examples

```tsx
// Primary CTA
<Button onClick={handleCreate}>Create Stream</Button>

// Secondary with size
<Button variant="secondary" size="sm">Cancel</Button>

// Loading state (blocks interaction)
<Button loading>Creating…</Button>

// Disabled
<Button disabled>Unavailable</Button>

// Icon-only — aria-label is mandatory
<Button iconOnly icon={<PlusCircle size={16} />} aria-label="Add stream" />

// Danger with full width
<Button variant="danger" fullWidth>Cancel all streams</Button>
```

### Accessibility notes

- Focus ring is driven by `:focus-visible` so keyboard users always see it.
- `aria-busy="true"` is set automatically when `loading` is `true`.
- `aria-disabled="true"` is set when `disabled` or `loading`.
- `iconOnly` buttons **must** have an `aria-label` — the linter will warn if omitted.
- Minimum touch target: 44 × 44 px at `size="lg"`, 40 × 40 px at `size="md"`.

---

## Input

**Source:** `src/components/Input.tsx`  
**Styles:** `src/components/Input.module.css`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Visible label; wired via `htmlFor`/`id` |
| `type` | `string` | `'text'` | HTML input type, plus `'textarea'` and `'select'` |
| `error` | `string` | — | Error message shown in red; sets `aria-invalid="true"` |
| `helperText` | `string` | — | Guidance text shown below input (suppressed when error present) |
| `required` | `boolean` | `false` | Adds `*` indicator and `required` attribute |
| `disabled` | `boolean` | `false` | Makes field non-interactive |
| `options` | `Array<{ value: string; label: string }>` | — | Required for `type="select"` |
| `id` | `string` | auto-generated | Overrides generated id for label association |
| `compositionAware` | `boolean` | auto | Defers error styling during CJK input composition |
| `className` | `string` | `''` | Extra CSS class on the inner input/textarea/select element |

Standard `InputHTMLAttributes` (excluding `type`) are forwarded to the input element.

### Input types

| `type` value | Renders | Notes |
|--------------|---------|-------|
| `'text'` | `<input type="text">` | Default |
| `'email'` | `<input type="email">` | Browser email validation |
| `'password'` | `<input type="password">` | Masked characters |
| `'number'` | `<input type="number">` | Numeric keyboard on mobile |
| `'search'` | `<input type="search">` | Search semantics |
| `'textarea'` | `<textarea>` | Multi-line text; also compositionAware by default |
| `'select'` | `<select>` | Requires `options` prop |

### Usage examples

```tsx
// Basic text input
<Input label="Recipient address" type="text" placeholder="G…" required />

// Email with error
<Input
  label="Email"
  type="email"
  error="Enter a valid email address."
  defaultValue="not-valid"
/>

// Textarea with helper text
<Input
  label="Notes"
  type="textarea"
  helperText="Optional. Max 500 characters."
/>

// Select
<Input
  label="Asset"
  type="select"
  options={[
    { value: "usdc", label: "USDC" },
    { value: "xlm", label: "XLM" },
  ]}
/>

// Disabled pre-filled
<Input label="Stream ID" type="text" disabled defaultValue="abc123" />
```

### Accessibility notes

- Label is always associated via `htmlFor`/`id` (auto-generated via `useId` if not provided).
- `aria-invalid="true"` is applied when `error` is set.
- `aria-errormessage` points to the `<ValidationMessage>` element id.
- `aria-describedby` points to the helper text element when present and there is no error.
- Dangling `aria-describedby` references are avoided: helper id is only included when the helper
  element is actually in the DOM.

---

## StatusPill

**Source:** `src/components/treasuryOverviewPage/StatusPill.tsx`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `status` | see below | — | Stream or health status to display |
| `iconSize` | `'xs' \| 'sm' \| 'md' \| 'lg'` | `'xs'` | Controls icon class applied |

#### Status values

| Status | Icon | Token family |
|--------|------|-------------|
| `Active` | Play | success |
| `Paused` | Pause | warning |
| `Completed` | CheckCircle | info |
| `Healthy` | Heart | success |
| `At-Risk` | AlertTriangle | warning |
| `Critical` | XCircle | error |

### Usage examples

```tsx
// Stream list status
<StatusPill status="Active" />

// Health indicator with larger icon
<StatusPill status="At-Risk" iconSize="sm" />
```

### Accessibility notes

- Renders `role="status"` with `aria-label="{label} status"` (e.g. `"Active status"`).
- `tabIndex={0}` — keyboard-focusable for screen-reader inspection.
- Status is conveyed by **icon shape + text + colour** — never colour alone (WCAG 1.4.1).
- An `aria-live="polite"` region announces status transitions without disrupting scroll.
- All six statuses pass WCAG AA contrast under both light and dark themes using
  `--status-*` and `--status-*-bg` tokens.

### Colour-blind safety

StatusPill passes all three simulation modes (protanopia, deuteranopia, tritanopia) because
each status maps to a unique Lucide icon shape that is differentiable without colour.

---

## MetricCard

**Source:** `src/components/treasuryOverviewPage/MetricCard.tsx`

### Core props (Metric interface)

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `icon` | `ReactNode` | ✓ | Icon or emoji in the card header |
| `label` | `string` | ✓ | Metric name — also the `aria-label` of the `role="group"` |
| `value` | `string` | ✓ | Formatted metric value (pass `""` when using `tokens`) |
| `desc` | `string` | ✓ | Secondary description shown at card bottom |
| `trend` | `number[]` | — | ≥ 2 values render a rate-of-change sparkline |
| `tokens` | `Array<{ asset: string; amount: number }>` | — | Multi-token display; overrides `value` |

### Additional props

| Prop | Type | Description |
|------|------|-------------|
| `draggable` | `boolean` | Enables drag-and-drop; shows grip icon |
| `onResize` | `(size) => void` | Enables kebab resize option |
| `onHide` | `() => void` | Enables kebab hide option |
| `currentSize` | `'1x1' \| '2x1'` | Current grid size |
| `moveMenuOptions` | object | Adds keyboard move submenu |
| `reorderButtons` | `ReactNode` | Slot for mobile reorder up/down buttons |

### Usage examples

```tsx
// Basic card
<MetricCard
  icon={<DollarSign size={24} />}
  label="Total Streamed"
  value="12,400 USDC"
  desc="Across all active streams"
/>

// With trend sparkline
<MetricCard
  icon={<TrendingUp size={24} />}
  label="Weekly Flow"
  value="3,200 USDC"
  desc="Up 18% from last week"
  trend={[1200, 1400, 1600, 2100, 3200]}
/>

// Multi-token (value overridden)
<MetricCard
  icon={<Zap size={24} />}
  label="Vault Balance"
  value=""
  desc="Combined balance"
  tokens={[
    { asset: "USDC", amount: 8500 },
    { asset: "XLM", amount: 42000 },
  ]}
/>
```

### Accessibility notes

- The card wrapper uses `role="group"` with `aria-label={label}`.
- Design tokens `data-token-surface` and `data-token-border` anchor automated contrast checks.
- Surface and border use greyscale-neutral tokens — unaffected by colour-blind filters.
- Sparkline `<svg>` has `role="img"` and an `aria-label` describing trend direction.
- Drag handle uses `onMouseDown`/`Up`/`Leave` guards so the element is only draggable while
  the handle is actively held, preventing accidental drag.

---

## Design tokens quick reference

The components above rely exclusively on the design-token CSS custom properties defined in
`src/design-tokens.css`. Commonly used tokens:

| Token | Usage |
|-------|-------|
| `--color-text-primary` | Body text, headings |
| `--color-text-secondary` | Muted labels, helper text |
| `--color-text-vivid` | Metric values, highlighted numbers |
| `--color-surface-default` | Card and surface backgrounds |
| `--color-border-default` | Card borders, dividers |
| `--color-bg-primary` | Page background |
| `--color-accent-primary` | Focus rings, active indicators |
| `--status-success` / `--status-success-bg` | Active, Healthy pills |
| `--status-warning` / `--status-warning-bg` | Paused, At-Risk pills |
| `--status-error` / `--status-error-bg` | Critical pills |
| `--status-info` / `--status-info-bg` | Completed pills |

Tokens resolve to different hex values in light, dark, and cyberpunk themes via the
`data-theme` attribute set on `<html>` by `ThemeProvider`.

---

## Accessibility standards

All components target **WCAG 2.1 Level AA**:

| Criterion | Implementation |
|-----------|---------------|
| 1.3.1 Info & Relationships | Semantic HTML: `<button>`, `<label>`, `role="group"`, `role="status"` |
| 1.4.1 Use of Colour | Status conveyed by icon + text + colour; never colour alone |
| 1.4.3 Contrast (Minimum) | All text/icon tokens verified ≥ 4.5:1 (normal) / 3:1 (large) |
| 2.1.1 Keyboard | All interactive elements reachable and operable via keyboard |
| 2.4.6 Headings & Labels | Visible labels for all inputs; descriptive headings |
| 4.1.2 Name, Role, Value | ARIA attributes on busy/disabled/invalid states |
| 4.1.3 Status Messages | `aria-live` regions announce dynamic changes |

---

## ComponentGallery dev route

The gallery page at `/app/component-gallery` (development builds only) renders the full
variant/state matrix for every component documented here. It is guarded identically to the
existing `EmptyStateDemo`:

```tsx
// src/App.tsx
const ComponentGallery = IS_DEV
  ? lazy(() => import("./pages/dev/ComponentGallery"))
  : () => null;

// Inside the /app nested route (RequireWallet + Layout):
{IS_DEV && (
  <Route
    path="component-gallery"
    element={lazyAppRoute(<ComponentGallery />)}
  />
)}
```

`IS_DEV` is `import.meta.env.DEV`, which Vite sets to `false` in production builds.
The import is lazy so the gallery chunk is excluded entirely from the production bundle.

### Using the gallery

1. Run `npm run dev` (or `pnpm run dev`).
2. Connect a wallet (the route is inside `RequireWallet`).
3. Navigate to `http://localhost:5173/app/component-gallery`.
4. Use the **Gallery theme** fieldset to switch between light, dark, and cyberpunk themes.
5. Inspect variant/state matrices for each component.

---

## Adding a new component to the gallery

1. Import the component at the top of `src/pages/dev/ComponentGallery.tsx`.
2. Add a new `<GallerySection id="gallery-your-component" title="YourComponent">` block.
3. Add `<SubSection>` groups for each prop dimension you want to demonstrate.
4. Wrap each example in `<Cell label="YourComponent — variant, state">`.
5. Add a `<SourceNote path="…" />` line with the canonical source path.
6. Write tests in `src/pages/dev/__tests__/ComponentGallery.test.tsx` — at minimum:
   - Section heading is present.
   - All variants render.
   - No new axe violations introduced.
7. Update this document with the new component's API table and usage examples.
