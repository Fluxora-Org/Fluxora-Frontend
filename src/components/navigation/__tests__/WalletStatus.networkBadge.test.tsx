// Feature: network-badge-tooltip, a11y
// TESTNET badge has a focusable trigger, hover/focus tooltip,
// Escape dismiss, and always-present visually-hidden description.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WalletStatus from "../WalletStatus";

// Mock the toast context so useOptionalToast returns null (as in other tests)
vi.mock("../../toast/ToastProvider", () => ({
  useOptionalToast: () => null,
}));

// Mock the clipboard hook
vi.mock("../../../hooks/useClipboard", () => ({
  useClipboard: () => ({ copy: vi.fn().mockResolvedValue(true), status: "idle" }),
}));

const mockAddress = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";

describe("WalletStatus network badge tooltip + visually-hidden description", () => {
  it("renders a focusable network badge button with a descriptive aria-label", () => {
    render(
      <WalletStatus address={mockAddress} network="TESTNET" onDisconnect={() => {}} />
    );

    const badge = screen.getByRole("button", { name: /testnet/i });
    expect(badge).toBeInTheDocument();
    expect(badge.getAttribute("aria-label")).toContain("Stellar test network");
    expect(badge.getAttribute("aria-label")).toContain("not real USDC");
  });

  it("always renders visually-hidden description text for screen readers", () => {
    render(
      <WalletStatus address={mockAddress} network="TESTNET" onDisconnect={() => {}} />
    );

    const hidden = screen.getByText(
      /Connected to the Stellar test network\. Streamed assets are not real USDC\./
    );
    expect(hidden).toBeInTheDocument();
    expect(hidden.className).toContain("sr-only");
    expect(hidden.getAttribute("id")).toBe("network-badge-description");
  });

  it("shows the tooltip on focus and dismisses it via Escape", async () => {
    const user = userEvent.setup();
    render(
      <WalletStatus address={mockAddress} network="TESTNET" onDisconnect={() => {}} />
    );

    const badge = screen.getByRole("button", { name: /testnet/i });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    badge.focus(); // set activeElement so Escape dispatches to the badge
    fireEvent.focus(badge); // trigger React onFocus -> open tooltip
    expect(screen.queryByRole("tooltip")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows the tooltip on hover and hides on mouse leave", () => {
    render(
      <WalletStatus address={mockAddress} network="TESTNET" onDisconnect={() => {}} />
    );

    const badge = screen.getByRole("button", { name: /testnet/i });

    fireEvent.mouseEnter(badge);
    expect(screen.queryByRole("tooltip")).toBeInTheDocument();

    fireEvent.mouseLeave(badge);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("links the badge to the tooltip via aria-describedby", () => {
    render(
      <WalletStatus address={mockAddress} network="TESTNET" onDisconnect={() => {}} />
    );

    const badge = screen.getByRole("button", { name: /testnet/i });
    expect(badge.getAttribute("aria-describedby")).toBe("network-badge-tooltip");
  });

  it("uses a distinct mainnet label and description for mainnet", () => {
    render(
      <WalletStatus address={mockAddress} network="PUBLIC" expectedNetwork="PUBLIC" onDisconnect={() => {}} />
    );

    const badge = screen.getByRole("button", { name: /mainnet/i });
    expect(badge.getAttribute("aria-label")).toContain("main network");
    expect(screen.getByText(/Connected to the Stellar main network\./)).toBeInTheDocument();
  });
});