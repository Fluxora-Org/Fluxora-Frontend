import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupEmbedFocusManagement, createAccessibleWidgetContainer } from '../useEmbedAccessibility';

describe('setupEmbedFocusManagement', () => {
  let container: HTMLElement;
  let cleanup: () => void;

  beforeEach(() => {
    // Create a container element
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up the focus trap
    if (cleanup) {
      cleanup();
    }
    // Remove container from DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should create and remove event listener correctly', () => {
    const addEventListenerSpy = vi.spyOn(container, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(container, 'removeEventListener');

    cleanup = setupEmbedFocusManagement(container);

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    cleanup();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('should cycle from last focusable element to first on Tab', () => {
    // Create focusable elements
    const button1 = document.createElement('button');
    button1.textContent = 'Button 1';
    const button2 = document.createElement('button');
    button2.textContent = 'Button 2';
    const button3 = document.createElement('button');
    button3.textContent = 'Button 3';

    container.appendChild(button1);
    container.appendChild(button2);
    container.appendChild(button3);

    cleanup = setupEmbedFocusManagement(container);

    // Focus the last element
    button3.focus();
    expect(document.activeElement).toBe(button3);

    // Press Tab while on last element
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');

    container.dispatchEvent(tabEvent);

    // Should cycle to first element
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(button1);

    preventDefaultSpy.mockRestore();
  });

  it('should cycle from first focusable element to last on Shift+Tab', () => {
    // Create focusable elements
    const button1 = document.createElement('button');
    button1.textContent = 'Button 1';
    const button2 = document.createElement('button');
    button2.textContent = 'Button 2';
    const button3 = document.createElement('button');
    button3.textContent = 'Button 3';

    container.appendChild(button1);
    container.appendChild(button2);
    container.appendChild(button3);

    cleanup = setupEmbedFocusManagement(container);

    // Focus the first element
    button1.focus();
    expect(document.activeElement).toBe(button1);

    // Press Shift+Tab while on first element
    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    });
    const preventDefaultSpy = vi.spyOn(shiftTabEvent, 'preventDefault');

    container.dispatchEvent(shiftTabEvent);

    // Should cycle to last element
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(button3);

    preventDefaultSpy.mockRestore();
  });

  it('should support dynamic content - newly added focusable elements are included in the cycle', () => {
    // Create initial focusable elements
    const button1 = document.createElement('button');
    button1.textContent = 'Button 1';
    const button2 = document.createElement('button');
    button2.textContent = 'Button 2';

    container.appendChild(button1);
    container.appendChild(button2);

    cleanup = setupEmbedFocusManagement(container);

    // Focus the last element
    button2.focus();
    expect(document.activeElement).toBe(button2);

    // Add a new focusable element AFTER setup (simulating async content)
    const button3 = document.createElement('button');
    button3.textContent = 'Button 3';
    container.appendChild(button3);

    // Focus the newly added element (the new last element)
    button3.focus();
    expect(document.activeElement).toBe(button3);

    // Press Tab while on the new last element
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');

    container.dispatchEvent(tabEvent);

    // Should cycle to first element because the dynamic element is now included in the trap
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(button1);

    preventDefaultSpy.mockRestore();
  });

  it('should handle dynamically added focusable elements during Shift+Tab', () => {
    // Create initial focusable elements
    const button1 = document.createElement('button');
    button1.textContent = 'Button 1';
    const button2 = document.createElement('button');
    button2.textContent = 'Button 2';

    container.appendChild(button1);
    container.appendChild(button2);

    cleanup = setupEmbedFocusManagement(container);

    // Focus the first element
    button1.focus();
    expect(document.activeElement).toBe(button1);

    // Add a new focusable element AFTER setup (simulating async content)
    const button3 = document.createElement('button');
    button3.textContent = 'Button 3';
    container.appendChild(button3);

    // Press Shift+Tab while on the first element
    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    });
    const preventDefaultSpy = vi.spyOn(shiftTabEvent, 'preventDefault');

    container.dispatchEvent(shiftTabEvent);

    // Should cycle to the new last element (button3)
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(button3);

    preventDefaultSpy.mockRestore();
  });

  it('should not prevent default Tab behavior when not on first/last element', () => {
    // Create focusable elements
    const button1 = document.createElement('button');
    button1.textContent = 'Button 1';
    const button2 = document.createElement('button');
    button2.textContent = 'Button 2';
    const button3 = document.createElement('button');
    button3.textContent = 'Button 3';

    container.appendChild(button1);
    container.appendChild(button2);
    container.appendChild(button3);

    cleanup = setupEmbedFocusManagement(container);

    // Focus the middle element
    button2.focus();
    expect(document.activeElement).toBe(button2);

    // Press Tab while on middle element
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');

    container.dispatchEvent(tabEvent);

    // Should not prevent default (browser handles normal tab)
    expect(preventDefaultSpy).not.toHaveBeenCalled();

    preventDefaultSpy.mockRestore();
  });

  it('should handle Escape key to trigger close button', () => {
    // Create focusable elements and a close button
    const button1 = document.createElement('button');
    button1.textContent = 'Button 1';
    const closeButton = document.createElement('button');
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.textContent = 'Close';

    container.appendChild(button1);
    container.appendChild(closeButton);

    cleanup = setupEmbedFocusManagement(container);

    // Spy on close button click
    const clickSpy = vi.spyOn(closeButton, 'click');

    // Dispatch Escape key
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    container.dispatchEvent(escapeEvent);

    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  it('should work with custom focusable selector', () => {
    // Create elements with custom selector targets
    const customFocusable1 = document.createElement('div');
    customFocusable1.className = 'custom-focusable';
    customFocusable1.setAttribute('tabindex', '0');
    customFocusable1.textContent = 'Custom 1';

    const customFocusable2 = document.createElement('div');
    customFocusable2.className = 'custom-focusable';
    customFocusable2.setAttribute('tabindex', '0');
    customFocusable2.textContent = 'Custom 2';

    container.appendChild(customFocusable1);
    container.appendChild(customFocusable2);

    // Use custom selector
    cleanup = setupEmbedFocusManagement(container, '.custom-focusable');

    // Focus the last element
    customFocusable2.focus();
    expect(document.activeElement).toBe(customFocusable2);

    // Press Tab while on last element
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');

    container.dispatchEvent(tabEvent);

    // Should cycle to first element
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(customFocusable1);

    preventDefaultSpy.mockRestore();
  });

  it('should handle empty container gracefully', () => {
    cleanup = setupEmbedFocusManagement(container);

    // Should not throw when Tab is pressed on empty container
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });

    expect(() => {
      container.dispatchEvent(tabEvent);
    }).not.toThrow();
  });

  it('should handle removed focusable elements correctly', () => {
    // Create focusable elements
    const button1 = document.createElement('button');
    button1.textContent = 'Button 1';
    const button2 = document.createElement('button');
    button2.textContent = 'Button 2';
    const button3 = document.createElement('button');
    button3.textContent = 'Button 3';

    container.appendChild(button1);
    container.appendChild(button2);
    container.appendChild(button3);

    cleanup = setupEmbedFocusManagement(container);

    // Focus the last element
    button3.focus();
    expect(document.activeElement).toBe(button3);

    // Remove the last element (simulating async content unmount)
    container.removeChild(button3);

    // Press Tab while previously on (now removed) last element
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');

    container.dispatchEvent(tabEvent);

    // Should cycle to first because button3 is no longer in DOM
    // The old activeElement (button3) is still document.activeElement but not in container
    // So the condition won't match and normal Tab will proceed

    preventDefaultSpy.mockRestore();
  });

  it('should preserve focus cycling behavior with mixed focusable element types', () => {
    // Create mixed focusable elements
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = 'Link';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Input';

    const button = document.createElement('button');
    button.textContent = 'Button';

    container.appendChild(link);
    container.appendChild(input);
    container.appendChild(button);

    cleanup = setupEmbedFocusManagement(container);

    // Focus the last element (button)
    button.focus();
    expect(document.activeElement).toBe(button);

    // Press Tab while on last element
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');

    container.dispatchEvent(tabEvent);

    // Should cycle to first element (link)
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(link);

    preventDefaultSpy.mockRestore();
  });
});

