/**
 * Button Component
 * ──────────────────────────────────────
 * Implements DESIGN_SPEC.md § 4.1 Button specifications
 * 
 * Features:
 * - All interactive states (default, hover, focus, active, disabled, loading)
 * - Full keyboard accessibility (Tab, Enter, Space)
 * - WCAG 2.1 AA color contrast compliance
 * - Multiple variants (primary, secondary, danger, success)
 * - Multiple sizes (sm, md, lg)
 * - Icon support with optional text
 * - Loading state with spinner animation
 * 
 * Usage:
 *   <Button onClick={handleClick}>Create Stream</Button>
 *   <Button variant="secondary" size="sm">Cancel</Button>
 *   <Button disabled>Disabled</Button>
 *   <Button loading>Creating...</Button>
 *   <Button icon={<Icon />} iconOnly aria-label="Close" />
 */

import React, { ReactNode, ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon size */
  iconSize?: 'xs' | 'sm' | 'md' | 'lg';
  /** Button content (text, icon, or both) */
  children?: ReactNode;
  
  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  
  /** Full width button */
  fullWidth?: boolean;
  
  /** Icon element (SVG, component, etc.) */
  icon?: ReactNode;
  
  /** Icon-only button (no text) */
  iconOnly?: boolean;
  
  /** Loading state - shows spinner and disables interaction */
  loading?: boolean;
  
  /** Loading spinner content (override default) */
  loadingContent?: ReactNode;
  
  /** Disabled state */
  disabled?: boolean;
  
  /** Type of button */
  type?: 'button' | 'submit' | 'reset';
  
  /** Click handler */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * Button component with full accessibility support
 * 
 * Implements:
 * - Focus ring via :focus-visible (keyboard accessible)
 * - ARIA attributes for loading and disabled states
 * - Semantic button element with proper roles
 * - Spinner animation for loading state
 * - Multiple variants and sizes
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  iconSize = 'sm',
  icon,
  iconOnly = false,
  loading = false,
  loadingContent,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  ...props
}: ButtonProps) {
  // Build class list
  const classNames = [
    styles.button,
    // Variant class (primary, secondary, ghost, danger, success)
    styles[`button${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
    // Size class (sm, lg) – md is default and has no extra class
    size !== 'md' && styles[`button${size.charAt(0).toUpperCase() + size.slice(1)}`],
    fullWidth && styles.buttonFullWidth,
    iconOnly && styles.buttonIconOnly,
  ]
    .filter(Boolean)
    .join(' ');

  // Determine if button should be disabled
  const isDisabled = disabled || loading;

  // Render spinner
  const renderSpinner = () => (
    <span className={styles.loadingSpinner} aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    </span>
  );

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      aria-busy={loading ? 'true' : undefined}
      aria-disabled={isDisabled ? 'true' : undefined}
      className={`${classNames} ${className}`.trim()}
      {...props}
    >
      {/* Icon */}
        {icon && (
          <span className={`icon-${iconSize} ${styles.buttonIcon}`} aria-hidden={iconOnly ? undefined : "true"}>
            {icon}
          </span>
        )}

      {/* Loading state */}
      {loading ? (
        <>
          {renderSpinner()}
          {loadingContent && <span>{loadingContent}</span>}
          {!loadingContent && children && <span>{children}</span>}
        </>
      ) : (
        children
      )}
    </button>
  );
}
