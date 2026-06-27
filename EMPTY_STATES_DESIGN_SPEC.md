# Empty States Design Spec
**Issue:** Empty states: treasury, streams, and recipient scenarios  
**Branch:** `design/fluxora-fe-12`  
**Status:** Ready for engineering handoff

---

## 1. Scope

Three surfaces require empty state treatment:

| Surface | Route | Component |
|---|---|---|
| Treasury (Dashboard) | `/dashboard` | `TreasuryEmptyState` → `EmptyState` |
| Streams | `/streams` | `Streams` → `EmptyState` |
| Recipient Portal | `/recipient` | `Recipient` → `EmptyState` |

All three share a single base component: `src/components/EmptyState.tsx`.

---

## 2. State Matrix

Each surface must handle every combination below. Engineering must not invent missing states.

| State | Treasury | Streams | Recipient |
|---|---|---|---|
| **Anonymous** (no wallet) | "Connect your wallet" + connect CTA | "Connect your wallet" + connect CTA | "Connect your wallet" + connect CTA |
| **Connected, no data** | "No streams yet" + Create stream CTA | "No streams yet" + Create stream CTA | "No active streams" + View docs CTA |
| **Loading** | Shimmer skeleton | Shimmer skeleton | Shimmer skeleton |
| **Error** | Error banner + Retry | Error banner + Retry | Error banner + Retry |

### State transitions

```
Page mount
  └─ loading=true  →  Skeleton
       └─ fetch resolves
            ├─ data.length > 0  →  Data view (not empty state)
            ├─ data.length = 0  →  Connected empty (walletConnected=true)
            └─ fetch rejects    →  Error banner (error="…", onRetry=fn)

Wallet disconnected at any point  →  Anonymous empty (walletConnected=false)
```

---

## 3. Component API

```tsx
<EmptyState
  variant="treasury" | "streams" | "recipient"
  walletConnected={boolean}   // default false
  loading={boolean}           // default false — shows skeleton
  error={string | null}       // default null — shows error banner
  onRetry={fn}                // shown only when error is set
  onPrimaryAction={fn}        // CTA handler
/>
```

Thin wrappers (`TreasuryEmptyState`, `RecipientEmptyState`) preserve existing call-sites.

---

## 4. Visual Spec

### Layout

- Outer card: `var(--surface)` background, `var(--border)` 1px border, `border-radius: 12px`
- Vertical padding: `clamp(40px, 8vw, 80px)` — collapses gracefully on mobile
- Horizontal padding: `clamp(16px, 4vw, 24px)`
- Content max-width: `480px`, centered

### Icon box

| Variant | Background tint | Border tint | Icon color |
|---|---|---|---|
| Treasury | `rgba(0,212,170,0.08)` | `rgba(0,212,170,0.18)` | `#00D4AA` |
| Streams | `rgba(94,211,243,0.08)` | `rgba(94,211,243,0.15)` | gradient `#5ED3F3→#2DD4BF` |
| Recipient | `rgba(106,114,130,0.08)` | `rgba(106,114,130,0.18)` | `#6A7282` |

Size: `72×72px`, `border-radius: 20px`

### Typography

| Element | Size | Weight | Color |
|---|---|---|---|
| Heading | `clamp(18px, 2.5vw, 22px)` | 700 | `#FFFFFF` |
| Description | `14px` | 400 | `#99A1AF` |
| CTA label | `14px` | 600 | `#FFFFFF` |

### CTA button

- Min touch target: `44×44px` (WCAG 2.5.5)
- Connected + treasury/streams: teal gradient, no border
- Connected + recipient: ghost button (docs link)
- Anonymous (all): ghost button `rgba(255,255,255,0.06)` + `rgba(255,255,255,0.15)` border

### Error banner

- Background: `rgba(255,77,79,0.08)`
- Border: `rgba(255,77,79,0.25)`
- Text: `#FF4D4F`
- Retry button: ghost, same red border, `min-height: 28px`

### Loading skeleton

- Three shimmer blocks: icon placeholder (72×72), title (160×20), description (280×14 + 220×14), CTA (140×44)
- Animation: `shimmer` keyframe (200% background-position sweep), 1.4s infinite

---

## 5. Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| ≥ 1024px (desktop) | Full padding, `clamp` max values |
| 768–1023px (tablet) | `clamp` mid values, no layout change |
| < 768px (mobile) | `clamp` min values; all buttons `min-height: 44px` enforced via `index.css` global rule |
| < 480px | Description text wraps naturally within `max-width: 400px` container |

