import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { act } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ConnectWalletModal, { type ConnectWalletModalProps } from "../ConnectWalletModal";
import { getNetwork, isConnected } from "@stellar/freighter-api";
import { BREAKPOINT_MD, VIEWPORT_RESIZE_DEBOUNCE_MS } from "../../lib/breakpoints";
vi.mock("@stellar/freighter-api", () => {
  return {
    isConnected: vi.fn().mockResolvedValue({ isConnected: true }),
    requestAccess: vi.fn().mockResolvedValue({ address: "GDU4D7EXAMPLEADDRESS0L50DR222222222222222222222222222222" }),
    getNetwork: vi.fn().mockResolvedValue({ network: "TESTNET" }),
  };
});

let viewportWidth = 1024;

function setViewportWidth(width: number) {
  viewportWidth = width;
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    get: () => viewportWidth,
  });
}

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

  it("ignores Escape while a Freighter connection is pending", () => {
    (isConnected as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(<ConnectWalletModal isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByRole("listitem", { name: "Connect with Freighter" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("Connecting...")).toBeInTheDocument();
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
    expect(screen.getByText(/Open your/)).toBeInTheDocument();
    expect(screen.getByText(/Click the/)).toBeInTheDocument();
    expect(
      screen.getByText((_content, node) => {
        const isMatch = node?.textContent?.includes("Select Testnet and return here.") ?? false;
        return isMatch && node?.tagName?.toLowerCase() === "span";
      })
    ).toBeInTheDocument();
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

  describe("Edge Case Behaviors & States", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("renders loading state copy and disables options while connection is in flight", async () => {
      let resolveNetwork: (value: any) => void;
      (getNetwork as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise((resolve) => {
          resolveNetwork = resolve;
        })
      );

      render(<ConnectWalletModal isOpen={true} onClose={onClose} showStateSwitcher={false} />);
      
      const freighterBtn = screen.getByRole("listitem", { name: "Connect with Freighter" });
      
      expect(screen.queryByText("Connecting...")).not.toBeInTheDocument();
      
      fireEvent.click(freighterBtn);

      expect(screen.getByText("Connecting...")).toBeInTheDocument();
      expect(freighterBtn).toBeDisabled();

      await act(async () => {
        resolveNetwork({ network: "TESTNET" });
      });
    });

    it("applies interactive styling when options are hovered or focused via keyboard", async () => {
      render(<ConnectWalletModal isOpen={true} onClose={onClose} showStateSwitcher={false} />);
      
      const freighterBtn = screen.getByRole("listitem", { name: "Connect with Freighter" });
      
      // Focus via keyboard
      await userEvent.tab();
      if (document.activeElement !== freighterBtn) {
        freighterBtn.focus();
      }
      expect(freighterBtn.style.boxShadow).toContain("var(--interactive-focus-ring)");

      // Blur
      freighterBtn.blur();
      expect(freighterBtn.style.boxShadow).toBe("none");

      // Hover via mouse
      fireEvent.mouseEnter(freighterBtn);
      expect(freighterBtn.style.boxShadow).toContain("var(--interactive-focus-ring)");

      // Mouse leave
      fireEvent.mouseLeave(freighterBtn);
      expect(freighterBtn.style.boxShadow).toBe("none");
    });
  });
    // Accessibility tests
  describe('accessibility', () => {
    it('traps focus within the modal and wraps correctly', async () => {
      render(<ConnectWalletModal isOpen={true} onClose={vi.fn()} showStateSwitcher={false} />);
      const closeBtn = screen.getByLabelText('Close wallet connection dialog');
      
      // Wait for the modal's 50ms focus timer to settle
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(closeBtn).toHaveFocus();
      // Tab to first focusable wallet button (Freighter)
      await userEvent.tab();
      const freighterBtn = screen.getByRole('listitem', { name: /Connect with Freighter/ });
      expect(freighterBtn).toHaveFocus();

      // Tab to second focusable wallet button (Hardware Wallet)
      await userEvent.tab();
      const hardwareBtn = screen.getByRole('listitem', { name: /Connect with Hardware Wallet/ });
      expect(hardwareBtn).toHaveFocus();

      // Tab to Terms of Service link
      await userEvent.tab();
      const termsLink = screen.getByRole('link', { name: /Terms of Service/ });
      expect(termsLink).toHaveFocus();

      // Tab should wrap back to close button
      await userEvent.tab();
      expect(closeBtn).toHaveFocus();

      // Shift+Tab should go back to the last focusable element (Terms of Service link)
      await userEvent.tab({ shift: true });
      expect(termsLink).toHaveFocus();
    });

    it('has correct ARIA attributes', () => {
      render(<ConnectWalletModal isOpen={true} onClose={vi.fn()} />);
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'connect-wallet-modal-title');
      const title = screen.getByText('Choose your wallet');
      expect(title).toHaveAttribute('id', 'connect-wallet-modal-title');
    });
  });
});

describe("unavailable wallet options (Albedo, WalletConnect)", () => {
  it("renders Albedo and WalletConnect as disabled when no handlers provided", () => {
    render(<ConnectWalletModal isOpen={true} onClose={vi.fn()} showStateSwitcher={false} />);

    const albedo = screen.getByRole("listitem", { name: "Albedo — coming soon" });
    const wc = screen.getByRole("listitem", { name: "WalletConnect — coming soon" });

    expect(albedo).toBeDisabled();
    expect(wc).toBeDisabled();
  });

  it("shows 'coming soon' label text for disabled options", () => {
    render(<ConnectWalletModal isOpen={true} onClose={vi.fn()} showStateSwitcher={false} />);
    expect(screen.getAllByText("coming soon")).toHaveLength(2);
  });

  it("enables Albedo when a handler is provided", () => {
    const onAlbedo = vi.fn();
    render(
      <ConnectWalletModal
        isOpen={true}
        onClose={vi.fn()}
        onConnectAlbedo={onAlbedo}
        showStateSwitcher={false}
      />
    );

    const albedo = screen.getByRole("listitem", { name: "Connect with Albedo" });
    expect(albedo).not.toBeDisabled();
    expect(screen.getAllByText("coming soon")).toHaveLength(1); // only WalletConnect
  });


  describe("Hardware Wallet Connect Flow", () => {
    const onClose = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
      // Ensure window.innerWidth defaults to desktop (1024)
      global.innerWidth = 1024;
      // Mock window.dispatchEvent
      global.dispatchEvent(new Event("resize"));
    });

    it("renders Hardware Wallet list entry", () => {
      render(<ConnectWalletModal isOpen={true} onClose={onClose} />);
      expect(screen.getByText("Hardware Wallet")).toBeInTheDocument();
      expect(screen.getByText("Connect via Ledger or Trezor device.")).toBeInTheDocument();
    });

    it("redirects to mobile-unsupported error state on mobile viewport / user agent", async () => {
      // Simulate mobile device
      global.innerWidth = 375;
      global.dispatchEvent(new Event("resize"));

      render(<ConnectWalletModal isOpen={true} onClose={onClose} />);
      
      const hwBtn = screen.getByRole("listitem", { name: "Connect with Hardware Wallet" });
      await userEvent.click(hwBtn);

      expect(screen.getByText("Device Unsupported on Mobile")).toBeInTheDocument();
      expect(screen.getByText(/USB hardware wallet connections are not supported on mobile/)).toBeInTheDocument();

      const wcBtn = screen.getByRole("button", { name: "Connect using WalletConnect mobile flow" });
      expect(wcBtn).toBeInTheDocument();
    });

    it("starts device-searching on desktop viewport", async () => {
      render(<ConnectWalletModal isOpen={true} onClose={onClose} />);
      
      const hwBtn = screen.getByRole("listitem", { name: "Connect with Hardware Wallet" });
      await userEvent.click(hwBtn);

      expect(screen.getByText("Connect via USB")).toBeInTheDocument();
      expect(screen.getByText(/Searching for connected hardware wallets/)).toBeInTheDocument();
    });

    it("allows transitioning to device-found-selecting and choosing a device", async () => {
      render(
        <ConnectWalletModal
          isOpen={true}
          onClose={onClose}
          errorState="device-found-selecting"
        />
      );

      expect(screen.getByText("Configure Device")).toBeInTheDocument();
      const ledgerRadio = screen.getByRole("radio", { name: "Ledger Nano X or S" });
      const trezorRadio = screen.getByRole("radio", { name: "Trezor Model T or One" });

      expect(ledgerRadio).toHaveAttribute("aria-checked", "true");
      expect(trezorRadio).toHaveAttribute("aria-checked", "false");

      await userEvent.click(trezorRadio);
      expect(trezorRadio).toHaveAttribute("aria-checked", "true");
      expect(ledgerRadio).toHaveAttribute("aria-checked", "false");
    });

    it("validates custom derivation path input and updates UI validity", async () => {
      render(
        <ConnectWalletModal
          isOpen={true}
          onClose={onClose}
          errorState="device-found-selecting"
        />
      );

      const select = screen.getByLabelText("Derivation Path");
      await userEvent.selectOptions(select, "custom");

      const input = screen.getByLabelText("Enter custom Stellar derivation path");
      expect(input).toBeInTheDocument();

      // Enter invalid path
      await userEvent.clear(input);
      await userEvent.type(input, "invalid-path");

      expect(screen.getByText("Invalid Stellar derivation path format (e.g. m/44'/148'/0')")).toBeInTheDocument();
      const confirmBtn = screen.getByRole("button", { name: "Confirm selection and connect" });
      expect(confirmBtn).toBeDisabled();

      // Enter valid path
      await userEvent.clear(input);
      await userEvent.type(input, "m/44'/148'/2'");
      expect(screen.queryByText("Invalid Stellar derivation path format (e.g. m/44'/148'/0')")).not.toBeInTheDocument();
      expect(confirmBtn).not.toBeDisabled();
    });

    it("focuses custom derivation path input programmatically when selected", async () => {
      vi.useFakeTimers();
      render(
        <ConnectWalletModal
          isOpen={true}
          onClose={onClose}
          errorState="device-found-selecting"
        />
      );

      const select = screen.getByLabelText("Derivation Path");
      await userEvent.selectOptions(select, "custom");

      // Fast-forward timers for the setTimeout focus
      vi.advanceTimersByTime(100);

      const input = screen.getByLabelText("Enter custom Stellar derivation path");
      expect(input).toHaveFocus();
      vi.useRealTimers();
    });

    it("renders hardware wallet-specific error states from props", () => {
      const { rerender } = render(
        <ConnectWalletModal isOpen={true} onClose={onClose} errorState="device-locked-error" />
      );
      expect(screen.getByText("Hardware Wallet Locked")).toBeInTheDocument();

      rerender(<ConnectWalletModal isOpen={true} onClose={onClose} errorState="wrong-app-error" />);
      expect(screen.getByText("Stellar App Not Open")).toBeInTheDocument();

      rerender(<ConnectWalletModal isOpen={true} onClose={onClose} errorState="unplugged-error" />);
      expect(screen.getByText("Device Disconnected")).toBeInTheDocument();
    });

    it("allows QA preview toolbar to select hardware states", async () => {
      render(<ConnectWalletModal isOpen={true} onClose={onClose} showStateSwitcher={true} />);

      // Switch to HW Search
      await userEvent.click(screen.getByRole("button", { name: "HW: Search" }));
      expect(screen.getByText("Connect via USB")).toBeInTheDocument();

      // Switch to HW Select
      await userEvent.click(screen.getByRole("button", { name: "HW: Select" }));
      expect(screen.getByText("Configure Device")).toBeInTheDocument();

      // Switch to HW Confirm
      await userEvent.click(screen.getByRole("button", { name: "HW: Confirm" }));
      expect(screen.getByText("Confirm on Device")).toBeInTheDocument();

      // Switch to HW Locked
      await userEvent.click(screen.getByRole("button", { name: "HW: Locked" }));
      expect(screen.getByText("Hardware Wallet Locked")).toBeInTheDocument();

      // Switch to HW Wrong App
      await userEvent.click(screen.getByRole("button", { name: "HW: Wrong App" }));
      expect(screen.getByText("Stellar App Not Open")).toBeInTheDocument();

      // Switch to HW Unplugged
      await userEvent.click(screen.getByRole("button", { name: "HW: Unplugged" }));
      expect(screen.getByText("Device Disconnected")).toBeInTheDocument();

      // Switch to HW Mobile Unsupported
      await userEvent.click(screen.getByRole("button", { name: "HW: Mobile Unsupported" }));
      expect(screen.getByText("Device Unsupported on Mobile")).toBeInTheDocument();
    });
  });
});

