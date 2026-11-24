/**
 * Shared wallet-provider contract.
 *
 * Every supported Stellar wallet (Freighter, Albedo, ...) is adapted to this
 * small interface so the wallet context, the connect modal and the Soroban
 * transaction layer can drive any wallet without branching on vendor APIs.
 *
 * The module is intentionally React-free: `src/lib/stellar/tx.ts` imports the
 * registry below to sign transactions outside of the component tree.
 */

/** Identifier persisted in localStorage so a reload can restore the same wallet. */
export type WalletProviderId = "freighter" | "albedo";

/**
 * Stable, UI-safe error categories. Raw vendor errors are never surfaced: they
 * can contain extension internals or account data.
 */
export type WalletProviderErrorType =
  | "not_installed"
  | "rejected"
  | "popup_blocked"
  | "timeout"
  | "network_error"
  | "unknown";

/** Error thrown by every provider so callers can map failures deterministically. */
export class WalletProviderError extends Error {
  constructor(
    public readonly type: WalletProviderErrorType,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "WalletProviderError";
  }
}

export interface WalletAccount {
  address: string;
  network: string;
}

export interface WalletSignOptions {
  /** Passphrase of the network the transaction was built for. */
  networkPassphrase: string;
  /** Public key that must sign (already connected account). */
  address?: string;
}

export interface WalletProvider {
  readonly id: WalletProviderId;
  /** Human-readable name used in user-facing messages. */
  readonly name: string;
  /** Whether the wallet can be used in this browser. */
  isAvailable(): Promise<boolean>;
  /** Interactive connect — may open an extension popup. */
  connect(): Promise<WalletAccount>;
  /**
   * Silent session restore. Resolves `null` when there is no previously
   * approved session, and throws a {@link WalletProviderError} when the wallet
   * responded with a real failure.
   */
  restore(): Promise<WalletAccount | null>;
  /** Currently selected public key. */
  getAddress(): Promise<string>;
  /** Network the wallet will sign for. */
  getNetwork(): Promise<string>;
  /** Sign an XDR envelope and resolve with the signed XDR. */
  signTransaction(xdr: string, options: WalletSignOptions): Promise<string>;
  /** Release any listeners/handles held by the adapter. */
  disconnect(): Promise<void>;
}

type ErrorLike = {
  type?: unknown;
  code?: unknown;
  message?: unknown;
  error?: unknown;
};

const WALLET_ERROR_TYPES: readonly WalletProviderErrorType[] = [
  "not_installed",
  "rejected",
  "popup_blocked",
  "timeout",
  "network_error",
  "unknown",
];

/**
 * Normalises any vendor error (Freighter resolves with `{error}` objects,
 * Albedo rejects with plain `{message, code}` objects) into a typed
 * {@link WalletProviderError}. `fallback` is used when nothing matches.
 */
export function toWalletProviderError(
  error: unknown,
  fallback: WalletProviderErrorType = "unknown",
): WalletProviderError {
  if (error instanceof WalletProviderError) return error;

  const candidate =
    error && typeof error === "object" ? (error as ErrorLike) : undefined;
  const nested =
    candidate?.error && typeof candidate.error === "object"
      ? (candidate.error as ErrorLike)
      : candidate;

  // A vendor may already have classified the failure for us.
  if (
    nested?.type &&
    typeof nested.type === "string" &&
    (WALLET_ERROR_TYPES as readonly string[]).includes(nested.type)
  ) {
    return new WalletProviderError(
      nested.type as WalletProviderErrorType,
      typeof nested.message === "string" ? nested.message : "Wallet error",
      error,
    );
  }

  const code = nested?.code;
  const message =
    typeof nested?.message === "string"
      ? nested.message
      : typeof error === "string"
        ? error
        : error instanceof Error
          ? error.message
          : "";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("popup") ||
    normalized.includes("blocked by the browser")
  ) {
    return new WalletProviderError(
      "popup_blocked",
      message || "The wallet popup was blocked by the browser.",
      error,
    );
  }

  if (
    normalized.includes("not supported") ||
    normalized.includes("not installed") ||
    normalized.includes("extension not found") ||
    normalized.includes("content script")
  ) {
    return new WalletProviderError(
      "not_installed",
      message || "The wallet extension is not available.",
      error,
    );
  }

  if (
    code === -4 ||
    normalized.includes("declined") ||
    normalized.includes("denied") ||
    normalized.includes("reject") ||
    normalized.includes("cancel") ||
    normalized.includes("dismiss") ||
    normalized.includes("not allowed")
  ) {
    return new WalletProviderError(
      "rejected",
      message || "The wallet request was rejected.",
      error,
    );
  }

  if (
    normalized.includes("network") ||
    normalized.includes("rpc") ||
    normalized.includes("failed to fetch")
  ) {
    return new WalletProviderError(
      "network_error",
      message || "The wallet could not reach the network.",
      error,
    );
  }

  if (normalized.includes("timeout") || normalized.includes("timed out")) {
    return new WalletProviderError(
      "timeout",
      message || "The wallet did not respond in time.",
      error,
    );
  }

  return new WalletProviderError(
    fallback,
    message || "An unexpected wallet error occurred.",
    error,
  );
}

// ─── Remembered provider ─────────────────────────────────────────────────────
//
// The provider id survives reloads so a returning Albedo user is not silently
// downgraded to the Freighter adapter. Only the id is stored — never a key.

const REMEMBERED_PROVIDER_STORAGE_KEY = "fluxora.wallet.provider";

function providerStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isWalletProviderId(value: unknown): value is WalletProviderId {
  return value === "freighter" || value === "albedo";
}

export function rememberWalletProviderId(id: WalletProviderId): void {
  try {
    providerStorage()?.setItem(REMEMBERED_PROVIDER_STORAGE_KEY, id);
  } catch {
    // Private-mode browsers can reject writes; remembering is best-effort.
  }
}

export function readRememberedWalletProviderId(): WalletProviderId | null {
  try {
    const raw = providerStorage()?.getItem(REMEMBERED_PROVIDER_STORAGE_KEY);
    return isWalletProviderId(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function forgetWalletProviderId(): void {
  try {
    providerStorage()?.removeItem(REMEMBERED_PROVIDER_STORAGE_KEY);
  } catch {
    // See rememberWalletProviderId.
  }
}

// ─── Active provider registry ────────────────────────────────────────────────
//
// `tx.ts` signs outside React, so the provider selected by the wallet context is
// mirrored here. Freighter stays the default until a context mounts.

let activeProviderId: WalletProviderId = "freighter";

export function setActiveWalletProviderId(id: WalletProviderId): void {
  activeProviderId = id;
}

export function getActiveWalletProviderId(): WalletProviderId {
  return activeProviderId;
}

/** Test helper: restore the default provider selection. */
export function resetActiveWalletProviderId(): void {
  activeProviderId = "freighter";
}
