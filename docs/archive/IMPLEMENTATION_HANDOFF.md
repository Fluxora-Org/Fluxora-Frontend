# Implementation Handoff Guide
## From Design to Engineering: Step-by-Step Delivery

**Purpose**: Engineers can implement design without clarification spikes.  
**Audience**: Frontend squad, engineering leads.  
**Timeline**: 1-2 sprints for full visual consistency implementation.

---

## 1. Pre-Implementation Checklist

Before starting implementation:

- [ ] **Design specs reviewed**: DESIGN_SPEC.md read and questions answered
- [ ] **Component specs understood**: COMPONENT_STATES.md reviewed
- [ ] **Tokens available**: `src/design-tokens.css` imported into main layout
- [ ] **Test strategy agreed**: TESTING_CHECKLIST.md signed by QA
- [ ] **Figma/prototype link**: Link to final design (if available) captured in issue
- [ ] **Known limitations listed**: Deferrals acknowledged (see DESIGN_SPEC.md § 12.1)
- [ ] **Team capacity confirmed**: Estimate <story points> for implementation

---

## 2. File Structure & Setup

### 2.1 New Directory: Design Tokens

Create `/src/design-tokens/`:
```
src/
├── design-tokens/
│   ├── index.css              # Main token export (import this)
│   ├── colors.css             # Color variables (light/dark)
│   ├── typography.css         # Font definitions
│   ├── spacing.css            # Space scale
│   ├── animations.css         # Keyframes & transitions
│   ├── breakpoints.css        # Responsive utilities
│   └── README.md              # Token usage guide
├── components/
│   ├── Button.tsx             # Refactored with tokens
│   ├── Input.tsx              # New component (if not exists)
│   ├── Modal.tsx              # Refactored
│   ├── Navigation.tsx         # Refactored
│   └── ...
├── styles/
│   ├── globals.css            # Global resets, :root, @media queries
│   └── accessibility.css      # Focus styles, reduced-motion
├── App.tsx                    # Updated to import design-tokens
└── main.tsx
```

### 2.2 Create Design Tokens File

**File**: `src/design-tokens.css` (or `/src/design-tokens/index.css`)

