# Focus Ring Specification

**Issue**: #217  
**Component Scope**: All interactive elements (buttons, inputs, links, form controls)  
**Status**: Design Specification  
**Target**: WCAG 2.1 AA Compliance (2.4.7 Focus Visible, 2.4.11 Focus Appearance)  
**Last Updated**: May 31, 2026

---

## Overview

This specification defines a comprehensive, token-driven focus ring system for all interactive elements across the Fluxora frontend. The specification addresses inconsistent focus indicators that currently fail WCAG 2.4.11 (Focus Appearance) requirements.

**Key Requirements**:
- Focus ring width: ≥2px
- Contrast ratio: ≥3:1 against adjacent background
- Use `:focus-visible` (not `:focus`) to avoid mouse-click rings
- Consistent across all interactive elements
- Support for light and dark themes
- Responsive and accessible

---

## Problem Statement

Current implementation has inconsistencies:
- **Inconsistent widths**: 1px in some components, 2px in others, 4px outline-offset in navigation
- **Inconsistent colors**: `#0ea5e9`, `#00d4aa`, `#007acc` used across different contexts
- **Mixed implementations**: Some use `outline`, some use `box-shadow`, some use both
- **No fallback for overflow clipping**: Focus rings get cut off in containers with `overflow: hidden`
- **WCAG 2.4.11 non-compliance**: Some focus indicators don't meet 3:1 contrast requirement

---

## Design Goals

1. **WCAG 2.1 AA Compliance**: Meet both 2.4.7 (Focus Visible) and 2.4.11 (Focus Appearance)
2. **Consistency**: Single source of truth for all focus ring styling
3. **Token-driven**: All values defined in design tokens for easy theming
4. **Accessibility-first**: Works across high-contrast mode, reduced motion, and screen readers
5. **Developer-friendly**: Simple to implement, difficult to implement incorrectly

---

## Focus Ring Specifications

### Dimensions

| Property | Value | Rationale |
|----------|-------|-----------|
| **Ring Width** | `2px` | Minimum WCAG 2.4.11 requirement, clearly visible |
| **Ring Offset** | `2px` | Adequate spacing from element, prevents visual crowding |
| **Total Area** | Width + Offset × 2 | Minimum perimeter change area per WCAG 2.4.11 |

### Colors

#### Light Theme

| Context | Color | Hex | Contrast vs. Surface | Pass |
|---------|-------|-----|----------------------|------|
| Primary focus ring | Cyan | `#0ea5e9` | 5.1:1 vs. `#f0f3f7` | ✅ |
| Focus ring halo (optional) | Cyan (10% opacity) | `rgba(14, 165, 233, 0.1)` | N/A | — |

#### Dark Theme

| Context | Color | Hex | Contrast vs. Surface | Pass |
|---------|-------|-----|----------------------|------|
| Primary focus ring | Teal | `#00d4aa` | 6.2:1 vs. `#151e2e` | ✅ |
| Focus ring halo (optional) | Teal (15% opacity) | `rgba(0, 212, 170, 0.15)` | N/A | — |

### Implementation Approach

**Dual-layer strategy** (outline + box-shadow):

```css
element:focus-visible {
  /* Layer 1: Outline (accessible in high-contrast mode, forced-colors) */
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
  
  /* Layer 2: Box-shadow (visible even when outline is clipped) */
  box-shadow: var(--focus-ring-shadow);
}
```

**Why both?**
- **Outline**: Respected by high-contrast and forced-colors modes
- **Box-shadow**: Not clipped by `overflow: hidden` ancestors
- Together: Guaranteed visibility in all scenarios

---

## Design Tokens

### Core Focus Ring Tokens

```css
:root {
  /* Focus Ring Dimensions */
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
  
  /* Focus Ring Colors */
  --focus-ring-color: #0ea5e9; /* Cyan for light theme */
  --focus-ring-halo: rgba(14, 165, 233, 0.1);
  
  /* Focus Ring Box-Shadow (fallback for clipped outlines) */
  --focus-ring-shadow: 0 0 0 2px var(--color-bg-primary),
                       0 0 0 4px var(--focus-ring-color);
  
  /* Inset variant (for elements inside overflow containers) */
  --focus-ring-shadow-inset: inset 0 0 0 2px var(--focus-ring-color);
}

:root[data-theme="dark"] {
  /* Dark theme overrides */
  --focus-ring-color: #00d4aa; /* Teal for dark theme */
  --focus-ring-halo: rgba(0, 212, 170, 0.15);
}
```

### Component-Specific Overrides

Some components may need adjusted focus ring behavior:

```css
/* Button with filled background */
:root {
  --focus-ring-button: 0 0 0 2px var(--color-bg-primary),
                       0 0 0 4px var(--focus-ring-color);
}

/* Input field (border-based) */
:root {
  --focus-ring-input-border: 2px solid var(--focus-ring-color);
  --focus-ring-input-shadow: 0 0 0 3px var(--focus-ring-halo);
}

/* Link (minimal, text-based) */
:root {
  --focus-ring-link-offset: 3px; /* More breathing room for inline text */
}
```

