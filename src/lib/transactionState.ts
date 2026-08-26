export type TransactionStatus =
  | "idle"
  | "pending"
  | "confirmed"
  | "rejected"
  | "timeout";

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  idle: "Ready",
  pending: "Pending…",
  confirmed: "Confirmed",
  rejected: "Rejected",
  timeout: "Timed out",
};