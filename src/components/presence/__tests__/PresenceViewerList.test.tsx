import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import PresenceViewerList from "../PresenceViewerList";
import { Viewer } from "../../../hooks/usePresenceViewers";

const mockViewer1: Viewer = {
  id: "G1",
  displayName: "Alice Smith",
  initials: "AS",
  color: "#b91c1c",
  lastSeen: Date.now(),
};

describe("PresenceViewerList", () => {
  it("renders empty message when there are no viewers", () => {
    render(<PresenceViewerList viewers={[]} onClose={vi.fn()} />);
    expect(screen.getByText("No other viewers")).toBeInTheDocument();
  });

  it("calls onClose when Escape key is pressed inside the list", () => {
    const handleClose = vi.fn();
    render(<PresenceViewerList viewers={[mockViewer1]} onClose={handleClose} />);

    const listElement = screen.getByRole("list");
    fireEvent.keyDown(listElement, { key: "Escape" });
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when other keys are pressed", () => {
    const handleClose = vi.fn();
    render(<PresenceViewerList viewers={[mockViewer1]} onClose={handleClose} />);

    const listElement = screen.getByRole("list");
    fireEvent.keyDown(listElement, { key: "Enter" });
    
    expect(handleClose).not.toHaveBeenCalled();
  });

  it("renders viewer rows without tabIndex so they are not keyboard-focusable", () => {
    render(<PresenceViewerList viewers={[mockViewer1]} onClose={vi.fn()} />);

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    rows.forEach((row) => {
      expect(row).not.toHaveAttribute("tabindex");
    });
  });

  it("renders raw id if not a Stellar address and displayName is null", () => {
    const mockViewer: Viewer = {
      id: "G-short",
      displayName: null,
      initials: "??",
      color: "#b91c1c",
      lastSeen: Date.now(),
    };
    render(<PresenceViewerList viewers={[mockViewer]} onClose={vi.fn()} />);
    expect(screen.getByText("G-short")).toBeInTheDocument();
  });

  it("renders raw id if starts with another letter and displayName is null", () => {
    const mockViewer: Viewer = {
      id: "A1111111111111111111111111111111111111111111111111111111",
      displayName: null,
      initials: "??",
      color: "#b91c1c",
      lastSeen: Date.now(),
    };
    render(<PresenceViewerList viewers={[mockViewer]} onClose={vi.fn()} />);
    expect(screen.getByText("A1111111111111111111111111111111111111111111111111111111")).toBeInTheDocument();
  });
});

describe("PresenceViewerList elapsed time updates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates elapsed seconds text over time without a viewers prop change (Issue #955)", () => {
    const fixedLastSeen = Date.now() - 5_000;
    const mockViewer: Viewer = {
      id: "G1",
      displayName: "Alice",
      initials: "AS",
      color: "#b91c1c",
      lastSeen: fixedLastSeen,
    };

    render(<PresenceViewerList viewers={[mockViewer]} onClose={vi.fn()} />);

    expect(screen.getByText(/last seen 5 seconds ago/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(screen.getByText(/last seen 35 seconds ago/i)).toBeInTheDocument();
  });
});
