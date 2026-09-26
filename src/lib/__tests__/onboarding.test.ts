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
  ONBOARDING_FINAL_STEP,
  ONBOARDING_INITIAL_STEP,
  ONBOARDING_PROGRESS_SCHEMA_VERSION,
  ONBOARDING_PROGRESS_STORAGE_KEY,
  ONBOARDING_STEPS,
  advanceOnboardingProgress,
  completeOnboardingProgress,
  createInitialOnboardingProgress,
  readOnboardingDismissed,
  readOnboardingProgress,
  resetOnboardingProgress,
  writeOnboardingDismissed,
  writeOnboardingProgress,
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

  it("keeps dismissal in memory when injected storage's setItem throws", () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }),
      setItem: vi.fn(() => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }),
      removeItem: vi.fn(),
    };

    writeOnboardingDismissed(true, storage);
    expect(readOnboardingDismissed(storage)).toBe(true);
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

// ── Onboarding progress: exit / reload / corruption / idempotency ─────────────

describe("onboarding progress", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts at the first step and is not complete", () => {
    expect(createInitialOnboardingProgress()).toEqual({
      step: ONBOARDING_INITIAL_STEP,
      completed: false,
    });
    expect(readOnboardingProgress(localStorage)).toEqual(
      createInitialOnboardingProgress(),
    );
  });

  it("survives a reload (write then read back from the same storage)", () => {
    writeOnboardingProgress(
      { step: "how-it-works", completed: false },
      localStorage,
    );

    // A "reload" is a fresh read against the same persisted storage.
    expect(readOnboardingProgress(localStorage)).toEqual({
      step: "how-it-works",
      completed: false,
    });
  });

  it("can be exited from every step, clearing persisted progress", () => {
    for (const step of ONBOARDING_STEPS) {
      writeOnboardingProgress({ step, completed: false }, localStorage);
      expect(readOnboardingProgress(localStorage).step).toBe(step);

      const reset = resetOnboardingProgress(localStorage);

      expect(reset).toEqual(createInitialOnboardingProgress());
      expect(readOnboardingProgress(localStorage)).toEqual(
        createInitialOnboardingProgress(),
      );
      expect(localStorage.getItem(ONBOARDING_PROGRESS_STORAGE_KEY)).toBeNull();
    }
  });

  it("resets rather than blocks when the stored value is corrupted", () => {
    const corruptedValues = [
      "not json at all",
      "null",
      "[]",
      '"welcome"',
      JSON.stringify({ version: 999, data: { step: "welcome", completed: false } }),
      JSON.stringify({ version: ONBOARDING_PROGRESS_SCHEMA_VERSION }),
      JSON.stringify({
        version: ONBOARDING_PROGRESS_SCHEMA_VERSION,
        data: { step: "unknown-step", completed: false },
      }),
      JSON.stringify({
        version: ONBOARDING_PROGRESS_SCHEMA_VERSION,
        data: { step: "welcome", completed: "yes" },
      }),
    ];

    for (const raw of corruptedValues) {
      localStorage.setItem(ONBOARDING_PROGRESS_STORAGE_KEY, raw);

      expect(readOnboardingProgress(localStorage)).toEqual(
        createInitialOnboardingProgress(),
      );
      // The corrupted value is cleared so it cannot block future reads.
      expect(localStorage.getItem(ONBOARDING_PROGRESS_STORAGE_KEY)).toBeNull();
    }
  });

  it("does not throw when storage is unavailable or throws", () => {
    expect(readOnboardingProgress(null as any)).toEqual(
      createInitialOnboardingProgress(),
    );
    expect(() =>
      writeOnboardingProgress({ step: "welcome", completed: false }, null),
    ).not.toThrow();
    expect(() => resetOnboardingProgress(null)).not.toThrow();

    const throwing = {
      getItem: vi.fn(() => {
        throw new Error("blocked");
      }),
      setItem: vi.fn(() => {
        throw new Error("blocked");
      }),
      removeItem: vi.fn(() => {
        throw new Error("blocked");
      }),
    };

    expect(readOnboardingProgress(throwing as any)).toEqual(
      createInitialOnboardingProgress(),
    );
    expect(() =>
      writeOnboardingProgress({ step: "welcome", completed: false }, throwing as any),
    ).not.toThrow();
  });

  it("advances through every step and completes on the final step", () => {
    let progress = createInitialOnboardingProgress();

    for (let i = 0; i < ONBOARDING_STEPS.length - 1; i++) {
      progress = advanceOnboardingProgress(progress);
      expect(progress.step).toBe(ONBOARDING_STEPS[i + 1]);
      expect(progress.completed).toBe(false);
    }

    progress = advanceOnboardingProgress(progress);
    expect(progress).toEqual({ step: ONBOARDING_FINAL_STEP, completed: true });
  });

  it("completes idempotently", () => {
    const first = completeOnboardingProgress();
    const second = completeOnboardingProgress(first);
    const third = advanceOnboardingProgress(second);

    expect(first).toEqual({ step: ONBOARDING_FINAL_STEP, completed: true });
    expect(second).toEqual(first);
    expect(third).toEqual(first);

    // Persisting completion repeatedly leaves the same readable state.
    writeOnboardingProgress(first, localStorage);
    writeOnboardingProgress(second, localStorage);
    expect(readOnboardingProgress(localStorage)).toEqual(first);
  });

  it("never advances past the final step", () => {
    const completed = advanceOnboardingProgress({
      step: ONBOARDING_FINAL_STEP,
      completed: true,
    });

    expect(completed).toEqual({ step: ONBOARDING_FINAL_STEP, completed: true });
    expect(advanceOnboardingProgress(completed)).toEqual(completed);
  });
});
