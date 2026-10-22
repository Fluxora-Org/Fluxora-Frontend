import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Navbar from "./Navbar";
import { BREAKPOINT_MD } from "../lib/breakpoints";

/**
 * Issue #1973 — "Make Navbar keyboard and screen-reader accessible".
 *
 * Acceptance criteria:
 *  1. Every interactive element is reachable by Tab in a sensible order.
 *  2. Focus is visible at each stop.
 *  3. Controls expose an accessible name.
 *  4. Any state change that matters is announced.
 */

// Wallet mock
const walletState = vi.hoisted(() => ({
  address: null as string | null,
  network: null as string | null,
  connected: false,
  loading: false,
  error: null as { type: string } | null,
  expectedNetwork: "TESTNET",
  expectedNetworkLabel: "Testnet",
  isNetworkMismatch: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock("./wallet-connect/Walletcontext", () => ({
  useWallet: () => walletState,
}));

let currentViewportWidth = BREAKPOINT_MD;

function setViewportWidth(width: number) {
  currentViewportWidth = width;
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    get: () => currentViewportWidth,
  });
}

function renderNavbar(initialEntry = "/", props: React.ComponentProps<typeof Navbar> = {}) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Navbar {...props} />
    </MemoryRouter>,
  );
}

function injectedStylesheet(): string {
  const style = document.getElementById("navbar-animation-styles");
  expect(style, "navbar must inject its stylesheet").not.toBeNull();
  return style?.textContent ?? "";
}

