import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './PreviewValidateStep.css';
import type { CanonicalHeader, CsvRow } from './types';
import { validateRow, markDuplicates } from './csvParser';
import { ValidationMessage } from '../ValidationMessage';
import { ConfirmModal } from '../common/ConfirmModal';

export interface PreviewValidateStepProps {
  rows: CsvRow[];
  onRowsChange: (rows: CsvRow[]) => void;
  onReview: () => void;
  onReplaceFile: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}


// ─── Status badge ─────────────────────────────────────────────────────────────

const ValidIcon = () => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
  >
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M5 8l2.5 2.5L11 5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ErrorIcon = () => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
  >
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M8 4.5V9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="8" cy="11.75" r="1" fill="currentColor" />
  </svg>
);

const WarnIcon = () => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
  >
    <path
      d="M8 2L14.5 13H1.5L8 2z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M8 6v3.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
  </svg>
);

interface RowStatusBadgeProps {
  row: CsvRow;
}

const RowStatusBadge: React.FC<RowStatusBadgeProps> = ({ row }) => {
  const { status, rowNumber, fieldErrors, duplicateRows } = row;
  const firstError = Object.values(fieldErrors)[0];

  if (status === 'valid') {
    return (
      <span
        className="csv-row-status csv-row-status--valid"
        aria-label={`Row ${rowNumber}: valid`}
      >
        <ValidIcon />
        <span className="csv-row-status__text">Valid</span>
      </span>
    );
  }
  if (status === 'needs-fix') {
    return (
      <span
        className="csv-row-status csv-row-status--error"
        aria-label={`Row ${rowNumber}: has errors. ${firstError ?? ''}`}
      >
        <ErrorIcon />
        <span className="csv-row-status__text">Needs fix</span>
      </span>
    );
  }
  if (status === 'duplicate-recipient') {
    return (
      <span
        className="csv-row-status csv-row-status--warning"
        aria-label={`Row ${rowNumber}: duplicate recipient address (rows ${duplicateRows?.join(', ')})`}
      >
        <WarnIcon />
        <span className="csv-row-status__text">Duplicate</span>
      </span>
    );
  }
  if (status === 'skipped') {
    return (
      <span
        className="csv-row-status csv-row-status--skipped"
        aria-label={`Row ${rowNumber}: skipped`}
      >
        <span className="csv-row-status__text">Skipped</span>
      </span>
    );
  }
  return null;
};

// ─── Inline edit row ──────────────────────────────────────────────────────────

interface InlineEditRowProps {
  row: CsvRow;
  onSave: (updated: Pick<CsvRow, 'recipient' | 'depositAmount' | 'accrualRatePerDay' | 'durationDays'>) => void;
  onCancel: () => void;
}

