import React from 'react';
import './InputWithUnit.css';

export interface InputWithUnitProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Unit label to display (e.g., "USDC / day", "days", "USDC") */
  unit: string;
  /** Unique ID for accessibility */
  id: string;
  /** Whether the field has an error */
  hasError?: boolean;
}

/**
 * InputWithUnit - Input field with inline unit badge
 * 
 * Displays an input field with a non-editable unit badge on the right side.
 * The badge is positioned absolutely to prevent layout shift.
 * 
 * Features:
 * - Accessible unit label (aria-describedby)
 * - Proper padding to prevent text overlap
 * - Responsive font sizing
 * - Error state styling
 * 
 * Usage:
 * ```tsx
 * <InputWithUnit
 *   id="stream-rate"
 *   unit="USDC / day"
 *   value={accrualRate}
 *   onChange={(e) => setAccrualRate(e.target.value)}
 *   placeholder="0.00"
 * />
 * ```
 */
export const InputWithUnit: React.FC<InputWithUnitProps> = ({
  unit,
  id,
  hasError,
  className,
  ...inputProps
}) => {
  const unitId = `${id}-unit`;
  
  return (
    <div className={`input-with-unit ${hasError ? 'input-with-unit--error' : ''}`}>
      <input
        {...inputProps}
        id={id}
        className={`input-with-unit__field ${className || ''}`.trim()}
        aria-describedby={unitId}
      />
      <span id={unitId} className="input-with-unit__badge" aria-label={`Unit: ${unit}`}>
        {unit}
      </span>
    </div>
  );
};

export default InputWithUnit;
