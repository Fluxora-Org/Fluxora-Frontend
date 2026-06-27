/**
 * StatusPill Tests
 * ─────────────────
 * Tests for the StatusPill component.
 * 
 * Note: jsdom doesn't resolve CSS variables, so we assert the variable
 * names (e.g., "var(--color-success)") rather than resolved RGB values.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StatusPill from "./StatusPill";

describe("StatusPill", () => {
  it("renders status in uppercase", () => {
    render(<StatusPill status="Active" />);
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    // icon should be present
    const svg = screen.getByRole("status").querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("applies correct styles for Active status", () => {
    const { container } = render(<StatusPill status="Active" />);
    const pill = container.firstChild as HTMLElement;
    const style = window.getComputedStyle(pill);
    expect(style.color).toBe("var(--status-success)");
    expect(style.backgroundColor).toBe("var(--status-success-bg)");
  });

  it("applies correct styles for Paused status", () => {
    const { container } = render(<StatusPill status="Paused" />);
    const pill = container.firstChild as HTMLElement;
    const style = window.getComputedStyle(pill);
    expect(style.color).toBe("var(--status-warning)");
    expect(style.backgroundColor).toBe("var(--status-warning-bg)");
  });

  it("applies correct styles for Completed status", () => {
    const { container } = render(<StatusPill status="Completed" />);
    const pill = container.firstChild as HTMLElement;
    const style = window.getComputedStyle(pill);
    expect(style.color).toBe("var(--status-info)");
    expect(style.backgroundColor).toBe("var(--status-info-bg)");
  });
});
