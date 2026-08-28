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

export function writeBrowserStorage(
  key: string,
  value: string,
  storage: StorageLike | null,
): void {
  if (!storage) return;

  try {
    storage.setItem(key, value);
    getFallbackValues(storage).delete(key);
  } catch {
    getFallbackValues(storage).set(key, value);
  }
}

export function removeBrowserStorage(
  key: string,
  storage: Pick<Storage, "removeItem"> | null,
): void {
  if (!storage) return;

  getFallbackValues(storage).delete(key);

  try {
    storage.removeItem(key);
    getFallbackValues(storage).delete(key);
  } catch {
    getFallbackValues(storage).delete(key);
  }
}
