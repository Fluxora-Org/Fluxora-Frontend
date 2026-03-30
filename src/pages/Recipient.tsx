import { useState } from "react";
import TransactionFeedbackModal, {
  type TransactionFeedbackState,
} from "../components/TransactionFeedbackModal";
import { simulateTransaction } from "../lib/transactionFeedback";

type WithdrawFeedback = {
  amount: number;
  completedAt?: string;
  destination: string;
  errorMessage?: string;
  ledgerLabel?: string;
  status: TransactionFeedbackState;
  transactionHash?: string;
};

export default function Recipient() {
  const [balance, setBalance] = useState(22600.0);
  const [activeStreams] = useState(2);
  const [totalAccrued] = useState(43250.0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(20650.0);
  const [withdrawFeedback, setWithdrawFeedback] =
    useState<WithdrawFeedback | null>(null);
  const walletConnected = true;
  const walletAddress = "GBRP...9XZ2";

  const disabled = !walletConnected || balance === 0;

  const handleWithdraw = async () => {
    if (disabled) return;

    const amountToWithdraw = balance;

    setWithdrawFeedback({
      amount: amountToWithdraw,
      destination: walletAddress,
      status: "pending",
    });

    try {
      const outcome = await simulateTransaction({
        actionLabel: "Withdrawal",
        delayMs: 1600,
      });

      setBalance(0);
      setTotalWithdrawn((current) => current + amountToWithdraw);
      setWithdrawFeedback({
        amount: amountToWithdraw,
        completedAt: outcome.completedAt,
        destination: walletAddress,
        ledgerLabel: outcome.ledgerLabel,
        status: "success",
        transactionHash: outcome.transactionHash,
      });
    } catch (error) {
      setWithdrawFeedback({
        amount: amountToWithdraw,
        destination: walletAddress,
        errorMessage:
          error instanceof Error
            ? error.message
            : "We couldn't submit the withdrawal right now.",
        status: "failure",
      });
    }
  };

  const withdrawActions = withdrawFeedback
    ? withdrawFeedback.status === "success"
      ? [
          {
            label: "Close receipt",
            onClick: () => setWithdrawFeedback(null),
            autoFocus: true,
          },
        ]
      : withdrawFeedback.status === "failure"
        ? [
            {
              label: "Retry withdrawal",
              onClick: () => void handleWithdraw(),
              autoFocus: true,
            },
            {
              label: "Dismiss",
              onClick: () => setWithdrawFeedback(null),
              variant: "ghost" as const,
            },
          ]
        : []
    : [];

  const withdrawDetails = withdrawFeedback
    ? withdrawFeedback.status === "success"
      ? [
          {
            label: "Amount released",
            value: `${withdrawFeedback.amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} USDC`,
          },
          { label: "Destination", value: withdrawFeedback.destination, mono: true },
          {
            label: "Transaction hash",
            value: withdrawFeedback.transactionHash ?? "Pending hash",
            mono: true,
          },
          {
            label: "Finalized",
            value: `${withdrawFeedback.completedAt} • ${withdrawFeedback.ledgerLabel}`,
          },
        ]
      : [
          {
            label: "Amount requested",
            value: `${withdrawFeedback.amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} USDC`,
          },
          { label: "Destination", value: withdrawFeedback.destination, mono: true },
          {
            label: "Streams covered",
            value: `${activeStreams} active incoming streams`,
          },
        ]
    : [];

  return (
    <div>
      <h1 style={{ marginTop: 0, fontSize: "2rem", fontWeight: 700 }}>
        Your streams
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
        View your incoming streams and withdraw accrued USDC at any time.
      </p>
      <div style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <div style={cardLabel}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="20px"
                viewBox="0 -960 960 960"
                width="20px"
                fill="var(--accent-soft)"
              >
                <path d="m136-240-56-56 296-298 160 160 208-206H640v-80h240v240h-80v-104L536-320 376-480 136-240Z" />
              </svg>{" "}
              WITHDRAWABLE BALANCE
            </div>
            <div style={cardValue}>
              {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              <span
                style={{
                  fontSize: "2rem",
                  color: "var(--muted)",
                  fontWeight: 500,
                }}
              >
                USDC
              </span>
            </div>
            <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
              {balance > 0
                ? "Available to withdraw immediately"
                : "Your available balance is fully settled"}
            </div>
          </div>
          <button
            style={button(disabled)}
            disabled={disabled}
            onClick={() => void handleWithdraw()}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="15px"
              viewBox="0 -960 960 960"
              width="15px"
              fill="white"
            >
              <path d="M160-160v-640 640Zm0 80q-33 0-56.5-23.5T80-160v-640q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v320h-80v-320H160v640h200v80H160Zm72-140h16q14 0 23-9t9-23v-48h80v-80h-80v-120h480v-16l-66-192q-5-14-16.5-23t-25.5-9H308q-14 0-25.5 9T266-708l-66 192v264q0 14 9 23t23 9Zm74-360 28-80h292l28 80H306Zm82.5 168.5Q400-423 400-440t-11.5-28.5Q377-480 360-480t-28.5 11.5Q320-457 320-440t11.5 28.5Q343-400 360-400t28.5-11.5ZM557-140h246q5-21 20.5-36.5T860-197v-86q-21-5-36.5-20.5T803-340H557q-5 21-20.5 36.5T500-283v86q21 5 36.5 20.5T557-140Zm165.5-57.5Q740-215 740-240t-17.5-42.5Q705-300 680-300t-42.5 17.5Q620-265 620-240t17.5 42.5Q655-180 680-180t42.5-17.5ZM520-80q-33 0-56.5-23.5T440-160v-160q0-33 23.5-56.5T520-400h320q33 0 56.5 23.5T920-320v160q0 33-23.5 56.5T840-80H520Z" />
            </svg>
            Withdraw USDC
          </button>
        </div>

        <div style={divider} />
        <div style={statsRow}>
          <div>
            <div style={statLabel}>Active streams</div>
            <div style={statValue}>{activeStreams}</div>
          </div>

          <div>
            <div style={statLabel}>Total accrued</div>
            <div style={statValue}>
              {totalAccrued.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}{" "}
              USDC
            </div>
          </div>

          <div>
            <div style={statLabel}>Total withdrawn</div>
            <div style={statValue}>
              {totalWithdrawn.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}{" "}
              USDC
            </div>
          </div>
        </div>
      </div>

      <TransactionFeedbackModal
        isOpen={!!withdrawFeedback}
        state={withdrawFeedback?.status ?? "pending"}
        title={
          withdrawFeedback?.status === "success"
            ? "Withdrawal complete"
            : withdrawFeedback?.status === "failure"
              ? "We couldn't release your funds"
              : "Submitting withdrawal"
        }
        description={
          withdrawFeedback?.status === "success"
            ? "Your accrued USDC was released to the connected wallet successfully."
            : withdrawFeedback?.status === "failure"
              ? withdrawFeedback?.errorMessage ??
                "The wallet or network rejected the withdrawal before final submission."
              : "Confirm the withdrawal in your wallet. We'll keep this screen updated until the transaction settles."
        }
        details={withdrawDetails}
        note={
          withdrawFeedback?.status === "success"
            ? "Balances on this page were updated after settlement. If another stream accrues, a new withdrawable balance will appear here."
            : withdrawFeedback?.status === "failure"
              ? "No funds were moved on-chain. Retry when your wallet is ready or when your connection is stable."
              : "Pending withdrawals can take a few seconds on testnet. Keep this screen open until the final status appears."
        }
        actions={withdrawActions}
        dismissible={withdrawFeedback?.status !== "pending"}
        onClose={() => setWithdrawFeedback(null)}
      />
    </div>
  );
}

const card: React.CSSProperties = {
  marginTop: "1.5rem",
  maxWidth: 900,
  width: "100%",
  background: "var(--card-gradient)",
  border: "1px solid var(--border)",
  borderRadius: 20,
  padding: "2rem",
};

const cardLabel: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "var(--accent-soft)",
  marginBottom: "0.25rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 600,
};

const cardValue: React.CSSProperties = {
  fontSize: "3rem",
  fontWeight: 700,
  marginBottom: "0.5rem",
};

const button = (disabled: boolean): React.CSSProperties => ({
  padding: "0.75rem 1rem",
  background: disabled ? "var(--surface)" : "var(--accent-gradient)",
  color: disabled ? "var(--muted)" : "white",
  border: "1px solid var(--accent-border)",
  borderRadius: 12,
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  boxShadow: disabled ? "none" : "var(--accent-glow)",
  height: 40,
  width: 170,
  transition: "all 0.2s ease",
  display: "flex",
  justifyContent: "space-between",
  marginTop: 28,
});

const divider: React.CSSProperties = {
  margin: "2rem 0 1.5rem",
  height: 1,
  background: "rgba(255, 255, 255, 0.06)",
};

const statsRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "2rem",
  width: "80%",
};

const statLabel: React.CSSProperties = {
  color: "var(--muted)",
  fontSize: "0.85rem",
  marginBottom: "0.4rem",
};

const statValue: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "1.1rem",
};
