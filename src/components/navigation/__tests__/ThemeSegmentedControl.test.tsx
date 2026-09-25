import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeSegmentedControl from "../ThemeSegmentedControl";
import { ThemeProvider, initTheme } from "../../../theme/ThemeProvider";
import { bootstrapTheme } from "../../../theme/themeBootstrap";

/** Override `window.matchMedia` with a deterministic colour-scheme result. */
function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches,
      media: "(prefers-color-scheme: dark)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }),
  });
}

function renderControl() {
  return render(
    <ThemeProvider>
      <ThemeSegmentedControl />
    </ThemeProvider>,
  );
}

const dataTheme = () => document.documentElement.getAttribute("data-theme");

/** The currently-checked radio (the one the control reports as active). */
function checkedRadio() {
  return screen
    .getAllByRole("radio")
    .find((radio) => radio.getAttribute("aria-checked") === "true");
}

describe("ThemeSegmentedControl", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    mockMatchMedia(false); // OS prefers light unless a test overrides it
  });

  it("renders every theme option with correct accessibility attributes", () => {
    renderControl();

    const radiogroup = screen.getByRole("radiogroup", { name: "Theme preference" });
    expect(radiogroup).toBeInTheDocument();

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(4);

    // Initial state: Auto is selected (default)
    expect(radios[0]).toHaveAttribute("aria-checked", "false"); // Light
    expect(radios[1]).toHaveAttribute("aria-checked", "false"); // Dark
    expect(radios[2]).toHaveAttribute("aria-checked", "false"); // Cyberpunk
    expect(radios[3]).toHaveAttribute("aria-checked", "true");  // Auto
  });

  it("announces the currently resolved theme in the 'Auto' option's label", () => {
    renderControl();

    // Auto is selected, should announce "Auto (currently light)" under the
    // default test environment setup.
    const autoRadio = screen.getByRole("radio", { name: "Auto (currently light)" });
    expect(autoRadio).toBeInTheDocument();
  });

  it("handles keyboard navigation using arrow keys (Right/Down, Left/Up, wraps)", async () => {
    const user = userEvent.setup();
    renderControl();

    const radios = screen.getAllByRole("radio");
    // Start with focus on Auto (index 3), because it is selected
    radios[3].focus();
    expect(document.activeElement).toBe(radios[3]);

    // Press ArrowRight from Auto -> Light (index 0)
    await user.keyboard("{ArrowRight}");
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(radios[0]);

    // Press ArrowRight from Light -> Dark (index 1)
    await user.keyboard("{ArrowRight}");
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(radios[1]);

    // Press ArrowDown from Dark -> Cyberpunk (index 2)
    await user.keyboard("{ArrowDown}");
    expect(radios[2]).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(radios[2]);

    // Press ArrowRight from Cyberpunk -> Auto (index 3)
    await user.keyboard("{ArrowRight}");
    expect(radios[3]).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(radios[3]);

    // Press ArrowLeft from Auto -> Cyberpunk (index 2)
    await user.keyboard("{ArrowLeft}");
    expect(radios[2]).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(radios[2]);

    // Press ArrowUp from Cyberpunk -> Dark (index 1)
    await user.keyboard("{ArrowUp}");
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(radios[1]);
  });

  it("updates theme preference when clicked", async () => {
    const user = userEvent.setup();
    renderControl();

    const radios = screen.getAllByRole("radio");

    // Click Light
    await user.click(radios[0]);
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem("theme")).toBe("light");

    // Click Dark
    await user.click(radios[1]);
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem("theme")).toBe("dark");

    // Click Cyberpunk
    await user.click(radios[2]);
    expect(radios[2]).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem("theme")).toBe("cyberpunk");

    // Click Auto
    await user.click(radios[3]);
    expect(radios[3]).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem("theme")).toBeNull();
  });

  it("sizes icons per --icon-size-sm as specified (not --icon-size-xs)", () => {
    const { container } = renderControl();

    const icons = container.querySelectorAll("svg.icon-sm");
    expect(icons).toHaveLength(4);
    expect(container.querySelectorAll("svg.icon-xs")).toHaveLength(0);
  });
});

// ─── Acceptance: control and applied theme agree ────────────────────────────

describe("ThemeSegmentedControl — control reflects the genuinely active theme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    mockMatchMedia(false);
  });

  // Select each explicit theme, then simulate a page reload (bootstrap path,
  // then React mount) and assert the control and DOM theme agree.
  it.each([
    ["Light", "light"],
    ["Dark", "dark"],
    ["Cyberpunk", "cyberpunk"],
  ] as const)(
    "persists %s across a reload and agrees with the applied theme",
    async (label, stored) => {
      const user = userEvent.setup();
      const { unmount } = renderControl();

      await user.click(screen.getByRole("radio", { name: label }));
      expect(localStorage.getItem("theme")).toBe(stored);
      expect(dataTheme()).toBe(stored);

      unmount();

      // Reload: the bootstrap path runs before React mounts, then the provider
      // rehydrates the persisted preference.
      initTheme();
      renderControl();

      expect(dataTheme()).toBe(stored);
      expect(screen.getByRole("radio", { name: label })).toHaveAttribute(
        "aria-checked",
        "true",
      );
      expect(checkedRadio()).toBe(
        screen.getByRole("radio", { name: label }),
      );
    },
  );

  it("distinguishes system-preference mode from an explicit choice", async () => {
    const user = userEvent.setup();
    mockMatchMedia(true); // OS prefers dark
    const { unmount } = renderControl();

    // Default is auto → no persisted preference, OS dark is applied, but the
    // control reports *system mode*, not an explicit dark choice.
    expect(localStorage.getItem("theme")).toBeNull();
    expect(dataTheme()).toBe("dark");
    expect(screen.getByRole("radio", { name: /^Auto/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(
      screen.getByRole("radio", { name: "Auto (currently dark)" }),
    ).toBeInTheDocument();

    // Pick an explicit theme: it is persisted as the explicit choice.
    await user.click(screen.getByRole("radio", { name: "Light" }));
    expect(localStorage.getItem("theme")).toBe("light");
    expect(dataTheme()).toBe("light");
    expect(screen.getByRole("radio", { name: "Light" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: /^Auto/ })).toHaveAttribute(
      "aria-checked",
      "false",
    );

    unmount();

    // Explicit choice survives the reload.
    initTheme();
    renderControl();
    expect(dataTheme()).toBe("light");
    expect(screen.getByRole("radio", { name: "Light" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    // Back to auto: storage cleared, OS dark wins again, and the control
    // returns to system mode rather than pinning an explicit dark choice.
    await user.click(screen.getByRole("radio", { name: /^Auto/ }));
    expect(localStorage.getItem("theme")).toBeNull();
    expect(dataTheme()).toBe("dark");
    expect(screen.getByRole("radio", { name: /^Auto/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("reflects a theme applied by the bootstrap path before React mounts", () => {
    // The inline bootstrap script reads the persisted preference and writes
    // data-theme on the very first paint, before ThemeProvider exists.
    localStorage.setItem("theme", "cyberpunk");
    bootstrapTheme();
    expect(dataTheme()).toBe("cyberpunk");

    renderControl();

    // The provider must not clobber the bootstrap-applied theme…
    expect(dataTheme()).toBe("cyberpunk");
    // …and the control must report the genuinely active theme.
    expect(screen.getByRole("radio", { name: "Cyberpunk" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});
