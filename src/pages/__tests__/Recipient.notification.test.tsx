import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../components/toast/ToastProvider";
import Recipient from "../Recipient";

vi.mock("../../components/wallet-connect/Walletcontext", () => ({
  useWallet: () => ({ connected: true, address: "GABC", network: "TESTNET", isNetworkMismatch: false, expectedNetworkLabel: "Testnet" }),
}));
vi.mock("../../components/treasuryOverviewPage/useTreasury", () => ({
  useRecipientStreams: () => ({
    streams: [{ id: "1", status: "Active", withdrawableAmount: 10, streamedAmount: 20 }],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock("../../lib/stellar/tx", () => ({ withdraw: vi.fn() }));

describe("Recipient notification permission UX", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not request permission until the explicit allow action", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    Object.defineProperty(window, "Notification", { configurable: true, value: { permission: "default", requestPermission } });
    render(
      <MemoryRouter>
        <ToastProvider>
          <Recipient />
        </ToastProvider>
      </MemoryRouter>,
    );
    act(() => vi.advanceTimersByTime(2000));

    expect(requestPermission).not.toHaveBeenCalled();
    // Component is fully rendered after the timer flush — use synchronous getByRole
    fireEvent.click(screen.getByRole("button", { name: "Notify me" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(requestPermission).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /allow stream alerts/i }));
    await act(async () => { await Promise.resolve(); });
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it("keeps dismissed priming in-app and exposes a recovery hint when denied", async () => {
    const requestPermission = vi.fn().mockResolvedValue("denied");
    Object.defineProperty(window, "Notification", { configurable: true, value: { permission: "default", requestPermission } });
    render(
      <MemoryRouter>
        <ToastProvider>
          <Recipient />
        </ToastProvider>
      </MemoryRouter>,
    );
    act(() => vi.advanceTimersByTime(2000));
    fireEvent.click(screen.getByRole("button", { name: "Notify me" }));
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    // Open priming dialog again, then allow — dialog must open before the allow button is accessible
    fireEvent.click(screen.getByRole("button", { name: "Notify me" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /allow stream alerts/i }));
      await Promise.resolve();
    });

    expect(screen.getByText(/Permission is blocked by your browser/i)).toBeInTheDocument();
  });
});