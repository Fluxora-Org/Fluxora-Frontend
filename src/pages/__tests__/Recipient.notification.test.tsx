import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Recipient from "../Recipient";

vi.mock("../../components/wallet-connect/Walletcontext", () => ({
  useWallet: () => ({ connected: true, address: "GABC", network: "TESTNET", isNetworkMismatch: false, expectedNetworkLabel: "Testnet" }),
}));
vi.mock("../../components/treasuryOverviewPage/useTreasury", () => ({
  useRecipientStreams: () => ({ streams: [{ id: "1", status: "Active", withdrawableAmount: 10, streamedAmount: 20 }]}),
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

  it("does not request permission until the explicit allow action", () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    Object.defineProperty(window, "Notification", { configurable: true, value: { permission: "default", requestPermission } });
    render(<Recipient />);
    act(() => vi.advanceTimersByTime(2000));

    expect(requestPermission).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Notify me" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(requestPermission).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Allow stream alerts" }));
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it("keeps dismissed priming in-app and exposes a recovery hint when denied", async () => {
    const requestPermission = vi.fn().mockResolvedValue("denied");
    Object.defineProperty(window, "Notification", { configurable: true, value: { permission: "default", requestPermission } });
    render(<Recipient />);
    act(() => vi.advanceTimersByTime(2000));
    fireEvent.click(screen.getByRole("button", { name: "Notify me" }));
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Notify me" }));
    fireEvent.click(screen.getByRole("button", { name: "Allow stream alerts" }));
    expect(await screen.findByText(/Permission is blocked by your browser/i)).toBeInTheDocument();
  });
});