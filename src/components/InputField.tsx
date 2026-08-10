import React from 'react';
import { ValidationMessage } from './ValidationMessage';

export interface InputFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  success?: boolean;
  /** Optional value validator used for inline validation while typing. */
  validate?: (value: string) => string | undefined;
  validationDebounceMs?: number;
  /** Defers error styling and live announcements until compositionend. */
  compositionAware?: boolean;
  /**
   * When set, renders an opt-in live "42/100" character counter beneath the
   * field. The counter only appears when this prop is explicitly provided.
   */
  maxLength?: number;
  children: React.ReactNode;
}

export const InputField: React.FC<InputFieldProps> = ({
  id,
  label,
  required,
  error,
  helperText,
  success,
  validate,
  validationDebounceMs = 300,
  compositionAware = true,
  maxLength,
  children,
}) => {
  const [isComposing, setIsComposing] = React.useState(false);
  const [validatedError, setValidatedError] = React.useState(error);
  const validationTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const announceTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [announcedCount, setAnnouncedCount] = React.useState<number | null>(null);
  const activeError = validate ? validatedError : error;
  // Determine which message (if any) is active
  const hasError = Boolean(activeError) && !(compositionAware && isComposing);
  const hasHint = Boolean(helperText) && !hasError;
  const hasSuccess = success === true && !hasError;

  // Build the id for the active ValidationMessage
  const messageId = [hasHint ? `${id}-hint` : null, hasError ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ') || undefined;

  // Determine container modifier class
  const containerModifier = hasError
    ? 'input-container--error'
    : hasSuccess
    ? 'input-container--success'
    : '';

  // Clone the child element to inject ARIA props onto the underlying <input>
  const child = React.Children.only(children) as React.ReactElement;
  const childProps = child.props as {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLElement>) => void;
    onBlur?: (event: React.FocusEvent<HTMLElement>) => void;
    onCompositionStart?: (event: React.CompositionEvent<HTMLElement>) => void;
    onCompositionEnd?: (event: React.CompositionEvent<HTMLElement>) => void;
  };
  React.useEffect(() => {
    if (!validate) setValidatedError(error);
    return () => {
      if (validationTimer.current) clearTimeout(validationTimer.current);
      if (announceTimer.current) clearTimeout(announceTimer.current);
    };
  }, [error, validate]);

  // Live character counter state (only active when maxLength is provided)
  const rawValue = childProps.value != null ? String(childProps.value) : '';
  const charCount = rawValue.length;
  const showCounter = typeof maxLength === 'number' && maxLength > 0;
  const counterWarning = showCounter && charCount >= maxLength! * 0.9;

  // Debounce the aria-live announcement so it doesn't fire on every keystroke.
  const announceCharacterCount = (count: number) => {
    if (!showCounter) return;
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => {
      setAnnouncedCount(count);
    }, 600);
  };

  const handleValidation = (value: string, immediate = false) => {
    if (!validate) return;
    if (validationTimer.current) clearTimeout(validationTimer.current);
    const nextError = validate(value);
    if (!nextError || immediate) {
      setValidatedError(nextError);
      return;
    }
    validationTimer.current = setTimeout(() => setValidatedError(nextError), validationDebounceMs);
  };
  const counterId = showCounter ? `${id}-counter` : undefined;
  const describedBy = [messageId, counterId].filter(Boolean).join(' ') || undefined;
  const clonedChild = React.cloneElement(child, {
    id,
    'aria-invalid': hasError ? 'true' : 'false',
    ...(required ? { 'aria-required': 'true' } : {}),
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    ...(showCounter ? { maxLength } : {}),
    onChange: (event: React.ChangeEvent<HTMLElement>) => {
      childProps.onChange?.(event);
      handleValidation((event.currentTarget as HTMLInputElement).value);
      announceCharacterCount((event.currentTarget as HTMLInputElement).value.length);
    },
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      childProps.onBlur?.(event);
      handleValidation((event.currentTarget as HTMLInputElement).value, true);
    },
    onCompositionStart: (event: React.CompositionEvent<HTMLElement>) => {
      childProps.onCompositionStart?.(event);
      if (compositionAware) setIsComposing(true);
    },
    onCompositionEnd: (event: React.CompositionEvent<HTMLElement>) => {
      childProps.onCompositionEnd?.(event);
      if (compositionAware) setIsComposing(false);
    },
  });

  return (
    <div className="form-group">
      <label htmlFor={id} className="form-label">
        {label}
        {required && <span className="required" aria-hidden="true"> *</span>}
      </label>

      <div className={`input-container ${containerModifier}`.trim()}>
        <div className={compositionAware && isComposing ? 'input-container--composing' : ''}>
          {clonedChild}
        </div>
      </div>

      {hasError && (
        <ValidationMessage id={`${id}-error`} message={activeError!} type="error" />
      )}
      {hasHint && (
        <ValidationMessage id={`${id}-hint`} message={helperText!} type="hint" />
      )}
      {showCounter && (
        <div
          id={counterId}
          className={`input-char-counter${counterWarning ? ' input-char-counter--warning' : ''}`}
        >
          <span className="input-char-counter__text">
            {charCount}/{maxLength}
          </span>
          {/* Debounced polite announcement — not fired on every keystroke. */}
          <span
            className="input-char-counter__announcer"
            aria-live="polite"
            aria-atomic="true"
          >
            {announcedCount != null
              ? `${announcedCount} of ${maxLength} characters`
              : ''}
          </span>
        </div>
      )}
    </div>
  );
};

export default InputField;
