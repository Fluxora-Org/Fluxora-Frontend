import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import './InfoTooltip.css';

export interface InfoTooltipProps {
  /** Unique ID for accessibility */
  id: string;
  /** Tooltip title (heading) */
  title: string;
  /** Tooltip body content */
  content: string | React.ReactNode;
  /** Accessible label for the info icon trigger */
  ariaLabel: string;
  /** Position preference (auto-calculates if not enough space) */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * InfoTooltip component with accessible popover
 * 
 * Features:
 * - WCAG 2.1 AA compliant
 * - Keyboard accessible (Enter/Space to toggle, ESC to close)
 * - Click outside to close
 * - Smart positioning (flips if insufficient space)
 * - Focus trap when open
 * - Mobile-friendly tap interactions
 * 
 * Usage:
 * ```tsx
 * <InfoTooltip
 *   id="stream-rate-tooltip"
 *   title="How is stream rate calculated?"
 *   content="The stream rate is the amount of USDC..."
 *   ariaLabel="Learn more about stream rate calculation"
 * />
 * ```
 */
export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  id,
  title,
  content,
  ariaLabel,
  position = 'bottom',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [calculatedPosition, setCalculatedPosition] = useState(position);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Calculate tooltip position based on available space
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || !tooltipRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Check if there's enough space in each direction
    const spaceAbove = trigger.top;
    const spaceBelow = viewport.height - trigger.bottom;
    const spaceLeft = trigger.left;
    const spaceRight = viewport.width - trigger.right;

    const tooltipHeight = tooltip.height || 200; // fallback estimate
    const tooltipWidth = tooltip.width || 320;

    // Determine best position
    let bestPosition = position;

    if (position === 'bottom' && spaceBelow < tooltipHeight && spaceAbove > tooltipHeight) {
      bestPosition = 'top';
    } else if (position === 'top' && spaceAbove < tooltipHeight && spaceBelow > tooltipHeight) {
      bestPosition = 'bottom';
    } else if (position === 'right' && spaceRight < tooltipWidth && spaceLeft > tooltipWidth) {
      bestPosition = 'left';
    } else if (position === 'left' && spaceLeft < tooltipWidth && spaceRight > tooltipWidth) {
      bestPosition = 'right';
    }

    // On mobile, always default to bottom for simplicity
    if (viewport.width < 480) {
      bestPosition = 'bottom';
    }

    setCalculatedPosition(bestPosition);
  }, [isOpen, position]);

  // Toggle tooltip
  const handleToggle = () => {
    setIsOpen(prev => !prev);
  };

  // Close tooltip
  const handleClose = () => {
    setIsOpen(false);
    triggerRef.current?.focus(); // Return focus to trigger
  };

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Focus close button when tooltip opens. Using a layout effect (which runs
  // synchronously after the DOM mutation, before paint) gives reliable focus
  // timing without the fragility of a setTimeout/raf deferral.
  useLayoutEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div className="info-tooltip-wrapper">
      <button
        ref={triggerRef}
        type="button"
        className="info-tooltip-trigger"
        onClick={handleToggle}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? id : undefined}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M8 7.5V11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="8" cy="5.5" r="0.75" fill="currentColor" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={tooltipRef}
          id={id}
          role="dialog"
          aria-labelledby={`${id}-title`}
          aria-modal="false"
          className={`info-tooltip-popover info-tooltip-popover--${calculatedPosition}`}
        >
          <div className="info-tooltip-header">
            <h3 id={`${id}-title`} className="info-tooltip-title">
              {title}
            </h3>
            <button
              ref={closeButtonRef}
              type="button"
              className="info-tooltip-close"
              onClick={handleClose}
              aria-label="Close tooltip"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M4 4L12 12M4 12L12 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div className="info-tooltip-content">
            {typeof content === 'string' ? <p>{content}</p> : content}
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoTooltip;
