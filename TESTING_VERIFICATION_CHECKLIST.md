# Visual Consistency: Testing & Verification Checklist
## Step-by-Step Process to Confirm Assignment Completion

**Status**: Pre-Implementation Testing Guide  
**Date**: March 30, 2026  
**Tester**: QA / Engineering Lead  
**Duration**: 2–3 hours per phase  

---

## OVERVIEW

This guide walks you through verifying that all deliverables from the **Visual Consistency: Marketing Site vs Authenticated App Chrome** design spec are complete and production-ready. Tests are organized into 5 phases, each with specific acceptance criteria.

**Before you start**:
- [ ] Read the main spec: `DESIGN_SPEC_VISUAL_CONSISTENCY.md` (sections 1–4)
- [ ] Clone the feature branch: `git checkout design/fluxora-fe-30`
- [ ] Install deps: `npm install`
- [ ] Start dev server: `npm run dev` (on `http://localhost:5173`)
- [ ] Open browser DevTools (F12) and Console (Cmd+Option+J on Mac)
- [ ] Clear localStorage: `localStorage.clear()` in console

---

## PHASE 1: VISUAL REGRESSION & RESPONSIVE DESIGN (45 min)

### Objective
Confirm that Navbar is unified, buttons are styled consistently, and layout responds correctly across breakpoints.

