import { useState, useEffect, useRef } from 'react';
import './CreateStreamModal.css';

/** Stellar public key: starts with G, 56 chars, base32 (no 0,1,8,9). */
function isValidStellarAddress(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length !== 56) return false;
  if (trimmed[0] !== 'G') return false;
  return /^G[ABCDEFGHJKLMNPQRSTUVWXYZ234567]{55}$/.test(trimmed);
}

interface CreateStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when user completes the flow and clicks "Create stream" on step 3. Use to show success modal. */
  onStreamCreated?: () => void;
}

export default function CreateStreamModal({ isOpen, onClose, onStreamCreated }: CreateStreamModalProps) {
  const [recipient, setRecipient] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [accrualRate, setAccrualRate] = useState('38.62');
  const [duration, setDuration] = useState('1');
  const [startTimeOption, setStartTimeOption] = useState<'now' | 'custom'>('now');
  const [customStartDate, setCustomStartDate] = useState('');
  const [cliffEnabled, setCliffEnabled] = useState(false);
  const [cliffDate, setCliffDate] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const userDeposit = 200.0;
  const requiredDeposit = (parseFloat(accrualRate || '0') * parseFloat(duration || '0')).toFixed(2);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const validateStep1 = (): boolean => {
    if (!recipient.trim()) {
      setError('Recipient is required.');
      return false;
    }
    if (!isValidStellarAddress(recipient.trim())) {
      setError('Please enter a valid Stellar address (starts with G, 56 characters).');
      return false;
    }
    const amount = parseFloat(depositAmount.replace(/,/g, ''));
    if (!depositAmount.trim() || isNaN(amount) || amount <= 0) {
      setError('Deposit amount must be a positive number.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      if (!accrualRate || parseFloat(accrualRate) <= 0) {
        setError('Stream rate must be greater than 0');
        return;
      }
      if (!duration || parseFloat(duration) <= 0) {
        setError('Stream duration must be greater than 0');
        return;
      }
      if (parseFloat(requiredDeposit) > userDeposit) {
        setError(`Required deposit exceeds your current balance of ${userDeposit} USDC`);
        return;
      }

      // Date validation
      if (startTimeOption === 'custom') {
        if (!customStartDate) {
          setError('Please select a custom start date');
          return;
        }
        const selectedDate = new Date(customStartDate);
        if (selectedDate < new Date()) {
          setError('Start time cannot be in the past');
          return;
        }
      }

      if (cliffEnabled) {
        if (!cliffDate) {
          setError('Please select a cliff date');
          return;
        }
        const selectedCliffDate = new Date(cliffDate);
        if (selectedCliffDate < new Date(new Date().setHours(0, 0, 0, 0))) {
          setError('Cliff date cannot be in the past');
          return;
        }
        
        if (startTimeOption === 'custom' && customStartDate) {
           if (selectedCliffDate < new Date(customStartDate)) {
              setError('Cliff date cannot be before the start date');
              return;
           }
        }
      }

      setError(null);
      setCurrentStep(3);
    } else if (currentStep === 3) {
      onStreamCreated?.();
      onClose();
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
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="create-stream-title">Create stream</h2>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close modal">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress: Step 1 Recipient & amount, Step 2 Rate & schedule, Step 3 Review & create */}
        <div className="progress-tracker">
          <div className="progress-line">
            <div className="progress-line-fill" style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }} />
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
        {currentStep === 1 && (
          <>
            <hr className="divider" />
            <div className="section-header">
              <h3>Recipient & amount</h3>
              <p>Set who receives the stream and how much USDC to lock.</p>
            </div>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <div className="form-group">
              <label htmlFor="create-stream-recipient" className="form-label">
                Recipient <span className="required" aria-hidden="true">*</span>
              </label>
              <div className="input-container">
                <div className="input-icon" aria-hidden="true">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  id="create-stream-recipient"
                  type="text"
                  className="input-field"
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Paste Stellar address (G...)"
                  autoComplete="off"
                  aria-required="true"
                  aria-invalid={!!(error && error.includes('Recipient'))}
                  aria-describedby="create-stream-recipient-helper"
                />
              </div>
              <span id="create-stream-recipient-helper" className="form-helper">
                Recipient will be able to withdraw accrued USDC over time.
              </span>
            </div>
            <div className="form-group">
              <label htmlFor="create-stream-deposit" className="form-label">
                Deposit amount <span className="required" aria-hidden="true">*</span>
              </label>
              <div className="input-container input-with-prefix-suffix">
                <span className="input-prefix" aria-hidden="true">$</span>
                <input
                  id="create-stream-deposit"
                  type="text"
                  inputMode="decimal"
                  className="input-field"
                  value={depositAmount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, '');
                    setDepositAmount(v);
                    if (error) setError(null);
                  }}
                  placeholder="0.00"
                  aria-required="true"
                  aria-invalid={!!(error && error.includes('Deposit'))}
                  aria-describedby="create-stream-deposit-helper"
                />
                <span className="input-suffix-pill">USDC</span>
              </div>
              <span id="create-stream-deposit-helper" className="form-helper">
                Total USDC locked for this stream. Must cover full duration at chosen rate.
              </span>
            </div>
            <div className="info-box" role="region" aria-labelledby="info-box-title">
              <div id="info-box-title" className="info-box-title">Smart contract lock:</div>
              <p className="info-box-text">
                Your USDC will be locked in a Soroban smart contract. The recipient can withdraw their accrued portion at any time.
              </p>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <>
            <hr className="divider" />
            
            <div className="section-header">
          <h3>Rate & schedule</h3>
          <p>Configure how fast USDC streams and when it starts.</p>
        </div>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        {/* Stream Rate */}
        <div className="form-group">
          <label className="form-label">Stream rate <span className="required">*</span></label>
          <div className="form-row">
            <div className="input-container">
              <div className="input-icon">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <input
                type="text"
                className="input-field"
                value={accrualRate}
                onChange={(e) => {
                  setAccrualRate(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="0.00"
              />
            </div>
            <div className="input-container narrow">
              <span style={{color: 'transparent'}}>_</span>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{color: 'var(--muted)'}}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <span className="form-helper">How much USDC accrues per time unit.</span>
        </div>

        {/* Stream Duration */}
        <div className="form-group">
          <label className="form-label">Stream duration <span className="required">*</span></label>
          <div className="form-row">
            <div className="input-container">
              <div className="input-icon">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <input
                type="text"
                className="input-field"
                value={duration}
                onChange={(e) => {
                  setDuration(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="1"
              />
            </div>
            <div className="input-container narrow">
              <span style={{color: 'transparent'}}>_</span>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{color: 'var(--muted)'}}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <span className="form-helper">How long the stream will run before ending.</span>
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
            <div className="input-container" style={{ marginTop: '0.75rem' }}>
              <div className="input-icon">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="datetime-local"
                className="input-field"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  if (error) setError(null);
                }}
              />
            </div>
          )}
          <span className="form-helper">When the stream begins accruing USDC.</span>
        </div>

        {/* Cliff Period */}
        <div className="form-group">
          <label className="form-label">Cliff period <span style={{color: 'var(--muted)', fontWeight: 'normal'}}>(optional)</span></label>
          <div className="toggle-container" onClick={() => setCliffEnabled(!cliffEnabled)}>
            <div className={`toggle-switch ${cliffEnabled ? 'on' : ''}`}>
              <div className="toggle-knob" />
            </div>
            <span>Enable cliff (no withdrawals until specific date)</span>
          </div>
          {cliffEnabled && (
            <div className="input-container" style={{ marginTop: '0.75rem' }}>
              <div className="input-icon">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="date"
                className="input-field"
                value={cliffDate}
                onChange={(e) => {
                  setCliffDate(e.target.value);
                  if (error) setError(null);
                }}
              />
            </div>
          )}
          <span className="form-helper">No accrual until cliff time. Useful for vesting schedules.</span>
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
        )}

        {currentStep === 3 && (
          <>
            <hr className="divider" />
            <div style={{ padding: '3rem 0', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--surface-highest)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--primary)' }}>
                 <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                 </svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text)' }}>Review & create</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Review page is coming soon...</p>
            </div>
          </>
        )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {currentStep === 1 ? (
            <>
              <button type="button" className="btn btn-cancel" onClick={handleCancel}>Cancel</button>
              <button type="button" className="btn btn-next" onClick={handleNext}>Next</button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-back" onClick={handleBack}>Back</button>
              <button type="button" className="btn btn-next" onClick={handleNext}>{currentStep === 2 ? 'Next' : 'Create stream'}</button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