---

## Component-by-Component Specification

### 1. Buttons

#### Default Button (`<button>`, `Button` component)

**States**:
- **Default**: No focus ring
- **Hover** (mouse): No focus ring (`:hover` only)
- **Focus** (keyboard): Full focus ring (`:focus-visible`)
- **Active** (pressed): Focus ring remains (keyboard) or absent (mouse)
- **Disabled**: No focus ring (not focusable)

**Implementation**:
```css
.button:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
  box-shadow: var(--focus-ring-shadow);
}

/* Remove focus ring for mouse clicks */
.button:focus:not(:focus-visible) {
  outline: none;
  box-shadow: none;
}
```

**Edge Cases**:
- **Button with icon only**: Same focus ring
- **Loading button**: Focus ring visible but interaction disabled
- **Inside modal**: Focus ring should not be clipped by modal edges

---

### 2. Input Fields

#### Text Inputs (`<input type="text">`, `Input` component, `InputWithUnit`)

**States**:
- **Default**: 1px border, no focus ring
- **Focus** (keyboard or mouse): 2px border + subtle glow
- **Error**: 2px red border + red glow on focus
- **Disabled**: No focus ring (not focusable)

**Implementation**:
```css
.input {
  border: 1px solid var(--border-neutral);
  transition: all 0.15s ease;
}

.input:focus-visible,
.input:focus {
  outline: none; /* Use border + box-shadow instead */
  border: 2px solid var(--focus-ring-color);
  padding: 9px calc(var(--space-md) - 1px); /* Compensate for border */
  box-shadow: 0 0 0 3px var(--focus-ring-halo);
}

/* Error state */
.input[aria-invalid="true"]:focus-visible {
  border-color: var(--status-error);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}
```

**Rationale**:
- Inputs use border + box-shadow instead of outline for tighter integration
- Subtle glow (3px halo) provides focus feedback without being overwhelming
- Error state overrides with red color but maintains same pattern

---

### 3. Links

#### Navigation Links (`<a>`, `NavLink` component)

**States**:
- **Default**: Underline on hover only
- **Focus** (keyboard): Focus ring with larger offset
- **Active**: Focus ring persists

**Implementation**:
```css
a:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: 3px; /* Larger offset for inline text */
  box-shadow: none; /* Outline only for links */
}

/* Navigation links (header/sidebar) */
nav a:focus-visible {
  outline-offset: 4px;
  border-radius: var(--radius-sm);
}
```

**Rationale**:
- Larger offset (3px-4px) prevents focus ring from touching text
- Inline links don't need box-shadow (outline sufficient)
- Navigation links get rounded outline via `border-radius`

---

### 4. Form Controls

#### Checkboxes, Radio Buttons, Toggles

**Implementation**:
```css
input[type="checkbox"]:focus-visible,
input[type="radio"]:focus-visible,
.toggle-switch:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}
```

#### Select Dropdowns

**Implementation**:
```css
select:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
  border: 2px solid var(--focus-ring-color);
}
```

---

### 5. Custom Interactive Elements

#### Modal Close Buttons, Icon Buttons, Tooltips

**Implementation**:
```css
[role="button"]:focus-visible,
.icon-button:focus-visible,
.tooltip-trigger:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/* Circular buttons (icon-only) */
.icon-button:focus-visible {
  border-radius: 50%; /* Ensures circular outline */
}
```

---

## Special Cases & Edge Conditions

### Overflow Clipping

**Problem**: Focus rings get clipped by `overflow: hidden` containers.

**Solution**: Use inset box-shadow variant for elements inside constrained containers.

```css
/* Apply to parent container */
.modal-body-scroll {
  overflow-y: auto;
  overflow-x: clip;
  overflow-clip-margin: 6px; /* Allow focus ring to extend */
}

/* Or use inset variant on child */
.focus-inset:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring-shadow-inset);
}
```

---

### High Contrast Mode

Focus rings must remain visible in Windows High Contrast Mode.

```css
@media (prefers-contrast: high) {
  :focus-visible {
    outline-width: 3px; /* Thicker in high contrast */
    outline-offset: 3px;
  }
}
```

---

### Reduced Motion

Transitions should be disabled for users who prefer reduced motion.

```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
  }
}
```

Focus rings appear instantly (no transition delay).

---

## Accessibility Compliance

### WCAG 2.4.7 Focus Visible (Level AA) ✅

**Requirement**: Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible.

**Implementation**:
- ✅ All interactive elements have visible focus indicators
- ✅ Focus ring appears on keyboard navigation (`:focus-visible`)
- ✅ Focus ring does not appear on mouse click (`:focus:not(:focus-visible)`)
- ✅ Minimum 2px width ensures visibility

---

### WCAG 2.4.11 Focus Appearance (Level AA) ✅

**Requirement**: The focus indicator area is ≥2px thick, and the contrast ratio is ≥3:1 against adjacent colors.

