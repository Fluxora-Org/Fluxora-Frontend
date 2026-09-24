import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeSegmentedControl from "../ThemeSegmentedControl";
import { ThemeProvider } from "../../../theme/ThemeProvider";

describe("ThemeSegmentedControl", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders three options with correct accessibility attributes", () => {
    render(
      <ThemeProvider>
        <ThemeSegmentedControl />
      </ThemeProvider>
    );

    const radiogroup = screen.getByRole("radiogroup", { name: "Theme preference" });
    expect(radiogroup).toBeInTheDocument();

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);

    // Initial state: Auto is selected (default)
    expect(radios[0]).toHaveAttribute("aria-checked", "false"); // Light
    expect(radios[1]).toHaveAttribute("aria-checked", "false"); // Dark
    expect(radios[2]).toHaveAttribute("aria-checked", "true");  // Auto
  });

  it("announces the currently resolved theme in the 'Auto' option's label", () => {
    render(
      <ThemeProvider>
        <ThemeSegmentedControl />
      </ThemeProvider>
    );

    // Auto is selected, should announce "Auto (currently light)" under default test environment setup.ts
    const autoRadio = screen.getByRole("radio", { name: "Auto (currently light)" });
    expect(autoRadio).toBeInTheDocument();
  });

  it("handles keyboard navigation using arrow keys (Right/Down, Left/Up, wraps)", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeSegmentedControl />
      </ThemeProvider>
    );

    const radios = screen.getAllByRole("radio");
    // Start with focus on Auto (index 2), because it is selected
    radios[2].focus();
    expect(document.activeElement).toBe(radios[2]);

    // Press ArrowRight from Auto -> Light (index 0)
    await user.keyboard("{ArrowRight}");
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(radios[0]);

    // Press ArrowRight from Light -> Dark (index 1)
    await user.keyboard("{ArrowRight}");
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(radios[1]);

    // Press ArrowDown from Dark -> Auto (index 2)
    await user.keyboard("{ArrowDown}");
    expect(radios[2]).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(radios[2]);

    // Press ArrowLeft from Auto -> Dark (index 1)
    await user.keyboard("{ArrowLeft}");
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(radios[1]);

    // Press ArrowUp from Dark -> Light (index 0)
    await user.keyboard("{ArrowUp}");
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(radios[0]);
  });

  it("updates theme preference when clicked", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeSegmentedControl />
      </ThemeProvider>
    );

    const radios = screen.getAllByRole("radio");

    // Click Light
    await user.click(radios[0]);
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem("theme")).toBe("light");

    // Click Dark
    await user.click(radios[1]);
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem("theme")).toBe("dark");

    // Click Auto
    await user.click(radios[2]);
    expect(radios[2]).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem("theme")).toBeNull();
  });

  it("sizes icons per --icon-size-sm as specified (not --icon-size-xs)", () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeSegmentedControl />
      </ThemeProvider>
    );

    const icons = container.querySelectorAll("svg.icon-sm");
    expect(icons).toHaveLength(3);
    expect(container.querySelectorAll("svg.icon-xs")).toHaveLength(0);
  });
});
