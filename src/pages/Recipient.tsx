import { useEffect, useState, useRef, useCallback } from "react";
import RecipientEmptyState from "../components/RecipientEmptyState";
import {
  RecipientStreams,
  type Stream,
} from "../components/recipient/RecipientStreams";
import RecipientLoading from "../components/RecipientLoading";
import ZeroAccrualBanner from "../components/ZeroAccrualBanner";
import { useWallet } from "../components/wallet-connect/Walletcontext";
import { useToast } from "../components/toast/ToastProvider";
import { formatAssetAmount } from "../lib/formatters";
import type { StreamRecord } from "../data/streamRecords";
import { withdraw } from "../lib/stellar/tx";
import { getStreamStatusNotificationContent } from "../components/ToastNotification";
import { TransactionReceiptPreview } from "../components/receipt/TransactionReceiptPreview";
import {
  formatReceiptAmount,
  type ReceiptData,
} from "../utils/receiptGenerator";
import { config } from "../lib/config";
import {
  Shield,
  Fingerprint,
  Lock,
  Key,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
} from "lucide-react";
import RecipientMonthlySummary from "../components/recipient/RecipientMonthlySummary";
import "./Streams.css";
import "./Recipient.css";
import { useFaviconBadge } from "../utils/faviconBadge";
import { useModalAccessibility } from "../components/useModalAccessibility";
import { useRecipientPageData } from "./useRecipientPageData";

// (Removed top-level timeoutRef and useEffect; will be added inside component)

// Demo balances used as a UI fallback when the service returns no recipient
// streams (no live backend yet, or no seeded match for the connected address).
const USDC_SCALE = 10_000_000;
const USDC_DECIMALS = 7;
const DEMO_BALANCE = 22600.0;
const MAX_U64 = 18_446_744_073_709_551_615n;
const RECIPIENT_PAGE_TITLE = "Fluxora — Recipient portal";
const ALERTS_STORAGE_KEY = "fluxora.stream-alerts.enabled";

export type NotificationPermissionState =
  "default" | "granted" | "denied" | "unsupported";

function getBrowserNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window))
    return "unsupported";
  return window.Notification.permission;
}

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

export function getRecipientPageTitle(
  count: number,
  isTabFocused: boolean,
): string {
  if (isTabFocused || count <= 0) return RECIPIENT_PAGE_TITLE;

  const displayCount = count > 9 ? "9+" : count.toString();
  return `(${displayCount}) ${RECIPIENT_PAGE_TITLE}`;
}

