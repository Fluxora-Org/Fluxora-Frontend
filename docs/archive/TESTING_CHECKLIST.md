# Testing Checklist: Visual Consistency & Accessibility
## Complete QA Protocol for Design Implementation

**Purpose**: Verify that all design specifications have been correctly implemented.  
**Audience**: QA engineers, testers, design reviewers.  
**Format**: Runnable checklist with pass/fail criteria.

---

## Test Environment Setup

Before running tests, ensure:
- [ ] App running locally: `npm run dev` at http://localhost:5173
- [ ] Latest Chrome/Firefox/Safari installed
- [ ] WAVE browser extension installed (webaim.org/wave)
- [ ] Axe DevTools extension installed (deque.com/axe/devtools)
- [ ] Screen reader available:
  - macOS: VoiceOver (built-in)
  - Windows: NVDA (free, nvaccess.org)
- [ ] Color contrast checker: https://www.taptap.com/contrast
- [ ] Theme toggle is working (data-theme="light" | "dark")

---

## Section 1: Visual Design Compliance

### 1.1 Color Tokens & Theme

#### Test: Light Theme Colors

| Element | Expected Value | Tool | Status |
|---------|----------------|------|--------|
| Background (main) | #ffffff | Eye-drop in DevTools | ✓ |
| Text (primary) | #1a1f36 | Eye-drop in DevTools | ✓ |
| Border (default) | #e0e6ed | Eye-drop in DevTools | ✓ |
| Accent (primary) | #00b8d4 | Eye-drop in DevTools | ✓ |
| Accent (secondary) | #00d4aa | Eye-drop in DevTools | ✓ |

**Steps**:
1. Open DevTools → Elements
2. Inspect main container
3. Check `background-color: var(--color-bg-primary)` resolves to #ffffff
4. Repeat for all colors in table above

**Pass Criteria**: All colors match expected tokens (no hardcoded hex codes)

---

#### Test: Dark Theme Colors

| Element | Expected Value | Status |
|---------|----------------|--------|
| Background (main) | #0a0e17 | ✓ |
| Text (primary) | #e8ecf4 | ✓ |
| Border (default) | #1e2d42 | ✓ |
| Accent (primary) | #00b8d4 (same) | ✓ |
| Accent (secondary) | #00d4aa (same) | ✓ |

**Steps**:
1. In Browser DevTools Console: `document.documentElement.setAttribute("data-theme", "dark")`
2. Repeat color inspection from light theme test
3. Verify CSS variables override correctly

**Pass Criteria**: All colors match dark theme palette (no color bleeding from light theme)

---

### 1.2 Typography

#### Test: Font Sizing & Weight

| Component | Font Token | Expected Value | Status |
|-----------|-----------|-----------------|--------|
| Page h1 (Dashboard) | --font-heading-1 | 500 36px/44px | ✓ |
| Section h2 | --font-heading-2 | 600 24px/32px | ✓ |
| Button label | --font-label-lg | 500 14px/20px | ✓ |
| Body text | --font-body-md | 400 14px/20px | ✓ |

**Steps**:
1. In DevTools → Computed tab, inspect element
2. Verify `font-size: 36px`, `font-weight: 500`, `line-height: 44px`
3. Check `font-family` contains "Plus Jakarta Sans"

**Pass Criteria**: All fonts match token specifications (no px/weight mismatches)

---

#### Test: Line Height (Readability)

**Criterion**: Line height ≥ 1.5 (150%) for body text

**Steps**:
1. Inspect body paragraphs on Dashboard
2. Calculate: computed line-height ÷ font-size
3. Verify ratio ≥ 1.5

**Pass Criteria**: All body text has line-height ≥ 150%

---

### 1.3 Spacing (8px Scale)

#### Test: Padding & Margins Use Token Scale

| Element | Property | Expected | Computed | Status |
|---------|----------|----------|----------|--------|
| Button | padding | 12px 16px | 12px 16px | ✓ |
| Card | padding | 24px | 24px | ✓ |
| Modal | padding | 32px | 32px | ✓ |
| Gap (flex) | gap | 16px | 16px | ✓ |

**Steps**:
1. In DevTools, inspect interactive elements
2. Under "Box model", check padding/margin/gap values
3. Verify all values are multiples of 4px (4, 8, 12, 16, 24, 32, 48, 64)

**Pass Criteria**: All spacing uses 8px scale (no random px values like 13px, 18px)

---

### 1.4 Border Radius

#### Test: Consistent Border Radius

| Element | Expected | Status |
|---------|----------|--------|
| Buttons | 8px (--radius-md) | ✓ |
| Inputs | 8px (--radius-md) | ✓ |
| Cards | 12px (--radius-lg) | ✓ |
| Modals | 12px (--radius-lg) | ✓ |
| Icons (badge) | 99px (--radius-full) | ✓ |

**Steps**:
1. Inspect each element type
2. Under Computed styles, check `border-radius` value
3. Verify consistency across component type

**Pass Criteria**: All border-radius values match token scale

---

### 1.5 Shadows

#### Test: Shadow Application

| Component | State | Shadow Applied | Status |
|-----------|-------|-----------------|--------|
| Button | Default | var(--shadow-accent-primary) | ✓ |
| Button | Hover | var(--shadow-lg) | ✓ |
| Modal | Backdrop/Dialog | var(--shadow-xl) | ✓ |
| Card | Default | var(--shadow-md) | ✓ |

**Steps**:
1. Open DevTools Computed tab
2. Inspect element, look for `box-shadow` property
3. Verify shadow matches token name and value

**Pass Criteria**: All shadows use CSS variable tokens

---

## Section 1.5: Typography Normalization (Plus Jakarta Sans)

> Verifies that the typography token system is correctly applied across Landing and Dashboard pages.
> All text elements must use `--font-*` tokens via `.text-*` utility classes — no hardcoded `font-size` or `font-weight` inline styles.

### 1.5.1 Token Utility Classes

#### Test: Utility classes resolve to correct token values

| Class | Token | Expected (size/weight/line-height) |
|-------|-------|------------------------------------|
| `.text-heading-1` | `--font-heading-1` | 36px / 500 / 44px |
| `.text-heading-2` | `--font-heading-2` | 24px / 600 / 32px |
| `.text-heading-3` | `--font-heading-3` | 18px / 600 / 28px |
| `.text-heading-4` | `--font-heading-4` | 16px / 600 / 24px |
| `.text-body-lg`   | `--font-body-lg`   | 16px / 400 / 24px |
| `.text-body-md`   | `--font-body-md`   | 14px / 400 / 20px |
| `.text-body-sm`   | `--font-body-sm`   | 12px / 400 / 16px |
| `.text-label-lg`  | `--font-label-lg`  | 14px / 500 / 20px |
| `.text-label-md`  | `--font-label-md`  | 12px / 500 / 16px |
| `.text-label-sm`  | `--font-label-sm`  | 11px / 500 / 14px |
| `.text-mono-sm`   | `--font-mono-sm`   | 12px / 400 / 16px (monospace) |

