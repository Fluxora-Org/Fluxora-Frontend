# CreateStreamModal Field Labels & Helper Text Design Specification

**Issue**: #216  
**Component**: `src/components/CreateStreamModal.tsx` (Step 2)  
**Status**: Design Specification  
**Target**: WCAG 2.1 AA Compliance  
**Last Updated**: May 31, 2026

---

## Overview

This specification defines the design for clarifying accrual rate, cliff, and duration field labels and helper text in the CreateStreamModal component. The improvements address user error rates by providing:

1. **Inline unit indicators** (e.g., "USDC / day")
2. **Contextual tooltips** for complex concepts
3. **Clear input format guidance**
4. **Accessible, responsive design**

---

## Problem Statement

Treasury managers currently experience confusion when filling out Step 2 of the CreateStreamModal due to:

- Lack of inline unit labels on accrual rate and duration fields
- No contextual explanations for "cliff" and "accrual calculation"
- Unclear input format expectations
- Helper text that doesn't provide sufficient guidance

This results in incorrect value submissions and increased support requests.

---

## Design Goals

1. **Reduce user error** through clear labeling and inline units
2. **Meet WCAG 2.1 AA** requirements (contrast, keyboard nav, ARIA)
3. **Maintain consistency** with existing design system
4. **Responsive design** across all breakpoints (320px - 1024px+)
5. **Progressive disclosure** of complexity through tooltips

---

## Field-by-Field Specifications

### 1. Stream Rate (Accrual Rate)

#### Label Design
```
Stream rate * [i]
```

**Components**:
- **Primary label**: "Stream rate"
- **Required indicator**: Red asterisk `*`
- **Info tooltip**: Circle icon with "i" 

#### Input with Inline Unit
```
┌─────────────────────────────────────┐
│ 38.62                    USDC / day │
└─────────────────────────────────────┘
```

**Layout**:
- Input field with inline suffix badge
- Suffix: `USDC / day` (non-editable, visual only)
- Badge styling: 
  - Background: `var(--surface-neutral)`
  - Color: `var(--text-muted)`
  - Padding: `4px 8px`
  - Border-radius: `4px`
  - Font: `var(--font-body-sm)`
  - Position: Absolute right, vertically centered

#### Helper Text (Default State)
```
How much USDC the recipient earns per day
```

**Styling**:
- Color: `var(--text-muted)`
- Font: `var(--font-body-sm)` (13px / 1.4 line-height)
- Margin-top: `4px`

#### Tooltip Content
**Trigger**: Click/tap info icon or focus + Enter/Space  
**Title**: "How is stream rate calculated?"  
**Content**:
```
The stream rate is the amount of USDC that accrues to the 
recipient per day. For example, a rate of 38.62 USDC/day 
means the recipient can withdraw approximately 270 USDC 
after 7 days.

Formula: Total Deposit ÷ Duration = Stream Rate
```

#### Error State
```
Stream rate must be a positive number.
```
- Icon: Error circle with exclamation
- Color: `var(--status-error)`
- Replaces helper text

#### States Summary

| State | Label | Input Border | Helper/Error Text | Icon |
|-------|-------|--------------|-------------------|------|
| Default | `--text-vivid` | `--border-neutral` | Muted helper | Info (muted) |
| Focus | `--text-vivid` | `--border-interactive` (2px) | Muted helper | Info (interactive) |
| Hover (icon) | `--text-vivid` | `--border-neutral` | Muted helper | Info (interactive) |
| Error (touched) | `--text-vivid` | `--status-error` (2px) | Red error text | Error icon |
| Success (valid) | `--text-vivid` | `--status-success` (2px) | Green success | Check icon |
| Disabled | `--text-disabled` | `--border-neutral` | Muted helper | None |

---

### 2. Stream Duration

#### Label Design
```
Stream duration * [i]
```

#### Input with Inline Unit
```
┌─────────────────────────────────────┐
│ 7                              days │
└─────────────────────────────────────┘
```

**Layout**:
- Input field with inline suffix badge
- Suffix: `days` (non-editable, visual only)
- Badge styling: Same as Stream Rate

**Alternative**: Consider dropdown for unit selection (days/weeks/months)
- Future enhancement for v2
- Current v1: Fixed to "days" only

