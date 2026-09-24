/**
 * Cross-tab account-context messages. This module deliberately carries only
 * the public wallet identity and network; it never persists credentials or
 * wallet-provider responses.
 */
export const ACCOUNT_CONTEXT_CHANNEL = "fluxora:account-context:v1";

export interface AccountContextMessage {
  type: "account-context";
  address: string | null;
  network: string | null;
  connected: boolean;
  /** Wall-clock ordering prevents an older delayed tab message winning. */
  changedAt: number;
  source: string;
}

export type AccountContextListener = (message: AccountContextMessage) => void;

interface BroadcastChannelLike {
  postMessage(message: AccountContextMessage): void;
  close(): void;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
}

function isAccountContextMessage(
  value: unknown,
): value is AccountContextMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<AccountContextMessage>;
  return (
    message.type === "account-context" &&
    (typeof message.address === "string" || message.address === null) &&
    (typeof message.network === "string" || message.network === null) &&
    typeof message.connected === "boolean" &&
    typeof message.changedAt === "number" &&
    Number.isFinite(message.changedAt) &&
    typeof message.source === "string"
  );
}

/**
 * Opens an optional BroadcastChannel. Browsers without the API (or browsers
 * that reject channel creation because of privacy settings) keep normal
 * single-tab behaviour without throwing.
 */
export function subscribeToAccountContext(listener: AccountContextListener): {
  publish: (message: AccountContextMessage) => void;
  close: () => void;
} {
  if (typeof BroadcastChannel === "undefined") {
    return { publish: () => {}, close: () => {} };
  }

  let channel: BroadcastChannelLike;
  try {
    channel = new BroadcastChannel(ACCOUNT_CONTEXT_CHANNEL);
  } catch {
    return { publish: () => {}, close: () => {} };
  }

  channel.onmessage = (event) => {
    if (isAccountContextMessage(event.data)) listener(event.data);
  };

  return {
    publish: (message) => {
      try {
        channel.postMessage(message);
      } catch {
        // The channel can be closed by the browser at any time. Account state
        // remains local in that case.
      }
    },
    close: () => {
      channel.onmessage = null;
      try {
        channel.close();
      } catch {
        // Closing an already-closed channel is harmless.
      }
    },
  };
}
