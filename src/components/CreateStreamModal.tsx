import { useState, useRef } from 'react';
import './CreateStreamModal.css';
import { InputField } from './InputField';
import { InputWithUnit } from './InputWithUnit';
import { InfoTooltip } from './InfoTooltip';
import { useModalAccessibility } from './useModalAccessibility';
import { useWallet } from './wallet-connect/Walletcontext';
import { useToast } from './toast/ToastProvider';
import { createStream } from '../lib/stellar/tx';

function maskAddress(addr: string): string {
  const t = addr.trim();
  if (t.length <= 12) return t || "—";
  return `${t.slice(0, 6)} . . . ${t.slice(-6)}`;
}

/** Stellar public key: starts with G, 56 chars, base32 (no 0,1,8,9). */
function isValidStellarAddress(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length !== 56) return false;
  if (trimmed[0] !== "G") return false;
  return /^G[ABCDEFGHJKLMNPQRSTUVWXYZ234567]{55}$/.test(trimmed);
}

interface CreateStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when user completes the flow and clicks "Create stream" on step 3. Use to show success modal. */
  onStreamCreated?: () => void;
}

export default function CreateStreamModal({
  isOpen,
  onClose,
  onStreamCreated,
}: CreateStreamModalProps) {
  const wallet = useWallet();
  const { addToast } = useToast();

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
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const modalRef = useRef<HTMLDivElement>(null);
  const recipientInputRef = useRef<HTMLInputElement>(null);

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const userDeposit = 200.0;
  const requiredDeposit = (
    parseFloat(accrualRate || "0") * parseFloat(duration || "0")
  ).toFixed(2);

  useModalAccessibility({
    isOpen,
    onClose,
    modalRef,
    initialFocusRef: recipientInputRef,
  });

  const validateStep1 = (): boolean => {
    if (!recipient.trim()) {
      setError("Recipient is required.");
      return false;
    }
    if (!isValidStellarAddress(recipient.trim())) {
      setError(
        "Please enter a valid Stellar address (starts with G, 56 characters).",
      );
      return false;
    }
    const amount = parseFloat(depositAmount.replace(/,/g, ""));
    if (!depositAmount.trim() || isNaN(amount) || amount <= 0) {
      setError("Deposit amount must be a positive number.");
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

    // Validate accrual rate
    if (!accrualRate || parseFloat(accrualRate) <= 0) {
      return false;
    }
    // Validate duration
    if (!duration || parseFloat(duration) <= 0) {
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
      const selectedDate = new Date(customStartDate);
      if (selectedDate < new Date()) {
        return false;
      }
    }
    // Validate cliff date
    if (cliffEnabled) {
      if (!cliffDate) {
        return false;
      }
      const selectedCliffDate = new Date(cliffDate);
      if (selectedCliffDate < new Date(new Date().setHours(0, 0, 0, 0))) {
        return false;
      }
      if (startTimeOption === 'custom' && customStartDate) {
        if (selectedCliffDate < new Date(customStartDate)) {
          return false;
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      setTouched(prev => ({ ...prev, recipient: true, depositAmount: true }));
      if (!validateStep1()) return;
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      if (!validateStep2()) return;
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!wallet.connected) {
        setError("Please connect your wallet first.");
        return;
      }
      const expectedNet = import.meta.env.VITE_NETWORK || "TESTNET";
      if (wallet.network?.toUpperCase() !== expectedNet.toUpperCase()) {
        setError(`Wrong Stellar network. Expected ${expectedNet.toUpperCase()}, but wallet is connected to ${wallet.network?.toUpperCase()}. Please switch network in Freighter.`);
        return;
      }

      setError(null);
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

      createStream(sender, recipient.trim(), amountStr, start, end)
        .then(() => {
          addToast("Stream created successfully on-chain!", "success");
          onStreamCreated?.();
          onClose();
        })
        .catch((err: any) => {
          setError(err.message || "Failed to create stream.");
          addToast(`Failed to create stream: ${err.message || err}`, "error");
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  };

  const handleBack = () => {
    if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(1);
    } else {
      onClose();
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay create-stream-overlay" onClick={onClose}>
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
            <h2 id="create-stream-title">Create stream</h2>
            <p id="create-stream-description" className="modal-description">
              Set the recipient, funding, and schedule details for a new Stellar
              stream.
            </p>
          </div>
          <button
            type="button"
            className="close-button"
            onClick={onClose}
            aria-label="Close create stream modal"
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
            <div className="step-label">Recipient &<br />amount</div>
          </div>
          <div className={`step-item ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}>
            <div className="step-circle">{currentStep > 2 ? (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : '2'}</div>
            <div className="step-label">Rate &<br />schedule</div>
          </div>
          <div className={`step-item ${currentStep === 3 ? 'active' : ''}`}>
            <div className="step-circle">3</div>
            <div className="step-label">Review &<br />create</div>
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
              <h3>Recipient & amount</h3>
              <p>Set who receives the stream and how much USDC to lock.</p>
            </div>
            {(() => {
              // Derived per-field validation state (not stored, computed inline)
              const recipientError = touched.recipient
                ? (!recipient.trim()
                    ? 'Recipient is required.'
                    : !isValidStellarAddress(recipient.trim())
                    ? 'Please enter a valid Stellar address (starts with G, 56 characters).'
                    : undefined)
                : undefined;
              const recipientSuccess = touched.recipient && !recipientError && recipient.trim().length > 0;

              const depositAmountNum = parseFloat(depositAmount.replace(/,/g, ''));
              const depositError = touched.depositAmount
                ? (!depositAmount.trim() || isNaN(depositAmountNum) || depositAmountNum <= 0
                    ? 'Deposit amount must be a positive number.'
                    : undefined)
                : undefined;
              const depositSuccess = touched.depositAmount && !depositError && depositAmount.trim().length > 0;

              return (
                <>
                  <InputField
                    id="create-stream-recipient"
                    label="Recipient"
                    required
                    error={recipientError}
                    helperText="Enter a valid Stellar address (starts with G, 56 characters)"
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
                      placeholder="Paste Stellar address (G...)"
                      autoComplete="off"
                    />
                  </InputField>

                  <InputField
                    id="create-stream-deposit"
                    label="Deposit amount"
                    required
                    error={depositError}
                    helperText="Enter the total USDC amount to deposit into the stream"
                    success={depositSuccess}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      className="input-field"
                      value={depositAmount}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9.]/g, '');
                        setDepositAmount(v);
                        if (error) setError(null);
                      }}
                      onBlur={() => handleBlur('depositAmount')}
                      placeholder="$ 0.00 USDC"
                    />
                  </InputField>
                </>
              );
            })()}
            <div className="info-box" role="region" aria-labelledby="info-box-title">
              <div id="info-box-title" className="info-box-title">Smart contract lock:</div>
              <p className="info-box-text">
                Your USDC will be locked in a Soroban smart contract. The recipient can withdraw their accrued portion at any time.
              </p>
            </div>
          </>
        )}
        {currentStep === 2 && (() => {
          // Derived per-field validation state for step 2
          const accrualRateNum = parseFloat(accrualRate);
          const accrualRateError = touched.accrualRate
            ? (!accrualRate.trim() || isNaN(accrualRateNum) || accrualRateNum <= 0
                ? 'Stream rate must be a positive number.'
                : undefined)
            : undefined;
          const accrualRateSuccess = touched.accrualRate && !accrualRateError && accrualRate.trim().length > 0;

          const durationNum = parseFloat(duration);
          const durationError = touched.duration
            ? (!duration.trim() || isNaN(durationNum) || durationNum <= 0
                ? 'Duration must be a positive number.'
                : undefined)
            : undefined;
          const durationSuccess = touched.duration && !durationError && duration.trim().length > 0;

          const customStartDateError = (startTimeOption === 'custom' && touched.customStartDate)
            ? (!customStartDate
                ? 'Custom start date is required.'
                : new Date(customStartDate) < new Date()
                ? 'Start date must be in the future.'
                : undefined)
            : undefined;
          const customStartDateSuccess = startTimeOption === 'custom' && touched.customStartDate && !customStartDateError && Boolean(customStartDate);

          const cliffDateError = (cliffEnabled && touched.cliffDate)
            ? (!cliffDate
                ? 'Cliff date is required.'
                : new Date(cliffDate) < new Date(new Date().setHours(0, 0, 0, 0))
                ? 'Cliff date must not be in the past.'
                : (startTimeOption === 'custom' && customStartDate && new Date(cliffDate) < new Date(customStartDate))
                ? 'Cliff date must be on or after the start date.'
                : undefined)
            : undefined;
          const cliffDateSuccess = cliffEnabled && touched.cliffDate && !cliffDateError && Boolean(cliffDate);

          return (
          <>
            <hr className="divider" />

            <div className="section-header">
              <h3>Rate & schedule</h3>
              <p>Configure how fast USDC streams and when it starts.</p>
            </div>

            {/* Stream Rate */}
            <div className="form-group">
              <label htmlFor="create-stream-accrual-rate" className="form-label">
                Stream rate
                {<span className="required" aria-hidden="true"> *</span>}
                <InfoTooltip
                  id="stream-rate-tooltip"
                  title="How is stream rate calculated?"
                  ariaLabel="Learn more about stream rate calculation"
                  content={
                    <>
                      <p>
                        The stream rate is the amount of USDC that accrues to the 
                        recipient per day. For example, a rate of 38.62 USDC/day 
                        means the recipient can withdraw approximately 270 USDC 
                        after 7 days.
                      </p>
                      <p style={{ marginTop: '8px', fontWeight: 500 }}>
                        Formula: Total Deposit ÷ Duration = Stream Rate
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
                  How much USDC the recipient earns per day
                </span>
              )}
            </div>

            {/* Stream Duration */}
            <div className="form-group">
              <label htmlFor="create-stream-duration" className="form-label">
                Stream duration
                {<span className="required" aria-hidden="true"> *</span>}
                <InfoTooltip
                  id="stream-duration-tooltip"
                  title="Understanding stream duration"
                  ariaLabel="Learn more about stream duration"
                  content={
                    <>
                      <p>
                        The duration defines the total length of the stream in days.
                        After this period ends, the full deposit amount will have 
                        been streamed to the recipient.
                      </p>
                      <p style={{ marginTop: '8px' }}>
                        Example: A 7-day stream transfers funds continuously over 
                        one week. The recipient can withdraw at any time during 
                        this period.
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
                  How many days the stream will run before ending
                </span>
              )}
            </div>

            {/* Start Time */}
            <div className="form-group">
              <label className="form-label">Start time</label>
              <div className="segmented-control">
                <button
                  className={`segment-btn ${startTimeOption === 'now' ? 'active' : ''}`}
                  onClick={() => setStartTimeOption('now')}
                >
                  Start now
                </button>
                <button
                  className={`segment-btn ${startTimeOption === 'custom' ? 'active' : ''}`}
                  onClick={() => setStartTimeOption('custom')}
                >
                  Custom date
                </button>
              </div>
              {startTimeOption === 'custom' && (
                <div style={{ marginTop: '0.75rem' }}>
                  <InputField
                    id="create-stream-custom-start-date"
                    label="Custom start date"
                    required
                    error={customStartDateError}
                    helperText="When the stream begins accruing USDC"
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
                Cliff period{' '}
                <span style={{ color: 'var(--muted)', fontWeight: 'normal' }}>(optional)</span>
                <InfoTooltip
                  id="cliff-tooltip"
                  title="What is a cliff?"
                  ariaLabel="Learn more about cliff periods"
                  content={
                    <>
                      <p>
                        A cliff is a vesting lockup period. During the cliff:
                      </p>
                      <ul style={{ marginTop: '4px', marginLeft: '16px', listStyle: 'disc' }}>
                        <li>USDC continues to accrue normally</li>
                        <li>The recipient CANNOT withdraw any funds</li>
                        <li>After the cliff date, all accrued funds become withdrawable</li>
                      </ul>
                      <p style={{ marginTop: '8px' }}>
                        <strong>Common use case:</strong> Employee compensation where vesting 
                        "cliff" prevents withdrawal for the first 3-6 months, 
                        ensuring commitment before funds are accessible.
                      </p>
                      <p style={{ marginTop: '8px' }}>
                        Example: 1-year stream with 3-month cliff = No withdrawals 
                        for 3 months, then all accrued USDC becomes available.
                      </p>
                    </>
                  }
                />
              </label>
              <div className="toggle-container" onClick={() => setCliffEnabled(!cliffEnabled)}>
                <div className={`toggle-switch ${cliffEnabled ? 'on' : ''}`}>
                  <div className="toggle-knob" />
                </div>
                <span>Enable cliff (vesting lockup until specific date)</span>
              </div>
              {cliffEnabled && (
                <div style={{ marginTop: '0.75rem' }}>
                  <InputField
                    id="create-stream-cliff-date"
                    label="Cliff date"
                    required
                    error={cliffDateError}
                    helperText="The recipient cannot withdraw until this date, even though USDC accrues"
                    success={cliffDateSuccess}
                  >
                    <input
                      type="date"
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
                <div className="deposit-label">Required deposit</div>
                <div className={`deposit-value ${parseFloat(requiredDeposit) > userDeposit ? 'required' : ''}`}>
                  {requiredDeposit} USDC
                </div>
              </div>
              <div className="deposit-box">
                <div className="deposit-label">Your deposit</div>
                <div className="deposit-value">{userDeposit.toFixed(2)} USDC</div>
              </div>
            </div>
          </>
          );
        })()}

          {currentStep === 3 &&
            (() => {
              const mockRecipient =
                recipient.trim() || "GDU4D7EXAMPLEADDRESS0L50DR";
              const mockDeposit = depositAmount.trim()
                ? parseFloat(depositAmount.replace(/,/g, "")).toFixed(2)
                : "200.00";
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
                        <div className="review-card-title">Recipient</div>
                        <button
                          type="button"
                          className="review-card-edit"
                          onClick={() => setCurrentStep(1)}
                          aria-label="Edit recipient"
                        >
                          Edit
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
                        <div className="review-card-sublabel">Address</div>
                        <div className="review-card-value">
                          {maskAddress(mockRecipient)}
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
                        <div className="review-card-title">Deposit</div>
                        <button
                          type="button"
                          className="review-card-edit"
                          onClick={() => setCurrentStep(1)}
                          aria-label="Edit deposit"
                        >
                          Edit
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
                          {mockDeposit}{" "}
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
                        <div className="review-card-title">Rate & schedule</div>
                        <button
                          type="button"
                          className="review-card-edit"
                          onClick={() => setCurrentStep(2)}
                          aria-label="Edit rate and schedule"
                        >
                          Edit
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
                          <span className="review-card-row-label">Rate</span>
                          <span className="review-card-row-value">
                            {accrualRate} USDC per month
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
                            Duration
                          </span>
                          <span className="review-card-row-value">
                            {duration}{" "}
                            {parseInt(duration, 10) === 1 ? "month" : "months"}
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
                          <span className="review-card-row-label">Start</span>
                          <span className="review-card-row-value">
                            {startTimeOption === "now"
                              ? "Immediately"
                              : customStartDate
                                ? new Date(customStartDate).toLocaleString()
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
                          <span className="review-card-row-label">Cliff</span>
                          <span className="review-card-row-value">
                            {cliffEnabled && cliffDate
                              ? new Date(cliffDate).toLocaleDateString()
                              : "Not set"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="review-warning-box"
                    role="region"
                    aria-live="polite"
                  >
                    <strong>By creating this stream:</strong> {mockDeposit} USDC
                    will be locked in a Soroban smart contract. The recipient
                    can withdraw their accrued amount at any time during the
                    stream.
                  </div>
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
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-next"
                onClick={handleNext}
                disabled={isSubmitting}
              >
                Next
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-back"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-next"
                onClick={handleNext}
                disabled={isSubmitting}
                aria-busy={isSubmitting && currentStep === 3}
              >
                {currentStep === 3 && isSubmitting
                  ? "Creating…"
                  : currentStep === 2
                    ? "Next"
                    : "Create stream"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
