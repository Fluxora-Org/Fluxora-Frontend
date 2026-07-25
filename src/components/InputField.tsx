import React from 'react';
import { ValidationMessage } from './ValidationMessage';

export interface InputFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  success?: boolean;
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
  compositionAware = true,
  children,
}) => {
  const [isComposing, setIsComposing] = React.useState(false);
  // Determine which message (if any) is active
  const hasError = Boolean(error) && !(compositionAware && isComposing);
  const hasHint = Boolean(helperText) && !hasError;
  const hasSuccess = success === true && !hasError;

  // Build the id for the active ValidationMessage
  const messageId = hasError
    ? `${id}-error`
    : hasHint
    ? `${id}-hint`
    : undefined;

  // Determine container modifier class
  const containerModifier = hasError
    ? 'input-container--error'
    : hasSuccess
    ? 'input-container--success'
    : '';

  // Clone the child element to inject ARIA props onto the underlying <input>
  const child = React.Children.only(children) as React.ReactElement;
  const childProps = child.props as {
    onCompositionStart?: (event: React.CompositionEvent<HTMLElement>) => void;
    onCompositionEnd?: (event: React.CompositionEvent<HTMLElement>) => void;
  };
  const clonedChild = React.cloneElement(child, {
    id,
    'aria-invalid': hasError ? 'true' : 'false',
    ...(required ? { 'aria-required': 'true' } : {}),
    ...(messageId ? { 'aria-describedby': messageId } : {}),
    'data-composing': compositionAware && isComposing ? 'true' : undefined,
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
        <ValidationMessage id={`${id}-error`} message={error!} type="error" />
      )}
      {hasHint && (
        <ValidationMessage id={`${id}-hint`} message={helperText!} type="hint" />
      )}
    </div>
  );
};

export default InputField;
