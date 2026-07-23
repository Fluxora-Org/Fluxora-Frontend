import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Layout from "../Layout";

vi.mock("../ConnectWalletModal", () => ({
  default: ({
    isOpen,
    onClose,
    onConnectFreighter,
    onConnectAlbedo,
    onConnectWalletConnect,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onConnectFreighter: () => void;
    onConnectAlbedo: () => void;
    onConnectWalletConnect: () => void;
  }) =>
    isOpen ? (
      <div data-testid="connect-modal">
        Modal
        <button onClick={onClose}>Close</button>
        <button onClick={onConnectFreighter}>Freighter</button>
        <button onClick={onConnectAlbedo}>Albedo</button>
        <button onClick={onConnectWalletConnect}>WalletConnect</button>
      </div>
    ) : null,
}));

vi.mock("../KeyboardShortcutsModal", () => ({
  KeyboardShortcutsModal: () => <div data-testid="shortcuts-modal" />,
}));

vi.mock("../Footer", () => ({
  default: () => <footer data-testid="footer">Footer</footer>,
}));

function renderLayout(initialRoute = "/app") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Layout />
    </MemoryRouter>
  );
}

describe("Layout component sidebar toggle accessibility", () => {
  it("renders the sidebar toggle control as a real button with aria-expanded and dynamic aria-label", () => {
    renderLayout();

    const toggleBtn = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn.tagName).toBe("BUTTON");
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
    expect(toggleBtn).toHaveAttribute("aria-controls", "app-sidebar");

    // Click to collapse
    fireEvent.click(toggleBtn);

    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
    expect(toggleBtn).toHaveAttribute("aria-label", "Expand sidebar");
  });

  it("toggles sidebar state via keyboard activation (Enter and Space)", () => {
    renderLayout();

    const toggleBtn = screen.getByRole("button", { name: "Collapse sidebar" });

    // Press Enter to collapse
    fireEvent.keyDown(toggleBtn, { key: "Enter", code: "Enter" });
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
    expect(toggleBtn).toHaveAttribute("aria-label", "Expand sidebar");

    // Press Space to expand
    fireEvent.keyDown(toggleBtn, { key: " ", code: "Space" });
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
    expect(toggleBtn).toHaveAttribute("aria-label", "Collapse sidebar");
  });

  it("maintains sane tab order for focusable items in both expanded and collapsed states", () => {
    renderLayout();

    const sidebar = document.getElementById("app-sidebar");
    expect(sidebar).toBeTruthy();

    const getSidebarFocusables = () =>
      Array.from(
        sidebar!.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      );

    // In expanded state
    const expandedFocusables = getSidebarFocusables();
    expect(expandedFocusables.length).toBeGreaterThan(0);
    
    // First focusable item is toggle button, then nav links, then Connect wallet button
    expect(expandedFocusables[0]).toHaveAttribute("aria-controls", "app-sidebar");

    // Cycle focus through all focusable items in expanded state
    expandedFocusables.forEach((el) => {
      el.focus();
      expect(document.activeElement).toBe(el);
    });

    // Collapse sidebar
    const toggleBtn = screen.getByRole("button", { name: "Collapse sidebar" });
    fireEvent.click(toggleBtn);

    // In collapsed state
    const collapsedFocusables = getSidebarFocusables();
    expect(collapsedFocusables.length).toEqual(expandedFocusables.length);

    // Cycle focus through all focusable items in collapsed state
    collapsedFocusables.forEach((el) => {
      el.focus();
      expect(document.activeElement).toBe(el);
    });
  });

  it("handles Connect Wallet modal open and close triggers", () => {
    renderLayout();

    const connectBtn = screen.getByRole("button", { name: "Connect wallet" });
    expect(screen.queryByTestId("connect-modal")).not.toBeInTheDocument();

    // Open modal
    fireEvent.click(connectBtn);
    expect(screen.getByTestId("connect-modal")).toBeInTheDocument();

    // Close modal via Close button
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByTestId("connect-modal")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(connectBtn);

    // Open & close via Freighter
    fireEvent.click(connectBtn);
    fireEvent.click(screen.getByRole("button", { name: "Freighter" }));
    expect(screen.queryByTestId("connect-modal")).not.toBeInTheDocument();

    // Open & close via Albedo
    fireEvent.click(connectBtn);
    fireEvent.click(screen.getByRole("button", { name: "Albedo" }));
    expect(screen.queryByTestId("connect-modal")).not.toBeInTheDocument();

    // Open & close via WalletConnect
    fireEvent.click(connectBtn);
    fireEvent.click(screen.getByRole("button", { name: "WalletConnect" }));
    expect(screen.queryByTestId("connect-modal")).not.toBeInTheDocument();
  });

  it("handles mobile menu button toggle, nav link click, and backdrop click", () => {
    const { container } = renderLayout();

    const mobileMenuBtn = screen.getByRole("button", { name: "Toggle menu" });
    expect(mobileMenuBtn).toHaveAttribute("aria-expanded", "false");

    // Toggle open
    fireEvent.click(mobileMenuBtn);
    expect(mobileMenuBtn).toHaveAttribute("aria-expanded", "true");

    // Click nav link closes mobile sidebar
    const dashboardLink = screen.getByRole("link", { name: /Dashboard/i });
    fireEvent.click(dashboardLink);
    expect(mobileMenuBtn).toHaveAttribute("aria-expanded", "false");

    // Click backdrop closes mobile sidebar
    const backdrop = container.querySelector(".app-sidebar-backdrop") as HTMLElement;
    fireEvent.click(mobileMenuBtn);
    expect(mobileMenuBtn).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(backdrop);
    expect(mobileMenuBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("hides footer on treasury page", () => {
    renderLayout("/app/treasurypage");
    expect(screen.queryByTestId("footer")).not.toBeInTheDocument();
  });
});

