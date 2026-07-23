import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  ONBOARDING_DISMISSED_STORAGE_KEY,
  readOnboardingDismissed,
  writeOnboardingDismissed,
} from "../onboarding";

// A minimal memory-backed implementation of Storage
class MemoryStorage implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
  }

  getItem(key: string): string | null {
    return key in this.store ? this.store[key] : null;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return index >= 0 && index < keys.length ? keys[index] : null;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
}

describe("onboarding storage helpers", () => {
  let originalLocalStorage: any;
  let originalWindowLocalStorage: any;

  beforeAll(() => {
    // Save original descriptors/values
    originalLocalStorage = Object.getOwnPropertyDescriptor(
      globalThis,
      "localStorage",
    );
    if (typeof window !== "undefined") {
      originalWindowLocalStorage = Object.getOwnPropertyDescriptor(
        window,
        "localStorage",
      );
    }

    // Redefine localStorage to use MemoryStorage to avoid Node.js native localStorage warnings/errors
    const mockStorage = new MemoryStorage();

    delete (globalThis as any).localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      value: mockStorage,
      writable: true,
      configurable: true,
    });

    if (typeof window !== "undefined") {
      delete (window as any).localStorage;
      Object.defineProperty(window, "localStorage", {
        value: mockStorage,
        writable: true,
        configurable: true,
      });
    }
  });

  afterAll(() => {
    // Restore original descriptors
    if (originalLocalStorage) {
      Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
    } else {
      delete (globalThis as any).localStorage;
    }

    if (typeof window !== "undefined") {
      if (originalWindowLocalStorage) {
        Object.defineProperty(
          window,
          "localStorage",
          originalWindowLocalStorage,
        );
      } else {
        delete (window as any).localStorage;
      }
    }
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it("uses the global/window localStorage by default", () => {
    writeOnboardingDismissed(true);
    expect(readOnboardingDismissed()).toBe(true);
    expect(localStorage.getItem(ONBOARDING_DISMISSED_STORAGE_KEY)).toBe("true");

    writeOnboardingDismissed(false);
    expect(readOnboardingDismissed()).toBe(false);
    expect(localStorage.getItem(ONBOARDING_DISMISSED_STORAGE_KEY)).toBeNull();
  });

  it("returns false rather than propagating when injected storage's getItem throws", () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error("storage getItem error");
      }),
    };

    expect(readOnboardingDismissed(storage)).toBe(false);
    expect(storage.getItem).toHaveBeenCalledWith(
      ONBOARDING_DISMISSED_STORAGE_KEY,
    );
  });

  it("does not throw when injected storage's setItem throws", () => {
    const storage = {
      setItem: vi.fn(() => {
        throw new Error("storage setItem error");
      }),
      removeItem: vi.fn(),
    };

    expect(() => writeOnboardingDismissed(true, storage)).not.toThrow();
    expect(storage.setItem).toHaveBeenCalledWith(
      ONBOARDING_DISMISSED_STORAGE_KEY,
      "true",
    );
  });

  it("does not throw when injected storage's removeItem throws", () => {
    const storage = {
      setItem: vi.fn(),
      removeItem: vi.fn(() => {
        throw new Error("storage removeItem error");
      }),
    };

    expect(() => writeOnboardingDismissed(false, storage)).not.toThrow();
    expect(storage.removeItem).toHaveBeenCalledWith(
      ONBOARDING_DISMISSED_STORAGE_KEY,
    );
  });

  it("handles storage === null branch (SSR/no-window) for both read and write functions", () => {
    expect(readOnboardingDismissed(null)).toBe(false);
    expect(() => writeOnboardingDismissed(true, null)).not.toThrow();
    expect(() => writeOnboardingDismissed(false, null)).not.toThrow();
  });

  it("performs normal round-trip: write true, read back true; write false, read back false", () => {
    const storage = new MemoryStorage();

    writeOnboardingDismissed(true, storage);
    expect(readOnboardingDismissed(storage)).toBe(true);

    writeOnboardingDismissed(false); // test write default storage
    writeOnboardingDismissed(false, storage);
    expect(readOnboardingDismissed(storage)).toBe(false);
  });

  it("falls back to null and does not crash when window is undefined", () => {
    const originalWindow = globalThis.window;

    // Temporarily set window to undefined
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      configurable: true,
    });

    try {
      expect(readOnboardingDismissed()).toBe(false);
      expect(() => writeOnboardingDismissed(true)).not.toThrow();
    } finally {
      // Restore window
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        configurable: true,
      });
    }
  });
});
