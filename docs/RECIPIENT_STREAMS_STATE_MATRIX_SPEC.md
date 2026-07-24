# RecipientStreams State Matrix Visual Specification

## Executive Summary
This document specifies the single coherent visual and functional contract for `src/components/recipient/RecipientStreams.tsx` across its four canonical states: **Loading**, **Empty**, **Error**, and **Populated**.

It details token usage, contrast ratios (WCAG 2.1 AA compliance), accessibility semantics, keyboard interaction flows, and responsive redlines for 375px (mobile) and 1024px (desktop) viewports.

---

## State Matrix Overview

| State | Trigger Conditions | Semantic Roles & ARIA | Primary CTA / Action | Key Visual Elements |
|---|---|---|---|---|
| **1. Loading** | `isLoading === true` OR initial `fetchStreamsFn` in-flight | `role="status"`, `aria-label="Loading recipient portal"`, `aria-busy="true"` | None (disabled/skeleton) | Animated shimmer skeletons for header text, refresh CTA, and stream cards using `SkeletonCard` & `Skeleton` language matching `RecipientLoading.tsx`. |
| **2. Empty** | `!isLoading && !error && streams.length === 0` | Shared region from `EmptyState.tsx` (`variant="recipient"`) | "Connect wallet" (`onEmptyPrimaryAction`) | Empty state illustration container, high-contrast title, description, and interactive "Connect wallet" button. |
| **3. Error** | `error !== null` (prop or rejected `fetchStreamsFn`) | `role="alert"`, `aria-live="assertive"`, `aria-atomic="true"` | "Retry" button (`onRetry` / `handleRefresh`) | Assertive dismissable/retryable banner with warning icon, error copy, and labeled retry button. |
| **4. Populated** | `!isLoading && streams.length > 0` | Section region with `<h2>Your incoming streams</h2>` | Refresh Status / Pin Toggle | Stream cards list sorted by `isPinned` status (pinned first), status badges (Active / Paused), and pin toggle action. |

---

## Detailed State Specifications

### 1. Loading State
- **Trigger**: `isLoading={true}`
- **Semantics**:
  - Container element: `<div role="status" aria-label="Loading recipient portal" aria-busy="true">`
  - Screen reader text: `<span className="sr-only">Loading recipient portal…</span>`
- **Visual Composition**:
  - Top header skeleton: 180px × 24px title pill + 260px × 14px subtitle pill.
  - Refresh button skeleton: 120px × 38px (if `fetchStreamsFn` provided).
  - Stream cards: 3 stacked `SkeletonCard` blocks with shimmer animation (`shimmer 1.4s infinite`), matching `RecipientLoading.tsx` token aesthetics.

### 2. Empty State
- **Trigger**: `streams={[]}` (and not loading, no error)
- **Semantics**:
  - Region container with `aria-label="Recipient empty state"`.
  - Button with explicit label `aria-label="Connect wallet"`.
- **CTA Handler**: `onEmptyPrimaryAction` (invoked on button click / keyboard Enter/Space).
- **Visual Composition**:
  - Centered illustration icon (svg badge with subtle background fill).
  - Heading: "Connect your wallet".
  - Body copy: "Connect a Stellar wallet to view incoming streams and withdraw accrued USDC."
  - CTA Button: "Connect wallet" with 1px border and hover brightness transition.

### 3. Error State
- **Trigger**: `error="Network error"` (or `fetchStreamsFn` rejection)
- **Semantics**:
  - Banner container: `<div role="alert" aria-live="assertive" aria-atomic="true">`
  - Retry button: `<button aria-label="Retry" onClick={onRetry}>Retry</button>`
- **Visual Composition**:
  - Alert banner styled with `--color-error-bg` and `--color-error-text`.
  - Warning SVG icon inline with error message text.
  - Distinct "Retry" button on the right edge of the banner with subtle border and focus ring.

### 4. Populated State
- **Trigger**: `streams={[...]}`
- **Ordering Rule**: Pinned streams (`isPinned: true`) bubble up first in list ordering (`[...streams].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))`).
- **Heading**: `<h2 className="text-xl font-bold">Your incoming streams</h2>`
- **Stream Card Elements**:
  - Sender label: `From: {stream.senderName || stream.sender}`
  - Amount: `{stream.amount} XLM`
  - Status badge: Active (`status-badge--active`, `--color-success-bg`) or Paused (`status-badge--paused`, `--color-warning-bg`).
  - Pin action button: `<button aria-label="Pin stream">{isPinned ? "★" : "☆"}</button>`

---

## Design Tokens & Contrast Compliance (WCAG 2.1 AA)

All colors leverage CSS variables (`var(...)`) to ensure automatic light/dark theme adaptability and strict contrast ratios:

| Token Name | Usage | Light Mode Hex (Resolved) | Dark Mode Hex (Resolved) | Minimum Contrast Ratio | WCAG AA Standard |
|---|---|---|---|---|---|
| `--color-bg-primary` | Container background | `#FFFFFF` | `#0B0F17` | N/A (Canvas) | Pass |
| `--color-text-primary` | Main headings | `#0F172A` | `#F8FAFC` | > 12:1 | Pass (4.5:1 required) |
| `--color-text-secondary` | Card labels / From text | `#334155` | `#CBD5E1` | > 7:1 | Pass (4.5:1 required) |
| `--color-text-tertiary` | Subtitles | `#64748B` | `#94A3B8` | > 4.6:1 | Pass (4.5:1 required) |
| `--color-error-bg` | Error alert background | `rgba(239, 68, 68, 0.10)` | `rgba(239, 68, 68, 0.15)` | N/A (Surface) | Pass |
| `--color-error-text` | Error message & retry text | `#DC2626` | `#EF4444` | > 4.8:1 | Pass (4.5:1 required) |
| `--color-success` | Active status badge text | `#059669` | `#10B981` | > 4.5:1 | Pass (4.5:1 required) |
| `--color-border-default` | Card item borders | `#E2E8F0` | `#1E293B` | > 3:1 | Pass |

---

## Accessibility & Keyboard Walkthrough

1. **Screen Reader Announcements**:
   - Loading: `role="status"` with `aria-label="Loading recipient portal"` announces loading state immediately.
   - Error: `role="alert"` with `aria-live="assertive"` ensures network failures are announced instantly without user focus movement.
2. **Keyboard Navigation Flow**:
   - `Tab` key moves focus sequentially:
     1. "Refresh Status" button (if present)
     2. Error "Retry" button (if error active)
     3. "Connect wallet" CTA button (if empty state active)
     4. Individual stream "Pin stream" toggle buttons (if populated)
   - Visible focus indicator: 2px solid accent ring with 2px offset (`outline: 2px solid var(--accent)`).
   - `Enter` / `Space` key activates buttons cleanly.

---

## Responsive Redlines

### Mobile Breakpoint (375px)
- **Padding**: 16px (`p-4` / `1rem`) lateral padding inside container.
- **Header**: Flex column wrapping header copy and action button cleanly.
- **Cards**: Single column stacked layout. Status badge and pin button align right with gap 12px.
- **Error Banner**: Flex-col / tight flex-row layout with retry button wrapping gracefully without truncation.

### Desktop Breakpoint (1024px)
- **Padding**: 24px (`p-6` / `1.5rem`) lateral padding with `max-w-4xl` (896px max width).
- **Header**: Flex row with space-between alignment between title block and refresh button.
- **Cards**: Flex row item cards with distinct left details (sender & amount) and right status badge + pin button.