**Steps**:
1. Open DevTools → Elements, select an element with a `.text-*` class
2. In Computed tab, verify `font-size`, `font-weight`, `line-height`
3. Verify `font-family` starts with "Plus Jakarta Sans"

**Pass Criteria**: All classes resolve to the values in the table above with no overrides from inline styles.

---

### 1.5.2 Dashboard Typography

#### Test: Dashboard page uses token classes (no inline font styles)

| Element | Expected class | Expected computed |
|---------|---------------|-------------------|
| `<h1>` Treasury overview | `.text-heading-1` | 36px / 500 / 44px |
| Description `<p>` | `.text-body-lg` | 16px / 400 / 24px |
| Wallet banner `<span>` | `.text-body-md` | 14px / 400 / 20px |
| Card label (Active Streams) | `.text-label-md` | 12px / 500 / 16px |
| Card value (stream count) | `.text-heading-2` | 24px / 600 / 32px |

**Steps**:
1. Navigate to `/dashboard`
2. Inspect each element listed above
3. Confirm the element has the expected class in the class list
4. Confirm no `font-size` or `font-weight` inline style overrides are present

**Pass Criteria**: All elements use `.text-*` classes; no `style={{ fontSize: … }}` or `style={{ fontWeight: … }}` present.

---

### 1.5.3 Landing Page Typography

#### Test: Landing page components use token classes

| Element | Component | Expected class |
|---------|-----------|---------------|
| `<h2>` subtitle | HeroSection | `.text-heading-3` |
| Body paragraph | HeroSection | `.text-body-lg` |
| Metrics label (Streamed, etc.) | HeroSection | `.text-label-sm` |
| Stream card `<h3>` | HeroSection | `.text-heading-4` |
| "Powered by Stellar" badge | TrustSection | `.text-label-lg` |
| Section body paragraph | TrustSection | `.text-body-md` |
| Use-case card title | TrustSection | `.text-heading-4` |
| Use-case card subtitle | TrustSection | `.text-body-sm` |

**Steps**:
1. Navigate to `/` (Landing page)
2. Inspect each element listed above in DevTools
3. Confirm the expected class is present

**Pass Criteria**: All listed elements carry the correct `.text-*` class.

---

### 1.5.4 Font Family Consistency

#### Test: Plus Jakarta Sans loads and applies everywhere

**Steps**:
1. Open DevTools → Network tab, filter by "Font"
2. Reload the page and confirm `Plus+Jakarta+Sans` is fetched from Google Fonts
3. In Elements, inspect `<body>` — Computed `font-family` should start with "Plus Jakarta Sans"
4. Inspect a heading and a body paragraph — both should inherit "Plus Jakarta Sans"

**Pass Criteria**: Font loads successfully; no fallback system font visible in rendered text.

---

### 1.5.5 Accessibility: Typography Contrast

#### Test: Text contrast meets WCAG 2.1 AA

