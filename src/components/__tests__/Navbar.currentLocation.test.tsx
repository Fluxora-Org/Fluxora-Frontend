import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Navbar from "../Navbar";

/**
 * Issue #1657 — "Assert the navigation exposes its current location to
 * assistive technology".
 *
 * `src/components/Navbar.tsx` is the primary navigation. Without a programmatic
 * current-page indication, a screen-reader user traversing the navigation
 * cannot tell which item corresponds to the page they are on.
 *
 * The four acceptance criteria are covered below:
 *  - the active item is marked programmatically (`aria-current="page"`);
 *  - the marking updates on navigation — the announced item is re-read *after*
 *    a real client-side route change, not from a frozen initial render;
 *  - navigation landmarks are labelled (the `navigation` role is reachable by
 *    an accessible name, and the items live inside it);
 *  - the active state is conveyed without relying on colour (a rendered
 *    geometric marker, plus an `aria-current` rule whose only non-colour
 *    declarations are checked so it cannot quietly become colour-only).
 *
 * The component is driven through a real `MemoryRouter` rather than a stubbed
 * `useLocation`, so "navigate between routes" is exercised the way a user does
 * it.
 */

const INDICATOR = '[data-testid="navbar-active-indicator"]';
const NAV_LANDMARK_NAME = "Main navigation";
const DEFAULT_ENTRIES = ["Product", "Documentation", "Pricing"];

/** Label of the entry the header is currently announcing as the current page. */
function announcedEntry(): string | undefined {
  const nav = screen.getByRole("navigation", { name: NAV_LANDMARK_NAME });
  const current = nav.querySelectorAll('[aria-current="page"]');
  expect(
    current.length,
    "exactly one navigation entry may be the current page",
  ).toBe(1);
  return current[0].textContent?.trim();
}

function navItem(name: string): HTMLElement {
  return within(
    screen.getByRole("navigation", { name: NAV_LANDMARK_NAME }),
  ).getByRole("link", { name });
}

function renderNavbar(initialEntry = "/") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Navbar />
    </MemoryRouter>,
  );
}

/** Navbar plus an out-of-band route change, so navigation is the only trigger. */
function renderNavbarWithRouteChange(initialEntry = "/") {
  function RouteChange() {
    const navigate = useNavigate();
    return (
      <>
        <Navbar />
        <button
          onClick={() => navigate("/app/treasurypage")}
          type="button"
        >
          go to dashboard route
        </button>
      </>
    );
  }

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <RouteChange />
    </MemoryRouter>,
  );
}

/** The stylesheet the navbar injects, which carries its stateful styling. */
function injectedStylesheet(): string {
  const style = document.getElementById("navbar-animation-styles");
  expect(style, "navbar must inject its stylesheet").not.toBeNull();
  return style?.textContent ?? "";
}

/** Declaration block for an exact selector inside the injected stylesheet. */
function ruleFor(selector: string): string {
  const css = injectedStylesheet();
  const needle = `${selector} {`;
  const start = css.indexOf(needle);
  expect(start, `selector "${selector}" must exist`).toBeGreaterThan(-1);
  const open = css.indexOf("{", start);
  return css.slice(open + 1, css.indexOf("}", open));
}

/**
 * Declarations in a rule whose property carries no hue, e.g. `text-decoration`
 * or `font-weight`, sorted for stable comparison. A current-item rule that
 * only ever changed colour would reduce to an empty list here.
 */
