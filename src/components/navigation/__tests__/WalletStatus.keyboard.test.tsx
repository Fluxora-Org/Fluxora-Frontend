import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WalletStatus from "../WalletStatus";

describe("WalletStatus keyboard navigation", () => {
  const mockAddress = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
  const mockNetwork = "TESTNET";

  it("opens the menu and focuses first item on ArrowDown", async () => {
    const user = userEvent.setup();
    render(
      <WalletStatus
        address={mockAddress}
        network={mockNetwork}
        onDisconnect={() => {}}
      />
    );

    const walletButton = screen.getByRole("button", { name: /wallet/i });
    walletButton.focus();
    await user.keyboard("{ArrowDown}");

    const firstItem = await screen.findByRole("menuitem", { name: /copy address/i });
    
    // We need to wait for requestAnimationFrame to fire the focus
    await waitFor(() => {
      expect(firstItem).toHaveFocus();
    });
  });

  it("navigates down and wraps from last to first using ArrowDown", async () => {
    const user = userEvent.setup();
    render(
      <WalletStatus
        address={mockAddress}
        network={mockNetwork}
        onDisconnect={() => {}}
      />
    );

    const walletButton = screen.getByRole("button", { name: /wallet/i });
    walletButton.focus();
    await user.keyboard("{ArrowDown}");
    
    // Wait for auto-focus
    const firstItem = await screen.findByRole("menuitem", { name: /copy address/i });
    await waitFor(() => expect(firstItem).toHaveFocus());

    const secondItem = screen.getByRole("menuitem", { name: /view in explorer/i });
    const thirdItem = screen.getByRole("menuitem", { name: /disconnect/i });

    await user.keyboard("{ArrowDown}");
    expect(secondItem).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(thirdItem).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(firstItem).toHaveFocus(); // wraps around
  });

  it("navigates up and wraps from first to last using ArrowUp", async () => {
    const user = userEvent.setup();
    render(
      <WalletStatus
        address={mockAddress}
        network={mockNetwork}
        onDisconnect={() => {}}
      />
    );

    const walletButton = screen.getByRole("button", { name: /wallet/i });
    walletButton.focus();
    await user.keyboard("{ArrowDown}"); // opens and focuses first
    
    const firstItem = await screen.findByRole("menuitem", { name: /copy address/i });
    await waitFor(() => expect(firstItem).toHaveFocus());

    const secondItem = screen.getByRole("menuitem", { name: /view in explorer/i });
    const thirdItem = screen.getByRole("menuitem", { name: /disconnect/i });

    await user.keyboard("{ArrowUp}");
    expect(thirdItem).toHaveFocus(); // wraps around to last

    await user.keyboard("{ArrowUp}");
    expect(secondItem).toHaveFocus();
  });

  it("traps focus within the menu using Tab and Shift+Tab", async () => {
    const user = userEvent.setup();
    render(
      <WalletStatus
        address={mockAddress}
        network={mockNetwork}
        onDisconnect={() => {}}
      />
    );

    const walletButton = screen.getByRole("button", { name: /wallet/i });
    walletButton.focus();
    await user.keyboard("{ArrowDown}");
    
    const firstItem = await screen.findByRole("menuitem", { name: /copy address/i });
    await waitFor(() => expect(firstItem).toHaveFocus());

    const thirdItem = screen.getByRole("menuitem", { name: /disconnect/i });

    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(thirdItem).toHaveFocus();

    await user.keyboard("{Tab}");
    expect(firstItem).toHaveFocus();
  });

  it("closes the menu and returns focus to the trigger on Escape", async () => {
    const user = userEvent.setup();
    render(
      <WalletStatus
        address={mockAddress}
        network={mockNetwork}
        onDisconnect={() => {}}
      />
    );

    const walletButton = screen.getByRole("button", { name: /wallet/i });
    walletButton.focus();
    await user.keyboard("{ArrowDown}");
    
    const firstItem = await screen.findByRole("menuitem", { name: /copy address/i });
    await waitFor(() => expect(firstItem).toHaveFocus());

    await user.keyboard("{Escape}");
    
    // Menu is closed
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    
    // Focus returned
    expect(walletButton).toHaveFocus();
  });

  it("applies keyboard navigation and Escape behavior to the Disconnect confirmation view", async () => {
    const user = userEvent.setup();
    render(
      <WalletStatus
        address={mockAddress}
        network={mockNetwork}
        onDisconnect={() => {}}
      />
    );

    const walletButton = screen.getByRole("button", { name: /wallet/i });
    walletButton.focus();
    await user.keyboard("{ArrowDown}");
    
    // Go to disconnect confirm view
    const disconnectItem = await screen.findByRole("menuitem", { name: /disconnect/i });
    await waitFor(() => expect(disconnectItem).toBeInTheDocument());
    
    // We use keyboard to click it to simulate pure keyboard flow
    disconnectItem.focus();
    await user.keyboard("{Enter}");

    const cancelButton = await screen.findByRole("button", { name: /cancel/i });
    const disconnectConfirmButton = screen.getByRole("button", { name: /disconnect wallet/i });

    // Focus automatically goes to the first button in the new view (thanks to requestAnimationFrame in onClick)
    await waitFor(() => expect(cancelButton).toHaveFocus());

    // Arrow down
    await user.keyboard("{ArrowDown}");
    expect(disconnectConfirmButton).toHaveFocus();

    // Arrow down again to wrap
    await user.keyboard("{ArrowDown}");
    expect(cancelButton).toHaveFocus();

    // Tab trap
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(disconnectConfirmButton).toHaveFocus();
    await user.keyboard("{Tab}");
    expect(cancelButton).toHaveFocus();

    // Escape closes and returns focus
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(walletButton).toHaveFocus();
  });
});