describe("ConnectWalletModal — mobile detection via shared breakpoint helper (Issue #980)", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    setViewportWidth(BREAKPOINT_MD);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("treats widths at or above BREAKPOINT_MD as desktop and below it as mobile, on mount", async () => {
    setViewportWidth(BREAKPOINT_MD);
    const { unmount } = render(<ConnectWalletModal isOpen={true} onClose={onClose} />);
    const hwBtnDesktop = screen.getByRole("listitem", { name: "Connect with Hardware Wallet" });
    await userEvent.click(hwBtnDesktop, { advanceTimers: vi.advanceTimersByTime });
    expect(screen.getByText("Connect via USB")).toBeInTheDocument();
    unmount();

    setViewportWidth(BREAKPOINT_MD - 1);
    render(<ConnectWalletModal isOpen={true} onClose={onClose} />);
    const hwBtnMobile = screen.getByRole("listitem", { name: "Connect with Hardware Wallet" });
    await userEvent.click(hwBtnMobile, { advanceTimers: vi.advanceTimersByTime });
    expect(screen.getByText("Device Unsupported on Mobile")).toBeInTheDocument();
  });

  it("updates mobile state only after the debounce delay elapses on resize", async () => {
    setViewportWidth(BREAKPOINT_MD);
    render(<ConnectWalletModal isOpen={true} onClose={onClose} />);

    setViewportWidth(BREAKPOINT_MD - 1);
    act(() => {
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(VIEWPORT_RESIZE_DEBOUNCE_MS - 1);
    });

    const hwBtnStillDesktop = screen.getByRole("listitem", { name: "Connect with Hardware Wallet" });
    fireEvent.click(hwBtnStillDesktop);
    expect(screen.getByText("Connect via USB")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
  });

  it("collapses rapid resize events into a single debounced update", async () => {
    setViewportWidth(BREAKPOINT_MD - 1);
    render(<ConnectWalletModal isOpen={true} onClose={onClose} />);

    act(() => {
      for (let width = BREAKPOINT_MD; width <= BREAKPOINT_MD + 50; width += 5) {
        setViewportWidth(width);
        window.dispatchEvent(new Event("resize"));
      }
      vi.advanceTimersByTime(VIEWPORT_RESIZE_DEBOUNCE_MS - 1);
    });

    act(() => {
      vi.advanceTimersByTime(1);
    });

    const hwBtn = screen.getByRole("listitem", { name: "Connect with Hardware Wallet" });
    fireEvent.click(hwBtn);
    expect(screen.getByText("Connect via USB")).toBeInTheDocument();
  });

  it("clears the pending debounce timer on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    setViewportWidth(BREAKPOINT_MD);
    const { unmount } = render(<ConnectWalletModal isOpen={true} onClose={onClose} />);

    setViewportWidth(BREAKPOINT_MD - 1);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(VIEWPORT_RESIZE_DEBOUNCE_MS);
    });
  });
});

