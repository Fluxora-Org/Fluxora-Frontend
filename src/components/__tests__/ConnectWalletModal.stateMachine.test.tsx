/**
 * ConnectWalletModal — focused regression tests
 *
 * These tests exercise the modal's state machine integration end-to-end:
 * rendering the correct screen for each machine state, guard behaviour,
 * Freighter connection flow (success, all error variants), hardware-wallet
 * flow, retry, back-navigation, and the controlled errorState prop.
 *
 * All @stellar/freighter-api calls are mocked so tests remain fast and
 * deterministic.
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isConnected,
  requestAccess,
  getNetwork,
} from "@stellar/freighter-api";

// ─── Module mocks (hoisted) ───────────────────────────────────────────────────

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

vi.mock("../WalletIcon", () => ({
  default: ({ name }: { name: string }) => <span>{name}</span>,
}));

// CSS modules — factory must be fully inline (vi.mock is hoisted before variable init).
vi.mock("../ConnectWalletModal.module.css", () => ({
  default: new Proxy({} as Record<string, string>, { get: (_t, k) => String(k) }),
}));

// ─── Imports that depend on mocks being set up ───────────────────────────────

import ConnectWalletModal from "../ConnectWalletModal";
import { isMobileViewport } from "../../lib/breakpoints";
import { useWallet } from "../wallet-connect/Walletcontext";

const mockedIsConnected = vi.mocked(isConnected);
const mockedRequestAccess = vi.mocked(requestAccess);
const mockedGetNetwork = vi.mocked(getNetwork);
const mockedIsMobile = vi.mocked(isMobileViewport);

/** A valid Stellar address used for happy-path assertions */
const VALID_ADDRESS = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const noop = () => {};

function renderModal(
  props: Partial<React.ComponentProps<typeof ConnectWalletModal>> = {},
) {
  const onClose = props.onClose ?? vi.fn();
  return render(
    <ConnectWalletModal
      isOpen={true}
      onClose={onClose}
      showStateSwitcher={false}
      {...props}
    />,
  );
}

// ─── 1. Default (idle) state rendering ───────────────────────────────────────

