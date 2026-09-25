import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

type DeferredModule = {
  promise: Promise<{ default: () => JSX.Element }>;
  resolve: () => void;
};

function createDeferredPage(label: string): DeferredModule {
  let resolve!: () => void;
  const promise = new Promise<{ default: () => JSX.Element }>((done) => {
    resolve = () => done({ default: () => <div>{label}</div> });
  });

  return { promise, resolve };
}

vi.mock("./utils/env", () => ({
  get IS_DEV() {
    return (globalThis as any).mockIsDev !== false;
  },
}));

let dashboardModule: DeferredModule;
let streamsModule: DeferredModule;
let streamDetailModule: DeferredModule;
let recipientModule: DeferredModule;
let treasuryModule: DeferredModule;
let emptyStateModule: DeferredModule;

vi.mock("./components/navigation/AppNavbar", () => ({
  default: () => <nav aria-label="Global navigation">Fluxora nav</nav>,
}));

vi.mock("./components/Layout", async () => {
  const { Outlet } =
    await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    default: () => (
      <main id="main-content">
        <Outlet />
      </main>
    ),
  };
});

vi.mock("./components/wallet-connect/Walletcontext", () => ({
  WalletProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useWallet: () => ({
    address: "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN",
    network: "TESTNET",
    connected: true,
    loading: false,
    error: null,
    expectedNetwork: "TESTNET",
    expectedNetworkLabel: "Testnet",
    isNetworkMismatch: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock("./pages/Home", () => ({
  default: () => <h1>Home route</h1>,
}));

vi.mock("./pages/ConnectWallet", () => ({
  default: () => <h1>Connect wallet route</h1>,
}));

vi.mock("./pages/ErrorPage", () => ({
  default: () => <h1>Error route</h1>,
}));

vi.mock("./pages/NotFound", () => ({
  default: () => <h1>Not found route</h1>,
}));

vi.mock("./pages/Dashboard", () => dashboardModule.promise);
vi.mock("./pages/Streams", () => streamsModule.promise);
vi.mock("./pages/StreamDetail", () => streamDetailModule.promise);
vi.mock("./pages/Recipient", () => recipientModule.promise);
vi.mock("./pages/TreasuryPage", () => treasuryModule.promise);
vi.mock("./pages/EmptyStateDemo", () => emptyStateModule.promise);

/**
 * Assert unmatched paths reach NotFound rather than a blank Layout Outlet.
 * Covers top-level, nested /app, and deep nested unknown segments.
 */
describe("App unmatched routes reach NotFound", () => {
  beforeEach(() => {
    dashboardModule = createDeferredPage("Dashboard lazy route");
    streamsModule = createDeferredPage("Streams lazy route");
    streamDetailModule = createDeferredPage("Stream detail lazy route");
    recipientModule = createDeferredPage("Recipient lazy route");
    treasuryModule = createDeferredPage("Treasury lazy route");
    emptyStateModule = createDeferredPage("Empty state lazy route");
    (globalThis as any).mockIsDev = true;
  });

  const unmatchedPaths = [
    "/totally-unknown-route",
    "/does/not/exist",
    "/app/unknown-subpath",
    "/app/foo/bar/baz",
    "/app/streams/extra/nested/unknown",
    "/app/recipient/extra-segment",
  ] as const;

  it.each(unmatchedPaths)(
    "renders the not-found page for unmatched path %s",
    async (path) => {
      window.history.pushState({}, "", path);
      render(<App />);

      expect(
        await screen.findByRole("heading", { name: "Not found route" }),
      ).toBeInTheDocument();

      // Must not leave a blank main with no route content.
      await waitFor(() => {
        expect(screen.queryByText("Dashboard lazy route")).not.toBeInTheDocument();
      });
    },
  );

  it("keeps known /app routes from falling through to NotFound", async () => {
    window.history.pushState({}, "", "/app");
    render(<App />);
    dashboardModule.resolve();
    expect(await screen.findByText("Dashboard lazy route")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Not found route" }),
    ).not.toBeInTheDocument();
  });
});
