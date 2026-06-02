import React from 'react';

export interface ValidationMessageProps {
  id: string;
  message: string;
  type?: 'error' | 'hint' | 'success';
}

const ErrorIcon = () => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0, marginTop: '2px' }}
  >
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 4.5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="8" cy="11.75" r="1" fill="currentColor" />
  </svg>
);

const SuccessIcon = () => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0, marginTop: '2px' }}
  >
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5 8L7.5 10.5L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const roleMap: Record<NonNullable<ValidationMessageProps['type']>, string | undefined> = {
  error: 'alert',
  hint: 'status',
  success: 'status',
};

const colorMap: Record<NonNullable<ValidationMessageProps['type']>, string> = {
  error: 'var(--color-error-text)',
  hint: 'var(--color-text-muted)',
  success: 'var(--color-success)',
};

export const ValidationMessage: React.FC<ValidationMessageProps> = ({ 
  id, 
  message, 
  type = 'error' 
}) => {
  if (!message) return null;

  const role = roleMap[type];
  const textColor = colorMap[type];

  return (
    <div
      id={id}
      className={`validation-message validation-message--${type}`}
      {...(role ? { role } : {})}
      style={{ 
        display: 'flex',
        alignItems: 'flex-start',
        gap: '6px',
        marginTop: 'var(--space-xs, 4px)',
        color: textColor,
        font: 'var(--font-body-sm)',
        fontWeight: type === 'error' ? 500 : 400
      }}
    >
      {type === 'error' && <ErrorIcon />}
      {type === 'success' && <SuccessIcon />}
      <span>{message}</span>
    </div>
  );
};

export default ValidationMessage;