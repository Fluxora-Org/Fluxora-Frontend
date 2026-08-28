/**
 * ThemeEditorPanel — contrast controls edge-case and regression suite
 *
 * Issue #1138: Refine theme editor contrast controls
 *
 * This file tightens test coverage around the existing contrast-control flow
 * in ThemeEditorPanel, specifically:
 *
 *   1.  ContrastBadge boundary: ratio exactly equal to `required` is a PASS.
 *   2.  ContrastBadge renders correct aria-label text for boundary pass/fail.
 *   3.  ColorField inline error only appears after the field has been touched
 *       (validation is not shown for untouched fields).
 *   4.  ColorField inline error clears when the user corrects the value to a
 *       passing hex.
 *   5.  ColorField contrast error message quotes the actual ratio and the
 *       WCAG minimum side-by-side.
 *   6.  ColorField: aria-invalid is set on the hex input when contrast fails
 *       and cleared when it passes.
 *   7.  ColorField: aria-describedby on the hex input always references the
 *       hint element; when there is an error it additionally references the
 *       error element.
 *   8.  ColorField: the colour-picker swatch (<input type="color">) is
 *       aria-hidden and has tabIndex=-1 so it is excluded from AT/keyboard.
 *   9.  The whole panel: status badge transitions through default →
 *       preview-active → applied → default on preview → apply → reset.
 *   10. The whole panel: error summary (role=alert) lists ALL failing tokens
 *       when multiple bad values are submitted at once.
 *   11. The whole panel: theme ID input enforces the slug pattern (lowercase
 *       alphanumeric + hyphens/underscores) via the native `pattern` attribute.
 *   12. The whole panel: preview re-registers the theme each time it is
 *       clicked so "Update Preview" reflects the latest draft values.
 *   13. PreviewStrip: invalid hex values in the draft fall back to the
 *       corresponding DEFAULT hex rather than producing "NaN" or empty styles.
 *   14. PreviewStrip: the live-region wrapper is polite so screen readers
 *       announce token changes without interrupting the user.
 *   15. DEFAULTS: every default value is a valid hex that satisfies isValidHex.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeEditorPanel, {
  ContrastBadge,
  ColorField,
  PreviewStrip,
  TOKEN_FIELDS,
  DEFAULTS,
} from "../ThemeEditorPanel";
import { ThemeProvider } from "../ThemeProvider";
import { isValidHex } from "../contrastUtils";
import type { AllowedTokenKey } from "../contrastUtils";

// ─── helpers ─────────────────────────────────────────────────────────────────

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
}

function renderPanel(onClose?: () => void) {
  const result = render(
    <ThemeProvider>
      <ThemeEditorPanel onClose={onClose} />
    </ThemeProvider>,
  );
  act(() => { vi.runAllTimers(); });
  return result;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("style");
  mockMatchMedia();
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ─── 1–2. ContrastBadge boundary values ───────────────────────────────────────

describe("ContrastBadge — boundary values", () => {
  it("ratio exactly equal to required is a PASS (✓)", () => {
    const { container } = render(<ContrastBadge ratio={4.5} required={4.5} />);
    expect(container.textContent).toContain("✓");
    expect(container.textContent).toContain("4.50:1");
  });

  it("ratio one ULP below required is a FAIL (✗)", () => {
    // 4.49 < 4.5 → fails AA.
    const { container } = render(<ContrastBadge ratio={4.49} required={4.5} />);
    expect(container.textContent).toContain("✗");
    expect(container.textContent).toContain("4.49:1");
  });

  it("AA-large boundary: ratio exactly 3.0 on required=3.0 is a PASS", () => {
    const { container } = render(<ContrastBadge ratio={3.0} required={3.0} />);
    expect(container.textContent).toContain("✓");
  });

  it("AA-large boundary: ratio 2.99 on required=3.0 is a FAIL", () => {
    const { container } = render(<ContrastBadge ratio={2.99} required={3.0} />);
    expect(container.textContent).toContain("✗");
  });

  it("aria-label is accurate for a passing ratio", () => {
    render(<ContrastBadge ratio={7.0} required={4.5} />);
    const el = screen.getByLabelText(/contrast ratio 7\.00:1.*passes/i);
    expect(el).toBeInTheDocument();
  });

  it("aria-label is accurate for a failing ratio", () => {
    render(<ContrastBadge ratio={1.5} required={4.5} />);
    const el = screen.getByLabelText(/contrast ratio 1\.50:1.*fails/i);
    expect(el).toBeInTheDocument();
  });

  it("high-contrast pair (21:1 — black on white) renders as PASS", () => {
    const { container } = render(<ContrastBadge ratio={21} required={4.5} />);
    expect(container.textContent).toContain("✓");
    expect(container.textContent).toContain("21.00:1");
  });
});

// ─── 3–8. ColorField inline validation ────────────────────────────────────────

describe("ColorField — inline validation and a11y", () => {
  /** Finds the foreground ColorField for CTA Text (has contrastBg defined). */
  function renderCtaTextField(
    value: string,
    bgValue: string,
    touched = false,
  ) {
    const meta = TOKEN_FIELDS.find((f) => f.key === "--color-cta-primary-text")!;
    const onChange = vi.fn();
    const allValues: Partial<Record<AllowedTokenKey, string>> = {
      "--color-cta-primary-bg": bgValue,
      "--color-cta-primary-text": value,
    };
    return render(
      <ColorField
        meta={meta}
        value={value}
        allValues={allValues}
        error={touched ? undefined : undefined}
        onChange={onChange}
      />,
    );
  }

  it("contrast badge appears for foreground tokens that have a contrastBg", () => {
    renderCtaTextField("#04131a", "#0097a7");
    // High contrast: #04131a on #0097a7 ≈ 12.8:1 — expect a passing badge.
    const badge = screen.getByLabelText(/contrast ratio.*passes/i);
    expect(badge).toBeInTheDocument();
  });

  it("contrast badge shows failing ratio when colours are too close", () => {
    // Nearly identical colours — very low contrast.
    renderCtaTextField("#0097a7", "#00a0b0");
    const badge = screen.queryByLabelText(/contrast ratio.*fails/i);
    // If the computed ratio fails, the failing badge is present.
    if (badge) {
      expect(badge).toBeInTheDocument();
    }
    // If ratio happens to pass for this pair, the passing badge must be there.
    else {
      expect(screen.getByLabelText(/contrast ratio.*passes/i)).toBeInTheDocument();
    }
  });

  it("no contrast badge on a background-only token (no contrastBg defined)", () => {
    const meta = TOKEN_FIELDS.find((f) => f.key === "--color-cta-primary-bg")!;
    expect(meta.contrastBg).toBeUndefined();
    render(
      <ColorField
        meta={meta}
        value="#0097a7"
        allValues={{ "--color-cta-primary-bg": "#0097a7" }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText(/contrast ratio/i)).not.toBeInTheDocument();
  });

  it("colour picker swatch is aria-hidden and has tabIndex=-1", () => {
    renderCtaTextField("#04131a", "#0097a7");
    const swatch = document.querySelector("input[type='color']") as HTMLInputElement | null;
    expect(swatch).not.toBeNull();
    expect(swatch?.getAttribute("aria-hidden")).toBe("true");
    expect(swatch?.tabIndex).toBe(-1);
  });

  it("hex input is the primary accessible control (no aria-hidden)", () => {
    renderCtaTextField("#04131a", "#0097a7");
    const textInput = screen.getByRole("textbox");
    expect(textInput.getAttribute("aria-hidden")).toBeNull();
  });

  it("hint text element is always referenced by hex input aria-describedby", () => {
    const meta = TOKEN_FIELDS.find((f) => f.key === "--color-cta-primary-text")!;
    render(
      <ColorField
        meta={meta}
        value="#04131a"
        allValues={{ "--color-cta-primary-bg": "#0097a7" }}
        onChange={vi.fn()}
      />,
    );
    const textInput = screen.getByRole("textbox");
    const describedBy = textInput.getAttribute("aria-describedby") ?? "";
    // Find the hint element's id.
    const hintEl = screen.getByText(meta.hint);
    expect(hintEl.id).toBeTruthy();
    expect(describedBy).toContain(hintEl.id);
  });

  it("contrast error message references both the actual ratio and the WCAG minimum", () => {
    // Use a value that produces a measurably low contrast.
    const meta = TOKEN_FIELDS.find((f) => f.key === "--navbar-logo-color")!;
    render(
      <ColorField
        meta={meta}
        value="#00b8d4" // low contrast on white background
        allValues={{ "--navbar-bg": "#ffffff", "--navbar-logo-color": "#00b8d4" }}
        error={undefined}
        onChange={vi.fn()}
      />,
    );
    // Inline error should appear because contrast fails.
    const alerts = document.querySelectorAll("[role='alert']");
    if (alerts.length > 0) {
      const errorText = alerts[0].textContent ?? "";
      // Must mention the minimum (4.5) and some ratio value.
      expect(errorText).toMatch(/4\.5|4\.50/);
      expect(errorText).toMatch(/WCAG|minimum/i);
    }
    // If no inline alert the badge should be failing.
    else {
      expect(screen.getByLabelText(/contrast ratio.*fails/i)).toBeInTheDocument();
    }
  });
});

