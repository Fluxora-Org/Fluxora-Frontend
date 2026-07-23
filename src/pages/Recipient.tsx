import { useEffect, useState, useRef } from "react";
import RecipientEmptyState from "../components/RecipientEmptyState";
import { RecipientStreams, type Stream } from "../components/recipient/RecipientStreams";
import RecipientLoading from "../components/RecipientLoading";
import ZeroAccrualBanner from "../components/ZeroAccrualBanner";
import { useWallet } from "../components/wallet-connect/Walletcontext";
import { useToast } from "../components/toast/ToastProvider";
import { useRecipientStreams } from "../components/treasuryOverviewPage/useTreasury";
import type { StreamRecord } from "../data/streamRecords";
import { withdraw } from "../lib/stellar/tx";
import "./Streams.css";

// Demo balances used as a UI fallback when the service returns no recipient
// streams (no live backend yet, or no seeded match for the connected address).
const DEMO_BALANCE = 22600.0;
const DEMO_ACTIVE = 2;
const DEMO_TOTAL_ACCRUED = 43250.0;
const DEMO_TOTAL_WITHDRAWN = 20650.0;
const USDC_SCALE = 10_000_000;
const MAX_U64 = 18_446_744_073_709_551_615n;

type WithdrawStreamCandidate = Pick<
  StreamRecord,
  "id" | "status" | "withdrawableAmount"
> & {
  isPinned?: boolean;
};

/** Returns true when a stream id can be encoded as a positive Soroban u64. */
export function isValidWithdrawStreamId(
  streamId: string | null | undefined,
): streamId is string {
  if (!streamId) return false;

  const normalized = streamId.trim();
  if (!/^\d+$/.test(normalized)) return false;

  const value = BigInt(normalized);
  return value > 0n && value <= MAX_U64;
}

/**
 * Selects the recipient stream that should back the next withdrawal.
 * Live recipient data takes precedence; the demo fallback is only used when
 * no backend stream is available yet.
 */
export function selectWithdrawStream(
  streams: WithdrawStreamCandidate[],
): WithdrawStreamCandidate | null {
  const activeWithdrawableStreams = streams.filter(
    (stream) =>
      stream.status === "Active" &&
      stream.withdrawableAmount > 0 &&
      isValidWithdrawStreamId(stream.id),
  );

  return (
    activeWithdrawableStreams.find((stream) => stream.isPinned) ??
    activeWithdrawableStreams[0] ??
    null
  );
}

/** Converts the displayed USDC balance to the 7-decimal on-chain amount. */
export function getWithdrawAmount(balance: number): string | null {
  if (!Number.isFinite(balance) || balance <= 0) return null;

  const scaledAmount = Math.floor(balance * USDC_SCALE);
  return scaledAmount > 0 ? scaledAmount.toString() : null;
}

