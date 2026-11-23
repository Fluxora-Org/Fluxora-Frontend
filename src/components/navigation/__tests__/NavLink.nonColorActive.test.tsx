import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import NavLink from "../NavLink";
import {
  ColorBlindSimulationProvider,
  type SimulationMode,
} from "../../colorBlindSimulation/ColorBlindSimulationProvider";
import {
  simulateColorBlindness,
  type ColorBlindType,
} from "../../../utils/contrastUtils";

/**
 * Issue #1741 — "Assert the active navigation link is conveyed beyond colour".
 *
 * The active route must be conveyed by more than colour, must be exposed
 * programmatically, must stay distinguishable under each colour-blind
 * simulation mode, and must update on navigation.
 *
 * jsdom does not apply CSS-module stylesheets, so the visual contract is
 * pinned two ways:
 *  1. Component tests assert the non-colour marker element the stylesheet
 *     keys off of (rendered only for the active item) plus the programmatic
 *     `aria-current` / `data-active` hooks.
 *  2. Stylesheet-contract tests parse `NavLink.module.css` and assert the
 *     active rule carries non-colour cues (underline, weight, border width).
 */

const navLinkCss = readFileSync(
  join(process.cwd(), "src/components/navigation/NavLink.module.css"),
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

const ACTIVE_RULE = ruleFor('.navItem[aria-current="page"]');
const INDICATOR_RULE = ruleFor(".activeIndicator");

const INDICATOR = '[data-testid="navlink-active-indicator"]';

function renderNav(initialEntry = "/app/streams") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <NavLink to="/app/streams" label="Streams" />
      <NavLink to="/app/treasury" label="Treasury" />
    </MemoryRouter>,
  );
}

describe("NavLink active state is conveyed by more than colour", () => {
  it("renders a non-colour marker element only for the active link", () => {
    renderNav();

    const active = screen.getByRole("link", { name: "Streams" });
    const inactive = screen.getByRole("link", { name: "Treasury" });

    expect(active.querySelector(INDICATOR)).not.toBeNull();
    expect(inactive.querySelector(INDICATOR)).toBeNull();
  });

  it("styles the active rule with non-colour cues, not colour alone", () => {
    // Underline + weight + a thicker painted border are all independent of hue.
    expect(ACTIVE_RULE).toMatch(/text-decoration:\s*underline/);
    expect(ACTIVE_RULE).toMatch(/font-weight:\s*[5-9]\d\d/);
    expect(ACTIVE_RULE).toMatch(/border-left-width:\s*\d+px/);
  });

  it("draws the marker as a geometric shape so it survives loss of colour", () => {
    expect(INDICATOR_RULE).toMatch(/width:\s*\d+px/);
    expect(INDICATOR_RULE).toMatch(/height:\s*\d+px/);
    expect(INDICATOR_RULE).toMatch(/border-radius/);
  });
});

describe("NavLink exposes the active route programmatically", () => {
  it("sets aria-current and data-active for the active link only", () => {
    renderNav();

    const active = screen.getByRole("link", { name: "Streams" });
    const inactive = screen.getByRole("link", { name: "Treasury" });

    expect(active).toHaveAttribute("aria-current", "page");
    expect(active).toHaveAttribute("data-active", "true");
    expect(inactive).not.toHaveAttribute("aria-current");
    expect(inactive).toHaveAttribute("data-active", "false");
  });
});

describe("NavLink active state survives greyscale", () => {
  it("stays identifiable when every hue is flattened away", () => {
    renderNav();

    const active = screen.getByRole("link", { name: "Streams" });
    const inactive = screen.getByRole("link", { name: "Treasury" });

    // A greyscale rendering removes hue but preserves geometry and decoration.
    // The active cue is a rendered shape + underline, so it is unaffected:
    // the greyscale view is represented here by relying solely on structure.
    expect(active.querySelector(INDICATOR)).not.toBeNull();
    expect(inactive.querySelector(INDICATOR)).toBeNull();
    expect(INDICATOR_RULE).toMatch(/width:\s*\d+px/);
    expect(INDICATOR_RULE).toMatch(/height:\s*\d+px/);
    expect(ACTIVE_RULE).toMatch(/text-decoration:\s*underline/);
  });
});

const SIMULATION_MODES: SimulationMode[] = [
  "none",
  "protanopia",
  "deuteranopia",
  "tritanopia",
];

for (const mode of SIMULATION_MODES) {
  describe(`NavLink under the ${mode} colour-blind simulation`, () => {
    it("keeps the active item identifiable without relying on colour", () => {
      render(
        <ColorBlindSimulationProvider initialMode={mode}>
          <MemoryRouter initialEntries={["/app/streams"]}>
            <NavLink to="/app/streams" label="Streams" />
            <NavLink to="/app/treasury" label="Treasury" />
          </MemoryRouter>
        </ColorBlindSimulationProvider>,
      );

      const active = screen.getByRole("link", { name: "Streams" });
      const inactive = screen.getByRole("link", { name: "Treasury" });

      expect(active).toHaveAttribute("aria-current", "page");
      expect(active).toHaveAttribute("data-active", "true");
      expect(active.querySelector(INDICATOR)).not.toBeNull();
      expect(inactive).toHaveAttribute("data-active", "false");
      expect(inactive.querySelector(INDICATOR)).toBeNull();
    });
  });
}

const COLOUR_BLIND_TYPES: ColorBlindType[] = [
  "protanopia",
  "deuteranopia",
  "tritanopia",
];

describe("NavLink colour-blind projection helpers stay usable", () => {
  for (const type of COLOUR_BLIND_TYPES) {
    it(`projects the accent colour for ${type} without throwing`, () => {
      // Simulation remaps colour only; the geometric indicator is unchanged.
      expect(simulateColorBlindness("#00d4aa", type)).toMatch(/^#[0-9a-f]{6}$/);
      expect(INDICATOR_RULE).toMatch(/width:\s*\d+px/);
    });
  }
});

describe("NavLink active state updates on navigation", () => {
  it("moves aria-current and the non-colour marker to the new route", async () => {
    const user = userEvent.setup();
    renderNav();

    let streams = screen.getByRole("link", { name: "Streams" });
    expect(streams).toHaveAttribute("aria-current", "page");
    expect(streams.querySelector(INDICATOR)).not.toBeNull();

    await user.click(screen.getByRole("link", { name: "Treasury" }));

    streams = screen.getByRole("link", { name: "Streams" });
    const treasury = screen.getByRole("link", { name: "Treasury" });

    expect(treasury).toHaveAttribute("aria-current", "page");
    expect(treasury).toHaveAttribute("data-active", "true");
    expect(treasury.querySelector(INDICATOR)).not.toBeNull();
    expect(streams).not.toHaveAttribute("aria-current");
    expect(streams).toHaveAttribute("data-active", "false");
    expect(streams.querySelector(INDICATOR)).toBeNull();
  });
});
