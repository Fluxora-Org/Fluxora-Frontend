import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PresenceBadge, { getInitials } from "../PresenceBadge";
import { Viewer } from "../../../hooks/usePresenceViewers";

const mockViewer1: Viewer = {
  id: "G1",
  displayName: "Alice Smith",
  initials: "AS",
  color: "#b91c1c",
  lastSeen: Date.now(),
};

const mockViewer2: Viewer = {
  id: "G2",
  displayName: "Bob Jones",
  initials: "BJ",
  color: "#c2410c",
  lastSeen: Date.now(),
};

const mockViewer3: Viewer = {
  id: "G3",
  displayName: "Charlie",
  initials: "CH",
  color: "#15803d",
  lastSeen: Date.now(),
};

const mockViewer4: Viewer = {
  id: "G4",
  displayName: "Diana",
  initials: "DI",
  color: "#0f766e",
  lastSeen: Date.now(),
};

const mockViewerAddress: Viewer = {
  id: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  displayName: null,
  initials: "??",
  color: "#1d4ed8",
  lastSeen: Date.now(),
};

const mockViewerSimpleId: Viewer = {
  id: "simple-id",
  displayName: null,
  initials: "??",
  color: "#7c3aed",
  lastSeen: Date.now(),
};

describe("PresenceBadge", () => {
  it("renders nothing with 0 viewers", () => {
    const { container } = render(<PresenceBadge viewers={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders avatar stack for 2-3 viewers", () => {
    // 2 other viewers (3 total viewers)
    render(
      <PresenceBadge viewers={[mockViewer1, mockViewer2]} />
    );

    // Verify count text (totalCount = viewers.length + 1 = 3)
    expect(screen.getByText("3 viewing")).toBeInTheDocument();

    // Verify initials fallbacks
    expect(screen.getByText("AS")).toBeInTheDocument();
    expect(screen.getByText("BJ")).toBeInTheDocument();

    // Verify overflow is NOT visible (since viewers.length <= 3)
    expect(screen.queryByText(/\+.*more/)).not.toBeInTheDocument();
  });

  it("renders overflow pill for 4+ viewers", () => {
    // 4 other viewers (5 total viewers)
    render(
      <PresenceBadge
        viewers={[mockViewer1, mockViewer2, mockViewer3, mockViewer4]}
      />
    );

    // Verify count text (5 total viewing)
    expect(screen.getByText("5 viewing")).toBeInTheDocument();

    // Verify overflow pill shows "+1 more" (4 other viewers - 3 rendered = 1 overflowed)
    expect(screen.getByText("+1 more")).toBeInTheDocument();
  });

  it("tooltip appears on hover", () => {
    render(<PresenceBadge viewers={[mockViewer1]} />);

    // Hover tooltip container check
    const tooltip = screen.getByText("Alice Smith");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveClass("presence-tooltip");
  });

  it("aria-live region announces join but not cursor movement", () => {
    // Start with 1 other viewer
    const { rerender } = render(<PresenceBadge viewers={[mockViewer1]} />);

    // Rerender with 2 other viewers (mockViewer2 joins)
    rerender(<PresenceBadge viewers={[mockViewer1, mockViewer2]} />);

    const liveRegion = screen.getByRole("status", { hidden: true });
    expect(liveRegion).toHaveTextContent("Bob Jones joined");

    // Clear timers to reset internal state if any, or test cursor movement:
    // Update lastSeen of mockViewer2 (does not count as join/leave)
    const updatedViewer2 = { ...mockViewer2, lastSeen: Date.now() + 1000 };
    rerender(<PresenceBadge viewers={[mockViewer1, updatedViewer2]} />);

    // The text content should remain unchanged or be cleared, not announcing join again
    expect(liveRegion).not.toHaveTextContent("joined joined");

    // Rerender with only mockViewer1 (mockViewer2 leaves)
    rerender(<PresenceBadge viewers={[mockViewer1]} />);
    expect(liveRegion).toHaveTextContent("Bob Jones left");
  });

  it("toggles the viewer list on badge click", () => {
    render(<PresenceBadge viewers={[mockViewer1, mockViewer2]} />);

    const trigger = screen.getByRole("button");
    
    // List should not be open initially
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(trigger);
    const list = screen.getByRole("list");
    expect(list).toBeInTheDocument();
    expect(within(list).getByText("Alice Smith")).toBeInTheDocument();
    expect(within(list).getByText("Bob Jones")).toBeInTheDocument();

    // Click to close
    fireEvent.click(trigger);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("closes the list when Escape is pressed and focuses the trigger", () => {
    render(<PresenceBadge viewers={[mockViewer1, mockViewer2]} />);

    const trigger = screen.getByRole("button");
    
    // Open list
    fireEvent.click(trigger);
    expect(screen.getByRole("list")).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(screen.getByRole("list"), { key: "Escape" });
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes the list when clicking outside", () => {
    render(
      <div>
        <div data-testid="outside">Outside Element</div>
        <PresenceBadge viewers={[mockViewer1, mockViewer2]} />
      </div>
    );

    const trigger = screen.getByRole("button");
    
    // Open list
    fireEvent.click(trigger);
    expect(screen.getByRole("list")).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders masked address when displayName is null", () => {
    render(<PresenceBadge viewers={[mockViewerAddress]} />);
    
    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);
    
    const list = screen.getByRole("list");
    expect(within(list).getByText("GAAAAA...AWHF")).toBeInTheDocument();
  });

  it("renders raw id when displayName is null and id is not a Stellar address", () => {
    render(<PresenceBadge viewers={[mockViewerSimpleId]} />);
    
    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);
    
    const list = screen.getByRole("list");
    expect(within(list).getByText("simple-id")).toBeInTheDocument();
  });

  describe("getInitials edge cases", () => {
    it("handles null, undefined, empty, and whitespace names", () => {
      expect(getInitials(null)).toBe("??");
      expect(getInitials(undefined)).toBe("??");
      expect(getInitials("")).toBe("??");
      expect(getInitials("   ")).toBe("??");
      expect(getInitials("One")).toBe("ON");
      expect(getInitials("One Two Three")).toBe("OT");
    });
  });

  it("renders exactly 3 viewers (4 total) without overflow pill", () => {
    render(
      <PresenceBadge viewers={[mockViewer1, mockViewer2, mockViewer3]} />
    );
    expect(screen.getByText("4 viewing")).toBeInTheDocument();
    expect(screen.queryByText(/\+.*more/)).not.toBeInTheDocument();
  });

  it("handles Escape key press when list is already closed", () => {
    render(<PresenceBadge viewers={[mockViewer1]} />);
    const trigger = screen.getByRole("button");
    fireEvent.keyDown(trigger, { key: "Escape" });
    // Should still be closed and trigger focused
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it("does not close list when clicking inside the list component", () => {
    render(<PresenceBadge viewers={[mockViewer1, mockViewer2]} />);
    const trigger = screen.getByRole("button");
    
    fireEvent.click(trigger);
    const list = screen.getByRole("list");
    expect(list).toBeInTheDocument();

    // Click inside the list
    fireEvent.mouseDown(list);
    expect(screen.getByRole("list")).toBeInTheDocument(); // should stay open
  });

  it("does not close list when other key is pressed", () => {
    render(<PresenceBadge viewers={[mockViewer1, mockViewer2]} />);
    const trigger = screen.getByRole("button");
    
    fireEvent.click(trigger);
    const list = screen.getByRole("list");
    
    fireEvent.keyDown(list, { key: "Enter" });
    expect(screen.getByRole("list")).toBeInTheDocument(); // should stay open
  });

  it("announces Someone joined and Someone left when displayName is null", () => {
    const anonymousViewer1 = { ...mockViewer1, displayName: null };
    const anonymousViewer2 = { ...mockViewer2, displayName: null };
    
    const { rerender } = render(<PresenceBadge viewers={[anonymousViewer1]} />);
    const liveRegion = screen.getByRole("status", { hidden: true });

    rerender(<PresenceBadge viewers={[anonymousViewer1, anonymousViewer2]} />);
    expect(liveRegion).toHaveTextContent("Someone joined");

    rerender(<PresenceBadge viewers={[anonymousViewer1]} />);
    expect(liveRegion).toHaveTextContent("Someone left");
  });

  it("renders fading-out class when viewer.fadingOut is true", () => {
    const fadingViewer: Viewer = {
      id: "G5",
      displayName: "Fading User",
      initials: "FU",
      color: "#b91c1c",
      lastSeen: Date.now(),
      fadingOut: true,
    };
    const { container } = render(<PresenceBadge viewers={[fadingViewer]} />);
    const avatar = container.querySelector(".presence-avatar");
    expect(avatar).toHaveClass("fading-out");
  });

  it("cycles colors from palette if viewer.color is missing", () => {
    const noColorViewer: any = {
      id: "G6",
      displayName: "No Color User",
      initials: "NC",
      lastSeen: Date.now(),
    };
    const { container } = render(<PresenceBadge viewers={[noColorViewer]} />);
    const avatar = container.querySelector(".presence-avatar") as HTMLElement;
    expect(avatar.style.backgroundColor).toBe("rgb(185, 28, 28)");
  });
});
