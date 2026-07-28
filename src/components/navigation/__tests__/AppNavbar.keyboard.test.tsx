// Regression tests for navbar keyboard navigation and focus order.
// Locks the CURRENT behavior documented in docs/NAVBAR_KEYBOARD_NAVIGATION_SPEC.md
// — top-level link sets, DOM-order tab sequence, time-indicator tooltip keys,
// connecting (loading) state, sidebar-toggle ARIA, and the unreachable mobile
// marketing menu. No production behavior is changed by these tests.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AppNavbar from "../AppNavbar";
import { ThemeProvider } from "../../../theme/ThemeProvider";

// Mutable wallet state so individual tests can flip connected/anonymous.
const walletState = vi.hoisted(() => ({
  connected: false,
  address: undefined as string | undefined,
}));

vi.mock("../../wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    connected: walletState.connected,
    address: walletState.address,
    network: "TESTNET",
    loading: false,
    error: null,
    expectedNetwork: "TESTNET",
    expectedNetworkLabel: "Testnet",
    isNetworkMismatch: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
  WalletProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// VoiceMicButton pulls in VoiceContext; replace with an inert (non-focusable) stub.
vi.mock("../../voice/VoiceMicButton", () => ({
  VoiceMicButton: () => <div data-testid="mock-voice-mic-button" />,
}));

// Freeze the clock cadence so the time indicator renders deterministically.
vi.mock("../../../hooks/useTickingNow", () => ({
  useTickingNow: () => "2026-07-24T05:07:26.000Z",
}));

const MOCK_ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV";

function renderNavbar(
  route = "/",
  props: Partial<React.ComponentProps<typeof AppNavbar>> = {},
) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[route]}>
        <AppNavbar {...props} />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

/**
 * Render and immediately flush the simulated 600ms wallet "connecting"
 * window under fake timers, then restore real timers so userEvent-free
 * assertions run against the settled navbar.
 */
function renderNavbarSettled(
  route = "/",
  props: Partial<React.ComponentProps<typeof AppNavbar>> = {},
) {
  vi.useFakeTimers();
  const result = renderNavbar(route, props);
  act(() => {
    vi.advanceTimersByTime(700);
  });
  vi.useRealTimers();
  return result;
}

beforeEach(() => {
  walletState.connected = false;
  walletState.address = undefined;
});

describe("Top-level navigation link sets", () => {
  it("anonymous users get the marketing link set with native tab semantics", () => {
    renderNavbarSettled("/");

    const nav = screen.getByRole("navigation", { name: "Marketing navigation" });
    expect(nav).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "App navigation" }),
    ).not.toBeInTheDocument();

    for (const label of ["Features", "Docs", "Pricing"]) {
      const link = screen.getByRole("link", { name: label });
      // No roving tabindex: enabled links never carry tabIndex=-1.
      expect(link).not.toHaveAttribute("tabindex");
      expect(link).not.toHaveAttribute("aria-disabled");
    }
  });

  it("connected users get the app link set with native tab semantics", () => {
    walletState.connected = true;
    walletState.address = MOCK_ADDRESS;
    renderNavbarSettled("/app");

    const nav = screen.getByRole("navigation", { name: "App navigation" });
    expect(nav).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Marketing navigation" }),
    ).not.toBeInTheDocument();

    for (const label of ["Dashboard", "Streams", "Recipient"]) {
      const link = screen.getByRole("link", { name: label });
      expect(link).not.toHaveAttribute("tabindex");
    }
  });

  it("marks only Dashboard with aria-current on /app", () => {
    walletState.connected = true;
    walletState.address = MOCK_ADDRESS;
    renderNavbarSettled("/app");

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Streams" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: "Recipient" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("known quirk: Dashboard keeps aria-current on /app/streams (prefix match, no `end`)", () => {
    walletState.connected = true;
    walletState.address = MOCK_ADDRESS;
    renderNavbarSettled("/app/streams");

    // NavLink matches by segment prefix and AppNavbar does not pass `end`,
    // so BOTH Dashboard (/app) and Streams (/app/streams) report the current
    // page. Locked as shipped behavior — see spec § 1.
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Streams" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Recipient" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});

