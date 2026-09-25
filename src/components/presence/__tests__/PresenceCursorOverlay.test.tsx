import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import PresenceCursorOverlay from "../PresenceCursorOverlay";
import { Viewer } from "../../../hooks/usePresenceViewers";

const mockViewer1: Viewer = {
  id: "G1",
  displayName: "Alice Smith",
  initials: "AS",
  color: "#b91c1c",
  lastSeen: Date.now(),
  cursorY: 0.25,
};

const mockViewer2: Viewer = {
  id: "G2",
  displayName: "Bob Jones",
  initials: "BJ",
  color: "#c2410c",
  lastSeen: Date.now(),
  cursorY: 0.75,
};

describe("PresenceCursorOverlay", () => {
  it("renders nothing when no active viewers have cursorY", () => {
    const noCursorViewer = { ...mockViewer1, cursorY: undefined };
    const { container } = render(
      <PresenceCursorOverlay viewers={[noCursorViewer]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when all viewers are fading out", () => {
    const fadingViewer = { ...mockViewer1, fadingOut: true, cursorY: 0.5 };
    const { container } = render(
      <PresenceCursorOverlay viewers={[fadingViewer]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders cursor dots for active viewers with cursorY", () => {
    const { container } = render(
      <PresenceCursorOverlay viewers={[mockViewer1, mockViewer2]} />,
    );
    const dots = container.querySelectorAll(".presence-cursor-dot");
    expect(dots).toHaveLength(2);
  });

  it("renders name labels for each viewer", () => {
    render(
      <PresenceCursorOverlay viewers={[mockViewer1, mockViewer2]} />,
    );
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
  });

  it("positions dots at correct percentage from cursorY", () => {
    const { container } = render(
      <PresenceCursorOverlay viewers={[mockViewer1]} />,
    );
    const wrapper = container.querySelector(
      ".presence-cursor-dot-wrapper",
    ) as HTMLElement;
    expect(wrapper.style.top).toBe("25%");
  });

  it("clamps cursorY to 0-100% range", () => {
    const belowViewer = { ...mockViewer1, cursorY: -0.1 };
    const aboveViewer = { ...mockViewer2, cursorY: 1.5 };
    const { container } = render(
      <PresenceCursorOverlay viewers={[belowViewer, aboveViewer]} />,
    );
    const wrappers = container.querySelectorAll<HTMLElement>(".presence-cursor-dot-wrapper");
    expect(wrappers[0].style.top).toBe("0%");
    expect(wrappers[1].style.top).toBe("100%");
  });

  it("renders '?' label when displayName is null", () => {
    const noNameViewer = { ...mockViewer1, displayName: null };
    render(
      <PresenceCursorOverlay viewers={[noNameViewer]} />,
    );
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("marks overlay as aria-hidden", () => {
    const { container } = render(
      <PresenceCursorOverlay viewers={[mockViewer1]} />,
    );
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("never blocks interaction with controls beneath it", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    const { container } = render(
      <div style={{ position: "relative" }}>
        <button onClick={handleClick}>Underlying Button</button>
        <PresenceCursorOverlay viewers={[mockViewer1]} />
      </div>
    );

    // The overlay should be present and configured to not intercept pointers
    const overlay = container.querySelector(".presence-cursor-overlay");
    expect(overlay).toHaveStyle({ pointerEvents: "none" });

    // The overlay should not be focusable / in the tab order
    expect(overlay).not.toHaveAttribute("tabindex");

    // Click the underlying control
    const button = screen.getByRole("button", { name: "Underlying Button" });
    await user.click(button);

    // Assert the control receives the event
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
