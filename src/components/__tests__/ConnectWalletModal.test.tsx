import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ConnectWalletModal from "../ConnectWalletModal";

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

    // Switch back to Default View
    const defaultBtn = screen.getByRole("button", { name: "Default View" });
    await userEvent.click(defaultBtn);
    expect(screen.getByText("Choose your wallet")).toBeInTheDocument();
  });
});
