# Visual Consistency: Marketing Site vs Authenticated App Chrome
## Design Specification (Production-Ready)

**Issue**: Visual consistency: marketing site vs authenticated app chrome  
**Status**: Design Specification for Engineering  
**Date**: March 30, 2026  
**Scope**: Navigation chrome, typography, copy hierarchy, Stellar-specific concepts, feedback states  
**Audience**: Engineering team → implementation without clarification spikes  

---

## 1. EXECUTIVE SUMMARY

Fluxora-Frontend presents two distinct visual surfaces:
1. **Marketing site** (Landing.tsx, Home.tsx) — onboard, inform, build trust
2. **Authenticated app** (Dashboard, Streams, Recipient) — execute, monitor, transact

**Problem**: These surfaces use inconsistent chrome, typography hierarchy, copy style, and interaction feedback. Users experience discontinuity when navigating from marketing → app, and confusion between "read-only information" (marketing) and "actionable state" (app).

**Solution**: This spec establishes **one visual contract** across both surfaces using:
- Unified navigation chrome (Navbar on marketing, AppNavbar + Sidebar on app)
- Consistent component state library (default/hover/focus/loading/empty/error/success)
- Shared copy strategy for Stellar concepts
- WCAG 2.1 AA accessibility baseline on all interactive surfaces

---

## 2. CURRENT STATE ANALYSIS

### 2.1 Marketing Site (Landing Path)
**Components**: Navbar.tsx, HeroSection.tsx, TrustSection.tsx, ValuePropositionSection.tsx, NewsletterSection.tsx

| Aspect | Current State | Issue |
|--------|---------------|-------|
| **Nav chrome** | Navbar.tsx: white logo, cyan accent, theme toggle, "Get started" CTA | Distinct from app navbar; no Stellar network indicator |
| **Typography** | Plus Jakarta Sans; h1 (5-6xl), p (lg body), no defined token system | No shared scale; custom color refs in JSX |
| **CTA copy** | "Get started", "Watch demo" | Action-oriented; inconsistent with app button copy ("Create stream") |
| **Stellar refs** | "Built on Stellar" badge, single-line subheading | No mention of account, network, or wallet context |
| **Theme** | Light/dark toggle; CSS custom properties; stored in localStorage | Works; consistent with app |

### 2.2 Authenticated App (Layout Path)
**Components**: AppNavbar.tsx, Sidebar.tsx, Layout.tsx, Dashboard.tsx, CreateStreamModal.tsx

| Aspect | Current State | Issue |
|--------|---------------|-------|
| **Nav chrome** | AppNavbar.tsx (top): Fluxora logo, page title, theme toggle, connect/disconnect, network badge | Separate from Sidebar; app navbar ≠ marketing navbar |
| **Sidebar** | Sidebar.tsx: nav links (Dashboard, Streams, Recipient), collapse toggle, connect button | Resizable; mobile hamburger; not visible on marketing routes |
| **Typography** | Plus Jakarta Sans; no defined scale; card labels (smaller), values (larger), body text | Same font; inconsistent sizes vs marketing |
| **Buttons** | Inline styles: primary (cyan), secondary (border), icon buttons | No shared state-handling (hover/focus/disabled) |
| **Empty state** | TreasuryEmptyState.tsx: "No streams yet" + onboarding copy | Distinct visual; no consistency with marketing CTA |
| **Modal** | CreateStreamModal.tsx: overlay, 3-step flow, error/success states | Step indicators render inline; no unified modal chrome |
| **Feedback** | Loading spinners, error text in red, success state in CreateStreamModal | No consistent toast, overlay messaging, or live-region pattern |

### 2.3 Identified Inconsistencies

| Surface | Navbar | Page Background | Button Style | Copy Tone | Account Indicator |
|---------|--------|-----------------|--------------|-----------|-------------------|
| **Marketing** | Navbar.tsx | Radial gradient; light/dark | Cyan with shadow; text-white | Action-forward ("Get started") | None |
| **App** | AppNavbar.tsx | CSS var(--bg); consistent dark | Cyan or border; mixed sizing | State-neutral ("Create stream") | Freighter badge + network |
| **Gap** | Two components; different props | Different bg methods | No shared button spec | Conflicting copy strategy | No contextual cues for first-time users |

---

## 3. DESIGN INTENT & VISUAL CONTRACT

### 3.1 Guiding Principles

1. **Single Navigation Grammar**: One way to move between top-level sections
2. **Copy Clarity**: Stellar concepts (account, network, stream, cliff, rate) explained on first UX encounter
3. **State Explicitness**: Every interactive element shows pending/error/success without modal surprise
4. **Inclusive Feedback**: Live regions for async updates; focus management for modals; color ≠ only distinguisher
5. **Marketing-to-App Transition**: Landing → Get Started → Connect Wallet → App Dashboard (no visual whiplash)

### 3.2 Chrome Unification

#### 3.2.1 Navigation Chrome — Unified Navbar
**Decision**: Extend `Navbar.tsx` to work on both marketing and app routes. Replace `AppNavbar.tsx` as primary top chrome.

**Unified Navbar Spec** (All Routes)

```
┌─────────────────────────────────────────────────────────────┐
│  [Fluxora Logo]  [Nav Links OR Page Title]  [Tools] [CTA]  │
│  (left)          (center OR right)          (right) (right) │
└─────────────────────────────────────────────────────────────┘
```

**Component Props** (New interface):
```typescript
interface UnifiedNavbarProps {
  theme: "light" | "dark";
  onThemeToggle: () => void;
  // Marketing mode
  isMobile: boolean;
  mobileMenuOpen?: boolean;
  onMobileMenuToggle?: () => void;
  // App mode (mutually exclusive)
  pageTitle?: string;           // "Dashboard" | "Streams" | "Recipient"
  networkBadge?: "TESTNET" | "MAINNET";  // Show network state
  walletAddress?: string | null; // Freighter indicator or "Connect"
  onWalletClick?: () => void;    // Open ConnectWalletModal
  onDisconnect?: () => void;
}
```

**Navbar Locations**:
- **Marketing route** (`/`, `/landing`): Show nav links (Home, Docs, GitHub), "Get started" CTA
- **App route** (`/app*`): Show page title, network badge, wallet state, theme toggle
- **Sidebar continues** on app routes (collapsed on mobile)

