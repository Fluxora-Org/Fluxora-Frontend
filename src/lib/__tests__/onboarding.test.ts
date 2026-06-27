import { describe, expect, it, vi } from "vitest";
import {
  ONBOARDING_DISMISSED_STORAGE_KEY,
  readOnboardingDismissed,
  writeOnboardingDismissed,
} from "../onboarding";

describe("onboarding storage helpers", () => {
  it("uses browser localStorage by default", () => {
    localStorage.clear();

    writeOnboardingDismissed(true);

    expect(readOnboardingDismissed()).toBe(true);
    expect(localStorage.getItem(ONBOARDING_DISMISSED_STORAGE_KEY)).toBe("true");
  });

  it("returns false when the dismissal key is absent", () => {
    const storage = {
      getItem: vi.fn(() => null),
    };

    expect(readOnboardingDismissed(storage)).toBe(false);
    expect(storage.getItem).toHaveBeenCalledWith(
      ONBOARDING_DISMISSED_STORAGE_KEY,
    );
  });

  it("returns true when the dismissal key is present", () => {
    const storage = {
      getItem: vi.fn(() => "true"),
    };

    expect(readOnboardingDismissed(storage)).toBe(true);
  });

  it("returns false when storage access throws", () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new DOMException("Blocked", "SecurityError");
      }),
    };

    expect(readOnboardingDismissed(storage)).toBe(false);
  });

  it("returns false and skips writes when storage is unavailable", () => {
    const originalWindow = globalThis.window;

    try {
      Object.defineProperty(globalThis, "window", {
        value: undefined,
        configurable: true,
      });

      expect(readOnboardingDismissed()).toBe(false);
      expect(() => writeOnboardingDismissed(true)).not.toThrow();
    } finally {
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        configurable: true,
      });
    }
  });

  it("writes the shared dismissal key when onboarding is dismissed", () => {
    const storage = {
      removeItem: vi.fn(),
      setItem: vi.fn(),
    };

    writeOnboardingDismissed(true, storage);

    expect(storage.setItem).toHaveBeenCalledWith(
      ONBOARDING_DISMISSED_STORAGE_KEY,
      "true",
    );
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("removes the shared dismissal key when onboarding is reset", () => {
    const storage = {
      removeItem: vi.fn(),
      setItem: vi.fn(),
    };

    writeOnboardingDismissed(false, storage);

    expect(storage.removeItem).toHaveBeenCalledWith(
      ONBOARDING_DISMISSED_STORAGE_KEY,
    );
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("swallows storage write errors", () => {
    const storage = {
      removeItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new DOMException("Blocked", "QuotaExceededError");
      }),
    };

    expect(() => writeOnboardingDismissed(true, storage)).not.toThrow();
  });
});