**Content**: Copy from [DESIGN_SPEC.md § 3.2](#32-design-tokens) or use the prepared `src/design-tokens.css` file.

**Import in App.tsx or main.tsx**:
```tsx
// src/main.tsx
import './design-tokens.css';  // Must be imported FIRST
import './index.css';
import App from './App.tsx';
```

### 2.3 Update index.css Global Styles

**Minimal reset** (add to `src/index.css`):
```css
@import './design-tokens.css';

/* Global resets */
* {
  box-sizing: border-box;
}

html, body, #root {
  margin: 0;
  padding: 0;
  height: 100%;
}

body {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font: var(--font-body-md);
  font-family: var(--font-family-base);
  transition: background-color var(--transition-base),
              color var(--transition-base);
}

/* Reset link styles */
a {
  color: var(--color-accent-primary);
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
}

/* Accessibility: Focus styles globally */
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-outline-offset);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 3. Component Refactoring Guide

### 3.1 Refactor Buttons

**File to update**: `src/components/Button.tsx` (create new or update existing)

**Migration steps**:

1. **Remove inline styles** (if using React.CSSProperties)
2. **Add CSS module or scoped styles**:
   ```tsx
   // src/components/Button.tsx
   import React from 'react';
   import './Button.css';  // NEW: CSS module or global
   
   interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
     variant?: 'primary' | 'secondary' | 'tertiary';
     size?: 'sm' | 'md' | 'lg';
     loading?: boolean;
     children: React.ReactNode;
   }
   
   export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
     ({ variant = 'primary', size = 'md', loading = false, disabled, children, className, ...props }, ref) => {
       const classNames = [
         'button',
         `button--${variant}`,
         `button--${size}`,
         loading ? 'button--loading' : '',
         className,
       ].filter(Boolean).join(' ');
   
       return (
         <button
           ref={ref}
           className={classNames}
           disabled={disabled || loading}
           aria-busy={loading}
           {...props}
         >
           {loading && <span className="spinner" aria-hidden="true" />}
           {children}
         </button>
       );
     }
   );
   ```

3. **Create Button.css** (use design tokens):
   ```css
   /* src/components/Button.css */
   .button {
     display: inline-flex;
     align-items: center;
     gap: var(--space-sm);
     padding: var(--space-md) var(--space-lg);
     font: var(--font-label-lg);
     border: none;
     border-radius: var(--radius-md);
     cursor: pointer;
     transition: all var(--transition-base);
     outline: none;
   }
   
   .button:hover:not(:disabled) {
     background-color: var(--color-accent-primary-dark);
     box-shadow: var(--shadow-lg);
   }
   
   .button:focus-visible {
     outline: var(--focus-outline);
     outline-offset: var(--focus-outline-offset);
   }
   
   .button:active:not(:disabled) {
     transform: translateY(1px);
   }
   
   .button:disabled {
     background-color: var(--color-text-tertiary);
     color: var(--color-text-muted);
     opacity: 0.4;
     cursor: not-allowed;
   }
   
   /* Variants */
   .button--primary {
     background-color: var(--color-accent-primary);
     color: var(--color-text-inverse);
     box-shadow: var(--shadow-accent-primary);
   }
   
   .button--secondary {
     background-color: var(--color-surface-raised);
     color: var(--color-text-primary);
     border: 1px solid var(--color-border-default);
   }
   
   .button--loading {
     pointer-events: none;
   }
   
   .spinner {
     display: inline-block;
     width: 16px;
     height: 16px;
     border: 2px solid currentColor;
     border-top-color: transparent;
     border-radius: 50%;
     animation: spin 1s linear infinite;
   }
   ```

4. **Update all button usages**:
   ```tsx
   // OLD inline styles (remove)
   <button style={{ background: 'var(--accent)', ... }}>Create</button>
   
   // NEW component (prefer this)
   <Button variant="primary">Create</Button>
   ```

5. **Testing**: Verify button states (default, hover, focus, disabled, loading) match COMPONENT_STATES.md

---

### 3.2 Refactor Inputs

**File**: `src/components/Input.tsx` (create new)

**Steps** (similar to Button):

1. Create component with label, error, helper text support
2. Merge associated label tag (not floating label yet)
3. Add aria-invalid, aria-required, aria-describedby
4. CSS: Use design tokens for colors, spacing, transitions
5. Update all form fields in:
   - `CreateStreamModal.tsx`
   - `ConnectWalletModal.tsx`
   - Any other forms

**Code example** (see COMPONENT_STATES.md § Input Component)

---

### 3.3 Refactor Navigation

**File**: `src/components/Navigation.tsx` or Sidebar.tsx + AppNavbar.tsx

**Steps**:

1. **Unify navigation items**:
   - Update Sidebar nav items to use new NavItem component
   - Apply consistent styles from COMPONENT_STATES.md § Navigation Item

2. **Add aria-current="page"**:
   ```tsx
   <Link
     to="/app"
     className={`nav-item ${isActive ? 'nav-item--active' : ''}`}
     aria-current={isActive ? 'page' : undefined}
   >
     Dashboard
   </Link>
   ```

3. **Update CSS** for nav items (see COMPONENT_STATES.md)

4. **Mobile navigation**: Ensure hamburger menu works at ≤768px with focus trap

---

### 3.4 Refactor Modals

**File**: `src/components/Modal.tsx` (create base component)

**Steps**:

1. Create base Modal component:
   - Handles backdrop, dialog structure
   - Manages focus trap (Tab, Shift+Tab)
   - Manages Escape key
   - Returns focus to trigger button on close

2. Update `CreateStreamModal.tsx`:
   ```tsx
   // OLD: inline styles + manual backdrop
   // NEW: <Modal isOpen={} onClose={} title=""> structure
   
   <Modal
     isOpen={isOpen}
     onClose={onClose}
     title="Create Stream"
   >
     {/* Form fields */}
   </Modal>
   ```

3. Similarly update `ConnectWalletModal.tsx`, any other modals

4. **CSS**: Use design tokens for backdrop, shadow, entrance/exit animations

---

### 3.5 Refactor Empty States

**File**: `src/components/EmptyState.tsx` (create new)

**Steps**:

1. Convert existing empty state components to unified EmptyState
2. Props:
   ```tsx
   interface EmptyStateProps {
     icon: React.ReactNode;
     title: string;
     description: string;
     ctaLabel: string;
     onCta: () => void;
   }
   ```

3. Update usage in Dashboard, Recipient pages

4. **CSS**: Center icon + text; 80×80px border icon; CTA button
   - Use design tokens for spacing, colors

---

### 3.6 Create New: Skeleton Component

**File**: `src/components/Skeleton.tsx` (create new)

**Purpose**: Reusable loading placeholder

**Code** (see COMPONENT_STATES.md § Skeleton Loading Component)

**Usage**:
```tsx
// In TreasuryOverviewLoading.tsx
<Skeleton height="24px" count={3} />
```

---

### 3.7 Create New: StatusBadge Component

**File**: `src/components/StatusBadge.tsx` (create new)

**Purpose**: Reusable status indicator

**Code** (see COMPONENT_STATES.md § Status Badge Component)

**Usage**:
```tsx
<StatusBadge status="active" label="Active" />
```

---

## 4. Layout & Page Components

### 4.1 App Layout (Dashboard Chrome)

**File**: `src/components/Layout.tsx`

**Requirements**:
- **Sidebar**: Fixed left panel (244px width desktop, hidden mobile)
- **Header**: Top bar with logo, breadcrumb, theme toggle, wallet info
- **Main content**: Flex-grow area with page content
- **Breakpoints**:
  - Desktop (≥1024px): Sidebar visible + main side-by-side
  - Tablet (768-1024px): Sidebar collapsible
  - Mobile (<768px): Sidebar hidden → hamburger drawer

**CSS structure**:
```css
.app-layout {
  display: grid;
  grid-template-rows: auto 1fr;
  min-height: 100vh;
  background-color: var(--color-bg-primary);
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg);
  border-bottom: 1px solid var(--color-border-default);
  height: 64px;
}

