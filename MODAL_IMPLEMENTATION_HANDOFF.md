# Modal Implementation Handoff Guide

## Overview

This document provides comprehensive implementation guidance for the modal focus management, stacking, and scroll lock behavior system. It includes Figma specifications, component templates, and detailed handoff instructions for engineering teams.

## Figma Design Specifications

### 1. Modal Component Structure

#### 1.1 Figma File Organization
```
Fluxora Design System
  Components
    Modals
      BaseModal
        States
          - Default
          - Loading
          - Error
          - Success
        Variants
          - Small (320px max-width)
          - Medium (520px max-width)
          - Large (720px max-width)
          - Full (90vw max-width)
      ModalBackdrop
        States
          - Single Modal
          - Stacked Modals (Depth 1, 2, 3+)
      ModalContent
        Headers
          - With Title
          - Without Title
          - With Close Button
          - Without Close Button
        Bodies
          - Form Content
          - Text Content
          - List Content
          - Media Content
        Footers
          - Single Action
          - Dual Actions
          - No Actions
```

#### 1.2 Design Token References
```css
/* Modal-specific tokens from design-tokens.css */
--modal-backdrop-z-index: 1000;
--modal-z-index: 1100;
--modal-high-z-index: 1200;
--modal-critical-z-index: 1300;

--modal-backdrop-background: rgba(2, 8, 18, 0.8);
--modal-backdrop-blur: 5px;

--modal-background: var(--surface-neutral);
--modal-border: 1px solid var(--border-neutral);
--modal-border-radius: var(--radius-xl);
--modal-shadow: var(--shadow-xl);

--modal-padding-x: clamp(18px, 5vw, 32px);
--modal-padding-y: clamp(20px, 5vw, 32px);
--modal-max-width: 90vw;
--modal-max-height: 90vh;

--modal-animation-duration: 200ms;
--modal-animation-easing: var(--ease-out);
```

### 2. Modal State Specifications

#### 2.1 Default State
```
Component: BaseModal - Default
- Backdrop: 80% opacity blur
- Modal: Centered, elevated shadow
- Focus: First focusable element highlighted
- Animation: Fade in + scale up (0.95 to 1.0)
- Z-Index: Based on priority level
```

#### 2.2 Loading State
```
Component: BaseModal - Loading
- Backdrop: Same as default
- Modal: Loading spinner in center
- Content: Dimmed or skeleton loading
- Focus: Loading indicator or first available element
- Interactions: Disabled during loading
- Animation: Spinner rotation, content dimming
```

#### 2.3 Error State
```
Component: BaseModal - Error
- Backdrop: Same as default
- Modal: Error icon and message
- Focus: Error message or recovery action
- Color: Error theme colors (red accents)
- Animation: Shake or pulse for attention
```

#### 2.4 Success State
```
Component: BaseModal - Success
- Backdrop: Same as default
- Modal: Success icon and message
- Focus: Success confirmation or next action
- Color: Success theme colors (green accents)
- Animation: Checkmark animation or gentle pulse
```

### 3. Focus Management Visual Specifications

#### 3.1 Focus Indicators
```
Focus Ring:
- Width: 2px
- Color: var(--color-focus)
- Offset: 2px
- Border-radius: inherit from element
- Animation: Smooth transition (150ms)

Focus States:
- Default: Visible focus ring
- Hover: Focus ring + background highlight
- Active: Focus ring + pressed state
- Disabled: No focus ring
```

#### 3.2 Focus Order Visualization
```
Visual Focus Path:
1. Close button (if present)
2. Modal title (if focusable)
3. Primary content area
4. Form inputs (if present)
5. Primary action button
6. Secondary action button
7. Cancel/close button (if not in header)

Focus Trap Boundaries:
- Visual boundary: Modal container
- Keyboard boundary: Focusable elements within modal
- Screen reader boundary: aria-modal="true"
```

### 4. Stacking Visual Specifications

