/**
 * Forced-Colors Mode Regression Tests
 * ──────────────────────────────────────
 * Validates that the forced-colors CSS layer in design-tokens.css,
 * Button.module.css, and StreamRow.css is structurally sound, and
 * that components carry the attributes required for the CSS rules to
 * take effect at runtime.
 *
 * Approach:
 *   - CSS media queries cannot be toggled in jsdom, so tests validate
 *     the CSS source text directly (structural/content assertions) and
 *     the DOM attributes that forced-colors rules target.
 *   - Component attribute tests render components and assert the
 *     presence of data-status-token, role, aria-* attributes that are
 *     used as selectors in the forced-colors block.
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import StatusPill from "../../components/treasuryOverviewPage/StatusPill";

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROOT = resolve(__dirname, "../../..");

function readCss(relPath: string): string {
  return readFileSync(resolve(ROOT, "src", relPath), "utf-8");
}

// Extracts all text within the first @media (forced-colors: active) { … } block
// that appears after the given needle comment in the file.
function extractForcedColorsBlock(css: string, afterNeedle?: string): string {
  const source = afterNeedle ? css.slice(css.indexOf(afterNeedle)) : css;
  const start = source.indexOf("@media (forced-colors: active)");
  if (start === -1) return "";
  // Find matching closing brace, accounting for nesting
  let depth = 0;
  let end = start;
  for (; end < source.length; end++) {
    if (source[end] === "{") depth++;
    else if (source[end] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  return source.slice(start, end + 1);
}

// Collects ALL forced-colors blocks from a CSS file
function allForcedColorsBlocks(css: string): string[] {
  const blocks: string[] = [];
  let remaining = css;
  while (true) {
    const idx = remaining.indexOf("@media (forced-colors: active)");
    if (idx === -1) break;
    let depth = 0;
    let end = idx;
    for (; end < remaining.length; end++) {
      if (remaining[end] === "{") depth++;
      else if (remaining[end] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    blocks.push(remaining.slice(idx, end + 1));
    remaining = remaining.slice(end + 1);
  }
  return blocks;
}

// ── CSS Structural Tests ──────────────────────────────────────────────────────

describe("design-tokens.css – forced-colors block", () => {
  const css = readCss("design-tokens.css");
  // The forced-colors block is section 15, after the section-15 comment
  const block = extractForcedColorsBlock(css, "15. FORCED-COLORS");

  it("contains the section-15 forced-colors block", () => {
    expect(block).toBeTruthy();
    expect(block.length).toBeGreaterThan(100);
  });

  it("maps --color-bg-primary to Canvas", () => {
    expect(block).toContain("--color-bg-primary: Canvas");
  });

  it("maps --color-text-primary to CanvasText", () => {
    expect(block).toContain("--color-text-primary: CanvasText");
  });

  it("maps --color-border-default to ButtonBorder", () => {
    expect(block).toContain("--color-border-default: ButtonBorder");
  });

  it("maps --color-accent-primary to Highlight", () => {
    expect(block).toContain("--color-accent-primary: Highlight");
  });

  it("maps status tokens to CanvasText", () => {
    expect(block).toContain("--status-success: CanvasText");
    expect(block).toContain("--status-warning: CanvasText");
    expect(block).toContain("--status-error: CanvasText");
    expect(block).toContain("--status-info: CanvasText");
  });

  it("maps status background tokens to Canvas to prevent invisible tints", () => {
    expect(block).toContain("--status-success-bg: Canvas");
    expect(block).toContain("--status-warning-bg: Canvas");
    expect(block).toContain("--status-error-bg: Canvas");
    expect(block).toContain("--status-info-bg: Canvas");
  });

  it("sets --focus-ring-shadow to none (box-shadow stripped by UA)", () => {
    expect(block).toContain("--focus-ring-shadow: none");
  });

  it("sets --focus-ring-color to Highlight", () => {
    expect(block).toContain("--focus-ring-color: Highlight");
  });

  it("suppresses decorative shadows", () => {
    expect(block).toContain("--shadow-sm: none");
    expect(block).toContain("--shadow-md: none");
    expect(block).toContain("--shadow-lg: none");
    expect(block).toContain("--shadow-xl: none");
  });

  it("provides focus-visible outline using Highlight system color", () => {
    expect(block).toMatch(/\*:focus-visible\s*\{[^}]*outline:[^}]*Highlight/s);
  });

  it("removes box-shadow from focus-visible (stripped by UA anyway)", () => {
    expect(block).toMatch(
      /\*:focus-visible\s*\{[^}]*box-shadow:\s*none/s
    );
  });

  it("adds border to buttons using ButtonBorder", () => {
    expect(block).toMatch(/button[^{]*\{[^}]*border:[^}]*ButtonBorder/s);
  });

  it("uses ButtonFace / ButtonText for button backgrounds and text", () => {
    expect(block).toContain("background: ButtonFace");
    expect(block).toContain("color: ButtonText");
  });

  it("gives status pills a CanvasText border for boundary visibility", () => {
    expect(block).toMatch(
      /\[data-status-token\][^{]*\{[^}]*border:[^}]*CanvasText/s
    );
  });

  it("applies forced-color-adjust: none to status pills to preserve icon shape", () => {
    expect(block).toMatch(
      /\[data-status-token\][^{]*\{[^}]*forced-color-adjust:\s*none/s
    );
  });

  it("restores icon color inside pills with forced-color-adjust: auto on svg", () => {
    expect(block).toMatch(
      /\[data-status-token\]\s*svg[^{]*\{[^}]*forced-color-adjust:\s*auto/s
    );
  });

  it("adds border to modal dialogs for boundary visibility", () => {
    expect(block).toMatch(/\[role="dialog"\][^{]*\{[^}]*border:[^}]*CanvasText/s);
  });

  it("uses Highlight/HighlightText for selected stream rows", () => {
    expect(block).toMatch(
      /\.stream-row--selected[^{]*\{[^}]*background:\s*Highlight/s
    );
    expect(block).toMatch(
      /\.stream-row--selected[^{]*\{[^}]*color:\s*HighlightText/s
    );
  });

  it("suppresses skeleton animation", () => {
    expect(block).toMatch(
      /\[aria-busy="true"\][^{]*\{[^}]*animation:\s*none/s
    );
  });

  it("sets --skeleton-base to GrayText", () => {
    expect(block).toContain("--skeleton-base: GrayText");
  });

  it("maps links to LinkText", () => {
    expect(block).toMatch(/a\[href\][^{]*\{[^}]*color:\s*LinkText/s);
  });

  it("sets Field/FieldText for form inputs", () => {
    expect(block).toMatch(/input[^{]*\{[^}]*background:\s*Field/s);
    expect(block).toMatch(/input[^{]*\{[^}]*color:\s*FieldText/s);
  });

  it("maps alert/status roles to Canvas/CanvasText", () => {
    expect(block).toMatch(/\[role="alert"\][^{]*\{[^}]*background:\s*Canvas/s);
    expect(block).toMatch(/\[role="status"\][^{]*\{[^}]*background:\s*Canvas/s);
  });

  it("sets tooltip border to CanvasText", () => {
    expect(block).toMatch(/\[role="tooltip"\][^{]*\{[^}]*border:[^}]*CanvasText/s);
  });
});

describe("Button.module.css – forced-colors block", () => {
  const css = readCss("components/Button.module.css");
  const blocks = allForcedColorsBlocks(css);

  it("contains at least one forced-colors block", () => {
    expect(blocks.length).toBeGreaterThan(0);
  });

  const block = blocks.join("\n");

  it("removes box-shadow from .button focus-visible", () => {
    expect(block).toMatch(/\.button:focus-visible[^{]*\{[^}]*box-shadow:\s*none/s);
  });

  it("adds outline: 2px solid Highlight for .button focus-visible", () => {
    expect(block).toMatch(
      /\.button:focus-visible[^{]*\{[^}]*outline:[^}]*Highlight/s
    );
  });

  it("sets ButtonFace/ButtonText/ButtonBorder on .button", () => {
    expect(block).toMatch(/\.button\s*\{[^}]*background:\s*ButtonFace/s);
    expect(block).toMatch(/\.button\s*\{[^}]*color:\s*ButtonText/s);
    expect(block).toMatch(/\.button\s*\{[^}]*border:[^}]*ButtonBorder/s);
  });

  it("uses Highlight/HighlightText on hover", () => {
    expect(block).toMatch(
      /\.button:not\(:disabled\):hover[^{]*\{[^}]*background:\s*Highlight/s
    );
  });

  it("uses GrayText for disabled state", () => {
    expect(block).toMatch(/\.button:disabled[^{]*\{[^}]*color:\s*GrayText/s);
  });

  it("covers buttonGhost variant", () => {
    expect(block).toContain(".buttonGhost");
  });

  it("covers buttonDanger variant", () => {
    expect(block).toContain(".buttonDanger");
  });

  it("covers buttonSuccess variant", () => {
    expect(block).toContain(".buttonSuccess");
  });
});

describe("StreamRow.css – forced-colors block", () => {
  const css = readCss("components/treasuryOverviewPage/StreamRow.css");
  const blocks = allForcedColorsBlocks(css);

  it("contains at least one forced-colors block", () => {
    expect(blocks.length).toBeGreaterThan(0);
  });

  const block = blocks.join("\n");

  it("adds ButtonBorder bottom border to .stream-row", () => {
    expect(block).toMatch(
      /\.stream-row\s*\{[^}]*border-bottom:[^}]*ButtonBorder/s
    );
  });

  it("uses Highlight/HighlightText for .stream-row--selected", () => {
    expect(block).toMatch(
      /\.stream-row--selected[^{]*\{[^}]*background:\s*Highlight/s
    );
    expect(block).toMatch(
      /\.stream-row--selected[^{]*\{[^}]*color:\s*HighlightText/s
    );
  });

  it("removes box-shadow from .stream-row--selected", () => {
    expect(block).toMatch(
      /\.stream-row--selected[^{]*\{[^}]*box-shadow:\s*none/s
    );
  });

  it("gives focus-visible on .stream-row an outline using Highlight", () => {
    expect(block).toMatch(
      /\.stream-row:focus-visible[^{]*\{[^}]*outline:[^}]*Highlight/s
    );
  });

  it("removes box-shadow from .stream-row:focus-visible", () => {
    expect(block).toMatch(
      /\.stream-row:focus-visible[^{]*\{[^}]*box-shadow:\s*none/s
    );
  });

  it("uses ButtonFace/ButtonText for .stream-row__ellipsis-btn", () => {
    expect(block).toMatch(
      /\.stream-row__ellipsis-btn\s*\{[^}]*background:\s*ButtonFace/s
    );
  });

  it("uses LinkText for .stream-row__action-btn", () => {
    expect(block).toMatch(
      /\.stream-row__action-btn[^{]*\{[^}]*color:\s*LinkText/s
    );
  });

  it("uses Canvas/CanvasText border for .context-menu", () => {
    expect(block).toMatch(/\.context-menu\s*\{[^}]*background:\s*Canvas/s);
    expect(block).toMatch(/\.context-menu\s*\{[^}]*border:[^}]*CanvasText/s);
  });

  it("uses Highlight/HighlightText for focused context menu items", () => {
    expect(block).toMatch(
      /\.context-menu__item:focus[^{]*\{[^}]*background:\s*Highlight/s
    );
  });
});

// ── Component attribute tests ─────────────────────────────────────────────────
// These tests verify that the DOM attributes required by forced-colors CSS
// selectors are actually emitted by the components.

describe("StatusPill – DOM attributes for forced-colors targeting", () => {
  const statuses = [
    "Active",
    "Paused",
    "Completed",
    "Healthy",
    "At-Risk",
    "Critical",
  ] as const;

  for (const status of statuses) {
    it(`renders data-status-token for status "${status}"`, () => {
      const { container } = render(
        <StatusPill status={status} />
      );
      const pill = container.querySelector("[data-status-token]") as HTMLElement;
      expect(pill).toBeTruthy();
      expect(pill.dataset.statusToken).toBeTruthy();
    });

    it(`renders data-status="${status}" for machine-readable targeting`, () => {
      const { container } = render(
        <StatusPill status={status} />
      );
      const pill = container.querySelector(`[data-status="${status}"]`);
      expect(pill).toBeTruthy();
    });

    it(`has role="status" when non-interactive for "${status}"`, () => {
      const { container } = render(
        <StatusPill status={status} />
      );
      const pill = container.querySelector("[data-status-token]");
      expect(pill?.getAttribute("role")).toBe("status");
    });

    it(`has role="button" when interactive for "${status}"`, () => {
      const { container } = render(
        <StatusPill status={status} onClick={() => {}} />
      );
      const pill = container.querySelector("[data-status-token]");
      expect(pill?.getAttribute("role")).toBe("button");
    });

    it(`contains an aria-hidden SVG icon for "${status}" (shape differentiation)`, () => {
      const { container } = render(
        <StatusPill status={status} />
      );
      const icon = container.querySelector("[data-status-token] svg");
      expect(icon).toBeTruthy();
      expect(icon?.getAttribute("aria-hidden")).toBe("true");
    });

    it(`has an aria-label on the pill for "${status}"`, () => {
      const { container } = render(
        <StatusPill status={status} />
      );
      const pill = container.querySelector("[data-status-token]");
      expect(pill?.getAttribute("aria-label")).toMatch(/status/i);
    });
  }

  it("carries distinct tokenName values for each status category", () => {
    const tokenMap: Record<string, string> = {
      Active: "status-success",
      Healthy: "status-success",
      Paused: "status-warning",
      "At-Risk": "status-warning",
      Completed: "status-info",
      Critical: "status-error",
    };
    for (const [status, token] of Object.entries(tokenMap)) {
      const { container } = render(
        <StatusPill status={status as any} />
      );
      const pill = container.querySelector("[data-status-token]");
      expect(pill?.getAttribute("data-status-token")).toBe(token);
    }
  });
});

describe("StatusPill – non-color differentiation (WCAG 1.4.1)", () => {
  it("each status maps to a distinct icon (shape differentiation)", () => {
    // Render all statuses and collect aria-hidden SVG paths.
    // If icons differ, the outerHTML differs (path d attributes, viewBox, etc.).
    const rendered = (
      ["Active", "Paused", "Completed", "Healthy", "At-Risk", "Critical"] as const
    ).map((s) => {
      const { container } = render(<StatusPill status={s} />);
      const svg = container.querySelector("[data-status-token] svg");
      return { status: s, svgHtml: svg?.outerHTML ?? "" };
    });

    const htmlSet = new Set(rendered.map((r) => r.svgHtml));
    // All 6 statuses must have distinct SVG markup
    expect(htmlSet.size).toBe(6);
  });

  it("each status displays a visible text label", () => {
    const labels: Record<string, string> = {
      Active: "ACTIVE",
      Paused: "PAUSED",
      Completed: "COMPLETED",
      Healthy: "HEALTHY",
      "At-Risk": "AT-RISK",
      Critical: "CRITICAL",
    };
    for (const [status, label] of Object.entries(labels)) {
      const { getByText } = render(<StatusPill status={status as any} />);
      expect(getByText(label)).toBeTruthy();
    }
  });
});

describe("accessibility.css – forced-colors block", () => {
  const css = readCss("styles/accessibility.css");
  const blocks = allForcedColorsBlocks(css);

  it("contains at least one forced-colors block", () => {
    expect(blocks.length).toBeGreaterThan(0);
  });

  const block = blocks.join("\n");

  it("uses CanvasText outline for interactive elements", () => {
    expect(block).toMatch(/outline:[^;]*CanvasText/);
  });

  it("includes .truncateReveal__chip forced-colors rule with ButtonText border", () => {
    // The accessibility.css already has this rule from the existing codebase
    expect(block).toMatch(/\.truncateReveal__chip[^{]*\{[^}]*ButtonText/s);
  });
});