describe("ConnectWalletModal — idle (default) state", () => {
  it("renders wallet list when open", () => {
    renderModal();
    expect(screen.getByText("Choose your wallet")).toBeInTheDocument();
    expect(screen.getByLabelText("Connect with Freighter")).toBeInTheDocument();
    expect(screen.getByLabelText("Connect with Hardware Wallet")).toBeInTheDocument();
  });

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <ConnectWalletModal isOpen={false} onClose={noop} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByLabelText("Close wallet connection dialog"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByTestId("connect-wallet-backdrop"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("Albedo and WalletConnect buttons are disabled when handlers are absent", () => {
    renderModal();
    expect(screen.getByLabelText("Albedo — coming soon")).toBeDisabled();
    expect(screen.getByLabelText("WalletConnect — coming soon")).toBeDisabled();
  });
});

// ─── 2. Controlled errorState prop overrides the machine ─────────────────────

describe("ConnectWalletModal — controlled errorState prop", () => {
  const cases = [
    ["not_installed", "error-state-not-installed"],
    ["rejected", "error-state-rejected"],
    ["network_mismatch", "error-state-network-mismatch"],
    ["network_timeout", "error-state-network-timeout"],
    ["device-searching", "error-state-device-searching"],
    ["device-found-selecting", "error-state-device-found-selecting"],
    ["awaiting-device-confirmation", "error-state-awaiting-device-confirmation"],
    ["device-locked-error", "error-state-device-locked-error"],
    ["wrong-app-error", "error-state-wrong-app-error"],
    ["unplugged-error", "error-state-unplugged-error"],
    ["mobile-unsupported", "error-state-mobile-unsupported"],
  ] as const;

  for (const [errorState, testId] of cases) {
    it(`errorState="${errorState}" shows the correct screen`, () => {
      renderModal({ errorState });
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    });
  }

  it("errorState=null shows the default wallet list", () => {
    renderModal({ errorState: null });
    expect(screen.getByText("Choose your wallet")).toBeInTheDocument();
  });
});

// ─── 3. Freighter connection — success path ──────────────────────────────────

describe("ConnectWalletModal — Freighter success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedIsConnected.mockResolvedValue({ isConnected: true });
    mockedRequestAccess.mockResolvedValue({ address: VALID_ADDRESS });
    mockedGetNetwork.mockResolvedValue({
      network: "TESTNET",
      networkPassphrase: "Test SDF Network ; September 2015",
    });
    mockedIsMobile.mockReturnValue(false);
  });

  it("calls onConnectFreighter and onClose after successful connection", async () => {
    const onConnectFreighter = vi.fn();
    const onClose = vi.fn();

    renderModal({ onConnectFreighter, onClose });
    fireEvent.click(screen.getByLabelText("Connect with Freighter"));

    await waitFor(() => expect(onConnectFreighter).toHaveBeenCalledOnce());
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls WalletContext.connect — verified by successful modal close", async () => {
    // connect() is called inside the component using the useWallet() stub. The
    // vi.mock in setup.ts creates a new vi.fn() instance on each call, so we
    // cannot capture the exact instance. Instead we verify the success path
    // end-to-end: if onConnectFreighter fires AND onClose fires, then connect()
    // must have been reached (the component only calls those two after connect).
    const onConnectFreighter = vi.fn();
    const onClose = vi.fn();
    renderModal({ onConnectFreighter, onClose });

    fireEvent.click(screen.getByLabelText("Connect with Freighter"));

    await waitFor(() => expect(onConnectFreighter).toHaveBeenCalledOnce());
    expect(onClose).toHaveBeenCalledOnce();
    // Freighter API mocks were called in the right order
    expect(mockedIsConnected).toHaveBeenCalledOnce();
    expect(mockedRequestAccess).toHaveBeenCalledOnce();
    expect(mockedGetNetwork).toHaveBeenCalledOnce();
  });
});

// ─── 4. Freighter connection — not_installed ──────────────────────────────────

describe("ConnectWalletModal — not_installed", () => {
  beforeEach(() => {
    mockedIsConnected.mockResolvedValue({ isConnected: false });
    mockedIsMobile.mockReturnValue(false);
  });

  it("shows not-installed screen when Freighter is absent", async () => {
    renderModal();
    fireEvent.click(screen.getByLabelText("Connect with Freighter"));
    await screen.findByTestId("error-state-not-installed");
    expect(screen.getByText("Freighter Not Installed")).toBeInTheDocument();
  });

  it("calls onDownloadFreighter when Freighter is absent", async () => {
    const onDownloadFreighter = vi.fn();
    renderModal({ onDownloadFreighter });
    fireEvent.click(screen.getByLabelText("Connect with Freighter"));
    await screen.findByTestId("error-state-not-installed");
    expect(onDownloadFreighter).toHaveBeenCalledOnce();
  });

  it("BACK from not-installed returns to wallet list", async () => {
    renderModal();
    fireEvent.click(screen.getByLabelText("Connect with Freighter"));
    await screen.findByTestId("error-state-not-installed");

    fireEvent.click(screen.getByLabelText("Back to wallet selection list"));
    await screen.findByText("Choose your wallet");
  });
});

// ─── 5. Freighter connection — rejected ──────────────────────────────────────

