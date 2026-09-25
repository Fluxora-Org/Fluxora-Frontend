/**
 * Regression coverage for #1664 — wallet-gated routes must not flash protected
 * content before the guard resolves and redirects.
 *
 * These tests go one step further than asserting the settled DOM: they count
 * renders of the protected subtree. "Does not flash" means the protected
 * component was never invoked at all — not merely absent from the DOM after
 * React Router's `<Navigate>` effect has run.
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import RequireWallet from "../RequireWallet";

const walletState = vi.hoisted(() => ({
  connected: false,
  loading: true,
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

vi.mock("../WalletFallback", () => ({
  default: ({ stage }: { stage?: string }) => (
    <div data-testid="wallet-fallback" data-stage={stage} />
  ),
}));

const protectedRenders = vi.hoisted(() => ({ count: 0 }));

function ProtectedContent() {
  protectedRenders.count += 1;
  return <div data-testid="protected">Protected app</div>;
}

function ConnectProbe() {
  const location = useLocation();
  return <output data-testid="connect-flow">{location.pathname}</output>;
}

function renderGatedRoute(initialPath = "/app/streams") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/app/*"
          element={
            <RequireWallet>
              <ProtectedContent />
            </RequireWallet>
          }
        />
        <Route path="/connect-wallet" element={<ConnectProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  protectedRenders.count = 0;
  walletState.connected = false;
  walletState.loading = true;
  walletState.address = null;
  walletState.network = null;
});

describe("RequireWallet first paint (#1664)", () => {
  it("never renders protected content while the wallet session is still restoring", () => {
    walletState.loading = true;
    walletState.connected = false;

    const { container } = renderGatedRoute();

    // The strongest form of the invariant: the protected subtree was never
    // invoked, so there was no frame in which it could flash.
    expect(protectedRenders.count).toBe(0);
    expect(screen.queryByTestId("protected")).toBeNull();
    expect(container.textContent).not.toContain("Protected app");

    // The user sees a restoring indicator instead of the protected view.
    const fallback = screen.getByTestId("wallet-fallback");
    expect(fallback).toHaveAttribute("data-stage", "restoring");
  });

  it("does not redirect to the connect flow while the guard is still resolving", () => {
    walletState.loading = true;
    walletState.connected = false;

    renderGatedRoute();

    expect(screen.queryByTestId("connect-flow")).toBeNull();
    expect(screen.queryByText("/connect-wallet")).toBeNull();
  });

  it("never renders protected content for a disconnected visitor and redirects to the connect flow", () => {
    walletState.loading = false;
    walletState.connected = false;

    renderGatedRoute("/app/treasurypage?tab=overview");

    expect(protectedRenders.count).toBe(0);
    expect(screen.queryByTestId("protected")).toBeNull();

    // Guards against the DOM retaining a detached copy of the protected view:
    // if the subtree had ever rendered, this would still find it.
    expect(
      document.body.querySelector('[data-testid="protected"]'),
    ).toBeNull();

    // The redirect target is the connect flow.
    expect(screen.getByTestId("connect-flow")).toHaveTextContent(
      "/connect-wallet",
    );
  });

  it("renders protected content once the guard resolves as connected (control)", () => {
    walletState.loading = false;
    walletState.connected = true;

    renderGatedRoute();

    expect(protectedRenders.count).toBeGreaterThan(0);
    expect(screen.getByTestId("protected")).toBeInTheDocument();
  });
});
