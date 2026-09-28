const PREFIX = "fluxora:session-recovery:v1:";
// ADAPT: the unscoped key the banner uses today, so old data is purged too
const LEGACY_KEYS = ["fluxora:session-recovery"];

export interface RecoverableSession<T = unknown> {
  accountId: string;
  savedAt: number;
  state: T;
}

const keyFor = (accountId: string) => `${PREFIX}${encodeURIComponent(accountId)}`;

function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* silent by design */
  }
}

export function saveSession<T>(accountId: string | null | undefined, state: T): void {
  if (!accountId) return;
  const payload: RecoverableSession<T> = { accountId, savedAt: Date.now(), state };
  try {
    localStorage.setItem(keyFor(accountId), JSON.stringify(payload));
  } catch {
    /* quota / private mode: recovery is best-effort */
  }
}

export function clearSession(accountId: string | null | undefined): void {
  if (accountId) safeRemove(keyFor(accountId));
}

/** Returns the snapshot only if it was created by `accountId`; otherwise discards it silently. */
export function loadSession<T = unknown>(
  accountId: string | null | undefined,
): RecoverableSession<T> | null {
  if (!accountId) return null;
  const key = keyFor(accountId);
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<RecoverableSession<T>> | null;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.accountId !== accountId ||
      typeof parsed.savedAt !== "number" ||
      !("state" in parsed)
    ) {
      safeRemove(key); // tampered, corrupt, or copied across keys
      return null;
    }
    return parsed as RecoverableSession<T>;
  } catch {
    safeRemove(key);
    return null;
  }
}

/** Removes every snapshot not owned by `accountId`, plus legacy unscoped ones. */
export function purgeForeignSessions(accountId: string | null | undefined): void {
  try {
    const own = accountId ? keyFor(accountId) : null;
    const doomed: string[] = [...LEGACY_KEYS];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX) && k !== own) doomed.push(k);
    }
    doomed.forEach(safeRemove);
  } catch {
    /* silent */
  }
}