// ---------------------------------------------------------------------------
// Copy stability tests (issue #1156) — ensure copy is deterministic across
// refreshes, rerenders, and state transitions.
// ---------------------------------------------------------------------------

describe("ConnectWalletModal — copy stability", () => {
  it("renders the same default view title and description text after a rerender", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <ConnectWalletModal isOpen={true} onClose={onClose} />
    );

    const titleBefore = screen.getByText("Choose your wallet");
    const subtitleBefore = screen.getByText(
      /Select a provider below to connect/
    );

    rerender(<ConnectWalletModal isOpen={true} onClose={onClose} />);

    const titleAfter = screen.getByText("Choose your wallet");
    const subtitleAfter = screen.getByText(
      /Select a provider below to connect/
    );

    expect(titleBefore.textContent).toBe(titleAfter.textContent);
    expect(subtitleBefore.textContent).toBe(subtitleAfter.textContent);
  });

  it("preserves exact error state copy on rerender", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <ConnectWalletModal
        isOpen={true}
        onClose={onClose}
        errorState="network_mismatch"
      />
    );

    const titleBefore = screen.getByText("Wrong Stellar Network");
    rerender(
      <ConnectWalletModal
        isOpen={true}
        onClose={onClose}
        errorState="network_mismatch"
      />
    );
    const titleAfter = screen.getByText("Wrong Stellar Network");

    expect(titleBefore.textContent).toBe(titleAfter.textContent);
  });

