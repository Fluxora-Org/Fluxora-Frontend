import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

// ─────────────────────────────────────────────────────────────────────────────
// Existing test suite (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

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

  it("opens the list when Enter or Space is pressed on the trigger", () => {
    render(<PresenceBadge viewers={[mockViewer1, mockViewer2]} />);
    const trigger = screen.getByRole("button");
    
    // Press Enter
    fireEvent.keyDown(trigger, { key: "Enter" });
    // In jsdom, fireEvent.keyDown doesn't always trigger onClick for buttons unless we use userEvent
    // or simulate click, but we can just simulate the click that React maps from Enter/Space natively
    fireEvent.click(trigger);
    expect(screen.getByRole("list")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("list"), { key: "Escape" });
    
    // Press Space
    fireEvent.click(trigger);
    expect(screen.getByRole("list")).toBeInTheDocument();
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
    // Escape on a closed popover: the container handler is guarded by `isOpen`,
    // so nothing happens — the list stays absent, no error thrown.
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
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

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  describe("loading state", () => {
    it("renders loading indicator when isLoading is true", () => {
      render(<PresenceBadge viewers={[]} isLoading={true} />);
      
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-busy", "true");
      expect(button).toHaveAttribute("aria-label", "Loading presence information");
    });

    it("displays loading text and animated dots when loading", () => {
      const { container } = render(<PresenceBadge viewers={[]} isLoading={true} />);
      
      expect(screen.getByText("Loading...")).toBeInTheDocument();
      
      const dots = container.querySelectorAll(".presence-loading-dot");
      expect(dots).toHaveLength(3);
    });

    it("does not render viewer list or avatar stack when loading", () => {
      render(<PresenceBadge viewers={[mockViewer1]} isLoading={true} />);
      
      // Should not show avatars even though viewers array has data
      expect(screen.queryByText("AS")).not.toBeInTheDocument();
      expect(screen.queryByText("2 viewing")).not.toBeInTheDocument();
    });

    it("renders normally when isLoading is false", () => {
      render(<PresenceBadge viewers={[mockViewer1]} isLoading={false} />);
      
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      expect(screen.getByText("2 viewing")).toBeInTheDocument();
    });

    it("loading indicator is aria-hidden", () => {
      const { container } = render(<PresenceBadge viewers={[]} isLoading={true} />);
      
      const indicator = container.querySelector(".presence-loading-indicator");
      expect(indicator).toHaveAttribute("aria-hidden", "true");
    });

    it("loading button cannot be clicked", () => {
      render(<PresenceBadge viewers={[]} isLoading={true} />);
      
      const button = screen.getByRole("button");
      fireEvent.click(button);
      
      // List should not appear because button is disabled
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Tooltip: role and content
  // -------------------------------------------------------------------------

  describe("tooltip role and accessibility", () => {
    it("tooltip spans carry role='tooltip'", () => {
      render(<PresenceBadge viewers={[mockViewer1, mockViewer2]} />);
      // Tooltips live inside aria-hidden="true" (avatar stack), so query with hidden:true
      const tooltips = screen.getAllByRole("tooltip", { hidden: true });
      // One tooltip per rendered avatar (up to 3)
      expect(tooltips.length).toBeGreaterThanOrEqual(1);
    });

    it("each tooltip contains the viewer's displayName", () => {
      render(<PresenceBadge viewers={[mockViewer1, mockViewer2]} />);
      const tooltips = screen.getAllByRole("tooltip", { hidden: true });
      const texts = tooltips.map((t) => t.textContent);
      expect(texts).toContain("Alice Smith");
      expect(texts).toContain("Bob Jones");
    });

    it("tooltip contains 'Anonymous Viewer' when displayName is null", () => {
      const anonViewer: Viewer = {
        id: "G99",
        displayName: null,
        initials: "??",
        color: "#b91c1c",
        lastSeen: Date.now(),
      };
      render(<PresenceBadge viewers={[anonViewer]} />);
      expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent("Anonymous Viewer");
    });

    it("tooltip is inside an aria-hidden avatar stack so it does not appear in the accessible name tree of the trigger", () => {
      const { container } = render(<PresenceBadge viewers={[mockViewer1]} />);
      const stack = container.querySelector(".presence-avatar-stack");
      expect(stack).toHaveAttribute("aria-hidden", "true");
    });

    it("tooltip pointer-events are disabled (CSS class check)", () => {
      render(<PresenceBadge viewers={[mockViewer1]} />);
      const tooltip = screen.getByRole("tooltip", { hidden: true });
      expect(tooltip).toHaveClass("presence-tooltip");
    });
  });

  // -------------------------------------------------------------------------
  // aria-haspopup and aria-expanded
  // -------------------------------------------------------------------------

  describe("trigger ARIA attributes", () => {
    it("trigger has aria-haspopup='true'", () => {
      render(<PresenceBadge viewers={[mockViewer1]} />);
      const trigger = screen.getByRole("button");
      expect(trigger).toHaveAttribute("aria-haspopup", "true");
    });

    it("trigger aria-expanded is false when popover is closed", () => {
      render(<PresenceBadge viewers={[mockViewer1]} />);
      expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
    });

    it("trigger aria-expanded is true when popover is open", () => {
      render(<PresenceBadge viewers={[mockViewer1]} />);
      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    });
  });

  // -------------------------------------------------------------------------
  // Dual Escape scope: list-level then badge-level
  // -------------------------------------------------------------------------

  describe("Escape key scope handling", () => {
    it("Escape on the list closes the popover and returns focus to the trigger", () => {
      render(<PresenceBadge viewers={[mockViewer1, mockViewer2]} />);
      const trigger = screen.getByRole("button");

      fireEvent.click(trigger);
      expect(screen.getByRole("list")).toBeInTheDocument();

      // Escape fired on the list element (inner scope)
      fireEvent.keyDown(screen.getByRole("list"), { key: "Escape" });

      expect(screen.queryByRole("list")).not.toBeInTheDocument();
      expect(document.activeElement).toBe(trigger);
    });

    it("Escape on the trigger button (outer scope) closes the popover when already open", () => {
      render(<PresenceBadge viewers={[mockViewer1]} />);
      const trigger = screen.getByRole("button");

      fireEvent.click(trigger);
      expect(screen.getByRole("list")).toBeInTheDocument();

      // Escape on the trigger itself (outer container scope)
      fireEvent.keyDown(trigger, { key: "Escape" });

      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });

    it("Escape on the trigger when popover is closed does nothing", () => {
      render(<PresenceBadge viewers={[mockViewer1]} />);
      const trigger = screen.getByRole("button");

      fireEvent.keyDown(trigger, { key: "Escape" });
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Popover stays open on viewer list update
  // -------------------------------------------------------------------------

  describe("popover stability on viewer list update", () => {
    it("stays open when viewers prop changes while popover is open", () => {
      const { rerender } = render(
        <PresenceBadge viewers={[mockViewer1, mockViewer2]} />
      );
      const trigger = screen.getByRole("button");
      fireEvent.click(trigger);
      expect(screen.getByRole("list")).toBeInTheDocument();

      // A new viewer joins
      rerender(
        <PresenceBadge viewers={[mockViewer1, mockViewer2, mockViewer3]} />
      );
      // Popover must still be mounted
      expect(screen.getByRole("list")).toBeInTheDocument();
    });

    it("shows the updated viewer in the list when a new viewer joins while open", () => {
      const { rerender } = render(
        <PresenceBadge viewers={[mockViewer1]} />
      );
      fireEvent.click(screen.getByRole("button"));

      rerender(<PresenceBadge viewers={[mockViewer1, mockViewer2]} />);

      // Scope assertion to the viewer list to avoid collision with the avatar tooltip
      const list = screen.getByRole("list");
      expect(list).toBeInTheDocument();
      expect(within(list).getByText("Bob Jones")).toBeInTheDocument();
    });

    it("reflects fadingOut state of a viewer while popover is open", () => {
      const { rerender } = render(
        <PresenceBadge viewers={[mockViewer1, mockViewer2]} />
      );
      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByRole("list")).toBeInTheDocument();

      // Viewer starts fading
      rerender(
        <PresenceBadge viewers={[mockViewer1, { ...mockViewer2, fadingOut: true }]} />
      );

      // Popover still open; fading viewer row carries the CSS modifier
      const rows = screen.getAllByRole("listitem");
      const fadingRow = rows.find((r) =>
        r.className.includes("presence-viewer-row--fading")
      );
      expect(fadingRow).toBeTruthy();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// New edge-case tests: polling, fading, timer cleanup, totalCount, simultaneous
// ─────────────────────────────────────────────────────────────────────────────

describe("PresenceBadge — edge cases", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── totalCount is deterministic when all peers are fading ─────────────────

  it("shows '1 viewing' and keeps the badge visible when every peer is fading out", () => {
    // All viewers are in the fading-out state; only the local user remains active.
    const fadingViewer1: Viewer = { ...mockViewer1, fadingOut: true };
    const fadingViewer2: Viewer = { ...mockViewer2, fadingOut: true };

    render(<PresenceBadge viewers={[fadingViewer1, fadingViewer2]} />);

    // Badge must still render (CSS fade animation is in progress).
    expect(screen.getByRole("button")).toBeInTheDocument();
    // activeCount = 0, totalCount = 0 + 1 = 1.
    expect(screen.getByText("1 viewing")).toBeInTheDocument();
  });

  it("totalCount counts only non-fading peers plus local user", () => {
    // 1 active + 1 fading peer → activeCount=1, totalCount=2
    const fadingViewer: Viewer = { ...mockViewer1, fadingOut: true };
    render(<PresenceBadge viewers={[fadingViewer, mockViewer2]} />);
    expect(screen.getByText("2 viewing")).toBeInTheDocument();
  });

  // ── aria-label reflects deterministic totalCount ──────────────────────────

  it("aria-label on the trigger uses deterministic totalCount", () => {
    const fadingViewer: Viewer = { ...mockViewer1, fadingOut: true };
    render(<PresenceBadge viewers={[fadingViewer, mockViewer2]} />);
    const trigger = screen.getByRole("button");
    // 1 active peer + local user = 2
    expect(trigger).toHaveAttribute(
      "aria-label",
      "2 active viewers. Click to view list."
    );
  });

  // ── fading-out viewer triggers "left" announcement ────────────────────────

  it("announces left when a viewer transitions to fadingOut", () => {
    const { rerender } = render(
      <PresenceBadge viewers={[mockViewer1, mockViewer2]} />
    );
    const liveRegion = screen.getByRole("status", { hidden: true });

    // Viewer2 transitions to fading — should be announced as left.
    const fadingViewer2: Viewer = { ...mockViewer2, fadingOut: true };
    rerender(<PresenceBadge viewers={[mockViewer1, fadingViewer2]} />);

    expect(liveRegion).toHaveTextContent("Bob Jones left");
  });

  it("does not re-announce a viewer that was already fading on the previous render", () => {
    const fadingViewer2: Viewer = { ...mockViewer2, fadingOut: true };

    // Start with viewer2 already fading.
    const { rerender } = render(
      <PresenceBadge viewers={[mockViewer1, fadingViewer2]} />
    );
    const liveRegion = screen.getByRole("status", { hidden: true });

    // Rerender with same fading state — no new departure event.
    rerender(<PresenceBadge viewers={[mockViewer1, fadingViewer2]} />);
    expect(liveRegion).not.toHaveTextContent("Bob Jones left");
  });

  // ── announcement timer is cleared on component unmount ───────────────────

  it("clears the announcement timer on unmount (no setState after unmount)", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    const { rerender, unmount } = render(
      <PresenceBadge viewers={[mockViewer1]} />
    );

    // Trigger an announcement (viewer2 joins).
    rerender(<PresenceBadge viewers={[mockViewer1, mockViewer2]} />);

    const callsBefore = clearTimeoutSpy.mock.calls.length;
    unmount();

    // At least one clearTimeout call should have happened at or after unmount.
    expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("registers exactly one outside-click listener and removes it on unmount", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");

    const { unmount } = render(<PresenceBadge viewers={[mockViewer1]} />);

    // One mousedown listener is attached while the badge is mounted.
    const added = addSpy.mock.calls.filter((c) => c[0] === "mousedown");
    expect(added).toHaveLength(1);

    unmount();

    // The same listener is removed on unmount — no listener leaks after the
    // badge leaves the route.
    const removed = removeSpy.mock.calls.filter((c) => c[0] === "mousedown");
    expect(removed).toHaveLength(1);
    expect(removed[0][1]).toBe(added[0][1]);
  });

  it("announcement is cleared after 3 seconds", () => {
    const { rerender } = render(<PresenceBadge viewers={[mockViewer1]} />);
    const liveRegion = screen.getByRole("status", { hidden: true });

    rerender(<PresenceBadge viewers={[mockViewer1, mockViewer2]} />);
    expect(liveRegion).toHaveTextContent("Bob Jones joined");

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(liveRegion).toHaveTextContent("");
  });

  it("announcement timer resets when a new event fires before the previous 3 s expires", () => {
    // Start with viewer1 already present so the component renders (viewers.length > 0
    // is required for PresenceBadge to mount and show the aria-live region).
    const { rerender } = render(<PresenceBadge viewers={[mockViewer1]} />);
    const liveRegion = screen.getByRole("status", { hidden: true });

    // Viewer2 joins — starts a 3-second clear timer.
    rerender(<PresenceBadge viewers={[mockViewer1, mockViewer2]} />);
    expect(liveRegion).toHaveTextContent("Bob Jones joined");

    // 2 seconds later, viewer3 also joins — the previous 3-second timer is
    // cancelled and a fresh 3-second timer starts.
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    rerender(<PresenceBadge viewers={[mockViewer1, mockViewer2, mockViewer3]} />);
    expect(liveRegion).toHaveTextContent("Charlie joined");

    // 2 more seconds — the original 3-second timer would have fired at t=3 but
    // was cancelled. The new timer still has 1 second remaining.
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(liveRegion).toHaveTextContent("Charlie joined");

    // 1 more second — the second timer fires, clearing the region.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(liveRegion).toHaveTextContent("");
  });

  // ── simultaneous join + leave in one rerender ─────────────────────────────

  it("announces join and leave together when both happen in the same render", () => {
    const { rerender } = render(
      <PresenceBadge viewers={[mockViewer1]} />
    );
    const liveRegion = screen.getByRole("status", { hidden: true });

    // Viewer1 leaves, viewer2 joins simultaneously.
    rerender(<PresenceBadge viewers={[mockViewer2]} />);

    expect(liveRegion).toHaveTextContent("Bob Jones joined");
    expect(liveRegion).toHaveTextContent("Alice Smith left");
  });

  // ── fading viewer not announced as a new join ─────────────────────────────

  it("does not announce a fading viewer as joined on first render", () => {
    // A viewer that arrives already in fadingOut state (e.g. stale initial data)
    // should NOT trigger a "joined" announcement because it is not active.
    const fadingViewer: Viewer = { ...mockViewer1, fadingOut: true };
    render(<PresenceBadge viewers={[fadingViewer]} />);

    const liveRegion = screen.getByRole("status", { hidden: true });
    expect(liveRegion).not.toHaveTextContent("Alice Smith joined");
  });

  // ── overflow pill stays correct when fading viewers occupy visible slots ──

  it("overflow pill count is based on all viewers in the array, not just active ones", () => {
    // 3 visible + 1 fading = 4 total in array; pill says +1 more regardless of fading state.
    const fadingViewer4: Viewer = { ...mockViewer4, fadingOut: true };
    render(
      <PresenceBadge viewers={[mockViewer1, mockViewer2, mockViewer3, fadingViewer4]} />
    );
    expect(screen.getByText("+1 more")).toBeInTheDocument();
  });
});