describe("ConnectWalletModal — rejected", () => {
  beforeEach(() => {
    mockedIsConnected.mockResolvedValue({ isConnected: true });
    mockedRequestAccess.mockResolvedValue({
      address: "",
      error: { code: -4, message: "User declined" },
    });
    mockedIsMobile.mockReturnValue(false);
  });

  it("shows rejected screen when user declines", async () => {
    renderModal();
    fireEvent.click(screen.getByLabelText("Connect with Freighter"));
    await screen.findByTestId("error-state-rejected");
    expect(screen.getByText("Connection Rejected")).toBeInTheDocument();
  });

  it("BACK from rejected returns to wallet list", async () => {
    renderModal();
    fireEvent.click(screen.getByLabelText("Connect with Freighter"));
    await screen.findByTestId("error-state-rejected");

    fireEvent.click(screen.getByLabelText("Back to wallet selection list"));
    await screen.findByText("Choose your wallet");
  });

  it("RETRY from rejected re-attempts the connection and succeeds", async () => {
    const onConnectFreighter = vi.fn();
    const onClose = vi.fn();
    renderModal({ onConnectFreighter, onClose });

    fireEvent.click(screen.getByLabelText("Connect with Freighter"));
    await screen.findByTestId("error-state-rejected");

    // Fix the mock to succeed on retry
    mockedRequestAccess.mockResolvedValue({ address: VALID_ADDRESS });
    mockedGetNetwork.mockResolvedValue({
      network: "TESTNET",
      networkPassphrase: "Test SDF Network ; September 2015",
    });

    fireEvent.click(screen.getByLabelText("Retry connecting to Freighter wallet"));
    await waitFor(() => expect(onConnectFreighter).toHaveBeenCalledOnce());
    expect(onClose).toHaveBeenCalledOnce();
  });
});

// ─── 6. Freighter connection — network_mismatch ───────────────────────────────

describe("ConnectWalletModal — network_mismatch", () => {
  beforeEach(() => {
    mockedIsConnected.mockResolvedValue({ isConnected: true });
    mockedRequestAccess.mockResolvedValue({ address: VALID_ADDRESS });
    mockedGetNetwork.mockResolvedValue({
      network: "PUBLIC",
      networkPassphrase: "Public Global Stellar Network ; September 2015",
    });
    mockedIsMobile.mockReturnValue(false);
  });

  it("shows network-mismatch screen when wallet is on the wrong network", async () => {
    renderModal();
    fireEvent.click(screen.getByLabelText("Connect with Freighter"));
    await screen.findByTestId("error-state-network-mismatch");
    expect(screen.getByText("Wrong Stellar Network")).toBeInTheDocument();
  });

  it("displays expected and actual network labels", async () => {
    renderModal({ actualNetworkLabel: "Mainnet" });
    fireEvent.click(screen.getByLabelText("Connect with Freighter"));
    await screen.findByTestId("error-state-network-mismatch");
    // "Testnet" appears in both the description paragraph and the instructions list.
    // Confirm at least one instance is present, and check for the actual label too.
    expect(screen.getAllByText("Testnet").length).toBeGreaterThan(0);
    expect(screen.getByText("Mainnet")).toBeInTheDocument();
  });

  it("RETRY re-checks network and succeeds when fixed", async () => {
    const onConnectFreighter = vi.fn();
    const onClose = vi.fn();
    renderModal({ onConnectFreighter, onClose });

    fireEvent.click(screen.getByLabelText("Connect with Freighter"));
    await screen.findByTestId("error-state-network-mismatch");

    // Now the wallet is on the correct network
    mockedGetNetwork.mockResolvedValue({
      network: "TESTNET",
      networkPassphrase: "Test SDF Network ; September 2015",
    });

    fireEvent.click(screen.getByLabelText("Check network configuration again"));
    await waitFor(() => expect(onConnectFreighter).toHaveBeenCalledOnce());
  });
});

// ─── 7. Freighter connection — network_timeout ───────────────────────────────

describe("ConnectWalletModal — network_timeout", () => {
  beforeEach(() => {
    mockedIsConnected.mockResolvedValue({ isConnected: true });
    mockedRequestAccess.mockResolvedValue({ address: VALID_ADDRESS });
    // Reject quickly to simulate the withTimeout wrapper firing
    mockedGetNetwork.mockImplementation(
      () =>
        new Promise<never>((_resolve, reject) =>
          setTimeout(() => reject(new Error("NETWORK_CHECK_TIMEOUT")), 10),
        ),
    );
    mockedIsMobile.mockReturnValue(false);
  });

  it("shows timeout screen when the network check hangs", async () => {
    renderModal();
    fireEvent.click(screen.getByLabelText("Connect with Freighter"));
    await screen.findByTestId("error-state-network-timeout", undefined, {
      timeout: 3000,
    });
    expect(screen.getByText("Network Check Timed Out")).toBeInTheDocument();
  });
});

