import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import fc from "fast-check";
import { CommandPaletteModal } from "../KeyboardShortcutsModal";
import { ThemeProvider } from "../../theme/ThemeProvider";
import {
  saveRecentPaletteItemId,
  clearAccountBrowserStorage,
} from "../../lib/browserStorage";
import {
  comparePaletteItems,
  type PaletteCategory,
} from "../commandPaletteData";

function LocationViewer() {
  const location = useLocation();
  return <span data-testid="current-location">{location.pathname}</span>;
}

describe("CommandPaletteModal (Cmd+K Help & Search)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("opens when custom event 'open-command-palette' is dispatched", () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <CommandPaletteModal />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(
      screen.queryByRole("dialog", { name: /command palette/i })
    ).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new CustomEvent("open-command-palette"));
    });

    const dialog = screen.getByRole("dialog", { name: /command palette/i });
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/search actions, shortcuts, or help/i)
    ).toBeInTheDocument();
  });

  it("opens when Cmd+K keyboard shortcut is pressed", () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <CommandPaletteModal />
        </MemoryRouter>
      </ThemeProvider>
    );

    act(() => {
      fireEvent.keyDown(document, { key: "k", metaKey: true });
    });

    expect(
      screen.getByRole("dialog", { name: /command palette/i })
    ).toBeInTheDocument();
  });

  it("renders suggested actions in empty query state", () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <CommandPaletteModal />
        </MemoryRouter>
      </ThemeProvider>
    );

    act(() => {
      window.dispatchEvent(new CustomEvent("open-command-palette"));
    });

    expect(screen.getByText(/suggested & frequent actions/i)).toBeInTheDocument();
    expect(screen.getByText(/create new stream/i)).toBeInTheDocument();
    expect(screen.getByText(/jump to dashboard/i)).toBeInTheDocument();
  });

  it("filters items dynamically by query and groups into Actions, Shortcuts, and Help sections", () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <CommandPaletteModal />
        </MemoryRouter>
      </ThemeProvider>
    );

    act(() => {
      window.dispatchEvent(new CustomEvent("open-command-palette"));
    });

    const input = screen.getByPlaceholderText(/search actions, shortcuts, or help/i);

    fireEvent.change(input, { target: { value: "streams" } });

    expect(screen.getByText(/actions/i)).toBeInTheDocument();
    expect(screen.getByText(/jump to streams/i)).toBeInTheDocument();
  });

  it("displays no-results state when search query matches no items", () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <CommandPaletteModal />
        </MemoryRouter>
      </ThemeProvider>
    );

    act(() => {
      window.dispatchEvent(new CustomEvent("open-command-palette"));
    });

    const input = screen.getByPlaceholderText(/search actions, shortcuts, or help/i);
    fireEvent.change(input, { target: { value: "xyzunmatchedquery123" } });

    expect(screen.getByText(/no matching results found/i)).toBeInTheDocument();
    expect(
      screen.getByText(/no actions, shortcuts, or help articles matched/i)
    ).toBeInTheDocument();
  });

  it("navigates options via ArrowDown/ArrowUp and executes action on Enter", () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/app"]}>
          <LocationViewer />
          <CommandPaletteModal />
        </MemoryRouter>
      </ThemeProvider>
    );

    act(() => {
      window.dispatchEvent(new CustomEvent("open-command-palette"));
    });

    const input = screen.getByPlaceholderText(/search actions, shortcuts, or help/i);

    // Search for recipient
    fireEvent.change(input, { target: { value: "recipient" } });

    // Press ArrowDown to select first result
    fireEvent.keyDown(input, { key: "ArrowDown" });

    // Press Enter to execute action
    fireEvent.keyDown(input, { key: "Enter" });

    // Location should update to /app/recipient
    expect(screen.getByTestId("current-location").textContent).toBe(
      "/app/recipient"
    );

    // Modal should close
    expect(
      screen.queryByRole("dialog", { name: /command palette/i })
    ).not.toBeInTheDocument();
  });

  it("closes modal on Escape key press", () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <CommandPaletteModal />
        </MemoryRouter>
      </ThemeProvider>
    );

    act(() => {
      window.dispatchEvent(new CustomEvent("open-command-palette"));
    });

    const dialog = screen.getByRole("dialog", { name: /command palette/i });
    expect(dialog).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/search actions, shortcuts, or help/i);
    fireEvent.keyDown(input, { key: "Escape" });

    expect(
      screen.queryByRole("dialog", { name: /command palette/i })
    ).not.toBeInTheDocument();
  });

  it("finds 'Create New Stream' when typing typos like 'strem'", () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <CommandPaletteModal />
        </MemoryRouter>
      </ThemeProvider>
    );

    act(() => {
      window.dispatchEvent(new CustomEvent("open-command-palette"));
    });

    const input = screen.getByPlaceholderText(/search actions, shortcuts, or help/i);
    fireEvent.change(input, { target: { value: "strem" } });

    expect(screen.getByText(/create new stream/i)).toBeInTheDocument();
  });

  it("shows recents only with empty query and clears them when storage is cleared", () => {
    saveRecentPaletteItemId("act-create-stream");

    const { unmount } = render(
      <ThemeProvider>
        <MemoryRouter>
          <CommandPaletteModal />
        </MemoryRouter>
      </ThemeProvider>
    );

    act(() => {
      window.dispatchEvent(new CustomEvent("open-command-palette"));
    });

    // Recent section should be visible with empty query
    expect(screen.getByText(/recent/i)).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/search actions, shortcuts, or help/i);
    // When query is typed, Recent section should NOT be shown
    fireEvent.change(input, { target: { value: "dashboard" } });
    expect(screen.queryByText(/^recent$/i)).not.toBeInTheDocument();

    // Clear query
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByText(/^recent$/i)).toBeInTheDocument();

    // Clear storage
    act(() => {
      clearAccountBrowserStorage();
    });

    // Recent section should now be gone
    expect(screen.queryByText(/^recent$/i)).not.toBeInTheDocument();

    unmount();
  });

  it("verifies with fast-check that an exact title match always ranks first", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.stringMatching(/^[a-z0-9_-]{1,10}$/),
            title: fc.stringMatching(/^[A-Za-z0-9 ]{2,20}$/),
            description: fc.stringMatching(/^[A-Za-z0-9 ]{2,30}$/),
            category: fc.constantFrom<PaletteCategory>("Actions", "Shortcuts", "Help"),
            keywords: fc.array(fc.stringMatching(/^[a-z0-9]{2,10}$/), { maxLength: 3 }),
          }),
          { minLength: 2, maxLength: 10 },
        ),
        fc.nat(),
        (items, seed) => {
          const target = items[seed % items.length];
          const query = target.title.trim();
          if (!query) return true;

          const sorted = [...items].sort((a, b) => comparePaletteItems(a, b, query));
          expect(sorted[0].title.toLowerCase().trim()).toBe(query.toLowerCase());
        },
      ),
      { numRuns: 50 },
    );
  });
});
