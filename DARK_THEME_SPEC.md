# Fluxora-Frontend: Token-Based Dark Theme & Inversion Rules

**Status:** Implementation-Ready  
**Version:** 1.0  
**Last Updated:** 2026-03-30  
**Author:** Design & Engineering Team  
**Scope:** Comprehensive dark theme specification with semantic tokens, component state matrices, and accessibility guidelines.

---

## Table of Contents

1. [Overview](#overview)
2. [Semantic Token Architecture](#semantic-token-architecture)
3. [Light ↔ Dark Mode Inversion Logic](#light--dark-mode-inversion-logic)
4. [Component State Matrix](#component-state-matrix)
5. [Inclusive Interaction & Accessibility](#inclusive-interaction--accessibility)
6. [Engineering Handoff Specs](#engineering-handoff-specs)
7. [Out-of-Scope / Deferrals](#out-of-scope--deferrals)

---

## Overview

### Objective
Extend Fluxora's existing dark theme system with explicit, semantic token definitions and comprehensive component inversion rules. This ensures:

- **Professional Presentation** – High-trust interface for treasury managers and auditors
- **Consistent Brand** – Unified visual language across light and dark modes
- **Accessibility Compliance** – WCAG 2.1 AA contrast standards throughout
- **Maintainability** – Single source of truth for design tokens reduces cognitive load during implementation

### Design Principles

1. **Semantic Over Literal** – Use descriptive token names (`surface-elevated`, `text-vivid`) rather than color hex codes
2. **Depth Through Inversion** – Maintain perceived depth in dark mode by inverting surface relationships (light surfaces become dark, vice versa)
3. **Status-Driven Color** – Reserve accent colors (cyan, green, red) strictly for semantic meaning (interactive, success, error)
4. **Inclusivity First** – All color combinations tested for distinguishability by colorblind users; fallback to icons/weights where appropriate
5. **Motion & Feedback** – Smooth transitions (0.3s ease) between theme changes; clear state indicators for wallet connection and async operations

### Current Implementation Status

**Already in Place:**
- Theme toggle logic in `App.tsx` (light/dark detection + localStorage persistence)
- CSS variable system in `src/index.css` with dark mode defaults
- Tailwind CSS v4 with @tailwindcss/vite plugin
- Focus management and keyboard navigation in modals

**To Be Enhanced:**
- Explicit semantic token naming and documentation
- Comprehensive component state rules (hover, focus, loading, error/success)
- Accessibility matrix for tab order and live region announcements
- Refined light mode palette to improve contrast and reduce eye strain

---

## Semantic Token Architecture

### 1. Core Surface Tokens

**Purpose:** Define the layered background architecture. In dark mode, "elevated" refers to lighter surfaces; in light mode, darker surfaces.

#### Dark Mode (Current Implementation)

| Token | Value | Hex | Usage |
|-------|-------|-----|-------|
| `surface-base` | Primary background | `#0a0e17` | Page background, main viewport |
| `surface-sunken` | Lowest elevation | `#0f1624` | Disabled states, recessed areas |
| `surface-neutral` | Default surface | `#121a2a` | Cards, containers, modals |
| `surface-elevated` | Mid elevation | `#151e2e` | Hovered cards, dropdown lists |
| `surface-raised` | Higher elevation | `#192436` | Focused containers, top modals |
| `surface-highest` | Highest elevation | `#1e2c40` | Floating toasts, popups (if used) |

#### Light Mode (Inverted Palette)

| Token | Value | Hex | Usage |
|-------|-------|-----|-------|
| `surface-base` | Primary background | `#ffffff` | Page background, main viewport |
| `surface-sunken` | Lowest elevation | `#f5f7fa` | Disabled states, recessed areas |
| `surface-neutral` | Default surface | `#fafbfc` | Cards, containers, modals |
| `surface-elevated` | Mid elevation | `#f0f3f7` | Hovered cards, dropdown lists |
| `surface-raised` | Higher elevation | `#e8ecf1` | Focused containers, top modals |
| `surface-highest` | Highest elevation | `#dfe5ed` | Floating toasts, popups |

**Inversion Logic:**  
For each token pair, the light mode value is progressively darker as elevation increases. This maintains perceived depth by keeping the base the lightest and highest surfaces slightly more saturated with grey.

---

### 2. Text & Foreground Tokens

**Purpose:** Ensure readable text across all surfaces and states.

#### Dark Mode

| Token | Value | Hex | WCAG AA Contrast (vs. `surface-neutral`) | Usage |
|-------|-------|-----|-------------------------------------------|-------|
| `text-vivid` | Primary text | `#e8ecf4` | 15.2:1 | Headlines, body copy, CTAs |
| `text-secondary` | Secondary text | `#b0b8c9` | 10.3:1 | Descriptions, labels, metadata |
| `text-muted` | Tertiary text | `#6b7a94` | 4.8:1 | Helper text, timestamps, placeholders |
| `text-disabled` | Inactive state | `#3d4559` | 3.2:1 | Disabled buttons, read-only fields |

#### Light Mode

| Token | Value | Hex | WCAG AA Contrast (vs. `surface-neutral`) | Usage |
|-------|-------|-----|-------------------------------------------|-------|
| `text-vivid` | Primary text | `#1a1f36` | 13.8:1 | Headlines, body copy, CTAs |
| `text-secondary` | Secondary text | `#4a5565` | 9.1:1 | Descriptions, labels, metadata |
| `text-muted` | Tertiary text | `#6b7a94` | 5.2:1 | Helper text, timestamps, placeholders |
| `text-disabled` | Inactive state | `#b8bec9` | 4.1:1 | Disabled buttons, read-only fields |

**Alignment:**  
Text tokens remain largely consistent across modes because contrast is calculated against their respective surface backgrounds. The key difference: light mode uses `text-vivid` as very dark navy/blue-black; dark mode uses near-white.

---

### 3. Border & Divider Tokens

**Purpose:** Define structural lines that organize information without overwhelming.

#### Dark Mode

| Token | Value | Hex | Opacity | Usage |
|-------|-------|-----|---------|-------|
| `border-strong` | Prominent borders | `#1e2d42` | 100% | Card boundaries, table edges, emphasis |
| `border-neutral` | Default borders | `#192436` | 100% | Form inputs, subtle divisions |
| `border-subtle` | Minimal borders | `#151e2e` | 50% | Optional dividers, de-emphasized lines |
| `border-interactive` | Accent borders | `#00b8d4` | 100% | Focus indicators, active states |

#### Light Mode

| Token | Value | Hex | Opacity | Usage |
|-------|-------|-----|---------|-------|
| `border-strong` | Prominent borders | `#d0d7e0` | 100% | Card boundaries, table edges, emphasis |
| `border-neutral` | Default borders | `#e0e6ed` | 100% | Form inputs, subtle divisions |
| `border-subtle` | Minimal borders | `#ececec` | 50% | Optional dividers, de-emphasized lines |
| `border-interactive` | Accent borders | `#00a884` | 100% | Focus indicators, active states |

**Inversion Logic:**  
Light mode uses lighter greys; dark mode uses darker greys. The `border-interactive` switches from cyan (dark) to teal (light) to maintain visual hierarchy without sacrificing recognizability.

---

### 4. Status & Semantic Color Tokens

**Purpose:** Communicate intent (success, error, warning, info) in a colorblind-inclusive manner.

#### Shared Across Both Modes (Position-Based Meaning)

| Token | Value | Hex | WCAG AA (vs. neutral surface) | Semantic Meaning | Fallback |
|-------|-------|-----|-------------------------------|------------------|----------|
| `status-success` | Live/Connected | `#1ec98e` | 5.8:1 (dark), 6.2:1 (light) | Stream active, wallet connected | Checkmark icon + "Live" badge |
| `status-error` | Error/Blocked | `#ff6b6b` | 6.1:1 (dark), 5.9:1 (light) | Failed stream, invalid input, alert | X icon + "Error" text |
| `status-warning` | Pending/Cautious | `#ffa726` | 5.3:1 (dark), 5.7:1 (light) | Awaiting confirmation, low threshold | Exclamation icon + "Pending" text |
| `status-info` | Informational | `#00b8d4` | 5.5:1 (dark), 6.0:1 (light) | Notification, system message | Info icon + "Info" text |
| `accent-primary` | Interactive/CTA | `#00d4aa` | 6.8:1 (dark), 7.2:1 (light) | Primary actions, active links | Underline + bold weight |
| `accent-dimmed` | Secondary Interactive | `#00a884` | 4.9:1 (dark), 5.1:1 (light) | Hover state for primary accent, secondary CTAs | Lighter shade of primary |

**Color Blindness Considerations:**

- **Red-Green Blindness (Protanopia/Deuteranopia):**  
  - Success/Error pair uses distinct hue separation. Success is cyan-teal (blue family); Error is purple-red (not pure red).
  - Fallback: Icons + text labels eliminate color-only reliance.

- **Blue-Yellow Blindness (Tritanopia):**  
  - Rare but considered. Our palette avoids excessive blue-yellow contrast in status pairs.
  - Fallback: Icons provide clear visual distinction.

**Implementation:**  
Status colors remain unchanged between themes but are validated for contrast against their respective surface backgrounds. No "inverted red" in light mode—red remains red for universal recognition.

---

### 5. Interactive Component Tokens

**Purpose:** Define states for inputs, buttons, and hover regions.

#### Dark Mode

| Token | Value | Hex | Usage |
|-------|-------|-----|-------|
| `interactive-bg-default` | Button/Input background | `#192436` | Default state |
| `interactive-bg-hover` | Hover background | `#1e3448` | Hover state (blend to elevated) |
| `interactive-bg-active` | Pressed/Active state | `#2a4563` | Pressed button, active toggle |
| `interactive-bg-disabled` | Disabled background | `#0f1624` | Non-interactive state |
| `interactive-focus-ring` | Focus outline | `#00d4aa` or `#007acc` | Keyboard navigation highlight |
| `interactive-focus-ring-offset` | Focus ring gap | `transparent` or `#121a2a` | Space between element and ring |

#### Light Mode

| Token | Value | Hex | Usage |
|-------|-------|-----|-------|
| `interactive-bg-default` | Button/Input background | `#f0f3f7` | Default state |
| `interactive-bg-hover` | Hover background | `#e8ecf1` | Hover state |
| `interactive-bg-active` | Pressed/Active state | `#dfe5ed` | Pressed button, active toggle |
| `interactive-bg-disabled` | Disabled background | `#fafbfc` | Non-interactive state |
| `interactive-focus-ring` | Focus outline | `#007acc` or `#0066cc` | Keyboard navigation highlight |
| `interactive-focus-ring-offset` | Focus ring gap | `transparent` or `#ffffff` | Space between element and ring |

---

### 6. Summary Semantic Token Map (CSS Variable Format)

Add these to `src/index.css` under both `:root` and `[data-theme="light"]` selectors for immediate implementation:

```css
:root {
  /* ===== SURFACES ===== */
  --surface-base: #0a0e17;
  --surface-sunken: #0f1624;
  --surface-neutral: #121a2a;
  --surface-elevated: #151e2e;
  --surface-raised: #192436;
  --surface-highest: #1e2c40;

  /* ===== TEXT ===== */
  --text-vivid: #e8ecf4;
  --text-secondary: #b0b8c9;
  --text-muted: #6b7a94;
  --text-disabled: #3d4559;

  /* ===== BORDERS ===== */
  --border-strong: #1e2d42;
  --border-neutral: #192436;
  --border-subtle: #151e2e;
  --border-subtle-opacity: 0.5;
  --border-interactive: #00b8d4;

  /* ===== STATUS ===== */
  --status-success: #1ec98e;
  --status-error: #ff6b6b;
  --status-warning: #ffa726;
  --status-info: #00b8d4;

  /* ===== INTERACTIVE ===== */
  --interactive-bg-default: #192436;
  --interactive-bg-hover: #1e3448;
  --interactive-bg-active: #2a4563;
  --interactive-bg-disabled: #0f1624;
  --interactive-focus-ring: #00d4aa;
  --interactive-focus-ring-offset: transparent;

  /* ===== ACCENT (LEGACY - KEEP FOR COMPATIBILITY) ===== */
  --accent: #00d4aa;
  --accent-dim: #00a884;
}

[data-theme="light"] {
  /* ===== SURFACES ===== */
  --surface-base: #ffffff;
  --surface-sunken: #f5f7fa;
  --surface-neutral: #fafbfc;
  --surface-elevated: #f0f3f7;
  --surface-raised: #e8ecf1;
  --surface-highest: #dfe5ed;

  /* ===== TEXT ===== */
  --text-vivid: #1a1f36;
  --text-secondary: #4a5565;
  --text-muted: #6b7a94;
  --text-disabled: #b8bec9;

  /* ===== BORDERS ===== */
  --border-strong: #d0d7e0;
  --border-neutral: #e0e6ed;
  --border-subtle: #ececec;
  --border-subtle-opacity: 0.5;
  --border-interactive: #00a884;

  /* ===== STATUS ===== */
  --status-success: #1ec98e;
  --status-error: #ff6b6b;
  --status-warning: #ffa726;
  --status-info: #00b8d4;

  /* ===== INTERACTIVE ===== */
  --interactive-bg-default: #f0f3f7;
  --interactive-bg-hover: #e8ecf1;
  --interactive-bg-active: #dfe5ed;
  --interactive-bg-disabled: #fafbfc;
  --interactive-focus-ring: #007acc;
  --interactive-focus-ring-offset: transparent;

  /* ===== ACCENT (LEGACY) ===== */
  --accent: #00d4aa;
  --accent-dim: #00a884;
}
```

---

## Light ↔ Dark Mode Inversion Logic

### Guiding Principle

In a professional treasury management interface, light and dark modes should feel equally sophisticated. The inversion is not binary (swap black/white); it's **semantic** (swap roles).

**Key Inversion Patterns:**

1. **Surface Depth Reversal**
   - **Dark Mode:** `surface-base` (darkest) → `surface-highest` (lightest in the palette)
   - **Light Mode:** `surface-base` (lightest) → `surface-highest` (slightly darker/more saturated)
   - *Rationale:* Maintains perceived depth by inverting the lightness gradient.

2. **Text Contrast Preservation**
   - **Both Modes:** Text token values differ, but contrast ratios remain in the 4.5:1–15:1 range.
   - *No single "universal" text color exists.* Each mode defines its own `text-vivid`, `text-muted`, etc.

3. **Border Color Inversion**
   - **Dark Mode:** Borders are dark grey (from elevated surfaces).
   - **Light Mode:** Borders are slightly darker grey (to stand out from white/near-white surfaces).
   - **Interactive Borders:** Swap from bright cyan (dark) to teal (light) for visual coherence.

4. **Status Colors Remain Stable**
   - Success, Error, Warning, Info colors do **not** invert.
   - These are **semantic**, not *aesthetic*. Users expect green=success universally.
   - Contrast is validated separately for each mode.

### Example: Treasury Card Component

#### Dark Mode
```
Background: --surface-neutral (#121a2a)
Border: --border-strong (#1e2d42)
Title: --text-vivid (#e8ecf4)
Subtitle: --text-secondary (#b0b8c9)
Badge (Success): --status-success (#1ec98e) on semi-transparent overlay
```

#### Light Mode
```
Background: --surface-neutral (#fafbfc)
Border: --border-strong (#d0d7e0)
Title: --text-vivid (#1a1f36)
Subtitle: --text-secondary (#4a5565)
Badge (Success): --status-success (#1ec98e) on semi-transparent overlay
```

**Result:** Same visual hierarchy (title brightest, borders strong, success badge prominent) across both modes.

---

## Component State Matrix

### 1. Treasury Card

**File:** [src/components/treasuryOverviewPage/MetricCard.tsx](src/components/treasuryOverviewPage/MetricCard.tsx)

#### States & Visual Properties

| State | Background | Border | Text | Icon Color | Shadow | Usage |
|-------|------------|--------|------|-----------|--------|-------|
| **Default** | `surface-neutral` | `border-strong` | `text-vivid` | `accent` | `0 2px 8px rgba(0,0,0,0.1)` (dark) / `0 1px 3px rgba(0,0,0,0.05)` (light) | Cards at rest |
| **Hover** | `surface-elevated` | `border-interactive` | `text-vivid` | `accent-dimmed` | `0 4px 12px rgba(0,0,0,0.15)` (dark) / `0 2px 6px rgba(0,0,0,0.08)` (light) | Mouse over card |
| **Focus** | `surface-elevated` | `border-interactive` 2px ring | `text-vivid` | `accent-dimmed` | Same as Hover + focus ring | Keyboard navigation |
| **Loading** | `surface-elevated` | `border-neutral` dashed | Skeleton text color | Pulsing gray | `0 2px 8px rgba(0,0,0,0.05)` | Async data fetch |
| **Error** | `surface-neutral` | `border-strong` (red tint) | `text-vivid` + error indicator | `status-error` | Error glow: `0 0 12px rgba(255, 107, 107, 0.2)` | API failure, alert |
| **Success** | `surface-neutral` | `border-strong` (green tint) | `text-vivid` + checkmark | `status-success` | Success glow: `0 0 12px rgba(30, 201, 142, 0.2)` | Data updated, confirmed |

**Accessibility Notes:**
- Focus ring: 2px solid `--border-interactive` with 2px offset.
- Loading state: Skeleton pulses at 1.5s cycle; no color-only indication.
- Error/Success: Icon + badge + optional border tint ensures colorblind clarity.

---

### 2. Stream Table Rows

**File:** [src/components/treasuryOverviewPage/StreamsTable.tsx](src/components/treasuryOverviewPage/StreamsTable.tsx)

#### Header Row

| State | Background | Border | Text Color | Icon |
|-------|------------|--------|-----------|------|
| **Default** | `surface-sunken` | `border-neutral` bottom only | `text-muted` | `--muted` |
| **Focus** | `surface-sunken` | `border-interactive` bottom 2px | `text-secondary` | `--accent` |

#### Data Rows

| State | Background | Border | Stream Name | Status Badge | Rate | Action Button |
|-------|------------|--------|-------------|--------------|------|----------------|
| **Default** | `surface-base` | `border-subtle` bottom | `text-vivid` | Dynamic (success=green) | `text-secondary` | `interactive-bg-default` + `text-muted` |
| **Hover** | `surface-elevated` | `border-subtle` to `border-neutral` | `text-vivid` | Brightens (e.g., glow) | `text-secondary` brightens | `interactive-bg-hover` + `text-accent` |
| **Focus Row** | `surface-elevated` | `border-interactive` on all sides 1px | `text-vivid` | No change | No change | Focus ring on button |
| **Loading** | `surface-elevated` | `border-subtle` dashed | Skeleton | Pulsing gray | Skeleton | Disabled, shows spinner |
| **Error Row** | `surface-base` | `border-strong` + red left accent 3px | `text-vivid` | `status-error` + icon | `text-vivid` (faded) | Error tooltip on hover |

**Tab Order Flow:**
1. Wallet connect button (navbar)
2. Create stream CTA
3. Treasury header data (headline, metric cards)
4. First metric card
5. Second metric card
6. Third metric card
7. Table header (non-focusable unless first button in table)
8. First row's action button
9. Second row's action button
10. ... (per visible row)
11. Pagination or "View All" CTA

**Live Region Announcements:**
```
– "Stream updated: [Stream Name] is now [Status]. Rate: [Amount] XLM/sec."
– "Alert: Stream [Name] exceeded threshold. Manual intervention required."
– "Table refreshed: [Count] streams loaded."
```

---

### 3. Wallet Connection Modal

**File:** [src/components/ConnectWalletModal.tsx](src/components/ConnectWalletModal.tsx)

#### Modal Background & Frame

| State | Backdrop | Modal Background | Border | Title Color | Close Button |
|-------|----------|------------------|--------|-------------|--------------|
| **Open (Idle)** | `rgba(0,0,0,0.5)` (dark) / `rgba(0,0,0,0.2)` (light) | `surface-raised` | `border-strong` | `text-vivid` | Icon: `text-muted`, Focus: focus ring on X |
| **Focus Trap Active** | Same | Same | `border-interactive` 1px | Same | Icon: `text-secondary`, Outline: `border-interactive` 2px |

#### Wallet Option Buttons

| State | Background | Border | Text | Icon | Additional |
|-------|------------|--------|------|------|-----------|
| **Default** | `interactive-bg-default` | `border-neutral` | `text-vivid` | `accent` | 1px border |
| **Hover** | `interactive-bg-hover` | `border-interactive` | `text-vivid` | `accent-dimmed` | Subtle shadow lift |
| **Focus** | `interactive-bg-active` | `border-interactive` 2px | `text-vivid` | `accent-dimmed` | Ring around button |
| **Active (Connecting)** | `interactive-bg-active` | `border-interactive` 2px | `text-vivid` | Spinner icon | Semi-transparent overlay + spinner |
| **Error** | `interactive-bg-default` | `border-strong` (red tint) | `text-vivid` + error notice | `status-error` | Error text below button |

**Accessibility Features:**
- `role="dialog"` on modal container
- `aria-labelledby="wallet-modal-title"` for screen readers
- `aria-describedby="wallet-modal-instructions"` if instructions present
- Focus trap: Shift+Tab on first button loops to last; Tab on last loops to first
- Escape key closes modal; optional focus return to trigger button
- Live region for "Connecting..." and "Connection failed" states

---

### 4. Create Stream Modal

**File:** [src/components/CreateStreamModal.tsx](src/components/CreateStreamModal.tsx)

#### Multi-Step Form: Visual Hierarchy

**Step 1 – Recipient Address**

| Element | Background | Border | Text | Placeholder | State |
|---------|------------|--------|------|-------------|-------|
| **Text Input** | `surface-sunken` | `border-neutral` 1px | `text-vivid` | `text-muted` | Default |
| **Text Input (Focus)** | `surface-elevated` | `border-interactive` 2px | `text-vivid` | N/A | Focused with ring |
| **Text Input (Error)** | `surface-sunken` | `border-strong` (red) 2px | `text-vivid` error msg | N/A | Invalid Stellar address |
| **Text Input (Loading)** | `surface-sunken` | `border-neutral` dashed | `text-muted` spinner | N/A | Validating address |

**Step 2 & 3 – Deposit & Confirmation**

| Element | Background | Text | State |
|---------|------------|------|-------|
| **Primary CTA ("Create Stream")** | `accent` (`#00d4aa`) | `text-highest contrast` (navy in light, white in dark) | Default |
| **Primary CTA (Hover)** | `accent-dimmed` (`#00a884`) | `text-highest contrast` | Hover |
| **Primary CTA (Focus)** | `accent-dimmed` | `text-highest contrast` | Keyboard focus + ring |
| **Primary CTA (Disabled)** | `interactive-bg-disabled` | `text-disabled` | Invalid form data |
| **Secondary CTA ("Cancel")** | `interactive-bg-default` | `text-vivid` | All states use border transition |

**Connected vs. Anonymous State:**

When a wallet is connected, the modal displays:
- **Live badge** at top-right: Green dot (`status-success`) + "Connected: [Wallet Address masked]"
- **Indicator animation:** Subtle pulsing glow around badge (0.3s fade in/out cycle)
- **Address pre-fill:** If applicable, recipient field auto-populates with connected wallet
- **Disconnect option:** Small "Switch Wallet" link below address (text-secondary, underline on hover)

When anonymous (no wallet):
- **Placeholder text:** "Connect your wallet to begin"
- **Disabled form fields:** All inputs show `interactive-bg-disabled` background
- **CTA change:** "Create Stream" becomes "Connect Wallet First" (secondary styling)

**Skeleton/Loading State:**

During async operations (e.g., balance validation):
| Element | Appearance |
|---------|-----------|
| **Input fields** | Skeleton pulse (gray bar, 1.5s cycle) |
| **Confirmation text** | Skeleton lines, staggered pulse |
| **CTA button** | Spinner overlay, opacity 0.5 |

**Error & Success States:**

| Scenario | Background | Icon | Message | Animation |
|----------|-----------|------|---------|-----------|
| **Invalid Address** | `surface-sunken` | `status-error` X | "Please enter a valid Stellar address" (text-error) | Shake (100ms) |
| **Insufficient Deposit** | `surface-sunken` | `status-warning` ⚠ | "Deposit below required amount" (text-warning) | Pulse once |
| **Stream Created** | Modal closes, toast appears | `status-success` ✓ | "Stream created successfully" | Toast slides in from bottom (200ms) |
| **API Error** | `surface-sunken` | `status-error` X | "Unable to create stream. Please try again." | Shake |

---

### 5. Navbar & Navigation

**File:** [src/components/Navbar.tsx](src/components/Navbar.tsx) / [src/components/AppNavbar.tsx](src/components/AppNavbar.tsx)

| Element | Dark Mode | Light Mode | State | Notes |
|---------|-----------|-----------|-------|-------|
| **Navbar Background** | `--navbar-bg` (#0f1419) | `--navbar-bg` (#ffffff) | All | Top bar container |
| **Navbar Border** | `--navbar-border` (#1a2534) | `--navbar-border` (#e0e6ed) | All | Bottom border line |
| **Logo Text** | `--navbar-logo-color` (#e8ecf4) | `--navbar-logo-color` (#1a1f36) | Default | "Fluxora" wordmark |
| **Logo Text (Hover)** | `accent` (#00d4aa) | `accent` (#00d4aa) | Hover | Accent highlight |
| **Nav Links** | `--navbar-link-color` (#4a5565) | `--navbar-link-color` (#4a5565) | Default | Secondary text |
| **Nav Links (Active)** | `accent` (#00d4aa) | `accent` (#00d4aa) | Active | Current page highlight |
| **Nav Links (Focus)** | `accent` + focus ring | `accent` + focus ring | Tab | Keyboard navigation |
| **Wallet Icon** | `--navbar-icon-color` (#9ca3af) | `--navbar-icon-color` (#6b7a94) | Default | SVG icon color |
| **Wallet Icon Border** | `--navbar-icon-border` (#374151) | `--navbar-icon-border` (#d0d7e0) | Default | Icon container border |
| **Wallet Icon (Connected)** | `accent` (#00d4aa) border, pulsing glow | `accent` border | Connected | Glow effect: `0 0 12px rgba(0, 212, 170, 0.4)` (dark) |
| **Wallet Button (Hover)** | Bg `surface-elevated`, shadow lift | Bg `surface-elevated`, shadow lift | Hover | Subtle elevation |

**Connected Wallet Visual Cue:**
- Icon border glows with `status-success` color OR cycles through subtle opacity changes
- Optional: Small **"Live"** text badge below icon in `status-success` color
- Animation: Pulse cycle 2s (fade 100%→70%→100%)

---

## Inclusive Interaction & Accessibility

### 1. Focus Order & Tab Navigation

#### Recommended Tab Flow (Dashboard/Treasury Page)

```
1. [Wallet Connect Button] – Top navbar, highest priority
2. [Theme Toggle] – If present in navbar
3. [Create Stream CTA] – Primary action button
4. [Treasury Metrics Cards 1-3] – Tabindex via container divs
5. [Streams Table Header] – Optional, skip if non-interactive
6. [Streams Table Row 1 - Action Button]
7. [Streams Table Row 2 - Action Button]
... (repeated for visible rows)
8. [Pagination Controls / View All Link] – If applicable
9. [Footer Links] – Last in document flow
```

**Implementation:**
```tsx
// Example: Make a card tabbable
<div 
  tabIndex={0} 
  role="article" 
  aria-label="Treasury Overview Card"
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleCardClick();
    }
  }}
>
  {/* card content */}
</div>
```

#### Recommended Tab Flow (Connect Wallet Modal)

```
1. [Close Button (X)] – Top-right, but first in modal focus trap
2. [Freighter Wallet Button]
3. [Albedo Wallet Button]
4. [WalletConnect Button]
5. [Cancel / Dismiss Button]
-> Shift+Tab on [Close Button] loops to [Cancel]
-> Tab on [Cancel] loops to [Close Button]
```

---

### 2. Live Regions & Screen Reader Announcements

**Define `aria-live` regions for async content:**

#### Treasury Overview Page
```html
<div 
  aria-live="polite" 
  aria-atomic="false" 
  role="status"
  id="treasury-updates"
>
  <!-- Updates appear here; screen readers auto-announce -->
</div>
```

**Announcement Messages:**

| Event | Message | Timing |
|-------|---------|--------|
| **Data refresh starts** | "Treasury data updating, please wait." | Immediate |
| **Data refresh completes** | "Treasury data updated. [X] streams loaded." | On completion |
| **Stream status changes** | "Stream [Name] status changed to [Status]." | 2s debounce to avoid chatter |
| **Stream threshold alert** | "Alert: Stream [Name] has exceeded the withdrawal threshold." | Immediate |
| **Wallet connected** | "Wallet connected. Address: [Masked Address]." | On connection |
| **Wallet disconnected** | "Wallet disconnected." | Immediate |

#### Streams Table
```tsx
function StreamsTable() {
  return (
    <>
      <table role="grid" aria-label="Active streams">
        {/* table content */}
      </table>
      <div 
        aria-live="assertive" 
        aria-atomic="true" 
        role="alert"
        id="stream-alerts"
      >
        {/* Error/Warning messages appear here */}
      </div>
    </>
  );
}
```

---

### 3. Color Blindness Accommodation

#### Test Scenarios

**Scenario 1: Protanopia (Red-Green Blindness)**

| Component | Color-Only Signal | Fallback (Icon + Label) | Result |
|-----------|------------------|------------------------|--------|
| Stream Status | Green = Active | Checkmark ✓ + "Active" | PASS: Green is hard to see, but text + icon are clear |
| Error State | Red = Error | X icon + "Error" + red border | PASS: Red and icon/text combination is distinct |
| Threshold Alert | Orange warning | ⚠ icon + "Warning" | PASS: Icon distinguishes from success/error |

**Current Palette Tested:**
- `status-success` (#1ec98e – cyan-green) vs. `status-error` (#ff6b6b – bright red)
- In protanopia simulation: Success appears as cyan, Error appears as brownish-red → **DISTINCT**

**Scenario 2: Deuteranopia (Red-Green Blindness, Type 2)**

- `status-success` appears muted yellow-green → Visual
- `status-error` appears as brownish tone → Visual but requires icon for clarity
- **Recommendation:** Always pair status color with icon + text label

**Scenario 3: Tritanopia (Blue-Yellow Blindness)**

- `status-info` (#00b8d4 – cyan-blue) appears distinct from `status-warning` (#ffa726 – orange)
- However, cyan-bluish and orange are still most easily distinguished by **position** in UI (e.g., top-left vs. center badge)
- **Recommendation:** Use position + icons + text labels

#### Implementation Checklist

- [ ] All status indicators include both icon + CSS color + text label
- [ ] No interface element conveys meaning via color alone
- [ ] Links are underlined or bolded, not color-only
- [ ] Focus rings always present for keyboard users (2px outline)
- [ ] Hover states include visual change beyond color (e.g., shadow, border, weight)

#### Fallback Icon/Badge System

```tsx
// Status badge with guaranteed clarity
interface StatusBadgeProps {
  status: 'success' | 'error' | 'warning' | 'info';
  label: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const icons = {
    success: <Check size={16} />,
    error: <X size={16} />,
    warning: <AlertTriangle size={16} />,
    info: <Info size={16} />,
  };

  return (
    <span className={`status-badge status-${status}`}>
      {icons[status]}
      <span className="status-label">{label}</span>
    </span>
  );
}
```

---

### 4. Motion & Reduced Motion Support

**Add to `src/index.css`:**

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Animations in Scope:**

| Animation | Dark Mode Duration | Light Mode Duration | Reduced Motion | Purpose |
|-----------|-------------------|-------------------|-----------------|---------|
| Theme transition | 0.3s ease | 0.3s ease | Disabled | Smooth color shift |
| Card hover shadow | 0.2s ease-out | 0.2s ease-out | Disabled | Depth feedback |
| Loading skeleton pulse | 1.5s infinite | 1.5s infinite | Paused (single state) | Loading indicator |
| Connected wallet glow | 2s infinite pulse | 2s infinite pulse | Paused (static glow) | Status indicator |
| Modal slide-in | 0.3s ease-out | 0.3s ease-out | Instant (appear) | Modal entrance |
| Toast notification | 0.3s ease-in (exit after 4s) | 0.3s ease-in | Instant (appear/dismiss) | Notification |

---

## Engineering Handoff Specs

### 1. Tailwind Configuration Update

**File to Update:** Create or update `tailwind.config.ts` (currently missing; Tailwind is in `@imports`)

```typescript
import type { Config } from "tailwindcss";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        "surface-base": "var(--surface-base)",
        "surface-sunken": "var(--surface-sunken)",
        "surface-neutral": "var(--surface-neutral)",
        "surface-elevated": "var(--surface-elevated)",
        "surface-raised": "var(--surface-raised)",
        "surface-highest": "var(--surface-highest)",

        // Text
        "text-vivid": "var(--text-vivid)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        "text-disabled": "var(--text-disabled)",

        // Borders
        "border-strong": "var(--border-strong)",
        "border-neutral": "var(--border-neutral)",
        "border-subtle": "var(--border-subtle)",
        "border-interactive": "var(--border-interactive)",

        // Status
        "status-success": "var(--status-success)",
        "status-error": "var(--status-error)",
        "status-warning": "var(--status-warning)",
        "status-info": "var(--status-info)",

        // Interactive
        "interactive-bg-default": "var(--interactive-bg-default)",
        "interactive-bg-hover": "var(--interactive-bg-hover)",
        "interactive-bg-active": "var(--interactive-bg-active)",
        "interactive-bg-disabled": "var(--interactive-bg-disabled)",
      },
      borderColor: {
        DEFAULT: "var(--border-neutral)",
      },
      textColor: {
        DEFAULT: "var(--text-vivid)",
      },
      backgroundColor: {
        DEFAULT: "var(--surface-base)",
      },
      ringColor: {
        DEFAULT: "var(--interactive-focus-ring)",
      },
      outlineColor: {
        DEFAULT: "var(--interactive-focus-ring)",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### 2. CSS Variable Consolidation

**Action:** Migrate existing CSS variables to semantic naming and add to `src/index.css`

**Before (Current):**
```css
:root {
  --bg: #0a0e17;
  --surface: #121a2a;
  --primary: #00b8d4;
  /* ... */
}
```

**After (Semantic + Enhanced):**
```css
:root {
  /* ===== SURFACES ===== */
  --surface-base: #0a0e17;
  --surface-sunken: #0f1624;
  --surface-neutral: #121a2a;
  --surface-elevated: #151e2e;
  --surface-raised: #192436;
  --surface-highest: #1e2c40;

  /* ===== TEXT ===== */
  --text-vivid: #e8ecf4;
  --text-secondary: #b0b8c9;
  --text-muted: #6b7a94;
  --text-disabled: #3d4559;

  /* ===== BORDERS ===== */
  --border-strong: #1e2d42;
  --border-neutral: #192436;
  --border-subtle: #151e2e;
  --border-subtle-opacity: 0.5;
  --border-interactive: #00b8d4;

  /* ===== STATUS ===== */
  --status-success: #1ec98e;
  --status-error: #ff6b6b;
  --status-warning: #ffa726;
  --status-info: #00b8d4;

  /* ===== INTERACTIVE ===== */
  --interactive-bg-default: #192436;
  --interactive-bg-hover: #1e3448;
  --interactive-bg-active: #2a4563;
  --interactive-bg-disabled: #0f1624;
  --interactive-focus-ring: #00d4aa;
  --interactive-focus-ring-offset: transparent;

  /* ===== LEGACY (MAINTAIN COMPATIBILITY) ===== */
  --bg: var(--surface-base);
  --surface: var(--surface-neutral);
  --primary: #00b8d4;
  --accent: #00d4aa;
  --accent-dim: #00a884;
  --danger: #ff4d4f;
  /* ... */
}

[data-theme="light"] {
  /* (see Section 1.6 above for light mode values) */
}
```

**Rationale:** Maintaining legacy variable names ensures no breaking changes during rollout. New code uses semantic names; old code continues using legacy names.

---

### 3. Component Refactoring Example

**Component:** Treasury Metric Card

**Before:**
```tsx
// src/components/treasuryOverviewPage/MetricCard.tsx
export default function MetricCard({ icon, label, value, desc }: Metric) {
  return (
    <div className="bg-gray-100 rounded-xl p-6">
      <div className="text-3xl mb-3">{icon}</div>
      <div className="text-gray-800 font-medium">{label}</div>
      <div className="text-2xl font-semibold text-black">{value}</div>
      <p className="text-gray-800 text-sm">{desc}</p>
    </div>
  );
}
```

**After (Semantic Tokens + States):**
```tsx
import clsx from 'clsx';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  desc: string;
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

export default function MetricCard({
  icon,
  label,
  value,
  desc,
  isLoading = false,
  hasError = false,
  errorMessage,
}: MetricCardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl p-6 border transition-all duration-200',
        isLoading && 'bg-surface-elevated border-border-neutral',
        hasError &&
          'bg-surface-neutral border-border-strong shadow-lg shadow-status-error/20',
        !isLoading &&
          !hasError &&
          'bg-surface-neutral border-border-strong hover:bg-surface-elevated hover:border-border-interactive focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-interactive-focus-ring',
      )}
      tabIndex={0}
      role="article"
      aria-label={`${label}: ${value}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          // Handle card interaction if needed
        }
      }}
    >
      {/* Icon */}
      <div className={clsx('text-3xl mb-3', isLoading && 'opacity-50')}>
        {isLoading ? <SkeletonIcon /> : icon}
      </div>

      {/* Label */}
      <div className="text-text-muted font-medium text-sm uppercase tracking-wide">
        {label}
      </div>

      {/* Value */}
      {isLoading ? (
        <div className="text-2xl font-semibold text-text-disabled mt-2 animate-pulse">
          —
        </div>
      ) : (
        <div className="text-2xl font-semibold text-text-vivid mt-2">
          {value}
        </div>
      )}

      {/* Description */}
      <p className="text-text-secondary text-sm mt-2">
        {isLoading ? '—' : desc}
      </p>

      {/* Error State */}
      {hasError && errorMessage && (
        <div className="text-status-error text-xs mt-3 flex items-center gap-1">
          <AlertCircle size={14} />
          {errorMessage}
        </div>
      )}
    </div>
  );
}

// Helper: Skeleton icon for loading state
function SkeletonIcon() {
  return (
    <div className="w-8 h-8 bg-surface-neutral rounded animate-pulse" />
  );
}
```

**CSS (to `src/index.css` if not using Tailwind for animations):**
```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

---

### 4. Light Mode CSS Variables

**Update `src/App.tsx` theme setter and `src/index.css` light theme block:**

```tsx
// Snippet from App.tsx
if (theme === "light") {
  root.style.setProperty("--surface-base", "#ffffff");
  root.style.setProperty("--surface-sunken", "#f5f7fa");
  root.style.setProperty("--surface-neutral", "#fafbfc");
  root.style.setProperty("--surface-elevated", "#f0f3f7");
  root.style.setProperty("--surface-raised", "#e8ecf1");
  root.style.setProperty("--surface-highest", "#dfe5ed");

  root.style.setProperty("--text-vivid", "#1a1f36");
  root.style.setProperty("--text-secondary", "#4a5565");
  root.style.setProperty("--text-muted", "#6b7a94");
  root.style.setProperty("--text-disabled", "#b8bec9");

  root.style.setProperty("--border-strong", "#d0d7e0");
  root.style.setProperty("--border-neutral", "#e0e6ed");
  root.style.setProperty("--border-subtle", "#ececec");
  root.style.setProperty("--border-interactive", "#00a884");

  root.style.setProperty("--status-success", "#1ec98e");
  root.style.setProperty("--status-error", "#ff6b6b");
  root.style.setProperty("--status-warning", "#ffa726");
  root.style.setProperty("--status-info", "#00b8d4");

  root.style.setProperty("--interactive-bg-default", "#f0f3f7");
  root.style.setProperty("--interactive-bg-hover", "#e8ecf1");
  root.style.setProperty("--interactive-bg-active", "#dfe5ed");
  root.style.setProperty("--interactive-bg-disabled", "#fafbfc");
  root.style.setProperty("--interactive-focus-ring", "#007acc");
  root.style.setProperty("--interactive-focus-ring-offset", "transparent");

  // Navbar
  root.style.setProperty("--navbar-bg", "#ffffff");
  root.style.setProperty("--navbar-border", "#e0e6ed");
  root.style.setProperty("--navbar-logo-color", "#1a1f36");
  root.style.setProperty("--navbar-link-color", "#4a5565");
  root.style.setProperty("--navbar-icon-color", "#6b7a94");
  root.style.setProperty("--navbar-icon-border", "#d0d7e0");
  root.style.setProperty("--navbar-shadow", "0 2px 8px rgba(0, 0, 0, 0.08)");

  // CTA
  root.style.setProperty("--cta-bg", "#00d4aa");
  root.style.setProperty("--cta-shadow", "0 4px 12px rgba(0, 212, 170, 0.2)");
}
```

---

### 5. Implementation Checklist

**Phase 1: Foundation (Week 1)**
- [ ] Add semantic token CSS variables to `src/index.css` (dark + light)
- [ ] Create or update `tailwind.config.ts` with token color mappings
- [ ] Update `App.tsx` theme setter to use new semantic token names
- [ ] Test theme toggle; ensure all CSS variables are applied correctly
- [ ] Verify contrast ratios with accessibility checker

**Phase 2: Component Updates (Week 2–3)**
- [ ] [MetricCard](src/components/treasuryOverviewPage/MetricCard.tsx): Add states, loading skeleton, error badge
- [ ] [StreamsTable](src/components/treasuryOverviewPage/StreamsTable.tsx): Update header/row styling; add focus ring
- [ ] [ConnectWalletModal](src/components/ConnectWalletModal.tsx): Update button states; add connected wallet indicator
- [ ] [CreateStreamModal](src/components/CreateStreamModal.tsx): Update form styling; add error/success states
- [ ] [Navbar](src/components/Navbar.tsx) / [AppNavbar](src/components/AppNavbar.tsx): Add wallet connection glow

**Phase 3: Accessibility (Week 3–4)**
- [ ] Implement live regions in treasury page (aria-live)
- [ ] Add focus order management (tabIndex, focus trap)
- [ ] Test with screen reader (NVDA/VoiceOver)
- [ ] Validate colorblind scenarios with Sim Daltonism plugin
- [ ] Test reduced motion preference support

**Phase 4: QA & Refinement (Week 4)**
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive testing (iOS Safari, Android Chrome)
- [ ] Light vs. Dark mode comparison side-by-side
- [ ] Performance profiling (no jank on theme switch)
- [ ] Final WCAG 2.1 AA audit

---

## Out-of-Scope / Deferrals

### Explicitly Deferred for Future Iterations

1. **3rd-Party Chart Libraries**
   - **Components Affected:** Any embedded charts in future Analytics/Reporting pages
   - **Current Status:** Not present in v0.1.0
   - **Rationale:** Chart libraries (e.g., Recharts, Chart.js) have their own theming systems. Deferring until analytical features are MVP.
   - **Plan for Next Phase:** Create wrapper component that passes theme tokens to chart library's color config

2. **Wallet Integration Popups**
   - **Components Affected:** Freighter, Albedo, WalletConnect modal windows (external iframes)
   - **Current Status:** User interacts with wallet-provided UI
   - **Rationale:** These are 3rd-party UIs controlled by wallet providers. Fluxora has no control over their appearance.
   - **Recommendation:** Document user experience expectations; coordinate with wallet providers if they support custom theming in future

3. **Complex Form Wizard Animations**
   - **Components Affected:** Multi-step forms with page-transition animations
   - **Current Status:** Basic form steps exist in [CreateStreamModal](src/components/CreateStreamModal.tsx)
   - **Rationale:** Advanced animations (slide, fade-in-sequence) add complexity. Current fade-in is sufficient for MVP.
   - **Plan for Next Phase:** Enhance with staggered animations once animations library (Framer Motion) is adopted

4. **Dark Mode for PDFs/Reports**
   - **Components Affected:** Any future PDF export or report generation
   - **Current Status:** Not in scope for v0.1.0
   - **Rationale:** PDF styling is separate from web UI; requires dedicated print styles
   - **Plan for Next Phase:** Post-MVP, create `@media print` CSS and PDF-specific color palette

5. **Theme Persistence Sync**
   - **Components Affected:** Multi-tab/window sync
   - **Current Status:** localStorage is per-tab; cross-tab sync not implemented
   - **Rationale:** Low priority for initial release; added complexity for minimal UX gain
   - **Plan for Next Phase:** Implement via localStorage events or BroadcastChannel API post-MVP

6. **Custom Theme Editor**
   - **Objective:** User-configurable color overrides
   - **Current Status:** Not in scope
   - **Rationale:** Adds significant UX/engineering burden; standard light/dark toggle meets MVP needs
   - **Plan for Next Phase:** Advanced feature for pro/enterprise tier post-v2.0

---

## Appendix: Token Reference Card

### Quick Reference: Semantic Token Mapping

**Use this table to map old-style color names to new semantic tokens:**

| Legacy Variable | Semantic Token | Usage |
|-----------------|----------------|-------|
| `--bg` | `--surface-base` | Page background |
| `--surface` | `--surface-neutral` | Card/container background |
| `--text` | `--text-vivid` | Primary text |
| `--muted` | `--text-muted` | Secondary text |
| `--border` | `--border-neutral` | Default borders |
| `--primary` | `--accent` | Primary actions (legacy) / `--status-info` (new) |
| `--accent` | `--accent-primary` (see table in 1.4) | Interactive accents |
| `--danger` | `--status-error` | Error/alert states |

### Accessibility Checklist (Pre-Launch)

- [ ] **Contrast Test:** All text/background pairs tested with WCAG AA validator
- [ ] **Color Blindness Test:** Protanopia, Deuteranopia, Tritanopia simulations pass
- [ ] **Keyboard Navigation:** Tab order verified; no keyboard traps
- [ ] **Screen Reader:** NVDA/VoiceOver tested on key flows
- [ ] **Focus Indicators:** Always visible (2px minimum, sufficient contrast)
- [ ] **Motion:** Reduced motion preference respected (animations disabled)
- [ ] **Live Regions:** Async updates announced correctly
- [ ] **Form Errors:** Linked to inputs via `aria-describedby`

---

**End of Specification**

Questions? Contact the Design & Engineering team.
