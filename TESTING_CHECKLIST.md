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
   - [ ] Pulsing animation: opacity 0.5 ↔ 1.0, 2s duration
   - [ ] Staggered delay: each row +100ms delay
   - [ ] No layout shift when real data arrives

**Pass Criteria**: Skeleton smooth; layout stable on data arrival

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
