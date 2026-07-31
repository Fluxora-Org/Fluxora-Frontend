import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WalletStatus from "../WalletStatus";

describe("WalletStatus network badge", () => {
  const mockAddress = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";

  it("shows Testnet badge when network is TESTNET", () => {
    render(
      <WalletStatus
        address={mockAddress}
        network="TESTNET"
        onDisconnect={() => {}}
      />
    );

    const badge = screen.getByRole("status", { name: /network: testnet/i });
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Testnet");
  });

  it("shows Mainnet badge when network is MAINNET", () => {
    render(
      <WalletStatus
        address={mockAddress}
        network="MAINNET"
        expectedNetwork="MAINNET"
        isNetworkMismatch={false}
        onDisconnect={() => {}}
      />
    );

    const badge = screen.getByRole("status", { name: /network: mainnet/i });
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Mainnet");
  });

  it("has sr-only explanation text for Testnet", () => {
    render(
      <WalletStatus
        address={mockAddress}
        network="TESTNET"
        onDisconnect={() => {}}
      />
    );

    const srText = screen.getByText(/Stellar test network/i);
    expect(srText).toBeInTheDocument();
    expect(srText).toHaveClass("sr-only");
  });

  it("has sr-only explanation text for Mainnet", () => {
    render(
      <WalletStatus
        address={mockAddress}
        network="MAINNET"
        expectedNetwork="MAINNET"
        isNetworkMismatch={false}
        onDisconnect={() => {}}
      />
    );

    const srText = screen.getByText(/Stellar mainnet/i);
    expect(srText).toBeInTheDocument();
    expect(srText).toHaveClass("sr-only");
  });

  it("shows tooltip on focus of the network badge", async () => {
    const user = userEvent.setup();

    render(
      <WalletStatus
        address={mockAddress}
        network="TESTNET"
        onDisconnect={() => {}}
      />
    );

    const badge = screen.getByRole("status", { name: /network: testnet/i });
    await user.click(badge);

    // Tooltip should appear
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent(/Stellar test network/i);
  });

  it("hides tooltip on blur", async () => {
    const user = userEvent.setup();

    render(
      <WalletStatus
        address={mockAddress}
        network="TESTNET"
        onDisconnect={() => {}}
      />
    );

    const badge = screen.getByRole("status", { name: /network: testnet/i });
    await user.click(badge);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    // Click elsewhere to blur
    await user.click(document.body);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("is keyboard-focusable (tabIndex=0)", () => {
    render(
      <WalletStatus
        address={mockAddress}
        network="TESTNET"
        onDisconnect={() => {}}
      />
    );

    const badge = screen.getByRole("status", { name: /network: testnet/i });
    expect(badge).toHaveAttribute("tabIndex", "0");
  });

  it("shows wrong network badge when there is a mismatch", () => {
    render(
      <WalletStatus
        address={mockAddress}
        network="TESTNET"
        expectedNetwork="MAINNET"
        isNetworkMismatch={true}
        onDisconnect={() => {}}
      />
    );

    expect(screen.getByText(/expected mainnet/i)).toBeInTheDocument();
  });
});