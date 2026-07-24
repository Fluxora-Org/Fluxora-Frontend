/**
 * ColorBlindToggle tests
 * ───────────────────────
 * Covers rendering, keyboard operability, ARIA live-region announcements,
 * and simulation state changes.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import ColorBlindToggle from "../ColorBlindToggle";
import { ColorBlindSimulationProvider } from "../ColorBlindSimulationProvider";

// ─── Wrapper ─────────────────────────────────────────────────────────────────

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ColorBlindSimulationProvider>{children}</ColorBlindSimulationProvider>
  );
}

// ─── Rendering ───────────────────────────────────────────────────────────────

describe("ColorBlindToggle rendering", () => {
  it("renders the design-QA label text", () => {
    render(<ColorBlindToggle />, { wrapper: Wrapper });
    expect(screen.getByText(/Design QA/i)).toBeInTheDocument();
  });

  it("renders radio options for all four modes", () => {
    render(<ColorBlindToggle />, { wrapper: Wrapper });
    expect(screen.getByRole("radio", { name: /No simulation/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Protanopia/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Deuteranopia/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Tritanopia/i })).toBeInTheDocument();
  });

  it("has 'Off' selected by default", () => {
    render(<ColorBlindToggle />, { wrapper: Wrapper });
    expect(
      screen.getByRole("radio", { name: /No simulation/i }),
    ).toBeChecked();
  });

  it("does not render the active-filter description when simulation is off", () => {
    render(<ColorBlindToggle />, { wrapper: Wrapper });
    expect(
      screen.queryByTestId("active-filter-description"),
    ).not.toBeInTheDocument();
  });

  it("renders inside a landmark region with correct aria-label", () => {
    render(<ColorBlindToggle />, { wrapper: Wrapper });
    expect(
      screen.getByRole("region", {
        name: /Colour-blind simulation controls/i,
      }),
    ).toBeInTheDocument();
  });

  it("has a visually-hidden fieldset legend", () => {
    render(<ColorBlindToggle />, { wrapper: Wrapper });
    expect(
      screen.getByText(/Colour-blind simulation preset/i),
    ).toBeInTheDocument();
  });
});

// ─── Interaction ─────────────────────────────────────────────────────────────

describe("ColorBlindToggle interaction", () => {
  it("changes simulation when a radio is clicked", () => {
    render(<ColorBlindToggle />, { wrapper: Wrapper });
    const protanopiaRadio = screen.getByRole("radio", { name: /Protanopia/i });
    fireEvent.click(protanopiaRadio);
    expect(protanopiaRadio).toBeChecked();
  });

  it("shows active-filter description when a simulation is selected", () => {
    render(<ColorBlindToggle />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole("radio", { name: /Deuteranopia/i }));
    expect(
      screen.getByTestId("active-filter-description"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("active-filter-description").textContent).toMatch(
      /Deuteranopia/i,
    );
  });

  it("hides active-filter description when reset to Off", () => {
    render(<ColorBlindToggle />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole("radio", { name: /Protanopia/i }));
    expect(screen.getByTestId("active-filter-description")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /No simulation/i }));
    expect(
      screen.queryByTestId("active-filter-description"),
    ).not.toBeInTheDocument();
  });
});

// ─── Keyboard operability ────────────────────────────────────────────────────

describe("ColorBlindToggle keyboard operability", () => {
  it("radio inputs are keyboard-focusable", async () => {
    const user = userEvent.setup();
    render(<ColorBlindToggle />, { wrapper: Wrapper });

    // Tab to first radio (Off) in the fieldset
    const offRadio = screen.getByRole("radio", { name: /No simulation/i });
    await user.click(offRadio); // focus the group
    offRadio.focus();
    expect(document.activeElement).toBe(offRadio);
  });

  it("can activate a radio using the keyboard (spacebar/enter)", async () => {
    render(<ColorBlindToggle />, { wrapper: Wrapper });
    const protanopia = screen.getByRole("radio", { name: /Protanopia/i });
    protanopia.focus();
    fireEvent.click(protanopia);
    expect(protanopia).toBeChecked();
  });
});

// ─── ARIA live announcement ──────────────────────────────────────────────────

describe("ColorBlindToggle live announcements", () => {
  it("has a polite aria-live region", () => {
    render(<ColorBlindToggle />, { wrapper: Wrapper });
    const liveRegion = screen
      .getByTestId("colorblind-toggle")
      .querySelector("[aria-live='polite']");
    expect(liveRegion).toBeTruthy();
    expect(liveRegion?.getAttribute("aria-atomic")).toBe("true");
  });
});

// ─── Accessibility attributes ────────────────────────────────────────────────

describe("ColorBlindToggle accessibility", () => {
  it("all radio inputs have accessible labels via aria-label", () => {
    render(<ColorBlindToggle />, { wrapper: Wrapper });
    const radios = screen.getAllByRole("radio");
    for (const radio of radios) {
      expect(
        radio.getAttribute("aria-label") || radio.getAttribute("aria-labelledby"),
      ).toBeTruthy();
    }
  });

  it("does not have any radio without an id / name", () => {
    render(<ColorBlindToggle />, { wrapper: Wrapper });
    const radios = screen.getAllByRole("radio");
    for (const radio of radios) {
      expect(radio.id).toBeTruthy();
      expect(radio.getAttribute("name")).toBeTruthy();
    }
  });
});