#### 4.1 Single Modal
```
Z-Index Stack:
- Page content: 0-999
- Modal backdrop: 1000
- Modal content: 1100
- Toast notifications: 2000

Visual Layers:
- Backdrop blur effect
- Modal elevation shadow
- Focus ring visibility
```

#### 4.2 Stacked Modals
```
Stack Depth 1 (Parent Modal):
- Z-Index: 1100
- Backdrop opacity: 60%
- Scale: 0.95
- Blur: Slight backdrop blur

Stack Depth 2 (Child Modal):
- Z-Index: 1200
- Backdrop opacity: 80%
- Scale: 1.0
- Blur: Full backdrop blur

Stack Depth 3+ (Grandchild Modal):
- Z-Index: 1300+
- Backdrop opacity: 90%
- Scale: 1.0
- Blur: Maximum backdrop blur
```

## Component Implementation Templates

### 1. BaseModal Component

#### 1.1 TypeScript Template
```typescript
// src/components/modal/BaseModal.tsx
import React, { useRef, useEffect, useState } from 'react';
import { useModalManager, useModalAccessibility } from './hooks';
import styles from './BaseModal.module.css';

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  size?: 'small' | 'medium' | 'large' | 'full';
  initialFocusRef?: React.RefObject<HTMLElement>;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  preventClose?: boolean;
  showCloseButton?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  priority = 'medium',
  size = 'medium',
  initialFocusRef,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  preventClose = false,
  showCloseButton = true,
  className,
  children,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const modalId = `modal-${React.useId()}`;

  // Modal management
  const { zIndex, stackDepth, isActive, bringToFront } = useModalManager({
    id: modalId,
    isOpen,
    priority,
    element: modalRef,
    onClose,
  });

  // Accessibility management
  const { focusableElements, currentFocus, setFocus } = useModalAccessibility({
    isOpen,
    onClose,
    modalRef,
    initialFocusRef: initialFocusRef || closeButtonRef,
    restoreFocus: true,
    trapFocus: true,
  });

  // Animation handling
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Bring to front when opened
      bringToFront();
    } else {
      // Handle exit animation
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, bringToFront]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && !preventClose && e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen || preventClose) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeOnEscape, isOpen, preventClose, onClose]);

  if (!isVisible) return null;

  return (
    <div 
      className={`${styles.backdrop} ${styles[`stack-depth-${Math.min(stackDepth, 3)}`]} ${className}`}
      onClick={handleBackdropClick}
      style={{ zIndex: zIndex - 1 }}
    >
      <div
        ref={modalRef}
        className={`${styles.modal} ${styles[size]} ${styles[priority]} ${!isActive ? styles.inactive : ''}`}
        style={{ zIndex }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? `${modalId}-title` : undefined}
        aria-describedby={description ? `${modalId}-description` : undefined}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className={styles.header}>
            {title && (
              <h2 id={`${modalId}-title`} className={styles.title}>
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                ref={closeButtonRef}
                type="button"
                className={styles.closeButton}
                onClick={onClose}
                disabled={preventClose}
                aria-label="Close modal"
              >
                <span aria-hidden="true">×</span>
              </button>
            )}
          </div>
        )}

        {/* Description */}
        {description && (
          <p id={`${modalId}-description`} className={styles.description}>
            {description}
          </p>
        )}

        {/* Content */}
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
};
```

