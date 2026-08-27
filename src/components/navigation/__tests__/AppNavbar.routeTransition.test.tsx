/**
 * AppNavbar route-transition regression tests.
 *
 * Scope: the navbar must not let wallet/account *action* controls (disconnect,
 * copy address, explorer, workspace links) from a previous route context
 * remain invocable while a new route is settling.
 *
 * Design decision under test:
 *   While a route transition is settling (`routeTransitioning` lock is active):
 *     - Wallet *action* controls are locked (the WalletStatus trigger is
 *       disabled and any open menu is force-closed).
 *     - Wallet *identity* (network badge + address, including a wrong-network
 *       badge) stays visible.
 *     - Global controls remain available.
 *
 * Covers: rapid navigation, disconnect during transition, wrong network, and
 * back/forward restoration.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppNavbar from "../AppNavbar";
import { ThemeProvider } from "../../../theme/ThemeProvider";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../../voice/VoiceMicButton", () => ({
  VoiceMicButton: () => <div data-testid="mock-voice-mic" />,
}));

vi.mock("../../../hooks/useTickingNow", () => ({
  useTickingNow: () => "2026-07-27T12:00:00.000Z",
}));

const connectedWallet = {
  connected: true,
  address: "GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12",
  network: "TESTNET",
  expectedNetwork: "TESTNET",
  expectedNetworkLabel: "Testnet",
  isNetworkMismatch: false,
  disconnect: vi.fn(),
};

let walletOverrides: Partial<typeof connectedWallet> = {};

vi.mock("../../wallet-connect/Walletcontext", () => ({
  useWallet: () => ({ ...connectedWallet, ...walletOverrides }),
}));

let mockPathname = "/app";
vi.mock("react-router-dom", () => ({
  Link: ({
    children,
    to,
    ...props
  }: React.PropsWithChildren<{ to: string; [key: string]: unknown }>) => (
    <a href={String(to)} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: mockPathname }),
  useNavigate: () => vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  walletOverrides = {};
  mockPathname = "/app";
  connectedWallet.disconnect.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

const tree = (props: React.ComponentProps<typeof AppNavbar> = {}) => (
  <ThemeProvider>
    <AppNavbar {...props} />
  </ThemeProvider>
);

/** Mounts the navbar and flushes the initial connecting + transition timers. */
function mountNavbar(props: React.ComponentProps<typeof AppNavbar> = {}) {
  const result = render(tree(props));
  act(() => vi.runAllTimers());
  return result;
}

/** Simulates a route change WITHOUT letting the transition lock settle. */
function navigateTo(result: ReturnType<typeof mountNavbar>, pathname: string) {
  mockPathname = pathname;
  act(() => {
    result.rerender(tree());
  });
}

/** Lets the route-transition lock settle. */
function settle() {
  act(() => vi.runAllTimers());
}

function getWalletTrigger() {
  return screen.getByRole("button", { name: /open wallet options/i });
}

// ─── Rapid navigation ─────────────────────────────────────────────────────────

describe("rapid navigation keeps wallet actions locked until the route settles", () => {
  it("locks the wallet trigger during a single navigation and re-enables it after settling", () => {
    const result = mountNavbar();
    expect(getWalletTrigger()).toBeEnabled();

    navigateTo(result, "/app/streams");
    expect(getWalletTrigger()).toBeDisabled();

    settle();
    expect(getWalletTrigger()).toBeEnabled();
  });

  it("stays locked across multiple back-to-back navigations and only unlocks after the last one settles", () => {
    const result = mountNavbar();
    expect(getWalletTrigger()).toBeEnabled();

    for (const next of ["/app/streams", "/app/recipient", "/app/treasury"]) {
      navigateTo(result, next);
      // Each navigation re-arms the lock; the trigger must remain disabled
      // even as the route context changes rapidly.
      expect(getWalletTrigger()).toBeDisabled();
    }

    // Only after the last transition settles does the lock clear.
    settle();
    expect(getWalletTrigger()).toBeEnabled();

    // And no stale action menu from a previous context is left open.
    expect(screen.queryByRole("menuitem", { name: /^disconnect$/i })).not.toBeInTheDocument();
  });
});

