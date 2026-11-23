import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionRecoveryBanner } from "../SessionRecoveryBanner";
import { saveSession } from "../../lib/sessionRecovery";

let currentAddress: string | null = null;
vi.mock("../wallet-connect/Walletcontext", () => ({
  useWallet: () => ({ address: currentAddress }), // ADAPT to the real shape
}));

const ACCOUNT_A = "GA_ACCOUNT_A";
const ACCOUNT_B = "GB_ACCOUNT_B";
const offer = () => screen.queryByText(/restore your previous session/i);

describe("SessionRecoveryBanner account scoping", () => {
  beforeEach(() => {
    localStorage.clear();
    currentAddress = null;
  });

  it("offers recovery to the account that created the session", () => {
    saveSession(ACCOUNT_A, { draft: "a" });
    currentAddress = ACCOUNT_A;
    render(<SessionRecoveryBanner onRestore={vi.fn()} />);
    expect(offer()).toBeInTheDocument();
  });

  it("offers nothing after switching accounts, and discards silently", () => {
    saveSession(ACCOUNT_A, { draft: "a" });
    currentAddress = ACCOUNT_A;
    const { rerender } = render(<SessionRecoveryBanner onRestore={vi.fn()} />);
    expect(offer()).toBeInTheDocument();

    currentAddress = ACCOUNT_B; // switch accounts
    rerender(<SessionRecoveryBanner onRestore={vi.fn()} />);

    expect(offer()).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument(); // silent, not an error
    expect(localStorage.length).toBe(0); // A's snapshot was discarded

    currentAddress = ACCOUNT_A; // switching back must not resurrect it
    rerender(<SessionRecoveryBanner onRestore={vi.fn()} />);
    expect(offer()).not.toBeInTheDocument();
  });

  it("never passes another account's state to onRestore", async () => {
    const onRestore = vi.fn();
    saveSession(ACCOUNT_A, { secret: "a-only" });
    currentAddress = ACCOUNT_B;
    render(<SessionRecoveryBanner onRestore={onRestore} />);
    expect(screen.queryByRole("button", { name: /restore/i })).not.toBeInTheDocument();
    expect(onRestore).not.toHaveBeenCalled();
  });

  it("rejects a snapshot copied under another account's key", () => {
    saveSession(ACCOUNT_A, { draft: "a" });
    const [key] = Object.keys(localStorage);
    const payload = localStorage.getItem(key)!;
    localStorage.clear();
    localStorage.setItem(key.replace(encodeURIComponent(ACCOUNT_A), encodeURIComponent(ACCOUNT_B)), payload);

    currentAddress = ACCOUNT_B;
    render(<SessionRecoveryBanner onRestore={vi.fn()} />);
    expect(offer()).not.toBeInTheDocument();
    expect(localStorage.length).toBe(0);
  });

  it("silently ignores corrupt data and legacy unscoped entries", () => {
    localStorage.setItem("fluxora:session-recovery", JSON.stringify({ draft: "old" })); // ADAPT legacy key
    localStorage.setItem(`fluxora:session-recovery:v1:${encodeURIComponent(ACCOUNT_B)}`, "{not json");
    currentAddress = ACCOUNT_B;
    render(<SessionRecoveryBanner onRestore={vi.fn()} />);
    expect(offer()).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(localStorage.length).toBe(0);
  });

  it("restores and clears for the owning account", async () => {
    const onRestore = vi.fn();
    saveSession(ACCOUNT_A, { draft: "a" });
    currentAddress = ACCOUNT_A;
    render(<SessionRecoveryBanner onRestore={onRestore} />);
    await userEvent.click(screen.getByRole("button", { name: /restore/i }));
    expect(onRestore).toHaveBeenCalledWith({ draft: "a" });
    expect(localStorage.length).toBe(0);
  });
});
