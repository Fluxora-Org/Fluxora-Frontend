/**
 * Tests for WalletStatus — issue #1696
 *
 * Acceptance criteria:
 * 1. The network is displayed wherever the account is.
 * 2. A non-default network is visually distinct.
 * 3. The display updates immediately on a network switch.
 * 4. It is available to assistive technology.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WalletStatus from "../WalletStatus";

const MOCK_ADDRESS = "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37";
const TRUNCATED = `${MOCK_ADDRESS.slice(0, 6)}...${MOCK_ADDRESS.slice(-4)}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderWalletStatus(network: string, onDisconnect = () => {}) {
  return render(
    <WalletStatus
      address={MOCK_ADDRESS}
      network={network}
      onDisconnect={onDisconnect}
    />,
  );
}

// ---------------------------------------------------------------------------
// AC1 — Network is displayed alongside the account
// ---------------------------------------------------------------------------

describe("AC1: network is displayed alongside the account", () => {
  it("shows 'Testnet' badge when network is TESTNET", () => {
    renderWalletStatus("TESTNET");
    expect(screen.getByText("Testnet")).toBeInTheDocument();
    // Wallet address also visible in the same component
    expect(screen.getByText(TRUNCATED)).toBeInTheDocument();
  });

  it("shows 'Mainnet' badge when network is PUBLIC", () => {
    renderWalletStatus("PUBLIC");
    expect(screen.getByText("Mainnet")).toBeInTheDocument();
    expect(screen.getByText(TRUNCATED)).toBeInTheDocument();
  });

  it("shows 'Wrong Network' badge when network is unrecognised", () => {
    renderWalletStatus("FUTURENET");
    expect(screen.getByText("Wrong Network")).toBeInTheDocument();
    expect(screen.getByText(TRUNCATED)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AC2 — Non-default network is visually distinct
// ---------------------------------------------------------------------------

describe("AC2: non-default network is visually distinct", () => {
  it("Testnet badge has amber colour classes (distinct from Mainnet)", () => {
    renderWalletStatus("TESTNET");
    const badge = screen.getByRole("status", { name: /active network: testnet/i });
    expect(badge.className).toMatch(/amber/);
    expect(badge.className).not.toMatch(/emerald/);
  });

  it("Mainnet badge has emerald colour classes", () => {
    renderWalletStatus("PUBLIC");
    const badge = screen.getByRole("status", { name: /active network: mainnet/i });
    expect(badge.className).toMatch(/emerald/);
    expect(badge.className).not.toMatch(/amber/);
  });

  it("Wrong Network badge has red colour classes", () => {
    renderWalletStatus("FUTURENET");
    const badge = screen.getByRole("status", { name: /active network: wrong network/i });
    expect(badge.className).toMatch(/red/);
  });
});

// ---------------------------------------------------------------------------
// AC3 — Display updates immediately on a network switch
// ---------------------------------------------------------------------------

describe("AC3: display updates immediately on a network switch", () => {
  it("re-renders with new network badge when network prop changes", () => {
    const { rerender } = renderWalletStatus("TESTNET");

    // Initially shows Testnet
    expect(screen.getByText("Testnet")).toBeInTheDocument();
    expect(screen.queryByText("Mainnet")).not.toBeInTheDocument();

    // Simulate network switch — parent passes new prop
    rerender(
      <WalletStatus
        address={MOCK_ADDRESS}
        network="PUBLIC"
        onDisconnect={() => {}}
      />,
    );

    expect(screen.getByText("Mainnet")).toBeInTheDocument();
    expect(screen.queryByText("Testnet")).not.toBeInTheDocument();
  });

  it("switches from Mainnet to Wrong Network when network becomes unsupported", () => {
    const { rerender } = renderWalletStatus("PUBLIC");

    expect(screen.getByText("Mainnet")).toBeInTheDocument();

    rerender(
      <WalletStatus
        address={MOCK_ADDRESS}
        network="FUTURENET"
        onDisconnect={() => {}}
      />,
    );

    expect(screen.getByText("Wrong Network")).toBeInTheDocument();
    expect(screen.queryByText("Mainnet")).not.toBeInTheDocument();
  });

  it("wallet button aria-label updates when network prop changes", () => {
    const { rerender } = renderWalletStatus("TESTNET");

    const btn = screen.getByRole("button", { name: /open wallet options/i });
    expect(btn).toHaveAttribute("aria-label", expect.stringContaining("Testnet"));

    rerender(
      <WalletStatus
        address={MOCK_ADDRESS}
        network="PUBLIC"
        onDisconnect={() => {}}
      />,
    );

    expect(btn).toHaveAttribute("aria-label", expect.stringContaining("Mainnet"));
  });
});

// ---------------------------------------------------------------------------
// AC4 — Available to assistive technology
// ---------------------------------------------------------------------------

describe("AC4: accessible to assistive technology", () => {
  it("network badge has role=status and an aria-label that names the active network for Testnet", () => {
    renderWalletStatus("TESTNET");
    const badge = screen.getByRole("status", { name: /active network: testnet/i });
    expect(badge).toBeInTheDocument();
  });

  it("network badge has role=status and an aria-label that names the active network for Mainnet", () => {
    renderWalletStatus("PUBLIC");
    const badge = screen.getByRole("status", { name: /active network: mainnet/i });
    expect(badge).toBeInTheDocument();
  });

  it("network badge has role=status and an aria-label that names the active network for Wrong Network", () => {
    renderWalletStatus("FUTURENET");
    const badge = screen.getByRole("status", {
      name: /active network: wrong network/i,
    });
    expect(badge).toBeInTheDocument();
  });

  it("wallet button aria-label includes both the truncated address AND the active network", () => {
    renderWalletStatus("TESTNET");
    const btn = screen.getByRole("button", { name: /open wallet options/i });
    const label = btn.getAttribute("aria-label") ?? "";
    expect(label).toContain(TRUNCATED);
    expect(label).toMatch(/testnet/i);
  });

  it("wallet button aria-label includes Mainnet when network is PUBLIC", () => {
    renderWalletStatus("PUBLIC");
    const btn = screen.getByRole("button", { name: /open wallet options/i });
    const label = btn.getAttribute("aria-label") ?? "";
    expect(label).toContain(TRUNCATED);
    expect(label).toMatch(/mainnet/i);
  });

  it("wallet button aria-label includes 'Wrong Network' when on an unsupported network", () => {
    renderWalletStatus("FUTURENET");
    const btn = screen.getByRole("button", { name: /open wallet options/i });
    const label = btn.getAttribute("aria-label") ?? "";
    expect(label).toContain(TRUNCATED);
    expect(label).toMatch(/wrong network/i);
  });

  it("colour-dot inside the network badge is hidden from assistive technology", () => {
    renderWalletStatus("TESTNET");
    const badge = screen.getByRole("status", { name: /active network: testnet/i });
    // The dot span inside should have aria-hidden
    const dot = badge.querySelector("span");
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });
});

// ---------------------------------------------------------------------------
// Interaction — dropdown opens and closes
// ---------------------------------------------------------------------------

describe("Wallet button dropdown interaction", () => {
  it("opens the dropdown when the button is clicked", async () => {
    const user = userEvent.setup();
    renderWalletStatus("TESTNET");

    const btn = screen.getByRole("button", { name: /open wallet options/i });
    expect(btn).toHaveAttribute("aria-expanded", "false");

    await user.click(btn);

    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Copy address")).toBeInTheDocument();
    expect(screen.getByText("Disconnect")).toBeInTheDocument();
  });

  it("closes the dropdown on Escape key", async () => {
    const user = userEvent.setup();
    renderWalletStatus("TESTNET");

    const btn = screen.getByRole("button", { name: /open wallet options/i });
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });
});
