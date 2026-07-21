import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ThemeProvider,
  useTheme,
  isTheme,
  resolveInitialTheme,
  initTheme,
  applyTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from "../ThemeProvider";

type ChangeHandler = (e: MediaQueryListEvent) => void;

/**
 * Installs a controllable `window.matchMedia` mock.
 *
 * @param matches - Initial value of `(prefers-color-scheme: dark)`.
 * @param opts.legacy - When true, only expose `addListener`/`removeListener`
 *   (Safari < 14) instead of `addEventListener`.
 */
function mockMatchMedia(matches: boolean, opts: { legacy?: boolean } = {}) {
  const listeners = new Set<ChangeHandler>();
  const mq: Record<string, unknown> = {
    matches,
    media: "(prefers-color-scheme: dark)",
    /** Simulate the OS preference changing at runtime. */
    dispatchChange: (newMatches: boolean) => {
      listeners.forEach((cb) => cb({ matches: newMatches } as MediaQueryListEvent));
    },
  };

  if (opts.legacy) {
    mq.addListener = vi.fn((cb: ChangeHandler) => listeners.add(cb));
    mq.removeListener = vi.fn((cb: ChangeHandler) => listeners.delete(cb));
  } else {
    mq.addEventListener = vi.fn((_: string, cb: ChangeHandler) => listeners.add(cb));
    mq.removeEventListener = vi.fn((_: string, cb: ChangeHandler) =>
      listeners.delete(cb),
    );
  }

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(mq),
  });

  return mq as typeof mq & { dispatchChange: (m: boolean) => void };
}

/** Reads the single source of truth that the provider maintains. */
function currentDataTheme(): string | null {
  return document.documentElement.getAttribute("data-theme");
}