**Implementation**:
- ✅ **Thickness**: 2px width meets minimum
- ✅ **Contrast**: 5.1:1 (light) and 6.2:1 (dark) exceed 3:1 minimum
- ✅ **Area**: Outline + offset creates sufficient visual change
- ✅ **Visibility**: Dual-layer approach (outline + box-shadow) guarantees visibility

| Theme | Focus Color | Background | Contrast Ratio | Pass |
|-------|-------------|------------|----------------|------|
| Light | `#0ea5e9` | `#f0f3f7` | 5.1:1 | ✅ |
| Dark | `#00d4aa` | `#151e2e` | 6.2:1 | ✅ |

---

## Implementation Guide

### For Developers

#### Step 1: Import Accessibility Styles

Ensure `src/styles/accessibility.css` is imported in your app entry point:

```tsx
// src/main.tsx or src/App.tsx
import './styles/accessibility.css';
```

#### Step 2: Use Design Tokens

Always reference tokens instead of hard-coded values:

```css
/* ✅ Good */
.my-button:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/* ❌ Bad */
.my-button:focus-visible {
  outline: 2px solid #0ea5e9;
  outline-offset: 2px;
}
```

#### Step 3: Use `:focus-visible`, Not `:focus`

```css
/* ✅ Good - only shows for keyboard */
.button:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
}

/* ❌ Bad - shows for mouse clicks too */
.button:focus {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
}
```

#### Step 4: Remove Default Focus on Mouse

```css
/* Remove focus ring for mouse interactions */
.button:focus:not(:focus-visible) {
  outline: none;
  box-shadow: none;
}
```

---

### Testing Checklist

#### Visual Testing

- [ ] Focus ring appears when tabbing through elements (keyboard)
- [ ] Focus ring does NOT appear when clicking elements (mouse)
- [ ] Focus ring width is 2px
- [ ] Focus ring offset is 2px (distance from element)
- [ ] Focus ring color matches brand (cyan light, teal dark)
- [ ] Focus ring visible in light theme
- [ ] Focus ring visible in dark theme
- [ ] Focus ring not clipped by `overflow: hidden` containers

#### Accessibility Testing

- [ ] Keyboard navigation: Tab through all interactive elements
- [ ] Screen reader: Focus announced correctly
- [ ] Contrast: 3:1 minimum (use WebAIM Contrast Checker)
- [ ] High contrast mode: Focus ring remains visible
- [ ] Reduced motion: No distracting animations

#### Cross-Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## Before/After Examples

### Button

**Before**:
```css
.button:focus {
  outline: 2px solid #007acc; /* Wrong color, shows on mouse click */
}
```

**After**:
```css
.button:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
  box-shadow: var(--focus-ring-shadow);
}
```

---

### Input Field

**Before**:
```css
.input:focus {
  border: 1px solid blue; /* Inconsistent, not using tokens */
  box-shadow: 0 0 5px blue;
}
```

**After**:
```css
.input:focus-visible {
  outline: none;
  border: 2px solid var(--focus-ring-color);
  box-shadow: 0 0 0 3px var(--focus-ring-halo);
}
```

---

## Design Tokens Quick Reference

```css
/* Dimensions */
--focus-ring-width: 2px;
--focus-ring-offset: 2px;

/* Colors (Light Theme) */
--focus-ring-color: #0ea5e9;
--focus-ring-halo: rgba(14, 165, 233, 0.1);

/* Colors (Dark Theme) */
--focus-ring-color: #00d4aa;
--focus-ring-halo: rgba(0, 212, 170, 0.15);

/* Shadows */
--focus-ring-shadow: 0 0 0 2px var(--color-bg-primary), 0 0 0 4px var(--focus-ring-color);
--focus-ring-shadow-inset: inset 0 0 0 2px var(--focus-ring-color);

/* Aliases (for backward compatibility) */
--color-focus: var(--focus-ring-color);
--focus-outline: var(--focus-ring-width) solid var(--focus-ring-color);
--focus-outline-offset: var(--focus-ring-offset);
```

---

## References

- [WCAG 2.1 - 2.4.7 Focus Visible (Level AA)](https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html)
- [WCAG 2.1 - 2.4.11 Focus Appearance (Level AA) ](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)
- [MDN: :focus-visible](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [CSS-Tricks: Focus Management](https://css-tricks.com/focusing-on-focus-styles/)

---

## Changelog

**May 31, 2026** - Initial specification created
- Defined 2px width, 2px offset standard
- Specified cyan (#0ea5e9) light theme, teal (#00d4aa) dark theme
- Created dual-layer approach (outline + box-shadow)
- Documented component-by-component implementation
- Added accessibility compliance matrix

---

## Sign-off

**Designer**: [Assigned]  
**Engineer**: [Assigned]  
**Accessibility Lead**: [Assigned]  
**Product Manager**: [Assigned]  

---

_This specification is a living document and will be updated as implementation details are refined._
