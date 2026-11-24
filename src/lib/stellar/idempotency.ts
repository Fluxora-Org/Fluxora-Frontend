const STORAGE_KEY = "fluxora_pending_stream_tx";

export interface PendingTransaction {
  idempotencyKey: string;
  txHash: string | null;
  params: Record<string, unknown>;
  createdAt: number;
}

export function generateIdempotencyKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  // randomUUID is unavailable (older browsers). Fall back to getRandomValues,
  // which is cryptographically random and available wherever crypto exists.
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `tx_${hex}`;
  }

  // crypto is entirely absent (unusual: non-secure legacy context).
  // Throw rather than silently produce a weak key that could allow a
  // double-submitted transaction to bypass the idempotency guard.
  throw new Error(
    "generateIdempotencyKey: crypto API unavailable. " +
      "Secure key generation is not possible in this environment.",
  );
}

export function savePendingTx(
  params: Record<string, unknown> = {},
  txHash: string | null = null,
  idempotencyKey: string = generateIdempotencyKey(),
): string {
  const pending: PendingTransaction = {
    idempotencyKey,
    txHash,
    params,
    createdAt: Date.now(),
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // sessionStorage may be unavailable in some environments
  }
  return idempotencyKey;
}

export function loadPendingTx(): PendingTransaction | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingTransaction;
  } catch {
    return null;
  }
}

export function clearPendingTx(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}

export async function reconcilePendingTx(
  getStatus: (hash: string) => Promise<"pending" | "confirmed" | "failed">,
): Promise<
  | {
      reconciled: true;
      status: "pending" | "confirmed" | "failed";
      txHash: string;
    }
  | { reconciled: false }
> {
  const pending = loadPendingTx();
  if (!pending?.txHash) {
    return { reconciled: false };
  }

  try {
    const status = await getStatus(pending.txHash);
    return { reconciled: true, status, txHash: pending.txHash };
  } catch {
    return { reconciled: false };
  }
}
