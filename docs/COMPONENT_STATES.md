# Component State Specifications
## Implementation-Ready Component State Matrix

**Purpose**: Engineers can implement components without guessing states.  
**Format**: State tables + code examples per component.  
**Status**: Ready for handoff to development squads.

---

## Button Component

### Table: All Button States

```
┌──────────────┬─────────────────┬────────────────┬─────────────────┐
│ State        │ Background      │ Text Color     │ Cursor          │
├──────────────┼─────────────────┼────────────────┼─────────────────┤
│ Default      │ --accent-primary│ --text-inverse │ pointer         │
│ Hover        │ --accent-[dark] │ --text-inverse │ pointer         │
│              │ shadow-lg       │                │                 │
│ Focus        │ (hover) + ring  │ --text-inverse │ pointer         │
│ Active       │ --accent-darkest│ --text-inverse │ pointer         │
│ Disabled     │ --text-tertiary │ --text-muted   │ not-allowed     │
│              │ opacity 40%     │                │                 │
│ Loading      │ --accent-primary│ spinner + text │ not-allowed     │
│ (optional)   │                 │ (right-aligned)│                 │
└──────────────┴─────────────────┴────────────────┴─────────────────┘
```

### Code Example

```tsx
// src/components/Button.tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, disabled = false, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`button button--${variant} button--${size}`}
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

Button.displayName = 'Button';

> Implementation note: the app uses shared `.button`, `.button--primary`, `.button--secondary`, and `.button--ghost` classes for consistent hover, focus, disabled, and loading states instead of inline styles.

### CSS Implementation

```css
/* src/components/Button.module.css */
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

  &:hover:not(:disabled) {
    background-color: var(--color-accent-primary-dark);
    box-shadow: var(--shadow-lg);
  }

  &:focus-visible {
    outline: var(--focus-outline);
    outline-offset: var(--focus-outline-offset);
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    background-color: var(--color-text-tertiary);
    color: var(--color-text-muted);
    opacity: 0.4;
    cursor: not-allowed;
  }
}

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