#### Helper Text (Default State)
```
How many days the stream will run before ending
```

#### Tooltip Content
**Trigger**: Click/tap info icon or focus + Enter/Space  
**Title**: "Understanding stream duration"  
**Content**:
```
The duration defines the total length of the stream in days.
After this period ends, the full deposit amount will have 
been streamed to the recipient.

Example: A 7-day stream transfers funds continuously over 
one week. The recipient can withdraw at any time during 
this period.
```

#### Error State
```
Duration must be a positive number.
```

---

### 3. Cliff Period

#### Label Design
```
Cliff period (optional) [i]
```

**Components**:
- **Primary label**: "Cliff period"
- **Optional indicator**: "(optional)" in muted color
- **Info tooltip**: Circle icon with "i"

#### Toggle Control
```
[ Switch OFF ]  Enable cliff (vesting lockup until specific date)
```

**States**:
- Off (default): Switch thumb to left, gray background
- On: Switch thumb to right, teal background (`--brand-primary`)

#### Conditional Field (when enabled)
```
Cliff date *
┌─────────────────────────────────────┐
│ 2026-06-15                          │
└─────────────────────────────────────┘
```

#### Helper Text (Default State)
```
The recipient cannot withdraw until this date, even though USDC accrues
```

#### Tooltip Content
**Trigger**: Click/tap info icon or focus + Enter/Space  
**Title**: "What is a cliff?"  
**Content**:
```
A cliff is a vesting lockup period. During the cliff:
• USDC continues to accrue normally
• The recipient CANNOT withdraw any funds
• After the cliff date, all accrued funds become withdrawable

Common use case: Employee compensation where vesting 
"cliff" prevents withdrawal for the first 3-6 months, 
ensuring commitment before funds are accessible.

Example: 1-year stream with 3-month cliff = No withdrawals 
for 3 months, then all accrued USDC becomes available.
```

#### Error States
```
Cliff date is required.
Cliff date must not be in the past.
Cliff date must be on or after the start date.
```

---

## Component Design: Tooltip

### Visual Design

```
┌────────────────────────────────────────────┐
│ How is stream rate calculated?        [×] │
├────────────────────────────────────────────┤
│                                            │
│  The stream rate is the amount of USDC    │
│  that accrues to the recipient per day.   │
│                                            │
│  Formula: Total Deposit ÷ Duration        │
│                                            │
└────────────────────────────────────────────┘
       ▼  (arrow pointing to trigger icon)
```

### Specifications

**Trigger Element**:
- Icon: Circle with "i"
- Size: 16px × 16px
- Color: `var(--text-muted)` default, `var(--brand-primary)` hover/focus
- Cursor: `pointer`
- Focus ring: 2px `var(--border-interactive)` with 2px offset

**Popover Container**:
- Background: `var(--surface-elevated)`
- Border: 1px `var(--border-neutral)`
- Border-radius: 8px
- Box-shadow: `0 8px 24px rgba(0, 0, 0, 0.15)`
- Padding: 16px
- Max-width: 320px
- Z-index: 1100 (above modal at 1000)

**Title**:
- Font: `var(--font-heading-sm)` (14px, 600 weight)
- Color: `var(--text-vivid)`
- Margin-bottom: 8px

**Body**:
- Font: `var(--font-body-sm)` (13px / 1.5 line-height)
- Color: `var(--text-secondary)`

**Close Button**:
- Position: Absolute top-right
- Size: 20px × 20px
- Icon: × (close)
- Color: `var(--text-muted)`
- Hover: `var(--text-vivid)`

**Arrow/Pointer**:
- 8px × 8px triangle
- Color: `var(--surface-elevated)` (matches popover background)
- Border: 1px `var(--border-neutral)` on visible sides
- Position: Dynamic based on trigger location

### Interaction Behavior

**Desktop**:
- Click icon: Toggle tooltip
- Hover icon (500ms delay): Show tooltip preview
- Click outside: Close tooltip
- ESC key: Close tooltip
- Tab away: Close tooltip

**Mobile**:
- Tap icon: Toggle tooltip
- Tap outside: Close tooltip
- Tap close button: Close tooltip

### Accessibility

