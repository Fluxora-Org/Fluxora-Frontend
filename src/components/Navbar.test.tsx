import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Navbar from "./Navbar";

const walletState = vi.hoisted(() => ({
  address: null as string | null,
  network: null as string | null,
  connected: false,
  loading: false,
  error: null as { type: string } | null,
  expectedNetwork: "TESTNET",
  expectedNetworkLabel: "Testnet",
  isNetworkMismatch: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
}));

const freighter = vi.hoisted(() => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getNetwork: vi.fn(),
}));

vi.mock("./wallet-connect/Walletcontext", () => ({
  useWallet: () => walletState,
}));

vi.mock("@stellar/freighter-api", () => freighter);

const CONNECTED_ADDRESS =
  "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  );
}

describe("Navbar wallet states", () => {
  beforeEach(() => {
    Object.assign(walletState, {
      address: null,
      network: null,
      connected: false,
      loading: false,
      error: null,
      expectedNetwork: "TESTNET",
      expectedNetworkLabel: "Testnet",
      isNetworkMismatch: false,
    });
    freighter.isConnected.mockReset();
    freighter.requestAccess.mockReset();
    freighter.getNetwork.mockReset();
  });

  afterEach(() => {
    document.getElementById("navbar-animation-styles")?.remove();
  });

  it("shows a loading status while restoring the wallet session", () => {
    walletState.loading = true;

    renderNavbar();

    expect(
      screen.getByRole("navigation", { name: "Main navigation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "Loading wallet…" }),
    ).toBeVisible();
  });

  it("offers wallet connection when there is no active session", () => {
    renderNavbar();

    expect(
      screen.getByRole("navigation", { name: "Main navigation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Connect wallet" }),
    ).toBeVisible();
  });

  it("shows the connection rejection explanation when Freighter denies access", async () => {
    const user = userEvent.setup();
    freighter.isConnected.mockResolvedValue({ isConnected: true });
    freighter.requestAccess.mockResolvedValue({
      address: "",
      error: { message: "User rejected request" },
    });

    renderNavbar();

    await user.click(screen.getByRole("button", { name: "Connect wallet" }));
    await user.click(screen.getByLabelText("Connect with Freighter"));

    expect(await screen.findByText("Connection Rejected")).toBeVisible();
    expect(
      screen.getByText(
        "The connection was declined in your wallet extension. To interact with Fluxora, please grant permission to view your Stellar public key. No funds can be accessed without your explicit signature.",
      ),
    ).toBeVisible();
  });

  it("shows the connected wallet address and network", () => {
    walletState.address = CONNECTED_ADDRESS;
    walletState.network = "TESTNET";
    walletState.connected = true;

    renderNavbar();

    expect(screen.getByText("GATDOS...LOWN")).toBeVisible();
    expect(screen.getByText("TESTNET")).toBeVisible();
  });
});