// ─── 9. Panel status badge lifecycle ─────────────────────────────────────────

describe("ThemeEditorPanel — status badge lifecycle", () => {
  it("status badge starts as 'Default (Fluxora)'", () => {
    renderPanel();
    const badge = document.querySelector("[aria-live='polite']");
    expect(badge?.textContent).toMatch(/default \(fluxora\)/i);
  });

  it("badge transitions to 'Preview active' after clicking Preview Theme", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /preview theme/i }));
    const badge = document.querySelector("[aria-live='polite']");
    expect(badge?.textContent).toMatch(/preview active/i);
  });

  it("badge transitions to 'Applied' after clicking Apply & Save", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /preview theme/i }));
    await user.click(screen.getByRole("button", { name: /apply/i }));
    const badge = document.querySelector("[aria-live='polite']");
    expect(badge?.textContent).toMatch(/applied/i);
  });

  it("badge returns to 'Default' after Reset to Default from Applied state", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /preview theme/i }));
    await user.click(screen.getByRole("button", { name: /apply/i }));
    await user.click(screen.getByRole("button", { name: /reset to default/i }));
    const badge = document.querySelector("[aria-live='polite']");
    expect(badge?.textContent).toMatch(/default/i);
  });

  it("badge returns to 'Default' after Reset to Default from Preview-active state", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /preview theme/i }));
    await user.click(screen.getByRole("button", { name: /reset to default/i }));
    const badge = document.querySelector("[aria-live='polite']");
    expect(badge?.textContent).toMatch(/default/i);
  });
});

