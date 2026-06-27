import React from 'react';
import { ValidationMessage } from './ValidationMessage';

export interface InputFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  success?: boolean;
  children: React.ReactNode;
}

export const InputField: React.FC<InputFieldProps> = ({
  id,
  label,
  required,
  error,
  helperText,
  success,
  children,
}) => {
  // Determine which message (if any) is active
  const hasError = Boolean(error);
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
  const clonedChild = React.cloneElement(child, {
    id,
    'aria-invalid': hasError ? 'true' : 'false',
    ...(required ? { 'aria-required': 'true' } : {}),
    ...(messageId ? { 'aria-describedby': messageId } : {}),
  });

  return (
    <div className="form-group">
      <label htmlFor={id} className="form-label">
        {label}
        {required && <span className="required" aria-hidden="true"> *</span>}
      </label>

      <div className={`input-container ${containerModifier}`.trim()}>
        {clonedChild}
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