.button--tertiary {
  background-color: transparent;
  color: var(--color-accent-primary);
  border: 1px solid var(--color-accent-primary);
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

---

## Input Component

### Table: All Input States

```
┌──────────────┬──────────────────┬──────────────────┬─────────────────┐
│ State        │ Border           │ Background       │ Text Color      │
├──────────────┼──────────────────┼──────────────────┼─────────────────┤
│ Default      │ --border-default │ --surface-default│ --text-primary  │
│ Hover        │ --border-secondary│ --surface-default│ --text-primary  │
│ Focus        │ --accent-primary │ --surface-default│ --text-primary  │
│              │ 2px solid        │                  │                 │
│ Filled       │ --border-default │ --surface-default│ --text-primary  │
│ Error        │ --danger 2px     │ var(--danger)10% │ --text-primary  │
│ Disabled     │ --border-default │ --surface-raised │ --text-muted    │
│              │ opacity 40%      │ opacity 40%      │                 │
└──────────────┴──────────────────┴──────────────────┴─────────────────┘
```

### Code Example

```tsx
// src/components/Input.tsx
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  success?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, success, id, required, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;

    return (
      <div className="input-field">
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
            {required && <span aria-label="required">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`input ${error ? 'input--error' : ''} ${success ? 'input--success' : ''}`}
          aria-invalid={!!error}
          aria-required={required}
          aria-describedby={error || helperText ? `${inputId}-message` : undefined}
          required={required}
          {...props}
        />
        {(error || helperText) && (
          <div
            id={`${inputId}-message`}
            className={`input-message ${error ? 'input-message--error' : 'input-message--help'}`}
            role={error ? 'alert' : 'status'}
          >
            {error || helperText}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

### CSS Implementation

```css
.input-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.input-label {
  font: var(--font-label-lg);
  color: var(--color-text-primary);
}

.input-label [aria-label="required"] {
  color: var(--color-danger);
  margin-left: 4px;
}

.input {
  padding: var(--space-md) var(--space-lg);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  font: var(--font-body-md);
  color: var(--color-text-primary);
  background-color: var(--color-surface-default);
  transition: all var(--transition-base);

  &::placeholder {
    color: var(--color-text-muted);
    opacity: 0.6;
  }

  &:hover:not(:disabled) {
    border-color: var(--color-border-secondary);
  }

  &:focus-visible {
    outline: none;
    border-color: var(--color-accent-primary);
    border-width: 2px;
    box-shadow: 0 0 0 3px rgba(0, 184, 212, 0.1);
  }

  &:disabled {
    background-color: var(--color-surface-raised);
    color: var(--color-text-muted);
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.input--error {
    border-color: var(--color-danger);
    border-width: 2px;
    background-color: rgba(239, 68, 68, 0.05);
  }

  &.input--success {
    border-color: var(--color-success);
    border-width: 1px;
    background-color: rgba(16, 185, 129, 0.05);
  }
}

.input-message {
  font: var(--font-body-sm);
  color: var(--color-text-tertiary);
}

.input-message--error {
  color: var(--color-danger);
  font-weight: 500;
}

.input-message--help {
  color: var(--color-text-tertiary);
}
```

---

## Navigation Item Component

### Table: All Nav Item States

```
┌──────────────┬──────────────────┬──────────────┬──────────────────┐
│ State        │ Background       │ Text Color   │ Left Border      │
├──────────────┼──────────────────┼──────────────┼──────────────────┤
│ Default      │ transparent      │ --text-tertiary│ transparent      │
│ Hover        │ --surface-raised │ --text-secondary│ --accent-secondary│
│ Active       │ transparent      │ --accent-secondary│ --accent-secondary│
│ Focus        │ (hover style)    │ --text-secondary│ --accent-secondary│
│              │ + ring           │                │                 │
└──────────────┴──────────────────┴──────────────┴──────────────────┘
```

### Code Example

```tsx
// src/components/NavItem.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavItemProps {
  to: string;
  label: string;
  icon?: React.ReactNode;
}

export const NavItem: React.FC<NavItemProps> = ({ to, label, icon }) => {
  const { pathname } = useLocation();
  const isActive = pathname === to || pathname.startsWith(to + '/');

  return (
    <Link
      to={to}
      className={`nav-item ${isActive ? 'nav-item--active' : ''}`}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon && <span className="nav-item__icon">{icon}</span>}
      <span className="nav-item__label">{label}</span>
    </Link>
  );
};
```

### CSS Implementation

```css
.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  height: 44px;
  border-left: 3px solid transparent;
  color: var(--color-text-tertiary);
  text-decoration: none;
  transition: all var(--transition-base);
  border-radius: 0;

  &:hover {
    background-color: var(--color-surface-raised);
    color: var(--color-text-secondary);
    border-left-color: var(--color-accent-secondary);
  }

  &:focus-visible {
    outline: var(--focus-outline);
    outline-offset: 0;
  }

  &.nav-item--active {
    background-color: transparent;
    color: var(--color-accent-secondary);
    border-left-color: var(--color-accent-secondary);
    font-weight: 500;
  }
}

.nav-item__icon {
  display: inline-flex;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-item__label {
  font: var(--font-body-md);
}
```

---

## Modal Component

### Table: Modal States

```
┌──────────────┬──────────────────────┬──────────────────────┐
│ State        │ Backdrop             │ Dialog Box           │
├──────────────┼──────────────────────┼──────────────────────┤
│ Closed       │ hidden               │ hidden               │
│ Entering     │ opacity 0→1 (200ms)  │ scale 0.95→1 (200ms) │
│ Open         │ rgba(0,0,0,0.4)      │ shadow-lg, scale 1   │
│ Closing      │ opacity 1→0 (150ms)  │ scale 1→0.95 (150ms) │
└──────────────┴──────────────────────┴──────────────────────┘
```

### Code Example

```tsx
// src/components/Modal.tsx
import React, { useEffect, useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'auto';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen && !isAnimating) return null;

  return (
    <div
      className={`modal-backdrop ${isAnimating ? 'modal-backdrop--active' : ''}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {title && <h2 id="modal-title" className="modal__title">{title}</h2>}
        <button
          className="modal__close"
          onClick={onClose}
          aria-label="Close modal"
        >
          ✕
        </button>

        <div className="modal__content">{children}</div>

        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
};
```

### CSS Implementation

```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  transition: background-color var(--transition-base);
  pointer-events: none;

  &.modal-backdrop--active {
    background-color: rgba(0, 0, 0, 0.4);
    pointer-events: auto;
  }
}

.modal {
  position: relative;
  background-color: var(--color-surface-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  padding: var(--space-2xl);
  animation: modalEnter var(--transition-base) ease-out;

  @media (max-width: 640px) {
    width: calc(100vw - var(--space-lg));
    padding: var(--space-lg);
  }
}

.modal__title {
  font: var(--font-heading-2);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-lg) 0;
}

.modal__close {
  position: absolute;
  top: var(--space-lg);
  right: var(--space-lg);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  transition: all var(--transition-base);

  &:hover {
    background-color: var(--color-surface-raised);
    color: var(--color-text-primary);
  }

  &:focus-visible {
    outline: var(--focus-outline);
  }
}

.modal__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.modal__footer {
  display: flex;
  gap: var(--space-lg);
  margin-top: var(--space-2xl);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--color-border-default);
}

@media (max-width: 640px) {
  .modal__footer {
    flex-direction: column;
  }
}
```

---

## Empty State Component

### Table: Empty State Layout

```
┌──────────────────────────┐
│  Icon (80×80, border)    │
│  Heading 3               │
│  Description (centered)  │
│  Primary CTA             │
└──────────────────────────┘
```

### Code Example

```tsx
// src/components/EmptyState.tsx
import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaLabel: string;
  onCta: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  ctaLabel,
  onCta,
}) => {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state__icon">{icon}</div>
      <h2 className="empty-state__title">{title}</h2>
      <p className="empty-state__description">{description}</p>
      <Button onClick={onCta}>{ctaLabel}</Button>
    </div>
  );
};
```

### CSS Implementation

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-3xl) var(--space-lg);
  gap: var(--space-xl);
}

.empty-state__icon {
  width: 80px;
  height: 80px;
  border: 2px solid var(--color-accent-secondary);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent-secondary);
  flex-shrink: 0;
}

