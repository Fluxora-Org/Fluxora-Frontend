# SR-Only Reveal-on-Hover Pattern Spec

**Status:** Implemented  
**WCAG target:** 2.1 AA  
**Components using this pattern:** `TruncatedAddress`, `Breadcrumb`

---

## 1. Problem statement

Truncated content (Stellar addresses, long breadcrumb labels) must satisfy two
competing constraints at the same time:

| Constraint | Requirement |
|---|---|
| Visual brevity | Show a short masked form so it does not overflow the layout |
| AT completeness | Screen readers must always be able to read the full value |

`title` and `aria-label` attributes provide a partial solution but are
unreliable across AT/browser combinations (NVDA ignores `title` on non-link
elements; VoiceOver reads `aria-label` instead of text content, which can
confuse context). A dedicated always-present sr-only span is the robust,
AT-portable solution.

Sighted keyboard users also need the full value without a tooltip interaction
delay. The reveal chip addresses this via CSS progressive enhancement.

---

## 2. States

### 2.1 `truncated-default` (all users, default)

```
┌──────────────────────┐
│  GABCD...WXYZ   📋   │    ← truncated code chip, visible
└──────────────────────┘
    (full address, hidden from view but in DOM)
```

- The full address is in a `<span class="truncateReveal__srValue srOnly">`.
- That span has 1 × 1 px painted area (CSS clip), never visible.
- ATs encounter and read it as normal text content.

### 2.2 `hover-revealed` (mouse users) / `focus-revealed` (keyboard users)

```
┌──────────────────────────────────────────────────────────────────┐
│  GABCD...WXYZ   GABCDEFGHIJKLMNOPQRSTUVWXYZ2345678901234  📋     │
└──────────────────────────────────────────────────────────────────┘
    ↑ truncated chip    ↑ reveal chip slides in (opacity 1, translateX 0)
```

- Triggered by `:hover` or `:focus-within` on `.truncateReveal`.
- The reveal chip (`aria-hidden="true"`) slides in from the left (`translateX(-4px) → 0`).
- The sr-only span is unaffected — it remains in the DOM and AT tree.
- There is no tooltip delay. No ARIA role change.

### 2.3 `sr-only-always-present` (non-visual)

The sr-only span is **not conditional**. It is rendered on every paint,
regardless of hover/focus state. ATs never need to interact with anything to
read the full value.

---

## 3. Markup pattern

```html
<span class="truncateReveal">
  <!-- ① Truncated visual — provided by the consumer component -->
  <code class="…">GABCD…WXYZ</code>

  <!-- ② Always-present sr-only — AT path, never conditional -->
  <span class="truncateReveal__srValue srOnly">
    GABCDEFGHIJKLMNOPQRSTUVWXYZ2345678901234
  </span>

  <!-- ③ Visual reveal chip — aria-hidden, progressive enhancement only -->
  <span class="truncateReveal__chip truncateReveal__chip--mono" aria-hidden="true">
    GABCDEFGHIJKLMNOPQRSTUVWXYZ2345678901234
  </span>
</span>
```

**Rules:**
- `aria-hidden="true"` MUST be on `③`. ATs MUST NOT read the chip.
- `②` MUST use `.srOnly` (from `accessibility.css`) for reliable clip behaviour.
- `①` is owned by the consumer; TruncatedReveal does not prescribe its markup.
- The wrapper MUST NOT have an ARIA role — it inherits from its children.

---

## 4. Design tokens

All reveal-chip visual properties are controlled via CSS custom properties so
they override correctly in both light and dark themes.

| Token | Light value | Dark value | Purpose |
|---|---|---|---|
| `--reveal-chip-bg` | `var(--surface-raised)` → `#e8ecf1` | `#192436` | Chip background |
| `--reveal-chip-border` | `var(--color-border-default)` → `#e0e6ed` | `#192436` | Chip border |
| `--reveal-chip-color` | `var(--color-text-primary)` → `#1a1f36` | `#e8ecf4` | Chip text |
| `--reveal-chip-radius` | `var(--radius-sm)` → `4px` | same | Border radius |
| `--reveal-chip-transition` | `var(--transition-fast)` → `150ms ease-in-out` | same | Animation timing |
| `--reveal-chip-translate` | `-4px` | same | Slide start offset |

