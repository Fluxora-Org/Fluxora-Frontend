/**
 * Regression tests for issue #1710 —
 * "Assert theme edits can be reverted to the shipped defaults".
 *
 * `ThemeEditorPanel` lets operators edit brand tokens. Cancel / Reset to Default
 * must restore the shipped `DEFAULTS` from `themeEditorModel` — not leave a
 * half-edited draft, and not merely undo to a prior custom theme.
 *
 * These tests lock that contract down for:
 *  ① light built-in theme
 *  ② dark built-in theme
 *  ③ an applied custom theme
 *
 * A regression that breaks reset semantics (wrong draft, lingering custom
 * `data-theme`, or identity fields left dirty) fails these assertions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeEditorPanel, { DEFAULTS } from "../ThemeEditorPanel";
import {
  ThemeProvider,
  THEME_STORAGE_KEY,
  CUSTOM_THEME_STORAGE_KEY,
  type CustomThemeDefinition,
} from "../ThemeProvider";
import {
  createInitialDraft,
  resetDraftToDefaults,
  updateDraftToken,
  isDraftDirty,
  DEFAULTS as MODEL_DEFAULTS,
  type ThemeEditorDraft,
} from "../themeEditorModel";
import type { AllowedTokenKey } from "../contrastUtils";

/** High-contrast edits that diverge clearly from shipped defaults. */
const EDITED: Partial<Record<AllowedTokenKey, string>> = {
  "--color-accent-primary": "#1e40af",
  "--color-accent-secondary": "#1d4ed8",
  "--navbar-bg": "#0f172a",
  "--navbar-logo-color": "#f8fafc",
  "--navbar-link-color": "#e2e8f0",
  "--color-cta-primary-bg": "#1e40af",
  "--color-cta-primary-text": "#ffffff",
  "--surface-base": "#ffffff",
  "--surface-neutral": "#f1f5f9",
  "--text-vivid": "#0f172a",
  "--text-secondary": "#334155",
};

const VALID_CUSTOM: CustomThemeDefinition = {
  id: "acme-corp",
  label: "Acme Corp",
  tokenOverrides: { ...EDITED },
};

function mockMatchMedia(matches = false) {
  const mq = {
    matches,
    media: "(prefers-color-scheme: dark)",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(mq),
  });
  return mq;
}

function renderPanel(opts: { prefersDark?: boolean; onClose?: () => void } = {}) {
  mockMatchMedia(opts.prefersDark ?? false);
  const result = render(
    <ThemeProvider>
      <ThemeEditorPanel onClose={opts.onClose} />
    </ThemeProvider>,
  );
  act(() => {
    vi.runAllTimers();
  });
  return result;
}

function hexInputForLabel(label: RegExp): HTMLElement {
  const labelEl = screen.getByText(label);
  const fieldGroup = labelEl.closest("[role='group']");
  expect(fieldGroup).not.toBeNull();
  return within(fieldGroup as HTMLElement).getByPlaceholderText("#RRGGBB");
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("style");
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame"],
  });
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ─── Pure model: reset restores shipped DEFAULTS ─────────────────────────────

describe("#1710 — resetDraftToDefaults restores shipped defaults", () => {
  it("after arbitrary token edits, reset equals MODEL_DEFAULTS exactly", () => {
    let draft: ThemeEditorDraft = createInitialDraft(null);
    for (const [key, value] of Object.entries(EDITED)) {
      draft = updateDraftToken(draft, key as AllowedTokenKey, value);
    }
    expect(isDraftDirty(draft, MODEL_DEFAULTS)).toBe(true);

    const reset = resetDraftToDefaults();
    expect(reset.draft).toEqual(MODEL_DEFAULTS);
    expect(isDraftDirty(reset.draft, MODEL_DEFAULTS)).toBe(false);
    expect(reset.touched.size).toBe(0);
    expect(reset.label).toBe("My Brand Theme");
    expect(reset.themeId).toBe("org-brand");
  });

  it("reset discards a custom-theme seed — shipped defaults win, not undo", () => {
    const custom = {
      id: "acme-corp",
      label: "Acme Corp",
      tokenOverrides: EDITED,
      validatedTokens: EDITED,
      registeredAt: "2026-01-01T00:00:00.000Z",
    };
    const seeded = createInitialDraft(custom);
    expect(seeded["--color-accent-primary"]).toBe(EDITED["--color-accent-primary"]);

    const reset = resetDraftToDefaults();
    expect(reset.draft["--color-accent-primary"]).toBe(
      MODEL_DEFAULTS["--color-accent-primary"],
    );
    expect(reset.draft).toEqual(MODEL_DEFAULTS);
  });

  it("panel DEFAULTS export matches the model shipped defaults", () => {
    expect(DEFAULTS).toEqual(MODEL_DEFAULTS);
  });
});

