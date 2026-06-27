# Modal Focus Management, Stacking, and Scroll Lock Behavior - Design Specification

## Executive Summary

This design specification defines comprehensive modal behavior for Fluxora-Frontend, focusing on focus management, stacking order, and scroll lock behavior. The specification ensures consistent, accessible, and predictable modal interactions across all user flows and states.

## User Goals & Success Metrics

### Primary User Goals
1. **Clear Focus Management**: Users always know where focus is and can navigate predictably
2. **Intuitive Modal Stacking**: Users understand which modal is active in multi-modal scenarios
3. **Seamless Scroll Behavior**: Page content doesn't jump or become inaccessible during modal interactions
4. **Accessibility Compliance**: All users can navigate modals using assistive technology

### Success Metrics
- **Focus Predictability**: >95% of users can navigate modals without confusion
- **Modal Stack Clarity**: >90% of users understand which modal is active in stacked scenarios
- **Scroll Behavior Consistency**: Zero layout shifts when modals open/close
- **Accessibility Compliance**: WCAG 2.1 AA compliance for all modal interactions

## Current State Analysis

### Existing Modal Implementations
- **ConnectWalletModal**: Basic focus trap and scroll lock
- **CreateStreamModal**: Multi-step modal with useModalAccessibility hook
- **StreamCreatedModal**: Success modal with accessibility hooks
- **useModalAccessibility**: Shared hook for focus management and scroll lock

### Identified Gaps
1. No consistent modal stacking system
2. Inconsistent z-index management across modals
3. Limited focus restoration patterns
4. No modal priority system for nested scenarios
5. Missing modal state management for complex flows

## Modal Classification & States

### 1. Modal Types

#### 1.1 Primary Modals (High Priority)
- **ConnectWalletModal**: Wallet connection flow
- **CreateStreamModal**: Multi-step stream creation
- **StreamCreatedModal**: Success confirmation

#### 1.2 Secondary Modals (Medium Priority)
- **ConfirmationDialogs**: Delete/cancel confirmations
- **ErrorDialogs**: Error recovery options
- **InfoDialogs**: Help and information displays

#### 1.3 System Modals (Low Priority)
- **ToastNotifications**: Temporary status messages
- **LoadingOverlays**: Loading state overlays
- **DebugModals**: Development and debugging tools

### 2. User States & Scenarios

#### 2.1 Anonymous Users
- **ConnectWalletModal**: Primary entry point
- **InfoDialogs**: Help and onboarding
- **ErrorDialogs**: Connection failure recovery

#### 2.2 Connected Users
- **CreateStreamModal**: Core functionality
- **ConfirmationDialogs**: Destructive action confirmations
- **StreamCreatedModal**: Success feedback

#### 2.3 Modal States
- **Default**: Normal modal operation
- **Loading**: Processing state with disabled interactions
- **Empty**: No content or empty state display
- **Error**: Error state with recovery options
- **Success**: Success state with confirmation

## Focus Management Specification

### 1. Focus Trap Implementation

#### 1.1 Focusable Elements Detection
```typescript
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface FocusableElement {
  element: HTMLElement;
  priority: number;
  group: 'primary' | 'secondary' | 'tertiary';
}
```

#### 1.2 Focus Order Logic
1. **Initial Focus**: First focusable element or specified initial focus
2. **Tab Navigation**: Logical forward progression through focusable elements
3. **Shift+Tab Navigation**: Logical backward progression
4. **Focus Restoration**: Return to trigger element on modal close
5. **Focus Groups**: Prioritize primary actions over secondary elements

#### 1.3 Focus Management States
```typescript
interface FocusState {
  currentElement: HTMLElement | null;
  previousElement: HTMLElement | null;
  focusableElements: FocusableElement[];
  trapActive: boolean;
  restorationPending: boolean;
}
```

### 2. Focus Management Patterns

#### 2.1 Single Modal Focus
```
Modal Open:
1. Save current focus element
2. Apply scroll lock
3. Set focus to initial element
4. Activate focus trap

Modal Close:
1. Remove focus trap
2. Release scroll lock
3. Restore focus to trigger element
```