describe("Keyboard focus order (DOM order, no focus management)", () => {
  // These tests run with real timers (userEvent + fake timers deadlock);
  // the tab stops asserted here all exist during the connecting window,
  // so the 600ms wallet-area swap does not need to be flushed.

  it("anonymous: logo → marketing links → time indicator → command palette", async () => {
    const user = userEvent.setup();
    renderNavbar("/");

    await user.tab();
    expect(screen.getByRole("link", { name: "Fluxora home" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("link", { name: "Features" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("link", { name: "Docs" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveFocus();

    await user.tab();
    expect(
      screen.getByRole("button", { name: /^current time/i }),
    ).toHaveFocus();

    await user.tab();
    expect(
      screen.getByRole("button", { name: /open command palette/i }),
    ).toHaveFocus();
  });

  it("connected app view: sidebar toggle is the first tab stop, before the logo", async () => {
    const user = userEvent.setup();
    walletState.connected = true;
    walletState.address = MOCK_ADDRESS;
    renderNavbar("/app");

    await user.tab();
    expect(
      screen.getByRole("button", { name: "Open navigation sidebar" }),
    ).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("link", { name: "Fluxora home" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveFocus();
  });
});

describe("Time indicator tooltip keyboard behavior", () => {
  it("opens on focus and closes on Escape while keeping focus on the button", () => {
    renderNavbarSettled("/");

    const timeBtn = screen.getByRole("button", { name: /^current time/i });

    act(() => {
      timeBtn.focus();
    });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(timeBtn).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(timeBtn, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(timeBtn).toHaveAttribute("aria-expanded", "false");
    // Escape only dismisses the tooltip — focus never moves.
    expect(timeBtn).toHaveFocus();
  });

  it("closes when focus leaves the button (blur)", () => {
    renderNavbarSettled("/");

    const timeBtn = screen.getByRole("button", { name: /^current time/i });

    act(() => {
      timeBtn.focus();
    });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.blur(timeBtn);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});

describe("Connecting (loading) state", () => {
  it("announces the skeleton via role=status and keeps nav links reachable", () => {
    vi.useFakeTimers();
    renderNavbar("/");

    // Before the 600ms window elapses, the wallet area is a status skeleton.
    const skeletons = screen.getAllByRole("status", {
      name: /connecting wallet/i,
    });
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.queryByRole("link", { name: "Connect your Stellar wallet" }),
    ).not.toBeInTheDocument();

    // Top-level navigation stays keyboard reachable during loading.
    expect(screen.getByRole("link", { name: "Features" })).not.toHaveAttribute(
      "tabindex",
    );

    act(() => {
      vi.advanceTimersByTime(700);
    });
    vi.useRealTimers();

    // Skeleton resolves to the Connect Wallet affordance (anonymous user).
    expect(
      screen.queryByRole("status", { name: /connecting wallet/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Connect your Stellar wallet" })
        .length,
    ).toBeGreaterThanOrEqual(1);
  });
});

describe("Sidebar toggle (app view only)", () => {
  it("exposes aria-expanded/aria-controls and calls onSidebarToggle", async () => {
    const user = userEvent.setup();
    const onSidebarToggle = vi.fn();
    walletState.connected = true;
    walletState.address = MOCK_ADDRESS;
    renderNavbar("/app", { onSidebarToggle, isSidebarOpen: false });

    const toggle = screen.getByRole("button", {
      name: "Open navigation sidebar",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "app-sidebar");

    toggle.focus();
    await user.keyboard("{Enter}");
    expect(onSidebarToggle).toHaveBeenCalledTimes(1);
  });

  it("reflects the open state in its label and aria-expanded", () => {
    walletState.connected = true;
    walletState.address = MOCK_ADDRESS;
    renderNavbarSettled("/app", { isSidebarOpen: true });

    const toggle = screen.getByRole("button", {
      name: "Close navigation sidebar",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("is absent for anonymous users and outside /app routes", () => {
    renderNavbarSettled("/");
    expect(
      screen.queryByRole("button", { name: /navigation sidebar/i }),
    ).not.toBeInTheDocument();
  });
});

describe("Command palette trigger", () => {
  it("dispatches open-command-palette when activated with Enter", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    window.addEventListener("open-command-palette", handler);
    try {
      renderNavbar("/");

      const paletteBtn = screen.getByRole("button", {
        name: /open command palette/i,
      });
      paletteBtn.focus();
      await user.keyboard("{Enter}");
      expect(handler).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener("open-command-palette", handler);
    }
  });
});

describe("Mobile marketing menu (documented as unreachable)", () => {
  it("never renders and exposes no toggle control", () => {
    renderNavbarSettled("/");

    // mobileMenuOpen has no setter wired to any UI control, so the dropdown
    // (#mobile-nav) is unreachable. Locked as-is — re-enabling the menu must
    // add a real toggle plus Escape/focus-return handling. See spec § 3.D.
    expect(document.getElementById("mobile-nav")).toBeNull();
    expect(document.querySelector('[aria-controls="mobile-nav"]')).toBeNull();

    // The Menu/X icon in the anonymous navbar is the Connect Wallet LINK,
    // not a menu toggle.
    const connectLinks = screen.getAllByRole("link", {
      name: "Connect your Stellar wallet",
    });
    for (const link of connectLinks) {
      expect(link).toHaveAttribute("href", "/connect-wallet");
    }
  });
});
