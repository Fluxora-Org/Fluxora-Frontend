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
    onChange?: (event: React.ChangeEvent<HTMLElement>) => void;
    onBlur?: (event: React.FocusEvent<HTMLElement>) => void;
    onCompositionStart?: (event: React.CompositionEvent<HTMLElement>) => void;
    onCompositionEnd?: (event: React.CompositionEvent<HTMLElement>) => void;
  };
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
      handleValidation((event.currentTarget as HTMLInputElement).value);
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
    </div>
  );
};

export default InputField;
