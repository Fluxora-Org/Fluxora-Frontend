import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { initTheme, THEME_STORAGE_KEY, ThemeProvider, useTheme } from "../ThemeProvider";

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
