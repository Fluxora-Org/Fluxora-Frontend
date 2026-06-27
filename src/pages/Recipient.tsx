import { useEffect, useState } from "react";
import EmptyState from "../components/EmptyState";
import { RecipientStreams, type Stream } from "../components/recipient/RecipientStreams";
import RecipientLoading from "../components/RecipientLoading";
import ZeroAccrualBanner from "../components/ZeroAccrualBanner";
import { useWallet } from "../components/wallet-connect/Walletcontext";
import { useToast } from "../components/toast/ToastProvider";
import { withdraw } from "../lib/stellar/tx";
import "./Streams.css";
import "./Recipient.css";

export default function Recipient() {
  const wallet = useWallet();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [txState, setTxState] = useState<"idle" | "signing" | "submitting" | "confirmed" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(t);
  }, []);

  const fetchIncomingStreams = async (): Promise<Stream[]> => [
    { id: "1", sender: "Treasury", amount: "12000", status: "active" },
    { id: "2", sender: "Payroll", amount: "8600", status: "active" },
  ];

  const balance: number = 22600.0;
  const activeStreams = 2;
  const totalAccrued = 43250.0;
  const totalWithdrawn = 20650.0;

  const walletConnected = wallet.connected;
  const hasStreams = activeStreams > 0;

  const networkMismatch = wallet.connected && wallet.isNetworkMismatch;

  // Zero-accrual: connected + streams exist + no withdrawable balance yet
  const isZeroAccrual = walletConnected && hasStreams && balance === 0;
  
  const isPending = txState === "signing" || txState === "submitting";
  const disabled = !walletConnected || balance === 0 || networkMismatch || isPending;

  const handleWithdraw = async () => {
    if (disabled) return;
    setTxState("signing");
    setErrorMsg(null);

    const recipientAddr = wallet.address!;
    const amountStr = Math.floor(balance * 10_000_000).toString(); // Scale to 7 decimals
    const streamId = "1"; // Default stream ID

    try {
      setTxState("submitting");
      await withdraw(recipientAddr, streamId, amountStr);
      setTxState("confirmed");
      addToast("Withdrawal completed successfully on-chain!", "success");
      setTimeout(() => setTxState("idle"), 5000);
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