export default function Recipient() {
  const wallet = useWallet();
  const { addToast } = useToast();
  const recipientData = useRecipientPageData({
    address: wallet.address,
    connected: wallet.connected,
  });
  const {
    streams: liveStreams,
    hasLiveStreams,
    hasStreams,
    walletConnected,
    balance,
    activeStreams,
    totalAccrued,
    totalWithdrawn,
    pageLoading,
    effectiveEmptyStateLoading,
    isRetryingDisabled,
    error: streamsError,
    retryCount,
    isRetryExhausted,
    retryButtonRef: pageRetryButtonRef,
    refetch: handlePageRefetch,
  } = recipientData;

  const [txState, setTxState] = useState<
    "idle" | "signing" | "submitting" | "confirmed" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isTabFocused, setIsTabFocused] = useState<boolean>(() =>
    typeof window === "undefined" ? true : document.hasFocus(),
  );
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermissionState>(getBrowserNotificationPermission);
  const [alertsEnabled, setAlertsEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(ALERTS_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [isPrimingNotifications, setIsPrimingNotifications] = useState(false);
  const [notificationState, setNotificationState] = useState<
    | "not-yet-asked"
    | "priming-shown"
    | "permission-granted"
    | "permission-denied"
    | "permission-denied-recovery-hint"
  >("not-yet-asked");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [enrollmentStep, setEnrollmentStep] = useState("check-support");
  const [pinValue, setPinValue] = useState("");
  const [confirmPinValue, setConfirmPinValue] = useState("");
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);

  // Verification Modal States
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyState, setVerifyState] = useState("prompt-active");
  const [verifyPinValue, setVerifyPinValue] = useState("");
  const [verifyActionType, setVerifyActionType] = useState("withdraw");
  const [verifyError, setVerifyError] = useState<string | null>(null);

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
          const isAvailable =
            await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
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
    const handleBlur = () => setIsTabFocused(false);
    const handleFocus = () => setIsTabFocused(true);

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      document.title = RECIPIENT_PAGE_TITLE;
    };
  }, []);

  const fetchIncomingStreams = useCallback(
    async (_cursor: string | null): Promise<{ streams: Stream[]; nextCursor: string | null }> => ({
      streams: [
        { id: "1", sender: "Treasury", amount: "12000", status: "active" },
        { id: "2", sender: "Payroll", amount: "8600", status: "active" },
      ],
      nextCursor: null,
    }),
    [],
  );

  const demoWithdrawStream: WithdrawStreamCandidate = {
    id: "1",
    status: "Active",
    withdrawableAmount: DEMO_BALANCE,
  };

  const withdrawStreamCandidates = walletConnected
    ? hasLiveStreams
      ? liveStreams
      : [demoWithdrawStream]
    : [];
  const pendingWithdrawalCount = withdrawStreamCandidates.filter(
    (stream) =>
      stream.status === "Active" &&
      stream.withdrawableAmount > 0 &&
      isValidWithdrawStreamId(stream.id),
  ).length;
  const selectedWithdrawStream = selectWithdrawStream(withdrawStreamCandidates);

  const networkMismatch = wallet.connected && wallet.isNetworkMismatch;

  useEffect(() => {
    document.title = getRecipientPageTitle(
      pendingWithdrawalCount,
      isTabFocused,
    );
  }, [isTabFocused, pendingWithdrawalCount]);

  useFaviconBadge(pendingWithdrawalCount);

  const setStoredAlertsEnabled = (enabled: boolean) => {
    setAlertsEnabled(enabled);
    try {
      window.localStorage.setItem(ALERTS_STORAGE_KEY, String(enabled));
    } catch {
      // The visual preference remains available for this session.
    }
  };

  const openNotificationPriming = () => {
    setNotificationState("priming-shown");
    setIsPrimingNotifications(true);
  };

  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      setNotificationState("permission-denied-recovery-hint");
      setIsPrimingNotifications(false);
      addToast(
        "Browser notifications are not available here. Stream updates remain in Fluxora.",
        "info",
      );
      return;
    }

    const permission = await window.Notification.requestPermission();
    setNotificationPermission(permission);
    setIsPrimingNotifications(false);
    if (permission === "granted") {
      setNotificationState("permission-granted");
      setStoredAlertsEnabled(true);
      addToast("Stream alerts are enabled.", "success");
    } else {
      setNotificationState(
        permission === "denied"
          ? "permission-denied-recovery-hint"
          : "permission-denied",
      );
      addToast(
        "No browser permission was granted. You can try again from stream settings.",
        "info",
      );
    }
  };

  const notificationPreview = getStreamStatusNotificationContent(
    "new-stream",
    "a new USDC stream",
  );

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
      setVerifyState(
        isBiometricEnrolled && isBiometricSupported
          ? "prompt-active"
          : "unsupported-device-fallback",
      );
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
      if (
        typeof window !== "undefined" &&
        window.PublicKeyCredential &&
        navigator.credentials?.create
      ) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const options = {
          publicKey: {
            challenge,
            rp: { name: "Fluxora" },
            user: {
              id: new Uint8Array([1, 2, 3, 4]),
              name: "recipient@fluxora.xyz",
              displayName: "Recipient",
            },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required",
            },
            timeout: 60000,
          },
        } as CredentialCreationOptions;
        await navigator.credentials.create(options);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      localStorage.setItem("fluxora_biometric_enrolled", "true");
      setIsBiometricEnrolled(true);
      setEnrollmentStep("set-pin");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to register biometrics.";
      setEnrollmentError(message);
    }
  };

  const triggerBiometricVerification = async () => {
    setVerifyState("prompt-active");
    setVerifyError(null);
    try {
      if (
        typeof window !== "undefined" &&
        window.PublicKeyCredential &&
        navigator.credentials?.get
      ) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const options = {
          publicKey: {
            challenge,
            timeout: 60000,
            userVerification: "required" as const,
          },
        } as CredentialRequestOptions;
        await navigator.credentials.get(options);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      handleVerificationSuccess();
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      if (error.name === "NotAllowedError" || error.name === "AbortError") {
        setVerifyState("prompt-cancelled");
      } else {
        setVerifyState("prompt-failed");
        setVerifyError(error.message || "Biometric verification failed.");
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

  const handleEnrollPinKeyPress = (key: string) => {
    setEnrollmentError(null);
    const activePin = enrollmentStep === "set-pin" ? pinValue : confirmPinValue;
    const setActivePin =
      enrollmentStep === "set-pin" ? setPinValue : setConfirmPinValue;

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

  const handleVerifyPinKeyPress = (key: string) => {
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
      setVerifyState(
        isBiometricEnrolled && isBiometricSupported
          ? "prompt-active"
          : "unsupported-device-fallback",
      );
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
        amount: formatReceiptAmount(amountStr, USDC_DECIMALS, "USDC"),
        timestamp: new Date().toISOString(),
        txHash: typeof txRes === "string" ? txRes : null,
        status: typeof txRes === "string" ? "confirmed" : "pending",
        network: config.networkLabel,
      };
      setReceiptData(newReceipt);
      setShowReceiptModal(true);
      addToast("Withdrawal completed successfully on-chain!", "success");
      timerRef.current = setTimeout(() => setTxState("idle"), 5000);
    } catch (err: unknown) {
      const error = err as Error;
      setTxState("error");
      setErrorMsg(error.message || "Withdrawal failed.");
      addToast(`Withdrawal failed: ${error.message || error}`, "error");
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
        return `Withdraw ${formatAssetAmount(balance, "USDC")}`;
    }
  };

  if (pageLoading || isRetryExhausted) {
    return (
      <RecipientLoading retryCount={retryCount} onRetry={handlePageRefetch} />
    );
  }

  // Show empty-state path when:
  //   - wallet is disconnected, OR
  //   - no active streams for the connected wallet (including service errors,
  //     where we must not silently fall through to demo-balance values)
  const serviceError = walletConnected ? streamsError : null;
  if (!walletConnected || !hasStreams || serviceError) {
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
        <RecipientEmptyState
          walletConnected={walletConnected}
          loading={effectiveEmptyStateLoading}
          error={walletConnected ? streamsError : null}
          onRetry={walletConnected ? handlePageRefetch : undefined}
          ctaDisabled={isRetryingDisabled}
          retryButtonRef={pageRetryButtonRef}
        />

        {/* ── Local Security Gate (shown even without streams) ── */}
        {walletConnected && (
          <section
            className="security-gate-section"
            aria-labelledby="security-gate-title"
          >
            <div className="security-gate-card">
              <div className="security-gate-card__header">
                <div className="security-gate-icon-container">
                  <Shield className="security-gate-icon" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="security-gate-title">Local Security Gate</h2>
                  <p className="security-gate-description">
                    Add an optional biometric or PIN confirmation step before
                    each withdrawal. This is a local UX gate only and does not
                    replace your wallet's cryptographic signing prompt.
                  </p>
                </div>
              </div>
              <div className="security-gate-card__actions">
                <div className="security-gate-status">
                  <span className="security-status-label">Status:</span>
                  <span
                    className={`security-status-badge ${isSecurityGateEnabled ? "security-status-badge--active" : "security-status-badge--inactive"}`}
                    aria-live="polite"
                    role="status"
                    aria-label={`Local Security Gate status: ${isSecurityGateEnabled ? "Active" : "Disabled"}`}
                  >
                    {isSecurityGateEnabled ? "Active" : "Disabled"}
                  </span>
                </div>
                <button
                  type="button"
                  className={`streams-primary-button security-gate-toggle-btn ${isSecurityGateEnabled ? "danger" : ""}`}
                  onClick={handleToggleSecurityGate}
                >
                  {isSecurityGateEnabled ? "Disable" : "Enable"}
                </button>
                {isSecurityGateEnabled && (
                  <button
                    type="button"
                    className="security-gate-pin-btn"
                    onClick={handleUpdatePIN}
                    aria-label="Update backup PIN"
                  >
                    <Key size={14} aria-hidden="true" /> Update PIN
                  </button>
                )}
              </div>
            </div>
          </section>
        )}
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
            <p
              className="validation-message validation-message--error"
              style={{ color: "var(--color-danger)", marginTop: "1rem" }}
              role="alert"
            >
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
          <strong>{formatAssetAmount(totalAccrued, "USDC")}</strong>
          <p>Total amount earned over the lifetime of all streams.</p>
        </div>
        <div className="streams-summary-card">
          <span>Withdrawn</span>
          <strong>{formatAssetAmount(totalWithdrawn, "USDC")}</strong>
          <p>Total funds already transferred to your wallet.</p>
        </div>
        <div className="streams-summary-card">
          <span>Withdrawable now</span>
          <strong style={{ color: "var(--accent)" }}>
            {formatAssetAmount(balance, "USDC")}
          </strong>
          <p>Available for immediate withdrawal.</p>
        </div>
      </section>

      {/* ── Printable Monthly Summary ── */}
      {hasLiveStreams && <RecipientMonthlySummary streams={liveStreams} />}

      <section
        className="recipient-alerts-panel"
        aria-labelledby="stream-alerts-title"
      >
        <div>
          <p className="recipient-alerts-eyebrow">Optional alerts</p>
          <h2 id="stream-alerts-title">Know when your stream changes</h2>
          <p>
            Get a browser notification when a cliff passes, a stream is fully
            accrued, or a new stream arrives.
          </p>
        </div>
        {alertsEnabled && notificationPermission === "granted" ? (
          <button
            type="button"
            className="recipient-alerts-toggle"
            onClick={() => setStoredAlertsEnabled(false)}
            aria-pressed="true"
          >
            Alerts on · Turn off
          </button>
        ) : (
          <button
            type="button"
            className="recipient-alerts-toggle"
            onClick={openNotificationPriming}
          >
            Notify me
          </button>
        )}
        {notificationState === "permission-denied-recovery-hint" && (
          <p className="recipient-alerts-recovery" role="status">
            Permission is blocked by your browser. Allow notifications for
            Fluxora in site settings, then choose Notify me again.
          </p>
        )}
      </section>

      {isPrimingNotifications && (
        <div
          className="recipient-alerts-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setIsPrimingNotifications(false);
          }}
        >
          <section
            className="recipient-alerts-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-priming-title"
            aria-describedby="notification-priming-description"
          >
            <p className="recipient-alerts-eyebrow">
              Before browser permission
            </p>
            <h2 id="notification-priming-title">
              Keep stream milestones in view
            </h2>
            <p id="notification-priming-description">
              Fluxora will notify you only when one of these happens:
            </p>
            <ul>
              <li>A stream cliff passes</li>
              <li>A stream becomes fully accrued</li>
              <li>You receive a new stream</li>
            </ul>
            <div
              className="recipient-alerts-preview"
              aria-label="Example notification"
            >
              <img
                src={notificationPreview.icon}
                alt=""
                width="24"
                height="24"
              />
              <span>
                <strong>{notificationPreview.title}</strong>
                <small>{notificationPreview.body}</small>
              </span>
            </div>
            <p className="recipient-alerts-note">
              You can turn Fluxora alerts off here later. Browser permission can
              be changed in your site settings.
            </p>
            <div className="recipient-alerts-actions">
              <button
                type="button"
                className="recipient-alerts-secondary"
                onClick={() => setIsPrimingNotifications(false)}
              >
                Not now
              </button>
              <button
                type="button"
                className="recipient-alerts-primary"
                onClick={() => void enableNotifications()}
              >
                Allow stream alerts
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ── Local Security Gate Settings ── */}
      <section
        className="security-gate-section"
        aria-labelledby="security-gate-title"
      >
        <div className="security-gate-card">
          <div className="security-gate-card__header">
            <div className="security-gate-icon-container">
              <Shield className="security-gate-icon" aria-hidden="true" />
            </div>
            <div>
              <h2 id="security-gate-title">Local Security Gate</h2>
              <p className="security-gate-description">
                Add an optional biometric or PIN confirmation step before each
                withdrawal. This is a local UX gate only and does not replace
                your wallet's cryptographic signing prompt.
              </p>
            </div>
          </div>
          <div className="security-gate-card__actions">
            <div className="security-gate-status">
              <span className="security-status-label">Status:</span>
              <span
                className={`security-status-badge ${isSecurityGateEnabled ? "security-status-badge--active" : "security-status-badge--inactive"}`}
                aria-live="polite"
                role="status"
                aria-label={`Local Security Gate status: ${isSecurityGateEnabled ? "Active" : "Disabled"}`}
              >
                {isSecurityGateEnabled ? "Active" : "Disabled"}
              </span>
            </div>
            <button
              type="button"
              className={`streams-primary-button security-gate-toggle-btn ${isSecurityGateEnabled ? "danger" : ""}`}
              onClick={handleToggleSecurityGate}
            >
              {isSecurityGateEnabled ? "Disable" : "Enable"}
            </button>
            {isSecurityGateEnabled && (
              <button
                type="button"
                className="security-gate-pin-btn"
                onClick={handleUpdatePIN}
                aria-label="Update backup PIN"
              >
                <Key size={14} aria-hidden="true" /> Update PIN
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Enrollment Modal ── */}
      {isEnrollmentModalOpen && (
        <div
          className="security-modal-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsEnrollmentModalOpen(false);
          }}
        >
          <div
            className="security-modal"
            ref={enrollmentModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="enrollment-modal-title"
          >
            <button
              type="button"
              className="security-modal__close-btn"
              onClick={() => setIsEnrollmentModalOpen(false)}
              aria-label="Close enrollment dialog"
            >
              <X size={18} />
            </button>

            <div className="security-modal__header">
              <span className="security-modal__badge">
                {enrollmentStep === "success" ? "Complete" : "Setup"}
              </span>
              <h2 id="enrollment-modal-title">
                {enrollmentStep === "check-support" && "Setup Security Gate"}
                {enrollmentStep === "set-pin" && "Set Security PIN"}
                {enrollmentStep === "confirm-pin" && "Confirm Security PIN"}
                {enrollmentStep === "success" && "Setup Complete!"}
              </h2>
            </div>

            <div className="security-modal__body">
              {/* Step: check-support — biometric enrollment */}
              {enrollmentStep === "check-support" && (
                <>
                  <div className="security-visual-container">
                    <Fingerprint
                      className="security-visual-icon security-visual-icon--pulse"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="security-modal__text">
                    Register your device biometrics (Touch ID, Face ID, or
                    Windows Hello) as an additional confirmation step before
                    each withdrawal.
                  </p>
                  {enrollmentError && (
                    <div className="security-modal__error" role="alert">
                      {enrollmentError}
                    </div>
                  )}
                  <div className="security-modal__actions">
                    <button
                      type="button"
                      className="streams-primary-button"
                      onClick={triggerBiometricEnrollment}
                    >
                      <Fingerprint size={16} aria-hidden="true" /> Register
                      Device Biometrics
                    </button>
                    <button
                      type="button"
                      className="streams-secondary-button"
                      onClick={() => setEnrollmentStep("set-pin")}
                    >
                      Skip — use PIN only
                    </button>
                  </div>
                </>
              )}

              {/* Step: set-pin — first PIN entry */}
              {enrollmentStep === "set-pin" && (
                <>
                  <div className="security-visual-container">
                    <Lock className="security-visual-icon" aria-hidden="true" />
                  </div>
                  <p className="security-modal__text">
                    Set a 4-digit backup PIN. You can use this if biometrics are
                    unavailable on your device.
                  </p>
                  {enrollmentError && (
                    <div className="security-modal__error" role="alert">
                      {enrollmentError}
                    </div>
                  )}
                  <div
                    className="pin-display-dots"
                    aria-label={`PIN entry: ${pinValue.length} of 4 digits entered`}
                  >
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={`pin-dot ${i < pinValue.length ? "pin-dot--filled" : ""}`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <div
                    className="pin-keypad"
                    role="group"
                    aria-label="PIN keypad"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className="pin-key"
                        onClick={() => handleEnrollPinKeyPress(String(n))}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="pin-key pin-key--util"
                      onClick={() => handleEnrollPinKeyPress("clear")}
                      aria-label="Clear"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      className="pin-key"
                      onClick={() => handleEnrollPinKeyPress("0")}
                    >
                      0
                    </button>
                    <button
                      type="button"
                      className="pin-key pin-key--util"
                      onClick={() => handleEnrollPinKeyPress("backspace")}
                      aria-label="Backspace"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
                        <line x1="18" y1="9" x2="12" y2="15" />
                        <line x1="12" y1="9" x2="18" y2="15" />
                      </svg>
                    </button>
                  </div>
                </>
              )}

              {/* Step: confirm-pin — verify PIN match */}
              {enrollmentStep === "confirm-pin" && (
                <>
                  <div className="security-visual-container">
                    <Key className="security-visual-icon" aria-hidden="true" />
                  </div>
                  <p className="security-modal__text">
                    Re-enter your 4-digit PIN to confirm.
                  </p>
                  {enrollmentError && (
                    <div className="security-modal__error" role="alert">
                      {enrollmentError}
                    </div>
                  )}
                  <div
                    className="pin-display-dots"
                    aria-label={`PIN confirmation: ${confirmPinValue.length} of 4 digits entered`}
                  >
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={`pin-dot ${i < confirmPinValue.length ? "pin-dot--filled" : ""}`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <div
                    className="pin-keypad"
                    role="group"
                    aria-label="PIN confirmation keypad"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className="pin-key"
                        onClick={() => handleEnrollPinKeyPress(String(n))}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="pin-key pin-key--util"
                      onClick={() => handleEnrollPinKeyPress("clear")}
                      aria-label="Clear"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      className="pin-key"
                      onClick={() => handleEnrollPinKeyPress("0")}
                    >
                      0
                    </button>
                    <button
                      type="button"
                      className="pin-key pin-key--util"
                      onClick={() => handleEnrollPinKeyPress("backspace")}
                      aria-label="Backspace"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
                        <line x1="18" y1="9" x2="12" y2="15" />
                        <line x1="12" y1="9" x2="18" y2="15" />
                      </svg>
                    </button>
                  </div>
                </>
              )}

              {/* Step: success */}
              {enrollmentStep === "success" && (
                <>
                  <div className="security-visual-container">
                    <CheckCircle2
                      className="security-visual-icon security-visual-icon--success"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="security-modal__text">
                    Your local security gate is now active. You'll be asked to
                    confirm with biometrics or your backup PIN before each
                    withdrawal.
                  </p>
                  <div className="security-modal__actions">
                    <button
                      type="button"
                      className="streams-primary-button"
                      onClick={() => setIsEnrollmentModalOpen(false)}
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>

            <p className="security-modal__disclaimer">
              This is a local UX gate only. Your private keys are never exposed.
              The wallet's own signing prompt handles cryptographic transaction
              authorization.
            </p>
          </div>
        </div>
      )}

      {/* ── Verification Modal ── */}
      {isVerifyModalOpen && (
        <div
          className="security-modal-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setIsVerifyModalOpen(false);
              if (txState === "signing") setTxState("idle");
            }
          }}
        >
          <div
            className="security-modal"
            ref={verifyModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="verify-modal-title"
          >
            <button
              type="button"
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
              <span className="security-modal__badge">Verify Identity</span>
              <h2 id="verify-modal-title">
                {verifyState === "prompt-active" && "Authorize Withdrawal"}
                {verifyState === "prompt-succeeded" && "Verification Passed"}
                {verifyState === "prompt-failed" && "Verification Failed"}
                {verifyState === "prompt-cancelled" && "Verification Cancelled"}
                {verifyState === "unsupported-device-fallback" &&
                  "Enter Backup PIN"}
              </h2>
            </div>

            <div className="security-modal__body">
              {/* Biometric prompt — waiting for Touch ID / Face ID / Hello */}
              {verifyState === "prompt-active" && (
                <>
                  <div className="security-visual-container">
                    <Fingerprint
                      className="security-visual-icon security-visual-icon--pulse"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="security-modal__text">
                    Confirm your identity using your device biometrics.
                  </p>
                  <div className="security-modal__actions">
                    <button
                      type="button"
                      className="streams-secondary-button"
                      onClick={() => {
                        setIsVerifyModalOpen(false);
                        executeOnChainWithdraw();
                      }}
                    >
                      Skip to Wallet signing
                    </button>
                  </div>
                </>
              )}

              {/* Biometric succeeded */}
              {verifyState === "prompt-succeeded" && (
                <>
                  <div className="security-visual-container">
                    <CheckCircle2
                      className="security-visual-icon security-visual-icon--success"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="security-modal__text">
                    Identity verified. Proceeding to withdrawal…
                  </p>
                </>
              )}

              {/* Biometric failed */}
              {verifyState === "prompt-failed" && (
                <>
                  <div className="security-visual-container">
                    <XCircle
                      className="security-visual-icon security-visual-icon--error"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="security-modal__text">
                    Biometric verification failed. You can try again or use your
                    backup PIN.
                  </p>
                  {verifyError && (
                    <div className="security-modal__error" role="alert">
                      {verifyError}
                    </div>
                  )}
                  <div className="security-modal__actions">
                    <button
                      type="button"
                      className="streams-primary-button"
                      onClick={() => triggerBiometricVerification()}
                    >
                      <Fingerprint size={16} aria-hidden="true" /> Try Again
                    </button>
                    <button
                      type="button"
                      className="streams-secondary-button"
                      onClick={() =>
                        setVerifyState("unsupported-device-fallback")
                      }
                    >
                      Use Backup PIN
                    </button>
                  </div>
                </>
              )}

              {/* Biometric cancelled by user */}
              {verifyState === "prompt-cancelled" && (
                <>
                  <div className="security-visual-container">
                    <AlertCircle
                      className="security-visual-icon security-visual-icon--warning"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="security-modal__text">
                    Verification was cancelled. You can try again or use your
                    backup PIN.
                  </p>
                  <div className="security-modal__actions">
                    <button
                      type="button"
                      className="streams-primary-button"
                      onClick={() => triggerBiometricVerification()}
                    >
                      <Fingerprint size={16} aria-hidden="true" /> Try Again
                    </button>
                    <button
                      type="button"
                      className="streams-secondary-button"
                      onClick={() =>
                        setVerifyState("unsupported-device-fallback")
                      }
                    >
                      Use Backup PIN
                    </button>
                  </div>
                </>
              )}

              {/* PIN fallback — unsupported device or user chose to skip */}
              {verifyState === "unsupported-device-fallback" && (
                <>
                  <div className="security-visual-container">
                    <Lock className="security-visual-icon" aria-hidden="true" />
                  </div>
                  <p className="security-modal__text">
                    Enter your 4-digit backup PIN to confirm this withdrawal.
                  </p>
                  {verifyError && (
                    <div className="security-modal__error" role="alert">
                      {verifyError}
                    </div>
                  )}
                  <div
                    className="pin-display-dots"
                    aria-label={`PIN entry: ${verifyPinValue.length} of 4 digits entered`}
                  >
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={`pin-dot ${i < verifyPinValue.length ? "pin-dot--filled" : ""}`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <div
                    className="pin-keypad"
                    role="group"
                    aria-label="Backup PIN keypad"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className="pin-key"
                        onClick={() => handleVerifyPinKeyPress(String(n))}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="pin-key pin-key--util"
                      onClick={() => handleVerifyPinKeyPress("clear")}
                      aria-label="Clear"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      className="pin-key"
                      onClick={() => handleVerifyPinKeyPress("0")}
                    >
                      0
                    </button>
                    <button
                      type="button"
                      className="pin-key pin-key--util"
                      onClick={() => handleVerifyPinKeyPress("backspace")}
                      aria-label="Backspace"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
                        <line x1="18" y1="9" x2="12" y2="15" />
                        <line x1="12" y1="9" x2="18" y2="15" />
                      </svg>
                    </button>
                  </div>
                  {isBiometricSupported && isBiometricEnrolled && (
                    <button
                      type="button"
                      className="streams-secondary-button"
                      onClick={() => {
                        setVerifyState("prompt-active");
                        triggerBiometricVerification();
                      }}
                    >
                      <Fingerprint size={16} aria-hidden="true" /> Use
                      Biometrics Instead
                    </button>
                  )}
                </>
              )}
            </div>

            <p className="security-modal__disclaimer">
              This is a local UX gate only. The wallet's own signing prompt
              handles cryptographic transaction authorization.
            </p>
          </div>
        </div>
      )}

      {/* ── Streams List ── */}
      <section className="streams-list-shell">
        <div className="streams-list-head">
          <div>
            <h2>Incoming streams</h2>
            <p className="streams-subtitle">
              Review and manage each individual stream currently committing
              funds to you.
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
                <h2
                  id="withdrawal-receipt-title"
                  className="text-base font-bold text-[var(--text-vivid)]"
                >
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
