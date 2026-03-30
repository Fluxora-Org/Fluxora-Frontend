export type TransactionOutcome = {
  completedAt: string;
  ledgerLabel: string;
  transactionHash: string;
};

type SimulateTransactionOptions = {
  actionLabel: string;
  delayMs?: number;
};

function wait(delayMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function createTransactionHash() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomBlock = Math.random().toString(36).slice(2, 12).toUpperCase();
  return `TX-${timestamp}-${randomBlock}`;
}

export function shouldForceTransactionFailure() {
  const params = new URLSearchParams(window.location.search);
  return params.get("txFailure") === "1";
}

export async function simulateTransaction({
  actionLabel,
  delayMs = 1800,
}: SimulateTransactionOptions): Promise<TransactionOutcome> {
  await wait(delayMs);

  if (!window.navigator.onLine) {
    throw new Error(
      "You appear to be offline. Reconnect and resubmit the transaction.",
    );
  }

  if (shouldForceTransactionFailure()) {
    throw new Error(
      `${actionLabel} was rejected before final submission. Retry the transaction or reconnect your wallet to continue.`,
    );
  }

  return {
    completedAt: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      day: "numeric",
    }).format(new Date()),
    ledgerLabel: `Ledger ${String(182000 + Math.floor(Math.random() * 5000))}`,
    transactionHash: createTransactionHash(),
  };
}
