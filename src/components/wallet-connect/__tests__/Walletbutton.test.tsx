import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WalletButton from "../Walletbutton";

const wallet = vi.hoisted(() => ({
  address: null as string | null,
  network: null as string | null,
  connected: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
}));

const freighter = vi.hoisted(() => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getNetwork: vi.fn(),
}));

vi.mock("../Walletcontext", () => ({
  useWallet: () => wallet,
}));

vi.mock("@stellar/freighter-api", () => ({
  isConnected: freighter.isConnected,
  requestAccess: freighter.requestAccess,
  getNetwork: freighter.getNetwork,
}));

describe("WalletButton canonical modal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wallet.address = null;
    wallet.network = null;
    wallet.connected = false;
    freighter.isConnected.mockResolvedValue({ isConnected: true });
    freighter.requestAccess.mockResolvedValue({
      address: "GCONNECTED",
      error: null,
    });
    freighter.getNetwork.mockResolvedValue({
      network: "TESTNET",
      error: null,
    });
  });

  it("opens the canonical ConnectWalletModal and restores focus on close", async () => {
    const user = userEvent.setup();
    render(<WalletButton />);

    const trigger = screen.getByRole("button", { name: "Connect wallet" });
    trigger.focus();
    await user.click(trigger);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", { name: "Connect with Freighter" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Close wallet connection dialog",
      }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("connects Freighter through the shared wallet context", async () => {
    const user = userEvent.setup();
    render(<WalletButton />);

    await user.click(screen.getByRole("button", { name: "Connect wallet" }));
    await user.click(
      screen.getByRole("listitem", { name: "Connect with Freighter" }),
    );

    expect(freighter.requestAccess).toHaveBeenCalledTimes(1);
    expect(freighter.getNetwork).toHaveBeenCalledTimes(1);
    expect(wallet.connect).toHaveBeenCalledWith("GCONNECTED", "TESTNET");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps canonical rejected guidance when Freighter denies access", async () => {
    const user = userEvent.setup();
    freighter.requestAccess.mockResolvedValue({
      address: "",
      error: "User declined access",
    });

    render(<WalletButton />);

    await user.click(screen.getByRole("button", { name: "Connect wallet" }));
    await user.click(
      screen.getByRole("listitem", { name: "Connect with Freighter" }),
    );

    expect(screen.getByText("Connection Rejected")).toBeInTheDocument();
    expect(wallet.connect).not.toHaveBeenCalled();
  });
});