#### 2.2 Multiple Modal Focus
```
Modal Stack:
1. Save focus for each modal in stack
2. Apply focus trap to top modal only
3. Maintain scroll lock for entire stack
4. Restore focus to previous modal on close

Modal Replacement:
1. Save current modal focus state
2. Transition to new modal
3. Update focus trap to new modal
4. Maintain scroll lock throughout
```

#### 2.3 Nested Modal Focus
```
Parent Modal -> Child Modal:
1. Save parent modal focus state
2. Transition to child modal
3. Update focus trap to child
4. Maintain scroll lock

Child Modal Close -> Parent Modal:
1. Restore parent modal focus state
2. Update focus trap to parent
3. Maintain scroll lock
```

## Modal Stacking System

### 1. Z-Index Hierarchy

#### 1.1 Z-Index Scale
```css
:root {
  --z-index-base: 1;
  --z-index-dropdown: 100;
  --z-index-sticky: 200;
  --z-index-fixed: 300;
  --z-index-modal-backdrop: 1000;
  --z-index-modal: 1100;
  --z-index-modal-high: 1200;
  --z-index-toast: 2000;
  --z-index-tooltip: 3000;
}
```

#### 1.2 Modal Priority Levels
```typescript
enum ModalPriority {
  LOW = 1100,      // Info dialogs, help modals
  MEDIUM = 1200,   // Confirmation dialogs, error modals
  HIGH = 1300,     // Primary modals (connect, create stream)
  CRITICAL = 1400, // System critical modals, security dialogs
}
```

#### 1.3 Stacking Algorithm
```typescript
interface ModalStack {
  modals: ModalInstance[];
  activeModal: ModalInstance | null;
  maxZIndex: number;
}

interface ModalInstance {
  id: string;
  priority: ModalPriority;
  element: HTMLElement;
  focusState: FocusState;
  timestamp: number;
}
```

### 2. Stack Management

#### 2.1 Modal Registration
```typescript
class ModalManager {
  private stack: ModalStack = {
    modals: [],
    activeModal: null,
    maxZIndex: 1100,
  };

  registerModal(modal: ModalInstance): void {
    // Add to stack with appropriate z-index
    // Update focus management
    // Apply scroll lock if needed
  }

  unregisterModal(modalId: string): void {
    // Remove from stack
    // Restore focus to previous modal
    // Release scroll lock if stack is empty
  }

  bringToFront(modalId: string): void {
    // Move modal to top of stack
    // Update z-index
    // Update focus trap
  }
}
```

#### 2.2 Stack Behaviors
- **LIFO (Last In, First Out)**: Most recently opened modal gets focus
- **Priority Override**: Higher priority modals can push lower priority to back
- **Auto-Cleanup**: Remove destroyed modals from stack
- **Focus Transfer**: Smooth focus transitions between stacked modals

### 3. Visual Stacking Indicators

#### 3.1 Backdrop Layers
```css
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(2, 8, 18, 0.8);
  backdrop-filter: blur(5px);
  z-index: var(--z-index-modal-backdrop);
}

.modal-backdrop.stack-depth-1 {
  background: rgba(2, 8, 18, 0.6);
}

.modal-backdrop.stack-depth-2 {
  background: rgba(2, 8, 18, 0.4);
}
```

#### 3.2 Modal Positioning
```css
.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: var(--z-index-modal);
  max-width: 90vw;
  max-height: 90vh;
}

.modal.stack-offset {
  transform: translate(-50%, -50%) scale(0.95);
  opacity: 0.8;
}
```

## Scroll Lock Behavior

### 1. Scroll Lock Implementation

#### 1.1 Body Scroll Management
```typescript
interface ScrollLockState {
  lockCount: number;
  originalOverflow: string;
  originalPaddingRight: string;
  scrollbarWidth: number;
  isLocked: boolean;
}

class ScrollLockManager {
  private state: ScrollLockState = {
    lockCount: 0,
    originalOverflow: '',
    originalPaddingRight: '',
    scrollbarWidth: 0,
    isLocked: false,
  };

  lock(): void {
    if (this.state.lockCount === 0) {
      this.captureOriginalState();
      this.applyScrollLock();
    }
    this.state.lockCount++;
  }

  unlock(): void {
    this.state.lockCount = Math.max(0, this.state.lockCount - 1);
    if (this.state.lockCount === 0) {
      this.restoreOriginalState();
    }
  }
}
```

