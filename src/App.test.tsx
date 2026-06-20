import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn().mockResolvedValue({ isConnected: false }),
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  WatchWalletChanges: vi.fn().mockImplementation(() => ({
    watch: vi.fn(),
    stop: vi.fn(),
  })),
}));

vi.mock("./components/navigation/AppNavbar", () => ({
  default: () => <nav aria-label="Mock navigation">Fluxora</nav>,
}));

vi.mock("./pages/Home", () => ({
  default: () => <main id="main-content">Canonical landing page</main>,
}));

vi.mock("./pages/Dashboard", () => ({
  default: () => <main>Dashboard</main>,
}));

vi.mock("./pages/Streams", () => ({
  default: () => <main>Streams</main>,
}));

vi.mock("./pages/Recipient", () => ({
  default: () => <main>Recipient</main>,
}));

vi.mock("./pages/ConnectWallet", () => ({
  default: () => <main>Connect wallet</main>,
}));

vi.mock("./pages/ErrorPage", () => ({
  default: () => <main>Error page</main>,
}));

vi.mock("./pages/NotFound", () => ({
  default: () => <main>Not found</main>,
}));

vi.mock("./pages/TreasuryPage", () => ({
  default: () => <main>Treasury page</main>,
}));

vi.mock("./pages/EmptyStateDemo", () => ({
  default: () => <main>Empty state demo</main>,
}));

describe("App landing routes", () => {
  it("redirects /landing to the canonical root landing page", async () => {
    window.history.pushState({}, "", "/landing");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/canonical landing page/i)).toBeInTheDocument();
      expect(window.location.pathname).toBe("/");
    });
  });
});
