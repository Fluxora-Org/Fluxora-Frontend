import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./utils/env", () => ({
  get IS_DEV() {
    return (globalThis as any).mockIsDev !== false;
  },
}));

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

vi.mock("./pages/Landing", () => ({
  default: () => <h1>Landing route</h1>,
}));

vi.mock("./pages/ConnectWallet", () => ({
  default: () => <h1>Connect wallet route</h1>,
}));

vi.mock("./pages/NotFound", () => ({
  default: () => <h1>Not found route</h1>,
}));

const DASHBOARD_ERROR = "Chunk load failed: Dashboard lazy route";
let dashboardShouldFail = true;

vi.mock("./pages/Dashboard", () => ({
  default: () => {
    if (dashboardShouldFail) {
      throw new Error(DASHBOARD_ERROR);
    }
    return <div>Dashboard lazy route</div>;
  },
}));

vi.mock("./pages/Streams", () => ({
  default: () => <div>Streams lazy route</div>,
}));

vi.mock("./pages/Recipient", () => ({
  default: () => <div>Recipient lazy route</div>,
}));

vi.mock("./pages/TreasuryPage", () => ({
  default: () => <div>Treasury lazy route</div>,
}));

vi.mock("./pages/EmptyStateDemo", () => ({
  default: () => <div>Empty state lazy route</div>,
}));

describe("App route-level error recovery for lazy-loaded pages", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  const preventExpectedRenderError = (event: ErrorEvent) => {
    if (event.error?.message?.includes(DASHBOARD_ERROR)) {
      event.preventDefault();
    }
  };

  beforeEach(() => {
    dashboardShouldFail = true;
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    window.addEventListener("error", preventExpectedRenderError);
    window.history.pushState({}, "", "/app");
  });

  afterEach(() => {
    dashboardShouldFail = false;
    consoleErrorSpy.mockRestore();
    window.removeEventListener("error", preventExpectedRenderError);
  });

  it("renders a stable error fallback when a lazy chunk import fails", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("alert"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /back to dashboard/i }),
    ).toBeInTheDocument();
  });

  it("does not display stale route content after a lazy chunk import fails", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: /something went wrong/i });

    expect(screen.queryByText("Dashboard lazy route")).not.toBeInTheDocument();
  });

  it("retries the failed route when the user clicks Try Again", async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByRole("heading", { name: /something went wrong/i });

    dashboardShouldFail = false;

    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(
      await screen.findByText("Dashboard lazy route"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /something went wrong/i }),
    ).not.toBeInTheDocument();
  });

  it("navigates away from the error fallback when Back to Dashboard is clicked", async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByRole("heading", { name: /something went wrong/i });

    dashboardShouldFail = false;

    await user.click(screen.getByRole("button", { name: /back to dashboard/i }));

    expect(
      await screen.findByText("Dashboard lazy route"),
    ).toBeInTheDocument();
  });
});