it("preserves exact heading copy on rerender for all error states", () => {
    const errorStates: Array<NonNullable<ConnectWalletModalProps["errorState"]>> = [
      "not_installed",
      "rejected",
      "network_mismatch",
      "network_timeout",
      "device-searching",
      "device-found-selecting",
      "awaiting-device-confirmation",
      "device-locked-error",
      "wrong-app-error",
      "unplugged-error",
      "mobile-unsupported",
    ];

    const onClose = vi.fn();

    for (const state of errorStates) {
      const { rerender } = render(
        <ConnectWalletModal isOpen={true} onClose={onClose} errorState={state} />
      );

      const heading = screen.getByRole("heading", { level: 2 });

      rerender(
        <ConnectWalletModal isOpen={true} onClose={onClose} errorState={state} />
      );

      expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
        heading.textContent
      );

      cleanup();
    }
  });

  it("does not change the wallet list copy when the modal re-renders due to hover state change", async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <ConnectWalletModal isOpen={true} onClose={onClose} showStateSwitcher={false} />
    );

    const freighterTextBefore = screen.getAllByText("Freighter")[0].textContent;
    const albedoTextBefore = screen.getAllByText("Albedo")[0].textContent;

    // Trigger a hover on the Freighter option to change internal state
    const freighterBtn = screen.getByRole("listitem", { name: "Connect with Freighter" });
    fireEvent.mouseEnter(freighterBtn);

    const freighterTextAfter = screen.getAllByText("Freighter")[0].textContent;
    const albedoTextAfter = screen.getAllByText("Albedo")[0].textContent;

    expect(freighterTextBefore).toBe(freighterTextAfter);
    expect(albedoTextBefore).toBe(albedoTextAfter);
  });
});

