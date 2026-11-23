/**
 * ConnectWalletModal — wallet icon accessible names in the selector.
 *
 * Validates the accessibility tree of the idle wallet list: every option is
 * uniquely named, and each WalletIcon exposes an accessible name that
 * identifies its wallet (decorative uses stay hidden).
 */
import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getNetwork: vi.fn(),
}));

vi.mock("../../lib/stellarNetwork", () => ({
  getExpectedStellarNetwork: () => "TESTNET",
  isStellarNetworkMismatch: vi.fn(
    (actual: string | null, expected: string) =>
      (actual ?? "").toUpperCase() !== expected.toUpperCase(),
  ),
}));

vi.mock("../../lib/config", () => ({
  getNetworkLabel: (n: string) =>
    n === "TESTNET" ? "Testnet" : n === "PUBLIC" ? "Mainnet" : n,
}));

vi.mock("../../lib/breakpoints", () => ({
  isMobileViewport: vi.fn(() => false),
  VIEWPORT_RESIZE_DEBOUNCE_MS: 150,
}));

vi.mock("../ConnectWalletModal.module.css", () => ({
  default: new Proxy({} as Record<string, string>, {
    get: (_t, k) => String(k),
  }),
}));

// Intentionally NOT mocking WalletIcon — we assert its accessible names.

import ConnectWalletModal from "../ConnectWalletModal";
import WalletIcon from "../WalletIcon";

const WALLET_NAMES = [
  "Freighter",
  "Albedo",
  "WalletConnect",
  "Hardware Wallet",
] as const;

function renderModal() {
  return render(
    <ConnectWalletModal
      isOpen={true}
      onClose={vi.fn()}
      showStateSwitcher={false}
    />,
  );
}

describe("ConnectWalletModal — wallet icon accessible names", () => {
  it("every wallet option in the selector has a unique accessible name", () => {
    renderModal();
    const list = screen.getByRole("list", { name: /wallet/i });
    const options = within(list).getAllByRole("listitem");
    expect(options.length).toBeGreaterThanOrEqual(WALLET_NAMES.length);

    const names = options.map((el) => el.getAttribute("aria-label") || el.textContent || "");
    expect(names.every((n) => n.trim().length > 0)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it("each wallet icon in the connection modal names its wallet", () => {
    renderModal();
    const list = screen.getByRole("list", { name: /wallet/i });

    for (const walletName of WALLET_NAMES) {
      // Image icons expose alt=<wallet>; broken/missing src falls back to role=img.
      const icon = within(list).getByRole("img", { name: walletName });
      expect(icon).toBeInTheDocument();
    }
  });

  it("decorative WalletIcon uses are hidden from the accessibility tree", () => {
    const { container } = render(<WalletIcon decorative name="Freighter" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
