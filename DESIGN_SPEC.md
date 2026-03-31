# Design Specification: Visual Consistency – Marketing Site vs Authenticated App Chrome
## Document Index
- **Status**: Ready for engineering implementation
- **Last Updated**: March 30, 2026
- **Scope**: Layout, hierarchy, interaction states, accessibility
- **Audience**: Engineering, Design, Product  
- **Timeline**: 96-hour delivery window

---

## 1. Executive Summary

### Problem Statement
Fluxora-Frontend exhibits visual inconsistencies between:
- **Marketing site** (Landing page): Uses modern Tailwind CSS patterns, hero-driven layout
- **Authenticated app** (Dashboard): Uses inline styles, mixed CSS approaches

### Impact
- Users experience jarring UX transitions when moving from landing to app
- Inconsistent button styles, spacing, color tokens reduce professionalism
- Treasury/recipient mental models suffer from unclear hierarchy
- Accessibility gaps (focus order, live regions, contrast) create compliance risk

### Solution
Unified visual system with:
- Consistent design tokens (colors, spacing, typography)
- Standardized component states across authenticated and anonymous surfaces
- WCAG 2.1 AA accessibility compliance built-in
- Implementation-ready specifications preventing engineering guesswork

---

## 2. Current State Analysis

### 2.1 Marketing Site (Landing Page Components)
| Aspect | Current | Issue |
|--------|---------|-------|
| **Styling** | Tailwind CSS with `className` | Inconsistent with app |
| **Colors** | Inline radial gradients, theme-aware | Not tokenized |
| **Typography** | Plus Jakarta Sans (700, 600, 500) | Correct weight hierarchy |
| **Buttons** | Teal (#00b8d4), shadow effects | Works but not documented |
| **Spacing** | Flex/gap utilities | Modern, scalable |
| **Responsive** | md: breakpoints, good coverage | Mobile-first approach |

### 2.2 Authenticated App (Dashboard/Streams/Recipient)
| Aspect | Current | Issue |
|--------|---------|-------|
| **Styling** | Inline React styles + CSS files | Fragmented, hard to maintain |
| **Colors** | CSS variables + hardcoded hex | Inconsistent application |
| **Typography** | Plus Jakarta Sans, inline sizes | No token system |
| **Buttons** | Inline styles, no hover focus states | Accessibility gap |
| **Spacing** | Inline px/rem, no grid | Hard to scale |
| **Responsive** | Sidebar layout, minimal mobile support | Limited accessibility |

### 2.3 Identified Inconsistencies
```
LANDING PAGE                      |  AUTHENTICATED APP
─────────────────────────────────┼──────────────────────────────
Primary CTA: #00b8d4             |  Primary CTA: var(--accent) #00d4aa
Font: Plus Jakarta 700           |  Font: Plus Jakarta 600
Button padding: px-6 py-3        |  Button padding: 0.625rem 1.25rem
Hover: translate-y + shadow      |  Hover: no defined state
Focus: not explicitly defined    |  Focus: missing
Empty state: not present         |  Empty state: icon + text
Loading: n/a                     |  Loading: skeleton component
```

---

## 3. Design Intent & Visual System

### 3.1 Design Principles
1. **Clarity Over Complexity**: Hierarchy must guide user to primary actions
2. **Consistency Enables Trust**: Same pattern everywhere = predictable safe treasury
3. **Accessibility First**: WCAG 2.1 AA assumed in all states
4. **Token-Driven**: CSS variables control all values—no magic numbers

### 3.2 Design Tokens

#### 3.2.1 Color Palette

**Base Colors (Theme-aware via CSS variables)**
```css
/* ═══ Light Theme ═══ */
:root[data-theme="light"] {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f5f7fa;
  --color-bg-tertiary: #eef2f7;
  
  --color-surface-default: #ffffff;
  --color-surface-elevated: #f9fafb;
  --color-surface-raised: #f3f4f6;
  
  --color-border-default: #e0e6ed;
  --color-border-secondary: #d5dce5;
  
  --color-text-primary: #1a1f36;
  --color-text-secondary: #4a5565;
  --color-text-tertiary: #6b7a94;
  --color-text-muted: #8b92a9;
  
  --color-text-inverse: #ffffff;
}

/* ═══ Dark Theme ═══ */
:root[data-theme="dark"] {
  --color-bg-primary: #0a0e17;
  --color-bg-secondary: #121a2a;
  --color-bg-tertiary: #1a232f;
  
  --color-surface-default: #141927;
  --color-surface-elevated: #1e2a3c;
  --color-surface-raised: #25364a;
  
  --color-border-default: #1e2d42;
  --color-border-secondary: #2a3d54;
  
  --color-text-primary: #e8ecf4;
  --color-text-secondary: #b8c2d6;
  --color-text-tertiary: #8b96a8;
  --color-text-muted: #6b738a;
  
  --color-text-inverse: #0a0e17;
}
```

**Semantic Colors (Consistent across themes)**
```css
:root {
  /* Status & Intent */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #3b82f6;
  --color-focus: #0ea5e9;
  
  /* Interactive */
  --color-accent-primary: #00b8d4;    /* CTA, Primary action */
  --color-accent-secondary: #00d4aa;  /* Highlight, Positive flow */
  
  /* Shadows (consistent opacity) */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  
  /* Focus ring (WCAG AA contrast) */
  --focus-ring: 0 0 0 2px var(--color-bg-primary), 
                0 0 0 4px var(--color-focus);
}
```

#### 3.2.2 Typography System

```css
:root {
  --font-family-base: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
  --font-family-mono: "Monaco", "Menlo", "Courier New", monospace;
  
  /* Heading Hierarchy */
  --font-heading-1: 500 36px / 44px var(--font-family-base);  /* page title */
  --font-heading-2: 600 24px / 32px var(--font-family-base);  /* section title */
  --font-heading-3: 600 18px / 28px var(--font-family-base);  /* subsection */
  --font-heading-4: 600 16px / 24px var(--font-family-base);  /* card title */
  
  /* Body */
  --font-body-lg: 400 16px / 24px var(--font-family-base);   /* long-form content */
  --font-body-md: 400 14px / 20px var(--font-family-base);   /* standard body */
  --font-body-sm: 400 12px / 16px var(--font-family-base);   /* secondary text */
  
  /* Labels & Controls */
  --font-label-lg: 500 14px / 20px var(--font-family-base);  /* button text */
  --font-label-md: 500 12px / 16px var(--font-family-base);  /* form label */
  --font-label-sm: 500 11px / 14px var(--font-family-base);  /* badge */
  
  /* Mono */
  --font-mono-sm: 400 12px / 16px var(--font-family-mono);   /* code, hashes */
  
  /* Letter spacing */
  --letter-spacing-tight: -0.01em;
  --letter-spacing-normal: 0;
  --letter-spacing-wide: 0.02em;
}
```

#### 3.2.3 Spacing & Layout

```css
:root {
  /* Spacing scale (8px base) */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-2xl: 32px;
  --space-3xl: 48px;
  --space-4xl: 64px;
  
  /* Breakpoints */
  --breakpoint-xs: 320px;
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
  
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
  
  /* Transition & Animation */
  --transition-fast: 150ms ease-in-out;
  --transition-base: 200ms ease-in-out;
  --transition-slow: 300ms ease-in-out;
}
```

---

## 4. Component State Specifications

### 4.1 Buttons (Primary Action)

**Location**: CTA across landing page, authenticated actions (Create Stream, Connect Wallet)

#### State Matrix

```
┌─────────────────┬───────────────┬──────────────────┬──────────┐
│ State           │ Background    │ Text Color       │ Cursor   │
├─────────────────┼───────────────┼──────────────────┼──────────┤
│ Default         │ #00b8d4       │ #ffffff          │ pointer  │
│ Hover           │ #0097a7       │ #ffffff          │ pointer  │
│ Focus           │ #0097a7       │ #ffffff (ring)   │ pointer  │
│ Active (press)  │ #006f7a       │ #ffffff          │ pointer  │
│ Disabled        │ #4a5565 (60%) │ #8b96a874 (40%) │ not-allowed│
│ Loading         │ #00b8d4       │ spinner + text   │ not-allowed│
└─────────────────┴───────────────┴──────────────────┴──────────┘
```

**Specs**:
- **Padding**: 12px (vertical) × 16px (horizontal)
- **Border-radius**: 8px
- **Font**: Medium 16px/24px
- **Shadow**: `0 4px 12px rgba(0, 184, 212, 0.2)` (default)
- **Transition**: All 200ms ease-in-out
- **Hover Effect**: 
  - Shadow lift: `0 8px 16px rgba(0, 184, 212, 0.3)`
  - Transform: translateY(-2px) *landing page only*
  - No transform on dashboard (consistency with card interactions)
- **Focus**: 2px offset cyan ring (#0ea5e9) with 2px gap

**Focus Order**: Left-to-right, top-to-bottom (CSS order matches DOM)

**Accessibility**:
- ARIA: `aria-label` if no visible text (icon-only buttons)
- ARIA: `aria-pressed="true|false"` for toggle states
- ARIA: `aria-busy="true"` during loading
- Keyboard: Tab to focus, Enter/Space to activate
- Voice: "Button [label] [state]" (e.g., "Button Create stream, disabled")

---

### 4.2 Navigation (App Chrome – Sidebar + Top Bar)

**Location**: Authenticated app (all pages except landing)

#### Navigation Item States

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ State        │ Background   │ Text Color   │ Icon         │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ Default      │ transparent  │ --text-tertiary│ --text-tertiary│
│ Hover        │ --surface-raised│ --text-secondary│ --text-secondary│
│ Active       │ var(--accent-secondary)80 transparency│ --accent-secondary│ --accent-secondary│
│ Focus        │ (same as active) + ring│ --text-secondary│ same │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**Specs**:
- **Height**: 44px (touch-friendly minimum)
- **Spacing**: 12px vertical padding, 8px horizontal
- **Icon size**: 20px × 20px (with 8px margin-right to label)
- **Font**: Regular 14px/20px
- **Border-left**: 3px solid accent (active state)
- **Transition**: Background 200ms, color 200ms
- **Focus Ring**: Cyan (#0ea5e9) 2px, 2px offset

**Accessibility**:
- ARIA: `aria-current="page"` on active link
- Keyboard: Tab navigates items sequentially
- Tooltip: On hover, display full label if truncated (mobile)
- Voice: "Navigation link [label] [current status]"

---

### 4.3 Modals (Create Stream, Connect Wallet)

**Location**: Overlay surfaces

#### Modal Container States

```
┌──────────────┬──────────────────────┬─────────────────┐
│ State        │ Backdrop             │ Dialog Box      │
├──────────────┼──────────────────────┼─────────────────┤
│ Entering     │ opacity 0→1 (200ms)  │ scale 0.95→1.0  │
│ Open         │ rgba(0,0,0,0.4) dark │ scale 1.0       │
│              │ rgba(0,0,0,0.15) light│ shadow-lg       │
│ Closing      │ opacity 1→0 (150ms)  │ scale 1.0→0.95  │
│ Closed       │ hidden, pointer-none │ hidden          │
└──────────────┴──────────────────────┴─────────────────┘
```

**Specs**:
- **Backdrop**: 
  - Dark theme: `rgba(0, 0, 0, 0.4)` with blur(4px) optional
  - Light theme: `rgba(0, 0, 0, 0.15)`
- **Dialog box**:
  - Max-width: 500px (md screens), 90vw (mobile)
  - Padding: 32px desktop, 24px mobile
  - Border-radius: 12px
  - Shadow: `0 20px 25px -5px rgba(0, 0, 0, 0.1)` dark, lighter on light theme
  - Position: center screen via flexbox/grid
- **Close button**: Top-right corner, 32px × 32px, X icon
- **Keyboard trap**: Focus should cycle within modal (last field Tab → first field)

**Accessibility**:
- ARIA: `role="dialog"` on container
- ARIA: `aria-modal="true"`
- ARIA: `aria-labelledby="modal-title"` pointing to `<h2>` or `<h1>`
- ARIA: `aria-describedby="modal-description"` for helper text (optional)
- Keyboard: Escape to close, Tab cycles through focusable elements, Enter submits (if default button)
- Focus management: Move focus to first input on open, return focus to trigger button on close

---

### 4.4 Empty States

**Location**: Treasury overview (no streams), Recipient (no incoming streams)

#### Empty State Layout

```
[Illustration 80×80 px border accent]
         ↓
     "No streams yet"   (Heading 3, font-semibold)
         ↓
  "Create your first stream to start sending USDC..."
  (Body medium, secondary text color)
         ↓
    [CTA Button: "+ Create stream"]
```

**Specs**:
- **Container**: Flex column, center-aligned, padding 64px (desktop) / 48px (mobile)
- **Icon**:
  - Size: 80px × 80px
  - Border: 2px solid accent (#00d4aa / #00b8d4)
  - Border-radius: 16px
  - Color: accent (no fill, stroke only)
- **Heading** (`<h2>`): Heading 3 font token, primary text
- **Description**: Body medium, secondary text, max-width 320px
- **CTA**: Primary button, no icon-only variant
- **Spacing**: Gap 24px between icon, heading, description, button
- **Background**: Transparent, inherits page background
- **Responsive**: Full-bleed mobile (0px sides), 48px max-width on tablet

**Accessibility**:
- ARIA: Container has `role="status"` (if dynamically inserted)
- ARIA: Heading structure proper (h2/h3, no skips)
- Icon: `aria-hidden="true"` (decorative)
- Keyboard: Only interactive element is CTA button (Tab → button, Enter to activate)

---

### 4.5 Loading States

**Location**: Dashboard (on mount), Treasury metrics, Stream tables

#### Skeleton Loading

```
[Bar 100%w × 24px] 🔄 pulsing
[Bar 80%w × 16px]  🔄 pulsing (delayed 100ms)
[Bar 100%w × 16px] 🔄 pulsing (delayed 200ms)
```

**Specs**:
- **Skeleton bar**: 
  - Height: Match target text height (24px for headers, 16px for body)
  - Background: `var(--color-bg-tertiary)`
  - Border-radius: 4px
  - Animation: `pulse` (opacity 0.5 ↔ 1.0, 2s cubic-bezier)
  - Stagger delay: 100ms between rows
- **Count**: Show 5–7 placeholder rows for list views
- **Container**: Same layout as actual content (preserve layout shift)

**Animation keyframes**:
```css
@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.skeleton {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

**Accessibility**:
- ARIA: `role="status"` or `aria-busy="true"` on container
- ARIA: `aria-label="Loading dashboard data"` 
- Keyboard: Still focusable if any controls present (disabled state)
- Screen reader: "Loading [context]" announcement

---

### 4.6 Form Inputs (Recipient Address, Amount, Duration)

**Location**: Create Stream modal, Recipient info form

#### Input Field States

```
┌──────────────┬─────────────┬──────────────────┬──────────────────┐
│ State        │ Border      │ Background       │ Text             │
├──────────────┼─────────────┼──────────────────┼──────────────────┤
│ Idle         │ --border-default     │ --surface-default     │ --text-primary  │
│ Hover        │ --border-secondary   │ --surface-default     │ --text-primary  │
│ Focus        │ --accent-primary 2px │ --surface-default     │ --text-primary  │
│ Filled       │ --border-default     │ --surface-default     │ --text-primary  │
│ Error        │ #ef4444 2px (danger) │ var(--color-danger)10%│ --text-primary  │
│ Disabled     │ --border-default (40%)│ --surface-raised (40%)│ --text-tertiary │
│ Success      │ #10b981 2px          │ var(--color-success)10%│ --text-primary  │
└──────────────┴─────────────┴──────────────────┴──────────────────┘
```

**Specs**:
- **Height**: 40px (input field)
- **Padding**: 10px 12px (vertical × horizontal)
- **Border**: 1px solid (idle), 2px solid (focus/error)
- **Border-radius**: 8px
- **Font**: Body medium (14px/20px)
- **Placeholder**: Secondary text (60% opacity)
- **Transition**: All 200ms ease-in-out
- **Shadow**: None (idle), focus-ring on focus

**Helper Text**:
- **Position**: Below input, 8px gap
- **Font**: Body small (12px/16px)
- **Color**: 
  - Default: --text-tertiary
  - Error: #ef4444
  - Success: #10b981
- **ARIA**: `aria-describedby="[id]-help"` links to helper text element

**Accessibility**:
- ARIA: `aria-label` if no visible label (rare)
- ARIA: `aria-invalid="true|false"` on error
- ARIA: `aria-required="true"` on required fields
- Keyboard: Tab to focus, Enter/Space in dropdowns/combo boxes
- Screen reader: "Input label, required, [helper text]"
- Min contrast: 4.5:1 text-on-background (WCAG AA)

---

### 4.7 Status Indicators (Active, Pending, Completed)

**Location**: Stream status in table rows, recipient status indicator

#### Status Badge States

```
┌──────────┬──────────────┬─────────────┬──────────┐
│ Status   │ Background   │ Text        │ Icon     │
├──────────┼──────────────┼─────────────┼──────────┤
│ Active   │ #10b98120    │ #10b981     │ ● (dot)  │
│ Pending  │ #f59e0b20    │ #f59e0b     │ ↻ (spinner)│
│ Locked   │ #ef444420    │ #ef4444     │ 🔒 (lock)│
│ Completed│ #3b82f620    │ #3b82f6     │ ✓ (check)│
└──────────┴──────────────┴─────────────┴──────────┘
```

**Specs**:
- **Badge container**:
  - Padding: 6px 12px
  - Border-radius: 12px (pill-shaped)
  - Font**: Label small (11px/14px, medium weight)
  - Display: Inline-flex with icon + text, gap 6px
- **Icon**:
  - Size: 14px × 14px
  - Animated (pending only): rotation 360° over 2s infinite linear
- **Contrast**: 4.5:1 text-on-background (WCAG AA)

**Accessibility**:
- ARIA: `aria-label="Status: Active"` or similar
- Screen reader: "Status badge, [status name]"
- Keyboard: Not directly interactive (context handled by row)
- Color: Not sole indicator of status (icon + text redundancy)

---

## 5. Accessibility Requirements (WCAG 2.1 AA)

### 5.1 Color Contrast
- **Large text** (≥18pt or ≥14pt bold): 3:1 minimum
- **Normal text** (<18pt): 4.5:1 minimum
- **UI components**: 3:1 minimum (borders, focus indicators)
- **Graphical objects**: Gradients must have sufficient endpoint contrast

**Verification Tool**: WAVE, Axe DevTools, or WebAIM Contrast Checker

---

### 5.2 Focus Management & Keyboard Navigation

#### Interstate Navigation
| Event | Behavior |
|-------|----------|
| **Page load** | Focus moves to main content skip link or first interactive element |
| **Modal open** | Focus trap: Tab from last → first element; Escape closes |
| **Modal close** | Focus returns to trigger button |
| **Form submit fail** | Focus moves to first error field; announce error message live |
| **Empty state CTA** | Single CTA receives focus on page load |

#### Focus Indicator
- **Style**: 2px solid #0ea5e9 (cyan) with 2px offset
- **Visible**: On all interactive elements (buttons, links, inputs, nav items)
- **Contrast**: 4.5:1 against background
- **Not hidden**: No `outline: none` without replacement

**CSS Template**:
```css
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid #0ea5e9;
  outline-offset: 2px;
}
```

---

### 5.3 Live Regions & Announcements

#### Stream Creation Success
```html
<div role="status" aria-live="polite" aria-atomic="true">
  ✓ Stream created successfully. Stream ID: STR-001
</div>
```

#### Error Messages
```html
<div role="alert" aria-live="assertive" aria-atomic="true">
  ⚠ Recipient address invalid. Must start with 'G' and be 56 characters.
</div>
```

#### Loading Progress
```html
<div role="status" aria-live="polite" aria-atomic="true">
  <span aria-busy="true">Loading treasury data...</span>
</div>
```

---

### 5.4 ARIA Attributes

#### Required Implementations
```
Button (native or role="button"):
  ├─ aria-label (if no visible text)
  ├─ aria-pressed (toggles)
  ├─ aria-busy (async operations)
  └─ aria-disabled (if disabled)

Link (native or role="link"):
  ├─ href (native)
  ├─ aria-label (if icon-only)
  └─ aria-current="page" (active)

Input (text, number, email, etc.):
  ├─ <label for="[id]"> (associated)
  ├─ aria-label (if no label)
  ├─ aria-invalid (error state)
  ├─ aria-required (mandatory)
  ├─ aria-describedby (helper text id)
  └─ type (email, number, etc.)

Modal:
  ├─ role="dialog"
  ├─ aria-modal="true"
  ├─ aria-labelledby (title id)
  ├─ aria-describedby (description id)
  └─ Focus trap

Navigation:
  ├─ role="navigation" (or <nav>)
  ├─ aria-label="Main" (if >1 nav)
  └─ aria-current="page" (active item)

List (Streams, Recipients):
  ├─ role="list" (or <ul>/<ol>)
  ├─ role="listitem" (or <li>) per row
  ├─ aria-label (if table, skip for semantic <table>)
  └─ data-* attributes for row identification
```

---

### 5.5 Semantic HTML

| Component | Correct HTML | Avoid |
|-----------|---------|-------|
| Primary nav | `<nav>` with `<ul><li><a>` | `<div role="navigation">` |
| Main content | `<main>` tag | Generic `<div>` |
| Page title | `<h1>` at top of `<main>` | No title or h2 first |
| Section title | `<h2>`, `<h3>` (ordered) | Skipped heading levels |
| Button group | `<fieldset><legend>` | Unlabeled `<div>` of buttons |
| Form | `<form>` with errors in `<fieldset>` | Unsemantic `<div>` |
| List | `<ul><li>` or `<ol><li>` | `<div>` with children |
| Table | `<table><thead><tr><th>` | Styled `<div>` grid |

---

### 5.6 Typography Accessibility

- **Font size**: Minimum 14px/12px (body/small)
- **Line height**: Minimum 1.5 (150%)
- **Letter spacing**: 0.02em or 1/12 of font size
- **Word spacing**: 0.16em
- **Justify**: Left-aligned or center-aligned (avoid full justify for dyslexia)
- **Underlines**: Underline all links (not color-alone distinction)
- **All caps**: Avoid uppercase-only text >3 words (hard for dyslexic readers)

---

### 5.7 Responsive Design & Mobile

- **Viewport**: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- **Touch targets**: Minimum 44px × 44px (WCAG 2.1 Level AAA)
- **Zoom**: Pinch zoom allowed (no `user-scalable=no`)
- **No horizontal scroll** below 320px width
- **Mobile nav**: Always present; hamburger toggle at ≤768px
- **Text**: No 100% viewport width (readability max-width 60-80 chars)

---

### 5.8 Color & Vision

- **Color blindness**: Test designs with Coblis/Color Blindness Simulator
- **Not color-alone**: Status must use icon + text + color (e.g., ✓ + green)
- **Contrast check**: WAVE, Axe, or built-in browser tools
- **Reduced motion**: Respect `prefers-reduced-motion` media query

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 6. Interaction & Animation Specifications

### 6.1 Transitions

| Element | Transition | Duration | Easing |
|---------|-----------|----------|--------|
| **Button hover** | background, shadow, transform | 200ms | ease-in-out |
| **Nav hover** | background, color | 200ms | ease-in-out |
| **Input focus** | border-color | 150ms | ease-out |
| **Modal enter** | opacity, transform (scale) | 200ms | ease-out |
| **Modal exit** | opacity, transform (scale) | 150ms | ease-in |
| **Skeleton pulse** | opacity | 2s | cubic-bezier(0.4, 0, 0.6, 1) |

### 6.2 Reduced Motion
Globally detect and apply:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.01ms; /* essentially instant */
    animation-duration: 0.01ms;
  }
}
```

---

## 7. Responsive Breakpoints

### 7.1 Layout Rules

| Breakpoint | Use Case | Layout |
|-----------|---------|--------|
| **xs** (320px) | Phone | Stacked, no sidebar, hamburger nav |
| **sm** (640px) | Small phone | Stacked, sidebar hidden, drawer nav |
| **md** (768px) | Tablet | Stacked → sidebar visible, sidebar collapsed on first view |
| **lg** (1024px) | Desktop | Sidebar + main, full width |
| **xl** (1280px) | Large desktop | Sidebar + main + right panel (future) |

### 7.2 Mobile Considerations

**Navigation** (md breakpoint):
- Sidebar transforms to hamburger: `width: 100%` with `position: fixed`
- Backdrop overlay behind drawer
- Close on link click or backdrop click

**Modals** (sm breakpoint):
- Full width except 16px margin on sides
- Max-height: 90vh with scrollable content
- Keyboard: Still Escape to close

**Metrics cards** (sm breakpoint):
- Stack vertically instead of 3-column grid

---

## 8. Component-Level Specifications

### 8.1 Page Components

#### Dashboard Page (Authenticated, /app)
```
┌────────────────────────────────────────────┐
│ [Logo] [Nav breadcrumb] [Theme] [Wallet]   │ Header
├────────────────────────────────────────────┤
│ Sidebar                │ Main content:      │
│ · Dashboard (active)   │ ┌─────────────────┤
│ · Streams              │ │ h1: "Dashboard" │
│ · Recipient            │ │ p: Description  │
│                        │ ├─────────────────┤
│                        │ │ 3 metric cards  │
│                        │ ├─────────────────┤
│                        │ │ Empty state OR  │
│                        │ │ Streams table   │
│                        │ └─────────────────┘
└────────────────────────────────────────────┘
```

**States**:
- **Connected + empty**: Empty state + CTA
- **Connected + data**: Metrics + stream list + Create button
- **Loading**: Skeleton metrics + skeleton table
- **Error**: Error message banner + retry button
- **Not connected**: Prompt to connect wallet

---

#### Landing Page (/landing)
```
┌────────────────────────────────────────────┐
│ [Logo] [Nav links] [Theme] [CTA]           │ Header/Navbar
├────────────────────────────────────────────┤
│ [Hero section with radial gradient bg]     │
│  · Tag: "Built on Stellar"                 │
│  · h1: Split-color headline                │
│  · Subheading + 2 CTAs                     │
├────────────────────────────────────────────┤
│ [Trust section]                            │
│  · Use case cards (3-col desktop, 1 mobile)│
│  · Each: icon + title + description        │
├────────────────────────────────────────────┤
│ [Footer]                                   │
│  · Links, legal, copyright                 │
└────────────────────────────────────────────┘
```

**States**:
- **Light theme**: Radial light blue gradient bg
- **Dark theme**: Radial dark blue gradient bg
- **Mobile**: Single column, larger text
- **Hover on CTA**: Slight lift + enhanced shadow

---

### 8.2 Modal Components

#### CreateStreamModal
```
┌──────────────────────────────┐ [X]
│ Create Stream                │
├──────────────────────────────┤
│ Step 1 of 3: Recipient       │
│                              │
│ Recipient Address: [input]   │
│ Deposit Amount: [input]      │
│                              │
│      [Cancel]  [Next →]      │
└──────────────────────────────┘
```

**Spec**:
- **Title bar**: h2, no visible step indicator yet (add in future)
- **Input labels**: Associated with `<label>` tags
- **Button layout**: Two-column (Cancel left, action right)
- **Button sizes**: Equal width, 44px height
- **Validation**: Real-time errors below input fields

---

#### ConnectWalletModal
```
┌──────────────────────────────┐ [X]
│ Connect Wallet               │
├──────────────────────────────┤
│ p: "Select your wallet..."   │
│ [Freighter button]           │
│ [Albedo button]              │
│ [WalletConnect button]       │
│                              │
│      [Cancel]                │
└──────────────────────────────┘
```

**Spec**:
- **Title**: h2
- **Wallet buttons**: Full-width, 44px height, left-aligned icon + label
- **Stacked vertically** with 12px gap
- **Keyboard**: Tab cycles through buttons
- **Focus**: Cyan 2px ring

---

## 9. Implementation Handoff Guide

### 9.1 File Structure & Token Export

**Location**: Create `/src/design-tokens/` directory:
```
src/
├── design-tokens/
│   ├── index.css           # All CSS variables (light + dark)
│   ├── colors.css          # Color semantics (semantic + base)
│   ├── typography.css      # Font definitions
│   ├── spacing.css         # Space scale
│   ├── animations.css      # Keyframes + transitions
│   └── README.md           # Token guide for developers
├── components/
│   ├── Button.tsx          # Primary, secondary, tertiary variants
│   ├── Input.tsx           # Text, email, number inputs with states
│   ├── Modal.tsx           # Base modal controller
│   ├── Navigation.tsx      # Updated with token vars
│   └── ...
└── pages/
    ├── Dashboard.tsx       # Updated with tokens
    └── Landing.tsx         # Updated → consistent with app
```

### 9.2 Migration Checklist

- [ ] **Replace** inline color hex codes → CSS variable names
- [ ] **Replace** inline px values → space token vars
- [ ] **Add** focus-visible styles to all interactive elements
- [ ] **Add** aria-label to icon-only buttons
- [ ] **Add** aria-busy, aria-invalid, aria-required attributes
- [ ] **Unify** button styles across landing + app
- [ ] **Test** theme toggle (light/dark) in all browsers
- [ ] **Test** keyboard navigation (Tab, Shift-Tab, Enter, Escape)
- [ ] **Test** screen reader (NVDA, JAWS, VoiceOver)
- [ ] **Verify** contrast ratios (WAVE, Axe)
- [ ] **Mobile** testing: 320px, 640px, 768px breakpoints
- [ ] **Responsive** text scaling in viewports

### 9.3 CSS Variable Implementation Template

```css
/* ═══ Base + Theme ═══ */
:root {
  /* Light theme defaults (declared at top) */
  --color-bg-primary: #ffffff;
  --color-text-primary: #1a1f36;
  /* ... all base tokens ... */
}

/* Dark theme override via data attribute */
:root[data-theme="dark"] {
  --color-bg-primary: #0a0e17;
  --color-text-primary: #e8ecf4;
  /* ... overrides ... */
}

/* Alternative: media query (future) */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-bg-primary: #0a0e17;
    /* ... */
  }
}

/* Component usage */
.button-primary {
  background-color: var(--color-accent-primary);
  color: var(--color-text-inverse);
  padding: var(--space-lg); /* 16px */
  border-radius: var(--radius-md); /* 8px */
  font: var(--font-label-lg);
  transition: all var(--transition-base);
}

.button-primary:hover {
  background-color: var(--color-accent-primary-dark); /* new token if needed */
  box-shadow: 0 8px 16px rgba(0, 184, 212, 0.3);
}

.button-primary:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
```

### 9.4 React Component Pattern (Example: Button)

```tsx
// src/components/Button.tsx
import React from 'react';
import './Button.css';

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const classNames = `button button--${variant} button--${size} ${
      loading ? 'button--loading' : ''
    } ${disabled ? 'button--disabled' : ''} ${className || ''}`;

    return (
      <button
        ref={ref}
        className={classNames}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading ? <span className="spinner" aria-hidden /> : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
```

---

## 10. Testing & Verification Checklist

### 10.1 Visual Testing
- [ ] **Light theme**: All components render with correct colors
- [ ] **Dark theme**: CSS variable overrides apply; no hardcoded colors visible
- [ ] **Hover states**: Buttons, nav items respond; shadow/color changes smooth
- [ ] **Focus states**: 2px cyan ring visible on all interactive elements
- [ ] **Disabled states**: Opacity ≤60%, cursor changes to not-allowed
- [ ] **Loading states**: Skeleton bars pulse smoothly; no layout shift
- [ ] **Empty states**: Icon + text + CTA centered; mobile responsive
- [ ] **Error states**: Red border + red helper text; no confusion with other reds
- [ ] **Success states**: Green border + success message live region announced

### 10.2 Keyboard Navigation Testing
- [ ] **Tab order**: Logical left-to-right, top-to-bottom (no tabindex hacks)
- [ ] **Modal trap**: Tab from last field → first field (no escape to page behind)
- [ ] **Escape key**: Closes modals without side effects
- [ ] **Enter/Space**: Activates buttons
- [ ] **Logo**: Logo (link to home) focusable on app chrome
- [ ] **Nav links**: All navigation items Tab-navigable
- [ ] **Skip link** (optional, nice-to-have): Jumps to main content

### 10.3 Screen Reader Testing (VoiceOver/NVDA)
| Component | Expected Announcement | Tool |
|-----------|----------------------|------|
| **Button** | "[Button label], [state]" | VoiceOver (Mac) / NVDA (Win) |
| **Input** | "[Label], [type], [required]" | " |
| **Modal** | "Dialog [title]" (trap active) | " |
| **Loading** | "Loading [context]" (live) | " |
| **Error** | "Alert: [message]" (live) | " |
| **Link** | "[Link text], link" | " |
| **Nav** | "[Nav label], navigation, [# items]" | " |

### 10.4 Contrast Compliance (WCAG 2.1 AA)
- [ ] **Normal text** (<18pt): 4.5:1 or higher
- [ ] **Large text** (≥18pt): 3:1 or higher
- [ ] **UI components** (borders, icons): 3:1 or higher
- [ ] **Focus ring**: 4.5:1 against background
- [ ] **Verify with**: WAVE browser extension or color-contrast-analyzer.org

**Tool usage**:
1. Install WAVE extension (wave.webaim.org)
2. Open browser DevTools → WAVE
3. Look for red "Contrast error" flags
4. Fix any failures

### 10.5 Responsive Breakpoint Testing

| Breakpoint | Device | Actions |
|-----------|--------|---------|
| **320px** | Phone | • Sidebar hidden → hamburger • Text wraps properly • No horizontal scroll • Touch targets 44×44px |
| **640px** | Small phone | • Same as 320px • Check metric card layout |
| **768px** | Tablet | • Sidebar visible (collapsible) • Two-column grid for metrics |
| **1024px** | Desktop | • Sidebar + main side-by-side • Full layout |

### 10.6 Automated Testing (Axe DevTools)

```bash
# Install Axe DevTools extension for Chrome/Firefox
# Then in DevTools → Axe DevTools → Scan Page
# Review issues:
# - 🔴 Critical: Fix before ship
# - 🟡 Serious: Fix in next sprint
# - 🟢 Minor: Document as known limitations
```

### 10.7 Manual Edge Cases

- [ ] **Empty Treasury** (no streams): Empty state displays; CTA works
- [ ] **Loading Treasury** (async fetch): Skeleton shows for 2s+; no jump on data arrive
- [ ] **Wallet Disconnect**: App returns to unauthenticated state; no orphan data
- [ ] **Modal Close Escape**: Focus returns to trigger button
- [ ] **Theme Toggle** during modal open: Colors update; modal stays open
- [ ] **Zoom 200%**: No horizontal scroll; text readable
- [ ] **High Contrast Mode** (Windows): Focus ring still visible

---

## 11. States Summary Table

### 11.1 Quick Reference: All States

```
┌─────────────────────┬───────────────────┬───────────────────┬─────────────┐
│ Component           │ Default           │ Interactive State │ Feedback    │
├─────────────────────┼───────────────────┼───────────────────┼─────────────┤
│ Button (Primary)    │ #00b8d4, shadow   │ Hover: darker     │ Focus ring  │
│ Navigation item     │ Transparent       │ Hover: bg raised  │ Active: L-br │
│ Input field         │ Border default    │ Focus: accent 2px │ Error: red  │
│ Modal               │ Centered, backdrop│ Hover: (inputs)   │ Ring on esc │
│ Empty state         │ Icon + text + CTA │ Hover on CTA      │ Focus ring  │
│ Status badge        │ Color-coded bg    │ None (read-only)  │ Icon present│
│ Skeleton loading    │ Pulsing bar       │ None (disabled)   │ Pulse anim  │
└─────────────────────┴───────────────────┴───────────────────┴─────────────┘
```

---

## 12. Known Limitations & Deferrals

### 12.1 Out of Scope (Future Iterations)
1. **Advanced animations** (parallax, micro-interactions): Deferred to Phase 2 (rationale: accessibility + browser support)
2. **Right-side panel** (analytics/notifications): Requires new route structure (defer to sprint 5)
3. **Dark mode auto-detection** (prefers-color-scheme): Good-to-have, current data-theme=dark works (defer)
4. **i18n/L10n** (multiple languages): Business decision pending (defer to roadmap)
5. **PWA/offline mode**: Requires service worker + cache API (defer to Phase 3)

### 12.2 Residual Risks & Audit Notes
- **Risk**: CSS variables not inherited in shadow DOM components (unlikely; no web components yet)
- **Risk**: Stellar wallet integrations may have their own branding—document wallet component guidelines
- **Audit**: After launch, measure Core Web Vitals + Cumulative Layout Shift on modals
- **Audit**: Monthly accessibility compliance check via automated + manual scan

---

## 13. Appendix: Design Decision Log

| Decision | Rationale | Owner |
|----------|-----------|-------|
| **Single accent color + dark/light variants** | Reduces token count; CSS variables handle context | Design |
| **No CSS-in-JS library** (using CSS files + Tailwind) | Reduces bundle size; CSS variables portable | Engineering |
| **Focus ring 2px offset** | Meets WCAG AAA; visible in all contexts | Accessibility |
| **44px touch target minimum** | Mobile UX; exceeds WCAG AA requirement | Product |
| **Modal keyboard trap** | Prevents accidental page scroll behind overlay | Engineering |
| **Live region announcements (status/alert)** | Screen reader users aware of state changes | Accessibility |

---

## 14. Contact & Questions

**Design lead**: [To be assigned]  
**Engineering lead**: [To be assigned]  
**Accessibility reviewer**: [To be assigned]  
**PM/Product**: [To be assigned]

**Questions about this spec?** Open an issue in the repo with tag `[design-spec]`.

---

**Document Version**: 1.0  
**Last Updated**: March 30, 2026  
**Status**: ✅ Ready for Implementation
