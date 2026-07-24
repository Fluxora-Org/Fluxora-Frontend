import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { CommandPaletteModal } from "../KeyboardShortcutsModal";
import { ThemeProvider } from "../../theme/ThemeProvider";

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
});
