/**
 * AppNavbar keyboard navigation regression tests
 *
 * Covers every keyboard edge case identified during the audit:
 *   A. Skip-link presence and target
 *   B. Focus order — skip-link is first; logo is second
 *   C. Anon hamburger opens/closes the mobile menu, aria-expanded stays in sync
 *   D. Escape key closes an open mobile menu
 *   E. App-view sidebar toggle attributes (aria-expanded, aria-controls)
 *   F. Desktop nav links carry correct aria-current and are Tab-reachable
 *   G. Easy-read font button exists exactly once per view; aria-pressed reflects state
 *   H. Connecting skeleton is announced as status role and suppresses action buttons
 *   I. CTA link "Connect Wallet" renders text (not hamburger icons) in anon view
 */

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppNavbar from "../AppNavbar";
import { ThemeProvider } from "../../../theme/ThemeProvider";

// ─── Shared mocks ─────────────────────────────────────────────────────────────

vi.mock("../../voice/VoiceMicButton", () => ({
  VoiceMicButton: () => <div data-testid="mock-voice-mic" />,
}));

vi.mock("../../../hooks/useTickingNow", () => ({
  useTickingNow: () => "2026-07-27T12:00:00.000Z",
}));

// Wallet mock — reset per describe block via walletOverrides
const defaultWallet = {
  connected: false,
  loading: false,
  address: undefined as string | undefined,
  network: undefined as string | undefined,
  expectedNetwork: "TESTNET",
  expectedNetworkLabel: "Testnet",
  isNetworkMismatch: false,
  disconnect: vi.fn(),
};

let walletOverrides: Partial<typeof defaultWallet> = {};

vi.mock("../../wallet-connect/Walletcontext", () => ({
  useWallet: () => ({ ...defaultWallet, ...walletOverrides }),
}));

// Router mock — pathname can be overridden per test
let mockPathname = "/";
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


// localStorage stub
beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  });
  vi.useFakeTimers();
  walletOverrides = {};
  mockPathname = "/";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** Renders AppNavbar wrapped in ThemeProvider and flushes the connecting timer. */
function renderNavbar(props: React.ComponentProps<typeof AppNavbar> = {}) {
  const result = render(
    <ThemeProvider>
      <AppNavbar {...props} />
    </ThemeProvider>,
  );
  act(() => vi.runAllTimers());
  return result;
}

// ─── A. Skip-link ──────────────────────────────────────────────────────────────

describe("A: Skip-link", () => {
  it("is present in the DOM as the first link in the header", () => {
    renderNavbar();
    const header = screen.getByRole("banner");
    const links = within(header).getAllByRole("link");
    expect(links[0]).toHaveTextContent(/skip to main content/i);
  });

  it("points to #main-content", () => {
    renderNavbar();
    const skip = screen.getByRole("link", { name: /skip to main content/i });
    expect(skip).toHaveAttribute("href", "#main-content");
  });

  it("is visually hidden by default (sr-only class)", () => {
    renderNavbar();
    const skip = screen.getByRole("link", { name: /skip to main content/i });
    // sr-only is Tailwind's screen-reader-only utility — confirm the class is present
    expect(skip.className).toMatch(/sr-only/);
  });
});

// ─── B. Focus order ────────────────────────────────────────────────────────────

describe("B: Focus order — skip-link precedes all other focusable elements", () => {
  it("skip-link appears before the logo in DOM order (anon view)", () => {
    renderNavbar();
    const header = screen.getByRole("banner");
    const allLinks = within(header).getAllByRole("link");
    const skipIdx = allLinks.findIndex((el) =>
      /skip to main content/i.test(el.textContent ?? ""),
    );
    const logoIdx = allLinks.findIndex((el) =>
      /fluxora home/i.test(el.getAttribute("aria-label") ?? ""),
    );
    expect(skipIdx).toBeLessThan(logoIdx);
  });

  it("logo link has a descriptive aria-label in anon view", () => {
    renderNavbar();
    expect(
      screen.getByRole("link", { name: /fluxora home/i }),
    ).toBeInTheDocument();
  });

  it("logo link has a descriptive aria-label in app (connected) view", () => {
    walletOverrides = { connected: true, address: "GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12", network: "TESTNET" };
    mockPathname = "/app";
    renderNavbar();
    expect(
      screen.getByRole("link", { name: /fluxora home/i }),
    ).toBeInTheDocument();
  });
});

