import React, { useCallback, useEffect, useState } from 'react';
import type { CanonicalHeader, ColumnMapping } from './types';
import { CANONICAL_HEADERS } from './types';
import { ValidationMessage } from '../ValidationMessage';

/** Human-readable labels for each canonical field. */
const FIELD_LABELS: Record<CanonicalHeader, string> = {
  recipient: 'Recipient address',
  deposit_amount: 'Deposit amount (USDC)',
  accrual_rate_per_day: 'Rate (USDC/day)',
  duration_days: 'Duration (days)',
};

export interface ColumnMappingStepProps {
  /** CSV headers detected from the uploaded file. */
  detectedHeaders: string[];
  /** Pre-populated best-guess mapping from the parser. */
  initialMapping: Partial<ColumnMapping>;
  /** Called when the user confirms the mapping. */
  onMappingConfirmed: (mapping: ColumnMapping) => void;
}

/**
 * ColumnMappingStep — shown when CSV headers don't exactly match the canonical
 * set.  Renders one labelled `<select>` per required field.
 *
 * Accessibility:
 * - Each select is labelled by a `<span>` via `aria-labelledby`.
 * - The group has a `<div role="group">` with a heading.
 * - Errors are announced via ValidationMessage (role="alert").
 * - "Apply mapping" is disabled until all four fields are mapped distinctly.
 */
const ColumnMappingStep: React.FC<ColumnMappingStepProps> = ({
  detectedHeaders,
  initialMapping,
  onMappingConfirmed,
}) => {
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>(initialMapping);
  const [touched, setTouched] = useState<Partial<Record<CanonicalHeader, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  // Reset when props change (new file uploaded)
  useEffect(() => {
    setMapping(initialMapping);
    setTouched({});
    setSubmitted(false);
  }, [initialMapping]);

  const handleChange = useCallback(
    (field: CanonicalHeader, value: string) => {
      setMapping((prev) => ({ ...prev, [field]: value || undefined }));
      setTouched((prev) => ({ ...prev, [field]: true }));
    },
    [],
  );

  // Duplicate-column detection
  const selectedValues = Object.values(mapping).filter(Boolean) as string[];
  const hasDuplicates =
    selectedValues.length !== new Set(selectedValues).size;

  // Per-field errors
  const getFieldError = useCallback(
    (field: CanonicalHeader): string | undefined => {
      if (!touched[field] && !submitted) return undefined;
      if (!mapping[field]) return `${FIELD_LABELS[field]} is required`;
      // Check duplicate (this field's value appears in another field too)
      const val = mapping[field]!;
      const otherUsages = CANONICAL_HEADERS.filter(
        (c) => c !== field && mapping[c] === val,
      );
      if (otherUsages.length > 0) return 'Each column can only be used once.';
      return undefined;
    },
    [mapping, touched, submitted],
  );

  const isComplete =
    CANONICAL_HEADERS.every((c) => Boolean(mapping[c])) && !hasDuplicates;

  const handleApply = useCallback(() => {
    setSubmitted(true);
    // Touch all fields so errors surface
    const allTouched = CANONICAL_HEADERS.reduce(
      (acc, c) => ({ ...acc, [c]: true }),
      {} as Record<CanonicalHeader, boolean>,
    );
    setTouched(allTouched);

    if (!isComplete) return;
    onMappingConfirmed(mapping as ColumnMapping);
  }, [isComplete, mapping, onMappingConfirmed]);

  return (
    <div className="column-mapping-step">
      <div
        role="group"
        aria-labelledby="column-mapping-heading"
        className="column-mapping-group"
      >
        <div className="column-mapping-table-header">
          <span className="column-mapping-col-label">Required field</span>
          <span className="column-mapping-col-select">Your CSV column</span>
        </div>

        {CANONICAL_HEADERS.map((canonical) => {
          const fieldError = getFieldError(canonical);
          const selectId = `column-map-${canonical}`;
          const labelId = `column-map-label-${canonical}`;

          return (
            <div key={canonical} className="column-mapping-row">
              <span
                id={labelId}
                className="column-mapping-field-label"
              >
                {FIELD_LABELS[canonical]}
                <span className="required" aria-hidden="true"> *</span>
              </span>

              <div className="column-mapping-select-wrap">
                <div
                  className={[
                    'input-container',
                    fieldError ? 'input-container--error' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <select
                    id={selectId}
                    className="column-mapping-select"
                    value={mapping[canonical] ?? ''}
                    onChange={(e) => handleChange(canonical, e.target.value)}
                    onBlur={() =>
                      setTouched((prev) => ({ ...prev, [canonical]: true }))
                    }
                    aria-labelledby={labelId}
                    aria-required="true"
                    aria-invalid={Boolean(fieldError)}
                    aria-describedby={
                      fieldError ? `${selectId}-error` : undefined
                    }
                  >
                    <option value="">-- Select column --</option>
                    {detectedHeaders.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>

                {fieldError && (
                  <ValidationMessage
                    id={`${selectId}-error`}
                    message={fieldError}
                    type="error"
                  />
                )}
              </div>
            </div>
          );
        })}

        {hasDuplicates && submitted && (
          <ValidationMessage
            id="column-mapping-duplicate-error"
            message="Each column can only be used once. Please select a unique column for each field."
            type="error"
          />
        )}
      </div>

      <button
        type="button"
        className="btn btn-next column-mapping-apply-btn"
        onClick={handleApply}
        disabled={!isComplete}
        aria-disabled={!isComplete}
      >
        Apply mapping
        <svg
          width="16"
          height="16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
};

export default ColumnMappingStep;
