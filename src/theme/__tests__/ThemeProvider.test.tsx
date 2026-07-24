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
  applyCustomTokens,
  clearCustomTokens,
  THEME_STORAGE_KEY,
  CUSTOM_THEME_STORAGE_KEY,
  type Theme,
  type CustomThemeDefinition,
} from "../ThemeProvider";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ChangeHandler = (e: MediaQueryListEvent) => void;

function mockMatchMedia(matches: boolean, opts: { legacy?: boolean } = {}) {
  const listeners = new Set<ChangeHandler>();
  const mq: Record<string, unknown> = {
    matches,
    media: "(prefers-color-scheme: dark)",
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

function currentDataTheme() {
  return document.documentElement.getAttribute("data-theme");
}

function customProp(name: string) {
  return document.documentElement.style.getPropertyValue(name);
}

/** A valid org brand theme definition that passes all WCAG checks. */
const VALID_BRAND: CustomThemeDefinition = {
  id: "acme-corp",
  label: "Acme Corp",
  tokenOverrides: {
    "--color-accent-primary": "#1e40af",
    "--color-accent-secondary": "#1d4ed8",
    "--navbar-bg": "#1e3a5f",
    "--navbar-logo-color": "#ffffff",
    "--navbar-link-color": "#e2e8f0",
    "--color-cta-primary-bg": "#1e40af",
    "--color-cta-primary-text": "#ffffff",
  },
};

/** A theme definition that will fail WCAG contrast (light teal on white). */
const CONTRAST_FAIL_BRAND: CustomThemeDefinition = {
  id: "bad-contrast",
  label: "Bad Contrast",
  tokenOverrides: {
    "--navbar-logo-color": "#00b8d4",
    "--navbar-bg": "#ffffff",
  },
};

/** A theme definition with a locked token. */
const LOCKED_TOKEN_BRAND: CustomThemeDefinition = {
  id: "locked-attempt",
  label: "Locked Attempt",
  tokenOverrides: {
    "--focus-ring-color": "#ff0000",
  },
};

/** Small consumer that surfaces all custom-theme context values. */
function ThemeProbe() {
  const {
    theme,
    toggleTheme,
    customTheme,
    customThemeState,
    registrationErrors,
    registerTheme,
    applyCustomTheme,
    clearCustomTheme,
    previewCustomTheme,
  } = useTheme();

  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="custom-state">{customThemeState}</span>
      <span data-testid="custom-id">{customTheme?.id ?? "none"}</span>
      <span data-testid="error-count">{registrationErrors.length}</span>
      <button onClick={toggleTheme}>toggle</button>
      <button onClick={() => registerTheme(VALID_BRAND)}>register-valid</button>
      <button onClick={() => registerTheme(CONTRAST_FAIL_BRAND)}>register-bad-contrast</button>
      <button onClick={() => registerTheme(LOCKED_TOKEN_BRAND)}>register-locked</button>
      <button onClick={() => previewCustomTheme(VALID_BRAND)}>preview</button>
      <button onClick={applyCustomTheme}>apply</button>
      <button onClick={clearCustomTheme}>clear</button>
    </div>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("style");
  mockMatchMedia(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Existing light/dark behaviour (regression guard) ────────────────────────

describe("ThemeProvider — built-in light/dark (regression)", () => {
  it("isTheme accepts only light and dark", () => {
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("custom")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });

  it("resolveInitialTheme returns light when no stored value and OS=light", () => {
    expect(resolveInitialTheme()).toBe("light");
  });

  it("applyTheme sets data-theme", () => {
    applyTheme("dark");
    expect(currentDataTheme()).toBe("dark");
  });

  it("initTheme sets data-theme without a custom theme stored", () => {
    const t = initTheme();
    expect(t).toBe("light");
    expect(currentDataTheme()).toBe("light");
  });

  it("toggleTheme still works after custom-theme code is added", async () => {
    const user = userEvent.setup();
    render(<ThemeProbe />, { wrapper: Wrapper });
    await user.click(screen.getByText("toggle"));
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
  });
});

// ─── Custom token DOM helpers ─────────────────────────────────────────────────

describe("applyCustomTokens / clearCustomTokens", () => {
  it("writes --custom-* props to html element", () => {
    applyCustomTokens({ "--color-accent-primary": "#1e40af" });
    expect(customProp("--custom-color-accent-primary")).toBe("#1e40af");
  });

  it("clears previously written --custom-* props", () => {
    applyCustomTokens({ "--color-accent-primary": "#1e40af" });
    clearCustomTokens();
    expect(customProp("--custom-color-accent-primary")).toBe("");
  });

  it("ignores non-hex values (CSS injection guard)", () => {
    applyCustomTokens({ "--color-accent-primary": "red; background:url(x)" as never });
    // The value fails the hex regex inside applyCustomTokens, so nothing is written.
    expect(customProp("--custom-color-accent-primary")).toBe("");
  });

  it("only clears --custom-* props, leaving other inline styles intact", () => {
    document.documentElement.style.setProperty("--some-other", "value");
    applyCustomTokens({ "--color-accent-primary": "#1e40af" });
    clearCustomTokens();
    expect(document.documentElement.style.getPropertyValue("--some-other")).toBe(
      "value",
    );
  });
});

// ─── State machine ────────────────────────────────────────────────────────────

describe("ThemeProvider — custom theme state machine", () => {
  it("starts in default state with no custom theme", () => {
    render(<ThemeProbe />, { wrapper: Wrapper });
    expect(screen.getByTestId("custom-state")).toHaveTextContent("default");
    expect(screen.getByTestId("custom-id")).toHaveTextContent("none");
  });

  it("transitions to custom-pending-preview after registerTheme (valid)", async () => {
    const user = userEvent.setup();
    render(<ThemeProbe />, { wrapper: Wrapper });

    await user.click(screen.getByText("register-valid"));

    expect(screen.getByTestId("custom-state")).toHaveTextContent(
      "custom-pending-preview",
    );
    expect(screen.getByTestId("custom-id")).toHaveTextContent("acme-corp");
  });

  it("sets data-theme=custom on the DOM after registerTheme", async () => {
    const user = userEvent.setup();
    render(<ThemeProbe />, { wrapper: Wrapper });

    await user.click(screen.getByText("register-valid"));
    expect(currentDataTheme()).toBe("custom");
  });

  it("writes --custom-* CSS props after registerTheme", async () => {
    const user = userEvent.setup();
    render(<ThemeProbe />, { wrapper: Wrapper });

    await user.click(screen.getByText("register-valid"));
    expect(customProp("--custom-color-accent-primary")).toBe("#1e40af");
  });

  it("transitions to custom-applied after applyCustomTheme", async () => {
    const user = userEvent.setup();
    render(<ThemeProbe />, { wrapper: Wrapper });

    await user.click(screen.getByText("register-valid"));
    await user.click(screen.getByText("apply"));

    expect(screen.getByTestId("custom-state")).toHaveTextContent("custom-applied");
  });

  it("persists custom theme to localStorage after applyCustomTheme", async () => {
    const user = userEvent.setup();
    render(<ThemeProbe />, { wrapper: Wrapper });

    await user.click(screen.getByText("register-valid"));
    await user.click(screen.getByText("apply"));

    const stored = JSON.parse(
      localStorage.getItem(CUSTOM_THEME_STORAGE_KEY) ?? "null",
    );
    expect(stored).not.toBeNull();
    expect(stored.id).toBe("acme-corp");
  });

  it("transitions back to default after clearCustomTheme", async () => {
    const user = userEvent.setup();
    render(<ThemeProbe />, { wrapper: Wrapper });

    await user.click(screen.getByText("register-valid"));
    await user.click(screen.getByText("apply"));
    await user.click(screen.getByText("clear"));

    expect(screen.getByTestId("custom-state")).toHaveTextContent("default");
    expect(screen.getByTestId("custom-id")).toHaveTextContent("none");
  });

  it("restores built-in data-theme after clearCustomTheme", async () => {
    const user = userEvent.setup();
    render(<ThemeProbe />, { wrapper: Wrapper });

    await user.click(screen.getByText("register-valid"));
    await user.click(screen.getByText("clear"));

    expect(currentDataTheme()).not.toBe("custom");
  });

  it("removes --custom-* props after clearCustomTheme", async () => {
    const user = userEvent.setup();
    render(<ThemeProbe />, { wrapper: Wrapper });

    await user.click(screen.getByText("register-valid"));
    await user.click(screen.getByText("clear"));

    expect(customProp("--custom-color-accent-primary")).toBe("");
  });

  it("removes custom theme from localStorage after clearCustomTheme", async () => {
    const user = userEvent.setup();
    render(<ThemeProbe />, { wrapper: Wrapper });

    await user.click(screen.getByText("register-valid"));
    await user.click(screen.getByText("apply"));
    await user.click(screen.getByText("clear"));

    expect(localStorage.getItem(CUSTOM_THEME_STORAGE_KEY)).toBeNull();
  });
});

// ─── Validation / invalid-override state ─────────────────────────────────────

describe("ThemeProvider — validation errors", () => {
  it("transitions to invalid-override when a locked token is supplied", async () => {
    const user = userEvent.setup();
    render(<ThemeProbe />, { wrapper: Wrapper });

    await user.click(screen.getByText("register-locked"));

    expect(screen.getByTestId("custom-state")).toHaveTextContent(
      "invalid-override",
    );
    expect(Number(screen.getByTestId("error-count").textContent)).toBeGreaterThan(0);
  });

  it("transitions to invalid-override on a contrast failure", async () => {
    const user = userEvent.setup();
    render(<ThemeProbe />, { wrapper: Wrapper });

    await user.click(screen.getByText("register-bad-contrast"));

    expect(screen.getByTestId("custom-state")).toHaveTextContent(
      "invalid-override",
    );
  });

  it("does not apply data-theme=custom on a failed registration", async () => {
    const user = userEvent.setup();
    render(<ThemeProbe />, { wrapper: Wrapper });

    await user.click(screen.getByText("register-locked"));

    expect(currentDataTheme()).not.toBe("custom");
  });

  it("does not persist a failed registration to localStorage", async () => {
    const user = userEvent.setup();
    render(<ThemeProbe />, { wrapper: Wrapper });

    await user.click(screen.getByText("register-bad-contrast"));

    expect(localStorage.getItem(CUSTOM_THEME_STORAGE_KEY)).toBeNull();
  });

  it("returns false from registerTheme on validation failure", () => {
    const { result } = renderHook(() => useTheme(), { wrapper: Wrapper });
    let returnValue: boolean | undefined;
    act(() => {
      returnValue = result.current.registerTheme(LOCKED_TOKEN_BRAND);
    });
    expect(returnValue).toBe(false);
  });

  it("returns true from registerTheme on success", () => {
    const { result } = renderHook(() => useTheme(), { wrapper: Wrapper });
    let returnValue: boolean | undefined;
    act(() => {
      returnValue = result.current.registerTheme(VALID_BRAND);
    });
    expect(returnValue).toBe(true);
  });
});

// ─── previewCustomTheme ───────────────────────────────────────────────────────

describe("ThemeProvider — previewCustomTheme", () => {
  it("behaves identically to registerTheme for a valid definition", async () => {
    const user = userEvent.setup();
    render(<ThemeProbe />, { wrapper: Wrapper });

    await user.click(screen.getByText("preview"));

    expect(screen.getByTestId("custom-state")).toHaveTextContent(
      "custom-pending-preview",
    );
    expect(currentDataTheme()).toBe("custom");
  });

  it("does NOT persist to localStorage (preview only)", async () => {
    const user = userEvent.setup();
    render(<ThemeProbe />, { wrapper: Wrapper });

    await user.click(screen.getByText("preview"));

    expect(localStorage.getItem(CUSTOM_THEME_STORAGE_KEY)).toBeNull();
  });
});

// ─── Persistence / rehydration ────────────────────────────────────────────────

describe("ThemeProvider — persistence and rehydration", () => {
  it("rehydrates a persisted custom theme on mount", () => {
    const stored = {
      id: "acme-corp",
      label: "Acme Corp",
      tokenOverrides: {},
      validatedTokens: { "--color-accent-primary": "#1e40af" },
    };
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(stored));

    render(<ThemeProbe />, { wrapper: Wrapper });

    expect(screen.getByTestId("custom-state")).toHaveTextContent("custom-applied");
    expect(screen.getByTestId("custom-id")).toHaveTextContent("acme-corp");
  });

  it("ignores a malformed custom theme entry in localStorage", () => {
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, "not-valid-json{{");
    // Must not throw.
    expect(() => render(<ThemeProbe />, { wrapper: Wrapper })).not.toThrow();
    expect(screen.getByTestId("custom-state")).toHaveTextContent("default");
  });

  it("does not apply a custom theme when nothing is stored", () => {
    render(<ThemeProbe />, { wrapper: Wrapper });
    expect(currentDataTheme()).not.toBe("custom");
  });

  it("sanitises a theme id containing unsafe characters", () => {
    const { result } = renderHook(() => useTheme(), { wrapper: Wrapper });
    act(() => {
      result.current.registerTheme({
        ...VALID_BRAND,
        id: "Acme Corp <script>",
      });
    });
    // The id is sanitised: unsafe chars become '-', leaving no < or >
    const id = result.current.customTheme?.id ?? "";
    expect(id).not.toMatch(/[<>]/);
    expect(id.length).toBeGreaterThan(0);
  });

  it("rejects a theme id that reduces to empty after sanitisation", () => {
    const { result } = renderHook(() => useTheme(), { wrapper: Wrapper });
    let ok: boolean | undefined;
    act(() => {
      ok = result.current.registerTheme({
        ...VALID_BRAND,
        id: "<<<>>>",
      });
    });
    expect(ok).toBe(false);
    expect(result.current.customThemeState).toBe("invalid-override");
  });
});

// ─── applyCustomTheme guard ───────────────────────────────────────────────────

describe("ThemeProvider — applyCustomTheme guard", () => {
  it("does nothing when state is not custom-pending-preview", () => {
    const { result } = renderHook(() => useTheme(), { wrapper: Wrapper });
    act(() => {
      result.current.applyCustomTheme(); // state is 'default'
    });
    expect(result.current.customThemeState).toBe("default");
    expect(localStorage.getItem(CUSTOM_THEME_STORAGE_KEY)).toBeNull();
  });
});

// ─── useTheme guard ───────────────────────────────────────────────────────────

describe("useTheme", () => {
  it("throws when used outside a ThemeProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow(
      /useTheme must be used within a ThemeProvider/,
    );
    spy.mockRestore();
  });

  it("exposes all new custom-theme API members", () => {
    const { result } = renderHook(() => useTheme(), { wrapper: Wrapper });
    expect(typeof result.current.registerTheme).toBe("function");
    expect(typeof result.current.previewCustomTheme).toBe("function");
    expect(typeof result.current.applyCustomTheme).toBe("function");
    expect(typeof result.current.clearCustomTheme).toBe("function");
    expect(result.current.customThemeState).toBeDefined();
    expect(Array.isArray(result.current.registrationErrors)).toBe(true);
  });
});