#### 1.2 Scrollbar Compensation
```typescript
const getScrollbarWidth = (): number => {
  const outer = document.createElement('div');
  outer.style.visibility = 'hidden';
  outer.style.overflow = 'scroll';
  document.body.appendChild(outer);

  const inner = document.createElement('div');
  outer.appendChild(inner);

  const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
  outer.parentNode?.removeChild(outer);

  return scrollbarWidth;
};
```

### 2. Scroll Lock Patterns

#### 2.1 Single Modal Scroll Lock
```
Modal Open:
1. Calculate scrollbar width
2. Store original body styles
3. Apply overflow: hidden to body
4. Add padding-right to compensate for scrollbar
5. Maintain scroll position

Modal Close:
1. Restore original body styles
2. Remove scrollbar compensation
3. Maintain scroll position
```

#### 2.2 Multiple Modal Scroll Lock
```
First Modal Open:
1. Apply scroll lock (count = 1)
2. Store original scroll position

Second Modal Open:
1. Increment lock count (count = 2)
2. Maintain existing scroll lock

Second Modal Close:
1. Decrement lock count (count = 1)
2. Maintain scroll lock

First Modal Close:
1. Decrement lock count (count = 0)
2. Release scroll lock
3. Restore original scroll position
```

#### 2.3 Scroll Position Preservation
```typescript
interface ScrollPosition {
  x: number;
  y: number;
}

const preserveScrollPosition = (): ScrollPosition => {
  return {
    x: window.scrollX,
    y: window.scrollY,
  };
};

const restoreScrollPosition = (position: ScrollPosition): void => {
  window.scrollTo(position.x, position.y);
};
```

### 3. Edge Cases & Considerations

#### 3.1 Dynamic Content
- **Content Height Changes**: Handle modal content that changes height
- **Overflow Handling**: Scroll within modal when content exceeds viewport
- **Resize Events**: Adjust modal positioning on window resize

#### 3.2 Mobile Considerations
- **Touch Scrolling**: Prevent touch scrolling on body
- **Viewport Changes**: Handle orientation changes
- **Virtual Keyboard**: Adjust modal position for keyboard

#### 3.3 Accessibility Considerations
- **Screen Readers**: Announce modal state changes
- **Focus Management**: Maintain focus within modal
- **Keyboard Navigation**: Ensure all functionality via keyboard

## Component Specifications

### 1. Base Modal Component

#### 1.1 Interface Definition
```typescript
interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  priority?: ModalPriority;
  initialFocusRef?: RefObject<HTMLElement>;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  preventClose?: boolean;
  className?: string;
  children: ReactNode;
}

interface BaseModalState {
  isVisible: boolean;
  isAnimating: boolean;
  focusState: FocusState;
  scrollLockActive: boolean;
}
```

#### 1.2 Component Template
```typescript
export function BaseModal({
  isOpen,
  onClose,
  title,
  description,
  priority = ModalPriority.MEDIUM,
  initialFocusRef,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  preventClose = false,
  className,
  children,
}: BaseModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const modalId = useModalId();

  useModalManager({
    id: modalId,
    isOpen,
    priority,
    element: modalRef,
    onClose,
  });

  useModalAccessibility({
    isOpen,
    onClose,
    modalRef,
    initialFocusRef,
  });

  // Animation and visibility logic
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      // Handle exit animation
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  return (
    <div className={`modal-backdrop ${className}`}>
      <div
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? `${modalId}-title` : undefined}
        aria-describedby={description ? `${modalId}-description` : undefined}
        style={{ zIndex: priority }}
      >
        {title && (
          <h2 id={`${modalId}-title`} className="modal-title">
            {title}
          </h2>
        )}
        
        {description && (
          <p id={`${modalId}-description`} className="modal-description">
            {description}
          </p>
        )}
        
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
}
```

### 2. Modal Manager Hook

