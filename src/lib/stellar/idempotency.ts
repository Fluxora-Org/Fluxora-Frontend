const STORAGE_KEY = "fluxora_pending_stream_tx";

export interface PendingTransaction {
  idempotencyKey: string;
  txHash: string | null;
  params: Record<string, unknown>;
  createdAt: number;
}

export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function savePendingTx(
  params: Record<string, unknown> = {},
  txHash: string | null = null,
): string {
  const key = generateIdempotencyKey();
  const pending: PendingTransaction = {
    idempotencyKey: key,
    txHash,
    params,
    createdAt: Date.now(),
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // sessionStorage may be unavailable in some test environments
  }
  return key;
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
  | { reconciled: true; status: "pending" | "confirmed" | "failed"; txHash: string }
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