// ─── C. Anon hamburger (marketing mobile menu) ────────────────────────────────

describe("C: Anon hamburger opens and closes the mobile menu", () => {
  it("renders a hamburger button in anon view on mobile", () => {
    renderNavbar();
    // The button is md:hidden so it's always in the DOM; visibility is CSS-only
    expect(
      screen.getByRole("button", { name: /open navigation menu/i }),
    ).toBeInTheDocument();
  });

  it("aria-expanded starts as false", () => {
    renderNavbar();
    const btn = screen.getByRole("button", { name: /open navigation menu/i });
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("aria-expanded becomes true after one click", () => {
    renderNavbar();
    const btn = screen.getByRole("button", { name: /open navigation menu/i });
    fireEvent.click(btn);
    expect(
      screen.getByRole("button", { name: /close navigation menu/i }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("mobile menu renders nav links when open", () => {
    renderNavbar();
    fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));
    // Both the always-visible desktop <nav> and the mobile dropdown share the same
    // aria-label; query by id to target only the dropdown.
    const mobileNav = document.getElementById("mobile-nav")!;
    expect(mobileNav).toBeInTheDocument();
    expect(within(mobileNav).getByRole("link", { name: /features/i })).toBeInTheDocument();
    expect(within(mobileNav).getByRole("link", { name: /docs/i })).toBeInTheDocument();
    expect(within(mobileNav).getByRole("link", { name: /pricing/i })).toBeInTheDocument();
  });

  it("clicking a nav link closes the mobile menu", () => {
    renderNavbar();
    fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));
    const mobileNav = document.getElementById("mobile-nav")!;
    fireEvent.click(within(mobileNav).getByRole("link", { name: /features/i }));
    expect(document.getElementById("mobile-nav")).not.toBeInTheDocument();
  });

  it("aria-controls points to the mobile nav element id", () => {
    renderNavbar();
    const btn = screen.getByRole("button", { name: /open navigation menu/i });
    expect(btn).toHaveAttribute("aria-controls", "mobile-nav");
    fireEvent.click(btn);
    expect(document.getElementById("mobile-nav")).toBeInTheDocument();
  });

  it("does NOT render a separate anon hamburger in app (connected) view", () => {
    walletOverrides = { connected: true, address: "GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12", network: "TESTNET" };
    mockPathname = "/app";
    renderNavbar();
    // In app view only the sidebar toggle exists — no anon hamburger
    expect(
      screen.queryByRole("button", { name: /open navigation menu/i }),
    ).not.toBeInTheDocument();
  });
});

// ─── D. Escape key closes open mobile menu ────────────────────────────────────

describe("D: Escape key closes an open mobile menu", () => {
  it("Escape while menu is open sets mobileMenuOpen to false", () => {
    renderNavbar();
    const header = screen.getByRole("banner");
    fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));
    expect(document.getElementById("mobile-nav")).toBeInTheDocument();

    fireEvent.keyDown(header, { key: "Escape", code: "Escape" });
    expect(document.getElementById("mobile-nav")).not.toBeInTheDocument();
  });

  it("Escape while menu is already closed is a no-op (no error)", () => {
    renderNavbar();
    const header = screen.getByRole("banner");
    // menu is already closed — Escape must not throw
    expect(() => {
      fireEvent.keyDown(header, { key: "Escape", code: "Escape" });
    }).not.toThrow();
    expect(document.getElementById("mobile-nav")).not.toBeInTheDocument();
  });

  it("hamburger button reflects closed state after Escape", () => {
    renderNavbar();
    const header = screen.getByRole("banner");
    fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));
    fireEvent.keyDown(header, { key: "Escape", code: "Escape" });
    const btn = screen.getByRole("button", { name: /open navigation menu/i });
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });
});