#### 2.1 Hook Interface
```typescript
interface UseModalManagerOptions {
  id: string;
  isOpen: boolean;
  priority: ModalPriority;
  element: RefObject<HTMLElement>;
  onClose: () => void;
}

interface UseModalManagerReturn {
  zIndex: number;
  stackDepth: number;
  isActive: boolean;
  bringToFront: () => void;
}
```

#### 2.2 Hook Implementation
```typescript
export function useModalManager({
  id,
  isOpen,
  priority,
  element,
  onClose,
}: UseModalManagerOptions): UseModalManagerReturn {
  const [zIndex, setZIndex] = useState(priority);
  const [stackDepth, setStackDepth] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      modalManager.registerModal({
        id,
        priority,
        element: element.current!,
        focusState: getInitialFocusState(),
        timestamp: Date.now(),
      });
    } else {
      modalManager.unregisterModal(id);
    }
  }, [id, isOpen, priority, element]);

  useEffect(() => {
    const unsubscribe = modalManager.subscribe((stack) => {
      const modal = stack.modals.find(m => m.id === id);
      if (modal) {
        setZIndex(modal.priority);
        setStackDepth(stack.modals.length - stack.modals.findIndex(m => m.id === id) - 1);
        setIsActive(stack.activeModal?.id === id);
      }
    });

    return unsubscribe;
  }, [id]);

  const bringToFront = useCallback(() => {
    modalManager.bringToFront(id);
  }, [id]);

  return {
    zIndex,
    stackDepth,
    isActive,
    bringToFront,
  };
}
```

### 3. Enhanced Accessibility Hook

#### 3.1 Hook Interface
```typescript
interface UseModalAccessibilityOptions {
  isOpen: boolean;
  onClose: () => void;
  modalRef: RefObject<HTMLElement>;
  initialFocusRef?: RefObject<HTMLElement>;
  restoreFocus?: boolean;
  trapFocus?: boolean;
}

interface UseModalAccessibilityReturn {
  focusableElements: HTMLElement[];
  currentFocus: HTMLElement | null;
  setFocus: (element: HTMLElement) => void;
}
```

#### 3.2 Enhanced Implementation
```typescript
export function useModalAccessibility({
  isOpen,
  onClose,
  modalRef,
  initialFocusRef,
  restoreFocus = true,
  trapFocus = true,
}: UseModalAccessibilityOptions): UseModalAccessibilityReturn {
  const [currentFocus, setCurrentFocus] = useState<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Save previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Apply scroll lock
    scrollLockManager.lock();

    // Set initial focus
    const focusTarget = initialFocusRef?.current ?? 
                      getFocusableElements(modalRef.current)[0] ?? 
                      modalRef.current;
    
    focusTarget?.focus();
    setCurrentFocus(focusTarget ?? null);

    // Setup focus trap
    if (trapFocus) {
      const handleKeyDown = createFocusTrapHandler(modalRef.current!, onClose);
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        scrollLockManager.unlock();
        
        if (restoreFocus && previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }

    return () => {
      scrollLockManager.unlock();
    };
  }, [isOpen, modalRef, initialFocusRef, onClose, restoreFocus, trapFocus]);

  const setFocus = useCallback((element: HTMLElement) => {
    element.focus();
    setCurrentFocus(element);
  }, []);

  const focusableElements = useMemo(() => {
    return getFocusableElements(modalRef.current);
  }, [modalRef]);

  return {
    focusableElements,
    currentFocus,
    setFocus,
  };
}
```

## State Management

### 1. Modal State Machine

#### 1.1 State Definition
```typescript
type ModalState = 
  | 'closed'
  | 'opening'
  | 'open'
  | 'closing'
  | 'error';

type ModalEvent =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'OPEN_COMPLETE' }
  | { type: 'CLOSE_COMPLETE' }
  | { type: 'ERROR'; payload: string };

interface ModalStateMachine {
  state: ModalState;
  context: {
    isOpen: boolean;
    isAnimating: boolean;
    error: string | null;
  };
}
```

#### 1.2 State Transitions
```typescript
const modalTransitions = {
  closed: {
    OPEN: 'opening',
  },
  opening: {
    OPEN_COMPLETE: 'open',
    ERROR: 'error',
    CLOSE: 'closing',
  },
  open: {
    CLOSE: 'closing',
    ERROR: 'error',
  },
  closing: {
    CLOSE_COMPLETE: 'closed',
    ERROR: 'error',
  },
  error: {
    CLOSE: 'closing',
    OPEN: 'opening',
  },
};
```