### Test 1.1: Navbar on Landing Page (Desktop)
**Route**: `http://localhost:5173/`  
**Viewport**: 1280×720 (desktop)  
**Expected appearance**:
- [ ] Fluxora logo left; nav links centered (Home, Docs, GitHub)
- [ ] Theme toggle + "Get started" CTA button on right
- [ ] Navbar height: 64px
- [ ] Background: white (light mode) or dark (#0f1419)
- [ ] Logo color: light on dark, dark on light
- [ ] Nav link color: #4a5565 (default), #00d4aa on hover
- [ ] "Get started" button: cyan (#00d4aa) bg, dark text, drop shadow

**Action**: 
1. Open browser and navigate to `/`
2. Screenshot navbar (File > Save as PDF or use DevTools screenshot)
3. Compare colors to section 3.2.1 spec
4. Hover over "Get started" → button dims to #00a884, shadow increases
5. Tab key → focus ring appears (2px solid cyan, 2px offset)

**Pass if**: Colors match spec, dimensions correct, hover/focus states visible

---

### Test 1.2: Navbar on App Dashboard (Dark Mode)
**Route**: `http://localhost:5173/app`  
**Viewport**: 1280×720 (desktop)  
**Expected appearance**:
- [ ] Fluxora logo left
- [ ] Page title "Dashboard" center (or current page)
- [ ] Theme toggle, network badge ("TESTNET"), wallet connect button on right
- [ ] Navbar height: 64px
- [ ] Background: #0f1419
- [ ] Network badge: cyan accent with border
- [ ] Connect button: same cyan style as marketing

**Action**:
1. Navigate to `/app`
2. Note the page title + network indicator
3. Hover over theme toggle → gray overlay appears
4. Tab to each button and verify focus ring is visible
5. Click "Connect wallet" → modal or dropdown (defer wallet impl to backend integration; just test button appearance)

**Pass if**: Navbar elements visible, theme toggle works, focus ring present on all buttons

---

### Test 1.3: Responsive Breakpoint — Tablet (768px)
**Viewport**: 768×1024 (iPad)  
**Routes**: `/`, `/app`

**Action**:
1. Open DevTools → Responsive Design Mode (Cmd+Shift+M)
2. Set viewport to 768×1024
3. On landing: nav links should wrap OR collapse into hamburger menu
4. On app dashboard: sidebar should convert to mobile overlay (hamburger toggle visible)
5. All buttons and inputs should remain ≥44px touch target

**Pass if**: 
- [ ] Layout reflows without horizontal scroll
- [ ] Hamburger toggle appears (if implemented)
- [ ] Touch targets ≥44px
- [ ] No overlapping text

---

### Test 1.4: Responsive Breakpoint — Mobile (375px)
**Viewport**: 375×667 (iPhone 12)  
**Routes**: `/`, `/app`

**Action**:
1. DevTools → Responsive Design Mode → 375×667
2. On landing: 
   - [ ] Logo visible
   - [ ] Nav links hidden OR in drawer
   - [ ] "Get started" button visible
   - [ ] No horizontal scroll
3. On app dashboard:
   - [ ] Sidebar hidden; hamburger visible (☰ icon)
   - [ ] Navbar height: 48px (not 64px)
   - [ ] All buttons: 48px × 48px minimum
4. Tap hamburger → sidebar slides in from left
5. Tap outside sidebar → closes OR tap close (X)

**Pass if**: 
- [ ] All content readable on mobile (font ≥12px)
- [ ] No pinch-zoom required to interact
- [ ] Sidebar properly overlays without scrolling body
- [ ] Navbar not crowded

---

### Test 1.5: Button Styling (All States)
**Route**: Any page with buttons  
**Viewport**: 1280×720

**Primary Button (`var(--accent)` cyan)**:

| State | Check | Expected | Visual | Pass |
|-------|-------|----------|--------|------|
| Default | Look at "Get started" button | Cyan (#00d4aa), dark text, shadow, 40px+ height | ✓ | [ ] |
| Hover | Move mouse over button | Darker cyan (#00a884), shadow increases, slight lift (translate -2px) | ✓ | [ ] |
| Focus | Press Tab to button | All hover props + 2px cyan outline, 2px offset | ✓ | [ ] |
| Active | Click and hold button | No lift (translateY 0), shadow reduced | ✓ | [ ] |
| Disabled | Button with `disabled` attr (if any on page) | Faded cyan bg (40% opacity), cursor: not-allowed | ✓ | [ ] |

**Secondary Button (Border style)**:

| State | Check | Expected | Visual | Pass |
|-------|-------|----------|--------|------|
| Default | Look at "Watch demo" button (if visible) | Border 1px #1e2d42, transparent bg, text color | ✓ | [ ] |
| Hover | Move mouse over button | Bg: rgba(255,255,255,0.06), border: var(--accent) | ✓ | [ ] |
| Focus | Tab to button | Outline 2px cyan, offset 2px | ✓ | [ ] |
| Disabled | Button with `disabled` attr | Opacity 50%, cursor: not-allowed | ✓ | [ ] |

**Icon Button (Toolbar, navbar)**:

| State | Check | Expected | Visual | Pass |
|-------|-------|----------|--------|------|
| Default | Look at theme toggle (🌙 or ☀️) | Subtle border, transparent bg, 32px × 32px | ✓ | [ ] |
| Hover | Move mouse over icon | Bg: rgba(255,255,255,0.08) | ✓ | [ ] |
| Focus | Tab to icon | Outline 2px cyan | ✓ | [ ] |

**Sign-off**:
- [ ] All button states match section 3.2.2 spec colors and sizes
- [ ] Hover/focus transitions smooth (0.2s ease)
- [ ] Disabled state obviously disabled (not interactive)

---

## PHASE 2: FORM VALIDATION & MODAL STATES (45 min)

### Objective
Verify that CreateStreamModal (3-step) displays correctly, validates input, handles errors, and manages focus.

### Test 2.1: CreateStreamModal — Step 1 (Recipient & Deposit)
**Route**: `http://localhost:5173/app`  
**Viewport**: 1280×720

**Action**:
1. Click "Create stream" button (or empty state CTA)
2. Modal appears with:
   - [ ] Title: "Create stream — Step 1 of 3" (or similar, aria-labelledby="modal-title")
   - [ ] Recipient address field (label + input, autofocus)
   - [ ] Deposit amount field
   - [ ] "Cancel" + "Continue" buttons
   - [ ] Close button (X) in top-right

**Verify focus management**:
- [ ] First input (recipient) is auto-focused (cursor blinking)
- [ ] Tab moves through: recipient → deposit → [Cancel] → [Continue]
- [ ] Shift+Tab reverses order
- [ ] Tab from [Continue] wraps to recipient input (focus trap)
- [ ] Escape closes modal without error

**Verify modal semantics**:
- Open DevTools → Elements tab
- Find modal container
- Check attributes: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="modal-title"`
- [ ] Attributes present

**Pass if**: Focus trap works, modal closes on Escape, semantic HTML correct

---

### Test 2.2: Input Validation — Invalid Recipient
**Action**:
1. Modal still open on Step 1
2. Type invalid Stellar address: "INVALID"
3. Press Tab or click outside (blur event)
4. **Expected**: 
   - [ ] Input border turns red (2px solid #ff4d4f)
   - [ ] Error message appears below: "Please enter a valid Stellar address (56 characters, starts with G)."
   - [ ] Error text: red color, font-size 12px, bold
   - [ ] role="alert" on error div (announced by screen reader)
   - [ ] aria-invalid="true" on input
5. Click "Continue" button
6. **Expected**: Modal stays open, error persists

**Sign-off**:
- [ ] Error styling matches section 4.2.1 spec
- [ ] Error doesn't clear until user fixes input
- [ ] Input with error has aria-invalid and aria-describedby

---

### Test 2.3: Input Validation — Valid Recipient + Deposit
**Action**:
1. Clear recipient field and enter valid Stellar address: 
   ```
   GABC1234567890XYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNO
   ```
   *(or any valid G-account from a test wallet)*
2. Enter deposit: "1000"
3. **Expected**:
   - [ ] Error message clears
   - [ ] Input border returns to default (gray)
   - [ ] "Continue" button is enabled (not grayed out)
4. Click "Continue"
5. **Expected**:
   - [ ] Modal advances to Step 2
   - [ ] Recipient value shown somewhere (header, summary, or previous step display)

**Sign-off**:
- [ ] Validation triggers on blur, not just submit
- [ ] Valid input progresses to next step
- [ ] Error clears on valid input

---

### Test 2.4: CreateStreamModal — Step 2 (Rate & Duration)
**Action**:
1. On Step 2, verify:
   - [ ] Title: "Create stream — Step 2 of 3"
   - [ ] Fields visible: [Accrual rate], [Duration], [Cliff enabled toggle], [Cliff date (if enabled)]
   - [ ] Previous step summary: Recipient truncated (e.g., "GABC...MKLMNO")
   - [ ] "Back" + "Continue" buttons
2. Tab through fields → focus ring visible on each
3. Fill in:
   - Rate: "38.62"
   - Duration: "12"
   - Cliff enabled: toggle ON (if checkbox/toggle present)
   - Cliff date: "2026-04-15" (example)
4. Click "Continue"
5. **Expected**: Advances to Step 3

**Sign-off**:
- [ ] All fields accessible via Tab
- [ ] Form advances with valid data
- [ ] Back button returns to Step 1 with data preserved

---

### Test 2.5: CreateStreamModal — Step 3 (Review)
**Action**:
1. On Step 3, verify:
   - [ ] Title: "Create stream — Step 3 of 3 — Ready to sign"
   - [ ] Summary of all values:
     - Recipient address (with [Copy] + [Explorer link])
     - Total amount
     - Rate
     - Duration
     - Start date ("Immediate" or custom date)
     - Cliff date (or "None")
   - [ ] Warning text: "This will submit a transaction to Stellar. Please review carefully."
   - [ ] "Back" + "Create & Sign" buttons
2. "Back" → Returns to Step 2 with values intact
3. "Create & Sign":
   - [ ] Button becomes disabled
   - [ ] Loading spinner appears (or text: "Waiting for wallet signature...")
   - [ ] Escape key ignored
   - [ ] Close (X) button disabled

**Sign-off**:
- [ ] All review values match user input
- [ ] Submitting state is clear (disabled buttons, loading indicator)
- [ ] Copy mentions Stellar + transaction

---

### Test 2.6: ModalSuccess — Stream Created (Deferred if backend not ready)
**Prerequisite**: If backend returns success or you mock success, continue. Otherwise, skip to 2.7.

**Action**:
1. After "Create & Sign", if success:
   - [ ] CreateStreamModal closes
   - [ ] StreamCreatedModal (or success toast) appears with:
     - Headline: "Stream Created ✓"
     - Txn hash (clickable link to Stellar Expert)
     - Stream details summary
     - [View Stream] + [Go to Dashboard] CTAs
   - [ ] Live region announces: "Stream created" (listen for screen reader or check console for aria-live text)
2. Click [Go to Dashboard] → Redirects to Dashboard, modal closes
3. Dashboard should show new stream (if backend ready) OR empty state

**Sign-off**:
- [ ] Success modal displays if backend ready
- [ ] Txn link is clickable and external
- [ ] Live region contains success announcement

---

### Test 2.7: Error Handling — Form Submission Failure (Mock if needed)
**Action**:
1. Return to CreateStreamModal (step 3)
2. Trigger error: (intercept API with DevTools or mock)
   - Open DevTools → Network tab
   - Set Network throttling to "Offline"
   - Click "Create & Sign"
3. **Expected**:
   - [ ] Modal stays open
   - [ ] Error banner appears at top of modal: red bg (#ff4d4f), white text
   - [ ] Error text: "Failed to create stream. Please retry." (or similar context)
   - [ ] role="alert" on error banner → screen reader announces
   - [ ] aria-live="polite" on banner
   - [ ] Buttons become enabled again
4. Fix network (toggle network back on), retry

**Sign-off**:
- [ ] Error displayed inline (not in separate toast)
- [ ] Error is announced (role="alert")
- [ ] User can retry without closing modal

---

## PHASE 3: ACCESSIBILITY & KEYBOARD NAVIGATION (45 min)

### Objective
Verify WCAG 2.1 AA compliance: focus management, color contrast, live regions, semantic HTML.

### Test 3.1: Skip Link (Keyboard Navigation)
**Route**: `http://localhost:5173/`  
**Viewport**: 1280×720

**Action**:
1. Press Tab once → **Expected**: Focus jumps to a hidden skip link
   - Link text visible: "Skip to main content" (or similar)
   - Link is visible (not hidden)
2. Press Enter → **Expected**: Focus jumps to `id="main-content"` section of page
   - Usually the hero section or main heading
3. Press Tab again → Should continue from that section

**Sign-off**:
- [ ] Skip link appears on Tab
- [ ] Skip link is readable (contrast ≥4.5:1)
- [ ] Clicking skip link focuses main content

---

### Test 3.2: Focus Ring Visibility (All Interactive Elements)
**Route**: `http://localhost:5173/`  
**Viewport**: 1280×720

**Action**:
1. Press Tab repeatedly to move through all interactive elements:
   - Skip link → Logo link → Nav links → Theme toggle → "Get started" button
2. At each element, verify:
   - [ ] Outline is **always visible** (2px solid)
   - [ ] Outline color is **cyan** (#00d4aa or rgb(0, 212, 170))
   - [ ] Outline offset is **2px** (small gap between element and outline)
3. Visually inspect focus ring (don't rely on color alone):
   - [ ] Outline is clearly distinguishable from element
   - [ ] Not hidden behind other content
   - [ ] Appears on Tab, disappears when clicking (`:focus-visible` in modern browsers)

**Pass if**:
- [ ] All interactive elements show focus ring on Tab
- [ ] Focus ring is cyan and has 2px offset
- [ ] No element is "lost" (hidden, scrolled out of view)

---

### Test 3.3: Color Contrast Verification
**Tool**: WebAIM Contrast Checker (https://webaim.org/resources/contrastchecker/)  
**Route**: Any page with text

**Action** (manual verification):
1. Open WebAIM contrast checker
2. Test samples:
   - [ ] Body text (#e8ecf4) on bg (#0a0e17): Expected ≥4.5:1
   - [ ] Primary button text (#0a0e17) on cyan (#00d4aa): Expected ≥4.5:1
   - [ ] Link text (#00d4aa) on bg (#0a0e17): Expected ≥4.5:1
   - [ ] Muted text (#6b7a94) on bg (#0a0e17): Expected ≥4.5:1 (borderline; may need adjustment)
   - [ ] Status badge (green #52c41a) text on white: Expected ≥4.5:1
3. For each test:
   - Paste hex colors into checker
   - Read "Contrast ratio:" value
   - [ ] Value ≥ 4.5 for normal text, ≥ 3 for UI components

**Pass if**: All ratios meet AA standard (4.5:1 for text, 3:1 for UI)

**Audit tool** (automated):
1. Open DevTools → Lighthouse or axe DevTools extension
2. Run accessibility audit
3. Check "Contrast" section for failures
4. [ ] Zero "Contrast" violations reported

---

### Test 3.4: Form Labels & ARIA Attributes
**Route**: `http://localhost:5173/app`  
**Action**:
1. Click "Create stream" → Modal opens
2. Open DevTools → Elements → Find recipient input
3. Inspect HTML:
   ```html
   <label htmlFor="recipient-input">Recipient address</label>
   <input id="recipient-input" type="text" aria-required="true" />
   ```
   **Expected**:
   - [ ] `<label>` element with `htmlFor="recipient-input"` (matches input `id`)
   - [ ] Input has `aria-required="true"`
   - [ ] On error, input has `aria-invalid="true"`
   - [ ] Error div has `aria-describedby="recipient-error"` linking to error message
4. Repeat for all form inputs (deposit, rate, duration, cliff date)

**Pass if**: All inputs have associated labels and required aria attributes

---

### Test 3.5: Live Regions (Async Feedback)
**Route**: `http://localhost:5173/app`  
**Viewport**: 1280×720

**Action**:
1. Open DevTools → Console
2. Navigate to Dashboard
3. **If streams are loading**:
   - Find live region element: `<div aria-live="polite" role="status">`
   - Check console for text: "Loading streams..." or similar
   - **Expected**: aria-live region announces to screen reader as content updates
4. **When streams load**:
   - Live region updates to: "Loaded [X] active streams"
   - Console shows text was updated
5. **Trigger error** (mock API failure):
   - Open Network tab → Throttle to Offline
   - Refresh page
   - Look for error live region: `<div role="alert" aria-live="assertive">`
   - Error message announced immediately

**Pass if**:
- [ ] Live regions present (`aria-live` attribute)
- [ ] Text updates when state changes
- [ ] Role is appropriate ("status" for updates, "alert" for errors)

---

### Test 3.6: Modal Focus Trap
**Route**: `http://localhost:5173/app`

**Action**:
1. Open CreateStreamModal → Step 1
2. Get all focusable elements in modal:
   - Recipient input (first)
   - Deposit input
   - Cancel button
   - Continue button (last)
3. Focus last element (Continue button):
   - DevTools → Console: `document.querySelector("button:contains('Continue')").focus()`
4. Press Tab → **Expected**: Focus wraps to first focusable element (recipient input)
5. Reverse: Focus first element, press Shift+Tab → **Expected**: Wraps to last element

**Pass if**: Tab cycles within modal; cannot Tab to elements outside modal

---

### Test 3.7: Automated A11y Scan (axe or Lighthouse)
**Route**: All pages (`/`, `/app`, `/app/streams`, `/app/recipient`, modals)

**Action**:
1. Install axe DevTools extension (Chrome) or use Lighthouse (DevTools tab)
2. For each route:
   - Open page
   - Run axe scan (click axe icon → "Scan THIS PAGE")
   - **Expected**: 0 violations at WCAG AA level
   - Check report for:
     - [ ] "Color contrast": 0 violations
     - [ ] "ARIA": 0 violations (aria-label, aria-describedby, etc.)
     - [ ] "Forms": 0 violations (labels, required fields)
     - [ ] "Navigation": 0 violations (landmarks, skip link)
3. Document any warnings or "needs review" items

**Sign-off**:
- [ ] All pages: 0 violations
- [ ] No "review" warnings related to contrast, labels, focus
- [ ] Any low-severity warnings documented and acceptable

---

## PHASE 4: RESPONSIVE DESIGN & MOBILE INTERACTION (30 min)

### Objective
Verify mobile layout, touch targets, and sidebar behavior across devices.

### Test 4.1: Mobile Navbar (48px height)
**Viewport**: 375×667 (mobile)  
**Route**: `/`

**Action**:
1. Open DevTools → Responsive Design Mode → iPhone 12 / 375×667
2. Verify navbar:
   - [ ] Height: 48px (not 64px)
   - [ ] Logo visible, left-aligned
   - [ ] Nav links hidden OR collapsed into menu
   - [ ] Hamburger icon (☰) visible on right if menu needed
   - [ ] Theme toggle icon visible
3. Measure navbar height:
   - DevTools → Elements → Select navbar element
   - Check computed height in Styles panel
   - **Expected**: 48px

**Pass if**: Navbar shrinks to 48px on mobile, all elements fit, no horizontal scroll

---

### Test 4.2: Touch Targets (≥48px)
**Viewport**: 375×667  
**Route**: `/app`

**Action**:
1. Hamburger toggle (sidebar open):
   - DevTools → Elements → Find toggle button
   - Check width/height (should be 48×48px or ≥48px)
2. Sidebar nav links:
   - Each link should be ≥48px tall (padding + text)
   - LI or link element height ≥48px
3. Buttons (Create stream, Connect wallet):
   - Check min-height in CSS: ≥48px for mobile
4. Form inputs:
   - Check height: ≥44px (iOS) or 48px (Android)

**Test interaction**:
1. Tap buttons without zooming in
2. **Expected**: All buttons clickable with thumb (not too small to tap)

**Pass if**: All touch targets ≥48px, no double-tap required to activate

---

### Test 4.3: Sidebar Mobile Overlay
**Viewport**: 375×667  
**Route**: `/app`

**Action**:
1. Tap hamburger icon (☰) → **Expected**:
   - [ ] Sidebar slides in from left
   - [ ] Sidebar width: 100vw (fills screen) or ~80vw
   - [ ] Nav links visible + clickable
   - [ ] Close button (X) OR area outside sidebar to close
   - [ ] Body scroll disabled (no scrolling behind sidebar)
2. Tap nav link (e.g., "Streams") → **Expected**:
   - [ ] Navigate to new page
   - [ ] Sidebar auto-closes
3. Re-open sidebar, tap outside (backdrop) → **Expected**:
   - [ ] Sidebar closes

**Pass if**: Sidebar overlays cleanly, doesn't scroll body behind, closes on nav or click

---

### Test 4.4: Modal on Mobile
**Viewport**: 375×667  
**Route**: `/app`

**Action**:
1. Click "Create stream" → Modal opens
2. **Expected**:
   - [ ] Modal width: ~90vw (not full-width; some padding on edges)
   - [ ] Modal height: flexible (scrolls if needed)
   - [ ] Title + close button (X) visible at top
   - [ ] Form fields: full-width, 48px+ height
   - [ ] Buttons: full-width or stacked below
3. Type in input → Keyboard appears
4. Test tab order with virtual keyboard:
   - Tab to next field without closing keyboard
   - Focus moves within modal

**Pass if**: Modal is readable and usable on mobile without pinch-zoom

---

### Test 4.5: Light Mode on Mobile
**Viewport**: 375×667  
**Route**: `/` (or any page)  
**Theme**: Light

**Action**:
1. Open page in light mode (toggle theme if needed)
2. Verify readability:
   - [ ] Text is dark (contrast ≥4.5:1 on white)
   - [ ] Links are visible (don't blend with white)
   - [ ] Buttons are visible (cyan stands out on white)
   - [ ] Form fields: border visible (dark border on white, not hidden)
3. Hamburger icon: visible and clear

**Pass if**: Light mode is readable; no elements wash out; dark text on light bg

---

## PHASE 5: COPY & FINAL SIGN-OFF (30 min)

### Objective
Verify copy tone, Stellar concepts clarity, and overall UX completeness.

### Test 5.1: Stellar Concepts Explanation
**Route**: All pages  
**Question**: Would a first-time user understand these terms?

**Check**:

| Term | Location | Explanation Provided | Example | Pass |
|------|----------|----------------------|---------|------|
| **Stream** | Dashboard empty state, hero section | "A continuous payment flow to a recipient at a defined rate" | [ ] |
| **Rate** | CreateStreamModal Step 2 | "Amount and frequency of disbursal (e.g., 38.62 USDC/month)" | [ ] |
| **Cliff** | CreateStreamModal Step 2 (if toggle visible) | "Optional start date when the stream begins accruing" | [ ] |
| **Recipient** | CreateStreamModal Step 1, label | "Stellar account receiving the stream" | [ ] |
| **Stellar address** | Input placeholder/label | "56-character account ID on Stellar (starts with G)" | [ ] |

**Action**:
1. Navigate to Dashboard empty state
2. Read copy: Does it explain streams clearly?
3. Hover over form labels → tooltips (if any) provide context
4. Check placeholder text in address field: Gives example or format hint?

**Pass if**: A new user would understand what a "stream" is without external docs

---

### Test 5.2: CTA Copy Consistency
**Route**: Landing → Dashboard  
**Check**:

| Route | Button Text | Expected | Match |
|-------|------------|----------|-------|
| Landing hero | CTA button | "Get started" or consistent with brand | [ ] |
| Dashboard empty | CTA button | "Create stream" (aligned with modal title) | [ ] |
| Dashboard loaded | CTA button | "Create stream" | [ ] |
| Modal Step 1–2 | Next button | "Continue" or "Next" (consistent) | [ ] |
| Modal Step 3 | Submit button | "Create & Sign" (indicates wallet action) | [ ] |

**Action**:
1. Compare button copy to spec section 6.2
2. Note any inconsistencies

**Pass if**: CTA copy consistent across pages; action words clear (Create, Continue, Sign)

---

### Test 5.3: Error Message Tone
**Route**: CreateStreamModal Step 1

**Action**:
1. Type invalid recipient → Tab away
2. **Expected error text matches pattern**: [What went wrong] + [Why] + [How to fix]
   - ❌ BAD: "Invalid."
   - ✓ GOOD: "Please enter a valid Stellar address (56 characters, starts with G)."
3. Leave deposit blank → Try to continue
4. **Expected**: "Deposit amount must be a positive number."

**Pass if**: Error messages are helpful, not cryptic; tell user how to fix

---

### Test 5.4: Branding Consistency
**Route**: Landing & Dashboard

**Check**:

| Element | Landing | App | Match | Notes |
|---------|---------|-----|-------|-------|
| Logo | Fluxora SVG | Fluxora SVG | [ ] | Same design |
| Color scheme | Dark/light toggle | Dark/light toggle | [ ] | Same theme system |
| Font family | Plus Jakarta Sans | Plus Jakarta Sans | [ ] | Consistent across |
| Accent color | Cyan (#00d4aa) | Cyan (#00d4aa) | [ ] | Primary action color |
| Typography scale | Headings (h1, h2) | Page titles, labels | [ ] | Samebaseline |

**Pass if**: Branding unified across marketing and app; no disparate visual styles

---

### Test 5.5: Component Completeness
**Checklist**: All spec'd components present and functional

- [ ] **Navbar** (unified):
  - Marketing path: nav links + "Get started"
  - App path: page title + network badge + wallet state
  - Mobile: responsive, hamburger on mobile

- [ ] **Button component** (all variants):
  - Primary (cyan)
  - Secondary (border)
  - Icon (toolbar)
  - All 5 states: default, hover, focus, active, disabled

- [ ] **CreateStreamModal** (3 steps):
  - Step 1: Recipient + deposit
  - Step 2: Rate + duration + cliff
  - Step 3: Review + sign
  - Focus trap + Escape closes
  - Error states + inline validation

- [ ] **StreamCreatedModal/Toast** (success):
  - Displays on successful creation (if backend ready)
  - Shows txn hash + explorer link
  - Live region announces success

- [ ] **Dashboard empty state**:
  - Copy explains streams
  - "Create stream" CTA visible + styled with Button

- [ ] **Sidebar** (app):
  - Collapses on toggle (desktop)
  - Mobile overlay + hamburger
  - Nav links styled + active state

- [ ] **Accessibility**:
  - Skip link present
  - Focus ring visible (2px cyan)
  - Modal focus trap working
  - Live regions announce status
  - WCAG AA contrast ✓
  - Semantic HTML (`<label>`, `role="*"`, `aria-*`) ✓

---

### Test 5.6: Documentation & Handoff

**Check**:
- [ ] `DESIGN_SPEC_VISUAL_CONSISTENCY.md` linked in PR description
- [ ] Figma (or design tool) link provided in PR (if available)
- [ ] Deferrals listed with owners + target release (section 9.2)
- [ ] Code comments explain unusual CSS or focus logic
- [ ] PR description includes:
  - High-level summary ("Unified navbar, button lib, modal states")
  - Screenshots or demo video
  - Testing notes (manual vs automated)
  - Sign-offs (design + PM + eng)

**Pass if**: Team can understand changes without async clarification

---

## FINAL SIGN-OFF

### Go/No-Go Criteria

**PASS (Ship to production)**:
- [ ] All Phase 1 tests pass (visual, responsive, buttons)
- [ ] All Phase 2 tests pass (modals, validation, error handling)
- [ ] All Phase 3 tests pass (accessibility, keyboard, contrast, ARIA)
- [ ] All Phase 4 tests pass (mobile layout, touch targets, sidebar)
- [ ] All Phase 5 tests pass (copy, concepts, completeness)
- [ ] Axe scan: 0 violations at WCAG AA
- [ ] Manual A11y audit: Screen reader test passed
- [ ] Device testing: iOS Safari + Android Chrome functional
- [ ] PR reviewed and approved by:
  - [ ] Design lead (visual consistency ✓)
  - [ ] PM (copy tone, Stellar concepts ✓)
  - [ ] Eng lead (code quality, no technical debt ✓)

**NO-GO (Needs fixes)**:
- Blockers:
  - [ ] Focus ring not visible on any interactive element
  - [ ] Color contrast < 4.5:1 on any text
  - [ ] Modal doesn't trap focus (Tab escapes modal)
  - [ ] Form validation doesn't work (invalid input accepted)
  - [ ] Live region not announced (no aria-live on async updates)
  - [ ] Any axe violation at WCAG AA level
  - [ ] Modal missing on mobile (not usable)
  - [ ] Buttons not clickable on mobile (touch target < 44px)

- Fixable issues (minor):
  - Typos in error messages
  - Hover state shadow calculation off
  - Minor spacing inconsistency
  - Missing tooltip or helper text (deferred to v0.2)

---

## TEST ENVIRONMENT & TOOLS

### Required Setup
```bash
# 1. Clone repo
git clone https://github.com/[org]/Fluxora-Frontend.git
cd Fluxora-Frontend

# 2. Checkout feature branch
git checkout design/fluxora-fe-30

# 3. Install dependencies
npm install

# 4. Start dev server
npm run dev
# Server runs at http://localhost:5173

# 5. Build & preview (optional, for production-like testing)
npm run build
npm run preview
```

### Browser Tools
- **DevTools**: Chrome (F12), Firefox (F12), Safari (Cmd+Option+J)
  - Elements inspector
  - Responsive Design Mode (Cmd+Shift+M)
  - Console for logging, focus testing
  - Lighthouse tab for A11y audit
- **Browser extensions**:
  - axe DevTools (Chrome, Firefox): WCAG scanning
  - WAVE: Accessibility checker
  - Color Contrast Analyzer: Contrast ratio verification
- **External tools**:
  - WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
  - Stellar Expert (for links): https://stellar.expert/

### Test Data
- **Stellar address** (for recipient input):
  ```
  GABC1234567890XYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNO
  ```
  (56 chars, valid format for testnet)
- **Test amounts**: 1000, 500, 100 USDC (for deposit/rate)
- **Test date**: 2026-04-15 (for cliff date, future date)

---

## APPENDIX: Quick Checklist (Print & Use)

```
PHASE 1: VISUAL REGRESSION (45 min)
☐ Navbar desktop (light): Logo, nav, theme, CTA
☐ Navbar app (dark): Page title, network, wallet
☐ Responsive 768px: Layout reflows, hamburger
☐ Responsive 375px: Mobile layout, 48px navbar
☐ Buttons: Primary (5 states), Secondary (5 states), Icon
  ☐ Colors match spec (cyan, border, icon subtle)
  ☐ Hover/focus visible
  ☐ Disabled grayed out

PHASE 2: MODALS & VALIDATION (45 min)
☐ Modal Step 1: Fields visible, autofocus, focus trap
☐ Validation: Invalid input → error (red border, message)
☐ Valid input: Enables Continue button
☐ Modal Step 2: Advances, shows values from Step 1
☐ Modal Step 3: Review + summary correct
☐ Error state: Inline error, role="alert", retry button
☐ Success state: Modal closes, success modal/toast shows (if backend ready)

PHASE 3: ACCESSIBILITY (45 min)
☐ Skip link: Tab → visible, clickable, focuses main content
☐ Focus ring: All interactive elements, cyan, 2px offset
☐ Color contrast: Text ≥4.5:1 (WebAIM checker)
☐ Form labels: Associated with inputs (htmlFor + id, or label wrapping)
☐ ARIA: aria-required, aria-invalid, aria-describedby on inputs
☐ Live regions: aria-live on async updates (loading, connect status)
☐ Modal semantics: role="dialog", aria-modal, aria-labelledby
☐ Axe scan: 0 violations (all pages)

PHASE 4: MOBILE (30 min)
☐ Navbar: 48px height on mobile
☐ Touch targets: ≥48px (buttons, links, inputs)
☐ Sidebar mobile: Hamburger toggle, overlay, auto-close on nav
☐ Modal mobile: Readable, not full-screen, forms usable
☐ Light mode: Readable, contrast OK, no wash-out

PHASE 5: COPY & SIGN-OFF (30 min)
☐ Stellar concepts: Stream, rate, cliff, recipient explained in UI
☐ CTA copy: Consistent ("Get started" marketing, "Create stream" app)
☐ Error messages: [What] + [Why] + [How to fix]
☐ Branding: Logo, colors, fonts consistent across surfaces
☐ Components: Navbar, Button, Modal, EmptyState, Sidebar all present
☐ Documentation: PR linked to spec, design/PM/eng sign-offs

FINAL GO-NO-GO
☐ All phases PASS
☐ Axe: 0 violations
☐ Device test: iOS + Android functional
☐ Sign-offs: Design ✓ PM ✓ Eng ✓
☐ Ready to ship
```

---

## NOTES & DEBUGGING

### Common Issues & Fixes

| Issue | Likely Cause | Fix |
|-------|------|-----|
| Focus ring not visible | CSS using `outline: none` or no focus-visible rule | Check Button.tsx; add `outline: 2px solid var(--accent)` on `:focus-visible` |
| Modal not trapping focus | Focus trap logic buggy or not implemented | Test Tab/Shift+Tab; check createStreamModal focus trap code |
| Error message not showing | aria-live not on element or wrong role | Add `role="alert" aria-live="polite"` to error div |
| Button colors wrong | CSS var not defined or overridden | Check App.tsx App.tsx theme setter; verify `--accent`, `--border`, etc. in :root |
| Mobile sidebar scrolls body | No `overflow: hidden` on body when sidebar open | Add `document.body.style.overflow = 'hidden'` on sidebar open |
| Contrast < 4.5:1 | Color vars too close | Update CSS custom property values in App.tsx light/dark sections |

### Screen Reader Testing (Quick Verification)

**Mac (VoiceOver)**:
```
Cmd+F5 → Enable VoiceOver
VO = Control+Option
VO+→ next item
VO+↑ rotor (jump to headings, links, etc.)
VO+Space activate
Ctrl+Option+U Web rotor
```

**Windows (NVDA)**:
```
Download NVDA (free): https://www.nvaccess.org/
Insert = NVDA key
After enabling: Arrow keys navigate, Enter to activate
Insert+H help
```

**Quick check**: Open dashboard with NVDA/VO enabled → Can you hear page title? Nav links? Can you navigate to form and fill it?

---

**Document Version**: 1.0  
**Last Updated**: March 30, 2026  
**Next Review**: Upon Phase 1 completion (24 hours)