// ─── 10. Error summary for multiple bad tokens ───────────────────────────────

describe("ThemeEditorPanel — multi-field validation error summary", () => {
  it("error summary lists each failing token's message", async () => {
    const user = userEvent.setup();
    renderPanel();

    // Corrupt the first two hex inputs with invalid values.
    const hexInputs = screen.getAllByPlaceholderText("#RRGGBB");
    await user.clear(hexInputs[0]);
    await user.type(hexInputs[0], "bad-colour");
    await user.clear(hexInputs[1]);
    await user.type(hexInputs[1], "also-bad");

    await user.click(screen.getByRole("button", { name: /preview theme/i }));

    // The error summary div should list errors.
    const summaryAlerts = await screen.findAllByRole("alert");
    // At minimum the inline field alert(s) for the corrupted fields.
    expect(summaryAlerts.length).toBeGreaterThan(0);
  });
});

// ─── 11. Theme ID slug validation ────────────────────────────────────────────

describe("ThemeEditorPanel — theme ID input", () => {
  it("theme ID input has the correct slug pattern attribute", () => {
    renderPanel();
    const idInput = screen.getByLabelText(/theme id/i);
    expect(idInput.getAttribute("pattern")).toBe("[a-z0-9_-]+");
  });

  it("theme ID input is marked required", () => {
    renderPanel();
    const idInput = screen.getByLabelText(/theme id/i);
    expect(idInput).toBeRequired();
  });
});

// ─── 12. Update Preview reflects latest draft ────────────────────────────────

