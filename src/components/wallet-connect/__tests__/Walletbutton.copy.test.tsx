import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WalletButton from "../Walletbutton";

const wallet = vi.hoisted(() => ({
  address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890",
  network: "TESTNET",
  connected: true,
  loading: false,
  error: null,
  expectedNetwork: "TESTNET",
  expectedNetworkLabel: "Testnet",
  isNetworkMismatch: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock("../Walletcontext", () => ({
  useWallet: () => wallet,
}));

function setClipboard(writeText?: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    writable: true,
    value: writeText ? { writeText } : undefined,
  });
}

describe("WalletButton copy functionality", () => {
  beforeEach(() => {
    setClipboard(vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("copies address successfully and shows success feedback when navigator.clipboard is available", async () => {
    const user = userEvent.setup();
    navigator.clipboard.writeText = vi.fn().mockResolvedValue(undefined);

    render(<WalletButton />);

    const pill = screen.getByRole("button", { name: /GABCDE/ });
    await user.click(pill);

    const copyBtn = screen.getByRole("button", { name: /copy address/i });
    await user.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(wallet.address);
    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });

  it("falls back to execCommand when navigator.clipboard is undefined", async () => {
    const user = userEvent.setup();
    setClipboard(undefined);

    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand;

    render(<WalletButton />);

    const pill = screen.getByRole("button", { name: /GABCDE/ });
    await user.click(pill);

    const copyBtn = screen.getByRole("button", { name: /copy address/i });
    await user.click(copyBtn);

    expect(execCommand).toHaveBeenCalledWith("copy");
    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });

  it("shows error feedback when both paths fail", async () => {
    const user = userEvent.setup();
    setClipboard(undefined);

    const execCommand = vi.fn().mockReturnValue(false);
    document.execCommand = execCommand;

    render(<WalletButton />);

    const pill = screen.getByRole("button", { name: /GABCDE/ });
    await user.click(pill);

    const copyBtn = screen.getByRole("button", { name: /copy address/i });
    await user.click(copyBtn);

    expect(execCommand).toHaveBeenCalledWith("copy");
    await waitFor(() => {
      expect(screen.getByText("Failed to copy!")).toBeInTheDocument();
    });
  });
});
