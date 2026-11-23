import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Dashboard from "./pages/Dashboard";
import Streams from "./pages/Streams";
import Recipient from "./pages/Recipient";
import ConnectWallet from "./pages/ConnectWallet";
import ErrorPage from "./pages/ErrorPage";
import NotFound from "./pages/NotFound";
import Home from "./pages/Home";
import TreasuryPage from "./pages/TreasuryPage";

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock hooks to prevent unhandled promises or context requirements
vi.mock("./components/wallet-connect/Walletcontext", () => ({
  useWallet: () => ({ connected: false, address: null }),
  WalletProvider: ({ children }: any) => <div>{children}</div>
}));
vi.mock("./components/treasuryOverviewPage/useTreasury", () => ({
  useTreasury: () => ({ streams: [], loading: false, error: null, refetch: vi.fn() }),
  useRecipientStreams: () => ({ streams: [], loading: false, error: null, refetch: vi.fn() })
}));
vi.mock("./hooks/useLiveAnnouncer", () => ({
  useLiveAnnouncer: () => ({ announcement: "", announce: vi.fn() })
}));
vi.mock("./components/toast/ToastProvider", () => ({
  useToast: () => ({ addToast: vi.fn() }),
  useOptionalToast: () => ({ addToast: vi.fn() }),
  ToastProvider: ({ children }: any) => <div>{children}</div>
}));
vi.mock("./theme/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light" }),
  useOptionalTheme: () => ({ theme: "light" }),
  ThemeProvider: ({ children }: any) => <div>{children}</div>
}));

function renderWithRouter(initialEntry: string, element: React.ReactElement) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        {element}
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe("Route Metadata", () => {
  it("updates metadata for Home route", async () => {
    renderWithRouter("/", <Home />);
    await waitFor(() => {
      expect(document.title).toBe("Home \u2013 Fluxora");
    });
  });

  it("updates metadata for Dashboard route", async () => {
    renderWithRouter("/app", <Dashboard />);
    await waitFor(() => {
      expect(document.title).toBe("Dashboard \u2013 Fluxora");
    });
  });

  it("updates metadata for Streams route", async () => {
    renderWithRouter("/app/streams", <Streams />);
    await waitFor(() => {
      expect(document.title).toBe("Streams \u2013 Fluxora");
    });
  });

  it("updates metadata for Recipient route", async () => {
    renderWithRouter("/app/recipient", <Recipient />);
    await waitFor(() => {
      expect(document.title).toBe("Recipient \u2013 Fluxora");
    });
  });

  it("updates metadata for Connect Wallet route", async () => {
    renderWithRouter("/connect-wallet", <ConnectWallet />);
    await waitFor(() => {
      expect(document.title).toBe("Connect Wallet \u2013 Fluxora");
    });
  });

  it("updates metadata for Error route", async () => {
    renderWithRouter("/app/error", <ErrorPage />);
    await waitFor(() => {
      expect(document.title).toBe("Error \u2013 Fluxora");
    });
  });

  it("updates metadata for Not Found route", async () => {
    renderWithRouter("/random-path", <NotFound />);
    await waitFor(() => {
      expect(document.title).toBe("Page Not Found \u2013 Fluxora");
    });
  });

  it("updates metadata for Treasury route", async () => {
    renderWithRouter("/app/treasurypage", <TreasuryPage />);
    await waitFor(() => {
      expect(document.title).toBe("Treasury Overview \u2013 Fluxora");
    });
  });

  it("updates metadata on navigation", async () => {
    // Add missing mock hook to allow React Router internal navigation properly, or simply rely on standard DOM links if mocked appropriately.
    // Testing navigation in a mock environment without full App wrapper can be complex due to context missing, so we'll just assert what's strictly possible.
    // The previous tests already successfully proved metadata changes across different route components.
    // I'll render a simple router config simulating user navigation via Link
    const { Link } = await import("react-router-dom");
    const { fireEvent } = await import("@testing-library/react");
    
    const { getByText } = render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={
              <div>
                <Home />
                <Link to="/app">Go Dashboard</Link>
              </div>
            } />
            <Route path="/app" element={<Dashboard />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    );

    await waitFor(() => {
      expect(document.title).toBe("Home \u2013 Fluxora");
    });

    fireEvent.click(getByText("Go Dashboard"));

    await waitFor(() => {
      expect(document.title).toBe("Dashboard \u2013 Fluxora");
    });
  });
});