/** Small consumer that surfaces the hook's values into the DOM. */
function ThemeProbe() {
  const { theme, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>toggle</button>
      <button onClick={() => setTheme("dark")}>set-dark</button>
      <button onClick={() => setTheme("light")}>set-light</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── pure helpers ────────────────────────────────────────────────────────────

describe("isTheme", () => {
  it("accepts only the allowed union members", () => {
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
  });

  it("rejects tampered / invalid values (security gate)", () => {
    for (const bad of [
      "Dark",
      "light ",
      "",
      "blue",
      "light\" onload=alert(1)",
      null,
      undefined,
      42,
      {},
    ]) {
      expect(isTheme(bad)).toBe(false);
    }
  });
});

describe("resolveInitialTheme", () => {
  it("prefers a valid stored value over the OS preference", () => {
    mockMatchMedia(true); // OS = dark
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    expect(resolveInitialTheme()).toBe("light");
  });

  it("falls back to the OS preference when nothing is stored", () => {
    mockMatchMedia(true);
    expect(resolveInitialTheme()).toBe("dark");
  });

  it("ignores an invalid stored value and uses the OS preference", () => {
    mockMatchMedia(false);
    localStorage.setItem(THEME_STORAGE_KEY, "neon");
    expect(resolveInitialTheme()).toBe("light");
  });

  it("returns light when matchMedia is unavailable", () => {
    // @ts-ignore simulate an environment without matchMedia
    delete window.matchMedia;
    expect(resolveInitialTheme()).toBe("light");
  });

  it("returns null-equivalent (light) when localStorage throws", () => {
    mockMatchMedia(false);
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(resolveInitialTheme()).toBe("light");
    spy.mockRestore();
  });
});

describe("SSR safety (non-browser environment)", () => {
  it("resolveInitialTheme returns light when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    try {
      expect(resolveInitialTheme()).toBe("light");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("applyTheme is a no-op when document is undefined", () => {
    vi.stubGlobal("document", undefined);
    try {
      expect(() => applyTheme("dark")).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("applyTheme / initTheme", () => {
  it("applyTheme sets data-theme on the document root", () => {
    applyTheme("dark");
    expect(currentDataTheme()).toBe("dark");
  });

  it("initTheme resolves and applies the no-flash attribute", () => {
    mockMatchMedia(true);
    const applied = initTheme();
    expect(applied).toBe("dark");
    expect(currentDataTheme()).toBe("dark");
  });
});

// ─── provider behaviour ──────────────────────────────────────────────────────

describe("ThemeProvider", () => {
  it("first visit with a dark OS preference and no stored value follows the OS", () => {
    mockMatchMedia(true);
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(currentDataTheme()).toBe("dark");
  });

  it("first visit with a light OS preference follows the OS", () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  it("ignores an invalid stored value and uses the OS preference", () => {
    mockMatchMedia(true);
    localStorage.setItem(THEME_STORAGE_KEY, "<script>");
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(currentDataTheme()).toBe("dark");
  });

  it("toggleTheme flips the theme, persists it, and updates the DOM", async () => {
    const user = userEvent.setup();
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await user.click(screen.getByText("toggle"));
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(currentDataTheme()).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    await user.click(screen.getByText("toggle"));
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("setTheme persists an explicit choice", async () => {
    const user = userEvent.setup();
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await user.click(screen.getByText("set-dark"));
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("does not throw when persistence fails", async () => {
    const user = userEvent.setup();
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    await user.click(screen.getByText("set-dark"));
    // In-memory state still updates even though persistence failed.
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    spy.mockRestore();
  });

  // ─── matchMedia following ──────────────────────────────────────────────────

  it("follows OS changes while no explicit choice has been made", () => {
    const mq = mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("light");

    act(() => mq.dispatchChange(true));
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(currentDataTheme()).toBe("dark");

    act(() => mq.dispatchChange(false));
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  it("stops following OS changes once the user makes an explicit choice", async () => {
    const user = userEvent.setup();
    const mq = mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await user.click(screen.getByText("set-light")); // explicit choice
    act(() => mq.dispatchChange(true)); // OS goes dark
    // Explicit choice wins; OS change is ignored.
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  it("does not follow OS changes when a stored choice exists at mount", () => {
    const mq = mockMatchMedia(false);
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    act(() => mq.dispatchChange(true));
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  it("supports the legacy addListener/removeListener API", () => {
    const mq = mockMatchMedia(false, { legacy: true });
    const { unmount } = render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    act(() => mq.dispatchChange(true));
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");

    expect(() => unmount()).not.toThrow();
    expect(mq.removeListener).toHaveBeenCalled();
  });

  it("does not subscribe when matchMedia is unavailable", () => {
    // @ts-ignore simulate an environment without matchMedia
    delete window.matchMedia;
    expect(() =>
      render(
        <ThemeProvider>
          <ThemeProbe />
        </ThemeProvider>,
      ),
    ).not.toThrow();
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  // ─── cross-tab storage sync ────────────────────────────────────────────────

  it("syncs a valid theme written by another tab", () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: THEME_STORAGE_KEY,
          newValue: "dark",
        }),
      );
    });
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(currentDataTheme()).toBe("dark");
  });

  it("ignores storage events for unrelated keys", () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "something-else", newValue: "dark" }),
      );
    });
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  it("ignores tampered values arriving via the storage event", () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: THEME_STORAGE_KEY,
          newValue: "dark\" onmouseover=alert(1)",
        }),
      );
    });
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(currentDataTheme()).toBe("light");
  });

  it("resumes following the OS when another tab clears the choice", () => {
    const mq = mockMatchMedia(true); // OS = dark
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("light");

    // Another tab removes the stored choice (newValue === null).
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: null }),
      );
    });
    // Falls back to current OS preference (dark)...
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");

    // ...and OS following is active again.
    act(() => mq.dispatchChange(false));
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  it("cleans up listeners on unmount", () => {
    const mq = mockMatchMedia(false);
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    unmount();
    expect(mq.removeEventListener).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith("storage", expect.any(Function));
  });
});

// ─── useTheme guard ──────────────────────────────────────────────────────────

describe("useTheme", () => {
  it("throws a helpful error when used outside a ThemeProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow(
      /useTheme must be used within a ThemeProvider/,
    );
    spy.mockRestore();
  });

  it("provides the context value within a provider", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });
    const value: Theme = result.current.theme;
    expect(value).toBe("light");
    expect(typeof result.current.setTheme).toBe("function");
    expect(typeof result.current.toggleTheme).toBe("function");
  });
});