- `role="tooltip"` for popover container
- `aria-labelledby` points to tooltip title
- `aria-describedby` on trigger points to tooltip ID
- Focus trap: Yes, when tooltip is open
- Keyboard navigation: 
  - Tab: Move to close button
  - Shift+Tab: Cycle back
  - ESC: Close tooltip
  - Enter/Space on icon: Toggle tooltip

---

## Typography & Spacing

### Label Hierarchy
```
┌─ Stream rate * [i]  ← var(--font-body-md), --text-vivid, 14px/600
│
├─ Input field (38.62) ← var(--font-body-md), --text-vivid, 40px height
│  └─ Unit badge (USDC / day) ← var(--font-body-sm), --text-muted, inline
│
└─ Helper text  ← var(--font-body-sm), --text-muted, 13px/1.4
```

### Spacing
- Label to input: `6px` (`var(--space-xs)`)
- Input to helper text: `4px`
- Between form groups: `16px` (`var(--space-md)`)
- Icon positioning: 
  - Right of label: `6px` margin-left
  - Vertically: Aligned with label baseline

### Responsive Adjustments

**Mobile (320px - 480px)**:
- Input height: `44px` (minimum touch target)
- Font size: Maintained at 14px (prevent zoom on iOS)
- Tooltip max-width: `calc(100vw - 32px)`
- Tooltip positioning: Bottom-center (avoid off-screen)

**Tablet (481px - 768px)**:
- Input height: `42px`
- Tooltip max-width: `320px`

**Desktop (769px+)**:
- Input height: `40px`
- Tooltip max-width: `360px`
- Tooltip positioning: Smart positioning (top/bottom/left/right based on space)

---

## Design Tokens

### New Tokens Required

```css
/* Tooltip */
--tooltip-bg: var(--surface-elevated);
--tooltip-border: var(--border-neutral);
--tooltip-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
--tooltip-title-color: var(--text-vivid);
--tooltip-text-color: var(--text-secondary);
--tooltip-z-index: 1100;

/* Inline unit badge */
--input-badge-bg: var(--surface-neutral);
--input-badge-color: var(--text-muted);
--input-badge-padding: 4px 8px;
--input-badge-border-radius: 4px;

/* Info icon */
--icon-info-default: var(--text-muted);
--icon-info-hover: var(--brand-primary);
--icon-info-active: var(--brand-primary-dark);
--icon-info-size: 16px;
```

### Dark Theme Adjustments

```css
[data-theme="dark"] {
  --tooltip-bg: #2a2f3a;
  --tooltip-border: #404854;
  --tooltip-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  
  --input-badge-bg: #1f242c;
  --input-badge-color: #9ca5b4;
}
```

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance

#### 1.3.5 Identify Input Purpose ✓
- All inputs have programmatic labels
- `autocomplete` attributes where applicable
- Helper text provides format guidance

#### 1.4.3 Contrast (Minimum) ✓
**Text Contrast** (4.5:1):
- Label vs background: 12.5:1 (`--text-vivid` on `--surface-elevated`)
- Helper text vs background: 5.2:1 (`--text-muted` on `--surface-elevated`)
- Error text vs background: 4.6:1 (`--status-error` on `--surface-elevated`)

**UI Component Contrast** (3:1):
- Input border (default): 3.2:1
- Input border (focus): 5.1:1
- Icon (default): 5.2:1
- Badge background: 4.1:1

#### 2.1.1 Keyboard ✓
- All tooltips accessible via keyboard (Enter/Space to toggle)
- Focus visible on all interactive elements
- Tab order: Label → Input → Tooltip icon
- ESC closes tooltips

#### 2.4.7 Focus Visible ✓
- Focus ring: 2px solid `var(--border-interactive)` with 2px offset
- Focus ring visible on: inputs, tooltip icons, close button
- Minimum focus indicator size: 2px thick

#### 3.2.2 On Input ✓
- No automatic actions on input change
- Validation occurs on blur
- Error messages announced via `role="alert"`

#### 4.1.2 Name, Role, Value ✓
- All inputs: `aria-label` or associated `<label>`
- All inputs: `aria-invalid` when error present
- All inputs: `aria-describedby` pointing to helper/error text
- Tooltip triggers: `aria-describedby` pointing to tooltip
- Tooltips: `role="tooltip"` or `role="dialog"` if interactive

