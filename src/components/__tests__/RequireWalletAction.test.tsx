import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import RequireWalletAction from "../RequireWalletAction";

const walletState = vi.hoisted(() => ({
  connected: false,
  loading: false,
  address: null as string | null,
  network: null as string | null,
  isNetworkMismatch: false,
}));

vi.mock("../wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    ...walletState,
    error: null,
    expectedNetwork: "TESTNET",
    expectedNetworkLabel: "Testnet",
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

function LocationProbe() {
  const location = useLocation();

  const state = location.state as { returnTo?: string } | null;

  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
      {state?.returnTo ? ` returnTo=${state.returnTo}` : ""}
    </output>
  );
}

function renderGuard(
  initialPath = "/app/streams?status=active#row-1",
) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/app/*"
          element={
            <RequireWalletAction>
              <div>Protected money-moving route</div>
            </RequireWalletAction>
          }
        />

        <Route path="/connect-wallet" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireWalletAction", () => {
  beforeEach(() => {
    walletState.connected = false;
    walletState.loading = false;
    walletState.address = null;
    walletState.network = null;
    walletState.isNetworkMismatch = false;
  });

  it("waits while the wallet session is being restored", () => {
    walletState.loading = true;

    renderGuard();

    expect(
      screen.getByText("Restoring wallet session..."),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Protected money-moving route"),
    ).not.toBeInTheDocument();
  });

  it("redirects disconnected users to connect-wallet", () => {
    renderGuard();

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/connect-wallet",
    );
  });

  it("preserves the intended route when redirecting disconnected users", () => {
    renderGuard("/app/streams?status=active#row-1");

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/connect-wallet",
    );

    expect(screen.getByTestId("location")).toHaveTextContent(
      "returnTo=/app/streams?status=active#row-1",
    );
  });

  it("blocks money-moving routes when the wallet is on the wrong network", () => {
    walletState.connected = true;
    walletState.address =
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    walletState.network = "MAINNET";
    walletState.isNetworkMismatch = true;

    renderGuard();

    expect(screen.getByRole("alert")).toBeInTheDocument();

    expect(screen.getByRole("heading", {
      name: "Wrong network",
    })).toBeInTheDocument();

    expect(
      screen.queryByText("Protected money-moving route"),
    ).not.toBeInTheDocument();
  });

  it("renders the protected route when the wallet is connected to the expected network", () => {
    walletState.connected = true;
    walletState.address =
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    walletState.network = "TESTNET";
    walletState.isNetworkMismatch = false;

    renderGuard();

    expect(
      screen.getByText("Protected money-moving route"),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("heading", {
        name: "Wrong network",
      }),
    ).not.toBeInTheDocument();
  });

  it("does not render protected content while disconnected", () => {
    renderGuard();

    expect(
      screen.queryByText("Protected money-moving route"),
    ).not.toBeInTheDocument();
  });
});