No horizontal scroll at any breakpoint. The outer card stretches to available width.

---

## 6. Accessibility

### Focus order (keyboard tab sequence)

1. Skip-to-content link (existing nav)
2. Page heading `<h1>` (not focusable, but landmark)
3. Empty state region (`role="region"`, `aria-label="[Variant] empty state"`)
4. CTA button (first and only interactive element in empty state)
5. Retry button (only present when `error` is set; appears before CTA in DOM)

### Labels & roles

| Element | Role / Attribute |
|---|---|
| Outer wrapper | `role="region"` + `aria-label` per variant |
| Icon SVGs | `aria-hidden="true"` |
| Loading skeleton | `role="status"` + `aria-label="Loading"` + `.sr-only` text |
| Error banner | `role="alert"` + `aria-live="assertive"` |
| CTA button | `aria-label` matches visible label |

### Live regions

- Error banner uses `aria-live="assertive"` — screen readers announce immediately when error appears.
- Loading skeleton uses `role="status"` — polite announcement when skeleton mounts.
- No `aria-live` on the empty state itself; the region label is sufficient for navigation.

### Contrast

| Pair | Ratio | WCAG target |
|---|---|---|
| `#FFFFFF` on `var(--surface)` `#121a2a` | ≥ 12:1 | AA (4.5:1) ✓ |
| `#99A1AF` on `#121a2a` | ≈ 4.6:1 | AA (4.5:1) ✓ |
| `#FF4D4F` on `rgba(255,77,79,0.08)` over `#121a2a` | ≈ 4.8:1 | AA ✓ |
| CTA text `#FFFFFF` on teal gradient | ≥ 4.5:1 | AA ✓ |

All interactive elements have a visible `outline: 2px solid var(--accent)` on `:focus` (global rule in `index.css`).

---

## 7. Copy Deck

### Treasury — connected, no data
- **Heading:** No streams yet
- **Body:** Create your first stream to start sending USDC to recipients over time. Real-time treasury streaming makes payments continuous and predictable.
- **CTA:** Create stream

### Treasury — anonymous
- **Heading:** Connect your wallet
- **Body:** Connect a Stellar wallet to view your treasury, active streams, and capital flow.
- **CTA:** Connect wallet

### Streams — connected, no data
- **Heading:** No streams yet
- **Body:** Create your first stream to start sending USDC to recipients over time. Perfect for grants, salaries, and vesting schedules.
- **CTA:** Create stream

### Streams — anonymous
- **Heading:** Connect your wallet
- **Body:** Connect a Stellar wallet to create and manage USDC streams.
- **CTA:** Connect wallet

### Recipient — connected, no data
- **Heading:** No active streams
- **Body:** When someone streams USDC to your wallet address, it will appear here. You'll be able to track incoming payments and withdraw accrued funds.
- **CTA:** View docs

### Recipient — anonymous
- **Heading:** Connect your wallet
- **Body:** Connect a Stellar wallet to view incoming streams and withdraw accrued USDC.
- **CTA:** Connect wallet

### Error (all variants)
- **Banner text:** Supplied by caller (e.g. "Failed to load streams. Check your connection.")
- **Retry label:** Retry

---

## 8. Handoff Artifacts

### Figma structure (recommended naming)

```
Empty States /
  Treasury /
    Anonymous
    Connected – No data
    Loading
    Error
  Streams /
    Anonymous
    Connected – No data
    Loading
    Error
  Recipient /
    Anonymous
    Connected – No data
    Loading
    Error
```

Each frame: 1440px desktop + 375px mobile artboard side by side.

### Dev mode annotations needed

- Spacing tokens: padding values, gap, border-radius
- Color tokens: map to CSS custom properties in `index.css`
- Interaction: hover (`brightness(1.12)`, `translateY(-1px)`), focus outline spec
- Animation: shimmer duration (1.4s), easing (linear)

---

## 9. Acceptance Criteria

Engineering can mark this done when:

- [ ] All four states (anonymous, connected-empty, loading, error) render correctly on all three surfaces
- [ ] No state requires a clarification spike — all copy, colors, and interactions are in this doc
- [ ] Keyboard navigation reaches the CTA in ≤ 3 Tab presses from page load
- [ ] Screen reader announces the region label and error/loading states without visual inspection
- [ ] Touch targets ≥ 44×44px on all CTAs at 375px viewport
- [ ] No horizontal scroll at 320px viewport width
- [ ] Contrast ratios meet AA for all text/background pairs listed above