### ARIA Attributes

**Input Field**:
```html
<input
  id="create-stream-accrual-rate"
  type="text"
  aria-label="Stream rate"
  aria-required="true"
  aria-invalid="false"
  aria-describedby="rate-helper rate-unit"
/>
```

**Tooltip Trigger**:
```html
<button
  type="button"
  aria-label="Learn more about stream rate calculation"
  aria-describedby="rate-tooltip"
  aria-expanded="false"
>
  <svg aria-hidden="true">...</svg>
</button>
```

**Tooltip Content**:
```html
<div
  id="rate-tooltip"
  role="tooltip"
  aria-labelledby="rate-tooltip-title"
  class="tooltip-popover"
>
  <h3 id="rate-tooltip-title">How is stream rate calculated?</h3>
  <p>...</p>
</div>
```

---

## State Specifications

### Default State
- Input border: 1px `var(--border-neutral)`
- Input background: `var(--surface-base)`
- Label: `var(--text-vivid)`
- Helper text: `var(--text-muted)` below input
- Icon: `var(--text-muted)`

### Hover State (Input)
- Input border: 1px `var(--border-neutral)` (no change)
- Cursor: text

### Hover State (Icon)
- Icon color: `var(--brand-primary)`
- Cursor: pointer

### Focus State (Input)
- Input border: 2px `var(--border-interactive)`
- Input outline: None (border handles it)
- Focus ring: 2px `var(--border-interactive)` with 2px offset
- Helper text: Remains visible

### Focus State (Icon)
- Focus ring: 2px `var(--border-interactive)` with 2px offset
- Icon color: `var(--brand-primary)`

### Active State (Typing)
- Same as focus state
- Helper text remains visible

### Error State (Validation Failed)
- Input border: 2px `var(--status-error)`
- Helper text: Replaced with error message
- Error message: `var(--status-error)` color
- Error icon: Prepends error message

### Success State (Validation Passed)
- Input border: 2px `var(--status-success)`
- Helper text: Optional success message
- Success icon: Green checkmark (optional)

### Disabled State
- Input border: 1px `var(--border-neutral)`
- Input background: `var(--surface-sunken)`
- Label: `var(--text-disabled)`
- Helper text: `var(--text-disabled)`
- Cursor: not allowed
- Icon: Hidden or disabled color

### Loading State
- Shimmer/skeleton on input (rare in this context)
- Icon: Spinner animation (if applicable)

### Empty State
- Placeholder: `var(--text-disabled)` color
- Placeholder text: "0.00" for Stream rate, "1" for duration
- Helper text visible

---

## Responsive Behavior

### Breakpoints

#### Mobile Portrait (320px - 374px)
- Input width: 100%
- Inline unit badge: Font size 12px
- Tooltip: Full-width (calc(100vw - 32px)), bottom-positioned
- Touch target: Minimum 44px × 44px

#### Mobile Landscape / Small (375px - 480px)
- Input width: 100%
- Inline unit badge: Font size 13px
- Tooltip: Max-width 300px, smart positioning

#### Tablet (481px - 768px)
- Input width: 100%
- Inline unit badge: Font size 13px
- Tooltip: Max-width 320px, smart positioning

#### Desktop Small (769px - 1024px)
- Input width: 100%
- Inline unit badge: Font size 13px
- Tooltip: Max-width 340px, smart positioning

#### Desktop Large (1025px+)
- Input width: 100%
- Inline unit badge: Font size 13px
- Tooltip: Max-width 360px, smart positioning

### Layout Behavior

**Label + Icon**:
- Horizontal layout: Label on left, icon on right
- Icon always aligned with label baseline
- Wrapping: Label can wrap, icon stays on first line

**Input + Badge**:
- Badge position: Absolute right, centered vertically
- Input padding-right: Adjusted to prevent text overlap
- Badge remains visible on all screen sizes

**Tooltip Position**:
- Desktop: Above or below icon (smart positioning)
- Mobile: Below icon (prevent off-screen)
- Collision detection: Flip if insufficient space

---

## Edge Cases

### Long Values
- **Very large numbers**: Input uses ellipsis if overflow
- **Scientific notation**: Not supported; user must enter decimal
- **Negative numbers**: Blocked by validation

