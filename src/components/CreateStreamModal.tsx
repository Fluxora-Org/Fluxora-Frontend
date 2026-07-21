import { useState, useRef, useEffect } from 'react';
import './CreateStreamModal.css';
import { InputField } from './InputField';
import { InputWithUnit } from './InputWithUnit';
import { InfoTooltip } from './InfoTooltip';
import { useModalAccessibility } from './useModalAccessibility';
import { useWallet } from './wallet-connect/Walletcontext';
import { useToast } from './toast/ToastProvider';
import { useTransactionStatus } from '../hooks/useTransactionStatus';
import { createStream, getTransactionStatus } from '../lib/stellar/tx';
import { isValidStellarAddress, maskAddress } from '../lib/stellar';
import {
  computeStreamEndDate,
  validateCliffBeforeEnd,
  formatLocalDateTime,
  isBeforeLocalDateTime,
  isDateTimeInPast,
} from '../lib/createStreamDates';
import { useI18n } from '../i18n';

const USDC_DECIMAL_PLACES = 7;

export function sanitizeDepositAmountInput(value: string): string {
  const digitsAndDots = value.replace(/[^0-9.]/g, "");
  const [rawInteger = "", ...fractionParts] = digitsAndDots.split(".");
  const hasDecimal = digitsAndDots.includes(".");
  const integerPart = rawInteger.replace(/^0+(?=\d)/, "");
  const normalizedInteger = integerPart || (hasDecimal ? "0" : "");
  const fractionPart = fractionParts
    .join("")
    .slice(0, USDC_DECIMAL_PLACES);

  return hasDecimal ? `${normalizedInteger}.${fractionPart}` : normalizedInteger;
}

// Keep demo stream math below JS safe-integer territory while still allowing large institutional schedules.
export const MAX_ACCRUAL_RATE = 100_000;
export const MIN_DURATION_DAYS = 1;
export const MAX_DURATION_DAYS = 3_650;
export const MAX_REQUIRED_DEPOSIT = MAX_ACCRUAL_RATE * MAX_DURATION_DAYS;

/**
 * Converts a user-entered decimal string into the numeric value used by stream
 * rate, duration, and deposit calculations.
 */
function parseStreamNumber(value: string): number {
  return parseFloat(value.replace(/,/g, ""));
}

/**
 * Calculates the total USDC deposit required for a daily stream rate across the
 * entered duration in days.
 */
function calculateRequiredDeposit(
  dailyRate: string,
  durationDays: string,
): string {
  return (
    parseStreamNumber(dailyRate || "0") * parseStreamNumber(durationDays || "0")
  ).toFixed(2);
}

/**
 * Formats a validated deposit amount for the review step without substituting
 * fabricated placeholder values.
 */
function formatReviewDeposit(value: string): string {
  return parseStreamNumber(value).toFixed(2);
}

/** Formats the daily duration unit with singular/plural copy. */
function formatDurationUnit(value: string, t: any): string {
  const count = parseStreamNumber(value);
  return count === 1 ? t("createStream.duration.day_one") : t("createStream.duration.day_other", { count });
}

function validateAccrualRate(value: string, t: any): string | undefined {
  const numericValue = parseFloat(value);

  if (!value.trim() || isNaN(numericValue) || numericValue <= 0) {
    return t("createStream.validation.ratePositive");
  }

  if (numericValue > MAX_ACCRUAL_RATE) {
    return t("createStream.validation.rateMax", { max: MAX_ACCRUAL_RATE.toLocaleString() });
  }

  return undefined;
}

function validateDuration(value: string, t: any): string | undefined {
  const numericValue = parseFloat(value);

  if (!value.trim() || isNaN(numericValue) || numericValue <= 0) {
    return t("createStream.validation.durationPositive");
  }

  if (numericValue < MIN_DURATION_DAYS) {
    return t("createStream.validation.durationMin", { min: MIN_DURATION_DAYS });
  }

  if (numericValue > MAX_DURATION_DAYS) {
    return t("createStream.validation.durationMax", { max: MAX_DURATION_DAYS.toLocaleString() });
  }

  return undefined;
}

interface CreateStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when user completes the flow and clicks "Create stream" on step 3. Use to show success modal. */
  onStreamCreated?: () => void | Promise<void>;
  /** Called when stream creation fails after the user confirms the review step. */
  onStreamError?: (err: unknown) => void;
}

