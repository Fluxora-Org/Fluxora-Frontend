import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import PresenceViewerList from "../PresenceViewerList";
import { Viewer } from "../../../hooks/usePresenceViewers";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseViewer: Viewer = {
  id: "G1",
  displayName: "Alice Smith",
  initials: "AS",
  color: "#b91c1c",
  lastSeen: Date.now(),
};

const viewerWithAddress: Viewer = {
  id: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  displayName: null,
  initials: "??",
  color: "#1d4ed8",
  lastSeen: Date.now(),
};

// ---------------------------------------------------------------------------
// Basic rendering
// ---------------------------------------------------------------------------

describe("PresenceViewerList – basic rendering", () => {
  it("renders empty-state message when viewers is empty", () => {
    render(<PresenceViewerList viewers={[]} onClose={vi.fn()} />);
    expect(screen.getByText("No other viewers")).toBeInTheDocument();
  });

  it("renders the correct number of viewer rows", () => {
    const viewers: Viewer[] = [
      baseViewer,
      { ...baseViewer, id: "G2", displayName: "Bob Jones", initials: "BJ", color: "#c2410c" },
    ];
    render(<PresenceViewerList viewers={viewers} onClose={vi.fn()} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("renders viewer displayName when provided", () => {
    render(<PresenceViewerList viewers={[baseViewer]} onClose={vi.fn()} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  it("has role='list' and aria-label on the container", () => {
    render(<PresenceViewerList viewers={[baseViewer]} onClose={vi.fn()} />);
    const list = screen.getByRole("list");
    expect(list).toHaveAttribute("aria-label", "Current active viewers");
  });

  it("container has tabIndex=-1 so it is programmatically focusable", () => {
    render(<PresenceViewerList viewers={[baseViewer]} onClose={vi.fn()} />);
    const list = screen.getByRole("list");
    expect(list).toHaveAttribute("tabindex", "-1");
  });

  it("viewer rows do not have a tabIndex (not individually keyboard-focusable)", () => {
    render(<PresenceViewerList viewers={[baseViewer]} onClose={vi.fn()} />);
    screen.getAllByRole("listitem").forEach((row) => {
      expect(row).not.toHaveAttribute("tabindex");
    });
  });

  it("renders colour dot as aria-hidden", () => {
    const { container } = render(
      <PresenceViewerList viewers={[baseViewer]} onClose={vi.fn()} />
    );
    const dot = container.querySelector(".presence-viewer-dot");
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });

  it("applies the viewer color to the dot via inline style", () => {
    const { container } = render(
      <PresenceViewerList viewers={[baseViewer]} onClose={vi.fn()} />
    );
    const dot = container.querySelector<HTMLElement>(".presence-viewer-dot");
    expect(dot?.style.backgroundColor).toBe("rgb(185, 28, 28)");
  });
});

// ---------------------------------------------------------------------------
// Address masking
// ---------------------------------------------------------------------------

describe("PresenceViewerList – address masking", () => {
  it("masks a 56-char Stellar address starting with G when displayName is null", () => {
    render(<PresenceViewerList viewers={[viewerWithAddress]} onClose={vi.fn()} />);
    // maskAddress(id, 6, 4): first 6 chars + '...' + last 4 chars
    expect(screen.getByText("GAAAAA...AWHF")).toBeInTheDocument();
  });

  it("renders raw id when it starts with G but is shorter than 56 chars", () => {
    const viewer: Viewer = {
      ...baseViewer,
      id: "G-short",
      displayName: null,
    };
    render(<PresenceViewerList viewers={[viewer]} onClose={vi.fn()} />);
    expect(screen.getByText("G-short")).toBeInTheDocument();
  });

  it("renders raw id when it does not start with G", () => {
    const viewer: Viewer = {
      ...baseViewer,
      id: "A1111111111111111111111111111111111111111111111111111111",
      displayName: null,
    };
    render(<PresenceViewerList viewers={[viewer]} onClose={vi.fn()} />);
    expect(
      screen.getByText("A1111111111111111111111111111111111111111111111111111111")
    ).toBeInTheDocument();
  });

  it("prefers displayName over masked address when both are present", () => {
    const viewer: Viewer = { ...viewerWithAddress, displayName: "Named User" };
    render(<PresenceViewerList viewers={[viewer]} onClose={vi.fn()} />);
    expect(screen.getByText("Named User")).toBeInTheDocument();
    expect(screen.queryByText(/\.\.\./)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Elapsed time display
// ---------------------------------------------------------------------------

describe("PresenceViewerList – elapsed time display", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows '0 seconds ago' when lastSeen is now (within the same tick)", () => {
    const viewer: Viewer = { ...baseViewer, lastSeen: Date.now() };
    render(<PresenceViewerList viewers={[viewer]} onClose={vi.fn()} />);
    expect(screen.getByText("last seen 0 seconds ago")).toBeInTheDocument();
  });

  it("shows correct elapsed seconds for a viewer seen 5 seconds ago", () => {
    const viewer: Viewer = { ...baseViewer, lastSeen: Date.now() - 5_000 };
    render(<PresenceViewerList viewers={[viewer]} onClose={vi.fn()} />);
    expect(screen.getByText("last seen 5 seconds ago")).toBeInTheDocument();
  });

  it("does not show negative elapsed (clamps at 0)", () => {
    // lastSeen slightly in the future (clock skew)
    const viewer: Viewer = { ...baseViewer, lastSeen: Date.now() + 1_000 };
    render(<PresenceViewerList viewers={[viewer]} onClose={vi.fn()} />);
    expect(screen.getByText("last seen 0 seconds ago")).toBeInTheDocument();
  });

  it("updates elapsed seconds text after 30s without a viewers prop change (Issue #955)", () => {
    const fixedLastSeen = Date.now() - 5_000;
    const viewer: Viewer = { ...baseViewer, lastSeen: fixedLastSeen };

    render(<PresenceViewerList viewers={[viewer]} onClose={vi.fn()} />);
    expect(screen.getByText(/last seen 5 seconds ago/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(screen.getByText(/last seen 35 seconds ago/i)).toBeInTheDocument();
  });

  it("reflects an updated lastSeen value when the viewers prop changes while open", () => {
    const viewer: Viewer = { ...baseViewer, lastSeen: Date.now() - 10_000 };
    const { rerender } = render(
      <PresenceViewerList viewers={[viewer]} onClose={vi.fn()} />
    );
    expect(screen.getByText("last seen 10 seconds ago")).toBeInTheDocument();

    // Simulate viewer becoming active again (lastSeen reset to now)
    const updatedViewer: Viewer = { ...viewer, lastSeen: Date.now() };
    rerender(<PresenceViewerList viewers={[updatedViewer]} onClose={vi.fn()} />);

    expect(screen.getByText("last seen 0 seconds ago")).toBeInTheDocument();
  });

  it("uses the 60 s reduced-motion tick cadence when prefers-reduced-motion is set", () => {
    // Stub matchMedia to report reduced-motion: reduce
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });

    const fixedLastSeen = Date.now() - 5_000;
    const viewer: Viewer = { ...baseViewer, lastSeen: fixedLastSeen };

    render(<PresenceViewerList viewers={[viewer]} onClose={vi.fn()} />);
    expect(screen.getByText(/last seen 5 seconds ago/i)).toBeInTheDocument();

    // After 30 s the text should NOT yet update (cadence is 60 s in reduced motion)
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    // The DOM still shows 5 seconds (tick hasn't fired yet)
    expect(screen.getByText(/last seen 5 seconds ago/i)).toBeInTheDocument();

    // After another 30 s (60 s total) the tick fires
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByText(/last seen 65 seconds ago/i)).toBeInTheDocument();

    // Restore matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  });
});

// ---------------------------------------------------------------------------
// Keyboard behaviour
// ---------------------------------------------------------------------------

describe("PresenceViewerList – keyboard behaviour", () => {
  it("calls onClose when Escape is pressed inside the list", () => {
    const onClose = vi.fn();
    render(<PresenceViewerList viewers={[baseViewer]} onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole("list"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose for keys other than Escape", () => {
    const onClose = vi.fn();
    render(<PresenceViewerList viewers={[baseViewer]} onClose={onClose} />);
    const list = screen.getByRole("list");
    fireEvent.keyDown(list, { key: "Enter" });
    fireEvent.keyDown(list, { key: "Tab" });
    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("stops propagation on Escape so parent Escape handlers do not double-fire", () => {
    const parentHandler = vi.fn();
    const onClose = vi.fn();

    render(
      // Simulate the PresenceBadge container having its own keydown handler
      <div onKeyDown={parentHandler}>
        <PresenceViewerList viewers={[baseViewer]} onClose={onClose} />
      </div>
    );
    fireEvent.keyDown(screen.getByRole("list"), { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
    // Propagation was stopped, so the parent should not have fired
    expect(parentHandler).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Auto-focus behaviour
// ---------------------------------------------------------------------------

describe("PresenceViewerList – auto-focus", () => {
  it("focuses the list container on mount by default (autoFocus=true)", () => {
    render(<PresenceViewerList viewers={[baseViewer]} onClose={vi.fn()} />);
    expect(document.activeElement).toBe(screen.getByRole("list"));
  });

  it("does not auto-focus when autoFocus=false", () => {
    render(
      <PresenceViewerList
        viewers={[baseViewer]}
        onClose={vi.fn()}
        autoFocus={false}
      />
    );
    expect(document.activeElement).not.toBe(screen.getByRole("list"));
  });
});

// ---------------------------------------------------------------------------
// Fading-out viewer
// ---------------------------------------------------------------------------

describe("PresenceViewerList – fading-out viewers", () => {
  it("still renders a fading-out viewer in the list", () => {
    const fadingViewer: Viewer = { ...baseViewer, fadingOut: true };
    render(<PresenceViewerList viewers={[fadingViewer]} onClose={vi.fn()} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  it("adds the fading CSS class to a fading-out viewer row", () => {
    const fadingViewer: Viewer = { ...baseViewer, fadingOut: true };
    render(<PresenceViewerList viewers={[fadingViewer]} onClose={vi.fn()} />);
    const row = screen.getByRole("listitem");
    expect(row).toHaveClass("presence-viewer-row--fading");
  });

  it("does NOT add the fading class to an active viewer row", () => {
    render(<PresenceViewerList viewers={[baseViewer]} onClose={vi.fn()} />);
    const row = screen.getByRole("listitem");
    expect(row).not.toHaveClass("presence-viewer-row--fading");
  });

  it("includes 'leaving' in the aria-label of a fading-out viewer row", () => {
    const fadingViewer: Viewer = { ...baseViewer, fadingOut: true };
    render(<PresenceViewerList viewers={[fadingViewer]} onClose={vi.fn()} />);
    const row = screen.getByRole("listitem");
    expect(row).toHaveAttribute("aria-label", "Alice Smith, leaving");
  });

  it("does not include 'leaving' in the aria-label of an active viewer row", () => {
    render(<PresenceViewerList viewers={[baseViewer]} onClose={vi.fn()} />);
    const row = screen.getByRole("listitem");
    expect(row).toHaveAttribute("aria-label", "Alice Smith");
  });

  it("popover content stays stable when viewer list updates (fadingOut changes)", () => {
    const { rerender } = render(
      <PresenceViewerList viewers={[baseViewer]} onClose={vi.fn()} />
    );
    expect(screen.getByRole("list")).toBeInTheDocument();

    // Simulate viewer starting to fade
    rerender(
      <PresenceViewerList
        viewers={[{ ...baseViewer, fadingOut: true }]}
        onClose={vi.fn()}
      />
    );
    // List is still mounted with the fading viewer visible
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveClass("presence-viewer-row--fading");
  });
});