#### 1.2 CSS Module Template
```css
/* src/components/modal/BaseModal.module.css */

/* Backdrop */
.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--modal-backdrop-background);
  backdrop-filter: blur(var(--modal-backdrop-blur));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--modal-padding-x);
  transition: opacity var(--modal-animation-duration) var(--modal-animation-easing);
}

/* Stack depth variations */
.stack-depth-1 {
  background: rgba(2, 8, 18, 0.6);
}

.stack-depth-2 {
  background: rgba(2, 8, 18, 0.7);
}

.stack-depth-3 {
  background: rgba(2, 8, 18, 0.8);
}

/* Modal container */
.modal {
  position: relative;
  background: var(--modal-background);
  border: var(--modal-border);
  border-radius: var(--modal-border-radius);
  box-shadow: var(--modal-shadow);
  max-width: var(--modal-max-width);
  max-height: var(--modal-max-height);
  width: 100%;
  overflow-y: auto;
  font-family: var(--font-family-base);
  animation: modalEnter var(--modal-animation-duration) var(--modal-animation-easing);
  transform-origin: center;
}

/* Modal sizes */
.small {
  max-width: 320px;
}

.medium {
  max-width: 520px;
}

.large {
  max-width: 720px;
}

.full {
  max-width: 90vw;
  height: 90vh;
}

/* Priority variations */
.low {
  border-color: var(--border-neutral);
}

.medium {
  border-color: var(--border-interactive);
}

.high {
  border-color: var(--color-accent-primary);
}

.critical {
  border-color: var(--color-danger);
}

/* Inactive state (stacked modals) */
.inactive {
  opacity: 0.8;
  transform: scale(0.95);
  pointer-events: none;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--modal-padding-y) var(--modal-padding-x) 0;
  gap: 1rem;
}

.title {
  font: var(--font-heading-3);
  color: var(--text-vivid);
  margin: 0;
  flex: 1;
  min-width: 0;
}

.closeButton {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted);
  font-size: 1.5rem;
  line-height: 1;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.closeButton:hover:not(:disabled) {
  background: var(--surface-elevated);
  color: var(--text-secondary);
}

.closeButton:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.closeButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Description */
.description {
  font: var(--font-body-md);
  color: var(--text-secondary);
  margin: 0 0 var(--space-lg);
  padding: 0 var(--modal-padding-x);
}

/* Content */
.content {
  padding: 0 var(--modal-padding-x) var(--modal-padding-y);
}

/* Animations */
@keyframes modalEnter {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .backdrop {
    padding: var(--space-md);
  }
  
  .modal {
    max-width: 100%;
    max-height: 100vh;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }
  
  .header {
    padding: var(--space-lg) var(--space-md) 0;
  }
  
  .content {
    padding: 0 var(--space-md) var(--space-lg);
  }
}
```

### 2. Modal Manager Hook

#### 2.1 Hook Implementation
```typescript
// src/components/modal/hooks/useModalManager.ts
import { useEffect, useState, useCallback } from 'react';
import { ModalManager } from '../ModalManager';

export interface UseModalManagerOptions {
  id: string;
  isOpen: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  element: React.RefObject<HTMLElement>;
  onClose: () => void;
}

export interface UseModalManagerReturn {
  zIndex: number;
  stackDepth: number;
  isActive: boolean;
  bringToFront: () => void;
}

const PRIORITY_MAP = {
  low: 1100,
  medium: 1200,
  high: 1300,
  critical: 1400,
};

export const useModalManager = ({
  id,
  isOpen,
  priority,
  element,
  onClose,
}: UseModalManagerOptions): UseModalManagerReturn => {
  const [zIndex, setZIndex] = useState(PRIORITY_MAP[priority]);
  const [stackDepth, setStackDepth] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Register/unregister modal
  useEffect(() => {
    if (isOpen && element.current) {
      ModalManager.register({
        id,
        priority: PRIORITY_MAP[priority],
        element: element.current,
        onClose,
        timestamp: Date.now(),
      });
    } else {
      ModalManager.unregister(id);
    }
  }, [id, isOpen, priority, element, onClose]);

  // Subscribe to modal stack changes
  useEffect(() => {
    const unsubscribe = ModalManager.subscribe((stack) => {
      const modalIndex = stack.modals.findIndex(m => m.id === id);
      
      if (modalIndex !== -1) {
        const modal = stack.modals[modalIndex];
        setZIndex(modal.priority);
        setStackDepth(stack.modals.length - modalIndex - 1);
        setIsActive(stack.activeModal?.id === id);
      }
    });

    return unsubscribe;
  }, [id]);

  const bringToFront = useCallback(() => {
    ModalManager.bringToFront(id);
  }, [id]);

  return {
    zIndex,
    stackDepth,
    isActive,
    bringToFront,
  };
};
```

