import { useState, useEffect, useRef } from "react";
import { writeOnboardingDismissed } from "../lib/onboarding";
import "./TreasuryOnboarding.css";

interface TreasuryOnboardingProps {
  walletConnected: boolean;
  walletAddress?: string | null;
  onConnectWallet: () => void;
  onCreateStream: () => void;
  onDismiss: () => void;
}

const STEPS = [
  {
    id: "welcome",
    label: "Welcome",
  },
  {
    id: "how-it-works",
    label: "How it works",
  },
  {
    id: "get-started",
    label: "Get started",
  },
];

export default function TreasuryOnboarding({
  walletConnected,
  walletAddress,
  onConnectWallet,
  onCreateStream,
  onDismiss,
}: TreasuryOnboardingProps) {
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);

  // Move focus to heading when step changes so screen readers announce new content
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const isLastStep = step === STEPS.length - 1;

  const handleDismiss = () => {
    writeOnboardingDismissed(true);
    onDismiss();
  };

  const handleComplete = () => {
    writeOnboardingDismissed(true);

    if (!walletConnected) {
      onConnectWallet();
      return;
    }

    onCreateStream();
  };

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <section
      className="treasury-onboarding"
      aria-label="Treasury onboarding"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Progress stepper */}
      <div
        className="onboarding-stepper"
        role="list"
        aria-label="Onboarding steps"
      >
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            role="listitem"
            className={`onboarding-step-dot-wrap ${i === step ? "current" : i < step ? "done" : "upcoming"}`}
            aria-current={i === step ? "step" : undefined}
          >
            <button
              className="onboarding-step-dot"
              onClick={() => i < step && setStep(i)}
              disabled={i >= step}
              aria-label={`Step ${i + 1}: ${s.label}${i < step ? " (completed)" : i === step ? " (current)" : ""}`}
              tabIndex={i < step ? 0 : -1}
            >
              {i < step ? (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <span aria-hidden="true">{i + 1}</span>
              )}
            </button>
            <span className="onboarding-step-label" aria-hidden="true">
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`onboarding-connector ${i < step ? "done" : ""}`}
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="onboarding-card" ref={regionRef}>
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="onboarding-step-content">
            <div className="onboarding-icon-ring" aria-hidden="true">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 11.5C5 11.5 6 9.5 8 9.5c2 0 3 2 5 2s3-2 5-2 3 2 5 2"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 15.5C5 15.5 6 13.5 8 13.5c2 0 3 2 5 2s3-2 5-2 3 2 5 2"
                  opacity="0.7"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 19.5C5 19.5 6 17.5 8 17.5c2 0 3 2 5 2s3-2 5-2 3 2 5 2"
                  opacity="0.4"
                />
              </svg>
            </div>

            <h2 className="onboarding-heading" ref={headingRef} tabIndex={-1}>
              Welcome to Fluxora Treasury
            </h2>
            <p className="onboarding-body">
              Fluxora lets you stream USDC to recipients in real time — second
              by second — using Soroban smart contracts on Stellar. No batch
              payroll. No manual transfers. Just continuous, programmable
              capital flow.
            </p>

            <div
              className="onboarding-concept-grid"
              role="list"
              aria-label="Key concepts"
            >
              <div className="onboarding-concept-card" role="listitem">
                <div className="concept-icon" aria-hidden="true">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" d="M12 8v4l3 3" />
                  </svg>
                </div>
                <div>
                  <div className="concept-title">Real-time streams</div>
                  <div className="concept-desc">
                    USDC accrues per second. Recipients withdraw whenever they
                    want.
                  </div>
                </div>
              </div>

              <div className="onboarding-concept-card" role="listitem">
                <div className="concept-icon" aria-hidden="true">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path strokeLinecap="round" d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
                <div>
                  <div className="concept-title">Smart-contract lock</div>
                  <div className="concept-desc">
                    Your deposit is held in a Soroban contract — trustless and
                    auditable.
                  </div>
                </div>
              </div>

              <div className="onboarding-concept-card" role="listitem">
                <div className="concept-icon" aria-hidden="true">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 9v1"
                    />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </div>
                <div>
                  <div className="concept-title">USDC on Stellar</div>
                  <div className="concept-desc">
                    Low fees, fast finality. Stellar's USDC is the stream
                    currency.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: How it works */}
        {step === 1 && (
          <div className="onboarding-step-content">
            <div className="onboarding-icon-ring" aria-hidden="true">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>

            <h2 className="onboarding-heading" ref={headingRef} tabIndex={-1}>
              How a stream works
            </h2>
            <p className="onboarding-body">
              Creating a stream takes three steps. Once live, it runs
              autonomously on-chain — you don't need to stay online.
            </p>

            <ol
              className="onboarding-steps-list"
              aria-label="Stream creation steps"
            >
              <li className="onboarding-steps-item">
                <div className="step-num" aria-hidden="true">
                  1
                </div>
                <div className="step-info">
                  <div className="step-title">Set recipient & deposit</div>
                  <div className="step-desc">
                    Paste a valid Stellar address (starts with <code>G</code>,
                    56 chars). Choose how much USDC to lock — must cover the
                    full stream duration at your chosen rate.
                  </div>
                </div>
              </li>
              <li className="onboarding-steps-item">
                <div className="step-num" aria-hidden="true">
                  2
                </div>
                <div className="step-info">
                  <div className="step-title">Configure rate & schedule</div>
                  <div className="step-desc">
                    Pick how fast USDC accrues, when to start (now or a future
                    date), and optionally add a cliff — a period during which
                    the stream accumulates but withdrawals are blocked.
                  </div>
                </div>
              </li>
              <li className="onboarding-steps-item">
                <div className="step-num" aria-hidden="true">
                  3
                </div>
                <div className="step-info">
                  <div className="step-title">Review & sign</div>
                  <div className="step-desc">
                    Confirm the summary and approve the Soroban transaction in
                    Freighter. Your USDC is locked; the recipient can start
                    withdrawing their accrued share immediately.
                  </div>
                </div>
              </li>
            </ol>

            <div className="onboarding-info-box" role="note">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="M12 16v-4M12 8h.01" />
              </svg>
              <p>
                You can cancel an active stream at any time. Unaccrued USDC is
                returned to your wallet; accrued amounts remain available to the
                recipient.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Get started */}
        {step === 2 && (
          <div className="onboarding-step-content">
            <div
              className={`onboarding-icon-ring ${walletConnected ? "connected" : "disconnected"}`}
              aria-hidden="true"
            >
              {walletConnected ? (
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12V7H5a2 2 0 010-4h14v4M21 12v5H5a2 2 0 000 4h16v-4"
                  />
                  <circle cx="18" cy="12" r="1.5" fill="currentColor" />
                </svg>
              )}
            </div>

            <h2 className="onboarding-heading" ref={headingRef} tabIndex={-1}>
              {walletConnected
                ? "You're ready to stream"
                : "Connect your wallet first"}
            </h2>

            {walletConnected ? (
              <>
                <p className="onboarding-body">
                  Your Stellar wallet is connected
                  {walletAddress && (
                    <>
                      {" "}
                      as{" "}
                      <span
                        className="wallet-address-pill"
                        aria-label={`Wallet address ${walletAddress}`}
                      >
                        {walletAddress.slice(0, 6)}&thinsp;…&thinsp;
                        {walletAddress.slice(-6)}
                      </span>
                    </>
                  )}
                  . Create your first stream to begin the empty-to-active
                  journey.
                </p>

                <div
                  className="onboarding-checklist"
                  role="list"
                  aria-label="Pre-flight checklist"
                >
                  <div className="checklist-item done" role="listitem">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Wallet connected</span>
                  </div>
                  <div className="checklist-item" role="listitem">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    <span>Recipient Stellar address ready</span>
                  </div>
                  <div className="checklist-item" role="listitem">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    <span>USDC balance to cover stream duration</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="onboarding-body">
                  Fluxora requires a Stellar wallet to sign on-chain
                  transactions. Connect <strong>Freighter</strong> — the
                  recommended browser extension — to continue.
                </p>

                <div
                  className="onboarding-wallet-options"
                  role="list"
                  aria-label="Supported wallets"
                >
                  <div className="wallet-option featured" role="listitem">
                    <div className="wallet-option-icon" aria-hidden="true">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 32 32"
                        fill="none"
                      >
                        <rect width="32" height="32" rx="8" fill="#7B2FF7" />
                        <path
                          d="M8 22l8-14 8 14H8z"
                          fill="white"
                          opacity="0.9"
                        />
                      </svg>
                    </div>
                    <div className="wallet-option-info">
                      <div className="wallet-option-name">Freighter</div>
                      <div className="wallet-option-desc">
                        Recommended · Stellar browser extension
                      </div>
                    </div>
                    <span className="wallet-badge">Recommended</span>
                  </div>
                </div>

                <div className="onboarding-info-box" role="note">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" d="M12 16v-4M12 8h.01" />
                  </svg>
                  <p>
                    Fluxora connects to Stellar Testnet by default. No real
                    funds are used during exploration.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Navigation footer */}
        <div className="onboarding-footer">
          <button
            type="button"
            className="onboarding-btn-ghost"
            onClick={handleDismiss}
            aria-label="Skip onboarding"
          >
            Skip
          </button>

          <div className="onboarding-nav-btns">
            {step > 0 && (
              <button
                type="button"
                className="onboarding-btn-secondary"
                onClick={handleBack}
              >
                Back
              </button>
            )}
            <button
              type="button"
              className="onboarding-btn-primary"
              onClick={handleNext}
            >
              {isLastStep
                ? walletConnected
                  ? "Create first stream"
                  : "Connect Freighter"
                : "Next"}
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard hint */}
      <p className="onboarding-hint" aria-hidden="true">
        Step {step + 1} of {STEPS.length}
      </p>
    </section>
  );
}