.app-body {
  display: grid;
  grid-template-columns: 244px 1fr;
  gap: 0;
  overflow: hidden;
}

.app-sidebar {
  background-color: var(--color-surface-default);
  border-right: 1px solid var(--color-border-default);
  width: 244px;
  overflow-y: auto;
  padding: var(--space-lg);
}

.app-main {
  padding: var(--space-2xl);
  overflow-y: auto;
}

/* Mobile */
@media (max-width: 768px) {
  .app-body {
    grid-template-columns: 1fr;
  }
  
  .app-sidebar {
    position: fixed;
    left: -244px;
    top: 64px;
    height: calc(100vh - 64px);
    z-index: 40;
    transition: left var(--transition-base);
  }
  
  .app-sidebar.open {
    left: 0;
  }
}
```

---

### 4.2 Landing Page Layout

**File**: `src/pages/Landing.tsx` and related

**Requirements**:
- **Hero section**: Full-width radial gradient, heading, subheading, 2 CTAs
- **Trust section**: 3-column use case cards (1 column mobile)
- **Footer**: Links, copyright
- **Theme-aware**: Light/dark gradient backgrounds
- **Typography**: Use design tokens (heading 1/2, body, labels)

**Already mostly correct** - ensure:
- [ ] Colors use design tokens (no hardcoded #hex)
- [ ] CTA buttons use unified Button component
- [ ] Responsive at 320px, 640px, 1024px
- [ ] No hardcoded spacing (use design tokens)

---

## 5. Specific File Updates

### 5.1 App.tsx

**Change**:
```tsx
// ADD at top
import './design-tokens.css';  // Import tokens first

// ADD theme manager
const [theme, setTheme] = useState<'light' | 'dark'>(() => {
  const saved = localStorage.getItem('theme');
  if (saved) return saved as 'light' | 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
});

useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}, [theme]);

// JSX: theme toggle button
<button
  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
  className="theme-toggle"
  aria-label="Toggle theme"
>
  {theme === 'light' ? '🌙' : '☀️'}