// ─── 8. Duplicate request prevention (guard) ─────────────────────────────────

describe("ConnectWalletModal — duplicate request prevention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedIsMobile.mockReturnValue(false);
  });

  it("does not invoke isConnected a second time while one request is in flight", async () => {
    // Set up isConnected to respond immediately so the component reaches the
    // in-flight state (isRequestInFlight.current = true) before the second click.
    mockedIsConnected.mockResolvedValue({ isConnected: true });

    // Make requestAccess hang forever so isRequestInFlight stays true.
    let resolveAccess!: (val: { address: string }) => void;
    mockedRequestAccess.mockImplementation(
      () =>
        new Promise<{ address: string }>((res) => {
          resolveAccess = res;
        }),
    );

    renderModal();

    const freighterBtn = screen.getByLabelText("Connect with Freighter");
    fireEvent.click(freighterBtn);

    // Wait until isConnected was invoked and requestAccess is hanging
    await waitFor(() => expect(mockedIsConnected).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockedRequestAccess).toHaveBeenCalledTimes(1));

    // Second click while requestAccess is still pending — guard must block it
    fireEvent.click(freighterBtn);
    expect(mockedIsConnected).toHaveBeenCalledTimes(1);
    expect(mockedRequestAccess).toHaveBeenCalledTimes(1);

    // Clean up the hanging promise to avoid leaking async work
    resolveAccess({ address: "" });
  });
});

// ─── 9. Hardware wallet flow ──────────────────────────────────────────────────

