# Create-stream FAB specification

> Hand-off doc for `src/components/CreateStreamFab.tsx`, the `.create-stream-fab*` rules in `src/design-tokens.css`, the integration in `src/pages/Streams.tsx` & `src/pages/Dashboard.tsx`, and the test contract in `src/components/__tests__/CreateStreamFab.test.tsx`. Issue context: PR #905 (initial ship) and PR #942 (click-outside dismissal of the speed dial).

## Goal

Provide a persistent create entry point on `Streams` and `Dashboard` so the action remains available while long stream lists scroll. The FAB is a *secondary* entry point; the inline header buttons (`setIsCreateModalOpen` / `setIsModalOpen`) and `EmptyState`-style CTAs remain the **primary** discoverable surfaces. The FAB only fills the affordance gap once those affordances have scrolled out of view.

---

## Design tokens

All visual values originate from `src/design-tokens.css` so themes (`data-theme="dark"` and `data-theme="custom"`) inherit the same shape.

| Token                            | Value                                       | Used for                                    |
| -------------------------------- | ------------------------------------------- | ------------------------------------------- |
| `--fab-size`                     | `56px`                                      | min-width / min-height of the trigger       |
| `--fab-bottom-offset`            | `var(--space-xl)` → `24px`                  | desktop baseline block offset               |
| `--fab-bottom-offset-mobile`     | `5.5rem` → `88px`                           | mobile clear of bottom-nav safe area        |
| `--fab-side-offset`              | `var(--space-xl)` → `24px`                  | desktop inline inset from viewport edge     |
| Mobile inline inset (≤860px)     | `var(--space-lg)` → `16px`                  | tighter right-edge inset under mobile break |
| `--fab-z-index`                  | `900`                                       | above page content, below modal & drawer    |
| `--fab-menu-gap`                 | `var(--space-sm)` → `8px`                   | vertical spacing between speed-dial items   |
| `--fab-trigger-padding-x`        | `var(--space-md)` → `12px`                  | horizontal padding inside the trigger pill  |
| `--fab-menu-item-gap`            | `var(--space-sm)` → `8px`                   | icon-to-label spacing inside a menuitem     |
| `--fab-menu-item-padding-y`      | `var(--space-sm)` → `8px`                   | vertical padding inside a menuitem          |
| `--fab-menu-item-padding-x`      | `var(--space-md)` → `12px`                  | horizontal padding inside a menuitem        |
| `.ui-primary-cta` token group    | `--color-cta-primary-{bg,bg-hover,bg-active,text}` | trigger fill, text, hover / pressed treatments |
| `--shadow-lg`                    | `0 10px 15px -3px rgba(0,0,0,0.1)` light / `rgba(0,0,0,0.3)` dark | elevated resting shadow         |
| `--shadow-cta-primary-hover`     | `0 8px 16px rgba(0,184,212,0.3)` light / `0.35` dark | hover lift shadow                        |
| `--radius-full`                  | `9999px`                                    | desktop pill / mobile circular shape       |
| `--focus-ring`                   | `0 0 0 2px var(--color-bg-primary), 0 0 0 4px var(--color-focus)` | dual-layer focus ring (page surface inner gap) |
| `--transition-base`              | `200ms ease-in-out`                         | hover / focus / active state changes        |
| `--transition-fast`              | `150ms ease-in-out`                         | `translateY` on hover and pressed           |

