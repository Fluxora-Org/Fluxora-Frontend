import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { initTheme, THEME_STORAGE_KEY, CUSTOM_THEME_STORAGE_KEY, ThemeProvider, useTheme } from "../ThemeProvider";

function currentDataTheme(): string | null {
  return document.documentElement.getAttribute("data-theme");
}

function ThemeProbe() {
  const { theme } = useTheme();
  return <span data-testid="theme">{theme}</span>;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
});

describe("contrast regression theme snapshots", () => {
  it("keeps the initial theme stable after initTheme has already applied it", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");

    expect(initTheme()).toBe("dark");
    expect(currentDataTheme()).toBe("dark");

    localStorage.setItem(THEME_STORAGE_KEY, "light");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(currentDataTheme()).toBe("dark");
  });

  it("keeps the initial theme stable when the storage value changes before the provider mounts", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");

    expect(initTheme()).toBe("light");
    expect(currentDataTheme()).toBe("light");

    localStorage.setItem(THEME_STORAGE_KEY, "dark");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(currentDataTheme()).toBe("light");
  });

  it("remains stable across rerenders after the initial snapshot is applied", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");

    expect(initTheme()).toBe("dark");

    const { rerender } = render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    rerender(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(currentDataTheme()).toBe("dark");
  });
});

// ─── Edge-case: empty / missing localStorage ───────────────────────────────

describe("contrast regression theme snapshots — empty storage", () => {
  it("defaults to light when no theme is stored", () => {
    expect(initTheme()).toBe("light");
    expect(currentDataTheme()).toBe("light");
  });

  it("defaults to light when localStorage has an invalid theme value", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "invalid-value");
    expect(initTheme()).toBe("light");
  });
});

// ─── Edge-case: corrupted custom theme storage ─────────────────────────────

describe("contrast regression theme snapshots — corrupted custom theme", () => {
  it("falls back to default when custom theme JSON is malformed", () => {
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, "{not-valid-json");
    expect(initTheme()).toBe("light");
    expect(currentDataTheme()).toBe("light");
  });

  it("falls back to default when custom theme JSON is missing required fields", () => {
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify({ id: "test" }));
    expect(initTheme()).toBe("light");
  });

  it("falls back to default when custom theme JSON is an array", () => {
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify([1, 2, 3]));
    expect(initTheme()).toBe("light");
  });
});

// ─── Edge-case: provider remounting ────────────────────────────────────────

describe("contrast regression theme snapshots — remounting", () => {
  it("preserves theme after unmount and remount", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");

    const { unmount } = render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");

    unmount();

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(currentDataTheme()).toBe("dark");
  });

  it("applies cyperpunk theme correctly", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "cyberpunk");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("cyberpunk");
    expect(currentDataTheme()).toBe("cyberpunk");
  });
});

// ─── Edge-case: THEME_STORAGE_KEY constant ─────────────────────────────────

describe("contrast regression theme snapshots — storage key stability", () => {
  it("THEME_STORAGE_KEY is 'theme'", () => {
    expect(THEME_STORAGE_KEY).toBe("theme");
  });

  it("initTheme is a function", () => {
    expect(typeof initTheme).toBe("function");
  });
});