### 2. Global Modal State

#### 2.1 Context Provider
```typescript
interface ModalContextValue {
  modals: Map<string, ModalInstance>;
  activeModal: string | null;
  stackDepth: number;
  registerModal: (modal: ModalInstance) => void;
  unregisterModal: (id: string) => void;
  activateModal: (id: string) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modals, setModals] = useState<Map<string, ModalInstance>>(new Map());
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const registerModal = useCallback((modal: ModalInstance) => {
    setModals(prev => new Map(prev).set(modal.id, modal));
  }, []);

  const unregisterModal = useCallback((id: string) => {
    setModals(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  // ... other methods

  const value: ModalContextValue = {
    modals,
    activeModal,
    registerModal,
    unregisterModal,
    activateModal: setActiveModal,
    closeModal: unregisterModal,
    closeAllModals: () => setModals(new Map()),
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
}
```

## Accessibility Requirements

### 1. WCAG 2.1 AA Compliance

#### 1.1 Focus Management
- **Focus Trap**: Focus must be trapped within active modal
- **Focus Restoration**: Focus must return to trigger element on close
- **Visible Focus**: Focus indicators must be clearly visible
- **Logical Order**: Focus order must follow logical reading order

#### 1.2 Keyboard Navigation
- **Tab Navigation**: Forward navigation through focusable elements
- **Shift+Tab Navigation**: Backward navigation through focusable elements
- **Escape Key**: Close modal with Escape key
- **Enter/Space**: Activate focused buttons and controls

#### 1.3 Screen Reader Support
- **Role Attributes**: Proper role="dialog" and aria-modal="true"
- **Labeling**: aria-labelledby and aria-describedby for modal content
- **Live Regions**: Announce modal state changes to screen readers
- **Focus Announcements**: Announce focus changes within modal

### 2. ARIA Implementation

#### 2.1 Modal Structure
```html
<div 
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Modal Title</h2>
  <p id="modal-description">Modal description</p>
  
  <!-- Modal content -->
  
  <div role="status" aria-live="polite" aria-atomic="true">
    Status message
  </div>
  
  <div role="alert" aria-live="assertive" aria-atomic="true">
    Error message
  </div>
</div>
```

#### 2.2 Focus Management ARIA
```html
<!-- Focusable elements with proper labels -->
<button aria-label="Close modal">×</button>
<button aria-describedby="action-description">Action</button>
<input aria-label="Enter amount" aria-required="true" />
```

### 3. Testing Requirements

#### 3.1 Automated Testing
```typescript
describe('Modal Accessibility', () => {
  it('should trap focus within modal', () => {
    render(<TestModal isOpen={true} />);
    
    const firstFocusable = screen.getAllByRole('button')[0];
    expect(firstFocusable).toHaveFocus();
    
    // Tab through all elements
    fireEvent.keyDown(document, { key: 'Tab' });
    // Focus should remain within modal
  });

  it('should restore focus on close', () => {
    const { getByRole } = render(<TestModal isOpen={true} />);
    const triggerButton = getByRole('button', { name: 'Open Modal' });
    
    triggerButton.click();
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(triggerButton).toHaveFocus();
  });
});
```

#### 3.2 Manual Testing Checklist
- [ ] Focus is trapped within modal
- [ ] Focus returns to trigger element on close
- [ ] Escape key closes modal
- [ ] Tab navigation works correctly
- [ ] Screen reader announces modal content
- [ ] ARIA attributes are correct

## Performance Considerations

### 1. Rendering Performance

#### 1.1 Modal Rendering
- **Lazy Loading**: Load modal content only when opened
- **Portal Rendering**: Use React Portal for modal rendering
- **Animation Optimization**: Use CSS transforms for animations
- **Memory Management**: Clean up event listeners and timers

#### 1.2 Focus Management Performance
- **Debounced Focus**: Debounce rapid focus changes
- **Efficient Queries**: Cache focusable element queries
- **Minimal DOM Queries**: Minimize DOM queries in focus trap
- **Optimized Event Handlers**: Use passive event listeners where possible

