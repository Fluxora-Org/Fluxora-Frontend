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

let dashboardModule: DeferredModule;
let streamsModule: DeferredModule;
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
  // RequireWallet guards the /app subtree via useWallet; report a connected,
  // finished-restoring wallet so the lazy app routes render in these tests.
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

vi.mock("./pages/Landing", () => ({
  default: () => <h1>Landing route</h1>,
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
vi.mock("./pages/Recipient", () => recipientModule.promise);
vi.mock("./pages/TreasuryPage", () => treasuryModule.promise);
vi.mock("./pages/EmptyStateDemo", () => emptyStateModule.promise);

describe("App route code splitting", () => {
  beforeEach(() => {
    dashboardModule = createDeferredPage("Dashboard lazy route");
    streamsModule = createDeferredPage("Streams lazy route");
    recipientModule = createDeferredPage("Recipient lazy route");
    treasuryModule = createDeferredPage("Treasury lazy route");
    emptyStateModule = createDeferredPage("Empty state lazy route");

    window.history.pushState({}, "", "/");
  });

  it("keeps the public home route eager", () => {
    render(<App />);

    expect(
      screen.queryByRole("status", { name: "Loading app page" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Home route" }),
    ).toBeInTheDocument();
  });

  it("shows a Suspense fallback before resolving the /app dashboard chunk", async () => {
    window.history.pushState({}, "", "/app");

    render(<App />);

    expect(
      screen.getByRole("status", { name: "Loading app page" }),
    ).toBeInTheDocument();

    dashboardModule.resolve();

    expect(await screen.findByText("Dashboard lazy route")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole("status", { name: "Loading app page" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("lazy-loads deep app routes such as stream details", async () => {
    window.history.pushState({}, "", "/app/streams/stream-123");

    render(<App />);

    expect(
      screen.getByRole("status", { name: "Loading app page" }),
    ).toBeInTheDocument();

    streamsModule.resolve();

    expect(await screen.findByText("Streams lazy route")).toBeInTheDocument();
  });
});

describe("App landing routes", () => {
  beforeEach(() => {
    dashboardModule = createDeferredPage("Dashboard lazy route");
    streamsModule = createDeferredPage("Streams lazy route");
    recipientModule = createDeferredPage("Recipient lazy route");
    treasuryModule = createDeferredPage("Treasury lazy route");
    emptyStateModule = createDeferredPage("Empty state lazy route");
  });

  it("redirects /landing to the canonical root landing page", async () => {
    window.history.pushState({}, "", "/landing");

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Home route" }),
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe("/");
    });
  });
});