const InlineEditRow: React.FC<InlineEditRowProps> = ({
  row,
  onSave,
  onCancel,
}) => {
  const [recipient, setRecipient] = useState(row.recipient);
  const [depositAmount, setDepositAmount] = useState(row.depositAmount);
  const [accrualRate, setAccrualRate] = useState(row.accrualRatePerDay);
  const [durationDays, setDurationDays] = useState(row.durationDays);
  const [editErrors, setEditErrors] = useState<Partial<Record<CanonicalHeader, string>>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const handleSave = () => {
    const { fieldErrors, isValid } = validateRow({
      recipient,
      depositAmount,
      accrualRatePerDay: accrualRate,
      durationDays,
    });
    setEditErrors(fieldErrors);
    if (isValid) {
      onSave({ recipient, depositAmount, accrualRatePerDay: accrualRate, durationDays });
    }
  };

  const fields: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    error?: string;
    canonical: CanonicalHeader;
  }[] = [
    {
      id: `edit-recipient-${row.id}`,
      label: 'Recipient',
      value: recipient,
      onChange: setRecipient,
      error: editErrors.recipient,
      canonical: 'recipient',
    },
    {
      id: `edit-deposit-${row.id}`,
      label: 'Deposit',
      value: depositAmount,
      onChange: setDepositAmount,
      error: editErrors.deposit_amount,
      canonical: 'deposit_amount',
    },
    {
      id: `edit-rate-${row.id}`,
      label: 'Rate/day',
      value: accrualRate,
      onChange: setAccrualRate,
      error: editErrors.accrual_rate_per_day,
      canonical: 'accrual_rate_per_day',
    },
    {
      id: `edit-duration-${row.id}`,
      label: 'Duration',
      value: durationDays,
      onChange: setDurationDays,
      error: editErrors.duration_days,
      canonical: 'duration_days',
    },
  ];

  return (
    <tr
      className="csv-edit-row"
      role="row"
      aria-label={`Editing row ${row.rowNumber}`}
    >
      <td colSpan={6} className="csv-edit-row__cell">
        <div className="csv-edit-row__inner">
          {fields.map((f, idx) => (
            <div key={f.id} className="csv-edit-field">
              <label htmlFor={f.id} className="form-label">
                {f.label}
              </label>
              <div
                className={[
                  'input-container',
                  f.error ? 'input-container--error' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <input
                  ref={idx === 0 ? firstInputRef : undefined}
                  id={f.id}
                  type="text"
                  inputMode={f.canonical === 'recipient' ? 'text' : 'decimal'}
                  className="input-field"
                  value={f.value}
                  onChange={(e) => f.onChange(e.target.value)}
                  aria-invalid={Boolean(f.error)}
                  aria-describedby={
                    f.error ? `${f.id}-error` : undefined
                  }
                />
              </div>
              {f.error && (
                <ValidationMessage
                  id={`${f.id}-error`}
                  message={f.error}
                  type="error"
                />
              )}
            </div>
          ))}

          <div className="csv-edit-row__actions">
            <button
              type="button"
              className="btn btn-next csv-edit-save-btn"
              onClick={handleSave}
            >
              Save
            </button>
            <button
              type="button"
              className="btn btn-back csv-edit-cancel-btn"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
};

// ─── Main preview step ────────────────────────────────────────────────────────

const PreviewValidateStep: React.FC<PreviewValidateStepProps> = ({
  rows,
  onRowsChange,
  onReview,
  onReplaceFile,
  isLoading,
  error,
  onRetry,
}) => {
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const fixButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const { t } = useTranslation();

  const validCount = rows.filter((r) => r.status === 'valid').length;
  const errorCount = rows.filter((r) => r.status === 'needs-fix').length;
  const dupCount = rows.filter((r) => r.status === 'duplicate-recipient').length;
  const skippedCount = rows.filter((r) => r.status === 'skipped').length;
  const submitCount = validCount;
  const canSubmit = submitCount > 0;

  const openEdit = useCallback((rowId: string) => {
    setEditingRowId(rowId);
  }, []);

  const closeEdit = useCallback(
    (rowId: string) => {
      setEditingRowId(null);
      // Return focus to the row's Fix button
      requestAnimationFrame(() => {
        fixButtonRefs.current[rowId]?.focus();
      });
    },
    [],
  );

  const handleSave = useCallback(
    (
      rowId: string,
      updated: Pick<CsvRow, 'recipient' | 'depositAmount' | 'accrualRatePerDay' | 'durationDays'>,
    ) => {
      const { fieldErrors, isValid } = validateRow({
        recipient: updated.recipient,
        depositAmount: updated.depositAmount,
        accrualRatePerDay: updated.accrualRatePerDay,
        durationDays: updated.durationDays,
      });

      const newRows = rows.map((r) =>
        r.id === rowId
          ? {
              ...r,
              ...updated,
              fieldErrors,
              status: isValid ? ('valid' as const) : ('needs-fix' as const),
              duplicateRows: undefined,
            }
          : r,
      );
      // Re-run duplicate detection on the updated rows
      markDuplicates(newRows);
      onRowsChange(newRows);

      const targetRow = newRows.find((r) => r.id === rowId);
      const rowNumber = targetRow?.rowNumber ?? '?';
      const statusLabel =
        targetRow?.status === 'valid'
          ? 'now valid'
          : targetRow?.status === 'needs-fix'
            ? `still has errors: ${Object.values(fieldErrors)[0] ?? 'unknown error'}`
            : 'updated';
      setLiveMessage(`Row ${rowNumber} updated: ${statusLabel}.`);

      closeEdit(rowId);
    },
    [rows, onRowsChange, closeEdit],
  );

  const handleSkipRow = useCallback(
    (rowId: string) => {
      const newRows = rows.map((r) =>
        r.id === rowId ? { ...r, status: 'skipped' as const } : r,
      );
      markDuplicates(newRows);
      onRowsChange(newRows);
    },
    [rows, onRowsChange],
  );

  const handleSkipAllInvalid = useCallback(() => {
    const newRows = rows.map((r) =>
      r.status === 'needs-fix' ? { ...r, status: 'skipped' as const } : r,
    );
    markDuplicates(newRows);
    onRowsChange(newRows);
    setLiveMessage(t('invalidRowsSkipped', { count: errorCount }));
  }, [rows, onRowsChange, errorCount]);

  const handleReplaceClick = useCallback(() => {
    setIsConfirmModalOpen(true);
  }, []);

  const handleConfirmReplace = useCallback(() => {
    setIsConfirmModalOpen(false);
    onReplaceFile();
  }, [onReplaceFile]);

  const handleCancelReplace = useCallback(() => {
    setIsConfirmModalOpen(false);
  }, []);

  if (isLoading) {
    return (
      <div className="csv-preview-step csv-preview-step--loading" aria-busy="true" aria-live="polite">
        <div className="csv-preview-loading-spinner" />
        <p>Loading preview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="csv-preview-step csv-preview-step--error" role="alert">
        <div className="csv-preview-error-content">
          <ErrorIcon />
          <p>{error}</p>
        </div>
        <div className="csv-preview-error-actions">
          {onRetry && (
            <button type="button" className="btn btn-secondary" onClick={onRetry}>
              Retry
            </button>
          )}
          <button type="button" className="btn btn-back" onClick={onReplaceFile}>
            Replace CSV
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="csv-preview-step">
      {/* ── Summary bar ── */}
      <div className="csv-preview-summary">
        <span className="csv-preview-summary__total">
          Reviewing <strong>{rows.length}</strong> stream
          {rows.length !== 1 ? 's' : ''}
        </span>
        {errorCount > 0 && (
          <span className="csv-preview-badge csv-preview-badge--error">
            {errorCount} need{errorCount !== 1 ? '' : 's'} attention
          </span>
        )}
        {dupCount > 0 && (
          <span className="csv-preview-badge csv-preview-badge--warning">
            {dupCount} duplicate{dupCount !== 1 ? 's' : ''}
          </span>
        )}
        {skippedCount > 0 && (
          <span className="csv-preview-badge csv-preview-badge--skipped">
            {skippedCount} skipped
          </span>
        )}
        <button
          type="button"
          className="csv-replace-link"
          onClick={handleReplaceClick}
          aria-label="Replace CSV file"
        >
          Replace CSV
        </button>
      </div>

      {/* ── Scrollable table container ── */}
      <div
        className="csv-preview-scroll"
        role="region"
        aria-label="CSV preview table. Scroll horizontally to see all columns."
        tabIndex={0}
      >
        <table
          className="csv-preview-table"
          role="table"
          aria-label="Stream preview"
          aria-describedby="csv-preview-caption"
        >
          <caption id="csv-preview-caption" className="sr-only">
            {validCount} valid, {errorCount} need attention, {dupCount}{' '}
            duplicate recipients
          </caption>
          <thead>
            <tr>
              <th scope="col" className="csv-th csv-th--num">#</th>
              <th scope="col" className="csv-th csv-th--recipient">Recipient</th>
              <th scope="col" className="csv-th csv-th--amount">Deposit (USDC)</th>
              <th scope="col" className="csv-th csv-th--rate">Rate/day</th>
              <th scope="col" className="csv-th csv-th--duration">Duration</th>
              <th scope="col" className="csv-th csv-th--status">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="csv-preview-empty-state">
                  <div className="csv-preview-empty-content">
                    <p>No valid rows found in this file.</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => {
              const isEditing = editingRowId === row.id;
              const firstFieldError = Object.entries(row.fieldErrors)[0];

              return (
                <React.Fragment key={row.id}>
                  <tr
                    className={[
                      'csv-data-row',
                      `csv-data-row--${row.status}`,
                      isEditing ? 'csv-data-row--editing' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-label={`Row ${row.rowNumber}: ${row.status}`}
                    aria-invalid={row.status === 'needs-fix' || undefined}
                  >
                    <td className="csv-td csv-td--num">{row.rowNumber}</td>
                    <td className="csv-td csv-td--recipient">
                      <span
                        className="csv-address"
                        title={row.recipient}
                      >
                        {row.recipient
                          ? `${row.recipient.slice(0, 8)}…${row.recipient.slice(-6)}`
                          : <span className="csv-empty">—</span>}
                      </span>
                      {row.fieldErrors.recipient && (
                        <div className="csv-field-error">
                          {row.fieldErrors.recipient}
                        </div>
                      )}
                    </td>
                    <td className="csv-td">
                      {row.depositAmount || <span className="csv-empty">—</span>}
                      {row.fieldErrors.deposit_amount && (
                        <div className="csv-field-error">
                          {row.fieldErrors.deposit_amount}
                        </div>
                      )}
                    </td>
                    <td className="csv-td">
                      {row.accrualRatePerDay || <span className="csv-empty">—</span>}
                      {row.fieldErrors.accrual_rate_per_day && (
                        <div className="csv-field-error">
                          {row.fieldErrors.accrual_rate_per_day}
                        </div>
                      )}
                    </td>
                    <td className="csv-td">
                      {row.durationDays
                        ? `${row.durationDays}d`
                        : <span className="csv-empty">—</span>}
                      {row.fieldErrors.duration_days && (
                        <div className="csv-field-error">
                          {row.fieldErrors.duration_days}
                        </div>
                      )}
                    </td>
                    <td className="csv-td csv-td--status">
                      <div className="csv-td-status-inner">
                        <RowStatusBadge row={row} />
                        {row.status === 'duplicate-recipient' && row.duplicateRows && (
                          <div className="csv-dup-hint">
                            Also in row{row.duplicateRows.length > 1 ? 's' : ''}{' '}
                            {row.duplicateRows.join(', ')}
                          </div>
                        )}
                        {(row.status === 'needs-fix' || row.status === 'valid' || row.status === 'duplicate-recipient') && (
                          <button
                            ref={(el) => {
                              fixButtonRefs.current[row.id] = el;
                            }}
                            type="button"
                            className={`csv-fix-btn ${row.status === 'valid' || row.status === 'duplicate-recipient' ? 'csv-fix-btn--edit' : ''}`}
                            aria-label={
                              row.status === 'needs-fix'
                                ? `Fix row ${row.rowNumber}${firstFieldError ? ': ' + firstFieldError[1] : ''}`
                                : `Edit row ${row.rowNumber}`
                            }
                            onClick={() => openEdit(row.id)}
                          >
                            {row.status === 'needs-fix' ? 'Fix' : 'Edit'}
                          </button>
                        )}
                        {(row.status === 'needs-fix' || row.status === 'duplicate-recipient') && (
                          <button
                            type="button"
                            className="csv-skip-btn"
                            aria-label={`Skip row ${row.rowNumber}`}
                            onClick={() => handleSkipRow(row.id)}
                          >
                            Skip
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Inline edit panel */}
                  {isEditing && (
                    <InlineEditRow
                      row={row}
                      onSave={(updated) => handleSave(row.id, updated)}
                      onCancel={() => closeEdit(row.id)}
                    />
                  )}
                </React.Fragment>
              );
            }))}
          </tbody>
        </table>
      </div>

      {/* ── Live region for row-update announcements ── */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveMessage}
      </div>

      {/* ── Footer actions ── */}
      <div className="csv-preview-footer">
        {errorCount > 0 && (
          <button
            type="button"
            className="btn btn-back csv-skip-invalid-btn"
            onClick={handleSkipAllInvalid}
          >
            Skip invalid rows
          </button>
        )}
        <button
          type="button"
          className="btn btn-next csv-submit-btn"
          disabled={!canSubmit}
          aria-disabled={!canSubmit}
          onClick={onReview}
        >
          Review batch to dry-run preview
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
      {/* ── Confirm Modal ── */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        title="Replace CSV File?"
        description="Replacing the file will clear your current preview. Continue?"
        confirmText="Replace"
        cancelText="Cancel"
        onConfirm={handleConfirmReplace}
        onCancel={handleCancelReplace}
      />
    </div>
  );
};

export default PreviewValidateStep;