// ─── E. App-view sidebar toggle ───────────────────────────────────────────────

describe("E: App-view sidebar toggle (md:hidden)", () => {
  const connectedState = {
    connected: true,
    address: "GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12",
    network: "TESTNET",
  };

  it("renders the sidebar toggle in app view", () => {
    walletOverrides = connectedState;
    mockPathname = "/app";
    renderNavbar({ onSidebarToggle: vi.fn(), isSidebarOpen: false });
    expect(
      screen.getByRole("button", { name: /open navigation sidebar/i }),
    ).toBeInTheDocument();
  });

  it("aria-expanded reflects isSidebarOpen=false", () => {
    walletOverrides = connectedState;
    mockPathname = "/app";
    renderNavbar({ onSidebarToggle: vi.fn(), isSidebarOpen: false });
    expect(
      screen.getByRole("button", { name: /open navigation sidebar/i }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("aria-expanded reflects isSidebarOpen=true", () => {
    walletOverrides = connectedState;
    mockPathname = "/app";
    renderNavbar({ onSidebarToggle: vi.fn(), isSidebarOpen: true });
    expect(
      screen.getByRole("button", { name: /close navigation sidebar/i }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("aria-controls points to app-sidebar", () => {
    walletOverrides = connectedState;
    mockPathname = "/app";
    renderNavbar({ onSidebarToggle: vi.fn(), isSidebarOpen: false });
    expect(
      screen.getByRole("button", { name: /open navigation sidebar/i }),
    ).toHaveAttribute("aria-controls", "app-sidebar");
  });

  it("calls onSidebarToggle when the sidebar button is clicked", () => {
    walletOverrides = connectedState;
    mockPathname = "/app";
    const onSidebarToggle = vi.fn();
    renderNavbar({ onSidebarToggle, isSidebarOpen: false });
    fireEvent.click(screen.getByRole("button", { name: /open navigation sidebar/i }));
    expect(onSidebarToggle).toHaveBeenCalledTimes(1);
  });

  it("does NOT render the sidebar toggle in anon view", () => {
    renderNavbar({ onSidebarToggle: vi.fn(), isSidebarOpen: false });
    expect(
      screen.queryByRole("button", { name: /navigation sidebar/i }),
    ).not.toBeInTheDocument();
  });
});

// ─── F. Desktop nav links (aria-current + Tab reachability) ──────────────────

describe("F: Desktop nav links", () => {
  it("anon view renders marketing links (Features, Docs, Pricing) in the desktop nav", () => {
    renderNavbar();
    const desktopNav = screen.getByRole("navigation", {
      name: /marketing navigation/i,
    });
    expect(within(desktopNav).getByRole("link", { name: /^features$/i })).toBeInTheDocument();
    expect(within(desktopNav).getByRole("link", { name: /^docs$/i })).toBeInTheDocument();
    expect(within(desktopNav).getByRole("link", { name: /^pricing$/i })).toBeInTheDocument();
  });

  it("app view renders app links (Dashboard, Streams, Recipient) in the desktop nav", () => {
    walletOverrides = { connected: true, address: "GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12", network: "TESTNET" };
    mockPathname = "/app";
    renderNavbar();
    const desktopNav = screen.getByRole("navigation", { name: /app navigation/i });
    expect(within(desktopNav).getByRole("link", { name: /^dashboard$/i })).toBeInTheDocument();
    expect(within(desktopNav).getByRole("link", { name: /^streams$/i })).toBeInTheDocument();
    expect(within(desktopNav).getByRole("link", { name: /^recipient$/i })).toBeInTheDocument();
  });

  it("the active app route link carries aria-current=page (Streams route)", () => {
    walletOverrides = { connected: true, address: "GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12", network: "TESTNET" };
    mockPathname = "/app/streams";
    renderNavbar();
    const desktopNav = screen.getByRole("navigation", { name: /app navigation/i });
    expect(
      within(desktopNav).getByRole("link", { name: /^streams$/i }),
    ).toHaveAttribute("aria-current", "page");
    // Recipient should NOT be active on /app/streams
    expect(
      within(desktopNav).getByRole("link", { name: /^recipient$/i }),
    ).not.toHaveAttribute("aria-current");
  });

  it("Dashboard link carries aria-current=page on exactly /app", () => {
    walletOverrides = { connected: true, address: "GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12", network: "TESTNET" };
    mockPathname = "/app";
    renderNavbar();
    const desktopNav = screen.getByRole("navigation", { name: /app navigation/i });
    expect(
      within(desktopNav).getByRole("link", { name: /^dashboard$/i }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("all desktop nav links are Tab-reachable (no tabIndex -1)", () => {
    walletOverrides = { connected: true, address: "GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12", network: "TESTNET" };
    mockPathname = "/app";
    renderNavbar();
    const desktopNav = screen.getByRole("navigation", { name: /app navigation/i });
    within(desktopNav).getAllByRole("link").forEach((link) => {
      expect(link).not.toHaveAttribute("tabindex", "-1");
    });
  });
});

// ─── G. Easy-read font toggle ─────────────────────────────────────────────────

describe("G: Easy-read font toggle", () => {
  it("exactly one font toggle button is in the document in anon view", () => {
    renderNavbar();
    // The desktop-only button is hidden with CSS but still in the DOM.
    // The outer duplicate must have been removed, leaving only the one inside md:flex.
    const toggles = screen.getAllByRole("button", {
      name: /toggle easy-read font/i,
    });
    expect(toggles).toHaveLength(1);
  });

  it("exactly one font toggle button is in the document in app (connected) view", () => {
    walletOverrides = { connected: true, address: "GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12", network: "TESTNET" };
    mockPathname = "/app";
    renderNavbar();
    const toggles = screen.getAllByRole("button", {
      name: /toggle easy-read font/i,
    });
    expect(toggles).toHaveLength(1);
  });

  it("aria-pressed starts as false", () => {
    renderNavbar();
    const btn = screen.getByRole("button", { name: /toggle easy-read font/i });
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("aria-pressed becomes true after one click", () => {
    renderNavbar();
    const btn = screen.getByRole("button", { name: /toggle easy-read font/i });
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("aria-pressed returns to false after two clicks", () => {
    renderNavbar();
    const btn = screen.getByRole("button", { name: /toggle easy-read font/i });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("mobile menu also contains a font toggle in anon view when open", () => {
    renderNavbar();
    fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));
    const mobileNav = document.getElementById("mobile-nav")!;
    expect(mobileNav).toBeInTheDocument();
    expect(
      within(mobileNav).getAllByRole("button", { name: /toggle easy-read font|easy-read/i }).length,
    ).toBeGreaterThanOrEqual(1);
  });
});

// ─── H. Connecting skeleton ───────────────────────────────────────────────────

describe("H: Connecting skeleton (wallet session restore)", () => {
  it("shows a 'Connecting wallet…' status region while connecting", () => {
    // Set loading to true to trigger the skeleton
    walletOverrides = { loading: true };
    // Do NOT flush timers — check the interim state
    render(
      <ThemeProvider>
        <AppNavbar />
      </ThemeProvider>,
    );
    // The skeleton should be present before timers fire
    const status = screen.getAllByRole("status");
    expect(status.some((el) => /connecting wallet/i.test(el.getAttribute("aria-label") ?? ""))).toBe(true);
  });

  it("hides the skeleton and shows the CTA after the timer resolves (anon)", () => {
    walletOverrides = { loading: false };
    renderNavbar(); // flushes timers
    expect(
      screen.queryByRole("status", { name: /connecting wallet/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /connect your stellar wallet/i }),
    ).toBeInTheDocument();
  });

  it("hides the skeleton and shows WalletStatus after the timer resolves (connected)", () => {
    walletOverrides = {
      loading: false,
      connected: true,
      address: "GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12",
      network: "TESTNET",
    };
    mockPathname = "/app";
    renderNavbar(); // flushes timers
    expect(
      screen.queryByRole("status", { name: /connecting wallet/i }),
    ).not.toBeInTheDocument();
    // WalletStatus renders a wallet trigger button
    expect(
      screen.getByRole("button", { name: /open wallet options/i }),
    ).toBeInTheDocument();
  });
});

// ─── I. CTA link content ──────────────────────────────────────────────────────

describe("I: Connect-wallet CTA renders text, not icons", () => {
  it("CTA link text is 'Connect Wallet', not empty or icon-only", () => {
    renderNavbar();
    const cta = screen.getByRole("link", { name: /connect your stellar wallet/i });
    // The textContent must include the label text, confirming no icon-only render
    expect(cta.textContent?.trim()).toBe("Connect Wallet");
  });

  it("CTA link navigates to /connect-wallet", () => {
    renderNavbar();
    const cta = screen.getByRole("link", { name: /connect your stellar wallet/i });
    expect(cta).toHaveAttribute("href", "/connect-wallet");
  });

  it("CTA link is focusable (no tabIndex -1)", () => {
    renderNavbar();
    const cta = screen.getByRole("link", { name: /connect your stellar wallet/i });
    expect(cta).not.toHaveAttribute("tabindex", "-1");
  });
});

// ─── J: Focus restoration on mobile-menu close ────────────────────────────────
// A disclosure widget (the hamburger menu) must return focus to the control
// that opened it whenever it closes via keyboard or link activation —
// otherwise a keyboard user's focus silently falls back to <body> and their
// place in the page is lost.

describe("J: Focus restoration on mobile-menu close", () => {
  it("Escape returns focus to the hamburger button", () => {
    renderNavbar();
    const header = screen.getByRole("banner");
    const openBtn = screen.getByRole("button", { name: /open navigation menu/i });
    fireEvent.click(openBtn);
    expect(document.getElementById("mobile-nav")).toBeInTheDocument();

    fireEvent.keyDown(header, { key: "Escape", code: "Escape" });

    const closedBtn = screen.getByRole("button", { name: /open navigation menu/i });
    expect(document.activeElement).toBe(closedBtn);
  });

  it("activating a link inside the mobile menu returns focus to the hamburger button", () => {
    renderNavbar();
    fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));
    const mobileNav = document.getElementById("mobile-nav")!;
    fireEvent.click(within(mobileNav).getByRole("link", { name: /features/i }));

    expect(document.getElementById("mobile-nav")).not.toBeInTheDocument();
    const reopenedBtn = screen.getByRole("button", { name: /open navigation menu/i });
    expect(document.activeElement).toBe(reopenedBtn);
  });

  it("activating the Connect Wallet CTA inside the mobile menu returns focus to the hamburger button", () => {
    renderNavbar();
    fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));
    const mobileNav = document.getElementById("mobile-nav")!;
    fireEvent.click(within(mobileNav).getByRole("link", { name: /connect your stellar wallet/i }));

    expect(document.getElementById("mobile-nav")).not.toBeInTheDocument();
    const reopenedBtn = screen.getByRole("button", { name: /open navigation menu/i });
    expect(document.activeElement).toBe(reopenedBtn);
  });
});

// ─── K: Route-change auto-closes the mobile menu ──────────────────────────────
// The menu must close deterministically on any navigation, not only when the
// close handler happens to run first (e.g. browser back/forward or a
// programmatic redirect that bypasses the in-menu link's onClick).

describe("K: Route change closes an open mobile menu", () => {
  it("mobile menu unmounts when the pathname changes while it is open", () => {
    mockPathname = "/";
    const { rerender } = renderNavbar();
    fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));
    expect(document.getElementById("mobile-nav")).toBeInTheDocument();

    mockPathname = "/#pricing";
    act(() => {
      rerender(
        <ThemeProvider>
          <AppNavbar />
        </ThemeProvider>,
      );
    });

    expect(document.getElementById("mobile-nav")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open navigation menu/i }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("mounting on a fresh pathname does not throw and starts with the menu closed", () => {
    mockPathname = "/#docs";
    renderNavbar();
    expect(document.getElementById("mobile-nav")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open navigation menu/i }),
    ).toHaveAttribute("aria-expanded", "false");
  });
});