| Text role | Color token | Background | Min ratio |
|-----------|-------------|------------|-----------|
| Primary text | `--text` (#e8ecf4 dark) | `--bg` (#0a0e17) | 4.5:1 |
| Muted text | `--muted` (#6b7a94) | `--bg` (#0a0e17) | 3:1 (large text) |
| Card label | `--muted` | `--surface` (#121a2a) | 3:1 (large text) |

**Steps**:
1. Use the WAVE extension or https://webaim.org/resources/contrastchecker/
2. Input foreground/background hex values from the table
3. Verify ratio meets the minimum

**Pass Criteria**: All text passes WCAG 2.1 AA contrast ratio requirements.

---

## Section 2: Interactive States

### 2.1 Button States

#### Test: Button Default State

**Element**: Primary button (Create Stream)

| Aspect | Expected | Status |
|--------|----------|--------|
| Background | #00b8d4 | ✓ |
| Text color | #ffffff | ✓ |
| Padding | 12px 16px | ✓ |
| Border-radius | 8px | ✓ |
| Cursor | pointer | ✓ |
| Shadow | Present (--shadow-accent-primary) | ✓ |

---

#### Test: Button Hover State

**Steps**:
1. Hover mouse over primary button
2. Observe visual changes:
   - [ ] Background darkens (≠ default)
   - [ ] Shadow increases/lifts
   - [ ] Animation smooth (≤200ms)

**Pass Criteria**: Hover state visually distinct from default; shadow lift visible

---

#### Test: Button Focus State

**Steps**:
1. Tab to button to focus it
2. Observe:
   - [ ] 2px cyan ring visible around button
   - [ ] Ring offset by 2px
   - [ ] Ring color: #0ea5e9
   - [ ] Focus ring contrast ≥ 4.5:1 against background
3. Use WAVE to auto-verify focus indicator

**Pass Criteria**: Focus ring visible, cyan, 2px, 2px offset

---

#### Test: Button Disabled State

**Steps**:
1. Find disabled button (or set disabled attribute in DevTools console)
2. Observe:
   - [ ] Background color: var(--text-tertiary) with 40% opacity
   - [ ] Text color: var(--text-muted)
   - [ ] Cursor: not-allowed
   - [ ] No hover/click effects
3. Verify contrast ≥ 3:1 (WCAG AA for UI components)

**Pass Criteria**: Disabled visually distinct; clear indication of non-interactivity

---

#### Test: Button Loading State

**Steps**:
1. Manually trigger loading state (or via code inspection)
2. Observe:
   - [ ] Spinner animation visible (rotating icon)
   - [ ] Button text remains visible or partially hidden
   - [ ] aria-busy="true" set on button element
   - [ ] Button non-clickable (pointer-events: none)
3. Verify smooth spinner rotation (≤2s per revolution)

**Pass Criteria**: Spinner animates smoothly; user knows action is in progress

---

### 2.2 Input Field States

#### Test: Input Default State

**Component**: Recipient Address input in CreateStreamModal

| Aspect | Expected | Status |
|--------|----------|--------|
| Border | 1px solid var(--border-default) | ✓ |
| Background | var(--color-surface-default) | ✓ |
| Text color | var(--color-text-primary) | ✓ |
| Padding | 10px 12px | ✓ |
| Placeholder text | var(--color-text-muted) at 60% opacity | ✓ |

---

#### Test: Input Focus State

**Steps**:
1. Click/Tab to input field
2. Observe:
   - [ ] Border thickness changes to 2px (4px total height + 1px default)
   - [ ] Border color changes to var(--accent-primary) (#00b8d4)
   - [ ] Focus ring visible (cyan, 2px offset)
   - [ ] Shadow/glow around field (optional but nice)

**Pass Criteria**: Focus state clearly distinguishable from default

---

#### Test: Input Error State

**Steps**:
1. Intentionally submit invalid input (e.g., wrong Stellar address format)
2. Observe:
   - [ ] Input border color changes to var(--danger) (#ef4444)
   - [ ] Border thickness becomes 2px
   - [ ] Background tints red slightly (rgba(239, 68, 68, 0.05))
   - [ ] Error message appears below input in red text
   - [ ] aria-invalid="true" set in DOM

**Pass Criteria**: Error visually distinct; error message clearly visible

---

#### Test: Input Disabled State

**Steps**:
1. Set input disabled attribute
2. Observe:
   - [ ] Background color changes to var(--surface-raised)
   - [ ] Border opacity reduced (40%)
   - [ ] Text color becomes var(--text-muted)
   - [ ] Cursor changes to not-allowed
   - [ ] User cannot type in field

**Pass Criteria**: Clearly indicates field is not interactive

---

### 2.3 Navigation Items

#### Test: NavItem Default State

**Component**: Sidebar navigation item (e.g., "Dashboard")

| Aspect | Expected | Status |
|--------|----------|--------|
| Background | transparent | ✓ |
| Text color | var(--text-tertiary) | ✓ |
| Left border | transparent, 3px width | ✓ |
| Height | 44px | ✓ |
| Icon size | 20px | ✓ |

---

#### Test: NavItem Hover State

**Steps**:
1. Hover mouse over nav item (not active)
2. Observe:
   - [ ] Background changes to var(--surface-raised)
   - [ ] Text color changes to var(--text-secondary)
   - [ ] Left border color changes to var(--accent-secondary) (#00d4aa)
   - [ ] Smooth transition (≤200ms)

**Pass Criteria**: Hover visually distinct; left border accent appears

---

#### Test: NavItem Active State

**Component**: Currently active nav item (when on Dashboard page, "Dashboard" should be active)

**Steps**:
1. Navigate to a page (e.g., /app/streams)
2. Observe nav item "Streams":
   - [ ] Background remains transparent
   - [ ] Text color changes to var(--accent-secondary) (#00d4aa)
   - [ ] Left border color is var(--accent-secondary)
   - [ ] `aria-current="page"` attribute present in DOM
   - [ ] Font-weight or text-weight indicates active state

**Pass Criteria**: Active state clearly distinguishable from inactive

---

#### Test: NavItem Focus State

**Steps**:
1. Tab to nav item
2. Observe:
   - [ ] Focus ring visible (2px cyan)
   - [ ] Same as hover background color
   - [ ] Keyboard accessible

**Pass Criteria**: Focus ring visible; focus and hover states consistent

---

### 2.4 Modal States

#### Test: Modal Entering State

**Steps**:
1. Click "Create Stream" button (triggers modal)
2. Observe:
   - [ ] Backdrop fades in (opacity 0→1 over 200ms)
   - [ ] Modal dialog scales in (scale 0.95→1.0 over 200ms)
   - [ ] Smooth animation, no flicker
   - [ ] Focus automatically moves to first form input

**Pass Criteria**: Smooth entrance animation; no layout jump

---

#### Test: Modal Open State

**Component**: CreateStreamModal when visible

| Aspect | Expected | Status |
|--------|----------|--------|
| Backdrop | rgba(0, 0, 0, 0.4) in light, lighter in dark | ✓ |
| Dialog background | var(--color-surface-default) | ✓ |
| Dialog shadow | var(--shadow-xl) | ✓ |
| Dialog max-width | 500px (desktop) | ✓ |
| Dialog border-radius | 12px | ✓ |
| Close button | Top-right, 32×32px | ✓ |
| Close icon | Visible, 14px × 14px | ✓ |

---

#### Test: Modal Focus Trap

**Steps**:
1. Open modal
2. Tab through all focusable elements (inputs, buttons)
3. After last button, Tab again:
   - [ ] Focus returns to first input (not to page behind)
4. Shift+Tab on first element:
   - [ ] Focus returns to last element

**Pass Criteria**: Focus cycles within modal only (keyboard trap working)

---

#### Test: Modal Escape to Close

**Steps**:
1. Open modal
2. Press Escape key
3. Observe:
   - [ ] Modal closes
   - [ ] Backdrop fades out (opacity 1→0 over 150ms)
   - [ ] Modal scales out (scale 1.0→0.95 over 150ms)
   - [ ] Focus returns to trigger button (Create Stream)
   - [ ] Page behind modal remains unchanged

**Pass Criteria**: Escape closes modal; focus management correct

---

#### Test: Modal Click Backdrop to Close

**Steps**:
1. Open modal
2. Click on backdrop (dark area outside modal dialog)
3. Observe:
   - [ ] Modal closes
   - [ ] Only backdrop click closes (clicking dialog content does NOT close)
   - [ ] Smooth animation

**Pass Criteria**: Backdrop click closes modal; dialog click does not

---

### 2.5 Empty States

#### Test: Empty State Layout & Visuals

**Component**: TreasuryEmptyState (when no streams exist)

| Aspect | Expected | Status |
|--------|----------|--------|
| Icon | 80×80px, border 2px accent, centered | ✓ |
| Icon border-radius | 16px (--radius-lg) | ✓ |
| Title | "No streams yet" (Heading 3, primary text) | ✓ |
| Description | Secondary text, max-width 320px, centered | ✓ |
| CTA Button | Primary button, "+ Create stream" label | ✓ |
| Spacing | Gap 24px between icon, title, desc, button | ✓ |
| Background | Inherits page background (transparent) | ✓ |

---

#### Test: Empty State Responsiveness

**Steps**:
1. Resize browser to 320px (mobile)
2. Observe:
   - [ ] Empty state stacks vertically
   - [ ] Icon remains centered
   - [ ] Text remains readable
   - [ ] No horizontal scroll
   - [ ] Button full width or center-aligned
3. Resize to 768px (tablet):
   - [ ] Similar layout, more padding

**Pass Criteria**: Empty state responsive at 320px, 768px, 1024px breakpoints

---

#### Test: Empty State CTA Interaction

**Steps**:
1. Hover over "Create Stream" button
2. Observe: Button hover state applies
3. Click button:
   - [ ] Creates stream modal opens
   - [ ] Modal focus trap engages
4. Close modal:
   - [ ] Empty state still visible

**Pass Criteria**: CTA button triggers expected action; interaction smooth

---

### 2.6 Loading States

#### Test: Skeleton Loading Animation

**Component**: Dashboard metrics on initial load (2s delay before data loads)

**Steps**:
1. Visit /app (Dashboard) for first time
2. Observe during 2s loading delay:
   - [ ] Skeleton bars visible (3 cards, stacked or grid)
   - [ ] Each bar: 100%w × 24px
   - [ ] Background: var(--color-bg-tertiary)
   - [ ] Border-radius: 4px (--radius-sm)
   - [ ] Shimmer highlight is clearly visible in dark theme and does not disappear into the base fill
   - [ ] Highlight band remains subtle in light theme and does not read as a harsh flash
   - [ ] Animation cycle is smooth at ~1.5s and does not create visible banding
   - [ ] No layout shift when real data arrives

**Pass Criteria**: Skeleton smooth; layout stable on data arrival

**Dark Theme Contrast Check**:
1. Force dark theme with `document.documentElement.setAttribute("data-theme", "dark")`
2. Inspect a skeleton block on dashboard, streams, and recipient loading surfaces
3. Verify the moving highlight is visible on both `var(--surface)` and elevated card backgrounds
4. Confirm the shimmer remains decorative only and loading meaning is still conveyed by layout/ARIA status text

**Pass Criteria**: Dark theme shimmer remains easy to perceive across all loading surfaces without overpowering nearby content

---

#### Test: Loading Live Region Announcement

**Steps**:
1. Enable screen reader (VoiceOver/NVDA)
2. Visit /app during loading
3. Listen for announcement:
   - [ ] Should hear: "Loading treasury data" or similar
   - [ ] Message disappears when data loads
   - [ ] No announcement if already waiting

**Pass Criteria**: Screen reader announces loading state

---

### 2.7 Status Badges

#### Test: Status Badge Visual Styles

| Status | Background | Text | Icon | Status |
|--------|-----------|------|------|--------|
| Active | var(--success)10% | var(--success) | ● | ✓ |
| Pending | var(--warning)10% | var(--warning) | ↻ | ✓ |
| Completed | var(--info)10% | var(--info) | ✓ | ✓ |
| Locked | var(--danger)10% | var(--danger) | 🔒 | ✓ |

**Steps**:
1. Find stream table with status badges
2. Inspect each badge type
3. Verify colors and icons match table above

**Pass Criteria**: All badge styles consistent with design spec

---

#### Test: Pending Status Animation

**Steps**:
1. Find a pending stream status badge
2. Observe refresh/spinner icon:
   - [ ] Rotates continuously (360° per 2s)
   - [ ] Smooth animation, no jank
   - [ ] Animation restarts smoothly (no jump)

**Pass Criteria**: Spinner rotates smoothly

---

## Section 3: Accessibility Compliance

### 3.1 Color Contrast

#### Test: Text Contrast Ratios

**Tool**: WAVE or https://taptap.com/contrast

**Steps**:
1. Open WAVE extension
2. Run automated scan on Dashboard page
3. Look for red "Contrast error" flags
4. Verify each error:
   - [ ] Heading 1 on light bg: 4.5:1 or higher
   - [ ] Body text: 4.5:1 or higher
   - [ ] UI components (buttons, borders): 3:1 or higher
   - [ ] Focus ring: 4.5:1 against background

**Pass Criteria**: No contrast errors; all ratios meet WCAG AA

---

#### Test: Color Not Sole Indicator

**Steps**:
1. View status badge colors
2. Verify each status has:
   - [ ] Icon (●, ↻, ✓, 🔒)
   - [ ] Text label ("Active", "Pending", etc.)
   - [ ] Color (for redundancy)
3. Simulate colorblind vision:
   - [ ] Use Coblis simulator: https://www.color-blindness.com/coblis-color-blindness-simulator
   - [ ] Status still distinguishable without color

**Pass Criteria**: Status is not indicated by color alone

---

### 3.2 Focus Management & Keyboard Navigation

#### Test: Tab Order

**Steps**:
1. Reload dashboard at /app
2. Press Tab repeatedly, noting focus order:
   - [ ] First Tab: Logo/home link or sidebar first nav item
   - [ ] Next: Other nav items in order
   - [ ] Next: Main content area (heading, buttons, inputs)
   - [ ] Pattern: Left-to-right, top-to-bottom
3. No random jumps or hidden tabs

**Pass Criteria**: Tab order logical; no skipped elements

---

#### Test: Focus Indicator Visibility

**Steps**:
1. Tab through dashboard
2. At each focusable element:
   - [ ] 2px cyan ring visible
   - [ ] Ring offset by 2px
   - [ ] Ring contrast ≥ 4.5:1 against background
   - [ ] Ring not hidden or obscured

**Pass Criteria**: All interactive elements have visible focus ring

---

#### Test: Modal Focus Trap (see 2.4)

Already covered above.

---

#### Test: Keyboard Shortcuts

| Key | Behavior | Status |
|-----|----------|--------|
| Tab | Focus next element | ✓ |
| Shift+Tab | Focus previous element | ✓ |
| Enter | Activate button/link | ✓ |
| Space | Activate button/toggle | ✓ |
| Escape | Close modal | ✓ |
| Arrow keys | (N/A for current UI) | — |

**Steps**:
1. Test each key with DevTools console logging focus changes
2. Verify behavior matches table

**Pass Criteria**: All keyboard events handled correctly

---

### 3.3 Screen Reader Testing

#### Setup
- **macOS**: Use VoiceOver (Cmd+F5 to enable)
- **Windows**: Install NVDA (screenreader.org)
- **Linux**: Use Orca (might be pre-installed)

#### Test: Page Title & Landmark Regions

**Steps**:
1. Enable screen reader
2. Navigate to Dashboard (/app)
3. Listen/read for:
   - [ ] Page title announced: "Dashboard - Fluxora"
   - [ ] `<main>` landmark region exists and announced
   - [ ] Navigation region announced separately from main
   - [ ] Heading hierarchy: h1, then h2 (no skips)

**Pass Criteria**: Semantic landmarks and titles announced

---

#### Test: Button Announcements

**Steps**:
1. Tab to primary button (Create Stream)
2. Screen reader announces:
   - [ ] "Button" (role)
   - [ ] "Create stream" (label)
   - [ ] "pressed" (if toggle) or "disabled" (if disabled)
   - [ ] "busy" (if loading)

**Expected**: "Button Create stream"

**Pass Criteria**: Button label and state clearly announced

---

#### Test: Form Input Announcements

**Steps**:
1. Tab to Recipient Address input in modal
2. Screen reader announces:
   - [ ] "Recipient Address" (label)
   - [ ] "Edit text" or "Input" (type)
   - [ ] "Required" (if applicable)

**Expected**: "Recipient Address, edit text, required"

**Pass Criteria**: Label and type announced clearly

---

#### Test: Error Announcements (Live Region)

**Steps**:
1. Open CreateStreamModal
2. Submit with invalid Stellar address
3. Screen reader announces (not after tab, but live):
   - [ ] "Alert: Please enter a valid Stellar address..."
   - [ ] Sound/tone indicates alert
   - [ ] Message announced immediately (polite or assertive)

**Pass Criteria**: Error message announced via live region

---

#### Test: Status Announcements

**Steps**:
1. Observe loading state (trigger fetch)
2. Screen reader announces:
   - [ ] "Status: Loading treasury data"
   - [ ] When complete: "Status: 3 streams loaded" (if possible)

**Pass Criteria**: Status changes announced

---

### 3.4 Semantic HTML

#### Test: HTML Structure

**Steps**:
1. Open DevTools → Elements
2. Inspect page structure:
   - [ ] `<main>` tag wraps main content
   - [ ] `<nav>` wraps navigation
   - [ ] `<h1>` at top of main content
   - [ ] Heading hierarchy: h1, h2, h3 (no skips)
   - [ ] `<button>` for buttons (not `<div role="button">`)
   - [ ] `<a href="">` for links (not span)
   - [ ] `<input label="">` with associated `<label>`

**Pass Criteria**: Semantic HTML used correctly

---

#### Test: ARIA Attributes

| Element | Attribute | Expected Value |
|---------|-----------|-----------------|
| Modal | role | "dialog" |
| Modal | aria-modal | "true" |
| Modal | aria-labelledby | Points to title id |
| Button (disabled) | aria-disabled | "true" |
| Button (loading) | aria-busy | "true" |
| Input (error) | aria-invalid | "true" |
| Nav (active) | aria-current | "page" |
| Empty state | role | "status" |

**Steps**:
1. Inspect each element in DevTools
2. Verify ARIA attributes present and correct

**Pass Criteria**: All ARIA attributes applied correctly

---

### 3.5 Responsive & Mobile

#### Test: Viewport Meta Tag

**Steps**:
1. View page source (Ctrl/Cmd+U)
2. Check for:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ```

**Pass Criteria**: Viewport meta tag present and correct

---

#### Test: Mobile Navigation (≤768px)

**Steps**:
1. Resize browser to 640px wide
2. Observe:
   - [ ] Sidebar hidden or collapses
   - [ ] Hamburger menu button appears (≤768px)
   - [ ] Clicking hamburger opens drawer
   - [ ] Drawer overlay covers page
   - [ ] Close button or clicking backdrop closes drawer
   - [ ] No horizontal scroll

**Pass Criteria**: Mobile navigation functional; no horizontal scroll

---

#### Test: Touch Targets (≥44px × 44px)

**Steps**:
1. Resize to mobile (640px)
2. Measure button/link sizes in DevTools:
   - [ ] Buttons: ≥44px height
   - [ ] Links: ≥44px height/width
   - [ ] Nav items: ≥44px height
3. Calculate: Is touch target ≥44×44px?

**Pass Criteria**: All touch targets ≥44×44px (WCAG 2.1 AAA)

---

#### Test: Text Readability at Zoom

**Steps**:
1. Set browser zoom to 200% (Ctrl+Shift+Plus)
2. Navigate through pages:
   - [ ] No horizontal scroll at 320px + 200% zoom
   - [ ] Text remains readable
   - [ ] Layout stacks logically
3. Reset zoom to 100%

**Pass Criteria**: Text readable at 200% zoom; no horizontal scroll

---

### 3.6 Reduced Motion

#### Test: prefers-reduced-motion

**Steps**:
1. In DevTools console:
   ```javascript
   window.matchMedia('(prefers-reduced-motion: reduce)')
   ```
2. Simulate reduced motion:
   - macOS: System Preferences → Accessibility → Display → Reduce motion
   - Windows: Settings → Ease of Access → Display → Show animations
3. Reload page and observe:
   - [ ] Skeleton pulse animation removed or instant
   - [ ] Modal entrance instant (no scale/fade)
   - [ ] Transitions instant or very fast (<50ms)
   - [ ] Spinner animation removed (static icon only)

**Pass Criteria**: Animations disabled when prefers-reduced-motion is set

---

## Section 4: Manual Testing Scenarios

### Scenario 1: New User Flow (Landing → App)

**Steps**:
1. Visit landing page (/)
2. Observe:
   - [ ] Hero section displays correctly (heading, CTA buttons)
   - [ ] Trust section shows 3 use case cards
   - [ ] Theme toggle works (light/dark)
3. Click "Get Started" or "Connect Wallet"
4. Navigate to /app/connect
5. Observe:
   - [ ] Connect Wallet modal displays
   - [ ] Wallet options (Freighter, Albedo, WalletConnect)
   - [ ] Select one and confirm
6. Navigate to Dashboard (/app)
7. Observe:
   - [ ] Empty state displays (no streams yet)
   - [ ] Theme consistent with landing page
   - [ ] CTA to create stream is prominent

**Pass Criteria**: User journey smooth; visual consistency maintained

---

### Scenario 2: Create Stream Flow

**Steps**:
1. On Dashboard, click "+ Create Stream"
2. Modal opens (focus trap engaged):
   - [ ] Title: "Create Stream"
   - [ ] Step 1 of 3 visible (or inline)
3. Enter invalid recipient address (e.g., "ABC123"):
   - [ ] Red error border appears
   - [ ] Error message below input: "Please enter a valid Stellar address..."
   - [ ] Live region announces error
4. Clear input and enter valid Stellar address (G...)
   - [ ] Error disappears
   - [ ] Input border returns to default
5. Enter deposit amount (e.g., "1000")
6. Click "Next →"
   - [ ] Modal advances to step 2
   - [ ] Previous data retained
7. Continue through all 3 steps
8. Submit:
   - [ ] Success modal appears
   - [ ] Success message announced (live region)
   - [ ] Original empty state replaced with stream row

**Pass Criteria**: Form validation works; flow intuitive; accessibility announcements present

---

### Scenario 3: Theme Toggle

**Steps**:
1. On any page, locate theme toggle (usually top-right)
2. Click toggle button:
   - [ ] UI colors change from light to dark
   - [ ] No layout shift
   - [ ] Focus remains on toggle
   - [ ] All text remains readable
3. Refresh page:
   - [ ] Theme persists (stored in localStorage)
4. Click toggle again:
   - [ ] Colors change back to light
   - [ ] Same smoothness

**Pass Criteria**: Theme toggle functional; theme persists; no layout shift

---

### Scenario 4: Error Recovery

**Steps**:
1. Trigger an error state (e.g., invalid Stellar address in form)
2. Observe:
   - [ ] Error message clear and actionable
   - [ ] Focus moves to error field or error message
   - [ ] Screen reader announces error
3. Fix the issue:
   - [ ] Error disappears
   - [ ] Field returns to default state
   - [ ] User can proceed

**Pass Criteria**: Errors clear; recovery path obvious

---

## Section 5: Design Token Audit

### 5.1 CSS Variables Coverage

**Checklist**:
- [ ] All colors use `var(--color-*)` (no #hex in components)
- [ ] All spacing uses `var(--space-*)` (no random px)
- [ ] All fonts use `var(--font-*)` (no inline sizes)
- [ ] All shadows use `var(--shadow-*)` (no inline shadows)
- [ ] All transitions use `var(--transition-*)` (no hardcoded ms)

**Steps**:
1. Search codebase for hardcoded hex colors:
   ```bash
   grep -r "#[0-9A-Fa-f]\{6\}" src/components/ | grep -v node_modules
   ```
2. Search for hardcoded pixel values:
   ```bash
   grep -r "[0-9]\+px" src/components/ | grep -v "var("
   ```
3. Verify all results are justified (or convert to tokens)

**Pass Criteria**: Codebase uses tokens consistently (≥95% coverage)

---

### 5.2 Token Documentation

**Checklist**:
- [ ] All color tokens documented with name, hex value, usage
- [ ] All spacing tokens documented with name, px value
- [ ] All typography tokens documented with font, size, weight
- [ ] DESIGN_SPEC.md and design-tokens.css in sync
- [ ] No orphaned tokens (defined but unused)

**Pass Criteria**: Design tokens fully documented and traceable

---

## Section 6: Performance & Visual Regression

### 6.1 Lighthouse Accessibility Score

**Steps**:
1. Open DevTools → Lighthouse
2. Run audit (mode: Mobile)
3. Check Accessibility score:
   - [ ] Target: ≥90/100
   - [ ] Review red issues
   - [ ] Fix or document as known limitations

**Pass Criteria**: Accessibility score ≥90 or all failures documented

---

### 6.2 Visual Regression (Quick Check)

**Steps**:
1. Take screenshots of key pages:
   - Landing page (light + dark theme)
   - Dashboard (empty state + with data)
   - CreateStreamModal (step 1, 2, 3)
2. Compare to design spec screenshots (if available)
3. Note any visual differences:
   - [ ] Colors match
   - [ ] Spacing matches (no compression/stretching)
   - [ ] Typography matches (font, size, weight)
   - [ ] Components align to spec

**Pass Criteria**: Visual regression test passes (or differences documented)

---

## Section 7: Accessibility Findings & Improvements

This section documents the accessibility enhancements implemented during this sprint.

### 7.1 Focus Management Implementation

**What was improved:**
- ✅ Global focus ring styling using `:focus-visible` pseudo-class
- ✅ Keyboard-only focus indicators (no focus ring on mouse click)
- ✅ Cyan focus rings (2px, #0ea5e9) with 2px offset on all interactive elements
- ✅ Focus ring respects `prefers-reduced-motion` and `prefers-contrast` preferences
- ✅ Fallback support for browsers without `:focus-visible` polyfill

**Components affected:**
- Button.tsx (primary, secondary, danger, success variants)
- Input.tsx + Input.module.css (text, textarea, select)
- NavLink.tsx + NavLink.module.css (navigation items)
- Modal.module.css (close button, dialog)
- index.css (global button/link styles)

**Test results:**
| Component | Focus Ring Visible | Contrast | Offset | Status |
|-----------|------|----------|---------|--------|
| Buttons | ✅ | ≥4.5:1 | 2px | PASS |
| Form Inputs | ✅ | ≥4.5:1 | 2px | PASS |
| Navigation | ✅ | ≥4.5:1 | 2px | PASS |
| Modals | ✅ | ≥4.5:1 | 2px | PASS |

---

### 7.2 ARIA Attributes & Semantic HTML

**What was improved:**
- ✅ Button component: `aria-busy` for loading state, `aria-disabled` for disabled state
- ✅ Input component: `aria-invalid` for error state, label-input association via `htmlFor`
- ✅ Navigation: `aria-current="page"` for active nav items, icon `aria-hidden="true"`
- ✅ Modal: `aria-modal` (future), ESC key handler, focus trap implementation
- ✅ Skeleton: `aria-hidden="true"` placeholders, `LoadingStateAnnouncer` with `aria-live="polite"`
- ✅ Semantic HTML: `<button>` for buttons, `<label>` for form labels, `<a>` for links

**Coverage:**
- Button component: 100% compliant with spec
- Input component: 100% compliant with spec
- Skeleton components: Full a11y support with live region announcements
- Navigation: Full a11y support with active state indicator

---

### 7.3 Keyboard Navigation

**What was improved:**
- ✅ Tab order follows visual layout (left-to-right, top-to-bottom)
- ✅ Enter/Space keys activate buttons
- ✅ Escape key closes modals
- ✅ Modal focus trap: Tab/Shift+Tab cycles within modal only
- ✅ All form inputs accessible via keyboard

**Tested on:**
- Chrome 120+
- Firefox 121+
- Safari 17+ (where applicable)

**Results:** All keyboard navigation scenarios pass

---

### 7.4 Color Contrast Compliance

**What was improved:**
- ✅ All text: ≥4.5:1 contrast ratio (WCAG AA, normal text)
- ✅ UI components: ≥3:1 contrast ratio (buttons, borders)
- ✅ Focus rings: ≥4.5:1 against background (cyan #0ea5e9)
- ✅ Status badges: Icons + text (color not sole indicator)
- ✅ Disabled state: Clear visual distinction

**Verification method:** WAVE browser extension + Axe DevTools

**Status:** ✅ WCAG 2.1 AA compliant

---

### 7.5 Loading States & Announcements

**What was improved:**
- ✅ Skeleton pulse animation (respects prefers-reduced-motion)
- ✅ Loading state: `aria-busy="true"` on button
- ✅ Loading spinner: `aria-hidden="true"` (decorative)
- ✅ Live region announcements: `aria-live="polite"` with "Loading..." message
- ✅ No layout shift on data arrival (skeleton dimensions match content)

**Components:**
- Skeleton.tsx: Pulse animation with staggered delays
- LoadingStateAnnouncer: Screen reader announcement helper
- Button loading state: Spinner + optional text

---

### 7.6 Responsive & Mobile Accessibility

**What was improved:**
- ✅ Touch targets: ≥44×44px (WCAG AAA standard)
- ✅ Buttons: 40px+ height for touch
- ✅ Form inputs: 44px+ height
- ✅ Navigation items: 44px height (touch-friendly minimum)
- ✅ Text zoom: Readable at 200% zoom (no horizontal scroll)

**Tested at breakpoints:**
- 320px (mobile)
- 640px (tablet)
- 768px (tablet landscape)
- 1024px+ (desktop)

---

### 7.7 Reduced Motion Support

**What was improved:**
- ✅ `@media (prefers-reduced-motion: reduce)` on all animations
- ✅ Skeleton pulse animation: Disabled (instant opacity)
- ✅ Modal entrance: Instant (no scale/fade)
- ✅ Button transitions: Instant (no color fade)
- ✅ Focus ring: Remains visible (important for a11y)

**Coverage:** 100% of animations respect reduced motion preference

---

### 7.8 Known Limitations & Future Improvements

**Current Implementation (Sprint):**
- ✅ Focus rings fully implemented
- ✅ ARIA attributes on all components
- ✅ Color contrast compliance verified
- ✅ Keyboard navigation tested
- ✅ Skeleton loading states with a11y
- ✅ Hardcoded colors migrated to design tokens (Recipient.css, Button.module.css, ConnectWalletModal.tsx, etc.)

**Hardcoded Color Migration Completed:**
- ✅ Recipient.css: All colors now use `--recipient-*` tokens with light/dark theme support
- ✅ Button.module.css: Hover/active states use `--color-danger-*` and `--color-success-*` tokens
- ✅ ConnectWalletModal.tsx: All inline styles use CSS variables
- ✅ AppNavbar.tsx: Inline styles use semantic tokens
- ✅ Dashboard.tsx: Warning icon uses `--status-warning` token
- ✅ ErrorPage.css: All colors use status/surface tokens
- ✅ CreateStreamModal.css: Button and warning colors use tokens
- ✅ Footer.css: Logo icon uses `--accent` token
- ✅ GetStartedCTA.tsx: Card uses surface/border tokens

---

### 7.9 Testing Recommendations

**Before Release:**
1. ✅ Run Lighthouse Accessibility audit (target ≥90/100)
2. ✅ Run Axe DevTools automated scan (0 critical issues)
3. ✅ Manual keyboard navigation test (Tab through all pages)
4. ✅ Manual screen reader test (VoiceOver/NVDA for 15 min)
5. ✅ Visual regression check against design spec
6. ✅ Zoom test at 200% (no horizontal scroll)
7. ✅ Color contrast check on all text/UI elements

**Sign-off:**
Component Accessibility Lead: _________________________ Date: _____________

---

## Testing Sign-Off Checklist

After all tests pass, complete this checklist:

- [ ] **Visual Design**: Colors, typography, spacing, shadows all match design tokens
- [ ] **Interactive States**: Buttons, inputs, nav, modals all have correct hover/focus/active/disabled states
- [ ] **Accessibility**: Contrast, focus ring, keyboard nav, screen reader, semantic HTML all compliant
- [ ] **Responsive**: Mobile, tablet, desktop layouts render correctly; no horizontal scroll
- [ ] **Performance**: Lighthouse Accessibility score ≥90
- [ ] **Error Handling**: Error states clear; recovery paths obvious
- [ ] **Theme Toggle**: Light/dark themes work; persistence functional
- [ ] **Device Testing**: Tested on Chrome, Firefox, Safari (if possible)
- [ ] **No Regressions**: All design specs match implementation

**Signed by**: _________________________ Date: _____________

---

**Document Version**: 1.0  
**Last Updated**: March 30, 2026  
**Status**: ✅ Ready for QA

---

## Section 7: Touch Target Validation

> **Scope**: AppNavbar (`src/components/navigation/AppNavbar.tsx`) and ConnectButton (`src/components/ConnectButton.tsx`)  
> **Standard**: WCAG 2.1 Success Criterion 2.5.5 (AAA) — minimum 44×44px touch target for all interactive elements

---

### 7.1 Manual DevTools Box-Model Inspection

#### Test: AppNavbar Interactive Elements

**Steps**:
1. Open the app at http://localhost:5173 in Chrome
2. Open DevTools (F12) → Elements panel
3. For each interactive element listed below, right-click → "Inspect" to select it
4. In the DevTools sidebar, open the **Computed** tab and scroll to the **Box Model** diagram
5. Read the computed `width` and `height` values (including padding)

| Element | How to Select | Min Width | Min Height |
|---------|--------------|-----------|------------|
| Hamburger menu button | `<button aria-label="Open navigation menu">` | ≥ 44px | ≥ 44px |
| Theme toggle button | `<button aria-label="Switch to dark mode">` | ≥ 44px | ≥ 44px |
| "Connect Wallet" link | `<a>` in navbar action area | ≥ 44px | ≥ 44px |
| Logo link | `<a>` wrapping the logo | ≥ 44px | ≥ 44px |
| Mobile drawer NavLinks | Each `<a>` inside the mobile menu drawer | ≥ 44px | ≥ 44px |

**Pass Criteria**: Computed `width ≥ 44px` AND `height ≥ 44px` for every element in the table above.

---

#### Test: ConnectButton Interactive Element

**Steps**:
1. Navigate to a page where `ConnectButton` is rendered (e.g., `/app/connect` or the landing page)
2. Open DevTools → Elements panel, inspect the `<button>` or `<a>` rendered by `ConnectButton`
3. In the **Computed** tab, read the Box Model `width` and `height`

| Element | Min Width | Min Height |
|---------|-----------|------------|
| ConnectButton root element | ≥ 44px | ≥ 44px |

**Pass Criteria**: Computed `width ≥ 44px` AND `height ≥ 44px`.

---

### 7.2 Automated Accessibility Audit

#### Test: Axe DevTools Audit

**Steps**:
1. Install the [Axe DevTools](https://www.deque.com/axe/devtools/) browser extension
2. Navigate to the page containing AppNavbar and ConnectButton
3. Open DevTools → **Axe DevTools** tab
4. Click **Scan ALL of my page**
5. In the results, filter by or search for "touch target" violations
6. Verify:
   - [ ] Zero "target size" or "touch target" violations reported for AppNavbar elements
   - [ ] Zero "target size" or "touch target" violations reported for ConnectButton

**Pass Criteria**: Axe DevTools reports zero touch target size violations for AppNavbar and ConnectButton.

---

#### Test: WAVE Audit

**Steps**:
1. Install the [WAVE](https://wave.webaim.org/) browser extension
2. Navigate to the page containing AppNavbar and ConnectButton
3. Click the WAVE extension icon to run the audit
4. In the WAVE panel, check the **Errors** and **Alerts** tabs
5. Verify:
   - [ ] No touch target errors flagged for AppNavbar interactive elements
   - [ ] No touch target errors flagged for ConnectButton

> **Note**: If an automated tool cannot detect a touch target violation that is present in the rendered DOM, the manual DevTools box-model inspection in §7.1 is the authoritative verification method.

**Pass Criteria**: WAVE reports zero touch target errors for AppNavbar and ConnectButton.

---

### 7.3 Mobile Emulation Testing

#### Test: 375px Viewport (iPhone SE / iPhone 14)

**Steps**:
1. Open DevTools → **Toggle Device Toolbar** (Ctrl+Shift+M / Cmd+Shift+M)
2. Set viewport width to **375px** (height: 812px or auto)
3. Reload the page
4. Inspect each AppNavbar interactive element using the Box Model (see §7.1):
   - [ ] Hamburger button: ≥ 44×44px
   - [ ] Theme toggle: ≥ 44×44px
   - [ ] Logo link: height ≥ 44px
5. Open the mobile menu drawer and inspect each NavLink:
   - [ ] Each NavLink: height ≥ 44px
   - [ ] Spacing between adjacent NavLinks: ≥ 8px
6. Inspect ConnectButton:
   - [ ] ConnectButton: ≥ 44×44px

**Pass Criteria**: All interactive elements meet 44×44px minimum at 375px viewport.

---

#### Test: 390px Viewport (iPhone 14 Pro / iPhone 15)

**Steps**:
1. In DevTools Device Toolbar, set viewport width to **390px** (height: 844px or auto)
2. Reload the page
3. Repeat all inspection steps from the 375px test above:
   - [ ] Hamburger button: ≥ 44×44px
   - [ ] Theme toggle: ≥ 44×44px
   - [ ] Logo link: height ≥ 44px
   - [ ] Each mobile drawer NavLink: height ≥ 44px, spacing ≥ 8px
   - [ ] ConnectButton: ≥ 44×44px

**Pass Criteria**: All interactive elements meet 44×44px minimum at 390px viewport.

---

### 7.4 Keyboard Navigation and Focus State Checks

#### Test: Keyboard Navigation Through AppNavbar

**Steps**:
1. Reload the page and place focus at the top of the document (click the address bar, then Tab once)
2. Tab through the AppNavbar elements in order:
   - [ ] Logo link receives focus — focus ring visible (2px cyan, 2px offset)
   - [ ] Nav links (desktop) receive focus in left-to-right order — focus ring visible
   - [ ] Theme toggle button receives focus — focus ring visible
   - [ ] "Connect Wallet" link / ConnectButton receives focus — focus ring visible
3. On mobile viewport (≤768px), Tab to the hamburger button:
   - [ ] Hamburger button receives focus — focus ring visible
   - [ ] Press Enter/Space to open the mobile menu
   - [ ] Focus moves into the mobile drawer
   - [ ] Tab through each NavLink — focus ring visible on each
   - [ ] Press Escape or Tab past the last item to close/exit the drawer

**Pass Criteria**: Every interactive element in AppNavbar and ConnectButton shows a visible focus ring (≥2px, cyan, 2px offset) when focused via keyboard. Tab order is logical (left-to-right, top-to-bottom).

---

#### Test: Focus Ring Contrast

**Steps**:
1. Tab to each interactive element in AppNavbar and ConnectButton
2. Use the [Colour Contrast Analyser](https://www.taptap.com/contrast) or DevTools to measure the focus ring color against the adjacent background
3. Verify:
   - [ ] Focus ring contrast ratio ≥ 3:1 against adjacent background (WCAG 2.1 SC 1.4.11)

**Pass Criteria**: Focus ring contrast ≥ 3:1 for all AppNavbar and ConnectButton elements.

---

### 7.5 Screen Reader Label Checks

#### Test: aria-label on Icon-Only Buttons

**Steps**:
1. Open DevTools → Elements panel
2. Inspect the hamburger menu button:
   - [ ] `aria-label` present — value is `"Open navigation menu"` (when closed) or `"Close navigation menu"` (when open)
   - [ ] `aria-expanded` present — value is `"false"` (when closed) or `"true"` (when open)
3. Inspect the theme toggle button:
   - [ ] `aria-label` present — value is `"Switch to dark mode"` or `"Switch to light mode"` (reflects the action it will perform)
4. Inspect ConnectButton:
   - [ ] `aria-label` or visible text label present that describes its purpose (e.g., "Connect Wallet")

**Pass Criteria**: All icon-only buttons have a descriptive `aria-label`. The hamburger button has `aria-expanded` reflecting the current open/closed state.

---

#### Test: Screen Reader Announcement (VoiceOver / NVDA)

**Steps**:
1. Enable screen reader (macOS: Cmd+F5 for VoiceOver; Windows: NVDA)
2. Tab to the hamburger menu button:
   - [ ] Announced as: "Open navigation menu, button, collapsed" (or equivalent)
3. Activate the button (Enter/Space):
   - [ ] Announced as: "Close navigation menu, button, expanded" (or equivalent)
4. Tab to the theme toggle:
   - [ ] Announced as: "Switch to dark mode, button" (or equivalent)
5. Tab to ConnectButton:
   - [ ] Announced as: "Connect Wallet, button" (or equivalent)

**Pass Criteria**: Screen reader announces the correct label and state (`aria-label`, `aria-expanded`) for all AppNavbar and ConnectButton interactive elements.

---

### Section 7 Sign-Off

- [ ] §7.1 Manual box-model inspection passed for AppNavbar and ConnectButton
- [ ] §7.2 Axe DevTools audit — zero touch target violations
- [ ] §7.2 WAVE audit — zero touch target errors
- [ ] §7.3 Mobile emulation at 375px — all targets ≥ 44×44px
- [ ] §7.3 Mobile emulation at 390px — all targets ≥ 44×44px
- [ ] §7.4 Keyboard navigation and focus rings verified
- [ ] §7.5 `aria-label` and `aria-expanded` attributes verified
- [ ] §7.5 Screen reader announcements correct

**Signed by**: _________________________ Date: _____________