function nonColourDeclarations(rule: string): string[] {
  return rule
    .split(";")
    .map((declaration) => declaration.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .filter(
      (declaration) =>
        !/^[\w-]*(color|background|fill|stroke)[\w-]*\s*:/i.test(declaration),
    );
}

const ACTIVE_RULE = () => ruleFor('nav [aria-current="page"]');

describe("Navbar exposes its current location to assistive technology", () => {
  it("exposes the navigation as a labelled landmark", () => {
    renderNavbar();

    // A navigation landmark has to be both reachable and named, or a
    // screen-reader user cannot tell it apart from the other regions they can
    // jump to and cannot tell what the current item lives inside.
    const nav = screen.getByRole("navigation", { name: NAV_LANDMARK_NAME });
    expect(nav).toBeInTheDocument();
    expect(nav.getAttribute("aria-label")?.trim()).toBeTruthy();
  });

  it("marks the entry for the landing route as the current page", () => {
    renderNavbar("/");

    expect(announcedEntry()).toBe("Product");
    expect(navItem("Product")).toHaveAttribute("aria-current", "page");
  });

  it("marks the entry matching the in-page fragment as the current page", () => {
    renderNavbar("/#pricing");

    expect(announcedEntry()).toBe("Pricing");
  });

  it("marks the dashboard label as the current page on a treasury route", () => {
    renderNavbar("/app/treasurypage");

    expect(announcedEntry()).toBe("Dashboard");
  });

  it("leaves entries that are not the current page unmarked", () => {
    renderNavbar("/");

    expect(navItem("Documentation")).not.toHaveAttribute("aria-current");
    expect(navItem("Pricing")).not.toHaveAttribute("aria-current");
  });

  it("marks no entry when the route has no navigation entry of its own", () => {
    renderNavbar("/app/streams");

    const nav = screen.getByRole("navigation", { name: NAV_LANDMARK_NAME });
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(0);
  });

  it("keeps the current marking off the home logo, so it is never ambiguous", () => {
    renderNavbar("/");

    // The logo also links to "/", but two current items would leave a
    // screen-reader user with nothing to disambiguate them by.
    expect(navItem("Fluxora home")).not.toHaveAttribute("aria-current");
  });
});

describe("Navbar current marking updates on navigation", () => {
  it("hands the current marking back when the user returns to the first entry", async () => {
    const user = userEvent.setup();
    renderNavbar("/#documentation");

    expect(announcedEntry()).toBe("Documentation");

    await user.click(navItem("Product"));

    expect(announcedEntry()).toBe("Product");
  });

  it("moves the current marking to a different route", async () => {
    const user = userEvent.setup();
    renderNavbarWithRouteChange("/");

    expect(announcedEntry()).toBe("Product");

    await user.click(
      screen.getByRole("button", { name: "go to dashboard route" }),
    );

    expect(announcedEntry()).toBe("Dashboard");
    expect(screen.getByText("Dashboard")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("does not keep announcing an entry the user has navigated away from", async () => {
    const user = userEvent.setup();
    renderNavbar("/#pricing");

    expect(announcedEntry()).toBe("Pricing");

    await user.click(navItem("Product"));

    expect(navItem("Pricing")).not.toHaveAttribute("aria-current");
  });
});

describe("Navbar active state is conveyed without relying on colour", () => {
  it("draws a geometric marker only for the current entry", () => {
    renderNavbar("/");

    const nav = screen.getByRole("navigation", { name: NAV_LANDMARK_NAME });
    const marked = within(nav)
      .getAllByRole("link")
      .filter((link) => link.querySelector(INDICATOR));

    expect(marked).toHaveLength(1);
    expect(marked[0]).toHaveTextContent("Product");
  });

  it("sizes the marker so it reads as a shape rather than an empty node", () => {
    renderNavbar("/");

    const marker = screen.getByTestId("navbar-active-indicator");
    expect(marker.style.width).toBe("6px");
    expect(marker.style.height).toBe("6px");
    expect(marker.style.borderRadius).toBe("9999px");
  });

  it("hides the decorative marker from assistive technology", () => {
    renderNavbar("/");

    // `aria-current` is the cue that is announced; the marker must not be
    // added to the accessibility tree as a second, noisier signal.
    const marker = screen.getByTestId("navbar-active-indicator");
    expect(marker.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it("styles the current entry with cues that survive loss of colour", () => {
    const cues = nonColourDeclarations(ACTIVE_RULE());

    // Underline and weight are geometry and typography: they still read when
    // every hue in the page is flattened away.
    expect(cues).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^text-decoration: underline$/),
        expect.stringMatching(/^font-weight: 7\d\d$/),
      ]),
    );
  });

  it("keeps the base entries undecorated, so the current one stands out", () => {
    renderNavbar("/");

    expect(navItem("Product").style.getPropertyValue("text-decoration")).toBe(
      "none",
    );
    expect(navItem("Product").style.getPropertyValue("font-weight")).toBe(
      "500",
    );
  });
});

describe("Navbar navigation landmark structure", () => {
  it("renders the default entries inside the labelled landmark", () => {
    renderNavbar();

    const nav = screen.getByRole("navigation", { name: NAV_LANDMARK_NAME });
    const labels = within(nav)
      .getAllByRole("link")
      .map((link) => link.textContent?.trim());

    for (const entry of DEFAULT_ENTRIES) {
      expect(labels).toContain(entry);
    }
  });
});