### 2. Memory Management

#### 2.1 Event Listener Cleanup
```typescript
useEffect(() => {
  if (!isOpen) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    // Focus trap logic
  };

  document.addEventListener('keydown', handleKeyDown, { passive: true });

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
}, [isOpen]);
```

#### 2.2 Timer Cleanup
```typescript
useEffect(() => {
  if (!isOpen) return;

  const animationTimer = setTimeout(() => {
    setIsAnimating(false);
  }, 200);

  return () => clearTimeout(animationTimer);
}, [isOpen]);
```

### 3. Bundle Size Optimization

#### 3.1 Code Splitting
```typescript
const LazyModal = lazy(() => import('./Modal'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyModal isOpen={isOpen} />
    </Suspense>
  );
}
```

#### 3.2 Tree Shaking
- Export only necessary functions
- Use proper import/export syntax
- Avoid unused dependencies
- Optimize CSS imports

## Implementation Handoff

### 1. File Structure
```
src/components/modal/
  BaseModal.tsx
  BaseModal.module.css
  ModalProvider.tsx
  useModalManager.ts
  useModalAccessibility.ts
  ModalManager.ts
  ScrollLockManager.ts
  __tests__/
    BaseModal.test.tsx
    useModalManager.test.tsx
    useModalAccessibility.test.tsx
```

### 2. Integration Points

#### 2.1 Existing Modal Updates
- **ConnectWalletModal**: Migrate to BaseModal
- **CreateStreamModal**: Update to use new hooks
- **StreamCreatedModal**: Use enhanced accessibility

#### 2.2 New Modal Components
- **ConfirmationDialog**: Standardized confirmation modals
- **ErrorDialog**: Error handling modals
- **InfoDialog**: Help and information modals

### 3. Migration Strategy

#### 3.1 Phase 1: Foundation
- Implement BaseModal component
- Create modal management hooks
- Update existing modals gradually

#### 3.2 Phase 2: Enhancement
- Add advanced features
- Implement modal stacking
- Add comprehensive testing

#### 3.3 Phase 3: Optimization
- Performance optimization
- Bundle size reduction
- Documentation completion

## Testing Strategy

### 1. Unit Tests

#### 1.1 Component Tests
```typescript
describe('BaseModal', () => {
  it('should render when isOpen is true', () => {
    render(<BaseModal isOpen={true} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<BaseModal isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should trap focus within modal', () => {
    render(<BaseModal isOpen={true} />);
    // Test focus trap behavior
  });
});
```

#### 1.2 Hook Tests
```typescript
describe('useModalManager', () => {
  it('should register modal when open', () => {
    const { result } = renderHook(() => useModalManager({
      id: 'test-modal',
      isOpen: true,
      priority: ModalPriority.MEDIUM,
      element: { current: mockElement },
      onClose: jest.fn(),
    }));

    expect(modalManager.getModal('test-modal')).toBeDefined();
  });
});
```

### 2. Integration Tests

#### 2.1 Modal Stacking
```typescript
describe('Modal Stacking', () => {
  it('should handle multiple modals correctly', () => {
    render(
      <>
        <BaseModal id="modal1" isOpen={true} priority={ModalPriority.LOW} />
        <BaseModal id="modal2" isOpen={true} priority={ModalPriority.HIGH} />
      </>
    );

    expect(modalManager.getActiveModal()).toBe('modal2');
  });
});
```

#### 2.2 Focus Management
```typescript
describe('Focus Management Integration', () => {
  it('should manage focus across modal transitions', () => {
    // Test focus behavior across modal open/close/stack scenarios
  });
});
```

### 3. Accessibility Tests

#### 3.1 Screen Reader Tests
```typescript
describe('Screen Reader Support', () => {
  it('should announce modal content', () => {
    render(<BaseModal isOpen={true} title="Test Modal" />);
    
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby');
  });
});
```

#### 3.2 Keyboard Navigation Tests
```typescript
describe('Keyboard Navigation', () => {
  it('should navigate with Tab key', () => {
    render(<BaseModal isOpen={true} />);
    
    fireEvent.keyDown(document, { key: 'Tab' });
    // Test focus movement
  });
});
```