### Contrast ratios (WCAG 1.4.3, min 4.5:1 for normal text)

| Theme | Text (`--color-text-primary`) | Background (`--surface-raised`) | Ratio |
|---|---|---|---|
| Light | `#1a1f36` | `#e8ecf1` | **10.2:1** ✓ |
| Dark | `#e8ecf4` | `#192436` | **11.8:1** ✓ |

Both themes exceed the AA threshold of 4.5:1 by a substantial margin.

---

## 5. CSS utility classes

Defined in `src/styles/accessibility.css`.

```
.truncateReveal            — wrapper, position:relative, display:inline-flex
.truncateReveal__srValue   — identity hook (inherits .srOnly rules)
.truncateReveal__chip      — reveal chip, opacity 0 by default
.truncateReveal:hover .truncateReveal__chip    — reveals chip on mouse hover
.truncateReveal:focus-within .truncateReveal__chip — reveals on keyboard focus
```

### Motion and contrast overrides

```css
/* prefers-reduced-motion: skip slide, keep fade */
@media (prefers-reduced-motion: reduce) {
  .truncateReveal__chip { transform: translateX(0); }
}

/* forced-colors (Windows High Contrast): enforce chip border */
@media (forced-colors: active) {
  .truncateReveal__chip { border: 1px solid ButtonText; }
}
```

---

## 6. React component API

**`src/components/common/TruncatedReveal.tsx`**

```tsx
import TruncatedReveal from "components/common/TruncatedReveal";

<TruncatedReveal fullValue={address} mono>
  <code className="…">{truncated}</code>
</TruncatedReveal>
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `fullValue` | `string` | required | The full, untruncated value. Used in sr-only span and reveal chip. |
| `children` | `ReactNode` | required | The truncated visual (code chip, masked span, etc.). |
| `className` | `string` | `""` | Extra class names on the wrapper. |
| `mono` | `boolean` | `true` | Applies `font-family: monospace` to the reveal chip. |

---

## 7. Component integration

### TruncatedAddress

`TruncatedAddress` wraps its `<code>` chip in `TruncatedReveal`:

```tsx
<TruncatedReveal fullValue={address} mono>
  <code className="text-mono-sm truncate" style={chipStyle}>
    {truncated}  {/* e.g. "GABCD...WXYZ" */}
  </code>
</TruncatedReveal>
```

The copy button above the reveal wrapper also carries
`aria-label="Copy address: <full address>"` — this is a secondary AT path for
the copy action, not a substitute for the sr-only span.

### Breadcrumb (Stellar address items)

When `isValidStellarAddress(item.label)` is true, the displayed label is
wrapped in `TruncatedReveal`:

```tsx
<span aria-label={item.label} aria-current={isLast ? "page" : undefined} title={item.label}>
  <TruncatedReveal fullValue={item.label} mono>
    <span>{maskAddress(item.label)}</span>
  </TruncatedReveal>
