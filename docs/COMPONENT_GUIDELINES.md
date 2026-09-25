# Component Guidelines

This document captures the shared conventions every Fluxora Frontend component
must follow. Read it before adding a new component or refactoring an existing
one. The goal is a codebase where any contributor can orient quickly: where a
file belongs, what tests it needs, what accessibility and i18n rules apply, and
how to style it.

> **Related reading**
> - `CONTRIBUTING.md` — branch naming, commits, CI, coverage thresholds
> - `src/i18n/README.md` — full i18n API reference
> - `docs/SR_ONLY_REVEAL_PATTERN_SPEC.md` — screen-reader-only reveal patterns
> - `src/styles/accessibility.css` — shared focus-ring and sr-only utilities
> - `DESIGN_SPEC.md` — visual design system
> - `DESIGN_TOKENS_QUICK_REFERENCE.md` — token reference

---

## Table of Contents

1. [Where a component belongs](#1-where-a-component-belongs)
2. [File and naming conventions](#2-file-and-naming-conventions)
3. [Testing obligations](#3-testing-obligations)
4. [Accessibility requirements](#4-accessibility-requirements)
5. [Internationalisation (i18n) obligations](#5-internationalisation-i18n-obligations)
6. [Shared design tokens](#6-shared-design-tokens)
7. [CSS Modules and component boundaries](#7-css-modules-and-component-boundaries)
8. [Address formatting](#8-address-formatting)
9. [Wallet state](#9-wallet-state)

---

## 1. Where a component belongs

Use the table below to decide where to put a new file. When in doubt, prefer
the more specific location — it is easier to promote a feature component to
shared than to demote a shared primitive that turned out to be feature-specific.

| Kind | Location | Examples |
|---|---|---|
| **Shared primitive** — used by ≥ 2 unrelated features, no domain knowledge | `src/components/` | `Button`, `Input`, `Skeleton`, `EmptyState`, `VirtualList`, `Pagination`, `InfoTooltip`, `ValidationMessage` |
| **Shared layout / shell** — wraps an entire page or the app shell | `src/components/` | `Layout`, `Navbar`, `Sidebar`, `Footer`, `ErrorBoundary`, `RequireWallet` |
| **Cross-cutting domain primitive** — reused address / wallet UI | `src/components/common/` | `TruncatedAddress`, `TruncatedReveal`, `ConfirmModal` |
| **Feature cluster** — a self-contained product feature with ≥ 2 files | `src/components/<feature>/` | `toast/`, `voice/`, `wallet-connect/`, `navigation/`, `presence/`, `embed/`, `csv-upload/`, `receipt/`, `colorBlindSimulation/`, `Streams/`, `landing-page/`, `treasuryOverviewPage/` |
| **Page component** — mounted directly by a React Router route | `src/pages/` | `Dashboard`, `Streams`, `Recipient`, `TreasuryPage`, `ConnectWallet` |
| **Page-level data hook** — fetches or transforms data only for one page | `src/pages/` (co-located) | `useStreamsData.ts`, `useRecipientPageData.ts` |
| **App-wide hook** — reusable across multiple pages/features | `src/hooks/` | `useClipboard`, `useTickingNow`, `usePrefersReducedMotion`, `useTransactionSubmission` |
| **Pure utility / service** — no React, no JSX | `src/lib/` | `formatters.ts`, `config.ts`, `stellar.ts`, `api/streamsService.ts` |

### Deciding between `src/components/` and `src/components/<feature>/`

Create a subdirectory when a component:
- Has two or more sibling files (TSX + CSS + types, or multiple TSX files),
  **and**
- Is scoped to a single product feature that is unlikely to be rendered outside
  that context.

A single-file component that is only used in one feature may live at the top
level of `src/components/` if moving it would not help discoverability.

### Re-using before adding

Before creating a new component, check whether an existing primitive already
covers the need:

- Loading skeletons → `<Skeleton>` (`src/components/Skeleton.tsx`)
- Empty / zero-data states → `<EmptyState>` (`src/components/EmptyState.tsx`)
- Long lists → `<VirtualList>` (`src/components/VirtualList.tsx`)
- Toast notifications → `useToast()` from `src/components/toast/ToastProvider.tsx`
- Wallet state → `useWallet()` from `src/components/wallet-connect/Walletcontext.tsx`
- Address display → `<TruncatedAddress>` / `formatAddress` (see [§ 8](#8-address-formatting))

---

## 2. File and naming conventions

### Component files

- One public component per file.
- File name and export name must match and use PascalCase: `StreamCard.tsx`
  exports `StreamCard`.
- Co-locate the component's stylesheet in the same directory (see [§ 7](#7-css-modules-and-component-boundaries)).
- Feature subdirectories may export a barrel `index.ts` when the public
  surface is stable; otherwise import directly.

### Hook files

- Hooks live in the same directory as the component that owns them, or in
  `src/hooks/` if app-wide.
- File name uses camelCase with the `use` prefix: `useModalAccessibility.ts`.

### TypeScript

- All components must be written in TypeScript (`.tsx`).
- Export a named `Props` interface or type alias for every public component.
- Prefer explicit `React.FC` or plain function declarations with a typed
  `props` argument over implicit typing.

```tsx
// ✅ Correct — explicit named interface, plain function
export interface StreamCardProps {
  stream: StreamRecord;
  onAction?: (id: string) => void;
}

export function StreamCard({ stream, onAction }: StreamCardProps) { … }

// ❌ Avoid — anonymous inline props, no exported type
export default ({ stream }: { stream: StreamRecord }) => { … }
```

---

## 3. Testing obligations

### Coverage gate

The CI `coverage` job enforces **95% thresholds** (statements / branches /
functions / lines) for every file listed in `vitest.config.ts → coverage.include`.
When adding a new production module, append it to that list **before** opening
the PR and add tests to cover it — otherwise the coverage job will fail.

### What to test

Every new or modified component must have unit tests that cover:

| Obligation | What to assert |
|---|---|
| **Render** | The component renders without throwing for its most common prop combinations. |
| **Behaviour** | User interactions that trigger state changes (clicks, keyboard events, form submissions) produce the correct output. |
| **Edge cases** | Empty/null/undefined data does not crash the component. |
| **Accessibility** | Interactive elements are keyboard-reachable; modals trap focus; `aria-label`s are present where required (see [§ 4](#4-accessibility-requirements)). |
| **i18n** | User-visible strings are rendered via `t()` and respond to locale changes where applicable (see [§ 5](#5-internationalisation-i18n-obligations)). |

### Where tests live

- Tests for components in `src/components/` go in
  `src/components/__tests__/` **or** a `__tests__/` subdirectory inside the
  feature cluster (e.g. `src/components/voice/__tests__/`).
- Tests for pages go in `src/pages/__tests__/` or co-located (e.g.
  `src/pages/Streams.test.tsx`).
- Tests for hooks go in `src/hooks/__tests__/`.
- File name pattern: `<ComponentName>.test.tsx` or
  `<ComponentName>.<concern>.test.tsx` for focused test files (e.g.
  `CreateStreamModal.validation.test.tsx`).

### Test utilities

- Use `@testing-library/react` (`render`, `screen`, `fireEvent`,
  `userEvent`).
- Mock Freighter and wallet context via the test helpers in
  `src/test/setup.ts`.
- Use `vi.mock` to isolate service-layer calls; do not make real network
  requests in unit tests.

### E2E tests

Browser-level tests live in `e2e/` and run with Playwright. Add e2e coverage
for flows that span multiple page transitions or require a real DOM environment
(e.g. accessibility audits via `axe-core`, wallet-connect dialogs). See
`e2e/README.md` for setup.

---

## 4. Accessibility requirements

All new components must meet **WCAG 2.1 AA**. The following rules are
non-negotiable; the CI e2e suite audits rendered pages with `axe-core`.

### Touch targets

Interactive elements must have a minimum touch target of **44 × 44 CSS px**.
The automated audit runs every primary route at the smallest supported viewport
of **320 × 568 CSS px** in `e2e/touch-targets.spec.ts`.

An exception is permitted only for a non-rendered or platform-controlled
control that cannot be resized. Mark it with `data-touch-target-exception` and
provide a non-empty `data-touch-target-reason`; the audit rejects unreasoned
exceptions. See `.kiro/specs/touch-target-accessibility` for the full spec.

### Colour contrast

Text contrast ratios must meet:
- **4.5 : 1** for normal text (< 18 pt / < 14 pt bold)
- **3 : 1** for large text (≥ 18 pt / ≥ 14 pt bold)
- **3 : 1** for UI component boundaries and graphical objects

Use `evaluateContrast` from `src/utils/contrastUtils.ts` in tests to assert
token pairs. Never hard-code colour values (see [§ 6](#6-shared-design-tokens)).

### Focus management

- Every interactive element must be keyboard-operable.
- Use the shared focus-ring utility from `src/styles/accessibility.css`. Apply
  `var(--color-focus)` for the outline colour; do not use `outline: none`
  without an equivalent visible indicator.
- Modals and dialogs must trap focus on open and restore focus to the trigger
  on close. Use `useModalAccessibility` (`src/components/useModalAccessibility.ts`)
  rather than rolling a new focus-trap.

### ARIA

- Informational icons must carry `aria-hidden="true"`.
- Controls that have no visible text label must carry an `aria-label` or be
  associated with a visible label via `aria-labelledby`.
- Live regions that announce async changes (loading, error, success) must
  use `role="status"` or `role="alert"` as appropriate; prefer
  `useLiveAnnouncer` (`src/hooks/useLiveAnnouncer.ts`) over inline
  `aria-live` attributes.
- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`, `<section>`,
  `<header>`, `<footer>`) before reaching for `role=` overrides.

### Reduced-motion

Animations triggered by component state must respect
`prefers-reduced-motion`. Use `usePrefersReducedMotion`
(`src/hooks/usePrefersReducedMotion.ts`) or the CSS media query
`@media (prefers-reduced-motion: reduce)` — not both independently in the
same component.

### Screen reader patterns

Follow the patterns in `docs/SR_ONLY_REVEAL_PATTERN_SPEC.md` for content that
is visible on screen but needs additional or different copy for screen readers
(e.g. Stellar address reveal chips). Use the `.sr-only` utility from
`src/styles/accessibility.css`.

---

## 5. Internationalisation (i18n) obligations

### Every user-visible string must go through `t()`

Do not hard-code English text in JSX or in strings that reach the DOM. Use the
`useI18n()` hook from `src/i18n/index.tsx`:

```tsx
import { useI18n } from "../../i18n";

export function StreamCard({ stream }: StreamCardProps) {
  const { t } = useI18n();

  return (
    <article>
      <h2>{t("streams.card.title")}</h2>
      <p>{t("streams.card.recipient", { address: stream.recipient })}</p>
    </article>
  );
}
```

### Naming new keys

Keys use flat dot-notation organised by surface, component, and element:

```
[surface/component].[section].[element]
```

Examples:
- `"streams.card.title"` — title in a stream card
- `"createStream.step2.header"` — header text in step 2 of the create-stream flow
- `"createStream.validation.recipientRequired"` — validation error message

Add new keys to `src/i18n/en.ts`. The TypeScript type `TranslationKey` is
derived directly from that file, so a missing key is a compile error.

### Parameter interpolation

Use curly-brace placeholders in the catalog. The `t()` helper HTML-escapes
interpolated values to prevent XSS:

```ts
// src/i18n/en.ts
"streams.card.rate": "{rate} USDC / second",
```

```tsx
t("streams.card.rate", { rate: formatAmount(stream.ratePerSecond) })
```

### Pluralisation

Define `_one` and `_other` suffixes in the catalog and pass `count`:

```ts
// src/i18n/en.ts
"streams.count_one": "{count} stream",
"streams.count_other": "{count} streams",
```

```tsx
t("streams.count", { count: streams.length })
```

### aria-labels and screen-reader copy

`aria-label` values and sr-only copy are user-facing strings and must also
come from the catalog, not be hard-coded:

```tsx
<button aria-label={t("streams.card.copyAddress")}>…</button>
```

### What does not need `t()`

- Development-only / `console.*` messages.
- Content that is already a localised value returned by the API (e.g. a
  timestamp formatted by `src/lib/timePresentation.ts`).
- Numeric values formatted by `src/lib/formatters.ts` — use the formatters
  directly; do not wrap them in translation keys.

---

## 6. Shared design tokens

Always use CSS variables from `src/design-tokens.css` and `src/index.css`
rather than hard-coded colour literals, pixel values, or timing values.

| Token | Purpose |
|---|---|
| `var(--color-accent-primary)` | Primary interactive colour |
| `var(--color-text-primary)` | Body text |
| `var(--color-text-muted)` | Secondary / caption text |
| `var(--color-border-default)` | Dividers and input borders |
| `var(--color-surface-elevated)` | Cards and elevated surfaces |
| `var(--color-focus)` | Focus ring colour |
| `var(--radius-sm)` | Small corner radius |
| `var(--transition-fast)` | Micro-interaction duration |

See `DESIGN_TOKENS_QUICK_REFERENCE.md` for the full token list.

### Theming

The `data-theme` attribute on `<html>` is the single switch between light and
dark. Components must not read `localStorage` or `matchMedia` directly — use
`useTheme()` from `src/theme/ThemeProvider.tsx`. Because CSS variables
re-resolve automatically, most components need no theme-specific logic at all;
just use the tokens.

---

## 7. CSS Modules and component boundaries

### When to use a CSS Module vs. plain CSS

| Situation | Choice |
|---|---|
| Styles are scoped to a single component | CSS Module (`ComponentName.module.css`) |
| Styles are shared by multiple components | Plain CSS imported in `src/index.css` or a dedicated shared stylesheet |
| Component has only 1–3 simple rules | Inline CSS Module is still preferred; plain CSS is acceptable for truly trivial cases |

Name the Module file after the component: `Button.module.css` lives next to
`Button.tsx`.

### Rules

- Component-only styles belong in a co-located CSS Module or stylesheet. Do
  not add selectors to a global file unless they are genuinely shared by
  multiple unrelated components.
- Use design tokens (CSS variables) inside Modules; never hard-code colours,
  spacing, typography sizes, or motion values.
- Class names in Modules use camelCase (`styles.cardTitle`); global class
  names use kebab-case (`.stream-card-title`).
- Do not use `!important` except to override a third-party library where no
  other option exists, and document the reason in a comment.

### Separation of concerns

- Keep data fetching in service hooks (`src/lib/api/`) and page-level data
  hooks (`src/pages/use*.ts`). Presentational components should receive data
  via props, not call services directly.
- Reuse shared primitives (`VirtualList`, `EmptyState`, `Skeleton`, `Button`,
  etc.) before adding a parallel implementation.

---

## 8. Address formatting

### Always use `formatAddress` for mid-string truncation

All display of Stellar addresses in compact form (head…tail) must go through
the single exported utility `formatAddress` from
`src/components/common/TruncatedAddress.tsx`.

```ts
import { formatAddress } from "../common/TruncatedAddress";

// ✅ Correct — uses the shared utility
const label = formatAddress(stream.recipient);       // "GABCDE...LOWN"
const label = formatAddress(address, 8, 4);          // custom prefix/suffix

// ❌ Incorrect — inline reimplementation drifts silently
const label = `${address.slice(0, 6)}...${address.slice(-4)}`;
```

#### Why

Before this utility existed, `StreamRow.tsx`, `WalletButton.tsx`, and
`WalletStatus.tsx` each maintained their own inline slice expression. The head
and tail character counts had quietly drifted apart:

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
`<TruncatedAddress>` component directly — it includes sr-only full-address
spans, ARIA labels, clipboard and Web Share API support, and focus management.

For **plain formatted text** (table cells, aria-labels, announcement strings),
call `formatAddress(address)`.

---

## 9. Wallet state

Read wallet address and network exclusively through `useWallet()` from
`src/components/wallet-connect/Walletcontext.tsx`. Do not import
`@stellar/freighter-api` directly in component code.

```tsx
// ✅ Correct
import { useWallet } from "../wallet-connect/Walletcontext";

function WalletStatus() {
  const { address, network, connected } = useWallet();
  …
}

// ❌ Incorrect
import { getPublicKey } from "@stellar/freighter-api";
```

The canonical wallet connection modal is `ConnectWalletModal`
(`src/components/ConnectWalletModal.tsx`). Wallet entry points — including
`WalletButton` — must route Freighter, Albedo, and WalletConnect actions
through this component so error states and focus management stay consistent.
