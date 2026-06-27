import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ConnectWalletModal from "../ConnectWalletModal";
import { getNetwork } from "@stellar/freighter-api";

vi.mock("@stellar/freighter-api", () => {
  return {
    isConnected: vi.fn().mockResolvedValue({ isConnected: true }),
    requestAccess: vi.fn().mockResolvedValue({ address: "GDU4D7EXAMPLEADDRESS0L50DR222222222222222222222222222222" }),
    getNetwork: vi.fn().mockResolvedValue({ network: "TESTNET" }),
  };
});

describe("ConnectWalletModal", () => {
  const onClose = vi.fn();
  const onConnectFreighter = vi.fn();
  const onDownloadFreighter = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render when isOpen is false", () => {
    const { container } = render(
      <ConnectWalletModal isOpen={false} onClose={onClose} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders default view when isOpen is true and no error state is active", () => {
    render(<ConnectWalletModal isOpen={true} onClose={onClose} />);
    
    expect(screen.getByText("Choose your wallet")).toBeInTheDocument();
    expect(screen.getByText("Freighter")).toBeInTheDocument();
    expect(screen.getByText("Albedo")).toBeInTheDocument();
    expect(screen.getByText("WalletConnect")).toBeInTheDocument();
    expect(screen.getByText(/By continuing, you agree to Fluxora's/)).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    render(<ConnectWalletModal isOpen={true} onClose={onClose} />);
    const closeBtn = screen.getByLabelText("Close wallet connection dialog");
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("restores focus to the trigger after the modal closes", async () => {
    function Harness() {
      const [open, setOpen] = React.useState(false);

      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open wallet modal
          </button>
          <ConnectWalletModal
            isOpen={open}
            onClose={() => setOpen(false)}
            showStateSwitcher={false}
          />
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open wallet modal" });

    trigger.focus();
    await userEvent.click(trigger);
    await userEvent.click(
      screen.getByRole("button", {
        name: "Close wallet connection dialog",
      }),
    );

    expect(trigger).toHaveFocus();
  });

  it("calls onClose when backdrop is clicked", async () => {
    render(<ConnectWalletModal isOpen={true} onClose={onClose} />);
    const backdrop = screen.getByTestId("connect-wallet-backdrop");
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders 'not_installed' error state with correct copy, links, and actions", async () => {
    render(
      <ConnectWalletModal
        isOpen={true}
        onClose={onClose}
        errorState="not_installed"
        onDownloadFreighter={onDownloadFreighter}
      />
    );

    expect(screen.getByText("Freighter Not Installed")).toBeInTheDocument();
    expect(screen.getByText(/Freighter is the official browser extension/)).toBeInTheDocument();
    
    const downloadBtn = screen.getByRole("link", { name: "Download Freighter browser extension" });
    expect(downloadBtn).toHaveAttribute("href", "https://www.freighter.app/");
    expect(downloadBtn).toHaveAttribute("target", "_blank");
    
    await userEvent.click(downloadBtn);
    expect(onDownloadFreighter).toHaveBeenCalledTimes(1);

    const backBtn = screen.getByRole("button", { name: "Back to wallet selection list" });
    expect(backBtn).toBeInTheDocument();
  });

  it("renders 'rejected' error state with correct copy and calls retry", async () => {
    render(
      <ConnectWalletModal
        isOpen={true}
        onClose={onClose}
        errorState="rejected"
        onConnectFreighter={onConnectFreighter}
      />
    );

    expect(screen.getByText("Connection Rejected")).toBeInTheDocument();
    expect(screen.getByText(/The connection was declined in your wallet extension/)).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: "Retry connecting to Freighter wallet" });
    await userEvent.click(retryBtn);
    expect(onConnectFreighter).toHaveBeenCalledTimes(1);
  });

  it("renders 'network_mismatch' error state with instructions", () => {
    render(
      <ConnectWalletModal
        isOpen={true}
        onClose={onClose}
        errorState="network_mismatch"
      />
    );

    expect(screen.getByText("Wrong Stellar Network")).toBeInTheDocument();
    expect(screen.getByText(/Your wallet is connected to the wrong network/)).toBeInTheDocument();
    expect(screen.getByText(/Open your/)).toBeInTheDocument();
    expect(screen.getByText(/Click the/)).toBeInTheDocument();
    expect(screen.getByText(/Select/)).toBeInTheDocument();
  });

  it("allows switching states via the Design QA toolbar", async () => {
    render(<ConnectWalletModal isOpen={true} onClose={onClose} showStateSwitcher={true} />);
    
    // Switch to Not Installed
    const notInstalledBtn = screen.getByRole("button", { name: "Not Installed" });
    await userEvent.click(notInstalledBtn);
    expect(screen.getByText("Freighter Not Installed")).toBeInTheDocument();

    // Switch to Rejected
    const rejectedBtn = screen.getByRole("button", { name: "Rejected" });
    await userEvent.click(rejectedBtn);
    expect(screen.getByText("Connection Rejected")).toBeInTheDocument();

    // Switch to Wrong Network
    const wrongNetworkBtn = screen.getByRole("button", { name: "Wrong Network" });
    await userEvent.click(wrongNetworkBtn);
    expect(screen.getByText("Wrong Stellar Network")).toBeInTheDocument();

    // Switch to Timed Out
    const timeoutBtn = screen.getByRole("button", { name: "Timed Out" });
    await userEvent.click(timeoutBtn);
    expect(screen.getByText("Network Check Timed Out")).toBeInTheDocument();

    // Switch back to Default View
    const defaultBtn = screen.getByRole("button", { name: "Default View" });
    await userEvent.click(defaultBtn);
    expect(screen.getByText("Choose your wallet")).toBeInTheDocument();
  });

  describe("network timeout", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("shows timeout error when getNetwork never resolves", async () => {
      vi.useFakeTimers();
      (getNetwork as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

      render(<ConnectWalletModal isOpen={true} onClose={onClose} />);

      fireEvent.click(screen.getByRole("listitem", { name: "Connect with Freighter" }));

      // Drain microtasks (isConnected, requestAccess) so we reach withTimeout(getNetwork)
      await vi.advanceTimersByTimeAsync(0);

      // Advance past the timeout duration
      await vi.advanceTimersByTimeAsync(5000);

      expect(screen.getByText("Network Check Timed Out")).toBeInTheDocument();
      expect(screen.getByText(/The network check did not respond in time/)).toBeInTheDocument();
    });

    it("shows timeout error state with retry button", async () => {
      vi.useFakeTimers();
      (getNetwork as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

      render(<ConnectWalletModal isOpen={true} onClose={onClose} />);

      fireEvent.click(screen.getByRole("listitem", { name: "Connect with Freighter" }));

      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(5000);

      // Should have a retry button
      const retryBtn = screen.getByRole("button", { name: "Retry network check" });
      expect(retryBtn).toBeInTheDocument();

      // Back button should also be present
      expect(
        screen.getByRole("button", { name: "Back to wallet selection list" })
      ).toBeInTheDocument();
    });

    it("recovers with retry after timeout when getNetwork succeeds on next attempt", async () => {
      vi.useFakeTimers();
      const neverPromise = new Promise(() => {});
      (getNetwork as ReturnType<typeof vi.fn>).mockReturnValue(neverPromise);

      render(<ConnectWalletModal isOpen={true} onClose={onClose} />);

      // First attempt — times out
      fireEvent.click(screen.getByRole("listitem", { name: "Connect with Freighter" }));
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(5000);
      expect(screen.getByText("Network Check Timed Out")).toBeInTheDocument();

      // Now make getNetwork resolve
      (getNetwork as ReturnType<typeof vi.fn>).mockResolvedValue({ network: "TESTNET" });

      // Click retry
      fireEvent.click(screen.getByRole("button", { name: "Retry network check" }));

      // Let all microtasks resolve
      await vi.advanceTimersByTimeAsync(0);

      // Should succeed — modal should close
      expect(onClose).toHaveBeenCalled();
      expect(screen.queryByText("Network Check Timed Out")).not.toBeInTheDocument();
    });
  });

  describe("network case normalization", () => {
    it("matches network case-insensitively", async () => {
      (getNetwork as ReturnType<typeof vi.fn>).mockResolvedValue({ network: "testnet" });

      render(<ConnectWalletModal isOpen={true} onClose={onClose} />);

      await userEvent.click(screen.getByRole("listitem", { name: "Connect with Freighter" }));

      // Should succeed since "testnet" === "TESTNET" case-insensitively
      expect(onClose).toHaveBeenCalled();
    });

    it("detects network mismatch correctly", async () => {
      (getNetwork as ReturnType<typeof vi.fn>).mockResolvedValue({ network: "PUBLIC" });

      render(<ConnectWalletModal isOpen={true} onClose={onClose} />);

      await userEvent.click(screen.getByRole("listitem", { name: "Connect with Freighter" }));

      expect(screen.getByText("Wrong Stellar Network")).toBeInTheDocument();
    });
  });

  describe("controlled network_timeout state", () => {
    it("renders network_timeout from controlled errorState prop", () => {
      render(
        <ConnectWalletModal
          isOpen={true}
          onClose={onClose}
          errorState="network_timeout"
        />
      );

      expect(screen.getByText("Network Check Timed Out")).toBeInTheDocument();
    });
  });
});