**Spacing-scale anchor:** the global scale is `xs/sm/md/lg/xl/2xl/3xl/4xl` (`4px / 8px / 12px / 16px / 24px / 32px / 48px / 64px`). Numeric aliases such as `--space-2`, `--space-3`, `--space-4`, `--space-5`, `--space-6` are **not** part of that scale and were never defined on `:root`; earlier FAB CSS that referenced them resolved to invalid tokens (see [Hand-off notes](#hand-off-notes)).

---

## States

| State                | Trigger                                                            | Visual cue                                                                                                            | Tokens anchored                                                                                          |
| -------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `Collapsed`           | Default render                                                     | Pill on desktop (label visible); 56×56px circular button ≤480px — `.create-stream-fab__label` becomes visually hidden via the `sr-only` clip-rect helper, accessible name intact | `--shadow-lg`, `.ui-primary-cta`                                                                        |
| `Hover`               | Pointer over or `:focus-visible` adjacent                          | `--color-cta-primary-bg-hover`, `--shadow-cta-primary-hover`, `translateY(-2px)`                                      | `--color-cta-primary-bg-hover`, `--shadow-cta-primary-hover`                                             |
| `Focus`               | `:focus-visible` keyboard focus                                    | Dual-layer `--focus-ring` (2px inner gap = page surface, 4px outer = `--color-focus`). Icon and label stay aligned     | `--focus-ring`                                                                                           |
| `Pressed`             | `:active`                                                          | `--color-cta-primary-bg-active`, `translateY(1px)`                                                                    | `--color-cta-primary-bg-active`                                                                          |
| `Expanded` (speed dial, when `actions` prop is non-empty) | Click the trigger; the `+` icon rotates `45deg` to render as `×` | Menu items appear above the trigger; each item ≥44px high; first `menuitem` receives focus                              | `--shadow-lg`, `--color-bg-primary`, `--color-border-default`, `--color-text-primary`                     |
| `Hidden — modal open` | `hidden={true}` from caller                                        | Component returns `null` (no DOM)                                                                                     | n/a                                                                                                      |
| `Disabled — wallet disconnected` | `disabled={true}` from caller on Dashboard                  | `ui-primary-cta:disabled` style: muted background, `not-allowed` cursor; `aria-label` becomes `"Create stream (connect wallet first)"`; `title="Connect wallet to create a stream"` | `ui-primary-cta:disabled`                                                                              |

### Page-level wiring

- **`src/pages/Streams.tsx`** mounts the FAB **twice** — both call sites deliberately cover different render branches:
  - Line ~1174 — `StreamNotFound` branch: `<CreateStreamFab onCreateStream={handleCreateStream} hidden={isCreateModalOpen} />`. The empty / not-found view still offers the persistent create affordance so a user landing on a deleted stream isn't left without recovery.
  - Line ~1418 — main authenticated view: `<CreateStreamFab … hidden={isCreateModalOpen || isSuccessModalOpen} />`. The success modal is additionally factored into `hidden` to avoid duplicate entry points while the "Create another" dialog is open.
- **`src/pages/Dashboard.tsx`** (line ~253): `<CreateStreamFab onCreateStream={() => setIsModalOpen(true)} disabled={!walletConnected} hidden={isModalOpen} />`. The FAB only listens to `isModalOpen` (the create modal) for `hidden`; `ConnectWalletModal`'s open state (`isWalletModalOpen`) is **not** wired because the FAB is `disabled` whenever the wallet is disconnected — they cannot be open simultaneously and clickable, so the modal-open overlap is functionally same-safe. Documented for engineering transparency.
- Neither page currently passes `actions`; the speed-dial expanded variant is reserved for the upcoming Import CSV quick-create.

---

## Position and collision avoidance

- `position: fixed`; `right` = `max(var(--fab-side-offset), env(safe-area-inset-right))`; `bottom` = `max(var(--fab-bottom-offset), env(safe-area-inset-bottom))`. Independent of list scroll; survives safe-area notches on iOS Safari and the Android gesture pill.
- ≥861px viewport → 24px inline / block offsets.
- ≤860px viewport → 16px inline inset, **88px block offset** (`--fab-bottom-offset-mobile`) to clear mobile bottom navigation. `env(safe-area-inset-bottom)` further raises the FAB on devices with a home indicator.
- `--fab-z-index: 900` is below modal layers and the mobile drawer overlay, so the modal never sits beneath the FAB and the drawer remains the higher-priority interaction.
- ≤480px → `.create-stream-fab__label` collapses via the `sr-only` clip-rect helper, leaving a 56×56px circular icon FAB. The accessible name (`"Create stream"`) remains intact for screen readers.
- Pagination controls live in the page's normal document flow; the FAB is `position: fixed` so it never alters their layout. The 88px mobile clearance leaves the pagination row visually above the bottom-nav region.

### Redlines

**1440px desktop**

```
┌────────────────────────────────────────────────────────────────────────┐
│ Streams header                                                          │
│ ...                                                                      │
│                                                                          │
│                                          ┌────────────────────┐         │
│  Stream card 7  …                       │   Stream card 9    │         │
│                                          └────────────────────┘         │
│                                          ┌────────────────────┐         │
│  [pagination ⬅ 1 2 3 ➡]                  │  + Create stream   │  ←24px  │
│                                          └────────────────────┘  24px   │
└────────────────────────────────────────────────────────────────────────┘
                                                                    24px ↘
```

**375px mobile (collapsed, icon-only circular FAB)**

```
┌──────────────────────────┐
│ Streams header           │
│ ...                      │
│                          │
│  Stream card 1           │
│  Stream card 2           │
│  Stream card 3           │
│  …                       │
│                 ┌────┐   │  ← FAB sits 88px above scroll-end
│                 │ +  │   │     (env(safe-area-inset-bottom) on iPhones)
│                 │    │   │     16px from right edge
│                 └────┘   │
│ ──── pagination ────     │
│ ──── bottom-nav ────     │
└──────────────────────────┘
```

**375px mobile (speed-dial expanded, when `actions` ships)**

```
┌──────────────────────────┐
│ Streams header           │
│                          │
│            ┌──────────┐  │  ← 44px tall menu item, icon + label
│            │ + Import │  │     8px gap above the trigger
│            │   CSV    │  │
│            └──────────┘  │
│            ┌──────────┐  │
│            │ + Create │  │
│            │  stream  │  │
│            └──────────┘  │
│                 ┌────┐   │
│                 │ ×  │   │  ← trigger rotated +45°, label flips to "Close"
│                 └────┘   │
│ ──── pagination ────     │
│ ──── bottom-nav ────     │
└──────────────────────────┘
```

---

## Component API

Defined in `src/components/CreateStreamFab.tsx`.

```ts
export type CreateStreamFabAction = {
  id: string;                       // unique across visible FABs; React key
  label: string;                     // visible label & accessible name
  onSelect: () => void;              // invoked then menu collapses
  icon?: "upload" | "plus";          // optional leading icon
};

type CreateStreamFabProps = {
  onCreateStream: () => void;       // required: primary create flow
  disabled?: boolean;                // default false — wallet gate on Dashboard
  hidden?: boolean;                  // default false — modal-open suppression
  actions?: CreateStreamFabAction[]; // speed-dial items; omit for single-action variant
};
```

Behavioural contracts:

- Click trigger with `actions.length === 0` → calls `onCreateStream()`.
- Click trigger with `actions.length > 0` → toggles the speed dial.
- `hidden` or `disabled` both collapse any open speed dial via a shared `useEffect(() => { if (hidden || disabled) setExpanded(false) }, …)`.
- External `mousedown` (Issue #942) closes the open menu via a `useEffect`-bound listener.
- The icon is decorative (`aria-hidden="true"`); the accessible name is the button's `aria-label` / `title`.

---

## Accessibility & verification

- Trigger is a native `<button>` ≥56×56px (`min-width/height: var(--fab-size)`).
- When speed dial is present, each menuitem is ≥44px high.
- The trigger toggles between `"Create stream"` and `"Close"` when actions are present:
  - `aria-haspopup="menu"`, `aria-expanded`, `aria-controls="create-stream-fab-menu"` are only emitted when `hasActions` is truthy.
  - On expansion, focus moves to the first `menuitem` (`useEffect` watching `[expanded, hasActions]`).
  - `ArrowDown` / `ArrowUp` cycle wrap-around; `Home` / `End` jump to first/last; `Escape` collapses the menu (focus returns to trigger).
- External mousedown closes the menu (Issue #942) without focus loss to a hidden element.
- `prefers-reduced-motion: reduce` strips the FAB's transition rules (per-component `@media` block in `src/design-tokens.css`).
- `prefers-contrast: high` widens the global focus ring width & offset (already enforced by the design-token `@media` block).
- Disabled state uses the native `disabled` attribute, preventing click + keyboard activation, with a customised accessible name.

### Contrast (WCAG 2.1 AA, normal text)

`evaluateContrast()` from `src/utils/contrastUtils.ts` is the canonical measurement utility. Verified values:

| Pair (light & dark themes share these CTA tokens) | Hex                                | Ratio     | Wcag Level |
| -------------------------------------------------- | ---------------------------------- | --------- | ---------- |
| CTA text on CTA primary background                 | `#04131a` on `#00b8d4`              | **7.91:1**| AAA        |
| Light focus ring on light page surface            | `#0284c7` on `#ffffff`             | 4.10:1    | AA-large (UI component ≥3:1 ✅) |
| Dark focus ring on dark page surface              | `#00d4aa` on `#0a0e17`             | 10.11:1   | AAA        |

The CTA text/background pairing is identical in the default, dark, and custom themes — only the focus-ring color changes per theme. The inner halo (2px) of the dual-layer `--focus-ring` uses `var(--color-bg-primary)` as its negative-space gap, so the ring remains visible against both `#ffffff` and `#0a0e17`.

To re-verify, add a Vitest assertion:

```ts
import { evaluateContrast, WCAG_AA_NORMAL_TEXT_RATIO } from "../src/utils/contrastUtils";

it("FAB CTA text/background meets WCAG AA", () => {
  expect(evaluateContrast("#04131a", "#00b8d4").ratio).toBeGreaterThanOrEqual(
    WCAG_AA_NORMAL_TEXT_RATIO
  );
});
```

### Keyboard walkthrough (test plan)

1. Tab from page content → reaches the FAB trigger.
2. Enter / Space on the trigger (no `actions`) → opens `CreateStreamModal`.
3. Enter / Space on the trigger (with `actions`) → expands the speed dial; focus lands on item 0.
4. `ArrowDown` / `ArrowUp` cycle menuitems; `Home` / `End` jump to ends; `Escape` collapses.
5. Tab past the menu → leaves the FAB region (menu is removed from the DOM when closed).
6. `Shift+Tab` from item 0 moves focus back to the trigger.
7. `mousedown` outside the FAB region → menu collapses (Issue #942).

### Responsive review

1440px / 1024px / 768px / 480px / 375px in `light` and `dark`: verify no overlap with the mobile drawer (drawer z-index higher), no overlap with `Pagination.tsx` controls (Pagination row sits in normal document flow; the FAB sits above it on the z-axis but does not horizontally collide).

88px mobile bottom clearance plus `env(safe-area-inset-bottom)` keeps the FAB off the home indicator on iOS Safari and the gesture pill on Android 10+.

---

## Test coverage

`src/components/__tests__/CreateStreamFab.test.tsx` covers the core contract. The table maps each case to the spec section it verifies, and lists known gaps for engineering follow-up.

| Test                                                                                                          | Spec section verified                            |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `opens the create flow and exposes the minimum hit target`                                                    | Collapsed state, `ui-primary-cta`, hit target    |
| `is disabled until the wallet is connected and hides for an open modal`                                       | Disabled + Hidden states                         |
| `supports an expanded speed dial with arrow-key navigation`                                                  | Expanded (speed-dial) state + keyboard walk      |
| `closes the expanded action menu when clicking outside the FAB (Issue #942)`                                  | External click → collapse                        |
| **Known gaps** (not yet covered — candidates for follow-up PRs)                                               |                                                  |
| `disabled=true` collapses an open speed dial                                                                  | Hidden / Disabled states                         |
| `aria-label` swaps between `"Create stream"` and `"Create stream (connect wallet first)"`                     | Disabled state                                   |
| Icon rotation: `create-stream-fab__icon.is-rotated` applies a 45° transform when `expanded === true`         | Expanded state                                   |
| `Escape` from the menu returns focus to the trigger                                                          | Keyboard walkthrough                             |
| `prefers-reduced-motion: reduce` strips FAB transitions                                                      | Reduced-motion behaviour                         |
| `@media (max-width: 860px)` rule shifts inline inset to `--space-lg` (16px)                                  | Responsive review                                |

---

## PR redline / screenshot checklist

Capture at 375px, 768px, and 1440px in both themes with these annotations:

1. 56px button diameter / height and 24px desktop edge offsets.
2. 88px mobile bottom clearance plus safe-area inset.
3. Focus-ring outer edge and label / icon alignment.
4. Expanded-menu vertical gap (8px) and 44px menu-item height (when quick-create ships).
5. Modal-open screenshot showing the FAB absent (both `CreateStreamModal` and `StreamCreatedModal`).
6. Long-list + pagination screenshot showing the FAB fixed while content scrolls.
7. Disabled-wallet screenshot on Dashboard showing the muted button + customised accessible name.

Use the checklist above as the PR redline overlay rather than embedding generated screenshots in source control.

---

## Hand-off notes

- **Spacing-token bug, now fully resolved.** Earlier FAB CSS aliased `var(--space-3)`, `var(--space-2)`, `var(--space-4)`, `var(--space-5)`, and `var(--space-6)`. None of those exist on the global `:root` (the scale is `xs/sm/md/lg/xl/2xl/3xl/4xl`); the only places they were ever defined were `src/components/Layout.css` (a component-scoped `:root` block) and similar local blocks. The FAB CSS silently resolved to invalid tokens at runtime:
  - **Desktop offsets:** the FAB was sitting flush to the viewport edge instead of 24px inset. Fixed by remapping `--fab-side-offset` and `--fab-bottom-offset` to `var(--space-xl)` (24px).
  - **Mobile inline offset:** absent. Fixed by remapping the `@media (max-width: 860px)` `right` inset to `var(--space-lg)` (16px).
  - **Trigger padding:** horizontal padding collapsed to 0 (`.create-stream-fab__button` was using `var(--space-5)`). Fixed by introducing `--fab-trigger-padding-x` (12px).
  - **Speed-dial container gap:** menu items were stacked with no separation (`.create-stream-fab__menu` was using `var(--space-2)`). Fixed by introducing `--fab-menu-gap` (8px).
  - **Menuitem gap & padding:** icon-to-label spacing and the menuitem's vertical / horizontal padding all collapsed (`.create-stream-fab__menu-item` was using `var(--space-3)` and `var(--space-2) var(--space-4)`). Fixed by introducing `--fab-menu-item-gap` (8px) and `--fab-menu-item-padding-{y,x}` (8px / 12px).
- **All FAB-relevant spacing now lives behind named tokens.** Any future tweaks should mutate those tokens in `:root` rather than reaching back into the CSS selector — that way the spacing scale can evolve without re-editing the rule.
- **No separate CSS file for the FAB** — the styles live inline in `src/design-tokens.css` around the rule chain. Future speed-dial styles belong in the same block to keep FAB styles co-located with the tokens they consume.
- **`actions` prop** is reserved for the upcoming Import CSV quick-create. When wiring it, prefix the `id` (e.g. `create-stream__csv-import`) to keep `aria-controls` references unique per page — Streams mounts two FAB instances whose menu IDs need to be unique if both ever end up on the same view simultaneously.
- **Dashboard wallet source:** `useWallet().connected` gates `disabled`. Streams does not gate `disabled` because the page assumes an authenticated wallet source at entry — the FAB is therefore always enabled on Streams and only hidden while modals are open.
- **Connect-Wallet modal interaction on Dashboard:** the FAB's `hidden` only listens to `isModalOpen` (the create modal). `isWalletModalOpen` is *not* a `hidden` input because the FAB is `disabled` whenever the wallet is disconnected, so both conditions cannot be open-and-interactive simultaneously. This separation is intentional; documented for future readers.
- **`prefers-reduced-motion`:** the global design-token rule already nulls transitions site-wide; the FAB's per-component `@media (prefers-reduced-motion: reduce)` is a deliberate belt-and-suspenders.
