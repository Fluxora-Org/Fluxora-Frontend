import { useEffect } from "react";

/**
 * useEmbedAccessibility Hook
 * 
 * Sets up accessibility features for embed widgets:
 * - Page title and meta description
 * - ARIA landmarks and roles
 * - Focus management
 * - Screen reader announcements
 */

interface UseEmbedAccessibilityOptions {
  /** Widget title for page title and aria-label */
  title: string;
  /** Description for meta and aria-describedby */
  description?: string;
  /** Whether this is the main content of the page */
  isMainContent?: boolean;
}

/**
 * Hook that sets up accessibility for embed widgets
 */
export function useEmbedAccessibility({
  title,
  description,
  isMainContent = true
}: UseEmbedAccessibilityOptions) {
  useEffect(() => {
    // Set page title
    const originalTitle = document.title;
    document.title = `${title} - Fluxora Widget`;
    
    // Set meta description if provided
    let metaDescription: HTMLMetaElement | null = null;
    let originalDescription: string | null = null;
    if (description) {
      metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = "description";
        document.head.appendChild(metaDescription);
      }
      originalDescription = metaDescription.getAttribute('content');
      metaDescription.setAttribute('content', description);
    }
    
    // Set lang attribute for screen readers
    const html = document.documentElement;
    const originalLang = html.getAttribute('lang') || 'en';
    html.setAttribute('lang', 'en');
    
    // Announce widget load to screen readers
    const announceToScreenReader = () => {
      const announcer = document.getElementById('embed-accessibility-announcer');
      if (announcer) {
        announcer.textContent = `Widget loaded: ${title}`;
      }
    };
    
    // Create screen reader announcer if it doesn't exist
    let announcer = document.getElementById('embed-accessibility-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'embed-accessibility-announcer';
      announcer.style.position = 'absolute';
      announcer.style.width = '1px';
      announcer.style.height = '1px';
      announcer.style.padding = '0';
      announcer.style.margin = '-1px';
      announcer.style.overflow = 'hidden';
      announcer.style.clip = 'rect(0, 0, 0, 0)';
      announcer.style.whiteSpace = 'nowrap';
      announcer.style.borderWidth = '0';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(announcer);
    }
    
    announceToScreenReader();
    
    // Set focus to widget container for keyboard users
    const widgetContainer = document.querySelector('[role="article"], main');
    if (widgetContainer && isMainContent) {
      widgetContainer.setAttribute('tabindex', '-1');
      (widgetContainer as HTMLElement).focus();
    }
    
    // Cleanup function
    return () => {
      // Restore original title
      document.title = originalTitle;
      
      // Restore or remove meta description
      if (description && metaDescription) {
        if (originalDescription) {
          metaDescription.setAttribute('content', originalDescription);
        } else {
          metaDescription.remove();
        }
      }
      
      // Restore original lang attribute
      html.setAttribute('lang', originalLang);
      
      // Remove focus from widget container
      if (widgetContainer) {
        widgetContainer.removeAttribute('tabindex');
      }
    };
  }, [title, description, isMainContent]);
}

/**
 * Creates an accessible container for embed widgets
 */
export function createAccessibleWidgetContainer(
  element: HTMLElement,
  options: {
    role?: string;
    ariaLabel?: string;
    ariaDescribedby?: string;
    tabIndex?: number;
  } = {}
): () => void {
  const {
    role = 'article',
    ariaLabel,
    ariaDescribedby,
    tabIndex
  } = options;
  
  // Store original attributes
  const originalRole = element.getAttribute('role');
  const originalAriaLabel = element.getAttribute('aria-label');
  const originalAriaDescribedby = element.getAttribute('aria-describedby');
  const originalTabIndex = element.getAttribute('tabindex');
  
  // Apply accessibility attributes
  element.setAttribute('role', role);
  
  if (ariaLabel) {
    element.setAttribute('aria-label', ariaLabel);
  }
  
  if (ariaDescribedby) {
    element.setAttribute('aria-describedby', ariaDescribedby);
  }
  
  if (tabIndex !== undefined) {
    element.setAttribute('tabindex', tabIndex.toString());
  }
  
  // Ensure proper focus styling
  element.style.outline = 'none';
  element.addEventListener('focus', () => {
    element.style.outline = '2px solid var(--interactive-focus-ring, #007acc)';
    element.style.outlineOffset = '2px';
  });
  element.addEventListener('blur', () => {
    element.style.outline = 'none';
  });
  
  // Return cleanup function
  return () => {
    // Restore original attributes
    if (originalRole) {
      element.setAttribute('role', originalRole);
    } else {
      element.removeAttribute('role');
    }
    
    if (originalAriaLabel) {
      element.setAttribute('aria-label', originalAriaLabel);
    } else if (ariaLabel) {
      element.removeAttribute('aria-label');
    }
    
    if (originalAriaDescribedby) {
      element.setAttribute('aria-describedby', originalAriaDescribedby);
    } else if (ariaDescribedby) {
      element.removeAttribute('aria-describedby');
    }
    
    if (originalTabIndex) {
      element.setAttribute('tabindex', originalTabIndex);
    } else if (tabIndex !== undefined) {
      element.removeAttribute('tabindex');
    }
    
    // Remove event listeners
    element.removeEventListener('focus', () => {});
    element.removeEventListener('blur', () => {});
    element.style.outline = '';
  };
}

/**
 * Announces a message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  let announcer = document.getElementById('embed-accessibility-announcer');
  
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'embed-accessibility-announcer';
    announcer.style.position = 'absolute';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.padding = '0';
    announcer.style.margin = '-1px';
    announcer.style.overflow = 'hidden';
    announcer.style.clip = 'rect(0, 0, 0, 0)';
    announcer.style.whiteSpace = 'nowrap';
    announcer.style.borderWidth = '0';
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(announcer);
  } else {
    announcer.setAttribute('aria-live', priority);
  }
  
  announcer.textContent = message;
  
  // Clear message after a delay to allow re-announcement
  setTimeout(() => {
    if (announcer && announcer.textContent === message) {
      announcer.textContent = '';
    }
  }, 1000);
}

/**
 * Sets focus management for embed widget keyboard navigation
 */
export function setupEmbedFocusManagement(
  container: HTMLElement,
  focusableSelector: string = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
): () => void {
  const focusableElements = container.querySelectorAll(focusableSelector);
  const firstFocusable = focusableElements[0] as HTMLElement;
  const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
  
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Tab') {
      if (!event.shiftKey && document.activeElement === lastFocusable) {
        // Tab from last element: cycle to first
        event.preventDefault();
        firstFocusable?.focus();
      } else if (event.shiftKey && document.activeElement === firstFocusable) {
        // Shift+Tab from first element: cycle to last
        event.preventDefault();
        lastFocusable?.focus();
      }
    }
    
    // Escape key closes modal contexts (if any)
    if (event.key === 'Escape') {
      const closeButton = container.querySelector('[aria-label*="close" i], [data-close]');
      if (closeButton) {
        (closeButton as HTMLElement).click();
      }
    }
  };
  
  container.addEventListener('keydown', handleKeyDown);
  
  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}