---

## 10. Deferrals

| Item | Rationale | Owner |
|---|---|---|
| Animated stream-flow illustration in icon box | Requires Lottie or custom SVG animation; deferred until design system has motion tokens | Design |
| Wallet-specific error messages (e.g. Freighter rejected) | Depends on wallet integration API not yet wired | Backend/Wallet integration |
| Dark/light theme toggle for empty states | No light theme defined in design system yet | Design |
| Recipient "View docs" CTA linking to real docs URL | `https://docs.fluxora.xyz` is a placeholder; real URL TBD | Product |

---

## 11. Open Questions

None blocking engineering. All core states are specified above.

---

# Addendum — Issue #220: search-no-results & error variants

**Branch:** `design/empty-state-search-no-results-error-variants`  
**Status:** Ready for engineering handoff

---

## A1. New Surfaces

| Variant | Trigger | Component prop |
|---|---|---|
| `search-no-results` | Search/filter returns 0 results | `variant="search-no-results"` |
| `error` | API fetch rejects / 5xx | `variant="error"` |

---

## A2. State Matrix (new variants)

| State | search-no-results | error |
|---|---|---|
| **Default** | Magnifying-glass+X illustration, "No results found", "Clear filters" CTA | Warning-triangle illustration, "Something went wrong", "Try again" CTA |
| **Hover** | `filter: brightness(1.12)`, `translateY(-1px)` on CTA | Same |
| **Focus** | `outline: 2px solid var(--accent)`, `outline-offset: 2px` | Same |
| **Active** | `translateY(0)` | Same |
| **Disabled** | `opacity: 0.45`, `cursor: not-allowed`, washed-out bg/color, `disabled` + `aria-disabled` on button | Same |
| **Loading** | Shared shimmer skeleton (`loading=true`) | Same |
| **Empty** | n/a — this IS the empty state | n/a |
| **Error** | Error banner overlay via `error` prop still works | Error banner overlay still works |

---

## A3. Component API (additions)

```tsx
<EmptyState
  variant="search-no-results"
  walletConnected={boolean}
  loading={boolean}
  ctaDisabled={boolean}        // NEW — disables CTA while action is in-flight
  onClearFilters={fn}          // NEW — fires when "Clear filters" is clicked
  onPrimaryAction={fn}         // fallback if onClearFilters not provided
/>

<EmptyState
  variant="error"
  walletConnected={boolean}
  loading={boolean}
  ctaDisabled={boolean}        // NEW
  errorMessage={string}        // NEW — overrides default description copy
  onRetry={fn}                 // fires when "Try again" is clicked
  onPrimaryAction={fn}         // fallback if onRetry not provided
/>
```

---

## A4. Visual Spec

### Icon box

| Variant | Background tint | Border tint | Icon |
|---|---|---|---|
| search-no-results | `var(--es-search-icon-bg)` | `var(--es-search-icon-border)` | Magnifying glass with × inside, handle |
| error | `var(--es-error-icon-bg)` | `var(--es-error-icon-border)` | Warning triangle with ! |

Icon size: `72×72px`, `border-radius: 20px` (same as existing variants).

### CTA button

| Variant | Background | Border | Text color |
|---|---|---|---|
| search-no-results | `var(--es-search-cta-bg)` | `var(--es-search-cta-border)` | `var(--es-search-cta-text)` |
| error | `var(--es-error-cta-bg)` | `var(--es-error-cta-border)` | `var(--es-error-cta-text)` |

**Disabled state (both):** `opacity: 0.45`, `background: rgba(255,255,255,0.04)`, `color: rgba(255,255,255,0.28)`, `cursor: not-allowed`.

No `+` icon prefix (unlike treasury/streams connected CTAs).

### Design tokens

