# Design Tokens Quick Reference

**For developers**: Use this guide when styling components to ensure theme consistency.

---

## Core Principle

**Never use hardcoded hex colors or Tailwind color classes.** Always use CSS variables from `design-tokens.css`.

---

## Common Tokens

### Backgrounds

```css
/* Page/container backgrounds */
background: var(--color-bg-primary);      /* Main page background */
background: var(--color-bg-secondary);    /* Sunken/recessed areas */
background: var(--color-bg-tertiary);     /* Elevated surfaces */

/* Card/component surfaces */
background: var(--color-surface-default);  /* Default cards */
background: var(--color-surface-elevated); /* Hovered cards */
background: var(--color-surface-raised);   /* Focused containers */
background: var(--color-surface-highest);  /* Floating elements */
```

### Text

```css
color: var(--color-text-primary);    /* Headlines, body copy */
color: var(--color-text-secondary);  /* Descriptions, labels */
color: var(--color-text-tertiary);   /* Helper text, timestamps */
color: var(--color-text-muted);      /* Placeholders, disabled */
color: var(--color-text-inverse);    /* Text on dark backgrounds (light theme) */
```

### Borders

```css
border: 1px solid var(--color-border-default);    /* Default borders */
border: 1px solid var(--color-border-secondary);  /* Prominent borders */
border: 2px solid var(--border-interactive);      /* Focus/active borders */
```

### Interactive Colors

```css
/* Primary actions (CTAs) */
background: var(--color-accent-primary);       /* #00b8d4 */
background: var(--color-accent-primary-dark);  /* Hover state */

/* Secondary actions */
background: var(--color-accent-secondary);      /* #00d4aa */
background: var(--color-accent-secondary-dark); /* Hover state */
```

### Status Colors

```css
/* Success (green) */
color: var(--color-success);
background: var(--color-success-bg);  /* 10% opacity tint */

/* Warning (orange) */
color: var(--color-warning);
background: var(--color-warning-bg);

/* Error/Danger (red) */
color: var(--color-danger);
background: var(--color-danger-bg);

/* Info (blue) */
color: var(--color-info);
background: var(--color-info-bg);
```

### Focus Rings

```css
/* Keyboard focus indicator */
outline: 2px solid var(--color-focus);
outline-offset: 2px;

/* Or use the pre-built shadow */
box-shadow: var(--focus-ring);
```

---

## Typography

```css
/* Headings */
font: var(--font-heading-1);  /* 500 36px/44px */
font: var(--font-heading-2);  /* 600 24px/32px */
font: var(--font-heading-3);  /* 600 18px/28px */
font: var(--font-heading-4);  /* 600 16px/24px */

/* Body text */
font: var(--font-body-lg);    /* 400 16px/24px */
font: var(--font-body-md);    /* 400 14px/20px */
font: var(--font-body-sm);    /* 400 12px/16px */

/* Labels & controls */
font: var(--font-label-lg);   /* 500 14px/20px */
font: var(--font-label-md);   /* 500 12px/16px */
font: var(--font-label-sm);   /* 500 11px/14px */

/* Code/monospace */
font: var(--font-mono-sm);    /* 400 12px/16px Monaco */
```

---

## Spacing

```css
/* Use the 8px scale */
padding: var(--space-xs);   /* 4px */
padding: var(--space-sm);   /* 8px */
padding: var(--space-md);   /* 12px */
padding: var(--space-lg);   /* 16px */
padding: var(--space-xl);   /* 24px */
padding: var(--space-2xl);  /* 32px */
padding: var(--space-3xl);  /* 48px */
padding: var(--space-4xl);  /* 64px */
```

---

## Border Radius

```css
border-radius: var(--radius-sm);    /* 4px */
border-radius: var(--radius-md);    /* 8px */
border-radius: var(--radius-lg);    /* 12px */
border-radius: var(--radius-xl);    /* 16px */
border-radius: var(--radius-full);  /* 9999px (pill shape) */
```

---

## Shadows