.empty-state__title {
  font: var(--font-heading-3);
  color: var(--color-text-primary);
  margin: 0;
}

.empty-state__description {
  font: var(--font-body-md);
  color: var(--color-text-secondary);
  max-width: 320px;
  margin: 0;
}
```

---

## Status Badge Component

### Table: Status Badge States

```
┌────────────┬──────────────────┬───────────────┬──────────────┐
│ Status     │ Background       │ Text Color    │ Icon         │
├────────────┼──────────────────┼───────────────┼──────────────┤
│ Active     │ var(--success)10%│ --success     │ ● (filled)   │
│ Pending    │ var(--warning)10%│ --warning     │ ↻ (spinner)  │
│ Completed  │ var(--info)10%   │ --info        │ ✓ (check)    │
│ Error      │ var(--danger)10% │ --danger      │ ✕ (cross)    │
└────────────┴──────────────────┴───────────────┴──────────────┘
```

### Code Example

```tsx
// src/components/StatusBadge.tsx
import React from 'react';

type StatusType = 'active' | 'pending' | 'completed' | 'error';

interface StatusBadgeProps {
  status: StatusType;
  label: string;
}

const statusConfig: Record<StatusType, { icon: string; ariaLabel: string }> = {
  active: { icon: '●', ariaLabel: 'Status: Active' },
  pending: { icon: '↻', ariaLabel: 'Status: Pending' },
  completed: { icon: '✓', ariaLabel: 'Status: Completed' },
  error: { icon: '✕', ariaLabel: 'Status: Error' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const config = statusConfig[status];

  return (
    <span className={`status-badge status-badge--${status}`} aria-label={config.ariaLabel}>
      <span className="status-badge__icon" aria-hidden="true">
        {config.icon}
      </span>
      <span>{label}</span>
    </span>
  );
};
```

### CSS Implementation

```css
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-full);
  font: var(--font-label-sm);
  white-space: nowrap;
}

.status-badge--active {
  background-color: var(--color-success-bg);
  color: var(--color-success);
}

.status-badge--pending {
  background-color: var(--color-warning-bg);
  color: var(--color-warning);
}

.status-badge--completed {
  background-color: var(--color-info-bg);
  color: var(--color-info);
}

.status-badge--error {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
}

.status-badge__icon {
  display: inline-flex;
  width: 14px;
  height: 14px;
  align-items: center;
  justify-content: center;
}

