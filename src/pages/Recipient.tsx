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
import { TransactionReceiptPreview } from "../components/receipt/TransactionReceiptPreview";
import type { ReceiptData } from "../utils/receiptGenerator";
import { X, CheckCircle2 } from "lucide-react";
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
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recipientStreams = useRecipientStreams(wallet.address);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
      const txRes = await withdraw(recipientAddr, streamId, amountStr);
      setTxState("confirmed");
      const newReceipt: ReceiptData = {
        streamId: streamId || "1",
        type: "Withdrawal",
        sender: "Treasury Smart Contract",
        recipient: recipientAddr,
        amount: `${balance.toLocaleString()} USDC`,
        timestamp: new Date().toISOString(),
        txHash: typeof txRes === "string" ? txRes : null,
        status: typeof txRes === "string" ? "confirmed" : "pending",
        network: wallet.network || "Stellar Testnet",
      };
      setReceiptData(newReceipt);
      setShowReceiptModal(true);
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

      {/* ── Withdrawal Receipt Dialog Modal ── */}
      {showReceiptModal && receiptData && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="withdrawal-receipt-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-xl bg-[var(--surface-base)] border border-[var(--border-strong)] rounded-2xl p-6 shadow-2xl space-y-4 text-left max-h-[90vh] overflow-y-auto relative">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-400" />
                <h2 id="withdrawal-receipt-title" className="text-base font-bold text-[var(--text-vivid)]">
                  Withdrawal Confirmed
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-vivid)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                aria-label="Close withdrawal receipt modal"
              >
                <X size={18} />
              </button>
            </div>

            <TransactionReceiptPreview data={receiptData} />

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2 rounded-xl bg-[var(--surface-sunken)] hover:bg-[var(--surface-elevated)] border border-[var(--border-neutral)] text-[var(--text-vivid)] text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