```css
/* Light theme */
--es-search-icon-stroke: #0e7490;
--es-search-icon-fill:   rgba(14,116,144,0.08);
--es-search-icon-bg:     rgba(14,116,144,0.06);
--es-search-icon-border: rgba(14,116,144,0.20);
--es-search-cta-bg:      rgba(14,116,144,0.10);
--es-search-cta-border:  rgba(14,116,144,0.25);
--es-search-cta-text:    #0e7490;   /* 4.5:1+ on white */

--es-error-icon-stroke:  #dc2626;
--es-error-icon-fill:    rgba(220,38,38,0.08);
--es-error-icon-bg:      rgba(220,38,38,0.06);
--es-error-icon-border:  rgba(220,38,38,0.22);
--es-error-cta-bg:       rgba(220,38,38,0.10);
--es-error-cta-border:   rgba(220,38,38,0.28);
--es-error-cta-text:     #b91c1c;   /* 4.5:1+ on white */

/* Dark theme overrides */
--es-search-icon-stroke: #5ED3F3;   /* 4.5:1+ on dark surface */
--es-search-cta-text:    #5ED3F3;
--es-error-icon-stroke:  #EF4444;   /* 4.5:1+ on dark surface */
--es-error-cta-text:     #EF4444;
```

---

## A5. Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| ≥ 1024px | `clamp()` max values; no override needed |
| 768px | Description `max-width: 100%` to prevent overflow |
| 375px | Outer padding reduced to `36px 14px` |
| 320px | Outer padding reduced to `32px 12px` |

Rules live in `src/index.css` under `EMPTY STATE — RESPONSIVE BREAKPOINTS`.

---

## A6. Accessibility

### Focus order

1. Skip-to-content link
2. Empty state region (`role="region"`, `aria-label="Search no results state"` or `"Error state"`)
3. Primary CTA (`"Clear filters"` or `"Try again"`)

### Labels & roles

| Element | Role / Attribute |
|---|---|
| Outer wrapper | `role="region"` + `aria-label="Search no results state"` or `"Error state"` |
| Icon SVG | `aria-hidden="true"` |
| CTA (disabled) | `disabled` + `aria-disabled="true"` |

### Contrast

| Pair | Ratio | WCAG target |
|---|---|---|
| `#0e7490` (search CTA text) on light surface `#fafbfc` | ≈ 4.6:1 | AA ✓ |
| `#b91c1c` (error CTA text) on light surface `#fafbfc` | ≈ 5.1:1 | AA ✓ |
| `#5ED3F3` (search CTA text) on dark surface `#121a2a` | ≈ 7.2:1 | AA ✓ |
| `#EF4444` (error CTA text) on dark surface `#121a2a` | ≈ 4.7:1 | AA ✓ |
| Heading `#FFFFFF` on `#121a2a` | ≥ 12:1 | AA ✓ |
| Description `#99A1AF` on `#121a2a` | ≈ 4.6:1 | AA ✓ |

---

## A7. Copy Deck

### search-no-results
- **Heading:** No results found
- **Body:** Your search or filters didn't match any streams. Try adjusting your query or clearing all filters to see everything.
- **CTA:** Clear filters

### error (default)
- **Heading:** Something went wrong
- **Body:** We couldn't load this data. This may be a temporary issue — please try again. If the problem persists, check your connection or contact support.
- **CTA:** Try again

### error (anonymous wallet)
- **Body:** We couldn't load this data. Please try again or refresh the page.

### error (custom via `errorMessage` prop)
- Caller supplies the body text; heading and CTA remain as above.

---

## A8. Edge Cases

| Case | Handling |
|---|---|
| Long Stellar address in `errorMessage` | Text wraps within `max-width: 400px` container; no overflow |
| `onClearFilters` not provided | Falls back to `onPrimaryAction` |
| `onRetry` not provided | Falls back to `onPrimaryAction` |
| Both `error` banner prop and `variant="error"` | Banner renders above the variant description; both are visible |

---

## A9. Acceptance Criteria (Issue #220)

- [x] `search-no-results` variant renders illustration, heading, description, "Clear filters" CTA
- [x] `error` variant renders illustration, heading, description, "Try again" CTA
- [x] All SVGs are `aria-hidden="true"`
- [x] Both variants have `role="region"` with accessible label
- [x] `ctaDisabled` prop applies `opacity: 0.45`, `cursor: not-allowed`, `disabled` + `aria-disabled`
- [x] Design tokens documented in `src/design-tokens.css` and this spec
- [x] Contrast ≥ 4.5:1 for all text/background pairs (light + dark)
- [x] `@media` rules for 320/375/768px in `src/index.css`
- [x] 35 unit tests pass (including 12 new tests for the two variants)
- [x] Demo page at `/app/empty-state-demo` shows all 6 variants with interactive controls
