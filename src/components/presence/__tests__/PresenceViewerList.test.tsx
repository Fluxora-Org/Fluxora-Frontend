import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
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

  it("renders raw id if not a Stellar address and displayName is null", () => {
    const mockViewer: Viewer = {
      id: "G-short", // Starts with G but too short to be Stellar key
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
      id: "A1111111111111111111111111111111111111111111111111111111", // Length 56 but starts with A
      displayName: null,
      initials: "??",
      color: "#b91c1c",
      lastSeen: Date.now(),
    };
    render(<PresenceViewerList viewers={[mockViewer]} onClose={vi.fn()} />);
    expect(screen.getByText("A1111111111111111111111111111111111111111111111111111111")).toBeInTheDocument();
  });
});
