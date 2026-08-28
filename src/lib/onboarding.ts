import {
  readBrowserStorage,
  removeBrowserStorage,
  writeBrowserStorage,
} from "./browserStorage";

export const ONBOARDING_DISMISSED_STORAGE_KEY = "fluxora_onboarding_dismissed";

const ONBOARDING_DISMISSED_VALUE = "true";

type OnboardingStorageReader = Pick<Storage, "getItem">;
type OnboardingStorageWriter = Pick<Storage, "removeItem" | "setItem">;

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

/**
 * Reads the persisted treasury onboarding dismissal state.
 *
 * Returns `false` when storage is unavailable or throws so onboarding checks
 * never crash the UI in restricted browser environments.
 */
export function readOnboardingDismissed(
  storage: OnboardingStorageReader | null = getLocalStorage(),
): boolean {
  if (!storage) {
    return false;
  }

  return readBrowserStorage(ONBOARDING_DISMISSED_STORAGE_KEY, storage) ===
    ONBOARDING_DISMISSED_VALUE;
}

/**
 * Persists the treasury onboarding dismissal state.
 *
 * Storage writes are guarded so quota or browser security errors do not break
 * onboarding dismissal flows.
 */
export function writeOnboardingDismissed(
  dismissed: boolean,
  storage: OnboardingStorageWriter | null = getLocalStorage(),
): void {
  if (!storage) {
    return;
  }

  if (dismissed) {
    writeBrowserStorage(
      ONBOARDING_DISMISSED_STORAGE_KEY,
      ONBOARDING_DISMISSED_VALUE,
      storage,
    );
  } else {
    removeBrowserStorage(ONBOARDING_DISMISSED_STORAGE_KEY, storage);
  }
}