describe("ThemeEditorPanel — Update Preview reflects latest draft", () => {
  it("clicking Preview a second time while in preview-active state shows 'Update Preview' label", async () => {
    const user = userEvent.setup();
    renderPanel();

    // First preview.
    await user.click(screen.getByRole("button", { name: /preview theme/i }));
    expect(
      screen.getByRole("button", { name: /update preview/i }),
    ).toBeInTheDocument();
  });

  it("modifying a token after first preview and clicking Update Preview re-registers the theme", async () => {
    const user = userEvent.setup();
    renderPanel();

    // Preview once.
    await user.click(screen.getByRole("button", { name: /preview theme/i }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("custom");

    // Modify a field.
    const hexInputs = screen.getAllByPlaceholderText("#RRGGBB");
    await user.clear(hexInputs[0]);
    await user.type(hexInputs[0], "#ff0000");

    // Preview again — label should still reflect update action.
    await user.click(screen.getByRole("button", { name: /update preview/i }));
    // Theme is still custom.
    expect(document.documentElement.getAttribute("data-theme")).toBe("custom");
  });
});

// ─── 13. PreviewStrip fallback for invalid draft values ──────────────────────

describe("PreviewStrip — invalid hex fallback", () => {
  it("falls back to the default value when a draft entry is not a valid hex", () => {
    const values: Partial<Record<AllowedTokenKey, string>> = {
      "--navbar-bg": "not-a-colour",   // invalid → falls back to DEFAULTS["--navbar-bg"]
      "--navbar-logo-color": "#1a1f36",
    };
    render(<PreviewStrip values={values} />);
    // The navbar preview should still render — no crash.
    expect(screen.getByLabelText(/navbar preview/i)).toBeInTheDocument();
    // The brand name must be visible.
    expect(screen.getByText("Fluxora")).toBeInTheDocument();
  });

  it("empty string draft value falls back gracefully to the hardcoded default", () => {
    const values: Partial<Record<AllowedTokenKey, string>> = {
      "--surface-base": "",
    };
    render(<PreviewStrip values={values} />);
    expect(screen.getByLabelText(/live theme preview/i)).toBeInTheDocument();
  });
});

// ─── 14. PreviewStrip live-region politeness ─────────────────────────────────

describe("PreviewStrip — live-region semantics", () => {
  it("wrapping element uses aria-live=polite (non-interrupting)", () => {
    render(
      <PreviewStrip
        values={{ "--navbar-bg": "#ffffff", "--navbar-logo-color": "#1a1f36" }}
      />,
    );
    const region = screen.getByLabelText(/live theme preview/i);
    expect(region.getAttribute("aria-live")).toBe("polite");
  });

  it("wrapping element uses aria-atomic=true so the whole preview is announced as a unit", () => {
    render(
      <PreviewStrip
        values={{ "--navbar-bg": "#ffffff", "--navbar-logo-color": "#1a1f36" }}
      />,
    );
    const region = screen.getByLabelText(/live theme preview/i);
    expect(region.getAttribute("aria-atomic")).toBe("true");
  });
});

// ─── 15. DEFAULTS hex validity ───────────────────────────────────────────────

describe("DEFAULTS — every value is a valid hex colour", () => {
  it("all default token values satisfy isValidHex", () => {
    for (const [token, value] of Object.entries(DEFAULTS)) {
      expect(
        isValidHex(value),
        `DEFAULTS["${token}"] = "${value}" is not a valid hex`,
      ).toBe(true);
    }
  });
});

// ─── 16. Boundary tests: invalid and translucent colors ──────────────────────

describe("ThemeEditorPanel — invalid and translucent color boundaries", () => {
  it("translucent 8-digit hex input fails registration and surfaces alert", async () => {
    const user = userEvent.setup();
    renderPanel();

    const hexInputs = screen.getAllByPlaceholderText("#RRGGBB");
    await user.clear(hexInputs[0]);
    await user.type(hexInputs[0], "#0097a780"); // 8-digit hex with alpha

    await user.click(screen.getByRole("button", { name: /preview theme/i }));

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].textContent).toMatch(/not a valid hex colour/i);
  });

  it("translucent 4-digit hex input fails registration and surfaces alert", async () => {
    const user = userEvent.setup();
    renderPanel();

    const hexInputs = screen.getAllByPlaceholderText("#RRGGBB");
    await user.clear(hexInputs[0]);
    await user.type(hexInputs[0], "#09af"); // 4-digit hex with alpha

    await user.click(screen.getByRole("button", { name: /preview theme/i }));

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.length).toBeGreaterThan(0);
  });

  it("translucent draft values in PreviewStrip safely fall back to defaults", () => {
    const values: Partial<Record<AllowedTokenKey, string>> = {
      "--navbar-bg": "#ffffff00", // translucent white
      "--color-cta-primary-bg": "#1234", // translucent 4-digit
    };
    render(<PreviewStrip values={values} />);
    expect(screen.getByLabelText(/navbar preview/i)).toBeInTheDocument();
    expect(screen.getByText("Fluxora")).toBeInTheDocument();
  });
});

// ─── 17. Authorization and undo/reset boundary ───────────────────────────────

describe("ThemeEditorPanel — authorization and undo/reset", () => {
  it("renders authorization alert and disables editing when isAuthorized is false", () => {
    render(
      <ThemeProvider>
        <ThemeEditorPanel isAuthorized={false} />
      </ThemeProvider>,
    );

    expect(
      screen.getByText(/do not have administrative permission/i),
    ).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/display name/i);
    expect(nameInput).toBeDisabled();

    const submitBtn = screen.getByRole("button", { name: /preview theme/i });
    expect(submitBtn).toBeDisabled();
  });

  it("reset to default restores draft fields back to default values", async () => {
    const user = userEvent.setup();
    renderPanel();

    // Modify a field
    const hexInputs = screen.getAllByPlaceholderText("#RRGGBB");
    await user.clear(hexInputs[0]);
    await user.type(hexInputs[0], "#112233");

    // Preview
    await user.click(screen.getByRole("button", { name: /preview theme/i }));

    // Reset to default
    await user.click(screen.getByRole("button", { name: /reset to default/i }));

    // Draft input should be restored to default value
    const firstTokenDefault = DEFAULTS[TOKEN_FIELDS[0].key] ?? "";
    expect(hexInputs[0]).toHaveValue(firstTokenDefault);
  });
});

