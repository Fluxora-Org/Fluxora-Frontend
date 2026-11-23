import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createStorageWriteStatus,
  getBrowserStorage,
  readBrowserStorage,
  removeBrowserStorage,
  writeBrowserStorage,
} from "../browserStorage";

function createStorage(failWith: string | null = null) {
  const values = new Map<string, string>();
  const fail = () => {
    if (failWith) throw new DOMException("Storage failure", failWith);
  };
  return {
    values,
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      fail();
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      fail();
      values.delete(key);
    }),
  };
}

describe("writeBrowserStorage", () => {
  it("returns true when the write reaches storage", () => {
    const storage = createStorage();

    expect(writeBrowserStorage("k", "v", storage)).toBe(true);
    expect(storage.values.get("k")).toBe("v");
  });

  it.each(["SecurityError", "QuotaExceededError"])(
    "returns false without throwing when setItem throws %s",
    (errorName) => {
      const storage = createStorage(errorName);

      expect(() => writeBrowserStorage("k", "v", storage)).not.toThrow();
      expect(writeBrowserStorage("k", "v", storage)).toBe(false);
    },
  );

  it("returns false when no storage is available", () => {
    expect(writeBrowserStorage("k", "v", null)).toBe(false);
  });

  it("keeps the in-memory fallback for reads after a failed write", () => {
    const storage = createStorage("QuotaExceededError");

    writeBrowserStorage("k", "v", storage);

    expect(readBrowserStorage("k", storage)).toBe("v");
  });
});

describe("removeBrowserStorage", () => {
  it("returns true when the removal reaches storage", () => {
    const storage = createStorage();
    storage.values.set("k", "v");

    expect(removeBrowserStorage("k", storage)).toBe(true);
    expect(storage.values.has("k")).toBe(false);
  });

  it("returns false without throwing when removeItem throws", () => {
    const storage = createStorage("SecurityError");

    expect(() => removeBrowserStorage("k", storage)).not.toThrow();
    expect(removeBrowserStorage("k", storage)).toBe(false);
  });

  it("returns false when no storage is available", () => {
    expect(removeBrowserStorage("k", null)).toBe(false);
  });
});

describe("getBrowserStorage", () => {
  const originals = {
    localStorage: Object.getOwnPropertyDescriptor(window, "localStorage"),
    sessionStorage: Object.getOwnPropertyDescriptor(window, "sessionStorage"),
  };

  afterEach(() => {
    for (const [name, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(window, name, descriptor);
    }
  });

  it.each(["localStorage", "sessionStorage"] as const)(
    "returns window.%s when it is accessible",
    (name) => {
      expect(getBrowserStorage(name)).toBe(window[name]);
    },
  );

  it.each(["localStorage", "sessionStorage"] as const)(
    "returns null instead of throwing when accessing window.%s throws",
    (name) => {
      Object.defineProperty(window, name, {
        configurable: true,
        get() {
          throw new DOMException("The operation is insecure.", "SecurityError");
        },
      });

      expect(() => getBrowserStorage(name)).not.toThrow();
      expect(getBrowserStorage(name)).toBeNull();
    },
  );
});

describe("createStorageWriteStatus", () => {
  let status: ReturnType<typeof createStorageWriteStatus>;

  beforeEach(() => {
    status = createStorageWriteStatus();
  });

  it("starts unknown so nothing claims persistence before a write", () => {
    expect(status.getSnapshot()).toBe("unknown");
  });

  it("tracks the outcome of the most recent write", () => {
    status.record(true);
    expect(status.getSnapshot()).toBe("available");

    status.record(false);
    expect(status.getSnapshot()).toBe("unavailable");

    status.record(true);
    expect(status.getSnapshot()).toBe("available");
  });

  it("notifies subscribers only when the status changes", () => {
    const listener = vi.fn();
    status.subscribe(listener);

    status.record(true);
    status.record(true);
    status.record(false);

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("stops notifying after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = status.subscribe(listener);

    unsubscribe();
    status.record(false);

    expect(listener).not.toHaveBeenCalled();
  });

  it("reset returns to unknown and notifies subscribers", () => {
    const listener = vi.fn();
    status.record(false);
    status.subscribe(listener);

    status.reset();

    expect(status.getSnapshot()).toBe("unknown");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
