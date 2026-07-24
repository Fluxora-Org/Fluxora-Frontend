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
import { getStreamStatusNotificationContent } from "../components/ToastNotification";
import { TransactionReceiptPreview } from "../components/receipt/TransactionReceiptPreview";
import type { ReceiptData } from "../utils/receiptGenerator";
import { X, CheckCircle2 } from "lucide-react";
import "./Streams.css";
import "./Recipient.css";

// Demo balances used as a UI fallback when the service returns no recipient
// streams (no live backend yet, or no seeded match for the connected address).
const DEMO_BALANCE = 22600.0;
const DEMO_ACTIVE = 2;
const DEMO_TOTAL_ACCRUED = 43250.0;
const DEMO_TOTAL_WITHDRAWN = 20650.0;
const USDC_SCALE = 10_000_000;
const MAX_U64 = 18_446_744_073_709_551_615n;
const ALERTS_STORAGE_KEY = "fluxora.stream-alerts.enabled";

export type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported";

function getBrowserNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
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

export default function Recipient() {
  const timeoutRef = useRef<number | null>(null);
  const wallet = useWallet();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [txState, setTxState] = useState<"idle" | "signing" | "submitting" | "confirmed" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>(getBrowserNotificationPermission);
  const [alertsEnabled, setAlertsEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(ALERTS_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [isPrimingNotifications, setIsPrimingNotifications] = useState(false);
  const [notificationState, setNotificationState] = useState<"not-yet-asked" | "priming-shown" | "permission-granted" | "permission-denied" | "permission-denied-recovery-hint">("not-yet-asked");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recipientStreams = useRecipientStreams(wallet.address);

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
      addToast("Browser notifications are not available here. Stream updates remain in Fluxora.", "info");
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
      setNotificationState(permission === "denied" ? "permission-denied-recovery-hint" : "permission-denied");
      addToast("No browser permission was granted. You can try again from stream settings.", "info");
    }
  };

  const notificationPreview = getStreamStatusNotificationContent("new-stream", "a new USDC stream");

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

  const handleWithdraw = async () => {
    if (disabled) return;
    setTxState("signing");
    setErrorMsg(null);

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
    } catch (err: any) {
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

      <section className="recipient-alerts-panel" aria-labelledby="stream-alerts-title">
        <div>
          <p className="recipient-alerts-eyebrow">Optional alerts</p>
          <h2 id="stream-alerts-title">Know when your stream changes</h2>
          <p>Get a browser notification when a cliff passes, a stream is fully accrued, or a new stream arrives.</p>
        </div>
        {alertsEnabled && notificationPermission === "granted" ? (
          <button type="button" className="recipient-alerts-toggle" onClick={() => setStoredAlertsEnabled(false)} aria-pressed="true">
            Alerts on · Turn off
          </button>
        ) : (
          <button type="button" className="recipient-alerts-toggle" onClick={openNotificationPriming}>
            Notify me
          </button>
        )}
        {notificationState === "permission-denied-recovery-hint" && (
          <p className="recipient-alerts-recovery" role="status">
            Permission is blocked by your browser. Allow notifications for Fluxora in site settings, then choose Notify me again.
          </p>
        )}
      </section>

      {isPrimingNotifications && (
        <div className="recipient-alerts-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsPrimingNotifications(false);
        }}>
          <section className="recipient-alerts-dialog" role="dialog" aria-modal="true" aria-labelledby="notification-priming-title" aria-describedby="notification-priming-description">
            <p className="recipient-alerts-eyebrow">Before browser permission</p>
            <h2 id="notification-priming-title">Keep stream milestones in view</h2>
            <p id="notification-priming-description">Fluxora will notify you only when one of these happens:</p>
            <ul>
              <li>A stream cliff passes</li>
              <li>A stream becomes fully accrued</li>
              <li>You receive a new stream</li>
            </ul>
            <div className="recipient-alerts-preview" aria-label="Example notification">
              <img src={notificationPreview.icon} alt="" width="24" height="24" />
              <span><strong>{notificationPreview.title}</strong><small>{notificationPreview.body}</small></span>
            </div>
            <p className="recipient-alerts-note">You can turn Fluxora alerts off here later. Browser permission can be changed in your site settings.</p>
            <div className="recipient-alerts-actions">
              <button type="button" className="recipient-alerts-secondary" onClick={() => setIsPrimingNotifications(false)}>Not now</button>
              <button type="button" className="recipient-alerts-primary" onClick={() => void enableNotifications()}>Allow stream alerts</button>
            </div>
          </section>
        </div>
      )}

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