```css
box-shadow: var(--shadow-sm);   /* Subtle */
box-shadow: var(--shadow-md);   /* Default */
box-shadow: var(--shadow-lg);   /* Elevated */
box-shadow: var(--shadow-xl);   /* Floating */

/* Accent-specific shadows */
box-shadow: var(--shadow-accent-primary);       /* Cyan glow */
box-shadow: var(--shadow-accent-secondary);     /* Teal glow */
box-shadow: var(--shadow-cta-primary);          /* CTA button */
box-shadow: var(--shadow-cta-primary-hover);    /* CTA hover */
```

---

## Transitions

```css
transition: all var(--transition-fast);  /* 150ms */
transition: all var(--transition-base);  /* 200ms */
transition: all var(--transition-slow);  /* 300ms */
```

---

## Skeleton Loading

```css
/* Skeleton shimmer effect */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--skeleton-base) 25%,
    var(--skeleton-shine) 50%,
    var(--skeleton-base) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-sm);
}
```

---

## Shared Component Classes

### Primary CTA Button

```html
<button class="ui-primary-cta">
  Launch App
</button>

<!-- Compact variant -->
<button class="ui-primary-cta ui-primary-cta--compact">
  Create
</button>
```

### Secondary Control Button

```html
<button class="ui-secondary-control">
  Cancel
</button>
```

---

## Theme Switching

### In JavaScript

```js
// Set theme
document.documentElement.setAttribute("data-theme", "dark");
document.documentElement.setAttribute("data-theme", "light");

// Get current theme
const theme = document.documentElement.getAttribute("data-theme");

// Toggle theme
const currentTheme = document.documentElement.getAttribute("data-theme");
const newTheme = currentTheme === "light" ? "dark" : "light";
document.documentElement.setAttribute("data-theme", newTheme);
localStorage.setItem("theme", newTheme);
```

### In CSS (conditional styles)

```css
/* Light theme only */
:root {
  --my-custom-token: #value-for-light;
}

/* Dark theme override */
:root[data-theme="dark"] {
  --my-custom-token: #value-for-dark;
}
```

---

## Anti-Patterns (Don't Do This)

### ❌ Hardcoded hex colors

```css
/* BAD */
background: #ffffff;
color: #1a1f36;
```

```css
/* GOOD */
background: var(--color-bg-primary);
color: var(--color-text-primary);
```

### ❌ Tailwind hardcoded color classes

```jsx
/* BAD */
<div className="bg-gray-100 text-black">
```

```jsx
/* GOOD */
<div style={{ background: "var(--color-surface-default)", color: "var(--color-text-primary)" }}>
```

### ❌ Inline hex values

```jsx
/* BAD */
<div style={{ background: "#121a2a", color: "#e8ecf4" }}>
```

```jsx
/* GOOD */
<div style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-primary)" }}>
```

### ❌ Random pixel values

```css
/* BAD */
padding: 13px 18px;
margin: 7px;
```

```css
/* GOOD */
padding: var(--space-md) var(--space-lg);  /* 12px 16px */
margin: var(--space-sm);                    /* 8px */
```

---

## Testing with Tokens

### In Vitest/jsdom

jsdom doesn't resolve CSS variables, so check inline styles:

```tsx
// ❌ BAD (jsdom doesn't resolve variables)
const style = window.getComputedStyle(element);
expect(style.backgroundColor).toBe("rgb(255, 255, 255)");

// ✅ GOOD (check the variable name)
const inlineStyle = element.getAttribute("style") || "";
expect(inlineStyle).toContain("var(--color-bg-primary)");
```

---

## Accessibility

### Focus Rings

Always use `:focus-visible` for keyboard-only focus:

```css
button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
  box-shadow: var(--focus-ring);
}
```

### Reduced Motion

Respect user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Need Help?

- **Full token list**: See `src/design-tokens.css`
- **Design spec**: See `DESIGN_SPEC.md`
- **Implementation notes**: See `IMPLEMENTATION_SUMMARY.md`
- **Dark theme spec**: See `DARK_THEME_SPEC.md`

---

**Last updated**: April 27, 2026