describe("Navbar keyboard and screen-reader accessibility (issue #1973)", () => {
  beforeEach(() => {
    setViewportWidth(BREAKPOINT_MD);
    Object.assign(walletState, {
      address: null,
      network: null,
      connected: false,
      loading: false,
      error: null,
      expectedNetwork: "TESTNET",
      expectedNetworkLabel: "Testnet",
      isNetworkMismatch: false,
    });
  });



  // ───────────────────────────────────────────────────────────────────────────
  // Criterion 1: Every interactive element is reachable by Tab in sensible order
  // ───────────────────────────────────────────────────────────────────────────
  describe("Criterion 1 — Reachable by Tab in sensible order", () => {
    it("tabs through all interactive elements in sensible order on desktop", async () => {
      const user = userEvent.setup();
      renderNavbar("/");

      const logoLink = screen.getByRole("link", { name: "Fluxora home" });
      const productLink = screen.getByRole("link", { name: "Product" });
      const docsLink = screen.getByRole("link", { name: "Documentation" });
      const pricingLink = screen.getByRole("link", { name: "Pricing" });
      const themeToggle = screen.getByRole("button", { name: /switch to dark mode/i });
      const walletBtn = screen.getByRole("button", { name: /connect wallet/i });

      // Tab 1: Logo Link
      await user.tab();
      expect(logoLink).toHaveFocus();

      // Tab 2: Product Link
      await user.tab();
      expect(productLink).toHaveFocus();

      // Tab 3: Documentation Link
      await user.tab();
      expect(docsLink).toHaveFocus();

      // Tab 4: Pricing Link
      await user.tab();
      expect(pricingLink).toHaveFocus();

      // Tab 5: Theme Toggle
      await user.tab();
      expect(themeToggle).toHaveFocus();

      // Tab 6: Connect Wallet
      await user.tab();
      expect(walletBtn).toHaveFocus();

      // Shift+Tab back in reverse order
      await user.tab({ shift: true });
      expect(themeToggle).toHaveFocus();

      await user.tab({ shift: true });
      expect(pricingLink).toHaveFocus();

      await user.tab({ shift: true });
      expect(docsLink).toHaveFocus();

      await user.tab({ shift: true });
      expect(productLink).toHaveFocus();

      await user.tab({ shift: true });
      expect(logoLink).toHaveFocus();
    });

    it("skips non-interactive dashboard indicator on treasury route in Tab sequence", async () => {
      const user = userEvent.setup();
      renderNavbar("/app/treasurypage");

      const logoLink = screen.getByRole("link", { name: "Fluxora home" });
      const themeToggle = screen.getByRole("button", { name: /switch to dark mode/i });
      const walletBtn = screen.getByRole("button", { name: /connect wallet/i });

      await user.tab();
      expect(logoLink).toHaveFocus();

      // Next tab lands directly on theme toggle since Dashboard text is non-interactive
      await user.tab();
      expect(themeToggle).toHaveFocus();

      await user.tab();
      expect(walletBtn).toHaveFocus();
    });

    it("on mobile (collapsed), only logo and hamburger are Tab-reachable", async () => {
      setViewportWidth(BREAKPOINT_MD - 1);
      const user = userEvent.setup();
      renderNavbar("/");

      const logoLink = screen.getByRole("link", { name: "Fluxora home" });
      const hamburger = screen.getByRole("button", { name: "Toggle navigation menu" });

      await user.tab();
      expect(logoLink).toHaveFocus();

      await user.tab();
      expect(hamburger).toHaveFocus();

      // Collapsed navigation links and desktop actions are hidden and not reachable
      await user.tab();
      expect(document.body).toHaveFocus();
    });

    it("on mobile (expanded), tabs through logo, hamburger, links, and mobile actions", async () => {
      setViewportWidth(BREAKPOINT_MD - 1);
      const user = userEvent.setup();
      renderNavbar("/");

      const logoLink = screen.getByRole("link", { name: "Fluxora home" });
      const hamburger = screen.getByRole("button", { name: "Toggle navigation menu" });

      // Open mobile menu via keyboard activation
      await user.tab();
      await user.tab();
      expect(hamburger).toHaveFocus();
      await user.keyboard("{Enter}");

      expect(hamburger).toHaveAttribute("aria-expanded", "true");

      // Tab through mobile menu items
      await user.tab();
      expect(screen.getByRole("link", { name: "Product" })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole("link", { name: "Documentation" })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole("link", { name: "Pricing" })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole("button", { name: /switch to dark mode/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole("button", { name: /connect wallet/i })).toHaveFocus();
    });

    it("closes open mobile menu when Escape key is pressed", async () => {
      setViewportWidth(BREAKPOINT_MD - 1);
      const user = userEvent.setup();
      renderNavbar("/");

      const hamburger = screen.getByRole("button", { name: "Toggle navigation menu" });
      await user.click(hamburger);
      expect(hamburger).toHaveAttribute("aria-expanded", "true");

      // Press Escape
      await user.keyboard("{Escape}");
      expect(hamburger).toHaveAttribute("aria-expanded", "false");
    });

    it("activates hamburger with Space key and closes with Escape", async () => {
      setViewportWidth(BREAKPOINT_MD - 1);
      const user = userEvent.setup();
      renderNavbar("/");

      const hamburger = screen.getByRole("button", { name: "Toggle navigation menu" });
      hamburger.focus();
      await user.keyboard(" ");
      expect(hamburger).toHaveAttribute("aria-expanded", "true");

      await user.keyboard("{Escape}");
      expect(hamburger).toHaveAttribute("aria-expanded", "false");
    });

    it("closes mobile menu when navigating by clicking a link", async () => {
      setViewportWidth(BREAKPOINT_MD - 1);
      const user = userEvent.setup();
      renderNavbar("/");

      const hamburger = screen.getByRole("button", { name: "Toggle navigation menu" });
      await user.click(hamburger);
      expect(hamburger).toHaveAttribute("aria-expanded", "true");

      const pricingLink = screen.getByRole("link", { name: "Pricing" });
      await user.click(pricingLink);
      expect(hamburger).toHaveAttribute("aria-expanded", "false");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Criterion 2: Focus is visible at each stop
  // ───────────────────────────────────────────────────────────────────────────
  describe("Criterion 2 — Focus is visible at each stop", () => {
    it("injects focus-visible stylesheet rules for navigation links and buttons", () => {
      renderNavbar("/");

      const css = injectedStylesheet();

      // Must include focus-visible rules for anchors and buttons
      expect(css).toMatch(/nav\s+a:focus-visible/);
      expect(css).toMatch(/nav\s+button:focus-visible/);

      // Must specify visible outline
      expect(css).toMatch(/outline:\s*2px\s+solid/);
      expect(css).toMatch(/outline-offset:\s*2px/);
    });

    it("suppresses focus ring for pointer clicks with :not(:focus-visible)", () => {
      renderNavbar("/");

      const css = injectedStylesheet();
      expect(css).toMatch(/nav\s+a:not\(:focus-visible\):focus/);
      expect(css).toMatch(/nav\s+button:not\(:focus-visible\):focus/);
    });

    it("interactive elements do not have inline outline: none suppressing focus rings", () => {
      setViewportWidth(BREAKPOINT_MD - 1);
      renderNavbar("/");

      const logoLink = screen.getByRole("link", { name: "Fluxora home" });
      const hamburger = screen.getByRole("button", { name: "Toggle navigation menu" });

      expect(logoLink.style.outline).not.toBe("none");
      expect(hamburger.style.outline).not.toBe("none");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Criterion 3: Controls expose an accessible name
  // ───────────────────────────────────────────────────────────────────────────
  describe("Criterion 3 — Controls expose an accessible name", () => {
    it("exposes accessible name for the brand logo link", () => {
      renderNavbar("/");

      const logo = screen.getByRole("link", { name: "Fluxora home" });
      expect(logo).toHaveAccessibleName("Fluxora home");
    });

    it("exposes accessible name for each primary navigation entry", () => {
      renderNavbar("/");

      expect(screen.getByRole("link", { name: "Product" })).toHaveAccessibleName("Product");
      expect(screen.getByRole("link", { name: "Documentation" })).toHaveAccessibleName("Documentation");
      expect(screen.getByRole("link", { name: "Pricing" })).toHaveAccessibleName("Pricing");
    });

    it("exposes accessible name for the hamburger toggle and associates it via aria-controls", () => {
      setViewportWidth(BREAKPOINT_MD - 1);
      renderNavbar("/");

      const hamburger = screen.getByRole("button", { name: "Toggle navigation menu" });
      expect(hamburger).toHaveAccessibleName("Toggle navigation menu");
      expect(hamburger).toHaveAttribute("aria-controls", "navbar-mobile-menu");

      const menu = document.getElementById("navbar-mobile-menu");
      expect(menu).toBeInTheDocument();
    });

    it("exposes accessible name for theme toggle indicating target action", () => {
      const { rerender } = renderNavbar("/", { theme: "light" });

      const lightButton = screen.getByRole("button", { name: "Switch to dark mode" });
      expect(lightButton).toHaveAccessibleName("Switch to dark mode");

      rerender(
        <MemoryRouter initialEntries={["/"]}>
          <Navbar theme="dark" />
        </MemoryRouter>,
      );

      const darkButton = screen.getByRole("button", { name: "Switch to light mode" });
      expect(darkButton).toHaveAccessibleName("Switch to light mode");
    });

    it("exposes accessible name for wallet button in idle and connected states", () => {
      // Idle state
      const { rerender } = renderNavbar("/");
      expect(screen.getByRole("button", { name: "Connect wallet" })).toHaveAccessibleName("Connect wallet");

      // Connected state
      walletState.connected = true;
      walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
      walletState.network = "TESTNET";

      rerender(
        <MemoryRouter initialEntries={["/"]}>
          <Navbar />
        </MemoryRouter>,
      );

      expect(screen.getByText("GATDOS...LOWN")).toBeInTheDocument();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Criterion 4: Any state change that matters is announced
  // ───────────────────────────────────────────────────────────────────────────
  describe("Criterion 4 — Any state change that matters is announced", () => {
    it("renders a polite live region for screen-reader announcements", () => {
      renderNavbar("/");

      const liveRegion = screen.getByTestId("navbar-live-region");
      expect(liveRegion).toHaveAttribute("role", "status");
      expect(liveRegion).toHaveAttribute("aria-live", "polite");
      expect(liveRegion).toHaveAttribute("aria-atomic", "true");
    });

    it("announces mobile menu open and close transitions", async () => {
      setViewportWidth(BREAKPOINT_MD - 1);
      const user = userEvent.setup();
      renderNavbar("/");

      const hamburger = screen.getByRole("button", { name: "Toggle navigation menu" });
      const liveRegion = screen.getByTestId("navbar-live-region");

      // Open menu
      await user.click(hamburger);
      expect(hamburger).toHaveAttribute("aria-expanded", "true");
      expect(liveRegion).toHaveTextContent("Navigation menu opened");

      // Close menu
      await user.click(hamburger);
      expect(hamburger).toHaveAttribute("aria-expanded", "false");
      expect(liveRegion).toHaveTextContent("Navigation menu closed");
    });

    it("announces theme mode switches", () => {
      const { rerender } = renderNavbar("/", { theme: "light" });
      const liveRegion = screen.getByTestId("navbar-live-region");

      rerender(
        <MemoryRouter initialEntries={["/"]}>
          <Navbar theme="dark" />
        </MemoryRouter>,
      );

      expect(liveRegion).toHaveTextContent("Theme switched to dark mode");

      rerender(
        <MemoryRouter initialEntries={["/"]}>
          <Navbar theme="light" />
        </MemoryRouter>,
      );

      expect(liveRegion).toHaveTextContent("Theme switched to light mode");
    });

    it("announces active route via aria-current='page'", () => {
      function RouteHarness({ initialRoute = "/" }: { initialRoute?: string }) {
        const navigate = useNavigate();
        return (
          <>
            <Navbar />
            <button onClick={() => navigate("/#pricing")} type="button">
              go to pricing
            </button>
          </>
        );
      }

      render(
        <MemoryRouter initialEntries={["/"]}>
          <RouteHarness />
        </MemoryRouter>,
      );

      const product = screen.getByRole("link", { name: "Product" });
      expect(product).toHaveAttribute("aria-current", "page");

      const pricing = screen.getByRole("link", { name: "Pricing" });
      expect(pricing).not.toHaveAttribute("aria-current");

      fireEvent.click(screen.getByRole("button", { name: "go to pricing" }));

      expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("aria-current", "page");
      expect(screen.getByRole("link", { name: "Product" })).not.toHaveAttribute("aria-current");
    });
  });
});
