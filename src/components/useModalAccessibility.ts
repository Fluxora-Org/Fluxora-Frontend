import { useEffect } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

let scrollLockCount = 0;
let previousBodyOverflow = '';
let previousBodyPaddingRight = '';

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    if (element.hasAttribute('hidden')) return false;
    if (element.getAttribute('aria-hidden') === 'true') return false;
    if (element.tabIndex < 0) return false;
    if (element instanceof HTMLInputElement && element.type === 'hidden') return false;

    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

function lockBodyScroll() {
  if (typeof document === 'undefined') return;

  if (scrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousBodyPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  scrollLockCount += 1;
}

function unlockBodyScroll() {
  if (typeof document === 'undefined' || scrollLockCount === 0) return;

  scrollLockCount -= 1;

  if (scrollLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
    document.body.style.paddingRight = previousBodyPaddingRight;
  }
}

interface UseModalAccessibilityOptions {
  isOpen: boolean;
  onClose: () => void;
  modalRef: RefObject<HTMLElement>;
  initialFocusRef?: RefObject<HTMLElement>;
}

export function useModalAccessibility({
  isOpen,
  onClose,
  modalRef,
  initialFocusRef,
}: UseModalAccessibilityOptions) {
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockBodyScroll();

    const focusInitialElement = () => {
      const focusTarget = initialFocusRef?.current ?? getFocusableElements(modalRef.current)[0] ?? modalRef.current;
      focusTarget?.focus();
    };

    const frameId = window.requestAnimationFrame(focusInitialElement);

    const handleKeyDown = (event: KeyboardEvent) => {
      const currentModal = modalRef.current;
      if (!currentModal) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(currentModal);
      if (focusableElements.length === 0) {
        event.preventDefault();
        currentModal.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!currentModal.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
        return;
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener('keydown', handleKeyDown);
      unlockBodyScroll();

      if (
        previouslyFocused &&
        previouslyFocused.isConnected &&
        document.contains(previouslyFocused)
      ) {
        window.requestAnimationFrame(() => previouslyFocused.focus());
      }
    };
  }, [initialFocusRef, isOpen, modalRef, onClose]);

  return {
    focusableSelector: FOCUSABLE_SELECTOR,
  };
}