export default function CreateStreamModal({
  isOpen,
  onClose,
  onStreamCreated,
  onStreamError,
}: CreateStreamModalProps) {
  const wallet = useWallet();
  const { addToast } = useToast();
  const { t } = useI18n();

  const [recipient, setRecipient] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [accrualRate, setAccrualRate] = useState("38.62");
  const [duration, setDuration] = useState("1");
  const [startTimeOption, setStartTimeOption] = useState<"now" | "custom">(
    "now",
  );
  const [customStartDate, setCustomStartDate] = useState("");
  const [cliffEnabled, setCliffEnabled] = useState(false);
  const [cliffDate, setCliffDate] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTxHash, setSubmittedTxHash] = useState<string | null>(null);
  const [hasCompletedConfirmation, setHasCompletedConfirmation] =
    useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const recipientInputRef = useRef<HTMLInputElement>(null);
  const submitInFlightRef = useRef(false);

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };
  const userDeposit = 200.0;
  const accrualRateValue = parseFloat(accrualRate || "0");
  const durationValue = parseFloat(duration || "0");
  const requiredDepositValue = accrualRateValue * durationValue;
  const requiredDeposit = calculateRequiredDeposit(accrualRate, duration);
  const transactionStatus = useTransactionStatus(submittedTxHash, {
    enabled: currentStep === 3 && Boolean(submittedTxHash),
    getStatus: getTransactionStatus,
  });
  const isConfirmationPending = transactionStatus.status === "pending";
  const isBusyCreating = isSubmitting || isConfirmationPending;
  const submitButtonLabel =
    currentStep === 3 && isSubmitting
      ? t("createStream.button.submitting")
      : currentStep === 3 && isConfirmationPending
        ? t("createStream.button.confirming")
        : currentStep === 3 && transactionStatus.status === "failed"
          ? t("createStream.button.retry")
          : currentStep === 2
            ? t("createStream.button.next")
            : t("createStream.button.create");

  useModalAccessibility({
    isOpen,
    onClose,
    modalRef,
    initialFocusRef: recipientInputRef,
  });

  useEffect(() => {
    if (
      transactionStatus.status !== "confirmed" ||
      hasCompletedConfirmation
    ) {
      return;
    }

    setHasCompletedConfirmation(true);
    addToast(t("createStream.success.message"), "success");
    onStreamCreated?.();
    onClose();
  }, [
    addToast,
    hasCompletedConfirmation,
    onClose,
    onStreamCreated,
    transactionStatus.status,
    t,
  ]);

  const resetTransactionState = () => {
    transactionStatus.reset();
    setSubmittedTxHash(null);
    setHasCompletedConfirmation(false);
  };

  const validateStep1 = (): boolean => {
    if (!recipient.trim()) {
      setError(t("createStream.validation.recipientRequired"));
      return false;
    }
    const normalizedRecipient = recipient.trim();

    /**
     * Self-send rule: Reject streams where the recipient equals the connected wallet address.
     * This prevents users from wasting a deposit on a no-op transfer to themselves.
     */
    if (wallet.connected && wallet.address && normalizedRecipient.toLowerCase() === wallet.address.toLowerCase()) {
      setError("Recipient cannot be the same as the connected wallet address.");
      return false;
    }

    if (!isValidStellarAddress(normalizedRecipient)) {
      setError(
        t("createStream.validation.recipientInvalid"),
      );
      return false;
    }
    const amount = parseFloat(depositAmount.replace(/,/g, ""));
    if (!depositAmount.trim() || isNaN(amount) || amount <= 0) {
      setError(t("createStream.validation.depositPositive"));
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = (): boolean => {
    // Mark all active step-2 fields as touched
    const touchedFields: Record<string, boolean> = {
      accrualRate: true,
      duration: true,
    };
    if (startTimeOption === 'custom') {
      touchedFields.customStartDate = true;
    }
    if (cliffEnabled) {
      touchedFields.cliffDate = true;
    }
    setTouched(prev => ({ ...prev, ...touchedFields }));

    if (validateAccrualRate(accrualRate, t)) {
      return false;
    }
    if (validateDuration(duration, t)) {
      return false;
    }
    if (
      !Number.isFinite(requiredDepositValue) ||
      requiredDepositValue > MAX_REQUIRED_DEPOSIT
    ) {
      return false;
    }
    // Validate deposit balance
    if (parseFloat(requiredDeposit) > userDeposit) {
      return false;
    }
    // Validate custom start date
    if (startTimeOption === 'custom') {
      if (!customStartDate) {
        return false;
      }
      if (isDateTimeInPast(customStartDate)) {
        return false;
      }
    }
    // Validate cliff date
    if (cliffEnabled) {
      if (!cliffDate) {
        return false;
      }
      if (isDateTimeInPast(cliffDate)) {
        return false;
      }
      if (startTimeOption === 'custom' && customStartDate) {
        if (isBeforeLocalDateTime(cliffDate, customStartDate)) {
          return false;
        }
      }
      // Cross-field: cliff must not exceed stream end date
      const selectedCliffDate = new Date(cliffDate);
      const startMs = startTimeOption === 'custom' && customStartDate
        ? new Date(customStartDate).getTime()
        : Date.now();
      const endDate = computeStreamEndDate(new Date(startMs), parseFloat(duration));
      if (endDate && validateCliffBeforeEnd(selectedCliffDate, endDate) !== null) {
        return false;
      }
    }
    return true;
  };

  const getStreamErrorMessage = (err: unknown): string => {
    if (err instanceof Error && err.message.trim()) {
      return err.message;
    }
    return t("createStream.error.generic");
  };

  const handleNext = async () => {
    if (isBusyCreating) return;

    if (currentStep === 1) {
      setTouched(prev => ({ ...prev, recipient: true, depositAmount: true }));
      if (!validateStep1()) return;
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      if (!validateStep2()) return;
      resetTransactionState();
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (submitInFlightRef.current) return;

      if (!wallet.connected) {
        setError(t("createStream.validation.walletNotConnected"));
        return;
      }
      if (wallet.isNetworkMismatch) {
        setError(t("createStream.validation.networkMismatch", {
          expected: wallet.expectedNetwork,
          actual: wallet.network?.toUpperCase() || "",
        }));
        return;
      }

      setError(null);
      setStreamError(null);
      resetTransactionState();
      submitInFlightRef.current = true;
      setIsSubmitting(true);

      const sender = wallet.address!;
      const parsedAmount = parseFloat(depositAmount.replace(/,/g, "")) || 0;
      const amountStr = Math.floor(parsedAmount * 10_000_000).toString();

      const start = startTimeOption === "now"
        ? Math.floor(Date.now() / 1000)
        : Math.floor(new Date(customStartDate).getTime() / 1000);

      const durationDays = parseFloat(duration) || 0;
      const durationSeconds = Math.floor(durationDays * 24 * 60 * 60);
      const end = start + durationSeconds;

      const cliffTime = cliffEnabled && cliffDate
        ? Math.floor(new Date(cliffDate).getTime() / 1000)
        : undefined;

      try {
        const response = await createStream(
          sender,
          recipient.trim(),
          amountStr,
          start,
          end,
          cliffTime,
        );
        if (!response.txHash) {
          throw new Error("Missing transaction hash from Stellar RPC.");
        }
        // Hand off to the confirmation poller; the success toast,
        // onStreamCreated, and onClose fire once polling reports `confirmed`.
        setSubmittedTxHash(response.txHash);
      } catch (err) {
        const message = getStreamErrorMessage(err);
        setStreamError(message);
        addToast(t("createStream.error.failedWithMessage", { message }), "error");
        onStreamError?.(err);
      } finally {
        submitInFlightRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (isBusyCreating) return;

    if (currentStep === 3) {
      resetTransactionState();
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(1);
    } else {
      onClose();
    }
  };

  const handleCancel = () => {
    if (isBusyCreating) return;
    onClose();
  };

  const handleClose = () => {
    if (isBusyCreating) return;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay create-stream-overlay" onClick={handleClose}>
      <div
        className="modal-content create-stream-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-stream-title"
        aria-describedby="create-stream-description"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="create-stream-title">{t("createStream.title")}</h2>
            <p id="create-stream-description" className="modal-description">
              {t("createStream.description")}
            </p>
          </div>
          <button
            type="button"
            className="close-button"
            onClick={handleClose}
            disabled={isBusyCreating}
            aria-label={t("createStream.accessibility.closeLabel")}
          >
            <svg
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Progress: Step 1 Recipient & amount, Step 2 Rate & schedule, Step 3 Review & create */}
        <div className="progress-tracker">
          <div className="progress-line">
            <div
              className="progress-line-fill"
              style={{
                width:
                  currentStep === 1 ? "0%" : currentStep === 2 ? "50%" : "100%",
              }}
            />
          </div>
          <div className={`step-item ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}>
            <div className="step-circle">{currentStep > 1 ? (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : '1'}</div>
            <div className="step-label">
              {(() => {
                const [p1, p2] = t("createStream.steps.recipientAmount").split(" & ");
                return <>{p1} &<br />{p2}</>;
              })()}
            </div>
          </div>
          <div className={`step-item ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}>
            <div className="step-circle">{currentStep > 2 ? (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : '2'}</div>
            <div className="step-label">
              {(() => {
                const [p1, p2] = t("createStream.steps.rateSchedule").split(" & ");
                return <>{p1} &<br />{p2}</>;
              })()}
            </div>
          </div>
          <div className={`step-item ${currentStep === 3 ? 'active' : ''}`}>
            <div className="step-circle">3</div>
            <div className="step-label">
              {(() => {
                const [p1, p2] = t("createStream.steps.reviewCreate").split(" & ");
                return <>{p1} &<br />{p2}</>;
              })()}
            </div>
          </div>
        </div>

        <div className="modal-body-scroll">
          {error && (
            <div className="validation-message validation-message--error" style={{ margin: '1rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255, 107, 107, 0.15)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-danger)' }} role="alert">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <circle cx="6" cy="6" r="5.5" stroke="currentColor" />
                <path d="M6 3.5V6.5" stroke="currentColor" strokeLinecap="round" />
                <circle cx="6" cy="8.5" r="0.5" fill="currentColor" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          {currentStep === 1 && (
          <>
            <hr className="divider" />
            <div className="section-header">
              <h3>{t("createStream.step1.header")}</h3>
              <p>{t("createStream.step1.subheader")}</p>
            </div>
            {(() => {
              // Derived per-field validation state (not stored, computed inline)
              const recipientError = touched.recipient
                ? (!recipient.trim()
                    ? t("createStream.validation.recipientRequired")
                    : (wallet.connected && wallet.address && recipient.trim().toLowerCase() === wallet.address.toLowerCase())
                    ? 'Recipient cannot be the same as the connected wallet address.'
                    : !isValidStellarAddress(recipient.trim())
                    ? t("createStream.validation.recipientInvalid")
                    : undefined)
                : undefined;
              const recipientSuccess = touched.recipient && !recipientError && recipient.trim().length > 0;

              const depositAmountNum = parseFloat(depositAmount.replace(/,/g, ''));
              const depositError = touched.depositAmount
                ? (!depositAmount.trim() || isNaN(depositAmountNum) || depositAmountNum <= 0
                    ? t("createStream.validation.depositPositive")
                    : undefined)
                : undefined;
              const depositSuccess = touched.depositAmount && !depositError && depositAmount.trim().length > 0;

              return (
                <>
                  <InputField
                    id="create-stream-recipient"
                    label={t("createStream.step1.recipientLabel")}
                    required
                    error={recipientError}
                    helperText={t("createStream.step1.recipientHelper")}
                    success={recipientSuccess}
                  >
                    <input
                      ref={recipientInputRef}
                      type="text"
                      className="input-field"
                      value={recipient}
                      onChange={(e) => {
                        setRecipient(e.target.value);
                        if (error) setError(null);
                      }}
                      onBlur={() => handleBlur('recipient')}
                      placeholder={t("createStream.step1.recipientPlaceholder")}
                      autoComplete="off"
                    />
                  </InputField>

                  <InputField
                    id="create-stream-deposit"
                    label={t("createStream.step1.depositLabel")}
                    required
                    error={depositError}
                    helperText={t("createStream.step1.depositHelper")}
                    success={depositSuccess}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      className="input-field"
                      value={depositAmount}
                      onChange={(e) => {
                        const v = sanitizeDepositAmountInput(e.target.value);
                        setDepositAmount(v);
                        if (error) setError(null);
                      }}
                      onBlur={() => handleBlur('depositAmount')}
                      placeholder={t("createStream.step1.depositPlaceholder")}
                    />
                  </InputField>
                </>
              );
            })()}
            <div className="info-box" role="region" aria-labelledby="info-box-title">
              <div id="info-box-title" className="info-box-title">{t("createStream.step1.infoBoxTitle")}</div>
              <p className="info-box-text">
                {t("createStream.step1.infoBoxText")}
              </p>
            </div>
          </>
        )}
        {currentStep === 2 && (() => {
          // Derived per-field validation state for step 2
          const accrualRateError = touched.accrualRate
            ? validateAccrualRate(accrualRate, t)
            : undefined;
          const accrualRateSuccess = touched.accrualRate && !accrualRateError && accrualRate.trim().length > 0;

          const durationError = touched.duration
            ? validateDuration(duration, t)
            : undefined;
          const durationSuccess = touched.duration && !durationError && duration.trim().length > 0;

          const customStartDateError = (startTimeOption === 'custom' && touched.customStartDate)
            ? (!customStartDate
                ? t("createStream.validation.startDateRequired")
                : isDateTimeInPast(customStartDate)
                ? t("createStream.validation.startDateFuture")
                : undefined)
            : undefined;
          const customStartDateSuccess = startTimeOption === 'custom' && touched.customStartDate && !customStartDateError && Boolean(customStartDate);

          const cliffDateError = (cliffEnabled && touched.cliffDate)
            ? (!cliffDate
                ? t("createStream.validation.cliffDateRequired")
                : isDateTimeInPast(cliffDate)
                ? t("createStream.validation.cliffDatePast")
                : (startTimeOption === 'custom' && customStartDate && isBeforeLocalDateTime(cliffDate, customStartDate))
                ? t("createStream.validation.cliffDateAfterStart")
                : (() => {
                    // Cross-field: cliff must be on or before the stream end date.
                    const startMs = startTimeOption === 'custom' && customStartDate
                      ? new Date(customStartDate).getTime()
                      : Date.now();
                    const endDate = computeStreamEndDate(new Date(startMs), parseFloat(duration));
                    if (endDate) {
                      const msg = validateCliffBeforeEnd(new Date(cliffDate), endDate);
                      if (msg) return msg;
                    }
                    return undefined;
                  })())
            : undefined;
          const cliffDateSuccess = cliffEnabled && touched.cliffDate && !cliffDateError && Boolean(cliffDate);

          return (
          <>
            <hr className="divider" />

            <div className="section-header">
              <h3>{t("createStream.step2.header")}</h3>
              <p>{t("createStream.step2.subheader")}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {t("createStream.step2.timezoneNote")}
              </p>
            </div>

            {/* Stream Rate */}
            <div className="form-group">
              <label htmlFor="create-stream-accrual-rate" className="form-label">
                {t("createStream.step2.rateLabel")}
                {<span className="required" aria-hidden="true"> *</span>}
                <InfoTooltip
                  id="stream-rate-tooltip"
                  title={t("createStream.step2.rateTooltipTitle")}
                  ariaLabel={t("createStream.step2.rateTooltipAria")}
                  content={
                    <>
                      <p>
                        {t("createStream.step2.rateTooltipBody1")}
                      </p>
                      <p style={{ marginTop: '8px', fontWeight: 500 }}>
                        {t("createStream.step2.rateTooltipBody2")}
                      </p>
                    </>
                  }
                />
              </label>
              <div className={`input-container ${accrualRateError ? 'input-container--error' : accrualRateSuccess ? 'input-container--success' : ''}`.trim()}>
                <InputWithUnit
                  id="create-stream-accrual-rate"
                  unit="USDC / day"
                  type="text"
                  inputMode="decimal"
                  value={accrualRate}
                  onChange={(e) => setAccrualRate(e.target.value)}
                  onBlur={() => handleBlur('accrualRate')}
                  placeholder="0.00"
                  hasError={Boolean(accrualRateError)}
                  aria-required="true"
                  aria-invalid={Boolean(accrualRateError)}
                  aria-describedby={accrualRateError ? 'create-stream-accrual-rate-error' : 'create-stream-accrual-rate-hint'}
                />
              </div>
              {accrualRateError && (
                <span id="create-stream-accrual-rate-error" className="validation-message validation-message--error" role="alert">
                  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                    <circle cx="6" cy="6" r="5.5" stroke="currentColor" />
                    <path d="M6 3.5V6.5" stroke="currentColor" strokeLinecap="round" />
                    <circle cx="6" cy="8.5" r="0.5" fill="currentColor" />
                  </svg>
                  {accrualRateError}
                </span>
              )}
              {!accrualRateError && (
                <span id="create-stream-accrual-rate-hint" className="validation-message validation-message--hint" role="status">
                  {t("createStream.step2.rateHint")}
                </span>
              )}
            </div>

            {/* Stream Duration */}
            <div className="form-group">
              <label htmlFor="create-stream-duration" className="form-label">
                {t("createStream.step2.durationLabel")}
                {<span className="required" aria-hidden="true"> *</span>}
                <InfoTooltip
                  id="stream-duration-tooltip"
                  title={t("createStream.step2.durationTooltipTitle")}
                  ariaLabel={t("createStream.step2.durationTooltipAria")}
                  content={
                    <>
                      <p>
                        {t("createStream.step2.durationTooltipBody1")}
                      </p>
                      <p style={{ marginTop: '8px' }}>
                        {t("createStream.step2.durationTooltipBody2")}
                      </p>
                    </>
                  }
                />
              </label>
              <div className={`input-container ${durationError ? 'input-container--error' : durationSuccess ? 'input-container--success' : ''}`.trim()}>
                <InputWithUnit
                  id="create-stream-duration"
                  unit="days"
                  type="text"
                  inputMode="decimal"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  onBlur={() => handleBlur('duration')}
                  placeholder="1"
                  hasError={Boolean(durationError)}
                  aria-required="true"
                  aria-invalid={Boolean(durationError)}
                  aria-describedby={durationError ? 'create-stream-duration-error' : 'create-stream-duration-hint'}
                />
              </div>
              {durationError && (
                <span id="create-stream-duration-error" className="validation-message validation-message--error" role="alert">
                  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                    <circle cx="6" cy="6" r="5.5" stroke="currentColor" />
                    <path d="M6 3.5V6.5" stroke="currentColor" strokeLinecap="round" />
                    <circle cx="6" cy="8.5" r="0.5" fill="currentColor" />
                  </svg>
                  {durationError}
                </span>
              )}
              {!durationError && (
                <span id="create-stream-duration-hint" className="validation-message validation-message--hint" role="status">
                  {t("createStream.step2.durationHint")}
                </span>
              )}
            </div>

            {/* Start Time */}
            <div className="form-group">
              <label className="form-label">{t("createStream.step2.startTimeLabel")}</label>
              <div className="segmented-control">
                <button
                  className={`segment-btn ${startTimeOption === 'now' ? 'active' : ''}`}
                  onClick={() => setStartTimeOption('now')}
                >
                  {t("createStream.step2.startNowBtn")}
                </button>
                <button
                  className={`segment-btn ${startTimeOption === 'custom' ? 'active' : ''}`}
                  onClick={() => setStartTimeOption('custom')}
                >
                  {t("createStream.step2.customDateBtn")}
                </button>
              </div>
              {startTimeOption === 'custom' && (
                <div style={{ marginTop: '0.75rem' }}>
                  <InputField
                    id="create-stream-custom-start-date"
                    label={t("createStream.step2.customStartDateLabel")}
                    required
                    error={customStartDateError}
                    helperText={t("createStream.step2.customStartDateHelper")}
                    success={customStartDateSuccess}
                  >
                    <input
                      type="datetime-local"
                      className="input-field"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      onBlur={() => handleBlur('customStartDate')}
                    />
                  </InputField>
                </div>
              )}
            </div>

            {/* Cliff Period */}
            <div className="form-group">
              <label className="form-label">
                {t("createStream.step2.cliffPeriodLabel")}{' '}
                <span style={{ color: 'var(--muted)', fontWeight: 'normal' }}>{t("createStream.step2.optionalLabel")}</span>
                <InfoTooltip
                  id="cliff-tooltip"
                  title={t("createStream.step2.cliffTooltipTitle")}
                  ariaLabel={t("createStream.step2.cliffTooltipAria")}
                  content={
                    <>
                      <p>
                        {t("createStream.step2.cliffTooltipBody1")}
                      </p>
                      <ul style={{ marginTop: '4px', marginLeft: '16px', listStyle: 'disc' }}>
                        <li>{t("createStream.step2.cliffTooltipList1")}</li>
                        <li>{t("createStream.step2.cliffTooltipList2")}</li>
                        <li>{t("createStream.step2.cliffTooltipList3")}</li>
                      </ul>
                      <p style={{ marginTop: '8px' }}>
                        {t("createStream.step2.cliffTooltipBody2")}
                      </p>
                      <p style={{ marginTop: '8px' }}>
                        {t("createStream.step2.cliffTooltipBody3")}
                      </p>
                    </>
                  }
                />
              </label>
              <div className="toggle-container" onClick={() => setCliffEnabled(!cliffEnabled)}>
                <div className={`toggle-switch ${cliffEnabled ? 'on' : ''}`}>
                  <div className="toggle-knob" />
                </div>
                <span>{t("createStream.step2.enableCliffLabel")}</span>
              </div>
              {cliffEnabled && (
                <div style={{ marginTop: '0.75rem' }}>
                  <InputField
                    id="create-stream-cliff-date"
                    label={t("createStream.step2.cliffDateLabel")}
                    required
                    error={cliffDateError}
                    helperText={t("createStream.step2.cliffDateHelper")}
                    success={cliffDateSuccess}
                  >
                    <input
                      type="datetime-local"
                      className="input-field"
                      value={cliffDate}
                      onChange={(e) => setCliffDate(e.target.value)}
                      onBlur={() => handleBlur('cliffDate')}
                    />
                  </InputField>
                </div>
              )}
            </div>

            {/* Deposit Summary */}
            <div className="deposit-summary">
              <div className="deposit-box">
                <div className="deposit-label">{t("createStream.step2.requiredDepositLabel")}</div>
                <div className={`deposit-value ${parseFloat(requiredDeposit) > userDeposit ? 'required' : ''}`}>
                  {requiredDeposit} USDC
                </div>
              </div>
              <div className="deposit-box">
                <div className="deposit-label">{t("createStream.step2.yourDepositLabel")}</div>
                <div className="deposit-value">{userDeposit.toFixed(2)} USDC</div>
              </div>
            </div>
          </>
          );
        })()}

          {currentStep === 3 &&
            (() => {
              const reviewRecipient = recipient.trim();
              const reviewDeposit = formatReviewDeposit(depositAmount);
              const durationUnit = formatDurationUnit(duration, t);
              return (
                <>
                  <hr className="divider" />
                  <div className="review-cards">
                    {/* Recipient card */}
                    <div className="review-card review-card-vertical">
                      <div className="review-card-header">
                        <span className="review-card-icon" aria-hidden="true">
                          <svg
                            width="20"
                            height="20"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </span>
                        <div className="review-card-title">{t("createStream.step3.recipientCardTitle")}</div>
                        <button
                          type="button"
                          className="review-card-edit"
                          onClick={() => {
                            resetTransactionState();
                            setCurrentStep(1);
                          }}
                          disabled={isBusyCreating}
                          aria-label={t("createStream.step3.editRecipientAria")}
                        >
                          {t("createStream.step3.editBtn")}
                          <svg
                            width="14"
                            height="14"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="review-card-content">
                        <div className="review-card-sublabel">{t("createStream.step3.addressLabel")}</div>
                        <div className="review-card-value">
                          {maskAddress(reviewRecipient)}
                        </div>
                      </div>
                    </div>

                    {/* Deposit card */}
                    <div className="review-card review-card-vertical">
                      <div className="review-card-header">
                        <span className="review-card-icon" aria-hidden="true">
                          <svg
                            width="20"
                            height="20"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </span>
                        <div className="review-card-title">{t("createStream.step3.depositCardTitle")}</div>
                        <button
                          type="button"
                          className="review-card-edit"
                          onClick={() => {
                            resetTransactionState();
                            setCurrentStep(1);
                          }}
                          disabled={isBusyCreating}
                          aria-label={t("createStream.step3.editDepositAria")}
                        >
                          {t("createStream.step3.editBtn")}
                          <svg
                            width="14"
                            height="14"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="review-card-content">
                        <div className="review-card-amount">
                          {reviewDeposit}{" "}
                          <span className="review-card-unit">USDC</span>
                        </div>
                      </div>
                    </div>

                    {/* Rate & schedule card */}
                    <div className="review-card review-card-schedule-card">
                      <div className="review-card-schedule-header">
                        <span className="review-card-icon" aria-hidden="true">
                          <svg
                            width="20"
                            height="20"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                            />
                          </svg>
                        </span>
                        <div className="review-card-title">{t("createStream.step3.rateScheduleCardTitle")}</div>
                        <button
                          type="button"
                          className="review-card-edit"
                          onClick={() => {
                            resetTransactionState();
                            setCurrentStep(2);
                          }}
                          disabled={isBusyCreating}
                          aria-label={t("createStream.step3.editRateScheduleAria")}
                        >
                          {t("createStream.step3.editBtn")}
                          <svg
                            width="14"
                            height="14"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="review-card-rows">
                        <div className="review-card-row">
                          <span
                            className="review-card-row-icon"
                            aria-hidden="true"
                          >
                            <svg
                              width="14"
                              height="14"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                              />
                            </svg>
                          </span>
                          <span className="review-card-row-label">{t("createStream.step3.rateLabel")}</span>
                          <span className="review-card-row-value">
                            {t("createStream.step3.rateValue", { accrualRate })}
                          </span>
                        </div>
                        <div className="review-card-row">
                          <span
                            className="review-card-row-icon"
                            aria-hidden="true"
                          >
                            <svg
                              width="14"
                              height="14"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </span>
                          <span className="review-card-row-label">
                            {t("createStream.step3.durationLabel")}
                          </span>
                          <span className="review-card-row-value">
                            {t("createStream.step3.durationValue", { duration, unit: durationUnit })}
                          </span>
                        </div>
                        <div className="review-card-row">
                          <span
                            className="review-card-row-icon"
                            aria-hidden="true"
                          >
                            <svg
                              width="14"
                              height="14"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </span>
                          <span className="review-card-row-label">{t("createStream.step3.startLabel")}</span>
                          <span className="review-card-row-value">
                            {startTimeOption === "now"
                              ? t("createStream.step3.startImmediately")
                              : customStartDate
                                ? formatLocalDateTime(customStartDate)
                                : "—"}
                          </span>
                        </div>
                        <div className="review-card-row">
                          <span
                            className="review-card-row-icon"
                            aria-hidden="true"
                          >
                            <svg
                              width="14"
                              height="14"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <circle cx="12" cy="12" r="10" />
                              <path strokeLinecap="round" d="M12 6v6" />
                            </svg>
                          </span>
                          <span className="review-card-row-label">{t("createStream.step3.cliffLabel")}</span>
                          <span className="review-card-row-value">
                            {cliffEnabled && cliffDate
                              ? formatLocalDateTime(cliffDate)
                              : t("createStream.step3.cliffNotSet")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {streamError && (
                    <div className="review-error-box" role="alert">
                      <div>
                        <strong>{t("createStream.step3.errorTitle")}</strong>
                        <p>{streamError}</p>
                      </div>
                      <button
                        type="button"
                        className="review-error-retry"
                        onClick={handleNext}
                        disabled={isSubmitting}
                      >
                        {t("createStream.step3.tryAgainBtn")}
                      </button>
                    </div>
                  )}

                  <div
                    className="review-warning-box"
                    role="region"
                    aria-live="polite"
                  >
                    <strong>{t("createStream.step3.warningTitle")}</strong>{" "}
                    {t("createStream.step3.warningText", { reviewDeposit })}
                  </div>
                  {isSubmitting && (
                    <div
                      className="transaction-status-box"
                      role="status"
                      aria-live="polite"
                    >
                      {t("createStream.step3.statusSubmitting")}
                    </div>
                  )}
                  {!isSubmitting && transactionStatus.status === "pending" && (
                    <div
                      className="transaction-status-box"
                      role="status"
                      aria-live="polite"
                    >
                      {t("createStream.step3.statusWaiting")}
                      <span className="transaction-status-detail">
                        {t("createStream.step3.statusDetail", {
                          attempts: transactionStatus.attempts,
                          txHash: submittedTxHash
                            ? `${submittedTxHash.slice(0, 10)}...${submittedTxHash.slice(-8)}`
                            : "",
                        })}
                      </span>
                    </div>
                  )}
                  {transactionStatus.status === "failed" && (
                    <div
                      className="transaction-status-box transaction-status-box--error"
                      role="alert"
                    >
                      {transactionStatus.error ??
                        t("createStream.step3.statusFailed", {
                          error: "Transaction confirmation failed. Please retry.",
                        })}
                    </div>
                  )}
                </>
              );
            })()}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {currentStep === 1 ? (
            <>
              <button
                type="button"
                className="btn btn-cancel"
                onClick={handleCancel}
                disabled={isBusyCreating}
              >
                {t("createStream.button.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-next"
                onClick={handleNext}
                disabled={isBusyCreating}
              >
                {t("createStream.button.next")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-back"
                onClick={handleBack}
                disabled={isBusyCreating}
              >
                {t("createStream.button.back")}
              </button>
              <button
                type="button"
                className="btn btn-next"
                onClick={handleNext}
                disabled={isBusyCreating}
                aria-busy={isBusyCreating && currentStep === 3}
              >
                {submitButtonLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
