import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import RequireWallet from "../RequireWallet";

const walletState = vi.hoisted(() => ({
  connected: false,
  loading: false,
  address: null as string | null,
  network: null as string | null,
}));

vi.mock("../wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    ...walletState,
    error: null,
    expectedNetwork: "TESTNET",
    expectedNetworkLabel: "Testnet",
    isNetworkMismatch: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

function LocationProbe() {
  const location = useLocation();
  const state = location.state as { returnTo?: string } | null;

  return (
    <output>
      {location.pathname}
      {location.search}
      {state?.returnTo ? ` returnTo=${state.returnTo}` : ""}
    </output>
  );
}

function renderGuard(initialPath = "/app/streams?status=active#row-1") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/app/*"
          element={
            <RequireWallet>
              <div>Protected app</div>
            </RequireWallet>
          }
        />
        <Route path="/connect-wallet" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireWallet", () => {
  it("redirects disconnected users to connect-wallet with returnTo state", () => {
    walletState.connected = false;
    walletState.loading = false;

    renderGuard();

    expect(
      screen.getByText("/connect-wallet returnTo=/app/streams?status=active#row-1"),
    ).toBeInTheDocument();
  });

  it("renders protected content for connected users", () => {
    walletState.connected = true;
    walletState.loading = false;

    renderGuard("/app/recipient");

    expect(screen.getByText("Protected app")).toBeInTheDocument();
  });

  it("waits during silent wallet restore without redirecting", () => {
    walletState.connected = false;
    walletState.loading = true;

    renderGuard("/app");

    expect(screen.getByRole("status")).toHaveTextContent(
      "Restoring wallet session...",
    );
    expect(screen.queryByText("/connect-wallet")).not.toBeInTheDocument();
  });
});