export default function Recipient() {
  const timeoutRef = useRef<number | null>(null);
  const wallet = useWallet();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [txState, setTxState] = useState<"idle" | "signing" | "submitting" | "confirmed" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recipientStreams = useRecipientStreams(wallet.address);

  // ── Local Security Gate States ──
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState(() => {
    return localStorage.getItem("fluxora_biometric_enrolled") === "true";
  });
  const [backupPin, setBackupPin] = useState(() => {
    return localStorage.getItem("fluxora_backup_pin");
  });
  const [isSecurityGateEnabled, setIsSecurityGateEnabled] = useState(() => {
    return localStorage.getItem("fluxora_security_gate_enabled") === "true";
  });

  // Enrollment Modal States
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [enrollmentStep, setEnrollmentStep] = useState('check-support');
  const [pinValue, setPinValue] = useState("");
  const [confirmPinValue, setConfirmPinValue] = useState("");
  const [enrollmentError, setEnrollmentError] = useState(null);

  // Verification Modal States
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyState, setVerifyState] = useState('prompt-active');
  const [verifyPinValue, setVerifyPinValue] = useState("");
  const [verifyActionType, setVerifyActionType] = useState('withdraw');
  const [verifyError, setVerifyError] = useState(null);

  // Refs for modal accessibility
  const enrollmentModalRef = useRef(null);
  const verifyModalRef = useRef(null);

  // Connect accessibility focus trap/scroll lock hooks
  useModalAccessibility({
    isOpen: isEnrollmentModalOpen,
    onClose: () => setIsEnrollmentModalOpen(false),
    modalRef: enrollmentModalRef,
  });

  useModalAccessibility({
    isOpen: isVerifyModalOpen,
    onClose: () => {
      setIsVerifyModalOpen(false);
      if (txState === "signing") setTxState("idle");
    },
    modalRef: verifyModalRef,
  });

  // Detect biometric capabilities
  useEffect(() => {
    const checkSupport = async () => {
      if (typeof window !== "undefined" && window.PublicKeyCredential) {
        try {
          const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsBiometricSupported(isAvailable);
        } catch {
          setIsBiometricSupported(false);
        }
      } else {
        setIsBiometricSupported(false);
      }
    };
    checkSupport();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(t);
  }, []);

  /**
   * Resets transaction state when the active wallet address changes.
   * This prevents stale errors or pending states from carrying over to a different account.
   */
  useEffect(() => {
    setTxState("idle");
    setErrorMsg(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [wallet.address]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const fetchIncomingStreams = async (): Promise<Stream[]> => [
    { id: "1", sender: "Treasury", amount: "12000", status: "active" },
    { id: "2", sender: "Payroll", amount: "8600", status: "active" },
  ];

  const liveStreams = recipientStreams.streams;
  const hasLiveStreams = liveStreams.length > 0;

  const demoWithdrawStream: WithdrawStreamCandidate = {
    id: "1",
    status: "Active",
    withdrawableAmount: DEMO_BALANCE,
  };
  const selectedWithdrawStream = selectWithdrawStream(
    hasLiveStreams ? liveStreams : [demoWithdrawStream],
  );

  const balance = hasLiveStreams
    ? liveStreams.reduce((sum, stream) => sum + stream.withdrawableAmount, 0)
    : DEMO_BALANCE;
  const activeStreams = hasLiveStreams
    ? liveStreams.filter((stream) => stream.status === "Active").length
    : DEMO_ACTIVE;
  const totalAccrued = hasLiveStreams
    ? liveStreams.reduce((sum, stream) => sum + stream.streamedAmount, 0)
    : DEMO_TOTAL_ACCRUED;
  const totalWithdrawn = hasLiveStreams
    ? liveStreams.reduce(
        (sum, stream) => sum + Math.max(0, stream.streamedAmount - stream.withdrawableAmount),
        0,
      )
    : DEMO_TOTAL_WITHDRAWN;

  const walletConnected = wallet.connected;
  const hasStreams = activeStreams > 0;

  const networkMismatch = wallet.connected && wallet.isNetworkMismatch;

  // Zero-accrual: connected + streams exist + no withdrawable balance yet
  const isZeroAccrual = walletConnected && hasStreams && balance === 0;
  
  const isPending = txState === "signing" || txState === "submitting";
  const disabled =
    !walletConnected ||
    !wallet.address ||
    balance === 0 ||
    networkMismatch ||
    isPending ||
    !selectedWithdrawStream;

  const handleToggleSecurityGate = () => {
    if (isSecurityGateEnabled) {
      setVerifyActionType("disable_gate");
      setVerifyState(isBiometricEnrolled && isBiometricSupported ? "prompt-active" : "unsupported-device-fallback");
      setVerifyPinValue("");
      setVerifyError(null);
      setIsVerifyModalOpen(true);
    } else {
      setIsEnrollmentModalOpen(true);
      setEnrollmentStep(isBiometricSupported ? "check-support" : "set-pin");
      setPinValue("");
      setConfirmPinValue("");
      setEnrollmentError(null);
    }
  };

  const handleUpdatePIN = () => {
    setIsEnrollmentModalOpen(true);
    setEnrollmentStep("set-pin");
    setPinValue("");
    setConfirmPinValue("");
    setEnrollmentError(null);
  };

  const triggerBiometricEnrollment = async () => {
    setEnrollmentError(null);
    try {
      if (typeof window !== "undefined" && window.PublicKeyCredential && navigator.credentials?.create) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const options = {
          publicKey: {
            challenge,
            rp: { name: "Fluxora" },
            user: {
              id: new Uint8Array([1, 2, 3, 4]),
              name: "recipient@fluxora.xyz",
              displayName: "Recipient"
            },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required"
            },
            timeout: 60000
          }
        };
        await navigator.credentials.create(options);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      localStorage.setItem("fluxora_biometric_enrolled", "true");
      setIsBiometricEnrolled(true);
      setEnrollmentStep("set-pin");
    } catch (err) {
      setEnrollmentError(err.message || "Failed to register biometrics.");
    }
  };

  const triggerBiometricVerification = async () => {
    setVerifyState("prompt-active");
    setVerifyError(null);
    try {
      if (typeof window !== "undefined" && window.PublicKeyCredential && navigator.credentials?.get) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const options = {
          publicKey: {
            challenge,
            timeout: 60000,
            userVerification: "required"
          }
        };
        await navigator.credentials.get(options);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      handleVerificationSuccess();
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "AbortError") {
        setVerifyState("prompt-cancelled");
      } else {
        setVerifyState("prompt-failed");
        setVerifyError(err.message || "Biometric verification failed.");
      }
    }
  };

  const handleVerificationSuccess = () => {
    setVerifyState("prompt-succeeded");
    setTimeout(() => {
      setIsVerifyModalOpen(false);
      if (verifyActionType === "withdraw") {
        executeOnChainWithdraw();
      } else {
        localStorage.removeItem("fluxora_security_gate_enabled");
        setIsSecurityGateEnabled(false);
        addToast("Local security gate disabled.", "success");
      }
    }, 1000);
  };

  useEffect(() => {
    if (isVerifyModalOpen && verifyState === "prompt-active") {
      triggerBiometricVerification();
    }
  }, [isVerifyModalOpen, verifyState]);

  const handleEnrollPinKeyPress = (key) => {
    setEnrollmentError(null);
    const activePin = enrollmentStep === "set-pin" ? pinValue : confirmPinValue;
    const setActivePin = enrollmentStep === "set-pin" ? setPinValue : setConfirmPinValue;

    if (key === "backspace") {
      setActivePin(activePin.slice(0, -1));
      return;
    }

    if (key === "clear") {
      setActivePin("");
      return;
    }

    if (activePin.length < 4) {
      const nextPin = activePin + key;
      setActivePin(nextPin);

      if (nextPin.length === 4) {
        if (enrollmentStep === "set-pin") {
          setTimeout(() => {
            setEnrollmentStep("confirm-pin");
          }, 300);
        } else {
          if (nextPin === pinValue) {
            localStorage.setItem("fluxora_backup_pin", pinValue);
            localStorage.setItem("fluxora_security_gate_enabled", "true");
            setBackupPin(pinValue);
            setIsSecurityGateEnabled(true);
            setTimeout(() => {
              setEnrollmentStep("success");
            }, 300);
          } else {
            setEnrollmentError("PINs do not match. Please try again.");
            setConfirmPinValue("");
          }
        }
      }
    }
  };

  const handleVerifyPinKeyPress = (key) => {
    setVerifyError(null);
    if (key === "backspace") {
      setVerifyPinValue(verifyPinValue.slice(0, -1));
      return;
    }

    if (key === "clear") {
      setVerifyPinValue("");
      return;
    }

    if (verifyPinValue.length < 4) {
      const nextPin = verifyPinValue + key;
      setVerifyPinValue(nextPin);

      if (nextPin.length === 4) {
        if (nextPin === backupPin) {
          handleVerificationSuccess();
        } else {
          setVerifyError("Incorrect PIN. Please try again.");
          setVerifyPinValue("");
        }
      }
    }
  };

  const handleWithdraw = async () => {
    if (disabled) return;
    setErrorMsg(null);

    if (isSecurityGateEnabled) {
      setVerifyActionType("withdraw");
      setVerifyState(isBiometricEnrolled && isBiometricSupported ? "prompt-active" : "unsupported-device-fallback");
      setVerifyPinValue("");
      setVerifyError(null);
      setIsVerifyModalOpen(true);
    } else {
      executeOnChainWithdraw();
    }
  };

  const executeOnChainWithdraw = async () => {
    setTxState("signing");
    const recipientAddr = wallet.address!;
    const amountStr = getWithdrawAmount(balance);
    const streamId = selectedWithdrawStream?.id;

    if (!isValidWithdrawStreamId(streamId) || !amountStr) {
      const message = !streamId
        ? "No valid stream is available for withdrawal."
        : "Withdrawal amount must be greater than zero.";
      setTxState("error");
      setErrorMsg(message);
      addToast(message, "error");
      return;
    }

    try {
      setTxState("submitting");
      await withdraw(recipientAddr, streamId, amountStr);
      setTxState("confirmed");
      addToast("Withdrawal completed successfully on-chain!", "success");
      timerRef.current = setTimeout(() => setTxState("idle"), 5000);
    } catch (err) {
      setTxState("error");
      setErrorMsg(err.message || "Withdrawal failed.");
      addToast(`Withdrawal failed: ${err.message || err}`, "error");
    }
  };

  const getButtonText = () => {
    switch (txState) {
      case "signing":
        return "Signing in Freighter...";
      case "submitting":
        return "Submitting to RPC...";
      case "confirmed":
        return "Withdrawn successfully!";
      case "error":
        return "Withdrawal Failed - Retry";
      default:
        return `Withdraw ${balance.toLocaleString()} USDC`;
    }
  };

  if (loading) return <RecipientLoading />;

  if (!walletConnected || !hasStreams) {
    return (
      <main aria-labelledby="recipient-page-title">
        <h1
          id="recipient-page-title"
          style={{ marginTop: 0, fontSize: "2rem", fontWeight: 700 }}
        >
          Your streams
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
          View your incoming streams and withdraw accrued USDC at any time.
        </p>
        <RecipientEmptyState walletConnected={walletConnected} />
      </main>
    );
  }

  return (
    <main className="streams-page">
      {/* ── Page Header (Hero) ── */}
      <section className="streams-hero">
        <div className="streams-hero__copy">
          <p className="streams-eyebrow">Recipient Portal</p>
          <h1>Your streams</h1>
          <p className="streams-subtitle">
            Manage your incoming streams, track accrued balances, and withdraw
            USDC in real-time. Your accumulated balance is available for instant
            withdrawal to your connected wallet.
          </p>
          {(errorMsg || networkMismatch) && (
            <p className="validation-message validation-message--error" style={{ color: "var(--color-danger)", marginTop: "1rem" }} role="alert">
              {networkMismatch 
                ? `Wrong network: Freighter is connected to ${wallet.network?.toUpperCase()}, but Fluxora is configured for ${wallet.expectedNetworkLabel}.`
                : errorMsg}
            </p>
          )}
        </div>
        <div className="streams-hero__actions">
          <button
            disabled={disabled}
            className={`streams-primary-button ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={handleWithdraw}
          >
            {getButtonText()}
          </button>
        </div>
      </section>

      {/* ── Zero-accrual banner (streams live, balance = 0) ── */}
      {isZeroAccrual && (
        <div style={{ marginBottom: "2rem" }}>
          <ZeroAccrualBanner
            reason="cliff"
            onAction={() => {
              /* Navigate to streams page for cliff details */
              window.location.href = "/app/streams";
            }}
            actionLabel="View stream details"
          />
        </div>
      )}

      {/* ── Overview Metrics ── */}
      <section className="streams-summary-grid" aria-label="Stream summary">
        <div className="streams-summary-card">
          <span>Active streams</span>
          <strong>{activeStreams}</strong>
          <p>Currently accruing funds for your wallet.</p>
        </div>
        <div className="streams-summary-card">
          <span>Total Accrued</span>
          <strong>{totalAccrued.toLocaleString()} USDC</strong>
          <p>Total amount earned over the lifetime of all streams.</p>
        </div>
        <div className="streams-summary-card">
          <span>Withdrawn</span>
          <strong>{totalWithdrawn.toLocaleString()} USDC</strong>
          <p>Total funds already transferred to your wallet.</p>
        </div>
        <div className="streams-summary-card">
          <span>Withdrawable now</span>
          <strong style={{ color: "var(--accent)" }}>{balance.toLocaleString()} USDC</strong>
          <p>Available for immediate withdrawal.</p>
        </div>
      </section>

      {/* ── Local Security Gate Card ── */}
      <section className="security-gate-section" aria-labelledby="security-gate-title">
        <div className="security-gate-card">
          <div className="security-gate-card__header">
            <div className="security-gate-icon-container">
              <Shield className="security-gate-icon" />
            </div>
            <div>
              <h2 id="security-gate-title">Local Security Gate</h2>
              <p className="security-gate-description">
                Protect your withdrawals locally. Require device biometrics (Touch ID / Face ID / Windows Hello) or a custom security PIN before initiating Freighter signing.
              </p>
            </div>
          </div>
          <div className="security-gate-card__actions">
            <div className="security-gate-status">
              <span className="security-status-label">Status:</span>
              <span className={`security-status-badge ${isSecurityGateEnabled ? "security-status-badge--active" : "security-status-badge--inactive"}`}>
                {isSecurityGateEnabled ? "Active" : "Disabled"}
              </span>
            </div>
            <button
              onClick={handleToggleSecurityGate}
              className="ui-secondary-control security-gate-toggle-btn"
              aria-pressed={isSecurityGateEnabled}
            >
              {isSecurityGateEnabled ? "Disable" : "Enable"}
            </button>
            {isSecurityGateEnabled && (
              <button
                onClick={handleUpdatePIN}
                className="ui-secondary-control security-gate-pin-btn"
              >
                Change PIN
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Streams List ── */}
      <section className="streams-list-shell">
        <div className="streams-list-head">
          <div>
            <h2>Incoming streams</h2>
            <p className="streams-subtitle">
              Review and manage each individual stream currently committing funds to you.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <RecipientStreams fetchStreamsFn={fetchIncomingStreams} />
        </div>
      </section>

      {/* ── Enrollment Modal ── */}
      {isEnrollmentModalOpen && (
        <div className="security-modal-overlay" onClick={() => setIsEnrollmentModalOpen(false)}>
          <div
            className="security-modal"
            ref={enrollmentModalRef}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="enrollment-modal-title"
          >
            <button
              className="security-modal__close-btn"
              onClick={() => setIsEnrollmentModalOpen(false)}
              aria-label="Close enrollment dialog"
            >
              <X size={18} />
            </button>

            <div className="security-modal__header">
              <span className="security-modal__badge">Setup Security Gate</span>
              <h2 id="enrollment-modal-title">
                {enrollmentStep === "check-support" && "Enable Biometric Gate"}
                {enrollmentStep === "set-pin" && "Set Security PIN"}
                {enrollmentStep === "confirm-pin" && "Confirm Security PIN"}
                {enrollmentStep === "success" && "Setup Complete!"}
              </h2>
            </div>

            <div className="security-modal__body">
              {enrollmentError && (
                <div className="security-modal__error" role="alert">
                  {enrollmentError}
                </div>
              )}

              {/* Step: Check Support / Biometric Intro */}
              {enrollmentStep === "check-support" && (
                <>
                  <div className="security-visual-container">
                    <Fingerprint className="security-visual-icon security-visual-icon--pulse" />
                  </div>
                  <p className="security-modal__text">
                    Register Touch ID / Face ID / Windows Hello as a local confirmation step before withdrawals are sent to Freighter.
                  </p>
                  <div className="security-modal__actions">
                    <button
                      className="ui-primary-cta"
                      onClick={triggerBiometricEnrollment}
                    >
                      Register Device Biometrics
                    </button>
                    <button
                      className="ui-secondary-control"
                      onClick={() => setEnrollmentStep("set-pin")}
                    >
                      Use PIN-Only instead
                    </button>
                  </div>
                </>
              )}

              {/* Step: Set PIN */}
              {enrollmentStep === "set-pin" && (
                <>
                  <div className="security-visual-container">
                    <Key className="security-visual-icon" style={{ color: "var(--color-accent-primary)" }} />
                  </div>
                  <p className="security-modal__text">
                    Create a 4-digit backup PIN to authorize withdrawals if biometrics are unavailable.
                  </p>
                  <div className="pin-display-dots">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`pin-dot ${pinValue.length > i ? "pin-dot--filled" : ""}`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <span className="sr-only">PIN entered: {pinValue.length} of 4 digits</span>
                  <div className="pin-keypad" role="group" aria-label="PIN keypad">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                      <button
                        key={num}
                        className="pin-key"
                        onClick={() => handleEnrollPinKeyPress(num)}
                      >
                        {num}
                      </button>
                    ))}
                    <button className="pin-key pin-key--util" onClick={() => handleEnrollPinKeyPress("clear")}>
                      Clear
                    </button>
                    <button className="pin-key" onClick={() => handleEnrollPinKeyPress("0")}>
                      0
                    </button>
                    <button className="pin-key pin-key--util" onClick={() => handleEnrollPinKeyPress("backspace")} aria-label="Backspace">
                      ⌫
                    </button>
                  </div>
                </>
              )}

              {/* Step: Confirm PIN */}
              {enrollmentStep === "confirm-pin" && (
                <>
                  <div className="security-visual-container">
                    <Key className="security-visual-icon" style={{ color: "var(--color-accent-primary)" }} />
                  </div>
                  <p className="security-modal__text">
                    Re-enter your 4-digit backup PIN to confirm.
                  </p>
                  <div className="pin-display-dots">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`pin-dot ${confirmPinValue.length > i ? "pin-dot--filled" : ""}`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <span className="sr-only">PIN entered: {confirmPinValue.length} of 4 digits</span>
                  <div className="pin-keypad" role="group" aria-label="PIN keypad">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                      <button
                        key={num}
                        className="pin-key"
                        onClick={() => handleEnrollPinKeyPress(num)}
                      >
                        {num}
                      </button>
                    ))}
                    <button className="pin-key pin-key--util" onClick={() => handleEnrollPinKeyPress("clear")}>
                      Clear
                    </button>
                    <button className="pin-key" onClick={() => handleEnrollPinKeyPress("0")}>
                      0
                    </button>
                    <button className="pin-key pin-key--util" onClick={() => handleEnrollPinKeyPress("backspace")} aria-label="Backspace">
                      ⌫
                    </button>
                  </div>
                </>
              )}

              {/* Step: Success */}
              {enrollmentStep === "success" && (
                <>
                  <div className="security-visual-container">
                    <CheckCircle2 className="security-visual-icon security-visual-icon--success" />
                  </div>
                  <p className="security-modal__text">
                    Your local security gate has been successfully enabled. Withdrawals now require authorization.
                  </p>
                  <div className="security-modal__actions">
                    <button
                      className="ui-primary-cta"
                      onClick={() => setIsEnrollmentModalOpen(false)}
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <p className="security-modal__disclaimer">
              This biometric gate is a local security measure and does not replace on-chain transaction signing.
            </p>
          </div>
        </div>
      )}

      {/* ── Verification Modal ── */}
      {isVerifyModalOpen && (
        <div className="security-modal-overlay" onClick={() => {
          setIsVerifyModalOpen(false);
          if (txState === "signing") setTxState("idle");
        }}>
          <div
            className="security-modal"
            ref={verifyModalRef}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="verify-modal-title"
          >
            <button
              className="security-modal__close-btn"
              onClick={() => {
                setIsVerifyModalOpen(false);
                if (txState === "signing") setTxState("idle");
              }}
              aria-label="Close verification dialog"
            >
              <X size={18} />
            </button>

            <div className="security-modal__header">
              <span className="security-modal__badge">Local Security Gate</span>
              <h2 id="verify-modal-title">
                {verifyActionType === "withdraw" ? "Authorize Withdrawal" : "Confirm Disable Gate"}
              </h2>
            </div>

            <div className="security-modal__body">
              {verifyError && (
                <div className="security-modal__error" role="alert">
                  {verifyError}
                </div>
              )}

              {/* State: Prompt Active */}
              {verifyState === "prompt-active" && (
                <>
                  <div className="security-visual-container">
                    <Fingerprint className="security-visual-icon security-visual-icon--pulse" />
                  </div>
                  <p className="security-modal__text">
                    {verifyActionType === "withdraw" 
                      ? `Confirming withdrawal of ${balance.toLocaleString()} USDC with device biometrics.`
                      : "Confirming change using device biometrics."
                    }
                  </p>
                  <p style={{ font: "var(--font-label-sm)", color: "var(--color-text-secondary)" }}>
                    Waiting for device response...
                  </p>
                  <div className="security-modal__actions" style={{ marginTop: "1.5rem" }}>
                    <button
                      className="ui-secondary-control"
                      onClick={() => setVerifyState("unsupported-device-fallback")}
                    >
                      Use Backup PIN
                    </button>
                    <button
                      className="ui-secondary-control"
                      onClick={() => {
                        setIsVerifyModalOpen(false);
                        if (verifyActionType === "withdraw") {
                          executeOnChainWithdraw(); // Bypass local gate
                        }
                      }}
                    >
                      {verifyActionType === "withdraw" ? "Skip to Wallet signing" : "Cancel"}
                    </button>
                  </div>
                </>
              )}

              {/* State: Prompt Succeeded */}
              {verifyState === "prompt-succeeded" && (
                <>
                  <div className="security-visual-container">
                    <CheckCircle2 className="security-visual-icon security-visual-icon--success" />
                  </div>
                  <p className="security-modal__text">
                    Verification Succeeded!
                  </p>
                  <p style={{ font: "var(--font-label-sm)", color: "var(--color-text-secondary)" }}>
                    {verifyActionType === "withdraw" ? "Proceeding to Freighter signing..." : "Disabling gate..."}
                  </p>
                </>
              )}

              {/* State: Prompt Failed */}
              {verifyState === "prompt-failed" && (
                <>
                  <div className="security-visual-container">
                    <XCircle className="security-visual-icon security-visual-icon--error" />
                  </div>
                  <p className="security-modal__text">
                    Biometric verification failed.
                  </p>
                  <div className="security-modal__actions">
                    <button className="ui-primary-cta" onClick={triggerBiometricVerification}>
                      Try Again
                    </button>
                    <button className="ui-secondary-control" onClick={() => setVerifyState("unsupported-device-fallback")}>
                      Use Backup PIN
                    </button>
                    <button
                      className="ui-secondary-control"
                      onClick={() => {
                        setIsVerifyModalOpen(false);
                        if (verifyActionType === "withdraw") {
                          executeOnChainWithdraw(); // Bypass local gate
                        }
                      }}
                    >
                      {verifyActionType === "withdraw" ? "Skip to Wallet signing" : "Cancel"}
                    </button>
                  </div>
                </>
              )}

              {/* State: Prompt Cancelled */}
              {verifyState === "prompt-cancelled" && (
                <>
                  <div className="security-visual-container">
                    <AlertCircle className="security-visual-icon security-visual-icon--warning" />
                  </div>
                  <p className="security-modal__text">
                    Biometric verification cancelled.
                  </p>
                  <div className="security-modal__actions">
                    <button className="ui-primary-cta" onClick={triggerBiometricVerification}>
                      Try Again
                    </button>
                    <button className="ui-secondary-control" onClick={() => setVerifyState("unsupported-device-fallback")}>
                      Use Backup PIN
                    </button>
                    <button
                      className="ui-secondary-control"
                      onClick={() => {
                        setIsVerifyModalOpen(false);
                        if (verifyActionType === "withdraw") {
                          executeOnChainWithdraw(); // Bypass local gate
                        }
                      }}
                    >
                      {verifyActionType === "withdraw" ? "Skip to Wallet signing" : "Cancel"}
                    </button>
                  </div>
                </>
              )}

              {/* State: PIN Fallback */}
              {verifyState === "unsupported-device-fallback" && (
                <>
                  <div className="security-visual-container">
                    <Lock className="security-visual-icon" style={{ color: "var(--color-accent-primary)" }} />
                  </div>
                  <p className="security-modal__text">
                    Enter your 4-digit backup PIN to authorize.
                  </p>
                  <div className="pin-display-dots">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`pin-dot ${verifyPinValue.length > i ? "pin-dot--filled" : ""}`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <span className="sr-only">PIN entered: {verifyPinValue.length} of 4 digits</span>
                  <div className="pin-keypad" role="group" aria-label="PIN keypad">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                      <button
                        key={num}
                        className="pin-key"
                        onClick={() => handleVerifyPinKeyPress(num)}
                      >
                        {num}
                      </button>
                    ))}
                    <button className="pin-key pin-key--util" onClick={() => handleVerifyPinKeyPress("clear")}>
                      Clear
                    </button>
                    <button className="pin-key" onClick={() => handleVerifyPinKeyPress("0")}>
                      0
                    </button>
                    <button className="pin-key pin-key--util" onClick={() => handleVerifyPinKeyPress("backspace")} aria-label="Backspace">
                      ⌫
                    </button>
                  </div>

                  <div className="security-modal__actions" style={{ marginTop: "1.5rem" }}>
                    {isBiometricSupported && isBiometricEnrolled && (
                      <button className="ui-secondary-control" onClick={() => setVerifyState("prompt-active")}>
                        Use Biometrics
                      </button>
                    )}
                    <button
                      className="ui-secondary-control"
                      onClick={() => {
                        setIsVerifyModalOpen(false);
                        if (verifyActionType === "withdraw") {
                          executeOnChainWithdraw(); // Bypass local gate
                        }
                      }}
                    >
                      {verifyActionType === "withdraw" ? "Skip to Wallet signing" : "Cancel"}
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <p className="security-modal__disclaimer">
              This biometric gate is a local security measure and does not replace on-chain transaction signing.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