.status-badge--pending .status-badge__icon {
  animation: spin 1s linear infinite;
}
```

---

## Skeleton Loading Component

### Code Example

```tsx
// src/components/Skeleton.tsx
import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  count?: number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  borderRadius = var(--radius-sm),
  count = 1,
  className = '',
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`skeleton ${className}`}
          style={{
            width,
            height,
            borderRadius,
            animationDelay: `${i * 100}ms`,
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
};
```

### CSS Implementation

```css
.skeleton {
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  animation: pulse var(--transition-slow) cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

---

## Summary Table

| Component | Key States | Keyboard Support | ARIA |
|-----------|-----------|------------------|------|
| **Button** | Default, Hover, Focus, Active, Disabled, Loading | Tab, Enter, Space | aria-busy, aria-disabled |
| **Input** | Default, Hover, Focus, Error, Disabled, Success | Tab, Enter | aria-invalid, aria-required, aria-describedby |
| **NavItem** | Default, Hover, Active, Focus | Tab | aria-current |
| **Modal** | Closed, Entering, Open, Closing | Tab (trap), Escape | role="dialog", aria-modal, aria-labelledby |
| **EmptyState** | Static (no interaction) | Keyboard on CTA | role="status" |
| **StatusBadge** | Static (4 types) | Not interactive | aria-label |
| **Skeleton** | Pulsing animation | Not interactive | aria-hidden |

---

**Version**: 1.0  
**Last Updated**: March 30, 2026  
**Status**: ✅ Ready for implementation

---

## CreateStreamModal Validation States

### Overview

The `CreateStreamModal` uses two reusable components — `InputField` and `ValidationMessage` — to render validation feedback across Steps 1 and 2. Step 3 is read-only and has no validation states.

### Validated Fields by Step

**Step 1**
- Recipient address
- Deposit amount

**Step 2**
- Stream rate
- Stream duration
- Custom start date *(conditional — only shown when "Custom start" is selected)*
- Cliff date *(conditional — only shown when cliff period is enabled)*

Step 3 (Review & Create) renders plain `div` elements — no `InputField` wrappers, no validation states.

---

### State Table

```
┌──────────────┬──────────────────────────┬──────────────────────────┬──────────────────────────┬──────────────┐
│ State        │ Border                   │ Background Tint          │ Message Color            │ Icon         │
├──────────────┼──────────────────────────┼──────────────────────────┼──────────────────────────┼──────────────┤
│ Default      │ var(--color-border-      │ var(--color-surface-     │ —                        │ —            │
│              │ default) 1px             │ raised)                  │                          │              │
│ Hint         │ var(--color-border-      │ var(--color-surface-     │ var(--color-text-muted)  │ —            │
│              │ default) 1px             │ raised)                  │                          │              │
│ Error        │ var(--color-danger) 2px  │ rgba(239, 68, 68, 0.05)  │ var(--color-danger)      │ error SVG    │
│ Success      │ var(--color-success) 1px │ rgba(16, 185, 129, 0.05) │ var(--color-success)     │ checkmark SVG│
└──────────────┴──────────────────────────┴──────────────────────────┴──────────────────────────┴──────────────┘
```

#### Default State

- Border: `var(--color-border-default)` 1px solid
- Background: `var(--color-surface-raised)`
- No message rendered
- Applied when a field has not been touched (no blur, no submit attempt)

#### Hint State

- Border: `var(--color-border-default)` 1px solid (unchanged from default)
- Background: `var(--color-surface-raised)` (unchanged from default)
- Message color: `var(--color-text-muted)`
- No icon
- Rendered when `helperText` prop is provided and no `error` is active
- `ValidationMessage` uses `role="status"` (not `role="alert"`)

#### Error State

- Border: `var(--color-danger)` 2px solid
- Background tint: `rgba(239, 68, 68, 0.05)`
- Message color: `var(--color-danger)`
- Error SVG icon rendered with `aria-hidden="true"`
- `ValidationMessage` uses `role="alert"` — screen readers announce immediately
- Replaces hint text when both `error` and `helperText` are provided
- Applied when a touched field fails validation, or when the user attempts to advance a step with invalid fields

#### Success State

- Border: `var(--color-success)` 1px solid
- Background tint: `rgba(16, 185, 129, 0.05)`
- Message color: `var(--color-success)`
- Checkmark SVG icon rendered with `aria-hidden="true"`
- No `role` attribute on `ValidationMessage`
- Applied when a touched field passes validation

---

### Design Tokens Used

| Token | Usage |
|---|---|
| `var(--color-danger)` | Error border color, error message text color |
| `var(--color-success)` | Success border color, success message text color |
| `var(--color-border-default)` | Default and hint state border color |
| `var(--color-surface-raised)` | Default and hint state background |
| `var(--color-text-muted)` | Hint message text color |
| `var(--font-body-sm)` | ValidationMessage typography |
| `var(--radius-md)` | Input container border-radius |
| `var(--transition-base)` | Border-color and background-color transitions |

No hardcoded hex values or pixel sizes — all visual properties reference design tokens.

---

### Accessibility Notes

#### ARIA Attributes

| Attribute | Element | When applied |
|---|---|---|
| `aria-invalid="true"` | `<input>` | Field has an active error |
| `aria-invalid="false"` | `<input>` | Field passes validation (success state) |
| `aria-required="true"` | `<input>` | Field is marked `required` |
| `aria-describedby` | `<input>` | Points to the `id` of the active `ValidationMessage` or hint element |
| `role="alert"` | `ValidationMessage` | Error type — triggers immediate screen reader announcement |
| `role="status"` | `ValidationMessage` | Hint type — polite announcement, does not interrupt |
| `aria-hidden="true"` | SVG icons | Decorative icons inside `ValidationMessage` — not read aloud |
| `htmlFor` / `id` | `<label>` / `<input>` | Always paired — every input has an associated label |

#### Screen Reader Behavior

- When an error appears (e.g. after blur or submit attempt), `role="alert"` causes the error message to be announced immediately without requiring the user to move focus.
- Hint messages use `role="status"` — they are announced politely and do not interrupt ongoing speech.
- Success messages have no role — they are available to screen readers when focus moves to the field but are not announced automatically.
- Decorative SVG icons carry `aria-hidden="true"` so screen readers skip them and only read the text message.

#### Color Contrast Requirements

- Error border (`var(--color-danger)`, #ef4444): minimum 3:1 contrast ratio against the input background in both light and dark themes.
- Success border (`var(--color-success)`, #10b981): minimum 3:1 contrast ratio against the input background in both light and dark themes.
- Error message text (`var(--color-danger)`): minimum 4.5:1 contrast ratio against the modal background in both light and dark themes.
- Error state does not rely on color alone — an error icon and error text are always shown alongside the red border (WCAG 1.4.1 Use of Color).

---

### Code Example

```tsx
import { InputField } from './InputField';
import { ValidationMessage } from './ValidationMessage';

// --- Standalone ValidationMessage usage ---

// Error message (role="alert", error icon, danger color)
<ValidationMessage
  id="recipient-error"
  message="Please enter a valid Stellar address (starts with G, 56 characters)."
  type="error"
/>

// Hint message (role="status", no icon, muted color)
<ValidationMessage
  id="recipient-hint"
  message="Enter the recipient's Stellar wallet address."
  type="hint"
/>

// Success message (no role, checkmark icon, success color)
<ValidationMessage
  id="recipient-success"
  message="Valid Stellar address."
  type="success"
/>

// --- InputField wrapping a native <input> ---
// InputField automatically wires aria-invalid, aria-required, and aria-describedby
// onto the child <input> via React.cloneElement.

// Default state (no error, no helperText, no success)
<InputField id="recipient" label="Recipient Address" required>
  <input
    type="text"
    value={recipient}
    onChange={e => setRecipient(e.target.value)}
    onBlur={() => handleBlur('recipient')}
    placeholder="G..."
  />
</InputField>

// Hint state (helperText provided, no error)
<InputField
  id="deposit"
  label="Deposit Amount"
  required
  helperText="Amount in USDC to deposit into the stream."
>
  <input
    type="number"
    value={deposit}
    onChange={e => setDeposit(e.target.value)}
    onBlur={() => handleBlur('deposit')}
    placeholder="0.00"
  />
</InputField>

// Error state (error string provided — overrides helperText)
<InputField
  id="recipient"
  label="Recipient Address"
  required
  error={recipientError}
  helperText="Enter the recipient's Stellar wallet address."
>
  <input
    type="text"
    value={recipient}
    onChange={e => setRecipient(e.target.value)}
    onBlur={() => handleBlur('recipient')}
    placeholder="G..."
  />
</InputField>

// Success state (success=true, no error)
<InputField
  id="recipient"
  label="Recipient Address"
  required
  success={recipientSuccess}
>
  <input
    type="text"
    value={recipient}
    onChange={e => setRecipient(e.target.value)}
    onBlur={() => handleBlur('recipient')}
    placeholder="G..."
  />
</InputField>
```

#### CSS Modifier Classes

```css
/* Applied by InputField to the .input-container wrapper */

.input-container--error {
  border: 2px solid var(--color-danger);
  background-color: rgba(239, 68, 68, 0.05);
  border-radius: var(--radius-md);
  transition: border-color var(--transition-base), background-color var(--transition-base);
}

.input-container--success {
  border: 1px solid var(--color-success);
  background-color: rgba(16, 185, 129, 0.05);
  border-radius: var(--radius-md);
  transition: border-color var(--transition-base), background-color var(--transition-base);
}

/* Applied by ValidationMessage */

.validation-message {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font: var(--font-body-sm);
}

.validation-message--error  { color: var(--color-danger); }
.validation-message--hint   { color: var(--color-text-muted); }
.validation-message--success { color: var(--color-success); }
```

---

**Version**: 1.1
**Last Updated**: March 30, 2026
**Status**: ✅ Ready for implementation
