import {
  readBrowserStorage,
  removeBrowserStorage,
  writeBrowserStorage,
} from "./browserStorage";

export const ONBOARDING_DISMISSED_STORAGE_KEY = "fluxora_onboarding_dismissed";

const ONBOARDING_DISMISSED_VALUE = "true";

/**
 * Storage key for the persisted onboarding *progress* record.
 *
 * Progress is stored separately from the dismissal flag so that a corrupted
 * progress value can never make the dismissal flag unreadable (and vice versa).
 */
export const ONBOARDING_PROGRESS_STORAGE_KEY = "fluxora_onboarding_progress";

/** Schema version for the persisted progress envelope. */
export const ONBOARDING_PROGRESS_SCHEMA_VERSION = 1 as const;

/**
 * Ordered onboarding step ids. The index of an id in this list is the step
 * number persisted in storage, so the list is the single source of truth for
 * what counts as a valid step.
 */
export const ONBOARDING_STEPS = [
  "welcome",
  "how-it-works",
  "get-started",
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];

/** The step a user starts on when there is no valid persisted progress. */
export const ONBOARDING_INITIAL_STEP: OnboardingStepId = ONBOARDING_STEPS[0];

/** The step that marks the flow as finished. */
export const ONBOARDING_FINAL_STEP: OnboardingStepId =
  ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1];

export interface OnboardingProgress {
  /** Current step id. Always one of {@link ONBOARDING_STEPS}. */
  step: OnboardingStepId;
  /** True once the user has reached the final step and completed the flow. */
  completed: boolean;
}

type OnboardingStorageReader = Pick<Storage, "getItem">;
type OnboardingStorageWriter = Pick<Storage, "removeItem" | "setItem">;

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

/** The progress a user has when nothing valid is persisted. */
export function createInitialOnboardingProgress(): OnboardingProgress {
  return { step: ONBOARDING_INITIAL_STEP, completed: false };
}

/** True when `value` is a known onboarding step id. */
export function isOnboardingStepId(value: unknown): value is OnboardingStepId {
  return (
    typeof value === "string" &&
    (ONBOARDING_STEPS as readonly string[]).includes(value)
  );
}

/** Zero-based index of a step id, or -1 when unknown. */
export function getOnboardingStepIndex(step: OnboardingStepId): number {
  return (ONBOARDING_STEPS as readonly string[]).indexOf(step);
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
      storage as any,
    );
  } else {
    removeBrowserStorage(ONBOARDING_DISMISSED_STORAGE_KEY, storage as any);
  }
}

/**
 * Parses a raw persisted progress value.
 *
 * Returns `null` for anything that is not a well-formed, current-version
 * envelope with a known step id — callers treat `null` as "corrupted, reset".
 */
function parseOnboardingProgress(raw: string | null): OnboardingProgress | null {
  if (raw === null) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const envelope = parsed as Record<string, unknown>;
  if (envelope.version !== ONBOARDING_PROGRESS_SCHEMA_VERSION) {
    return null;
  }

  const data = envelope.data;
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return null;
  }

  const { step, completed } = data as Record<string, unknown>;
  if (!isOnboardingStepId(step) || typeof completed !== "boolean") {
    return null;
  }

  return { step, completed };
}

/**
 * Reads persisted onboarding progress.
 *
 * A missing, unreadable, or corrupted value never blocks the user: it is
 * cleared and the initial progress is returned instead. This guarantees a
 * partial write or hand-edited value cannot trap a user in an incomplete flow.
 */
export function readOnboardingProgress(
  storage: OnboardingStorageReader & Partial<OnboardingStorageWriter> = getLocalStorage() as any,
): OnboardingProgress {
  if (!storage) {
    return createInitialOnboardingProgress();
  }

  const raw = readBrowserStorage(ONBOARDING_PROGRESS_STORAGE_KEY, storage);
  const progress = parseOnboardingProgress(raw);

  if (progress) {
    return progress;
  }

  // Corrupted or absent: reset rather than block.
  if (raw !== null && typeof storage.removeItem === "function") {
    removeBrowserStorage(ONBOARDING_PROGRESS_STORAGE_KEY, storage as any);
  }

  return createInitialOnboardingProgress();
}

/**
 * Persists onboarding progress.
 *
 * Writes are guarded so quota or browser security errors do not break the
 * flow; the in-memory fallback in `browserStorage` keeps the value readable
 * for the rest of the page's lifetime.
 */
export function writeOnboardingProgress(
  progress: OnboardingProgress,
  storage: OnboardingStorageWriter | null = getLocalStorage(),
): void {
  if (!storage) {
    return;
  }

  const safeProgress: OnboardingProgress = isOnboardingStepId(progress?.step)
    ? { step: progress.step, completed: progress.completed === true }
    : createInitialOnboardingProgress();

  writeBrowserStorage(
    ONBOARDING_PROGRESS_STORAGE_KEY,
    JSON.stringify({
      version: ONBOARDING_PROGRESS_SCHEMA_VERSION,
      data: safeProgress,
    }),
    storage as any,
  );
}

/**
 * Advances progress to the next step, or marks the flow complete when the
 * final step is reached.
 *
 * Completion is idempotent: calling this again on a completed flow returns an
 * equivalent, already-completed progress object.
 */
export function advanceOnboardingProgress(
  progress: OnboardingProgress,
): OnboardingProgress {
  const current = isOnboardingStepId(progress?.step)
    ? progress.step
    : ONBOARDING_INITIAL_STEP;

  if (progress?.completed === true || current === ONBOARDING_FINAL_STEP) {
    return { step: ONBOARDING_FINAL_STEP, completed: true };
  }

  const nextIndex = getOnboardingStepIndex(current) + 1;
  const nextStep = ONBOARDING_STEPS[nextIndex] ?? ONBOARDING_FINAL_STEP;

  return {
    step: nextStep,
    completed: nextStep === ONBOARDING_FINAL_STEP,
  };
}

/**
 * Marks the flow complete. Idempotent — repeated calls yield the same state.
 */
export function completeOnboardingProgress(
  progress?: OnboardingProgress,
): OnboardingProgress {
  void progress;
  return { step: ONBOARDING_FINAL_STEP, completed: true };
}

/**
 * Exits the flow from any step, clearing persisted progress so the user is
 * never stuck on a step they cannot leave.
 *
 * Returns the reset progress so callers can apply it to local state.
 */
export function resetOnboardingProgress(
  storage: OnboardingStorageWriter | null = getLocalStorage(),
): OnboardingProgress {
  if (storage) {
    removeBrowserStorage(ONBOARDING_PROGRESS_STORAGE_KEY, storage as any);
  }

  return createInitialOnboardingProgress();
}
