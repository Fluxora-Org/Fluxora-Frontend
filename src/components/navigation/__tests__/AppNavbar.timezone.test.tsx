import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import AppNavbar from "../AppNavbar";
import { ThemeProvider } from "../../../theme/ThemeProvider";

// Mock useWallet
vi.mock("../../wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    connected: false,
    address: undefined,
    network: undefined,
    loading: false,
    error: null,
    expectedNetwork: "TESTNET",
    expectedNetworkLabel: "Testnet",
    isNetworkMismatch: false,
    disconnect: () => {},
  }),
}));

vi.mock("../../voice/VoiceMicButton", () => ({
  VoiceMicButton: () => <div data-testid="mock-voice-mic-button" />,
}));

// Mock react-router-dom
vi.mock("react-router-dom", () => ({
  Link: ({
    children,
    to,
    ...props
  }: React.PropsWithChildren<{ to: string; [key: string]: unknown }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: "/" }),
}));

describe("AppNavbar timezone-aware relative-time indicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Pin time to 2026-07-24T05:07:26Z
    vi.setSystemTime(new Date("2026-07-24T05:07:26.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders the ticking time indicator on desktop and mobile formats", () => {
    render(
      <ThemeProvider>
        <AppNavbar />
      </ThemeProvider>
    );

    const timeBtn = screen.getByRole("button", {
      name: /current time/i,
    });
    expect(timeBtn).toBeInTheDocument();
    
    // Ticking element has aria-live="off"
    const desktopSpan = timeBtn.querySelector(".hidden.md\\:inline");
    const mobileSpan = timeBtn.querySelector(".md\\:hidden");
    
    expect(desktopSpan).toBeInTheDocument();
    expect(desktopSpan).toHaveAttribute("aria-live", "off");
    expect(mobileSpan).toBeInTheDocument();
    expect(mobileSpan).toHaveAttribute("aria-live", "off");
  });

  it("opens the tooltip on hover and closes on mouse leave", () => {
    render(
      <ThemeProvider>
        <AppNavbar />
      </ThemeProvider>
    );

    const timeBtn = screen.getByRole("button", {
      name: /current time/i,
    });

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    // Hover
    fireEvent.mouseEnter(timeBtn);
    
    const tooltip = screen.getByRole("tooltip", { id: "navbar-time-tooltip" });
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent(/time details/i);
    expect(tooltip).toHaveTextContent(/iso timestamp/i);
    expect(tooltip).toHaveTextContent(/resolved timezone/i);
    expect(tooltip).toHaveTextContent(/utc offset/i);

    // Mouse leave
    fireEvent.mouseLeave(timeBtn);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("opens the tooltip and triggers a manual refresh on focus", () => {
    render(
      <ThemeProvider>
        <AppNavbar />
      </ThemeProvider>
    );

    const timeBtn = screen.getByRole("button", {
      name: /current time/i,
    });

    // Advance mock time by 5 seconds without letting ticking hook tick (ticks every 30s)
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Focus trigger should update time immediately
    fireEvent.focus(timeBtn);

    const tooltip = screen.getByRole("tooltip", { id: "navbar-time-tooltip" });
    expect(tooltip).toBeInTheDocument();
    
    // Verify tooltip contains the updated manual time
    // The pinned time was 2026-07-24T05:07:26.000Z.
    // After 5 seconds, it should be 2026-07-24T05:07:31
    expect(tooltip.innerHTML).toContain("2026-07-24T05:07:31");
  });

  it("closes the tooltip on Escape key press", () => {
    render(
      <ThemeProvider>
        <AppNavbar />
      </ThemeProvider>
    );

    const timeBtn = screen.getByRole("button", {
      name: /current time/i,
    });

    fireEvent.focus(timeBtn);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.keyDown(timeBtn, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("handles timezone resolution failure by falling back to UTC", () => {
    // Mock resolvedOptions().timeZone to return empty causing fallback to UTC
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockImplementation(() => ({
      locale: "en-US",
      calendar: "gregory",
      numberingSystem: "latn",
      timeZone: "",
    }));

    render(
      <ThemeProvider>
        <AppNavbar />
      </ThemeProvider>
    );

    const timeBtn = screen.getByRole("button", {
      name: /current time/i,
    });

    // On hover, verify fallback is shown in tooltip
    fireEvent.mouseEnter(timeBtn);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent(/fallback/i);
    expect(tooltip).toHaveTextContent(/UTC\+00:00/i);
  });
});
