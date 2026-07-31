import { useSyncExternalStore } from "react";

const STORAGE_KEY = "fluxora_last_used_wallet";

/**
 * Subscribe to storage changes from other tabs/windows.
 */
function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

/**
 * Read the current value from localStorage.
 */
function getSnapshot(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Persist the wallet ID that was last successfully connected.
 */
export function saveLastUsedWalletId(walletId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, walletId);
  } catch {
    // Silently ignore — localStorage may be unavailable (private browsing, etc.)
  }
}

/**
 * Clear the stored preference (e.g. on disconnect).
 */
export function clearLastUsedWalletId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently ignore
  }
}

/**
 * Reactively read the last-used wallet preference from localStorage.
 *
 * Updates automatically when the value changes in the same tab or another tab.
 */
export function useLastUsedWalletId(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot);
}