describe("ConnectWalletModal — hardware wallet flow (desktop)", () => {
  beforeEach(() => {
    mockedIsMobile.mockReturnValue(false);
  });

  it("shows device-searching screen after Hardware Wallet click", () => {
    renderModal();
    fireEvent.click(screen.getByLabelText("Connect with Hardware Wallet"));
    expect(screen.getByTestId("error-state-device-searching")).toBeInTheDocument();
  });

  it("BACK from device-searching returns to wallet list", () => {
    renderModal();
    fireEvent.click(screen.getByLabelText("Connect with Hardware Wallet"));
    expect(screen.getByTestId("error-state-device-searching")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Back to wallet selection list"));
    expect(screen.getByText("Choose your wallet")).toBeInTheDocument();
  });
});

describe("ConnectWalletModal — hardware wallet flow (mobile)", () => {
  beforeEach(() => {
    mockedIsMobile.mockReturnValue(true);
  });

  it("shows mobile-unsupported screen on mobile", () => {
    renderModal();
    fireEvent.click(screen.getByLabelText("Connect with Hardware Wallet"));
    expect(screen.getByTestId("error-state-mobile-unsupported")).toBeInTheDocument();
    expect(screen.getByText("Device Unsupported on Mobile")).toBeInTheDocument();
  });

  it("BACK from mobile-unsupported returns to wallet list", () => {
    renderModal();
    fireEvent.click(screen.getByLabelText("Connect with Hardware Wallet"));
    expect(screen.getByTestId("error-state-mobile-unsupported")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Back to wallet selection list"));
    expect(screen.getByText("Choose your wallet")).toBeInTheDocument();
  });

  it("Connect via WalletConnect button calls onConnectWalletConnect and resets", () => {
    const onConnectWalletConnect = vi.fn();
    renderModal({ onConnectWalletConnect });

    fireEvent.click(screen.getByLabelText("Connect with Hardware Wallet"));
    expect(screen.getByTestId("error-state-mobile-unsupported")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Connect using WalletConnect mobile flow"));
    expect(onConnectWalletConnect).toHaveBeenCalledOnce();
  });
});

// ─── 10. Hardware error states ────────────────────────────────────────────────

describe("ConnectWalletModal — hardware error states (controlled prop)", () => {
  const hwErrors = [
    {
      errorState: "device-locked-error" as const,
      testId: "error-state-device-locked-error",
      title: "Hardware Wallet Locked",
    },
    {
      errorState: "wrong-app-error" as const,
      testId: "error-state-wrong-app-error",
      title: "Stellar App Not Open",
    },
    {
      errorState: "unplugged-error" as const,
      testId: "error-state-unplugged-error",
      title: "Device Disconnected",
    },
  ];

  for (const { errorState, testId, title } of hwErrors) {
    it(`shows ${testId} screen correctly`, () => {
      renderModal({ errorState });
      expect(screen.getByTestId(testId)).toBeInTheDocument();
      expect(screen.getByText(title)).toBeInTheDocument();
    });
  }
});

// ─── 11. Hardware error BACK — machine-driven ────────────────────────────────

describe("ConnectWalletModal — hardware error BACK (machine-driven via QA toolbar)", () => {
  // These tests use the Design QA toolbar to navigate to hw error states via
  // machine events (not the controlled errorState prop) so that send(BACK)
  // actually changes the displayed screen.

  it("device-locked-error: BACK returns to wallet list", () => {
    render(<ConnectWalletModal isOpen={true} onClose={vi.fn()} showStateSwitcher={true} />);
    fireEvent.click(screen.getByRole("button", { name: "HW: Locked" }));
    expect(screen.getByTestId("error-state-device-locked-error")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Back to wallet selection list"));
    expect(screen.getByText("Choose your wallet")).toBeInTheDocument();
  });

  it("wrong-app-error: BACK returns to wallet list", () => {
    render(<ConnectWalletModal isOpen={true} onClose={vi.fn()} showStateSwitcher={true} />);
    fireEvent.click(screen.getByRole("button", { name: "HW: Wrong App" }));
    expect(screen.getByTestId("error-state-wrong-app-error")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Back to wallet selection list"));
    expect(screen.getByText("Choose your wallet")).toBeInTheDocument();
  });

  it("unplugged-error: BACK returns to wallet list", () => {
    render(<ConnectWalletModal isOpen={true} onClose={vi.fn()} showStateSwitcher={true} />);
    fireEvent.click(screen.getByRole("button", { name: "HW: Unplugged" }));
    expect(screen.getByTestId("error-state-unplugged-error")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Back to wallet selection list"));
    expect(screen.getByText("Choose your wallet")).toBeInTheDocument();
  });
});

// ─── 12. Accessibility — keyboard navigation ──────────────────────────────────

describe("ConnectWalletModal — accessibility", () => {
  it("has role=dialog with aria-modal", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("has an accessible title", () => {
    renderModal();
    expect(
      screen.getByRole("dialog", { name: /Choose your wallet/i }),
    ).toBeInTheDocument();
  });

  it("Escape key calls onClose when no request is in flight", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("disabled wallet options have aria-disabled attribute", () => {
    renderModal();
    const albedoBtn = screen.getByLabelText("Albedo — coming soon");
    expect(albedoBtn).toHaveAttribute("aria-disabled", "true");
  });
});

// ─── 13. Design-QA toolbar (showStateSwitcher) ────────────────────────────────

describe("ConnectWalletModal — Design QA toolbar", () => {
  it("toolbar is rendered when showStateSwitcher is true (default)", () => {
    render(<ConnectWalletModal isOpen={true} onClose={noop} />);
    expect(screen.getByTestId("design-qa-toolbar")).toBeInTheDocument();
  });

  it("toolbar is hidden when showStateSwitcher is false", () => {
    renderModal({ showStateSwitcher: false });
    expect(screen.queryByTestId("design-qa-toolbar")).not.toBeInTheDocument();
  });
});
