/**
 * Input Component
 * ──────────────────────────────────────
 * Implements DESIGN_SPEC.md § form input specifications
 * * Features:
 * - Full keyboard accessibility (Tab, focus rings)
 * - Error state with aria-invalid and aria-errormessage
 * - Disabled state support
 * - Helper and error messages (using ValidationMessage)
 * - Label association via htmlFor
 * - Textarea and Select variants
 * - WCAG 2.1 AA color contrast compliance
 * * Usage:
 * <Input label="Email" type="email" placeholder="your@email.com" />
 * <Input label="Message" type="textarea" />
 * <Input label="Country" type="select" error="Invalid selection" />
 * <Input label="Password" type="password" required disabled />
 */


import {
  useId,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  CompositionEventHandler,
} from "react";
import { useState } from "react";
import styles from "./Input.module.css";
import { ValidationMessage } from "./ValidationMessage";

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  /** Label text displayed above input */
  label?: string;

  /** Type of input (text, email, password, number, textarea, select) */
  type?: string;

  /** Help text displayed below input */
  helperText?: string;

  /** Error message (shows in red) */
  error?: string;

  /** Required field indicator */
  required?: boolean;

  /** Options for select inputs */
  options?: Array<{ value: string; label: string }>;

  /** Additional className */
  className?: string;

  /** ID for label association */
  id?: string;

  /** Defers error styling and announcements until compositionend for text input. */
  compositionAware?: boolean;
}

type SharedInputProps = Omit<
  InputProps,
  "type" | "options" | "label" | "helperText" | "error"
>;

/**
 * Input component with comprehensive accessibility support
 * * Implements:
 * - Label + Input association via htmlFor/id
 * - Error state with aria-invalid and aria-errormessage
 * - Helper text for guidance
 * - Focus ring via :focus-visible
 * - Required indicator
 * - All input types (text, email, password, etc.) + textarea + select
 */
export default function Input({
  label,
  type = "text",
  helperText,
  error,
  required = false,
  options,
  className = "",
  id,
  disabled = false,
  placeholder,
  compositionAware = type === "text" || type === "textarea" || type === "email" || type === "search",
  onCompositionStart,
  onCompositionEnd,
  ...props
}: InputProps) {
  const generatedId = useId();
  const [isComposing, setIsComposing] = useState(false);

  // Generate ID if not provided
  const inputId = id ?? generatedId;

  // Determine if input has error
  const hasError = Boolean(error) && !(compositionAware && isComposing);
  const composingClass = compositionAware && isComposing ? styles.composing : "";

  const handleCompositionStart: CompositionEventHandler<HTMLInputElement> = (event) => {
    onCompositionStart?.(event);
    if (compositionAware) setIsComposing(true);
  };

  const handleCompositionEnd: CompositionEventHandler<HTMLInputElement> = (event) => {
    onCompositionEnd?.(event);
    if (compositionAware) setIsComposing(false);
  };

  // `aria-describedby` must only point at elements that actually exist in the
  // DOM. The helper-text element is suppressed when an error is shown (to keep
  // the visual hierarchy focused on the error), so we drop the helper id from
  // the described-by string in that case as well — otherwise the id would be
  // a dangling reference that screen readers announce as missing.
  const describedBy =
    [
      hasError ? `${inputId}-error` : null,
      !hasError && helperText ? `${inputId}-helper` : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  const sharedProps: SharedInputProps = props;

  return (
    <div className={styles.inputContainer}>
      {/* Label */}
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {required && (
            <span className={styles.labelRequired} aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {/* Textarea */}
      {type === "textarea" ? (
        <textarea
          id={inputId}
          className={`${styles.input} ${styles.textarea} ${
            hasError ? styles.error : ""
          } ${composingClass} ${className}`.trim()}
          aria-invalid={hasError ? "true" : "false"}
          aria-errormessage={hasError ? `${inputId}-error` : undefined}
          aria-describedby={describedBy}
          data-composing={compositionAware && isComposing ? "true" : undefined}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          {...(sharedProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          onCompositionStart={handleCompositionStart as unknown as CompositionEventHandler<HTMLTextAreaElement>}
          onCompositionEnd={handleCompositionEnd as unknown as CompositionEventHandler<HTMLTextAreaElement>}
        />
      ) : type === "select" && options ? (
        /* Select */
        <select
          id={inputId}
          className={`${styles.input} ${styles.select} ${
            hasError ? styles.error : ""
          } ${composingClass} ${className}`.trim()}
          aria-invalid={hasError ? "true" : "false"}
          aria-errormessage={hasError ? `${inputId}-error` : undefined}
          aria-describedby={describedBy}
          data-composing={compositionAware && isComposing ? "true" : undefined}
          disabled={disabled}
          required={required}
          {...(sharedProps as SelectHTMLAttributes<HTMLSelectElement>)}
        >
          <option value="">{placeholder || "Select an option"}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        /* Regular Input */
        <input
          id={inputId}
          type={type}
          className={`${styles.input} ${
            hasError ? styles.error : ""
          } ${composingClass} ${className}`.trim()}
          aria-invalid={hasError ? "true" : "false"}
          aria-errormessage={hasError ? `${inputId}-error` : undefined}
          aria-describedby={describedBy}
          data-composing={compositionAware && isComposing ? "true" : undefined}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          {...props}
        />
      )}

      {/* Error Message */}
      {hasError && error && (
        <ValidationMessage id={`${inputId}-error`} message={error} />
      )}

      {/* Helper Text */}
      {helperText && !hasError && (
        <span id={`${inputId}-helper`} className={styles.helperText}>
          {helperText}
        </span>
      )}
    </div>
  );
}