### 3. Accessibility Hook

#### 3.1 Enhanced Accessibility Hook
```typescript
// src/components/modal/hooks/useModalAccessibility.ts
import { useEffect, useState, useCallback, useMemo } from 'react';
import { ScrollLockManager } from '../ScrollLockManager';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export interface UseModalAccessibilityOptions {
  isOpen: boolean;
  onClose: () => void;
  modalRef: React.RefObject<HTMLElement>;
  initialFocusRef?: React.RefObject<HTMLElement>;
  restoreFocus?: boolean;
  trapFocus?: boolean;
}

export interface UseModalAccessibilityReturn {
  focusableElements: HTMLElement[];
  currentFocus: HTMLElement | null;
  setFocus: (element: HTMLElement) => void;
}

export const useModalAccessibility = ({
  isOpen,
  onClose,
  modalRef,
  initialFocusRef,
  restoreFocus = true,
  trapFocus = true,
}: UseModalAccessibilityOptions): UseModalAccessibilityReturn => {
  const [currentFocus, setCurrentFocus] = useState<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Get focusable elements
  const focusableElements = useMemo(() => {
    if (!modalRef.current) return [];
    
    return Array.from(modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter((element) => {
        if (element.hasAttribute('hidden')) return false;
        if (element.getAttribute('aria-hidden') === 'true') return false;
        if (element.tabIndex < 0) return false;
        if (element instanceof HTMLInputElement && element.type === 'hidden') return false;

        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
  }, [modalRef]);

  // Set focus to element
  const setFocus = useCallback((element: HTMLElement) => {
    element.focus();
    setCurrentFocus(element);
  }, []);

  // Handle modal open/close
  useEffect(() => {
    if (!isOpen) return;

    // Save previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Apply scroll lock
    ScrollLockManager.lock();

    // Set initial focus
    const focusTarget = initialFocusRef?.current ?? 
                      focusableElements[0] ?? 
                      modalRef.current;
    
    if (focusTarget) {
      // Use requestAnimationFrame to ensure DOM is ready
      const frameId = requestAnimationFrame(() => {
        focusTarget.focus();
        setCurrentFocus(focusTarget);
      });
      
      return () => cancelAnimationFrame(frameId);
    }

    // Setup focus trap
    if (trapFocus) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        const currentModal = modalRef.current;
        if (!currentModal) return;

        const elements = focusableElements;
        if (elements.length === 0) {
          e.preventDefault();
          currentModal.focus();
          return;
        }

        const firstElement = elements[0];
        const lastElement = elements[elements.length - 1];
        const activeElement = document.activeElement;

        // If focus is outside modal, bring it back
        if (!currentModal.contains(activeElement)) {
          e.preventDefault();
          (e.shiftKey ? lastElement : firstElement).focus();
          return;
        }

        // Handle tab cycling
        if (e.shiftKey && activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        ScrollLockManager.unlock();
        
        if (restoreFocus && previousFocusRef.current) {
          requestAnimationFrame(() => {
            previousFocusRef.current?.focus();
          });
        }
      };
    }

    return () => {
      ScrollLockManager.unlock();
    };
  }, [isOpen, modalRef, initialFocusRef, focusableElements, trapFocus, restoreFocus, setFocus]);

  // Track current focus changes
  useEffect(() => {
    const handleFocusChange = () => {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && modalRef.current?.contains(activeElement)) {
        setCurrentFocus(activeElement);
      }
    };

    document.addEventListener('focusin', handleFocusChange);
    return () => document.removeEventListener('focusin', handleFocusChange);
  }, [modalRef]);

  return {
    focusableElements,
    currentFocus,
    setFocus,
  };
};
```

## Implementation Checklist

### 1. Core Components

#### 1.1 BaseModal Component
- [ ] Implement BaseModal component with all props
- [ ] Add CSS module styles for all variants
- [ ] Implement animation states (enter/exit)
- [ ] Add responsive design breakpoints
- [ ] Test with different sizes and priorities

