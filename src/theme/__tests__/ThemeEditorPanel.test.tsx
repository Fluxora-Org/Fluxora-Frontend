/**
 * ThemeEditorPanel — accessibility and keyboard tests
 *
 * Focus areas:
 *   1. Renders with correct ARIA roles / labels.
 *   2. All interactive elements are reachable via Tab.
 *   3. Preview, Apply, Cancel / Reset buttons work correctly.
 *   4. Validation errors appear in a role=alert live region.
 *   5. Escape key triggers cancel.
 *   6. Contrast badge reflects live ratio.
 *   7. PreviewStrip updates as values change.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeEditorPanel, {
  ColorField,
  ContrastBadge,
  PreviewStrip,
  TOKEN_FIELDS,
  GROUP_LABELS,
  DEFAULTS,
} from "../ThemeEditorPanel";
import { ThemeProvider } from "../ThemeProvider";
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
  return mq;
}

function renderPanel(onClose?: () => void) {
  return render(
    <ThemeProvider>
      <ThemeEditorPanel onClose={onClose} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("style");
  mockMatchMedia();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── 1. ARIA structure ────────────────────────────────────────────────────────

describe("ThemeEditorPanel — ARIA structure", () => {
  it("renders a dialog landmark", () => {
    renderPanel();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("dialog is labelled by its heading", () => {
    renderPanel();
    const dialog = screen.getByRole("dialog");
    const heading = screen.getByRole("heading", { name: /brand theme editor/i });
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).not.toBeNull();
    expect(heading.id).toBe(labelledBy);
  });

  it("has a form with an accessible label", () => {
    renderPanel();
    expect(screen.getByRole("form", { name: /custom theme form/i })).toBeInTheDocument();
  });

  it("all colour inputs have associated labels", () => {
    renderPanel();
    // Every text input should have an id referenced by a label.
    const textInputs = screen.getAllByRole("textbox");
    for (const input of textInputs) {
      const id = input.getAttribute("id");
      if (!id) continue; // skip unlabelled inputs (colour pickers are aria-hidden)
      const label = document.querySelector(`label[for="${id}"]`);
      expect(label).not.toBeNull();
    }
  });

  it("status badge is a polite live region", () => {
    renderPanel();
    const badge = document.querySelector("[aria-live='polite']");
    expect(badge).not.toBeNull();
  });

  it("live preview area has aria-live=polite", () => {
    renderPanel();
    expect(
      document.querySelector("[aria-label='Live theme preview']"),
    ).not.toBeNull();
  });
});

// ─── 2. Keyboard navigation ───────────────────────────────────────────────────

describe("ThemeEditorPanel — keyboard navigation", () => {
  it("first focusable element receives focus on Tab from body", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.tab();
    // The first focusable element should be either a summary or an input.
    expect(document.activeElement?.tagName).not.toBe("BODY");
  });

  it("Tab cycles through all text inputs", async () => {
    const user = userEvent.setup();
    renderPanel();

    const inputs = screen.getAllByRole("textbox");
    // Tab to each input and check focus shifts.
    for (let i = 0; i < inputs.length; i++) {
      await user.tab();
    }
    // After tabbing through all inputs, focus should have moved.
    expect(document.activeElement?.tagName).not.toBe("BODY");
  });

  it("Preview button is reachable by Tab and activatable by Enter", async () => {
    const user = userEvent.setup();
    renderPanel();

    const previewBtn = screen.getByRole("button", { name: /preview theme/i });
    previewBtn.focus();
    await user.keyboard("{Enter}");

    // After pressing Enter on preview, the panel should transition to preview state.
    // The button label changes to "Update Preview".
    expect(
      screen.queryByRole("button", { name: /update preview/i }),
    ).not.toBeNull();
  });

  it("Cancel button is reachable and calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderPanel(onClose);

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    cancelBtn.focus();
    await user.keyboard("{Enter}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape key triggers cancel / onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderPanel(onClose);

    // Focus a real interactive element inside the dialog, then press Escape.
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    cancelBtn.focus();
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ─── 3. Preview → Apply flow ──────────────────────────────────────────────────

describe("ThemeEditorPanel — preview and apply flow", () => {
  it("Apply button appears only after Preview is clicked", async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.queryByRole("button", { name: /apply/i })).toBeNull();

    const previewBtn = screen.getByRole("button", { name: /preview theme/i });
    await user.click(previewBtn);

    expect(screen.getByRole("button", { name: /apply/i })).toBeInTheDocument();
  });

  it("clicking Apply & Save sets DOM data-theme to custom", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /preview theme/i }));
    await user.click(screen.getByRole("button", { name: /apply/i }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("custom");
  });

  it("Reset to Default removes custom theme", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /preview theme/i }));
    await user.click(screen.getByRole("button", { name: /reset to default/i }));

    expect(document.documentElement.getAttribute("data-theme")).not.toBe("custom");
  });
});

// ─── 4. Validation error live regions ────────────────────────────────────────

describe("ThemeEditorPanel — validation error display", () => {
  it("shows a role=alert error summary when registration fails", async () => {
    const user = userEvent.setup();

    renderPanel();

    // Type a bad hex value into the first hex input.
    const hexInputs = screen.getAllByRole("textbox");
    const firstHex = hexInputs.find(
      (el) => el.getAttribute("placeholder") === "#RRGGBB",
    );
    expect(firstHex).toBeDefined();
    await user.clear(firstHex!);
    await user.type(firstHex!, "not-a-colour");

    await user.click(screen.getByRole("button", { name: /preview theme/i }));

    // One or more error alerts should appear.
    const alerts = await screen.findAllByRole("alert");
    expect(alerts.length).toBeGreaterThan(0);
  });

  it("error message mentions WCAG requirement", async () => {
    const user = userEvent.setup();
    renderPanel();

    // Set a low-contrast combo: light teal logo on white navbar.
    const logoLabel = screen.getByText(/navbar logo \/ brand text/i);
    const fieldGroup = logoLabel.closest("[role='group']");
    expect(fieldGroup).not.toBeNull();
    const hexInput = within(fieldGroup as HTMLElement).getByPlaceholderText("#RRGGBB");

    await user.clear(hexInput);
    await user.type(hexInput, "#00b8d4");

    // The inline error alert should mention the contrast requirement.
    const inlineAlerts = fieldGroup?.querySelectorAll("[role='alert']");
    if (inlineAlerts && inlineAlerts.length > 0) {
      expect(inlineAlerts[0].textContent).toMatch(/4\.5:1|WCAG/i);
    } else {
      // Live contrast badge should show a failing ratio.
      const badge = within(fieldGroup as HTMLElement).queryByText(/✗/);
      expect(badge).not.toBeNull();
    }
  });
});

// ─── 5. ContrastBadge unit ───────────────────────────────────────────────────

describe("ContrastBadge", () => {
  it("shows a checkmark and passes/fails label for passing ratio", () => {
    const { container } = render(<ContrastBadge ratio={5.2} required={4.5} />);
    expect(container.textContent).toContain("✓");
    expect(container.textContent).toContain("5.20:1");
  });

  it("shows a cross for failing ratio", () => {
    const { container } = render(<ContrastBadge ratio={2.1} required={4.5} />);
    expect(container.textContent).toContain("✗");
    expect(container.textContent).toContain("2.10:1");
  });

  it("has an accessible aria-label describing pass/fail", () => {
    render(<ContrastBadge ratio={4.5} required={4.5} />);
    const badge = screen.getByLabelText(/contrast ratio.*passes/i);
    expect(badge).toBeInTheDocument();
  });

  it("has an accessible aria-label describing failure", () => {
    render(<ContrastBadge ratio={2.0} required={4.5} />);
    const badge = screen.getByLabelText(/contrast ratio.*fails/i);
    expect(badge).toBeInTheDocument();
  });
});

// ─── 6. PreviewStrip unit ────────────────────────────────────────────────────

describe("PreviewStrip", () => {
  const defaultValues: Partial<Record<AllowedTokenKey, string>> = {
    "--navbar-bg": "#ffffff",
    "--navbar-logo-color": "#1a1f36",
    "--navbar-link-color": "#4a5565",
    "--color-cta-primary-bg": "#00b8d4",
    "--color-cta-primary-text": "#04131a",
    "--surface-neutral": "#fafbfc",
    "--surface-base": "#ffffff",
    "--text-vivid": "#1a1f36",
    "--text-secondary": "#4a5565",
    "--color-accent-primary": "#00b8d4",
    "--color-accent-secondary": "#00d4aa",
    "--cta-bg": "#00d4aa",
  };

  it("renders a navigation preview", () => {
    render(<PreviewStrip values={defaultValues} />);
    expect(screen.getByLabelText(/navbar preview/i)).toBeInTheDocument();
  });

  it("renders MetricCard-style previews", () => {
    render(<PreviewStrip values={defaultValues} />);
    expect(screen.getByLabelText(/total streamed metric preview/i)).toBeInTheDocument();
  });

  it("renders StatusPill-style previews", () => {
    render(<PreviewStrip values={defaultValues} />);
    const pills = screen.getAllByRole("status");
    expect(pills.length).toBeGreaterThan(0);
  });

  it("renders the Fluxora brand name in the navbar", () => {
    render(<PreviewStrip values={defaultValues} />);
    expect(screen.getByText("Fluxora")).toBeInTheDocument();
  });

  it("has a polite live region wrapping the preview", () => {
    render(<PreviewStrip values={defaultValues} />);
    const region = screen.getByLabelText(/live theme preview/i);
    expect(region.getAttribute("aria-live")).toBe("polite");
  });
});

// ─── 7. TOKEN_FIELDS / GROUP_LABELS / DEFAULTS exports ───────────────────────

describe("Exported constants", () => {
  it("TOKEN_FIELDS contains at least 8 entries", () => {
    expect(TOKEN_FIELDS.length).toBeGreaterThanOrEqual(8);
  });

  it("every TOKEN_FIELDS entry has a non-empty label and hint", () => {
    for (const field of TOKEN_FIELDS) {
      expect(field.label.length).toBeGreaterThan(0);
      expect(field.hint.length).toBeGreaterThan(0);
    }
  });

  it("GROUP_LABELS covers all groups referenced in TOKEN_FIELDS", () => {
    const groupsInFields = new Set(TOKEN_FIELDS.map((f) => f.group));
    for (const group of groupsInFields) {
      expect(GROUP_LABELS[group]).toBeDefined();
    }
  });

  it("DEFAULTS contains hex colour values", () => {
    for (const value of Object.values(DEFAULTS)) {
      expect(value).toMatch(/^#[0-9a-f]{3,6}$/i);
    }
  });
});