## Edge Cases & Error Handling

### 1. Error Scenarios

#### 1.1 Modal Content Errors
- **Loading Failures**: Handle modal content loading errors
- **Render Errors**: Graceful fallback for render failures
- **Network Errors**: Handle network-dependent modal content

#### 1.2 Focus Management Errors
- **No Focusable Elements**: Handle modals with no focusable content
- **Hidden Elements**: Handle dynamically hidden focusable elements
- **Disabled Elements**: Handle disabled interactive elements

#### 1.3 Scroll Lock Errors
- **Body Style Conflicts**: Handle conflicting body styles
- **Scrollbar Calculation**: Handle scrollbar width calculation errors
- **Mobile Viewport**: Handle mobile viewport changes

### 2. Recovery Strategies

#### 2.1 Automatic Recovery
- **Focus Recovery**: Auto-focus to first available element
- **Scroll Recovery**: Auto-restore scroll position
- **State Recovery**: Auto-recover from transient errors

#### 2.2 User Recovery
- **Manual Focus**: Allow manual focus setting
- **Manual Close**: Force close problematic modals
- **Reset Options**: Reset modal state to defaults

### 3. Monitoring & Debugging

#### 3.1 Development Tools
- **Modal Inspector**: Development tool for inspecting modal state
- **Focus Visualizer**: Visual focus indicator for debugging
- **Stack Viewer**: Visual modal stack representation

#### 3.2 Production Monitoring
- **Error Tracking**: Track modal-related errors
- **Performance Metrics**: Monitor modal performance
- **Usage Analytics**: Track modal usage patterns

## Documentation & Maintenance

### 1. API Documentation

#### 1.1 Component Props
```typescript
/**
 * BaseModal Component
 * 
 * @param isOpen - Whether the modal is open
 * @param onClose - Callback when modal is closed
 * @param title - Modal title (optional)
 * @param description - Modal description (optional)
 * @param priority - Modal priority for stacking
 * @param initialFocusRef - Initial focus element ref
 * @param closeOnBackdropClick - Close on backdrop click
 * @param closeOnEscape - Close on escape key
 * @param preventClose - Prevent modal from closing
 * @param className - Additional CSS classes
 * @param children - Modal content
 */
```

#### 1.2 Hook Documentation
```typescript
/**
 * useModalManager Hook
 * 
 * Manages modal registration, stacking, and focus.
 * 
 * @param options - Modal manager options
 * @returns Modal manager state and controls
 */
```

### 2. Usage Examples

#### 2.1 Basic Usage
```typescript
function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Modal</button>
      
      <BaseModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="My Modal"
        priority={ModalPriority.MEDIUM}
      >
        <p>Modal content goes here</p>
        <button onClick={() => setIsOpen(false)}>Close</button>
      </BaseModal>
    </>
  );
}
```

#### 2.2 Advanced Usage
```typescript
function AdvancedModal() {
  const [isOpen, setIsOpen] = useState(false);
  const initialFocusRef = useRef<HTMLButtonElement>(null);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Advanced Modal"
      priority={ModalPriority.HIGH}
      initialFocusRef={initialFocusRef}
      closeOnBackdropClick={false}
      preventClose={true}
    >
      <button ref={initialFocusRef}>Initial Focus</button>
      <button onClick={() => setIsOpen(false)}>Can Close</button>
    </BaseModal>
  );
}
```

### 3. Maintenance Guidelines

#### 3.1 Code Maintenance
- **Regular Updates**: Keep dependencies up to date
- **Performance Monitoring**: Regular performance audits
- **Accessibility Testing**: Regular accessibility reviews
- **Documentation Updates**: Keep documentation current

#### 3.2 Breaking Changes
- **Version Management**: Semantic versioning for breaking changes
- **Migration Guides**: Provide migration guides for breaking changes
- **Deprecation Warnings**: Warn about deprecated features
- **Backward Compatibility**: Maintain backward compatibility when possible

---

**Document Version**: 1.0  
**Last Updated**: 2025-04-29  
**Next Review**: 2025-05-06  
**Owner**: Design Team  
**Reviewers**: PM, Engineering Lead, Accessibility Specialist