</button>
```

---

### 5.2 Layout.tsx

**Changes**:
- [ ] Remove duplicate nav code (currently has mixed code)
- [ ] Consolidate Header + Sidebar into unified Layout
- [ ] Add responsive burger menu for mobile
- [ ] Import refactored navigation components

---

### 5.3 Dashboard.tsx, Streams.tsx, Recipient.tsx

**Changes**:
- [ ] Replace inline styles with `var(--color-*)`, `var(--space-*)`
- [ ] Use Button component instead of inline buttons
- [ ] Use Skeleton component for loading state
- [ ] Use EmptyState component for no-data state
- [ ] Use StatusBadge in tables/lists

---

## 6. Migration Checklist (Component-by-Component)

### Phase 1: Foundation (Week 1)
- [ ] Import design-tokens.css in main.tsx
- [ ] Create Button component + update all button usages
- [ ] Create Input component
- [ ] Update global styles (index.css, accessibility resets)

### Phase 2: Layouts (Week 1-2)
- [ ] Refactor Layout.tsx (consolidate, remove duplicates)
- [ ] Add responsive hamburger for mobile
- [ ] Update Navigation items with consistent styling
- [ ] Add theme management (light/dark toggle)

### Phase 3: Modals & Overlays (Week 2)
- [ ] Create base Modal component
- [ ] Update CreateStreamModal to use Modal
- [ ] Update ConnectWalletModal to use Modal
- [ ] Test focus trap and keyboard navigation

### Phase 4: Pages & States (Week 2-3)
- [ ] Update Dashboard page (metrics, empty state, loading)
- [ ] Update Streams page
- [ ] Update Recipient page
- [ ] Create Skeleton loading component
- [ ] Create StatusBadge component

### Phase 5: Polish & Accessibility (Week 3)
- [ ] Audit all components for ARIA attributes
- [ ] Test keyboard navigation (Tab, Escape, etc.)
- [ ] Test screen reader (VoiceOver/NVDA)
- [ ] Verify color contrast (WAVE)
- [ ] Test responsive breakpoints (320px, 768px, 1024px)
- [ ] Test theme toggle
- [ ] Test reduced-motion preference

### Phase 6: QA & Sign-off (Week 3-4)
- [ ] Run TESTING_CHECKLIST.md full suite
- [ ] Lighthouse Accessibility score ≥90
- [ ] No visual regressions from spec
- [ ] Design sign-off completed

---

## 7. Acceptance Criteria Per Epic

### Button Component
```
✓ All button states render correctly (default, hover, focus, active, disabled, loading)
✓ Focus ring visible, cyan, 2px, 2px offset
✓ Keyboard: Tab focuses, Enter/Space activates
✓ ARIA: aria-busy on loading, aria-disabled on disabled
✓ Uses design tokens (no hardcoded colors/sizes)
✓ Passes WAVE scan (no contrast issues)
✓ Responsive: Works on mobile (44px+ touch target)
```

### Input Component
```
✓ All input states correct (default, hover, focus, error, disabled, success)
✓ Error state: red border, red text, helper message
✓ Focus ring visible on focus
✓ Keyboard: Tab focuses, Type enters text, Tab moves to next
✓ ARIA: aria-label or <label>, aria-invalid, aria-required, aria-describedby
✓ Passes WAVE contrast scan
✓ Helper text displayed below input
```

### Modal Component
```
✓ Backdrop visible with correct color
✓ Dialog centered, correct shadow
✓ Close button functional (X icon)
✓ Keyboard: Tab traps within modal, Escape closes, focus returns
✓ ARIA: role="dialog", aria-modal, aria-labelledby
✓ Animation: Smooth entrance (scale 0.95→1), smooth exit
✓ prefers-reduced-motion: Animation instant
```

### Layout
```
✓ Sidebar: 244px desktop, hidden mobile with hamburger
✓ Header: 64px height, logo + nav + theme + wallet
✓ Main: Full-width padding, colored background
✓ Responsive: Works 320px, 768px, 1024px breakpoints
✓ No horizontal scroll at 320px
✓ Hamburger menu: Opens/closes smoothly, focus trap
✓ Theme toggle: Light/dark persists in localStorage
```

### Dashboard Page
```
✓ Empty state: Icon + title + CTA visible when no streams
✓ Metrics: 3 cards showing when connected
✓ Loading: Skeleton shows for ≥2s on first load
✓ Error state: Error message displayed clearly
✓ CTA button: "+ Create Stream" prominent, functional
✓ Responsive: Metrics stack on mobile
```

---

## 8. Code Review Checklist (For Reviewers)

When reviewing implementation PRs:

- [ ] **Tokens used**: All colors, spacing, fonts from variables (grep for #hex, hardcoded px)
- [ ] **ARIA complete**: aria-label, aria-invalid, aria-required, aria-busy, aria-labelledby present
- [ ] **Keyboard accessible**: Tab order logical, focus visible, Escape for modals
- [ ] **Screen reader tested**: Labels, alerts, status announced correctly
- [ ] **Focus ring**: 2px cyan ring, 2px offset, all interactive elements
- [ ] **Responsive**: Mobile (320px), tablet (768px), desktop (1024px) tested
- [ ] **Color contrast**: WAVE scan shows no errors
- [ ] **States complete**: Default, hover, focus, active, disabled documented
- [ ] **Accessibility attributes**: `aria-*` attributes correctly applied
- [ ] **No layout shift**: Skeletons prevent Cumulative Layout Shift
- [ ] **Performance**: No unnecessary re-renders, smooth animations

---

## 9. Rollback Plan

If critical issues arise during implementation:

1. **Visual bugs**: Revert affected component file to previous commit
2. **Accessibility issues**: Disable feature in environment variable until fixed
3. **Performance regression**: Profile with DevTools; identify heavy component
4. **Browser incompatibility**: Feature flag for older browsers

---

## 10. Documentation & Knowledge Transfer

After implementation:

- [ ] **Design tokens README**: /src/design-tokens/README.md documents token usage
- [ ] **Component documentation**: Each component has JSDoc comments
- [ ] **DESIGN_SPEC.md**: Kept up-to-date as implementation proceeds
- [ ] **Team training**: 30-min sync explaining token system, component patterns
- [ ] **Design decisions logged**: Rationale for any deviations from spec captured in comments or issue

---

## 11. Post-Launch: Monitoring

After deployment to production:

- [ ] **Accessibility audit**: Third-party audit or WAVE + Axe monthly scan
- [ ] **User feedback**: Monitor support tickets for UX issues
- [ ] **Performance metrics**: Lighthouse Accessibility score, Core Web Vitals
- [ ] **Bug reports**: Triage and prioritize accessibility/contrast issues
- [ ] **Continuous improvement**: Backlog improvements identified during QA

---

## 12. FAQ & Troubleshooting

**Q: Which CSS-in-JS library should I use?**  
A: Prefer CSS files + Tailwind over runtime CSS-in-JS. Tokens work best in static CSS.

**Q: Can I use Styled Components?**  
A: Not recommended. CSS variables work better with CSS files or Tailwind. If needed, document token usage in JSDoc.

**Q: How do I handle component variants in CSS?**  
A: Use BEM-style class names (`.button--primary`, `.button--secondary`). See COMPONENT_STATES.md for patterns.

**Q: Should I migrate to Tailwind completely?**  
A: Not required. Mix Tailwind utilities with design tokens. Consistency more important than tool choice.

**Q: How do I test theme toggle?**  
A: Programmatically: `document.documentElement.setAttribute("data-theme", "dark")`. Verify computed colors change.

**Q: What if a component needs a custom color?**  
A: Add to design-tokens.css as new semantic token. Document rationale. Avoid one-off hardcoded colors.

**Q: How do I handle loading states without skeleton?**  
A: Use spinner or opacity fade. Skeleton preferred to prevent layout shift (Cumulative Layout Shift metric).

**Q: Can I use CSS Modules?**  
A: Yes! Create `Button.module.css`, import as `import styles from './Button.module.css'`, use `className={styles.button}`.

---

## 13. Success Metrics

Project complete when:

```
✓ All component states match COMPONENT_STATES.md
✓ 100% of colors use CSS variables (zero hardcoded #hex)
✓ 100% of spacing uses design tokens (zero random px)
✓ All interactive elements have focus ring (cyan, 2px, 2px offset)
✓ WAVE scan: 0 contrast errors, 0 missing alt text, 0 missing labels
✓ Keyboard navigation: Tab, Shift+Tab, Enter, Space, Escape all work
✓ Screen reader: Dashboard readable with VoiceOver/NVDA
✓ Responsive: No horizontal scroll at 320px viewport
✓ Theme toggle: Light/dark works seamlessly, persists
✓ Lighthouse Accessibility: Score ≥90/100
✓ Visual regression: All pages match design spec screenshots
✓ Design sign-off: PM + Design + Engineering confirm completion
```

---

**Document Version**: 1.0  
**Last Updated**: March 30, 2026  
**Status**: ✅ Ready for Implementation Kickoff

---

## Appendix: Command Reference

```bash
# Start development
npm run dev

# Run Lighthouse audit
# → DevTools → Lighthouse → Generate Report → Accessibility

# Check CSS coverage
grep -r "#[0-9A-Fa-f]\{6\}" src/components/

# List all .tsx component files
find src/components -name "*.tsx" | sort

# Check for hardcoded px values (may have false positives)
grep -r "[0-9]\+px" src/components/ | grep -v "var(" | head -20
```

---

**Questions?** Open an issue with tag `[implementation-help]` or reach out to the design lead.
