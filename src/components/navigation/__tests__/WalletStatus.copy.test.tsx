import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WalletStatus from "../WalletStatus";

// jsdom defines navigator.clipboard as a getter-only property, so it must be
// redefined (not assigned) when stubbing. `undefined` simulates an insecure
// context where the async Clipboard API is unavailable.
function setClipboard(writeText?: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    writable: true,
    value: writeText ? { writeText } : undefined,
  });
}

describe("WalletStatus copy functionality", () => {
  const mockAddress = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
  const mockNetwork = "TESTNET";

  beforeEach(() => {
    // Mock clipboard API
    setClipboard(vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("copies address successfully and shows success feedback", async () => {
    const user = userEvent.setup();
    navigator.clipboard.writeText = vi.fn().mockResolvedValue(undefined);

    render(
      <WalletStatus
        address={mockAddress}
        network={mockNetwork}
        onDisconnect={() => {}}
      />
    );

    // Open dropdown
    const walletButton = screen.getByRole("button", { name: /wallet/i });
    await user.click(walletButton);

    // Click copy button
    const copyButton = screen.getByRole("menuitem", { name: /copy address/i });
    await user.click(copyButton);

    // Should show "Copied!" state
    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });

    // Should have announcement
    const liveRegion = screen.getByRole("status", { name: "" });
    expect(liveRegion).toHaveTextContent("Address copied to clipboard");
  });

  it("shows error feedback when clipboard fails", async () => {
    const user = userEvent.setup();
    // Mock clipboard rejection
    navigator.clipboard.writeText = vi.fn().mockRejectedValue(new Error("Permission denied"));

    render(
      <WalletStatus
        address={mockAddress}
        network={mockNetwork}
        onDisconnect={() => {}}
      />
    );

    // Open dropdown
    const walletButton = screen.getByRole("button", { name: /wallet/i });
    await user.click(walletButton);

    // Click copy button
    const copyButton = screen.getByRole("menuitem", { name: /copy address/i });
    await user.click(copyButton);

    // Should show error announcement
    const liveRegion = screen.getByRole("status", { name: "" });
    await waitFor(() => {
      expect(liveRegion).toHaveTextContent("Failed to copy address");
    });
  });

  it("uses fallback copy when clipboard API is unavailable", async () => {
    const user = userEvent.setup();
    // Remove clipboard API
    setClipboard(undefined);

    // Mock execCommand
    document.execCommand = vi.fn().mockReturnValue(true);

    render(
      <WalletStatus
        address={mockAddress}
        network={mockNetwork}
        onDisconnect={() => {}}
      />
    );

    // Open dropdown
    const walletButton = screen.getByRole("button", { name: /wallet/i });
    await user.click(walletButton);

    // Click copy button
    const copyButton = screen.getByRole("menuitem", { name: /copy address/i });
    await user.click(copyButton);

    // Should show success
    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });

  it("handles fallback copy failure", async () => {
    const user = userEvent.setup();
    // Remove clipboard API
    setClipboard(undefined);

    // Mock execCommand failure
    document.execCommand = vi.fn().mockReturnValue(false);

    render(
      <WalletStatus
        address={mockAddress}
        network={mockNetwork}
        onDisconnect={() => {}}
      />
    );

    // Open dropdown
    const walletButton = screen.getByRole("button", { name: /wallet/i });
    await user.click(walletButton);

    // Click copy button
    const copyButton = screen.getByRole("menuitem", { name: /copy address/i });
    await user.click(copyButton);

    // Should show error announcement
    const liveRegion = screen.getByRole("status", { name: "" });
    await waitFor(() => {
      expect(liveRegion).toHaveTextContent("Failed to copy address");
    });
  });

  it("does not log the address to console on failure", async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, "log");
    const consoleErrorSpy = vi.spyOn(console, "error");

    navigator.clipboard.writeText = vi.fn().mockRejectedValue(new Error("Permission denied"));

    render(
      <WalletStatus
        address={mockAddress}
        network={mockNetwork}
        onDisconnect={() => {}}
      />
    );

    // Open dropdown
    const walletButton = screen.getByRole("button", { name: /wallet/i });
    await user.click(walletButton);

    // Click copy button
    const copyButton = screen.getByRole("menuitem", { name: /copy address/i });
    await user.click(copyButton);

    // Verify no address was logged
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining(mockAddress));
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining(mockAddress));

    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});