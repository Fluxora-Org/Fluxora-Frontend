import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GetStartedCTA from "../GetStartedCTA";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// File-level mock takes precedence over the global disconnected-wallet default
// in src/test/setup.ts, so this suite exercises the already-connected branch.
vi.mock("../wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    connected: true,
    loading: false,
  }),
  WalletProvider: ({ children }: { children: any }) => children,
}));

describe("GetStartedCTA when a wallet is already connected", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('keeps the "Launch dashboard" label and deep-links to the dashboard', async () => {
    const user = userEvent.setup();
    render(<GetStartedCTA />);

    const primaryButton = screen.getByRole("button", {
      name: /launch dashboard/i,
    });
    expect(primaryButton).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /connect wallet to launch/i }),
    ).not.toBeInTheDocument();

    await user.click(primaryButton);

    expect(mockNavigate).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });
});