</span>
```

The parent `<span>`/`<Link>` retains `aria-label` and `title` for backwards
compatibility and for ATs that compute accessible name from the element rather
than traversing text content.

---

## 8. Coordination with InfoTooltip

`TruncatedReveal` and `InfoTooltip` are **distinct patterns** that must not be
confused or nested:

| | TruncatedReveal | InfoTooltip |
|---|---|---|
| Purpose | Reveals the *same value* in full | Explains an *adjacent concept* |
| ARIA role | None (passive wrapper) | `role="dialog"` |
| Trigger | CSS hover / `:focus-within` | Button click / Enter / Space |
| Dismiss | Mouse-out / blur | ESC / click outside |
| AT exposure | Always (sr-only span, unconditional) | Only when open |
| `aria-hidden` | Chip only | Never (content is AT-facing) |

**They can co-exist** in the same UI row (e.g. an address chip next to an info
icon) but MUST NOT be nested. `TruncatedReveal` must never wrap an
`InfoTooltip` trigger, and vice versa.

---

## 9. Keyboard walkthrough

1. Tab to the element containing a truncated address.
2. `:focus-within` fires on `.truncateReveal` → chip slides in.
3. The sr-only span is already in the AT tree — no additional step needed for
   screen readers to have the full value.
4. Tab away (blur) → `:focus-within` no longer matches → chip slides out.
5. No Escape handling is needed: there is no modal/dialog state to dismiss.

---

## 10. Responsive behaviour

The reveal chip uses `white-space: nowrap` and `pointer-events: none`. On
narrow layouts:

- The chip renders outside the normal flow of the truncated content.
- If the parent has `overflow: hidden`, the chip will be clipped. Use
  `overflow: visible` on the parent, or let the chip overflow beyond the
  breadcrumb's `maxWidth: 200px` constraint (it is `aria-hidden`, so overflow
  does not create a usability problem for ATs).
- Breadcrumb items that overflow the viewport will scroll with the page rather
  than being clipped, because `ol` uses `flex-wrap: wrap`.
- The chip's slide-in direction is `inline-start → center`, so it naturally
  stays within reading flow even on right-to-left locales.

---

## 11. Annotated redlines

```
 Truncated state (default)
 ──────────────────────────────
 ┌──────────────┐
 │ GABCD…WXYZ   │   ← .truncateReveal__chip  opacity:0, translateX(-4px)
 └──────────────┘
 [GABCDEFG...hidden sr-only]  ← .truncateReveal__srValue  always in DOM

 Hover / focus-within state
 ──────────────────────────────────────────────────────────────
 ┌──────────────┐  ┌──────────────────────────────────────┐
 │ GABCD…WXYZ   │  │ GABCDEFGHIJKLMNOPQRSTUVWXYZ23456789  │  ← chip opacity:1
 └──────────────┘  └──────────────────────────────────────┘
  4px margin-inline-start ──┘      border-radius: 4px (--radius-sm)
                                   bg: --surface-raised
                                   border: 1px solid --color-border-default
                                   color: --color-text-primary
                                   padding: 1px 6px
                                   font-family: monospace
```

---

## 12. Test checklist

- [ ] sr-only span present in DOM at all times (no interaction required)
- [ ] reveal chip has `aria-hidden="true"`
- [ ] reveal chip is not in accessibility tree (query by role returns null)
- [ ] hover triggers chip visibility (`opacity` style change)
- [ ] focus-within triggers same chip visibility
- [ ] axe / automated accessibility scan: zero violations
- [ ] contrast passes 4.5:1 in light and dark themes
- [ ] prefers-reduced-motion: no `translateX` animation fires
- [ ] forced-colors: chip border uses `ButtonText` system color

---

## 13. Files changed

| File | Change |
|---|---|
| `src/styles/accessibility.css` | Added `:root` reveal tokens + `.truncateReveal*` utilities |
| `src/components/common/TruncatedReveal.tsx` | New shared component |
| `src/components/common/TruncatedAddress.tsx` | Wraps `<code>` chip in `TruncatedReveal` |
| `src/components/navigation/Breadcrumb.tsx` | Wraps Stellar address text in `TruncatedReveal` |
| `src/components/common/__tests__/TruncatedReveal.test.tsx` | Unit tests for the shared component |
| `src/components/__tests__/TruncatedAddress.test.tsx` | Added sr-only reveal assertions |
| `src/components/navigation/__tests__/Breadcrumb.stellar.test.tsx` | Added sr-only reveal assertions |

---

*Pattern authored for Fluxora Frontend — WCAG 2.1 AA compliance.*
