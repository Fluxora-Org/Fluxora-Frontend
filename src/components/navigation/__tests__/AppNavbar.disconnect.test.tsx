import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppNavbar from "../AppNavbar";
import { ThemeProvider } from "../../../theme/ThemeProvider";

const disconnect = vi.fn();
let walletState = {
  connected: true,
  address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890" as string | undefined,
  network: "TESTNET" as string | undefined,
};

vi.mock("../../wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    ...walletState,
    loading: false,
    error: null,
    expectedNetwork: "TESTNET",
    expectedNetworkLabel: "Testnet",
    isNetworkMismatch: false,
    disconnect,
  }),
}));

vi.mock("react-router-dom", () => ({
  Link: ({
    children,
    to,
    ...props
  }: React.PropsWithChildren<{ to: string; [key: string]: unknown }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: "/app" }),
}));

function renderNavbar() {
  return render(
    <ThemeProvider>
      <AppNavbar />
    </ThemeProvider>,
  );
}

describe("AppNavbar wallet disconnect flow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    disconnect.mockReset();
    walletState = {
      connected: true,
      address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890",
      network: "TESTNET",
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("requires confirmation before disconnecting and returns focus to the wallet trigger", () => {
    renderNavbar();
    act(() => vi.runAllTimers());

    const walletTrigger = screen.getByRole("button", {
      name: /wallet gabcde.*open wallet options/i,
    });

    fireEvent.click(walletTrigger);
    fireEvent.click(screen.getByRole("menuitem", { name: /^disconnect$/i }));

    expect(disconnect).not.toHaveBeenCalled();
    expect(screen.getByText("Disconnect wallet?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(disconnect).not.toHaveBeenCalled();
    expect(screen.getByRole("menuitem", { name: /^disconnect$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: /^disconnect$/i }));
    fireEvent.click(screen.getByRole("button", { name: /disconnect wallet/i }));

    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(walletTrigger).toHaveFocus();
    expect(
      screen.getByText("Wallet disconnected. Use Connect Wallet to reconnect."),
    ).toBeInTheDocument();
  });

  it("shows the canonical connect-wallet affordance after disconnect", () => {
    const { rerender } = renderNavbar();
    act(() => vi.runAllTimers());

    fireEvent.click(
      screen.getByRole("button", {
        name: /wallet gabcde.*open wallet options/i,
      }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: /^disconnect$/i }));
    fireEvent.click(screen.getByRole("button", { name: /disconnect wallet/i }));

    walletState = {
      connected: false,
      address: "",
      network: undefined,
    };

    rerender(
      <ThemeProvider>
        <AppNavbar />
      </ThemeProvider>,
    );
    act(() => vi.runAllTimers());

    const connectWallet = screen.getByRole("link", {
      name: /connect your stellar wallet/i,
    });
    expect(connectWallet).toHaveAttribute("href", "/connect-wallet");
  });
});
