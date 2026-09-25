import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import NavLink from "../NavLink";
import styles from "../NavLink.module.css";

/**
 * Hover-vs-focus parity and non-color active indication (issue #669).
 *
 * jsdom does not apply CSS-module stylesheets, so the styling contract is
 * asserted two ways:
 *  1. Component tests pin the hooks the stylesheet keys off of
 *     (`aria-current="page"` + the `navItem` class).
 *  2. Stylesheet-contract tests parse NavLink.module.css and assert the
 *     active/hover/focus rules keep their accessibility guarantees.
 */

const navLinkCss = readFileSync(
  join(process.cwd(), "src/components/navigation/NavLink.module.css"),
  "utf8",
);
const designTokensCss = readFileSync(
  join(process.cwd(), "src/design-tokens.css"),
  "utf8",
);

/** Returns the declaration block for an exact selector in NavLink.module.css. */
function ruleFor(selector: string): string {
  const needle = `${selector} {`;
  const start = navLinkCss.indexOf(needle);
  expect(start, `selector "${selector}" must exist`).toBeGreaterThan(-1);
  const open = navLinkCss.indexOf("{", start);
  return navLinkCss.slice(open + 1, navLinkCss.indexOf("}", open));
}

const BASE_RULE = ruleFor(".navItem");
const HOVER_RULE = ruleFor('.navItem:not([aria-current="page"]):hover');
const ACTIVE_RULE = ruleFor('.navItem[aria-current="page"]');
const FOCUS_RULE = ruleFor(".navItem:focus-visible");

describe("NavLink active-route attribute drives the styling hook", () => {
  it("applies aria-current and the styled class to the current route only", () => {
    render(
      <MemoryRouter initialEntries={["/app/streams"]}>
        <>
          <NavLink to="/app/streams" label="Streams" />
          <NavLink to="/app/treasury" label="Treasury" />
        </>
      </MemoryRouter>,
    );

    const active = screen.getByRole("link", { name: "Streams" });
    const inactive = screen.getByRole("link", { name: "Treasury" });

    // The stylesheet's active selector is `.navItem[aria-current="page"]`,
    // so the attribute + class pair is exactly what turns the styling on.
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active).toHaveClass(styles.navItem);
    expect(inactive).not.toHaveAttribute("aria-current");
    expect(inactive).toHaveClass(styles.navItem);
  });

  it("renders the icon inside the styled icon span so it inherits the active color cue", () => {
    render(
      <MemoryRouter initialEntries={["/app/streams"]}>
        <NavLink
          to="/app/streams"
          label="Streams"
          icon={<svg data-testid="nav-icon" />}
        />
      </MemoryRouter>,
    );

    const icon = screen.getByTestId("nav-icon");
    expect(icon.parentElement).toHaveClass(styles.navIcon);
  });

  it("is reachable with the keyboard and fires onClick on activation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <MemoryRouter initialEntries={["/app/streams"]}>
        <NavLink to="/app/treasury" label="Treasury" onClick={onClick} />
      </MemoryRouter>,
    );

    await user.tab();
    const link = screen.getByRole("link", { name: "Treasury" });
    expect(link).toHaveFocus();

    await user.click(link);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("active-route indication uses more than color alone", () => {
  it("changes font weight, not just color", () => {
    // Base weight comes from --font-body-md (400 …); active bumps to 500.
    expect(designTokensCss).toMatch(/--font-body-md:\s*400\b/);
    expect(ACTIVE_RULE).toMatch(/font-weight:\s*500/);
  });

  it("makes the left border appear (transparent at rest, painted when active)", () => {
    expect(BASE_RULE).toMatch(/border-left:\s*3px solid transparent/);
    expect(ACTIVE_RULE).toMatch(
      /border-left-color:\s*var\(--color-accent-secondary\)/,
    );
  });
});

describe("focus-visible styling is at least as prominent as hover", () => {
  const outlineMatch = FOCUS_RULE.match(/outline:\s*(\d+(?:\.\d+)?)px\s+solid/);
  const offsetMatch = FOCUS_RULE.match(/outline-offset:\s*(\d+(?:\.\d+)?)px/);
  const hoverBorderMatch = BASE_RULE.match(/border-left:\s*(\d+(?:\.\d+)?)px/);

  it("defines a solid outline of at least 2px with a positive offset", () => {
    expect(outlineMatch, "focus-visible must set a px solid outline").not.toBeNull();
    expect(Number(outlineMatch![1])).toBeGreaterThanOrEqual(2);
    expect(offsetMatch, "focus-visible must set an outline-offset").not.toBeNull();
    expect(Number(offsetMatch![1])).toBeGreaterThan(0);
  });

  it("uses a focus color token that is actually defined", () => {
    expect(FOCUS_RULE).toMatch(/outline:.*var\(--color-focus\)/);
    // An undefined custom property would make the outline invisible.
    expect(designTokensCss).toMatch(/--color-focus:\s*[^;]+;/);
  });

  it("keeps the outline exclusive to keyboard focus (hover gets no outline)", () => {
    expect(HOVER_RULE).not.toMatch(/outline/);
  });

  it("never suppresses the focus outline anywhere in the module", () => {
    expect(navLinkCss).not.toMatch(/outline:\s*(none|0)\b/);
  });

  it("focus ring footprint is not weaker than the hover border cue", () => {
    // Hover's strongest structural cue is the 3px left border on one edge.
    // The focus ring wraps all four sides; require its width + offset to
    // meet or exceed the hover border width so shrinking the ring below
    // hover prominence fails this test.
    const ringFootprint =
      Number(outlineMatch![1]) + Number(offsetMatch?.[1] ?? 0);
    expect(ringFootprint).toBeGreaterThanOrEqual(
      Number(hoverBorderMatch?.[1] ?? 0),
    );
  });

  it("hover only re-colors surfaces it also re-colors for active/focus users", () => {
    // Hover's channels: background, text color, border-left color. None of
    // these are load-bearing for state indication on their own — active
    // state carries the weight/border cues and focus carries the outline.
    expect(HOVER_RULE).toMatch(/background-color:/);
    expect(HOVER_RULE).toMatch(/color:/);
    expect(HOVER_RULE).toMatch(/border-left-color:/);
  });
});
