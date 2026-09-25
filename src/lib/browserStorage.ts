type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const fallbackValues = new WeakMap<object, Map<string, string>>();

function getFallbackValues(storage: object): Map<string, string> {
  let values = fallbackValues.get(storage);
  if (!values) {
    values = new Map<string, string>();
    fallbackValues.set(storage, values);
  }
  return values;
}

export function readBrowserStorage(
  key: string,
  storage: Pick<Storage, "getItem"> | null,
): string | null {
  if (!storage) return null;

  const values = getFallbackValues(storage);

  try {
    const value = storage.getItem(key);
    return value ?? values.get(key) ?? null;
  } catch {
    return values.get(key) ?? null;
  }
}

/**
 * Writes `value` to storage. Returns true only when the write reached the
 * real storage; on failure (quota, blocked site data) the value is kept in an
 * in-memory fallback for this page's lifetime and false is returned.
 */
export function writeBrowserStorage(
  key: string,
  value: string,
  storage: StorageLike | null,
): boolean {
  if (!storage) return false;

  try {
    storage.setItem(key, value);
    getFallbackValues(storage).delete(key);
    return true;
  } catch {
    getFallbackValues(storage).set(key, value);
    return false;
  }
}

/** Removes `key` from storage. Returns true only when the removal reached the real storage. */
export function removeBrowserStorage(
  key: string,
  storage: Pick<Storage, "removeItem"> | null,
): boolean {
  if (!storage) return false;

  getFallbackValues(storage).delete(key);

  try {
    storage.removeItem(key);
    getFallbackValues(storage).delete(key);
    return true;
  } catch {
    getFallbackValues(storage).delete(key);
    return false;
  }
}

/**
 * Returns `window[name]`, or null when there is no window or when merely
 * accessing the property throws — browsers throw a SecurityError there when
 * site data is blocked.
 */
export function getBrowserStorage(
  name: "localStorage" | "sessionStorage",
): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window[name] ?? null;
  } catch {
    return null;
  }
}

/**
 * Whether writes are actually reaching storage: "unknown" until the first
 * write, then the outcome of the most recent one.
 */
export type StorageWriteStatus = "unknown" | "available" | "unavailable";

/**
 * Creates a small observable of storage write outcomes, shaped for React's
 * useSyncExternalStore. Feature modules own an instance and `record` the
 * result of each of their writes, so UI can reflect real storage state.
 */
export function createStorageWriteStatus() {
  let status: StorageWriteStatus = "unknown";
  const listeners = new Set<() => void>();

  const set = (next: StorageWriteStatus) => {
    if (next === status) return;
    status = next;
    listeners.forEach((listener) => listener());
  };

  return {
    getSnapshot: (): StorageWriteStatus => status,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    record(succeeded: boolean): void {
      set(succeeded ? "available" : "unavailable");
    },
    reset(): void {
      set("unknown");
    },
  };
}