#### 1.2 Modal Manager System
- [ ] Implement ModalManager class
- [ ] Create useModalManager hook
- [ ] Add modal registration/unregistration
- [ ] Implement stacking logic
- [ ] Add z-index management

#### 1.3 Accessibility System
- [ ] Implement useModalAccessibility hook
- [ ] Add ScrollLockManager class
- [ ] Implement focus trap logic
- [ ] Add focus restoration
- [ ] Test with screen readers

### 2. Integration Points

#### 2.1 Existing Modal Updates
- [ ] Update ConnectWalletModal to use BaseModal
- [ ] Update CreateStreamModal to use new hooks
- [ ] Update StreamCreatedModal to use BaseModal
- [ ] Remove duplicate accessibility logic
- [ ] Test all existing modal flows

#### 2.2 New Modal Components
- [ ] Create ConfirmationDialog component
- [ ] Create ErrorDialog component
- [ ] Create InfoDialog component
- [ ] Add LoadingOverlay component
- [ ] Test all new modal types

### 3. Testing Requirements

#### 3.1 Unit Tests
- [ ] BaseModal component tests
- [ ] useModalManager hook tests
- [ ] useModalAccessibility hook tests
- [ ] ScrollLockManager tests
- [ ] ModalManager class tests

#### 3.2 Integration Tests
- [ ] Modal stacking behavior
- [ ] Focus management across modals
- [ ] Scroll lock behavior
- [ ] Accessibility compliance
- [ ] Cross-browser compatibility

#### 3.3 Accessibility Tests
- [ ] Screen reader testing (NVDA, JAWS, VoiceOver)
- [ ] Keyboard navigation testing
- [ ] Focus management verification
- [ ] ARIA attribute validation
- [ ] Color contrast testing

### 4. Performance Requirements

#### 4.1 Rendering Performance
- [ ] Modal open/close <100ms
- [ ] Focus management <50ms
- [ ] Animation performance 60fps
- [ ] Memory usage monitoring
- [ ] Bundle size impact assessment

#### 4.2 Accessibility Performance
- [ ] Screen reader announcement timing
- [ ] Focus transition smoothness
- [ ] Keyboard response time
- [ ] ARIA attribute efficiency
- [ ] Assistive technology compatibility

### 5. Browser Compatibility

#### 5.1 Desktop Browsers
- [ ] Chrome (latest + 2 previous)
- [ ] Firefox (latest + 2 previous)
- [ ] Safari (latest + 2 previous)
- [ ] Edge (latest + 2 previous)

#### 5.2 Mobile Browsers
- [ ] iOS Safari (latest + 2 previous)
- [ ] Chrome Mobile (latest + 2 previous)
- [ ] Samsung Internet (latest)
- [ ] Firefox Mobile (latest)

## Migration Guide

### 1. Existing Modal Migration

#### 1.1 ConnectWalletModal Migration
```typescript
// Before
export default function ConnectWalletModal(props) {
  // Custom focus management
  // Custom scroll lock
  // Inline styles
}

// After
export default function ConnectWalletModal(props) {
  return (
    <BaseModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="Choose your wallet"
      description="Select a provider below to connect"
      priority="medium"
      size="medium"
    >
      {/* Modal content */}
    </BaseModal>
  );
}
```

#### 1.2 CreateStreamModal Migration
```typescript
// Before
export default function CreateStreamModal(props) {
  useModalAccessibility({ /* custom implementation */ });
  // Custom modal logic
}

// After
export default function CreateStreamModal(props) {
  const initialFocusRef = useRef<HTMLInputElement>(null);

  return (
    <BaseModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="Create Stream"
      initialFocusRef={initialFocusRef}
      priority="high"
      size="large"
    >
      {/* Multi-step form content */}
    </BaseModal>
  );
}
```

### 2. New Modal Implementation

