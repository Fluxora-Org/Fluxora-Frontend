import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import ConnectWallet from "./ConnectWallet";
import RequireWallet from "../components/RequireWallet";

// Mutable wallet state shared by the mocked context so individual tests can
// flip `connected`/`loading` to exercise the redirect + post-connect flow.
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

/**
 * Renders a gated app route via RequireWallet so we can assert the redirect to
 * /connect-wallet preserves the original path in the navigation `returnTo`.
 */
function renderGatedRoute(initialPath: string) {
  function ReturnToProbe() {
    const location = useLocation();
    const state = location.state as { returnTo?: string } | null;
    return <output data-testid="return-to">{state?.returnTo ?? ""}</output>;
  }

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/app/*"
          element={
            <RequireWallet>
              <div>Protected content</div>
            </RequireWallet>
          }
        />
        <Route path="/connect-wallet" element={<ReturnToProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ConnectWallet return destination", () => {
  beforeEach(() => {
    walletState.connected = true;
    walletState.loading = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns connected users to the preserved app route", () => {
    renderConnectWallet("/app/streams?status=active");

    expect(screen.getByText("/app/streams?status=active")).toBeInTheDocument();
  });

  it("navigates to the returnTo path after a successful connect", () => {
    renderConnectWallet("/app/treasury");

    // ConnectWallet reads returnTo from location.state and redirects there as
    // soon as the wallet context reports `connected`.
    expect(screen.getByText("/app/treasury")).toBeInTheDocument();
  });

  it("falls back to /app when returnTo is missing", () => {
    renderConnectWallet();

    expect(screen.getByText("/app")).toBeInTheDocument();
  });

  it("falls back to /app when returnTo is an external URL (open redirect)", () => {
    renderConnectWallet("https://example.com/phish");

    expect(screen.getByText("/app")).toBeInTheDocument();
  });

  it("falls back to /app for protocol-relative returnTo values", () => {
    renderConnectWallet("//evil.com");

    expect(screen.getByText("/app")).toBeInTheDocument();
  });
});

describe("RequireWallet -> ConnectWallet returnTo integration", () => {
  beforeEach(() => {
    walletState.loading = false;
  });

  it("encodes the original path as returnTo when redirecting an unauthenticated user", () => {
    walletState.connected = false;
    renderGatedRoute("/app/streams?status=active");

    expect(screen.getByTestId("return-to")).toHaveTextContent(
      "/app/streams?status=active",
    );
  });

  it("renders the protected route when the wallet is connected", () => {
    walletState.connected = true;
    renderGatedRoute("/app/dashboard");

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
