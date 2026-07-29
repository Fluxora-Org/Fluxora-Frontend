/**
 * ComponentGallery tests
 * ──────────────────────
 * Covers:
 *  - Page renders without crash
 *  - Correct landmark / heading structure
 *  - All four component sections are present
 *  - All Button variants and sizes are rendered
 *  - All Input types (including textarea and select) are rendered
 *  - All StatusPill statuses are rendered
 *  - MetricCard instances (standard, sparkline, multi-token, edge cases)
 *  - Theme toggle changes the active theme label
 *  - Accessibility: no axe violations
 */

import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { axe } from "vitest-axe";
import { ThemeProvider } from "../../../theme/ThemeProvider";
import ComponentGallery from "../ComponentGallery";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderGallery() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <ComponentGallery />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
});

// ─── Page structure ───────────────────────────────────────────────────────────

describe("ComponentGallery — page structure", () => {
  it("renders without crashing", () => {
    expect(() => renderGallery()).not.toThrow();
  });

  it("has exactly one <main> landmark with id=main-content", () => {
    renderGallery();
    const mains = screen.getAllByRole("main");
    expect(mains).toHaveLength(1);
    expect(mains[0]).toHaveAttribute("id", "main-content");
  });

  it("has exactly one h1 with the gallery title", () => {
    renderGallery();
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(/component gallery/i);
  });

  it("has all four component section headings (h2)", () => {
    renderGallery();
    const sectionHeadings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent?.toLowerCase() ?? "");

    expect(sectionHeadings).toContain("button");
    expect(sectionHeadings).toContain("input");
    expect(sectionHeadings).toContain("statuspill");
    expect(sectionHeadings).toContain("metriccard");
  });

  it("heading hierarchy does not skip levels", () => {
    renderGallery();
    const headings = Array.from(
      document.querySelectorAll("h1, h2, h3, h4, h5, h6"),
    ).map((h) => parseInt(h.tagName.slice(1), 10));

    expect(headings[0]).toBe(1);

    for (let i = 1; i < headings.length; i++) {
      if (headings[i] > headings[i - 1]) {
        expect(headings[i] - headings[i - 1]).toBeLessThanOrEqual(1);
      }
    }
  });
});

// ─── Theme toggle ─────────────────────────────────────────────────────────────

describe("ComponentGallery — theme toggle", () => {
  it("renders the theme toggle fieldset with legend", () => {
    renderGallery();
    // The legend text
    expect(screen.getByText(/gallery theme/i)).toBeInTheDocument();
  });

  it("renders radio buttons for light, dark, and cyberpunk themes", () => {
    renderGallery();
    expect(screen.getByRole("radio", { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /cyberpunk/i })).toBeInTheDocument();
  });

  it("defaults to the current app theme (light in test environment)", () => {
    renderGallery();
    // The light radio should be checked by default (test env has no localStorage)
    const lightRadio = screen.getByRole("radio", { name: /light/i });
    expect(lightRadio).toBeChecked();
  });

  it("selecting dark theme checks the dark radio", () => {
    renderGallery();
    const darkRadio = screen.getByRole("radio", { name: /dark/i });
    fireEvent.click(darkRadio);
    expect(darkRadio).toBeChecked();
  });

  it("selecting cyberpunk theme checks the cyberpunk radio", () => {
    renderGallery();
    const cyberpunkRadio = screen.getByRole("radio", { name: /cyberpunk/i });
    fireEvent.click(cyberpunkRadio);
    expect(cyberpunkRadio).toBeChecked();
  });
});

// ─── Button section ───────────────────────────────────────────────────────────

describe("ComponentGallery — Button section", () => {
  it("renders buttons for all 5 variants", () => {
    renderGallery();
    // The variant×size table has row headers for each variant
    const variantRowHeaders = screen
      .getAllByRole("rowheader")
      .map((h) => h.textContent?.toLowerCase() ?? "");
    // Filter to those in the button matrix table
    expect(variantRowHeaders).toContain("primary");
    expect(variantRowHeaders).toContain("secondary");
    expect(variantRowHeaders).toContain("danger");
    expect(variantRowHeaders).toContain("success");
    expect(variantRowHeaders).toContain("ghost");
  });

  it("renders buttons for all 3 sizes (column headers in variant table)", () => {
    renderGallery();
    const buttonTable = screen.getByRole("table", {
      name: /button variant and size matrix/i,
    });
    const colHeaders = within(buttonTable)
      .getAllByRole("columnheader")
      .map((h) => h.textContent ?? "");
    expect(colHeaders.some((t) => /sm/i.test(t))).toBe(true);
    expect(colHeaders.some((t) => /md/i.test(t))).toBe(true);
    expect(colHeaders.some((t) => /lg/i.test(t))).toBe(true);
  });

  it("renders disabled buttons for all 5 variants", () => {
    renderGallery();
    // Each disabled button has the text "Disabled" and is actually disabled
    const disabledButtons = screen
      .getAllByRole("button", { name: /disabled/i })
      .filter((btn) => btn.hasAttribute("disabled") || btn.getAttribute("aria-disabled") === "true");
    // 5 variants × 1 disabled state each
    expect(disabledButtons.length).toBeGreaterThanOrEqual(5);
  });

  it("renders icon-only buttons with aria-label attributes", () => {
    renderGallery();
    const iconOnlyButtons = screen
      .getAllByRole("button")
      .filter((btn) => {
        const label = btn.getAttribute("aria-label") ?? "";
        return label.includes("action");
      });
    // 5 variants × icon-only
    expect(iconOnlyButtons.length).toBeGreaterThanOrEqual(5);
  });

  it("renders the full-width button", () => {
    renderGallery();
    const fullWidthCell = screen.getByRole("figure", {
      name: /button — primary, full-width/i,
    });
    expect(fullWidthCell).toBeInTheDocument();
    expect(within(fullWidthCell).getByRole("button")).toBeInTheDocument();
  });
});