**Visual Spec**:
- Height: `64px` (desktop), `48px` (mobile)
- Background: `var(--navbar-bg)` (light: white #fff, dark: #0f1419)
- Border-bottom: `1px solid var(--navbar-border)`
- Logo: `36px × 36px` SVG (centered, +4px top margin)
- Link text: `14px`, `font-weight: 600`, color: `var(--navbar-link-color)`
- Icon buttons: `32px × 32px` square, border-radius `8px`, hover bg: `rgba(255,255,255,0.08)` (dark), `transparent` (light)
- CTA button: Same as section 3.2.2

#### 3.2.2 Button Spec — Primary & Secondary
**Unified Button Library** (replaces inline styles)

**Primary Button** (Cyan, action-triggering)
```
State: DEFAULT
├─ bg: #00d4aa
├─ text: #0a0e17 (dark text for contrast)
├─ padding: 8px 16px (small), 12px 24px (large)
├─ border-radius: 10px
├─ font-weight: 600
├─ font-size: 14px
├─ box-shadow: 0 4px 12px rgba(0, 212, 170, 0.3)
├─ min-height: 40px (desktop), 36px (mobile)

State: HOVER
├─ bg: #00a884 (dim)
├─ shadow: 0 4px 12px rgba(0, 212, 170, 0.5) [increased]
├─ transform: translateY(-2px) [subtle lift]

State: FOCUS
├─ outline: 2px solid #00d4aa
├─ outline-offset: 2px
├─ all HOVER props applied

State: ACTIVE
├─ transform: translateY(0px) [no lift]
├─ shadow: 0 2px 6px rgba(0, 212, 170, 0.3) [reduced]

State: DISABLED
├─ bg: rgba(0, 212, 170, 0.4)
├─ text: rgba(10, 14, 23, 0.6)
├─ cursor: not-allowed
├─ shadow: none
```

**Secondary Button** (Border, de-emphasizing)
```
State: DEFAULT
├─ bg: transparent (light), rgba(255,255,255,0.04) (dark)
├─ border: 1px solid var(--border)
├─ text: var(--text)
├─ padding: 8px 16px (small), 12px 24px (large)
├─ border-radius: 10px
├─ font-weight: 600
├─ font-size: 14px
├─ min-height: 40px (desktop), 36px (mobile)

State: HOVER
├─ bg: rgba(255,255,255,0.06) (dark), #f5f7fa (light)
├─ border-color: var(--accent) [turquoise]

State: FOCUS
├─ outline: 2px solid var(--accent)
├─ outline-offset: 2px

State: DISABLED
├─ opacity: 0.5
├─ cursor: not-allowed
```

**Icon Button** (32×32, for toolbar, navbar actions)
```
State: DEFAULT
├─ bg: transparent
├─ border: 1px solid rgba(255,255,255,0.08) (dark)
├─ color: var(--text)
├─ size: 32px × 32px
├─ border-radius: 8px
├─ display: inline-flex
├─ align-items: center
├─ justify-content: center

State: HOVER
├─ bg: rgba(255,255,255,0.08) (dark), rgba(0,0,0,0.04) (light)

State: FOCUS
├─ outline: 2px solid var(--accent)
├─ outline-offset: 2px
```

### 3.3 Typography Scale — Unified Tokens

**Establish `src/lib/typography.ts`**:
```typescript
export const typographyScale = {
  // Display (landing hero)
  displayLarge: {
    fontSize: "56px",    // 3.5rem
    lineHeight: "1.2",   // 67.2px
    fontWeight: 700,
    letterSpacing: "-0.02em"
  },
  displayMedium: {
    fontSize: "48px",    // 3rem
    lineHeight: "1.25",  // 60px
    fontWeight: 700,
    letterSpacing: "-0.015em"
  },

  // Heading
  headingLarge: {
    fontSize: "32px",    // 2rem
    lineHeight: "1.3",   // 41.6px
    fontWeight: 700,
    letterSpacing: "-0.01em"
  },
  headingMedium: {
    fontSize: "24px",    // 1.5rem
    lineHeight: "1.35",  // 32.4px
    fontWeight: 700,
    letterSpacing: "0em"
  },
  headingSmall: {
    fontSize: "20px",    // 1.25rem
    lineHeight: "1.4",   // 28px
    fontWeight: 600,
    letterSpacing: "0.01em"
  },

  // Body (app default)
  bodyLarge: {
    fontSize: "16px",    // 1rem
    lineHeight: "1.5",   // 24px
    fontWeight: 400,
    letterSpacing: "0em"
  },
  bodyMedium: {
    fontSize: "14px",    // 0.875rem
    lineHeight: "1.5",   // 21px
    fontWeight: 400,
    letterSpacing: "0.01em"
  },
  bodySmall: {
    fontSize: "12px",    // 0.75rem
    lineHeight: "1.5",   // 18px
    fontWeight: 400,
    letterSpacing: "0.01em"
  },

  // Label (UI chrome: buttons, badges, tabs)
  labelLarge: {
    fontSize: "14px",    // 0.875rem
    lineHeight: "1.4",   // 19.6px
    fontWeight: 600,
    letterSpacing: "0.01em"
  },
  labelMedium: {
    fontSize: "12px",    // 0.75rem
    lineHeight: "1.4",   // 16.8px
    fontWeight: 600,
    letterSpacing: "0.02em"
  },
  labelSmall: {
    fontSize: "11px",    // 0.6875rem
    lineHeight: "1.4",   // 15.4px
    fontWeight: 700,
    letterSpacing: "0.02em"
  }
};
```

**Application**:
- Marketing hero h1: `displayLarge` (light/dark) ✓ (already 56px)
- App page title: `headingLarge` (32px)
- Card labels: `labelMedium` (12px)
- Card values: `bodyLarge` (16px)
- Button text: `labelLarge` (14px)
- Body copy: `bodyMedium` (14px)

---

## 4. STATE SPECIFICATIONS & INTERACTION PATTERNS

### 4.1 Navigation States

#### 4.1.1 Navbar Link (Active, Inactive, Hover)
**Applies to**: Marketing nav links (`Home`, `Docs`, `GitHub`), Sidebar nav links (`Dashboard`, `Streams`, `Recipient`)

```
STATE: DEFAULT (Inactive)
├─ color: var(--navbar-link-color) #4a5565
├─ bg: transparent
├─ font-weight: 500
├─ transition: color 0.2s ease, background 0.2s ease

STATE: HOVER
├─ color: var(--accent) #00d4aa
├─ bg: rgba(255,255,255,0.04) (dark only)
├─ transition: applied

STATE: FOCUS
├─ outline: 2px solid var(--accent)
├─ outline-offset: 4px
├─ color: var(--accent)

STATE: ACTIVE (Current Page)
├─ color: var(--accent) #00d4aa
├─ bg: rgba(0,212,170,0.1)
├─ border-left: 3px solid var(--accent) (Sidebar only)
├─ font-weight: 600
```

**WCAG**: All text ≥ 14px (except labels), color contrast ≥ 4.5:1 (text on bg)

#### 4.1.2 Sidebar Collapse (Desktop)
**Applies to**: Sidebar.tsx

```
STATE: EXPANDED (Default, desktop ≥1024px)
├─ width: 244px
├─ nav labels visible
├─ Logo visible

STATE: HOVER over collapse toggle
├─ bg: rgba(255,255,255,0.06) (dark)
├─ border: 1px solid var(--accent)

STATE: COLLAPSED (After click)
├─ width: 80px (icon-only)
├─ nav labels hidden (title="label" for hover tooltip)
├─ Transition: width 0.22s ease

STATE: MOBILE (viewport ≤768px)
├─ width: 100vw (full-screen overlay)
├─ position: fixed
├─ z-index: 30 (below modals)
├─ Slide-in from left when menu toggle clicked
├─ Close on route change OR backdrop click
```

---

### 4.2 Form & Modal States

#### 4.2.1 Input Field (Text, especially Stellar addresses)
**Applies to**: CreateStreamModal.tsx recipient/deposit fields

```
STATE: DEFAULT (Empty)
├─ border: 1px solid var(--border) #1e2d42
├─ bg: transparent
├─ color: var(--text)
├─ padding: 12px 16px
├─ border-radius: 8px
├─ font-size: 14px
├─ placeholder-color: var(--muted) #6b7a94
├─ min-height: 44px (mobile touch target)

STATE: FOCUS
├─ border: 2px solid var(--accent) #00d4aa
├─ outline: none
├─ box-shadow: 0 0 0 3px rgba(0, 212, 170, 0.1)
├─ bg: rgba(255,255,255,0.02) (light feedback)

STATE: FILLED (Has value)
├─ border: 1px solid var(--border)
├─ color: var(--text) (brighter if valid)

STATE: ERROR (Validation failed)
├─ border: 2px solid #ff4d4f (danger red)
├─ box-shadow: 0 0 0 3px rgba(255, 77, 79, 0.1)
├─ aria-invalid="true"
├─ role="alert" on error message

STATE: DISABLED
├─ opacity: 0.6
├─ cursor: not-allowed
├─ bg: rgba(255,255,255,0.04)
├─ border: 1px solid var(--border)
```

**Helper Text**:
- Under input, `font-size: 12px`, `color: var(--muted)` (default)
- On error, `color: #ff4d4f`, `font-weight: 600`, `role="alert"`

#### 4.2.2 CreateStreamModal — Multi-Step States
**Component**: CreateStreamModal.tsx (3-step flow)

```
STATE: STEP 1 (Recipient & Deposit)
├─ Title: "Create Stream — Step 1 of 3"
├─ Fields: [Recipient address], [Deposit amount]
├─ CTA: [Cancel] [Next]
├─ Focus management: autofocus on recipient input
├─ Validation: inline error on blur/submit

STATE: STEP 2 (Accrual Rate & Duration)
├─ Title: "Create Stream — Step 2 of 3"
├─ Prev state data: Show recipient truncated (GABC...XYZ1) above form
├─ Fields: [Accrual rate USDC/time], [Duration], [Cliff enabled toggle], [Cliff date if enabled]
├─ CTA: [Back] [Next]
├─ Focus management: first form field focused

STATE: STEP 3 (Review & Sign)
├─ Title: "Create Stream — Step 3 of 3 — Ready to sign"
├─ Summary cards:
│  ├─ Recipient: [GABC...XYZ1] [Copy] [Explorer]
│  ├─ Total amount: 1,000 USDC
│  ├─ Rate: 38.62 USDC/month
│  ├─ Duration: 12 months
│  ├─ Start: [date] or "Immediate"
│  ├─ Cliff: [date] or "None"
├─ Warning: "This will submit a transaction to Stellar. Please review carefully."
├─ CTA: [Back] [Create & Sign]
├─ Wallet integration: Opens Freighter sign flow

STATE: SUBMITTING (After "Create & Sign")
├─ Modal overlay: Spinner + "Waiting for wallet signature..."
├─ CTA buttons: disabled
├─ Close button (X): disabled
├─ Escape key: ignored

STATE: SUCCESS
├─ Modal closes → StreamCreatedModal.tsx shows
├─ (See 4.2.3)

STATE: ERROR
├─ Modal stays open
├─ Error message: top of modal, red bg, white text
├─ aria-live="polite" region
├─ CTA: [Try again] [Cancel]
```

#### 4.2.3 StreamCreatedModal — Success Feedback
**Component**: New (or extend CreateStreamModal)

```
STATE: SUCCESS MODAL
├─ Title: "Stream Created ✓"
├─ Icon: Green checkmark (or Lucide Check icon)
├─ Content:
│  ├─ "Your stream is now active on Stellar."
│  ├─ Txn hash: [ABCD1234...XYZ] [Copy] [View on Stellar Expert]
│  ├─ Stream details:
│      ├─ Recipient: [truncated address]
│      ├─ Total: 1,000 USDC
│      ├─ Rate: 38.62 USDC/month
├─ CTA: [View Stream] [Go to Dashboard]
├─ Auto-close: After 10s (or user action)
├─ Live region: aria-live="polite" announces success
```

### 4.3 Data States (Empty, Loading, Error, Success)

#### 4.3.1 Treasury Dashboard — Empty State
**Component**: TreasuryEmptyState.tsx (already exists; enhance)

**Current Issue**: No visible connection to "Get started" CTA on marketing site.

```
STATE: EMPTY (No streams, wallet connected)
├─ Visual:
│  ├─ Illustration: Placeholder SVG (optional; not required for MVP)
│  ├─ Headline: "No active streams yet"
│  ├─ Body: "Create your first stream to begin continuously disbursing capital."
│  ├─ Subtext: "Streams accrue at a rate you define, with optional cliff dates and cliffs."
│  ├─ CTA: Primary ["Create Stream"]
├─ Typography:
│  ├─ Headline: headingMedium (24px, bold)
│  ├─ Body: bodyMedium (14px)
│  ├─ Subtext: bodySmall (12px, muted)
├─ Spacing:
│  ├─ Headline → Body: 12px gap
│  ├─ Body → CTA: 24px gap
├─ Alignment: Centered
├─ Background: card gradient (inherit from section 3.3)
```

**WCAG**: Empty state text ≥ 12px, color ≥ 4.5:1 on bg

#### 4.3.2 Treasury Dashboard — Loading State
**Component**: TreasuryOverviewLoading.tsx (enhance)

```
STATE: LOADING (Fetching streams from API)
├─ Metric cards: Skeleton loader
│  ├─ Pulsing placeholder: bg-gradient animation 1s loop
│  ├─ Placeholder height: same as final value (32px for numbers)
├─ Streams table:
│  ├─ Column headers: visible
│  ├─ Rows: 5–6 skeleton rows
│  ├─ Each row: 3–4 pulsing placeholders
├─ Live region: aria-live="polite" announces "Loading streams…"
```

**Skeleton CSS**:
```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--surface) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    var(--surface) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

#### 4.3.3 Streams Table — Rows (Active, Ending, Paused)
**Component**: StreamRow.tsx

```
STATE: ACTIVE (Stream is accruing)
├─ Visual:
│  ├─ Status badge: "Active" (green bg: #52c41a, dark text)
│  ├─ Rate: "38.62 USDC/month" (bodyMedium)
│  ├─ Accrued: "450.24 USDC" (bodyMedium, accent color)
│  ├─ Action buttons: [View] [Pause] [Withdraw if recipient]
│  ├─ Row hover: bg: rgba(255,255,255,0.04)

STATE: ENDING (Stream nearing cliff or end date)
├─ Status badge: "Ending" (amber bg: #faad14)
├─ Additional: Show end date inline: "Ends 15 April 2026"

STATE: PAUSED (Manual pause or cliff not yet reached)
├─ Status badge: "Paused" (gray bg: #d0d7e0, text: #6b7a94)
├─ Rate display: Grayed (opacity 0.6)
├─ Action: Show [Resume] instead of [Pause]

STATE: ERROR (Payment failed, or contract error)
├─ Status badge: "Error" (red bg: #ff4d4f)
├─ Text: "Issue accruing; contact support"
├─ Action: [View Details] [Contact Support]
```

**Row Accessibility**:
- Table header row: `<thead><tr><th scope="col">Header</th>…</tr></thead>`
- Body rows: `<tbody><tr><td>…</td>…</tr></tbody>`
- Status text (not just color): Always rendered as text

### 4.4 Feedback & Notifications

#### 4.4.1 Toast Notifications (Non-Modal Feedback)
**Pattern**: Use for minor feedback (copy success, warning, info)

```
STATE: SUCCESS TOAST
├─ Position: top-right (or center-top for mobile)
├─ Icon: Checkmark (Lucide Check)
├─ Text: "Copied to clipboard" (bodySmall)
├─ Duration: 3s auto-dismiss
├─ Color: bg: rgba(82, 196, 26, 0.1), text: #52c41a (green)
├─ Transition: Slide in from top, fade out

STATE: WARNING TOAST
├─ Icon: AlertTriangle (Lucide)
├─ Text: "Wallet not connected; connect to create stream"
├─ Color: bg: rgba(250, 173, 20, 0.1), text: #faad14 (amber)
├─ Duration: 6s

STATE: ERROR TOAST
├─ Icon: AlertCircle (Lucide)
├─ Text: "Failed to load streams; retry in 30s"
├─ Color: bg: rgba(255, 77, 79, 0.1), text: #ff4d4f (red)
├─ Duration: 8s (or manual dismiss if important)
├─ Action button: [Retry] optional
```

**Implementation**:
- Render in `Layout.tsx` footer or fixed position
- `aria-live="polite" role="status"` for screen readers
- No auto-close if contains interactive element

#### 4.4.2 Error Boundaries & Recovery
**Applies to**: Dashboard.tsx, Streams.tsx, Recipient.tsx, CreateStreamModal.tsx

```
STATE: API ERROR (Network timeout, 500, etc.)
├─ Rendered in-page:
│  ├─ Headline: "Unable to load [resource]"
│  ├─ Body: "Network error or service unavailable"
│  ├─ Action: [Retry] [Contact Support]
├─ No modal overlay
├─ Remain on current route
├─ Live region: aria-live="assertive" announces error

STATE: VALIDATION ERROR (User input)
├─ Rendered inline (no toast):
│  ├─ Field highlight: border 2px solid #ff4d4f
│  ├─ Helper text: "Please enter a valid Stellar address (56 chars, starts with G)"
│  ├─ aria-invalid="true"
│  ├─ aria-describedby="error-helper-id"
```

---

## 5. ACCESSIBILITY SPECIFICATIONS (WCAG 2.1 AA)

### 5.1 Focus Management

#### 5.1.1 Focus Order (Tab Key)
**Rule**: Focus follows DOM order; logical reading order maintained.

**Focus rings**:
- Outline: `2px solid var(--accent)` (#00d4aa)
- Outline-offset: `2px`
- Applies to: buttons, links, inputs, select
- NOT visible on click (only Tab/Shift+Tab) using `:focus-visible`

**Modals (CreateStreamModal, StreamCreatedModal)**:
- Trap focus inside modal; Tab on last element → first element
- Close (X button) always available
- Escape key closes (first-time friendly)

#### 5.1.2 Skip Links
**Applies to**: Navbar & Layout components

```html
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

- Hidden by default (Tailwind `sr-only`)
- Visible on focus
- Jumps to `id="main-content"` on main section

### 5.2 Color & Contrast

**Baseline**: WCAG AA = 4.5:1 for text, 3:1 for UI components

| Element | Foreground | Background | Ratio | Status |
|---------|-----------|-----------|-------|--------|
| Body text | #e8ecf4 (text) | #0a0e17 (bg) | ~14:1 | ✓ AA |
| Primary button text | #0a0e17 | #00d4aa | ~7:1 | ✓ AA |
| Muted text | #6b7a94 (muted) | #0a0e17 (bg) | ~4.8:1 | ✓ AA (borderline; prefer bodyMedium color for critical text) |
| Link (default) | #00d4aa (accent) | #0a0e17 | ~5.5:1 | ✓ AA |
| Status badge (Active) | #0a0e17 | #52c41a (green) | ~7.5:1 | ✓ AA |
| Status badge (Error) | #ffffff | #ff4d4f (red) | ~6:1 | ✓ AA |

**Rule**: Muted color (#6b7a94) forbidden for actionable text; use `var(--text)` instead.

### 5.3 Semantic HTML & ARIA

#### 5.3.1 Navigation
```html
<nav role="navigation" aria-label="Main navigation">
  <ul>
    <li><a href="/app">Dashboard</a></li>
    <li><a href="/app/streams">Streams</a></li>
    <li><a href="/app/recipient">Recipient</a></li>
  </ul>
</nav>
<!-- Better than: <div class="nav"><span>Dashboard</span>… -->
```

#### 5.3.2 modals
```html
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-desc"
>
  <h2 id="modal-title">Create Stream</h2>
  <p id="modal-desc">3-step form to define recipient, rate, duration…</p>
  <!-- Form content -->
</div>
```

- Modal traps focus
- Escape closes it
- aria-label on close button: "Close dialog"

#### 5.3.3 Form Inputs
```html
<label htmlFor="recipient-input">Recipient address</label>
<input
  id="recipient-input"
  type="text"
  aria-required="true"
  aria-invalid={hasError}
  aria-describedby={hasError ? "recipient-error" : undefined}
  placeholder="GABC1234… (56 characters)"
/>
{hasError && (
  <div id="recipient-error" role="alert" className="error-text">
    Invalid Stellar address
  </div>
)}
```

#### 5.3.4 Live Regions (Async Updates)
```html
<!-- For wallet connection feedback -->
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {connectStatus === 'connected' && 'Wallet connected: GA123…'}
  {connectStatus === 'connecting' && 'Connecting wallet…'}
  {connectStatus === 'error' && 'Wallet connection failed.'}
</div>

<!-- For stream table updates -->
<div aria-live="polite" role="status">
  Loaded {streams.length} active streams
</div>
```

### 5.4 Responsive & Mobile Accessibility

#### 5.4.1 Touch Targets
- Minimum size: `44px × 44px` (iOS) / `48px × 48px` (Android)
- Applied to: Buttons, icon buttons, nav links, form inputs
- Padding safe: Add internal space if visual size smaller

```typescript
// Button minimum height
minHeight: theme === "mobile" ? "48px" : "40px"
```

#### 5.4.2 Mobile Navbar & Sidebar
- Sidebar hamburger toggle: `48px × 48px` minimum
- Mobile navbar height: `48px` (vs `64px` desktop)
- Sidebar overlay: No scrollable body behind (disable on mobile)

### 5.5 Keyboard Navigation Audit Checklist

- [ ] All interactive elements (buttons, links, inputs) reachable via Tab
- [ ] Focus always visible when Tab used
- [ ] No keyboard traps (except modal)
- [ ] Escape closes modals
- [ ] Enter/Space activate buttons
- [ ] Arrow keys navigate tables (optional: best practice)
- [ ] Live regions announce async updates (stream loading, connection status)

---

## 6. COPY STRATEGY & STELLAR CONCEPTS

### 6.1 Unified Terminology

**Never assume user knows Stellar**. Explain on first occurrence.

| Term | Usage | Explanation | Example |
|------|-------|-------------|---------|
| **Stream** | App: primary entity | "A continuous payment flow to a recipient at a defined rate" | "Create your first stream to start disbursing capital" |
| **Rate** | App: accrual-related | "Amount and frequency of disbursal" | "38.62 USDC/month" or "100 USDC/week" |
| **Cliff** | App: optional feature | "A start date when the stream begins accruing; earlier payments cannot be withdrawn" | "Cliff enabled: Accrual begins 15 April 2026" |
| **Recipient** | App: payee | "Stellar account receiving the stream" | "Enter recipient's Stellar address (56 characters, starts with G)" |
| **Stellar address** | App: user input | "Unique account ID on Stellar blockchain" | Masked as `GABC1234…XYZ1` elsewhere; full shown only in form |
| **Epoch / Ledger** | App: optional (MVP defer) | Defer to docs; not needed in UI for MVP | N/A |

### 6.2 Copy Consistency Matrix

| Surface | Phrase | Current | **New (Unified)** |
|---------|--------|---------|-------------------|
| Marketing Hero | Primary CTA | "Get started" | "Start streaming" (or keep "Get started" if brand-consistent) |
| App Dashboard | Empty state CTA | "Create stream" | **Keep: "Create stream"** (consistent with modal title) |
| App Modal | Step 1 title | (none, inferred from modal title) | **"Create stream — Step 1 of 3: Recipient & deposit"** |
| App Modal | Button text | "Next" | **"Continue"** (more friendly; "Next" is clear) — keep "Next" if brand-consistent |
| App Dashboard | Success | (none, manual handoff) | **Toast: "Stream created! View it on the dashboard."** |

### 6.3 Error Messages — Consistent Tone

**Pattern**: [What went wrong] + [Why] + [Action]

```
❌ BAD: "Address invalid."
✓ GOOD: "Please enter a valid Stellar address (56 characters, starts with G)."

❌ BAD: "API error."
✓ GOOD: "Unable to load streams. Check your connection and retry."

❌ BAD: "Wallet disconnected."
✓ GOOD: "Your wallet disconnected. Reconnect to continue creating streams."
```

---

## 7. HANDOFF ARTIFACTS FOR ENGINEERING

### 7.1 File Structure & Component Map

```
src/
├── components/
│   ├── Navbar.tsx (NEW: Unified, replaces split logic)
│   │   └── Props: {theme, isMobile, pageTitle?, networkBadge?, walletAddress?, onThemeToggle, onMobileMenuToggle?, onWalletClick?, onDisconnect?}
│   ├── Sidebar.tsx (ENHANCE: mobile support, focus management)
│   ├── AppNavbar.tsx (DEPRECATE: merge into Navbar.tsx)
│   ├── Layout.tsx (ENHANCE: ConditionalSidebar, main-content ID)
│   ├── Button.tsx (NEW: Shared button component for Primary/Secondary/Icon states)
│   │   └── Props: {variant: "primary" | "secondary" | "icon", size?: "small" | "large", disabled?, loading?, onClick, children}
│   ├── CreateStreamModal.tsx (ENHANCE: live regions, form validation, error states)
│   ├── StreamCreatedModal.tsx (NEW: success feedback with live regions)
│   ├── TreasuryEmptyState.tsx (ENHANCE: copy clarity, stronger CTA)
│   ├── StreamRow.tsx (ENHANCE: status badge color, accessibility)
│   └── …other components
├── lib/
│   ├── typography.ts (NEW: typographyScale export)
│   └── buttonStyles.ts (NEW: shared button state objects)
├── pages/
│   ├── Landing.tsx (USE: new Navbar, marketing chrome)
│   ├── Dashboard.tsx (ENHANCE: set pageTitle prop)
│   ├── Streams.tsx (ENHANCE: set pageTitle prop)
│   ├── Recipient.tsx (ENHANCE: set pageTitle prop)
│   └── …other pages
└── App.tsx (ENHANCE: pass Navbar state down via context or prop drilling)
```

### 7.2 Figma/Design Export Checklist

**If team uses Figma (or equivalent)**:

1. **Component Library**:
   - [ ] Button (Primary, Secondary, Icon) with 5 states each (Default, Hover, Focus, Active, Disabled)
   - [ ] Input field with 4 states (Default, Focus, Error, Disabled)
   - [ ] Status badges (Active, Ending, Paused, Error)
   - [ ] Navbar (Marketing, App)
   - [ ] Sidebar (Expanded, Collapsed, Mobile)

2. **Screens/Flows**:
   - [ ] Landing page (light + dark mode)
   - [ ] Dashboard (empty, loading, with data)
   - [ ] CreateStreamModal (3 steps, error state)
   - [ ] StreamCreatedModal (success)
   - [ ] Error boundary screen

3. **Red Lines / Annotations**:
   - [ ] Spacing grid (8px baseline)
   - [ ] Color tokens (with hex values from index.css)
   - [ ] Type scale reference (to typography.ts)
   - [ ] Focus ring: 2px accent, 2px offset

4. **Dev Mode Handoff**:
   - [ ] Export component instances with specs viewable in Figma DevMode
   - [ ] Link to this spec doc in Figma cover page

### 7.3 Definition of Done Checklist (Dev)

- [ ] **Navbar unified**: Single component used on marketing + app routes; no `AppNavbar.tsx`
- [ ] **Button component**: All buttons use `<Button>` component (primary/secondary/icon variants); no inline styles
- [ ] **Typography tokens**: All text uses `typography.ts` scale; Tailwind classes prefer `text-sm`, `text-base`, etc., mapped to tokens
- [ ] **Focus management**: All interactive elements show 2px cyan focus ring; modals trap focus; Skip link present
- [ ] **Empty state**: Copy mentions "Streams accrue at a rate you define"
- [ ] **CreateStreamModal**: 3 steps labeled; live region for errors; Escape closes
- [ ] **StreamCreatedModal**: Shows success with txn link; auto-close or CTA
- [ ] **Accessibility audit**: WCAG scan passes (axe DevTools or similar)
- [ ] **Mobile responsive**: Navbar 48px, Sidebar overlay 768px breakpoint, touch targets 48px
- [ ] **Copy review**: No "Stellar" jargon without brief explanation

---

## 8. TESTING & VERIFICATION PROCESS

### 8.1 Visual Regression Testing

**Goals**: Catch unintended visual changes; ensure consistency across routes.

#### Test Suite 1: Responsive Breakpoints
Run in Playwright, Cypress, or visual regression tool (Percy, Chromatic):

```typescript
// tests/visual/layout.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Layout responsive", () => {
  test("navbar renders on landing (light mode)", async ({ page }) => {
    await page.goto("http://localhost:5173/");
    await expect(page).toHaveScreenshot("landing-navbar-light-desktop.png");
    
    // Also capture mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page).toHaveScreenshot("landing-navbar-light-mobile.png");
  });

  test("navbar renders on app dashboard (dark mode)", async ({ page }) => {
    await page.goto("http://localhost:5173/app");
    // Assumes auth token in localStorage or session
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page).toHaveScreenshot("dashboard-navbar-dark-desktop.png");
  });

  test("sidebar collapses on toggle (desktop)", async ({ page }) => {
    await page.goto("http://localhost:5173/app");
    const toggleBtn = page.locator("[data-testid='sidebar-collapse-toggle']");
    await toggleBtn.click();
    await expect(page).toHaveScreenshot("sidebar-collapsed.png");
  });

  test("sidebar opens on mobile hamburger", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("http://localhost:5173/app");
    const hamburger = page.locator("[data-testid='mobile-menu-toggle']");
    await hamburger.click();
    await expect(page).toHaveScreenshot("sidebar-mobile-open.png");
  });
});
```

#### Test Suite 2: Component States
```typescript
// tests/visual/button.spec.ts
test.describe("Button component", () => {
  test("primary button states", async ({ page }) => {
    await page.goto("http://localhost:5173/storybook"); // or dedicated test page
    
    // Default
    const btn = page.locator("[data-testid='btn-primary-default']");
    await expect(btn).toHaveScreenshot("btn-primary-default.png");
    
    // Hover
    await btn.hover();
    await expect(btn).toHaveScreenshot("btn-primary-hover.png");
    
    // Focus
    await page.keyboard.press("Tab");
    await expect(btn).toHaveScreenshot("btn-primary-focus.png");
    
    // Disabled
    await page.locator("[data-testid='btn-primary-disabled']").screenshot({ path: "btn-primary-disabled.png" });
  });
});
```

### 8.2 Functional Testing

#### Test Suite 3: Navigation & Focus
```typescript
// tests/functional/accessibility.spec.ts
test.describe("Keyboard navigation", () => {
  test("focus ring visible on navbar links (Tab key)", async ({ page }) => {
    await page.goto("http://localhost:5173/");
    
    // Tab to first nav link
    await page.keyboard.press("Tab");
    const navLink = page.locator("nav a").first();
    
    // Check focus
    const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute("href"));
    expect(focusedElement).toBeTruthy();
    
    // Verify outline visible (computed styles or custom focus-visible class)
    const outline = await navLink.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return `${style.outlineWidth} solid ${style.outlineColor}`;
    });
    expect(outline).toContain("2px");
    expect(outline).toContain("rgb(0, 212, 170)"); // #00d4aa
  });

  test("modal focus trap: Tab on last element → first element", async ({ page }) => {
    await page.goto("http://localhost:5173/app");
    
    // Open CreateStreamModal
    const createBtn = page.locator("button:has-text('Create stream')");
    await createBtn.click();
    
    // Get all focusable elements
    const focusable = await page.locator(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    ).all();
    const lastElement = focusable[focusable.length - 1];
    
    // Focus last and press Tab
    await lastElement.focus();
    await page.keyboard.press("Tab");
    
    // Should focus first focusable element in modal
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
    expect(focused).toBe("modal-first-focusable");
  });

  test("skip link present and functional", async ({ page }) => {
    await page.goto("http://localhost:5173/");
    
    // Tab once to reach skip link
    await page.keyboard.press("Tab");
    
    const skipLink = page.locator("a:has-text('Skip to main content')");
    expect(await skipLink.isVisible()).toBe(true); // visible on focus
    
    // Click it
    await skipLink.click();
    
    // Should focus main content
    const main = await page.evaluate(() => document.activeElement?.id);
    expect(main).toBe("main-content");
  });
});
```

#### Test Suite 4: Form Validation & Error States
```typescript
// tests/functional/createStreamModal.spec.ts
test.describe("CreateStreamModal step 1", () => {
  test("invalid recipient shows error message + red outline", async ({ page }) => {
    await page.goto("http://localhost:5173/app");
    
    const createBtn = page.locator("button:has-text('Create stream')");
    await createBtn.click();
    
    // Focus recipient input (should auto-focus)
    const recipientInput = page.locator("[data-testid='recipient-input']");
    expect(await recipientInput.evaluate((el) => el === document.activeElement)).toBe(true);
    
    // Type invalid address
    await recipientInput.fill("INVALID");
    
    // Press Next
    await page.locator("button:has-text('Continue')").click();
    
    // Error displayed
    const errorMsg = page.locator("[role='alert']");
    await expect(errorMsg).toContainText("Please enter a valid Stellar address");
    
    // Input border is red
    const border = await recipientInput.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.borderColor;
    });
    expect(border).toContain("255"); // red channel high
  });

  test("valid recipient + deposit → enables Next button", async ({ page }) => {
    await page.goto("http://localhost:5173/app");
    
    const createBtn = page.locator("button:has-text('Create stream')");
    await createBtn.click();
    
    // Fill form
    await page.locator("[data-testid='recipient-input']").fill("GABC1234567890XYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNO");
    await page.locator("[data-testid='deposit-input']").fill("1000");
    
    // Next button should be enabled
    const nextBtn = page.locator("button:has-text('Continue')");
    expect(await nextBtn.isDisabled()).toBe(false);
  });
});
```

#### Test Suite 5: Async Feedback & Live Regions
```typescript
// tests/functional/liveRegions.spec.ts
test.describe("Live regions + async feedback", () => {
  test("stream creation success announces via live region", async ({ page }) => {
    // Intercept API to return success
    await page.route("**/streams", (route) => {
      route.abort("failed"); // Simulate immediate response
    });
    
    // ... (set up modal and fill form)
    
    // Submit form
    await page.locator("button:has-text('Create & Sign')").click();
    
    // Wait for success modal
    const successModal = page.locator("[role='status']:has-text('Stream Created')");
    await successModal.waitFor({ state: "visible" });
    
    // Check live region announcement (parse aria-live text)
    const liveRegion = page.locator("[aria-live='polite']");
    const text = await liveRegion.textContent();
    expect(text).toContain("Stream created");
  });

  test("Wallet connection status announces via live region", async ({ page }) => {
    await page.goto("http://localhost:5173/app");
    
    // Open wallet modal
    const connectBtn = page.locator("button:has-text('Connect Wallet')");
    await connectBtn.click();
    
    // Select Freighter
    await page.locator("button:has-text('Freighter')").click();
    
    // Live region should say "connecting"
    const liveRegion = page.locator("[aria-live='polite']");
    const text = await liveRegion.textContent();
    expect(text).toContain("Connecting wallet...");
  });
});
```

### 8.3 Accessibility Audit Testing

#### Test Suite 6: Automated A11y Scan
```typescript
// tests/a11y/audit.spec.ts
import { injectAxe, checkA11y } from "axe-playwright";

test.describe("WCAG 2.1 AA compliance", () => {
  test("landing page passes axe scan", async ({ page }) => {
    await page.goto("http://localhost:5173/");
    
    await injectAxe(page);
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });

  test("app dashboard passes axe scan", async ({ page }) => {
    // Assume logged-in state
    await page.goto("http://localhost:5173/app");
    
    await injectAxe(page);
    await checkA11y(page, null, {
      rules: {
        "color-contrast": { enabled: true }, // Ensure 4.5:1
        "aria-required-attr": { enabled: true },
        "label": { enabled: true },
      },
    });
  });

  test("CreateStreamModal passes axe scan", async ({ page }) => {
    await page.goto("http://localhost:5173/app");
    
    // Open modal
    await page.locator("button:has-text('Create stream')").click();
    
    await injectAxe(page);
    await checkA11y(page, "[role='dialog']");
  });
});
```

#### Manual Checklist: A11y Verification
Run after automated tests for edge cases:

```markdown
### Keyboard Navigation
- [ ] All interactive elements reachable via Tab (no skips)
- [ ] Focus moves in logical order (left-to-right, top-to-bottom)
- [ ] Focus ring always visible (2px cyan)
- [ ] No focus traps outside modals

### Screen Reader (NVDA/JAWS/VoiceOver)
- [ ] Page title announced on page load
- [ ] Skip link announced before nav
- [ ] Form labels associated with inputs (aria-label or <label>)
- [ ] Buttons labeled clearly (no "Click here" buttons)
- [ ] Live regions announce stream creation, connection status
- [ ] Error messages read aloud immediately (role="alert")
- [ ] Status badges include text (not only color)

### Color & Contrast
- [ ] All text ≥ 4.5:1 on background (use WebAIM contrast checker)
- [ ] Muted color (#6b7a94) NOT used for actionable text
- [ ] Status indicated by icon + text (not color alone)

### Mobile & Touch
- [ ] Touch targets ≥ 48px × 48px
- [ ] No two-finger gestures required (except pinch-zoom)
- [ ] Sidebar accessible on mobile (hamburger toggle)
- [ ] Form inputs resize up on mobile focus (no zoom-in req'd)

### Responsive
- [ ] Layout reflows at 320px, 768px, 1024px breakpoints
- [ ] Text readable without horizontal scroll
- [ ] Images load responsively (sizes attribute or srcset)
```

### 8.4 User Testing Scenarios (Optional, recommend for later release)

| Scenario | Task | Success Criteria |
|----------|------|------------------|
| **Onboard new user (cold start)** | Land on marketing → click "Get started" → Create wallet → Create stream | Task time < 5 min; no confusion on Stellar address format |
| **Existing user → Create stream** | Log in → Dashboard → Click "Create stream" → Fill 3-step form → Submit | Modal steps clear; no re-entry needed; success feedback visible |
| **Mobile user → Connect wallet** | Visit on mobile → Tap navbar connect → Select wallet → Authorize | Freighter/WC flows work; focus not lost; all 48px+ targets |
| **Accessibility user (screen reader)** | Navigate Dashboard with NVDA/JAWS; create stream flow | All text readable; live regions announce status changes; no ambiguous buttons |
| **First 100 users (QA)** | Full end-to-end: land → connect → create → withdraw → disconnect | No console errors; all CSS applied; no focus loss; toast msgs visible |

### 8.5 Regression Test Automation (CI/CD Integration)

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  pull_request:
    paths:
      - 'src/**'
      - 'tests/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - run: npm run test:a11y
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

## 9. SIGN-OFF CHECKLIST & DEFERRALS

### 9.1 Definition of Done (Final Approval)

**Engineering checklist** (before merge to main):
- [ ] Navbar unified (one component, both marketing + app routes)
- [ ] Button component (shared styles, all 5 states working)
- [ ] Typography tokens defined in `src/lib/typography.ts`
- [ ] Focus ring visible on all interactive elements (Tab key)
- [ ] Modal focus trap working (Tab cycles within modal)
- [ ] Live regions announce async updates (console confirms `aria-live` text)
- [ ] Touch targets ≥ 44px on desktop, 48px on mobile
- [ ] Error messages in red with helper text (not just color)
- [ ] Empty state copy mentions "Streams accrue at a rate"
- [ ] All tests pass (visual regression + functional + a11y)

**Design/PM checklist** (before shipping to users):
- [ ] Design review completed (Slack or meeting notes linked in PR)
- [ ] Copy tone consistent across marketing + app
- [ ] Stellar concepts explained in UI (e.g., "recipient = Stellar account")
- [ ] No open questions on core flows (streams, connect, withdraw)
- [ ] Mobile responsive verified by QA on real devices (iOS + Android)
- [ ] A11y audit passed (axe DevTools screenshot in PR)

### 9.2 Known Deferrals (Rationale & Owners)

| Feature | Deferral | Rationale | Owner | Target Release |
|---------|----------|-----------|-------|-----------------|
| **Epoch / Ledger display** | Not in scope | Stellar jargon; add to advanced UI later | @backend-lead | v0.2 |
| **Internationalization (i18n)** | MVP English only | Build i18n infra after core flows stable | @frontend-lead | v0.3+ |
| **Dark mode toggle on app navbar** | Theme toggle present but styling incomplete | Light/dark CSS vars set; refine admin panel UI later | @design-lead | v0.2 |
| **Withdrawal flow** | Recipient portal layout only; no txn UX | Wait for backend withdraw endpoint | @recipient-owner | v0.2 |
| **Network switching (Testnet ↔ Mainnet)** | Dropdown stub in navbar; no wallet integration | Freighter doesn't expose network-switch API yet | @integration-lead | v0.2+ |
| **Tooltip on hover (desktop)** | Deferred for mobile parity | May add after confirming mobile UX patterns don't conflict | @design-lead | v0.2 |
| **Copy feedback (grammar review)** | Audit complete; final wordsmith later | Submit to UX writer for voice/tone pass | @content-lead | Before v0.1 ship |

---

## 10. IMPLEMENTATION ROADMAP (96-HOUR SPRINT)

### Phase 1: Foundation (Hours 0–24)
**Goal**: Unified Navbar, Button component, typography tokens ready for use

- [ ] **Navbar.tsx refactor**: Merge Navbar.tsx + AppNavbar.tsx logic into single component
  - [ ] Props interface updated (section 3.2.1)
  - [ ] Conditional rendering (marketing links vs page title + wallet state)
  - [ ] Mobile hamburger toggle + Sidebar coordination
  - [ ] Tests: visual regression (landing, dashboard, both themes)

- [ ] **Button.tsx component**: Extract button logic from inline styles
  - [ ] Props: variant (primary/secondary/icon), size, state (disabled, loading)
  - [ ] CSS: 5 states per variant (section 3.2.2)
  - [ ] Tests: visual regression + focus ring verification

- [ ] **typography.ts**: Define scale tokens
  - [ ] Export `typographyScale` object (section 3.3)
  - [ ] Update Tailwind config to reference scale (optional; or use object directly)
  - [ ] Apply to key components (h1, `.card-label`, buttons)

**Deliverable**: PR ready for review; no breaking changes to routing

### Phase 2: App Chrome & States (Hours 24–48)
**Goal**: All interactive surfaces (modal, empty, loading, error) spec-compliant

- [ ] **CreateStreamModal.tsx**: Enhance with specs (section 4.2.2)
  - [ ] Step indicators + live region announcements
  - [ ] Error handling: inline validation + aria-invalid
  - [ ] Focus trap + Escape key handling
  - [ ] Tests: validation logic, error states

- [ ] **StreamCreatedModal.tsx**: Build success feedback component (section 4.2.3)
  - [ ] Txn hash display + copy button
  - [ ] Live region: "Stream created"
  - [ ] CTA buttons: [View] [Go to Dashboard]
  - [ ] Tests: component render + live region text

- [ ] **Dashboard empty/loading states** (sections 4.3.1–4.3.2)
  - [ ] TreasuryEmptyState.tsx: Copy updated, CTA styled with new Button
  - [ ] TreasuryOverviewLoading.tsx: Skeleton animations consistent
  - [ ] Tests: visual regression

- [ ] **Sidebar enhancements** (section 4.1.2)
  - [ ] Collapse animation (0.22s ease)
  - [ ] Mobile overlay + backdrop
  - [ ] Focus management (first link focused on open)
  - [ ] Tests: mobile hamburger interaction

**Deliverable**: PR with CreateStreamModal + new modal; all previously merged

### Phase 3: Accessibility & Testing (Hours 48–72)
**Goal**: WCAG 2.1 AA compliance; focus management verified; live regions working

- [ ] **Focus management**
  - [ ] Skip link added to Layout + visible on focus
  - [ ] Focus ring (2px cyan) visible on all interactive elements
  - [ ] Modal focus trap tested (Tab cycles)
  - [ ] Tests: keyboard navigation (axe + manual)

- [ ] **Live regions**
  - [ ] Wallet connection status (aria-live="polite")
  - [ ] Stream creation feedback (aria-live="polite" on modal)
  - [ ] Error alerts (role="alert")
  - [ ] Tests: `aria-live` text announced in axe scan

- [ ] **Color & contrast**
  - [ ] Verify all text ≥ 4.5:1 (WebAIM checker)
  - [ ] Status badges: color + text (not color alone)
  - [ ] Muted color restricted to secondary-only contexts
  - [ ] Tests: contrast checker assertions

- [ ] **Responsive & mobile**
  - [ ] Navbar 48px mobile, 64px desktop
  - [ ] Touch targets ≥ 48px
  - [ ] Sidebar overlay on mobile; sidebar visible on desktop
  - [ ] Tests: visual regression at 375px, 768px, 1280px

- [ ] **Axe DevTools scan**
  - [ ] Landing, Dashboard, Streams, Recipient pages
  - [ ] CreateStreamModal (when open)
  - [ ] Fix critical issues (empty alt text, missing labels, etc.)
  - [ ] Report: 0 violations of WCAG AA

**Deliverable**: PR labeled "a11y: focus + live regions + contrast"; passes all axe tests

### Phase 4: Copy, Docs & Sign-Off (Hours 72–96)
**Goal**: Copy reviewed, docs finalized, team sign-off

- [ ] **Copy audit** (section 6.2–6.3)
  - [ ] Stellar concepts explained (in UI or linked docs)
  - [ ] Error messages follow pattern [What] + [Why] + [Action]
  - [ ] CTA buttons consistent ("Create stream" on app, "Get started" on marketing)
  - [ ] Empty state: "Streams accrue at a rate you define" visible

- [ ] **Design docs & handoff**
  - [ ] Update PR description with link to this spec
  - [ ] Figma (if available): component library published; DevMode specs linked
  - [ ] Create `src/DESIGN_TOKENS.md` (color, spacing, type scale reference for future devs)

- [ ] **Final testing**
  - [ ] Run all test suites (visual, functional, a11y)
  - [ ] Manual QA: 5+ minute user flows (land → create → withdraw)
  - [ ] Mobile device testing (iOS Safari, Android Chrome)

- [ ] **Sign-off**
  - [ ] Design lead approves visual consistency (Slack/review)
  - [ ] PM confirms copy & Stellar concepts clear
  - [ ] Engineering lead clears technical debt/coverage
  - [ ] Ship to production 🚀

**Deliverable**: Final PR; merge to main; tag release v0.1

---

## 11. APPENDIX: CODE EXAMPLES

### A. Navbar.tsx (Unified Component Sketch)
```typescript
// src/components/Navbar.tsx
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Button from "./Button";

interface NavbarProps {
  theme: "light" | "dark";
  onThemeToggle: () => void;
  // Marketing mode
  isMobile?: boolean;
  onMobileMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
  // App mode (mutually exclusive)
  pageTitle?: string;
  networkBadge?: "TESTNET" | "MAINNET";
  walletAddress?: string | null;
  onWalletClick?: () => void;
  onDisconnect?: () => void;
}

export default function Navbar({
  theme,
  onThemeToggle,
  isMobile = false,
  onMobileMenuToggle,
  mobileMenuOpen = false,
  pageTitle,
  networkBadge,
  walletAddress,
  onWalletClick,
  onDisconnect,
}: NavbarProps) {
  const { pathname } = useLocation();
  const isAppRoute = pathname.startsWith("/app");

  return (
    <nav style={styles.navbar} role="navigation" aria-label="Main navigation">
      <div style={styles.container}>
        {/* Logo */}
        <Link to={isAppRoute ? "/app" : "/"} style={styles.logoLink} aria-label="Fluxora home">
          <svg width="36" height="36" viewBox="0 0 46 46" fill="none">
            {/* SVG content */}
          </svg>
        </Link>

        {/* Center: Marketing nav OR page title */}
        {!isAppRoute ? (
          <nav style={styles.marketingNav} className={isMobile ? "hidden md:flex" : ""}>
            <Link to="/" style={styles.navLink}>Home</Link>
            <Link to="/docs" style={styles.navLink}>Docs</Link>
            <a href="https://github.com/…" style={styles.navLink}>GitHub</a>
          </nav>
        ) : (
          <div style={styles.pageTitle}>{pageTitle || "Dashboard"}</div>
        )}

        {/* Right: Tools + CTA */}
        <div style={styles.rightContainer}>
          {/* Theme toggle */}
          <Button variant="icon" onClick={onThemeToggle} aria-label="Toggle theme">
            {theme === "light" ? "🌙" : "☀️"}
          </Button>

          {/* Network badge (app only) */}
          {networkBadge && (
            <div style={styles.networkBadge}>
              <span style={{ fontSize: "11px", fontWeight: 700 }}>{networkBadge}</span>
            </div>
          )}

          {/* Wallet state / CTA */}
          {!isAppRoute ? (
            <Button variant="primary" onClick={() => { /* navigate to connect */ }}>
              Get started
            </Button>
          ) : walletAddress ? (
            <div style={styles.walletDropdown}>
              <Button size="small" onClick={onWalletClick}>
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </Button>
            </div>
          ) : (
            <Button variant="primary" onClick={onWalletClick}>
              Connect wallet
            </Button>
          )}
        </div>

        {/* Mobile hamburger */}
        {isMobile && (
          <Button
            variant="icon"
            onClick={onMobileMenuToggle}
            data-testid="mobile-menu-toggle"
            aria-label="Toggle mobile menu"
          >
            ☰
          </Button>
        )}
      </div>
    </nav>
  );
}

const styles = {
  navbar: {
    height: "64px",
    display: "flex",
    alignItems: "center",
    borderBottom: "1px solid var(--navbar-border)",
    background: "var(--navbar-bg)",
    padding: "0 2rem",
  },
  container: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "2rem",
  },
  logoLink: {
    textDecoration: "none",
    color: "var(--navbar-logo-color)",
  },
  marketingNav: {
    display: "flex",
    gap: "2rem",
    flex: 1,
    justifyContent: "center",
  },
  navLink: {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--navbar-link-color)",
    textDecoration: "none",
    transition: "color 0.2s ease",
  },
  pageTitle: {
    fontSize: "20px",
    fontWeight: 700,
    color: "var(--text)",
    flex: 1,
  },
  rightContainer: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  networkBadge: {
    padding: "4px 12px",
    background: "rgba(0, 212, 170, 0.1)",
    border: "1px solid var(--border)",
    borderRadius: "20px",
    color: "var(--accent)",
  },
  walletDropdown: {
    position: "relative",
  },
};
```

### B. Button.tsx (Shared Component)
```typescript
// src/components/Button.tsx
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "icon";
  size?: "small" | "large";
  loading?: boolean;
  children: React.ReactNode;
}

export default function Button({
  variant = "primary",
  size = "large",
  loading = false,
  disabled = false,
  children,
  ...props
}: ButtonProps) {
  const style = getButtonStyle(variant, size, disabled);

  return (
    <button
      style={style}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}

function getButtonStyle(variant: string, size: string, disabled: boolean) {
  const baseStyle = {
    fontSize: "14px",
    fontWeight: 600,
    borderRadius: "10px",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.2s ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
  };

  const sizeStyle = size === "small" 
    ? { padding: "8px 16px", minHeight: "36px" }
    : { padding: "12px 24px", minHeight: "44px" };

  if (variant === "primary") {
    return {
      ...baseStyle,
      ...sizeStyle,
      backgroundColor: disabled ? "rgba(0, 212, 170, 0.4)" : "var(--accent)",
      color: "#0a0e17",
      boxShadow: disabled ? "none" : "0 4px 12px rgba(0, 212, 170, 0.3)",
      opacity: disabled ? 0.6 : 1,
    };
  }

  if (variant === "secondary") {
    return {
      ...baseStyle,
      ...sizeStyle,
      backgroundColor: disabled ? "rgba(255,255,255,0.02)" : "transparent",
      color: "var(--text)",
      border: `1px solid var(--border)`,
      opacity: disabled ? 0.5 : 1,
    };
  }

  if (variant === "icon") {
    return {
      ...baseStyle,
      width: "32px",
      height: "32px",
      padding: "0",
      backgroundColor: "transparent",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "var(--text)",
    };
  }

  return baseStyle;
}
```

### C. CreateStreamModal.tsx Enhancement (Focus Trap + Live Region)
```typescript
// src/components/CreateStreamModal.tsx (excerpt)
import { useEffect, useRef } from "react";
import Button from "./Button";

export default function CreateStreamModal({ isOpen, onClose, onStreamCreated }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Focus trap + Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "Tab") {
        const focusable = modalRef.current?.querySelectorAll(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
        );
        if (!focusable || focusable.length === 0) return;

        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Live region for announcements */}
      <div aria-live="polite" role="status" className="sr-only">
        {currentStep === 1 && "Step 1 of 3: Enter recipient and deposit amount"}
        {currentStep === 2 && "Step 2 of 3: Set accrual rate and duration"}
        {currentStep === 3 && "Step 3 of 3: Review and confirm"}
        {error && `Error: ${error}`}
      </div>

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-desc"
        style={styles.modal}
      >
        <div style={styles.modalHeader}>
          <h2 id="modal-title">Create stream — Step {currentStep} of 3</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={styles.closeBtn}
          >
            ✕
          </button>
        </div>

        {error && (
          <div role="alert" style={styles.errorBanner}>
            {error}
          </div>
        )}

        {/* Form fields based on step */}
        <form style={styles.form}>
          {currentStep === 1 && (
            <>
              <label htmlFor="recipient-input">Recipient address</label>
              <input
                id="recipient-input"
                type="text"
                aria-required="true"
                aria-invalid={error ? "true" : "false"}
                aria-describedby={error ? "recipient-error" : undefined}
                placeholder="GABC1234… (56 characters)"
                autoFocus
                style={styles.input}
              />
              {error && <div id="recipient-error" role="alert" style={styles.errorText}>{error}</div>}
            </>
          )}
          {/* … other steps */}
        </form>

        <div style={styles.modalFooter}>
          {currentStep > 1 && <Button variant="secondary" onClick={() => setCurrentStep(currentStep - 1)}>Back</Button>}
          <Button variant="primary" onClick={handleNext}>
            {currentStep === 3 ? "Create & Sign" : "Continue"}
          </Button>
        </div>
      </div>
    </>
  );
}
```

---

## 12. CONCLUSION & NEXT STEPS

This spec ensures that Fluxora-Frontend presents a **cohesive visual contract** across marketing and authenticated surfaces. By unifying navigation chrome, button styles, typography, and state handling, we reduce cognitive load for users transitioning from marketing → onboarding → app.

**Key wins**:
✓ Single Navbar component (marketing + app routes)  
✓ Shared Button spec (primary, secondary, icon; 5 states each)  
✓ WCAG 2.1 AA focus management (skip links, focus traps, live regions)  
✓ Clear Stellar concepts (recipient, stream, cliff, rate explained in UI)  
✓ Implementation-ready: engineering can build without guesswork  

**Team responsibilities**:
- **Design**: Review Figma specs; approve component library
- **Engineering**: Implement Navbar, Button, modal enhancements; run test suites
- **QA**: Execute manual flows (landing → create → withdraw); device testing (iOS/Android)
- **PM**: Sign off on copy tone; confirm Stellar concepts clear to 1st-time users

**Timeline**: 96 hours (4 phases, see section 10)

**Blocking items**: None; can begin Phase 1 immediately after design approval.

---

**Document prepared by**: Web Development Team  
**Review date**: March 30, 2026  
**Next review**: Upon completion of Phase 2 (48 hours)  
**Sign-off**: [Design Lead] [PM] [Eng Lead] [before Phase 4]

