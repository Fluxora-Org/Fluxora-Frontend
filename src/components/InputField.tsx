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
  children,
}) => {
  const [isComposing, setIsComposing] = React.useState(false);
  const [validatedError, setValidatedError] = React.useState(error);
  const validationTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeError = validate ? validatedError : error;
  // Determine which message (if any) is active
  const hasError = Boolean(activeError) && !(compositionAware && isComposing);
  const hasHint = Boolean(helperText) && !hasError;
  const hasSuccess = success === true && !hasError;

  // ── Character counter state ──────────────────────────────────────────
  const [valueLength, setValueLength] = React.useState(0);
  const [counterAnnouncement, setCounterAnnouncement] = React.useState('');
  const announceTimer = React.useRef<ReturnType<typeof setTimeout>>();

  // Clone the child element to inject ARIA props onto the underlying <input>
  const child = React.Children.only(children) as React.ReactElement;
  const childProps = child.props as {
    onChange?: (event: React.ChangeEvent<HTMLElement>) => void;
    onBlur?: (event: React.FocusEvent<HTMLElement>) => void;
    onCompositionStart?: (event: React.CompositionEvent<HTMLElement>) => void;
    onCompositionEnd?: (event: React.CompositionEvent<HTMLElement>) => void;
    maxLength?: number;
  };

  // Read maxLength from the child <input> element
  const maxLength = childProps.maxLength;
  const showCounter = typeof maxLength === 'number' && maxLength > 0;
  const counterId = showCounter ? `${id}-counter` : undefined;

  // Deferred announcement for screen readers (not on every keystroke)
  const scheduleAnnouncement = React.useCallback((text: string) => {
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setCounterAnnouncement(text), 600);
  }, []);

  // Build the id for the active ValidationMessage (include counter)
  const messageId = [hasHint ? `${id}-hint` : null, hasError ? `${id}-error` : null, counterId]
    .filter(Boolean)
    .join(' ') || undefined;

  // Determine container modifier class
  const containerModifier = hasError
    ? 'input-container--error'
    : hasSuccess
    ? 'input-container--success'
    : '';

  // Counter display
  const counterText = showCounter ? `${valueLength}/${maxLength}` : '';
  const charsRemaining = showCounter ? maxLength! - valueLength : 0;
  const isNearLimit = showCounter && charsRemaining <= Math.max(1, Math.floor(maxLength! * 0.1));
  React.useEffect(() => {
    if (!validate) setValidatedError(error);
    return () => {
      if (validationTimer.current) clearTimeout(validationTimer.current);
    };
  }, [error, validate]);

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
  const clonedChild = React.cloneElement(child, {
    id,
    'aria-invalid': hasError ? 'true' : 'false',
    ...(required ? { 'aria-required': 'true' } : {}),
    ...(messageId ? { 'aria-describedby': messageId } : {}),
    'data-composing': compositionAware && isComposing ? 'true' : undefined,
    onChange: (event: React.ChangeEvent<HTMLElement>) => {
      childProps.onChange?.(event);
      const value = (event.currentTarget as HTMLInputElement).value;
      setValueLength(value.length);
      handleValidation(value);
      if (showCounter) {
        scheduleAnnouncement(`${value.length} of ${maxLength} characters`);
      }
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
          className="input-counter"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            fontSize: '0.8rem',
            marginTop: 'var(--space-xs, 4px)',
            color: isNearLimit ? 'var(--color-warning, #f59e0b)' : 'var(--color-text-muted, #6b7a94)',
            fontWeight: isNearLimit ? 600 : 400,
          }}
          aria-live={isNearLimit ? 'polite' : 'off'}
        >
          {counterText}
        </div>
      )}

      {/* Visually hidden aria-live region for debounced screen-reader announcements */}
      {showCounter && (
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0,0,0,0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          {counterAnnouncement}
        </div>
      )}
    </div>
  );
};

export default InputField;