// ─── Input section ────────────────────────────────────────────────────────────

describe("ComponentGallery — Input section", () => {
  it("renders a text input with label", () => {
    renderGallery();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });

  it("renders email inputs with label (default and error state)", () => {
    renderGallery();
    // Two email inputs: the default one and the validation-error one both have "Email address" label.
    const emailInputs = screen.getAllByLabelText(/email address/i);
    expect(emailInputs.length).toBeGreaterThanOrEqual(2);
    expect(emailInputs[0]).toHaveAttribute("type", "email");
  });

  it("renders a password input", () => {
    renderGallery();
    const passwordInputs = screen.getAllByLabelText(/password/i);
    expect(passwordInputs.length).toBeGreaterThanOrEqual(1);
    expect(passwordInputs[0]).toHaveAttribute("type", "password");
  });

  it("renders a textarea", () => {
    renderGallery();
    // Textarea's label is "Notes"
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it("renders a select with options", () => {
    renderGallery();
    // Network select
    expect(screen.getByLabelText(/^network$/i)).toBeInTheDocument();
  });

  it("renders inputs in error state with aria-invalid", () => {
    renderGallery();
    const invalidInputs = document
      .querySelectorAll('[aria-invalid="true"]');
    expect(invalidInputs.length).toBeGreaterThanOrEqual(1);
  });

  it("renders a disabled input", () => {
    renderGallery();
    const readOnlyInput = screen.getByLabelText(/read-only address/i);
    expect(readOnlyInput).toBeDisabled();
  });

  it("renders a required input", () => {
    renderGallery();
    const recipientInput = screen.getByLabelText(/recipient address/i);
    expect(recipientInput).toBeRequired();
  });

  it("renders a helper text below the Stream ID input", () => {
    renderGallery();
    expect(
      screen.getByText(/copy the 12-character id/i),
    ).toBeInTheDocument();
  });
});

// ─── StatusPill section ───────────────────────────────────────────────────────

describe("ComponentGallery — StatusPill section", () => {
  const allStatuses = [
    "Active",
    "Paused",
    "Completed",
    "Healthy",
    "At-Risk",
    "Critical",
  ];

  it("renders a StatusPill for every status", () => {
    renderGallery();
    for (const status of allStatuses) {
      // StatusPill renders role="status" with aria-label="{status} status"
      const pills = screen.getAllByRole("status", {
        name: new RegExp(`${status} status`, "i"),
      });
      expect(pills.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("renders the variant matrix table with correct headers", () => {
    renderGallery();
    const matrixTable = screen.getByRole("table", {
      name: /statuspill variant matrix/i,
    });
    expect(matrixTable).toBeInTheDocument();

    const colHeaders = within(matrixTable)
      .getAllByRole("columnheader")
      .map((h) => h.textContent ?? "");

    expect(colHeaders.some((t) => /icon-xs/i.test(t))).toBe(true);
    expect(colHeaders.some((t) => /icon-sm/i.test(t))).toBe(true);
    expect(colHeaders.some((t) => /icon-md/i.test(t))).toBe(true);
    expect(colHeaders.some((t) => /icon-lg/i.test(t))).toBe(true);
  });

  it("matrix table has a row for every status", () => {
    renderGallery();
    const matrixTable = screen.getByRole("table", {
      name: /statuspill variant matrix/i,
    });
    const rowHeaders = within(matrixTable)
      .getAllByRole("rowheader")
      .map((h) => h.textContent ?? "");

    for (const status of allStatuses) {
      expect(rowHeaders).toContain(status);
    }
  });
});

// ─── MetricCard section ───────────────────────────────────────────────────────

describe("ComponentGallery — MetricCard section", () => {
  it("renders the standard MetricCard with its label", () => {
    renderGallery();
    // MetricCard uses role="group" with aria-label={label}
    expect(
      screen.getByRole("group", { name: /total streamed/i }),
    ).toBeInTheDocument();
  });

  it("renders the sparkline MetricCard", () => {
    renderGallery();
    expect(
      screen.getByRole("group", { name: /weekly flow/i }),
    ).toBeInTheDocument();
  });

  it("renders the multi-token MetricCard", () => {
    renderGallery();
    expect(
      screen.getByRole("group", { name: /vault balance/i }),
    ).toBeInTheDocument();
  });

  it("renders the active streams count MetricCard", () => {
    renderGallery();
    expect(
      screen.getByRole("group", { name: /active streams/i }),
    ).toBeInTheDocument();
  });

  it("renders the long-label edge-case MetricCard", () => {
    renderGallery();
    expect(
      screen.getByRole("group", {
        name: /total treasury capital deployed/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders the zero-value edge-case MetricCard", () => {
    renderGallery();
    expect(
      screen.getByRole("group", { name: /pending withdrawals/i }),
    ).toBeInTheDocument();
  });
});

// ─── Cell / figure captions ───────────────────────────────────────────────────

describe("ComponentGallery — Cell figure labels", () => {
  it("renders figure elements with aria-label for every gallery cell", () => {
    renderGallery();
    // Each Cell renders a <figure aria-label="…">
    const figures = document.querySelectorAll("figure[aria-label]");
    expect(figures.length).toBeGreaterThanOrEqual(10);
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe("ComponentGallery — accessibility (axe)", () => {
  it("has no axe violations on initial render", async () => {
    const { container } = renderGallery();
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