// ─── Disconnect during transition ─────────────────────────────────────────────

describe("disconnect during a transition is blocked", () => {
  it("does not open the wallet menu and does not call disconnect while transitioning", () => {
    const result = mountNavbar();
    expect(getWalletTrigger()).toBeEnabled();

    navigateTo(result, "/app/streams");
    expect(getWalletTrigger()).toBeDisabled();

    // Attempting to interact with the locked trigger is a no-op.
    fireEvent.click(getWalletTrigger());
    expect(screen.queryByRole("menuitem", { name: /^disconnect$/i })).not.toBeInTheDocument();
    expect(connectedWallet.disconnect).not.toHaveBeenCalled();

    settle();
    expect(connectedWallet.disconnect).not.toHaveBeenCalled();
  });

  it("force-closes an already-open wallet menu when a navigation begins", () => {
    const result = mountNavbar();
    const trigger = getWalletTrigger();

    // Open the menu first.
    fireEvent.click(trigger);
    expect(screen.getByRole("menuitem", { name: /^disconnect$/i })).toBeInTheDocument();

    // Navigation begins — the lock must dismiss the menu so the previous
    // context's actions cannot be invoked against the new route.
    navigateTo(result, "/app/recipient");
    expect(getWalletTrigger()).toBeDisabled();
    expect(screen.queryByRole("menuitem", { name: /^disconnect$/i })).not.toBeInTheDocument();

    settle();
    expect(getWalletTrigger()).toBeEnabled();
  });
});

// ─── Wrong network ────────────────────────────────────────────────────────────

describe("wrong-network identity stays visible while actions are locked", () => {
  beforeEach(() => {
    walletOverrides = {
      network: "MAINNET",
      isNetworkMismatch: true,
      expectedNetwork: "TESTNET",
      expectedNetworkLabel: "Testnet",
    };
  });

  it("keeps the expected-network badge visible during the transition but locks actions", () => {
    const result = mountNavbar();
    // Identity is shown, badge reflects the mismatch.
    expect(screen.getByText(/expected testnet/i)).toBeInTheDocument();
    expect(getWalletTrigger()).toBeEnabled();

    navigateTo(result, "/app/streams");

    // Badge (identity) still present; actions (trigger) locked.
    expect(screen.getByText(/expected testnet/i)).toBeInTheDocument();
    expect(getWalletTrigger()).toBeDisabled();

    settle();
    expect(screen.getByText(/expected testnet/i)).toBeInTheDocument();
    expect(getWalletTrigger()).toBeEnabled();
  });
});

// ─── Back / forward restoration ───────────────────────────────────────────────

describe("back/forward restores the correct, unlocked controls", () => {
  it("re-arms the lock on back navigation but restores a working disconnect flow once settled", () => {
    const result = mountNavbar();
    expect(getWalletTrigger()).toBeEnabled();

    // Forward navigation.
    navigateTo(result, "/app/streams");
    expect(getWalletTrigger()).toBeDisabled();

    // Browser back.
    navigateTo(result, "/app");
    expect(getWalletTrigger()).toBeDisabled();

    // After settling, the controls are restored and fully functional.
    settle();
    const trigger = getWalletTrigger();
    expect(trigger).toBeEnabled();

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: /^disconnect$/i }));
    fireEvent.click(screen.getByRole("button", { name: /disconnect wallet/i }));

    expect(connectedWallet.disconnect).toHaveBeenCalledTimes(1);
  });
});

// ─── Global controls remain available during the transition ───────────────────

describe("global controls remain available during a transition", () => {
  it("keeps the easy-read font toggle enabled while the wallet actions are locked", () => {
    const result = mountNavbar();
    const fontToggle = screen.getByRole("button", { name: /toggle easy-read font/i });
    expect(fontToggle).toBeEnabled();

    navigateTo(result, "/app/streams");

    // Wallet actions locked...
    expect(getWalletTrigger()).toBeDisabled();
    // ...but global controls remain usable.
    expect(fontToggle).toBeEnabled();
    fireEvent.click(fontToggle);
    expect(fontToggle).toHaveAttribute("aria-pressed", "true");

    settle();
  });
});
