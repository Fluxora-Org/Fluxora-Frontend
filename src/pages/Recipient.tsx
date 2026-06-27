import { useEffect, useState, useRef } from "react";
import EmptyState from "../components/EmptyState";
import { RecipientStreams, type Stream } from "../components/recipient/RecipientStreams";
import RecipientLoading from "../components/RecipientLoading";
import ZeroAccrualBanner from "../components/ZeroAccrualBanner";
import { useWallet } from "../components/wallet-connect/Walletcontext";
import { useToast } from "../components/toast/ToastProvider";
import { useRecipientStreams } from "../components/treasuryOverviewPage/useTreasury";
import type { StreamRecord } from "../data/streamRecords";
import { withdraw } from "../lib/stellar/tx";
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
  const wallet = useWallet();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [txState, setTxState] = useState<"idle" | "signing" | "submitting" | "confirmed" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
      await withdraw(recipientAddr, streamId, amountStr);
      setTxState("confirmed");
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
        <EmptyState variant="recipient" walletConnected={walletConnected} />
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
    </main>
  );
}