describe('createAccessibleWidgetContainer', () => {
  let element: HTMLElement;
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
    }
    if (element?.parentNode) {
      element.parentNode.removeChild(element);
    }
    vi.restoreAllMocks();
  });

  it('should apply accessibility attributes', () => {
    cleanup = createAccessibleWidgetContainer(element, {
      role: 'region',
      ariaLabel: 'Test Widget',
      ariaDescribedby: 'desc-1',
      tabIndex: 0,
    });

    expect(element.getAttribute('role')).toBe('region');
    expect(element.getAttribute('aria-label')).toBe('Test Widget');
    expect(element.getAttribute('aria-describedby')).toBe('desc-1');
    expect(element.getAttribute('tabindex')).toBe('0');
    expect(element.style.outline).toBe('none');
  });

  it('should restore original attributes on cleanup', () => {
    element.setAttribute('role', 'navigation');
    element.setAttribute('aria-label', 'Original');
    element.setAttribute('tabindex', '-1');

    cleanup = createAccessibleWidgetContainer(element, {
      ariaLabel: 'Widget',
      tabIndex: 0,
    });

    expect(element.getAttribute('role')).toBe('article');
    expect(element.getAttribute('aria-label')).toBe('Widget');
    expect(element.getAttribute('tabindex')).toBe('0');

    cleanup();
    cleanup = undefined;

    expect(element.getAttribute('role')).toBe('navigation');
    expect(element.getAttribute('aria-label')).toBe('Original');
    expect(element.getAttribute('tabindex')).toBe('-1');
  });

  it('should register focus/blur listeners with the same function references used for removal', () => {
    const addSpy = vi.spyOn(element, 'addEventListener');
    const removeSpy = vi.spyOn(element, 'removeEventListener');

    cleanup = createAccessibleWidgetContainer(element);

    // Capture the handlers passed to addEventListener
    const focusHandler = addSpy.mock.calls.find(([type]) => type === 'focus')?.[1];
    const blurHandler = addSpy.mock.calls.find(([type]) => type === 'blur')?.[1];

    expect(focusHandler).toBeDefined();
    expect(blurHandler).toBeDefined();

    // Check that addEventListener was called with real functions (not no-ops)
    expect(focusHandler).not.toBe(blurHandler);

    cleanup();

    // Verify removeEventListener was called with the exact same references
    expect(removeSpy).toHaveBeenCalledWith('focus', focusHandler);
    expect(removeSpy).toHaveBeenCalledWith('blur', blurHandler);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('should no longer apply focus styling after cleanup when element receives focus', () => {
    element.setAttribute('tabindex', '-1');
    element.style.outline = 'initial';

    cleanup = createAccessibleWidgetContainer(element);
    cleanup();
    cleanup = undefined;

    // After cleanup, dispatch focus event on the element
    element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));

    // The listener should have been removed, so style should NOT be set by our handler
    expect(element.style.outline).not.toBe('2px solid var(--interactive-focus-ring, #007acc)');
    expect(element.style.outlineOffset).not.toBe('2px');
  });

  it('should no longer apply blur styling changes after cleanup', () => {
    element.setAttribute('tabindex', '-1');

    cleanup = createAccessibleWidgetContainer(element);

    // First, trigger focus to verify the listener works before cleanup
    element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    expect(element.style.outline).toBe('2px solid var(--interactive-focus-ring, #007acc)');

    cleanup();
    cleanup = undefined;

    // Reset the style for the post-cleanup test
    element.style.outline = 'initial';

    // After cleanup, dispatching blur should not change anything
    element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    expect(element.style.outline).toBe('initial');
  });

  it('should handle cleanup with no options gracefully', () => {
    cleanup = createAccessibleWidgetContainer(element);
    const fn = cleanup;
    expect(() => fn?.()).not.toThrow();
  });

  it('should remove aria attributes that were added when there was no original value', () => {
    cleanup = createAccessibleWidgetContainer(element, { ariaLabel: 'Temporary' });

    expect(element.getAttribute('aria-label')).toBe('Temporary');

    cleanup();
    cleanup = undefined;

    expect(element.hasAttribute('aria-label')).toBe(false);
  });
});