// ---------------------------------------------------------------------------
// Last-used wallet preference tests (issue #1287)
// ---------------------------------------------------------------------------

describe("ConnectWalletModal — last-used wallet preference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows a 'Last used' badge on the Freighter option when preference is set", () => {
    localStorage.setItem("fluxora_last_used_wallet", "freighter");
    render(<ConnectWalletModal isOpen={true} onClose={vi.fn()} showStateSwitcher={false} />);

    const badge = screen.getByText("Last used");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("aria-label", "Last used wallet");
  });

  it("shows no 'Last used' badge when localStorage is empty", () => {
    render(<ConnectWalletModal isOpen={true} onClose={vi.fn()} showStateSwitcher={false} />);
    expect(screen.queryByText("Last used")).not.toBeInTheDocument();
  });

  it("does not show 'Last used' badge on disabled wallet options", () => {
    localStorage.setItem("fluxora_last_used_wallet", "albedo");
    render(<ConnectWalletModal isOpen={true} onClose={vi.fn()} showStateSwitcher={false} />);

    // Albedo is disabled when no handler is provided — badge should not show
    expect(screen.queryByText("Last used")).not.toBeInTheDocument();
  });

  it("persists wallet ID to localStorage on successful Freighter connection", async () => {
    (isConnected as ReturnType<typeof vi.fn>).mockResolvedValue({ isConnected: true });
    render(<ConnectWalletModal isOpen={true} onClose={vi.fn()} showStateSwitcher={false} />);

    await userEvent.click(screen.getByRole("listitem", { name: "Connect with Freighter" }));

    expect(localStorage.getItem("fluxora_last_used_wallet")).toBe("freighter");
  });

  it("shows 'Last used' badge after successful connection and re-opening the modal", async () => {
    (isConnected as ReturnType<typeof vi.fn>).mockResolvedValue({ isConnected: true });
    const onClose = vi.fn();

    // First open — connect
    render(
      <ConnectWalletModal isOpen={true} onClose={onClose} showStateSwitcher={false} />
    );

    await userEvent.click(screen.getByRole("listitem", { name: "Connect with Freighter" }));

    // Close then re-open
    cleanup();
    render(<ConnectWalletModal isOpen={true} onClose={vi.fn()} showStateSwitcher={false} />);

    // Freighter should now show "Last used"
    expect(screen.getByText("Last used")).toBeInTheDocument();
  });
});