### Long Addresses (Context)
- **Stellar address in review**: Masked display (first 6 + last 6 chars)
- **Copy functionality**: Full address copied on click

### Zero Values
- **Stream rate = 0**: Error "Stream rate must be positive"
- **Duration = 0**: Error "Duration must be positive"

### Tooltip Edge Cases
- **Multiple tooltips open**: Only one tooltip open at a time
- **Tooltip + dropdown conflict**: Tooltip closes when dropdown opens
- **Scrolling parent**: Tooltip repositions or closes (implementation choice)

### Cliff Date Edge Cases
- **Cliff before start**: Error "Cliff date must be on or after start date"
- **Cliff after end**: Warning (allowed, but unusual)
- **Cliff = start date**: Allowed

---

## Implementation Notes

### Phase 1: Core Features (This PR)
1. ✅ Inline unit badges for Stream Rate and Duration
2. ✅ Updated helper text for all fields
3. ✅ Info icon with tooltip component
4. ✅ Tooltip content for all three concepts
5. ✅ Accessibility attributes (ARIA)
6. ✅ Responsive tooltip positioning
7. ✅ Design tokens updates

### Phase 2: Future Enhancements (Backlog)
- [ ] Unit dropdown for duration (days/weeks/months conversion)
- [ ] Real-time calculation preview in tooltip
- [ ] Animated transitions for tooltip
- [ ] Inline validation as user types (debounced)
- [ ] Preset templates (e.g., "3-month employee stream")

---

## Testing Checklist

### Visual QA
- [ ] All states render correctly (default, hover, focus, error, success, disabled)
- [ ] Inline unit badges display properly on all screen sizes
- [ ] Tooltips position correctly and avoid off-screen issues
- [ ] Text doesn't overflow or get clipped
- [ ] Icons render sharply on Retina displays

### Accessibility QA
- [ ] Contrast ratios meet WCAG AA (4.5:1 text, 3:1 UI)
- [ ] Keyboard navigation: Tab through all fields and icons
- [ ] Screen reader: All labels, helper text, and errors announced
- [ ] Focus visible on all interactive elements
- [ ] Tooltip accessible via Enter/Space keys
- [ ] ESC closes tooltips
- [ ] Tooltip content readable by screen reader

### Functional QA
- [ ] Validation triggers on blur
- [ ] Error messages replace helper text
- [ ] Success state shows after valid input
- [ ] Tooltip toggles on click/tap
- [ ] Tooltip closes on outside click
- [ ] Cliff toggle shows/hides date field
- [ ] All error messages display correct content

### Responsive QA
- [ ] Test on 320px (iPhone SE)
- [ ] Test on 375px (iPhone 12/13/14)
- [ ] Test on 768px (iPad portrait)
- [ ] Test on 1024px (iPad landscape)
- [ ] Test on 1920px (desktop)

### Cross-Browser QA
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS 15+)
- [ ] Chrome Mobile (Android)

---

## Design Handoff Assets

### Figma Links
- [Mockups - All States] [TBD]
- [Prototype - Interaction Flow] [TBD]
- [Component Library] [TBD]

### Screenshots
- Before/After comparison images
- All state variations
- Responsive breakpoint examples
- Dark theme variants

### Code Snippets
- React component structure
- CSS for inline unit badges
- Tooltip component example
- ARIA attribute examples

---

## References

- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/?showtechniques=135)
- [Stellar Address Format](https://developers.stellar.org/docs/fundamentals-and-concepts/stellar-data-structures/accounts)
- [Design Tokens Quick Reference](./DESIGN_TOKENS_QUICK_REFERENCE.md)
- [Modal Accessibility Verification](./MODAL_ACCESSIBILITY_VERIFICATION.md)
- [Component States](./COMPONENT_STATES.md)

---

## Changelog

**May 31, 2026** - Initial specification created
- Defined field-by-field requirements
- Specified tooltip design and interaction
- Documented accessibility requirements
- Created testing checklist

---

## Sign-off

**Designer**: [Assigned]  
**Engineer**: [Assigned]  
**Accessibility Lead**: [Assigned]  
**Product Manager**: [Assigned]  

---

_This specification is a living document and will be updated as implementation details are refined._
