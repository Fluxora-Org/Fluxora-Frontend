# Component Guidelines

This document captures shared conventions for Fluxora Frontend components. Follow
these guidelines when adding new components or refactoring existing ones so the
codebase stays consistent and easy to review.

---

## Address formatting

### Always use `formatAddress` for mid-string truncation

All display of Stellar addresses in compact form (head…tail) must go through the
single exported utility `formatAddress` from
`src/components/common/TruncatedAddress.tsx`.

```ts
import { formatAddress } from "../common/TruncatedAddress";

// ✅ Correct — uses the shared utility
const label = formatAddress(stream.recipient);            // "GABCDE...LOWN"
const label = formatAddress(address, 8, 4);              // custom prefix/suffix

// ❌ Incorrect — inline reimplementation drifts silently
const label = `${address.slice(0, 6)}...${address.slice(-4)}`;
```

#### Why

Before this utility existed, `StreamRow.tsx`, `WalletButton.tsx`, and
`WalletStatus.tsx` each maintained their own inline slice expression. The head and
tail character counts had quietly drifted apart:

| Call site | Before |
|---|---|
| `StreamRow.tsx` | `slice(0, 6)...slice(-4)` (threshold `> 14`) |
| `WalletButton.tsx` | `slice(0, 6)...slice(-4)` (no threshold — always) |
| `WalletStatus.tsx` | `maskAddress(address, 6, 4)` (delegated, but redundant) |
| `TruncatedAddress.tsx` | `slice(0, 6)...slice(-4)` (threshold `> 12`) |

This was consolidated in [#1288] into one utility so any future change to the
format touches exactly one place.

#### API

```ts
/**
 * Formats a Stellar address with mid-string truncation for compact display.
 *
 * @param address   The address to truncate.
 * @param prefixLen Characters to keep at the start. Default: 6.
 * @param suffixLen Characters to keep at the end.   Default: 4.
 * @returns The truncated string, or the original if short enough.
 */
export function formatAddress(
  address: string,
  prefixLen = 6,
  suffixLen = 4,
): string
```

Addresses with `length ≤ prefixLen + suffixLen` are returned unchanged.

#### Accessible component vs. plain text

For **interactive UI** (copy buttons, share, reveal chips), use the
`<TruncatedAddress>` component directly — it includes sr-only full-address spans,
ARIA labels, clipboard and Web Share API support, and focus management.

For **plain formatted text** (table cells, aria-labels, announcement strings),
call `formatAddress(address)`.

---

## Accessibility requirements

All new components must meet WCAG 2.1 AA. Specifically:

- Interactive elements must have a minimum touch target of 44 × 44 CSS px
  (see `.kiro/specs/touch-target-accessibility`).
- Color contrast for text must be at least 4.5 : 1 (normal) / 3 : 1 (large).
  Use `evaluateContrast` from `src/utils/contrastUtils.ts` to validate.
- Every interactive element must be keyboard operable and have a visible
  focus indicator using `var(--color-focus)`.
- Informational icons must carry `aria-hidden="true"`. Controls must carry
  an `aria-label` or be associated with a visible label.

---

## Shared design tokens

Always use CSS variables from `src/design-tokens.css` and `src/index.css` rather
than hardcoded colour literals or pixel values. Common tokens:

| Token | Purpose |
|---|---|
| `var(--color-accent-primary)` | Primary interactive colour |
| `var(--color-text-primary)` | Body text |
| `var(--color-text-muted)` | Secondary / caption text |
| `var(--color-border-default)` | Dividers and input borders |
| `var(--color-surface-elevated)` | Cards and elevated surfaces |
| `var(--radius-sm)` | Small corner radius |
| `var(--transition-fast)` | Micro-interaction duration |

---

## CSS Modules and component boundaries

- Keep component-only styles in a colocated CSS Module or stylesheet; do not
  add selectors to a global file unless they are shared by multiple components.
- Use the design tokens above from CSS Modules and avoid hardcoded colors,
  spacing, typography, or motion values.
- Keep data fetching in API hooks/services and keep presentational components
  focused on rendering and user interaction.
- Reuse shared primitives such as `VirtualList`, `EmptyState`, and the wallet
  provider before adding a parallel implementation.

---

## Wallet state

Read wallet address and network exclusively through `useWallet()` from
`src/components/wallet-connect/Walletcontext.tsx`. Do not import
`@stellar/freighter-api` directly in component code.

---

## Further reading

- `docs/SR_ONLY_REVEAL_PATTERN_SPEC.md` — screen-reader-only reveal patterns
- `src/styles/accessibility.css` — shared focus-ring and sr-only utilities
- `CONTRIBUTING.md` — branch naming, commit conventions, and CI requirements

---

## StreamDetail at-risk health state

The `StreamDetail` page's health badge has been extended with an "At risk" overlay that
warns when the stream's remaining treasury runway is critically low.

### Implementation

- **`AT_RISK_RUNWAY_HOURS`** (exported constant, currently `48`): the threshold in hours.
  When the stream's remaining funds will run out within this window at the current
  monthly accrual rate, the "At risk" badge is shown.
- **`computeIsAtRisk(stream)`**: a pure function that calculates the remaining runway
  as `remainingAmount / (monthlyRate / 30)` and converts the result to hours. Returns
  `true` only for **Active** streams with a positive monthly rate whose runway is
  below the threshold.

### Visual design

- The existing health status pill (Healthy / Attention / Settled) is always shown.
- The "At risk" badge is a **red pill** with a warning icon (`⚠️`), layered **next to**
  (not replacing) the existing health pill.
- Uses `var(--color-error)` / `var(--color-error-subtle)` tokens so it respects the
  active theme.

### Accessibility

- The "At risk" badge has `role="status"` so screen readers announce it.
- The badge has an `aria-label` describing the exact condition.
- Color is not the only differentiator — the warning icon and bold text provide
  a secondary cue.

### Edge cases

| Scenario | Behaviour |
|----------|-----------|
| Monthly rate is 0 or negative | No "At risk" badge (defensive guard) |
| `remainingAmount` is 0 | Badge appears (runway is 0 hours) |
| Stream is not Active (Completed / Paused) | No "At risk" badge (non-active streams are settled) |
| Stream has very large remaining amount | No "At risk" badge (runway is sufficient) |
