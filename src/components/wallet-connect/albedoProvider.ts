import { isValidStellarAddress } from "../../lib/stellar";
import { getExpectedStellarNetwork } from "../../lib/stellarNetwork";
import {
  WalletProviderError,
  toWalletProviderError,
  type WalletAccount,
  type WalletProvider,
  type WalletProviderId,
  type WalletSignOptions,
} from "./walletProvider";

/**
 * Albedo adapter.
 *
 * Albedo is a web wallet: every interactive action happens in a popup opened by
 * `@albedo-link/intent`. Three failure modes need distinct handling because the
 * SDK cannot report all of them:
 *
 *  - **popup blocked** — `window.open` returns `null` and the SDK promise never
 *    settles. We detect this synchronously while the intent is dispatched.
 *  - **popup closed by the user** — older SDK builds leave the promise pending,
 *    so we poll the popup handle and reject as `rejected`.
 *  - **no answer at all** — reject as `timeout` so the UI can offer a retry.
 *
 * Albedo also has no notion of a "selected network": the network is decided per
 * signing request. The adapter therefore reports the app's configured network so
 * a legitimate Albedo session is never flagged as a network mismatch.
 */

/**
 * How long we wait for the user to answer an Albedo popup. Human approval is
 * interactive, so this is much longer than the 5s Freighter network probe.
 */
export const ALBEDO_INTENT_TIMEOUT_MS = 180_000;

/** How often the popup handle is checked for a user-initiated close. */
const POPUP_CLOSE_POLL_MS = 300;

interface IntentDispatch<T> {
  promise: Promise<T>;
  popup: Window | null;
  popupBlocked: boolean;
}

/**
 * Runs `start` while watching `window.open` so a blocked popup is visible to
 * the caller. The patch only covers the synchronous dispatch of the intent.
 */
function dispatchIntent<T>(start: () => Promise<T>): IntentDispatch<T> {
  if (typeof window === "undefined" || typeof window.open !== "function") {
    return { promise: start(), popup: null, popupBlocked: false };
  }

  const originalOpen = window.open;
  let popup: Window | null = null;
  let openAttempted = false;

  const patchedOpen: typeof window.open = (...args) => {
    openAttempted = true;
    popup = originalOpen.apply(window, args);
    return popup;
  };

  window.open = patchedOpen;
  let promise: Promise<T>;
  try {
    promise = start();
  } catch (error) {
    promise = Promise.reject(error);
  } finally {
    window.open = originalOpen;
  }

  return { promise, popup, popupBlocked: openAttempted && popup === null };
}

/**
 * Settles an Albedo intent, turning pending/closing popups into typed errors.
 */
function awaitIntent<T>(
  dispatch: IntentDispatch<T>,
  timeoutMs: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    const timeoutTimer = setTimeout(() => {
      settle(() =>
        reject(
          new WalletProviderError(
            "timeout",
            "Albedo did not respond in time. Please try again.",
          ),
        ),
      );
    }, timeoutMs);

    function settle(fn: () => void) {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutTimer);
      if (pollTimer) clearInterval(pollTimer);
      fn();
    }

    if (dispatch.popup) {
      const popup = dispatch.popup;
      pollTimer = setInterval(() => {
        if (popup.closed) {
          settle(() =>
            reject(
              new WalletProviderError(
                "rejected",
                "The Albedo popup was closed before the request was approved.",
              ),
            ),
          );
        }
      }, POPUP_CLOSE_POLL_MS);
    }

    dispatch.promise.then(
      (value) => settle(() => resolve(value)),
      (error) => settle(() => reject(toWalletProviderError(error, "rejected"))),
    );
  });
}

async function albedoApi() {
  const module = await import("@albedo-link/intent");
  return module.default;
}

export interface AlbedoProviderOptions {
  /** Overridable for tests; interactive approvals need a generous window. */
  timeoutMs?: number;
}

export function createAlbedoProvider(
  options: AlbedoProviderOptions = {},
): WalletProvider {
  const timeoutMs = options.timeoutMs ?? ALBEDO_INTENT_TIMEOUT_MS;

  // Albedo has no "current pubkey" query that avoids a round-trip, so the
  // connected account is cached for the lifetime of the adapter.
  let currentAddress: string | null = null;

  async function requestPublicKey(requireExisting: boolean) {
    const api = await albedoApi();
    const dispatch = dispatchIntent(() =>
      api.publicKey(requireExisting ? { require_existing: true } : {}),
    );

    if (dispatch.popupBlocked) {
      throw new WalletProviderError(
        "popup_blocked",
        "The Albedo popup was blocked by the browser.",
      );
    }

    const result = await awaitIntent(dispatch, timeoutMs);
    const address = result?.pubkey;
    if (!address || !isValidStellarAddress(address)) {
      throw new WalletProviderError(
        "unknown",
        "Albedo returned an invalid Stellar address.",
      );
    }
    return address;
  }

  return {
    id: "albedo" as WalletProviderId,
    name: "Albedo",

    async isAvailable() {
      // Albedo is a hosted wallet: nothing to install in the browser.
      return typeof window !== "undefined";
    },

    async connect(): Promise<WalletAccount> {
      const address = await requestPublicKey(false);
      currentAddress = address;
      return { address, network: getExpectedStellarNetwork() };
    },

    async restore(): Promise<WalletAccount | null> {
      // `require_existing` never opens a popup; it only resolves when this
      // browser already approved Fluxora in Albedo.
      try {
        const address = await requestPublicKey(true);
        currentAddress = address;
        return { address, network: getExpectedStellarNetwork() };
      } catch (error) {
        const mapped = toWalletProviderError(error, "unknown");
        if (
          mapped.type === "rejected" ||
          mapped.type === "popup_blocked" ||
          mapped.type === "timeout"
        ) {
          return null;
        }
        throw mapped;
      }
    },

    async getAddress() {
      if (currentAddress) return currentAddress;
      const address = await requestPublicKey(true);
      currentAddress = address;
      return address;
    },

    async getNetwork() {
      // Network is chosen per transaction in Albedo; report the configured one.
      return getExpectedStellarNetwork();
    },

    async signTransaction(xdr: string, options: WalletSignOptions) {
      const api = await albedoApi();
      const pubkey = options.address ?? currentAddress ?? undefined;

      const dispatch = dispatchIntent(() =>
        api.tx({
          xdr,
          pubkey,
          network: options.networkPassphrase,
          submit: false,
        }),
      );

      if (dispatch.popupBlocked) {
        throw new WalletProviderError(
          "popup_blocked",
          "The Albedo popup was blocked by the browser.",
        );
      }

      const result = await awaitIntent(dispatch, timeoutMs);
      const signedXdr = result?.signed_envelope_xdr || result?.xdr;
      if (!signedXdr) {
        throw new WalletProviderError(
          "unknown",
          "Albedo returned no signed transaction.",
        );
      }
      return signedXdr;
    },

    async disconnect() {
      const address = currentAddress;
      currentAddress = null;
      if (!address) return;
      try {
        // Drops any implicit-flow grant so a later reconnect asks again.
        const api = await albedoApi();
        api.forgetImplicitSession(address);
      } catch {
        // Implicit sessions are optional; clearing local state is enough.
      }
    },
  };
}

export const albedoProvider: WalletProvider = createAlbedoProvider();