#### 2.1 ConfirmationDialog Example
```typescript
export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
}) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={message}
      priority={variant === 'destructive' ? 'critical' : 'medium'}
      size="small"
    >
      <div className="flex gap-3 justify-end">
        <button onClick={onClose}>{cancelText}</button>
        <button onClick={onConfirm}>{confirmText}</button>
      </div>
    </BaseModal>
  );
};
```

## Debugging & Troubleshooting

### 1. Common Issues

#### 1.1 Focus Management Issues
**Problem**: Focus not trapped in modal
**Solution**: 
- Check focusable elements detection
- Verify ARIA attributes
- Test with different screen readers

**Problem**: Focus not restored on close
**Solution**:
- Check previous focus element reference
- Verify element is still in DOM
- Test focus restoration timing

#### 1.2 Scroll Lock Issues
**Problem**: Page still scrollable with modal open
**Solution**:
- Check scroll lock counter
- Verify body style application
- Test scrollbar width calculation

**Problem**: Layout shifts when modal opens
**Solution**:
- Verify scrollbar compensation
- Check padding-right application
- Test with different content heights

#### 1.3 Stacking Issues
**Problem**: Modal appears behind other elements
**Solution**:
- Check z-index values
- Verify modal registration
- Test stacking order

**Problem**: Multiple modals don't stack correctly
**Solution**:
- Check modal manager state
- Verify priority handling
- Test focus transfer between modals

### 2. Development Tools

#### 2.1 Modal Inspector
```typescript
// Development tool for inspecting modal state
if (process.env.NODE_ENV === 'development') {
  window.modalInspector = {
    getActiveModal: () => ModalManager.getActiveModal(),
    getModalStack: () => ModalManager.getStack(),
    getScrollLockState: () => ScrollLockManager.getState(),
    debugFocus: () => console.log(document.activeElement),
  };
}
```

#### 2.2 Focus Visualizer
```css
/* Development focus visualization */
.focus-debug *:focus {
  outline: 3px solid red !important;
  outline-offset: 2px !important;
}
```

### 3. Performance Monitoring

#### 3.1 Modal Performance Metrics
```typescript
// Performance monitoring for modals
const modalMetrics = {
  openTime: 0,
  closeTime: 0,
  focusSetTime: 0,
  renderTime: 0,
};

// Measure modal performance
const measureModalPerformance = (modalId: string, action: string) => {
  const start = performance.now();
  return () => {
    const end = performance.now();
    console.log(`Modal ${modalId} ${action}: ${end - start}ms`);
  };
};
```

## Documentation Requirements

### 1. API Documentation

#### 1.1 Component Props Documentation
```typescript
/**
 * BaseModal Component
 * 
 * A flexible modal component with built-in accessibility,
 * focus management, and stacking support.
 * 
 * @example
 * ```tsx
 * <BaseModal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title="Modal Title"
 *   priority="medium"
 *   size="large"
 * >
 *   <p>Modal content</p>
 * </BaseModal>
 * ```
 */
```

#### 1.2 Hook Documentation
```typescript
/**
 * useModalManager Hook
 * 
 * Manages modal registration, stacking, and z-index.
 * Automatically handles modal lifecycle and priority.
 * 
 * @param options - Modal manager configuration
 * @returns Modal state and controls
 */
```

### 2. Usage Examples

#### 2.1 Basic Usage Examples
- Simple modal with title and content
- Modal with custom focus management
- Modal with different priorities
- Modal with custom sizes

#### 2.2 Advanced Usage Examples
- Nested modal scenarios
- Modal with dynamic content
- Modal with custom animations
- Modal with complex forms

### 3. Best Practices Guide

#### 3.1 Modal Usage Best Practices
- When to use modals vs other UI patterns
- How to structure modal content
- Accessibility considerations
- Performance optimization tips

#### 3.2 Common Patterns
- Confirmation dialogs
- Form modals
- Error handling modals
- Loading states

---

**Document Version**: 1.0  
**Last Updated**: 2025-04-29  
**Implementation Target**: Sprint 2  
**Code Review Required**: Yes  
**QA Testing Required**: Yes  
**Accessibility Review Required**: Yes
