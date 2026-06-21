import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import ConnectWallet from "./ConnectWallet";

const walletState = vi.hoisted(() => ({
  connected: true,
  loading: false,
  address: "GCONNECTED",
  network: "TESTNET",
}));

vi.mock("../components/wallet-connect/Walletcontext", () => ({
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

function PathProbe() {
  const location = useLocation();
  return <output>{location.pathname + location.search}</output>;
}

function renderConnectWallet(returnTo?: string) {
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/connect-wallet",
          state: returnTo ? { returnTo } : undefined,
        },
      ]}
    >
      <Routes>
        <Route path="/connect-wallet" element={<ConnectWallet />} />
        <Route path="/app/*" element={<PathProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ConnectWallet return destination", () => {
  it("returns connected users to the preserved app route", () => {
    renderConnectWallet("/app/streams?status=active");

    expect(screen.getByText("/app/streams?status=active")).toBeInTheDocument();
  });

  it("falls back to /app when returnTo is not an app route", () => {
    renderConnectWallet("https://example.com/phish");

    expect(screen.getByText("/app")).toBeInTheDocument();
  });
});