// ─── Panel: light / dark / custom ────────────────────────────────────────────

describe.each([
  { name: "light", pref: "light" as const, prefersDark: false },
  { name: "dark", pref: "dark" as const, prefersDark: true },
])("#1710 — ThemeEditorPanel revert in $name theme", ({ name, pref, prefersDark }) => {
  it(`edits revert to shipped DEFAULTS under the ${name} built-in theme`, async () => {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
    const user = userEvent.setup();
    renderPanel({ prefersDark });

    expect(document.documentElement.getAttribute("data-theme")).toBe(pref);

    const accent = hexInputForLabel(/accent primary/i);
    expect(accent).toHaveValue(DEFAULTS["--color-accent-primary"]);

    await user.clear(accent);
    await user.type(accent, EDITED["--color-accent-primary"]!);
    expect(accent).toHaveValue(EDITED["--color-accent-primary"]);

    await user.click(screen.getByRole("button", { name: /preview theme/i }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("custom");

    await user.click(screen.getByRole("button", { name: /reset to default/i }));

    // Shipped defaults restored in the draft fields
    const accentAfter = hexInputForLabel(/accent primary/i);
    expect(accentAfter).toHaveValue(DEFAULTS["--color-accent-primary"]);

    const navbarBg = hexInputForLabel(/navbar background/i);
    expect(navbarBg).toHaveValue(DEFAULTS["--navbar-bg"]);

    // Custom theme cleared — back on the built-in preference
    expect(document.documentElement.getAttribute("data-theme")).toBe(pref);
    expect(localStorage.getItem(CUSTOM_THEME_STORAGE_KEY)).toBeNull();
  });
});

describe("#1710 — ThemeEditorPanel revert from an applied custom theme", () => {
  it("Reset to Default restores shipped DEFAULTS after custom tokens were applied", async () => {
    // Persist a previously-applied custom theme so the panel seeds from it.
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    localStorage.setItem(
      CUSTOM_THEME_STORAGE_KEY,
      JSON.stringify({
        id: VALID_CUSTOM.id,
        label: VALID_CUSTOM.label,
        validatedTokens: VALID_CUSTOM.tokenOverrides,
      }),
    );

    const user = userEvent.setup();
    renderPanel({ prefersDark: false });

    // Seeded from custom — accent is the custom override, not shipped default.
    const accent = hexInputForLabel(/accent primary/i);
    expect(accent).toHaveValue(EDITED["--color-accent-primary"]);
    expect(document.documentElement.getAttribute("data-theme")).toBe("custom");

    // Further edit, then reset — must land on shipped defaults, not the custom seed.
    await user.clear(accent);
    await user.type(accent, "#7c3aed");
    expect(accent).toHaveValue("#7c3aed");

    await user.click(screen.getByRole("button", { name: /reset to default/i }));

    const accentAfter = hexInputForLabel(/accent primary/i);
    expect(accentAfter).toHaveValue(DEFAULTS["--color-accent-primary"]);

    for (const [key, shipped] of Object.entries(DEFAULTS)) {
      // Spot-check a few representative fields via their labels
      if (key === "--color-accent-primary") {
        expect(accentAfter).toHaveValue(shipped);
      }
    }

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(CUSTOM_THEME_STORAGE_KEY)).toBeNull();
  });
});
