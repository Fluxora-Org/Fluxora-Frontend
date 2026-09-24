import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WalletFallback from "../WalletFallback";

describe("WalletFallback", () => {
  it("renders the restoring stage by default when stage is not provided", () => {
    render(<WalletFallback />);

    const fallback = screen.getByRole("status");
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveAttribute("aria-busy", "true");
    expect(fallback).toHaveAttribute("aria-live", "polite");
    expect(fallback).toHaveAttribute("aria-label", "Restoring wallet session…");
  });

  it("renders the restoring stage with correct label", () => {
    render(<WalletFallback stage="restoring" />);

    const fallback = screen.getByRole("status");
    expect(fallback).toHaveAttribute("aria-label", "Restoring wallet session…");
    expect(screen.getByText("Restoring wallet session…")).toBeInTheDocument();
  });

  it("renders the loading-data stage with correct label", () => {
    render(<WalletFallback stage="loading-data" />);

    const fallback = screen.getByRole("status");
    expect(fallback).toHaveAttribute("aria-label", "Loading wallet data…");
    expect(screen.getByText("Loading wallet data…")).toBeInTheDocument();
  });

  it("renders the rejected stage with correct label and alert", () => {
    render(<WalletFallback stage="rejected" />);

    const fallback = screen.getByRole("status");
    expect(fallback).toHaveAttribute(
      "aria-label",
      "Wallet connection was not approved.",
    );
    expect(screen.getByText("Wallet connection was not approved.")).toBeInTheDocument();

    // The alert banner should also be present
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Wallet connection was not approved.");
  });

  it("renders the network-mismatch stage with correct label and alert", () => {
    render(<WalletFallback stage="network-mismatch" />);

    const fallback = screen.getByRole("status");
    expect(fallback).toHaveAttribute(
      "aria-label",
      "Your wallet is on the wrong network.",
    );
    expect(
      screen.getByText("Your wallet is on the wrong network."),
    ).toBeInTheDocument();

    // The alert banner should also be present
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Your wallet is on the wrong network.");
  });

  it("preserves layout dimensions with heading, metric cards, and table skeletons", () => {
    const { container } = render(<WalletFallback stage="loading-data" />);

    // Should have a heading skeleton area
    const headingArea = container.querySelector('[aria-hidden="true"]');
    expect(headingArea).toBeInTheDocument();

    // Should have metric card skeletons (3 cards)
    const cards = container.querySelectorAll('[aria-hidden="true"]');
    expect(cards.length).toBeGreaterThanOrEqual(2);

    // Should have a table skeleton
    const table = container.querySelector("table");
    expect(table).toBeInTheDocument();

    // Table should have header row with 4 columns
    const headers = table?.querySelectorAll("th");
    expect(headers?.length).toBe(4);

    // Table should have 3 body rows
    const rows = table?.querySelectorAll("tbody tr");
    expect(rows?.length).toBe(3);
  });

  it("does not render alert banner for non-error stages", () => {
    const { container } = render(<WalletFallback stage="restoring" />);
    const alerts = container.querySelectorAll('[role="alert"]');
    expect(alerts.length).toBe(0);
  });

  it("uses screen-reader only text for stage announcement", () => {
    render(<WalletFallback stage="restoring" />);

    // The sr-only span should contain the stage label
    const srOnly = screen.getByText("Restoring wallet session…");
    expect(srOnly).toHaveClass("sr-only");
  });
});

describe("WalletFallback – cold load, delayed wallet, rejected wallet states", () => {
  it("cold load: shows restoring fallback before wallet resolves", () => {
    render(<WalletFallback stage="restoring" />);

    // During cold load, the wallet session is being restored
    const fallback = screen.getByRole("status");
    expect(fallback).toHaveAttribute("aria-busy", "true");
    expect(fallback).toHaveAttribute("aria-label", "Restoring wallet session…");

    // Layout should be preserved (skeleton present)
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("delayed wallet: transitions from restoring to loading-data", () => {
    const { rerender } = render(<WalletFallback stage="restoring" />);

    // Initially restoring
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Restoring wallet session…",
    );

    // Wallet connected, now loading data
    rerender(<WalletFallback stage="loading-data" />);
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Loading wallet data…",
    );

    // Layout should remain stable (same skeleton structure)
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
  });

  it("rejected wallet: shows rejection alert and distinguishes from loading", () => {
    const { container } = render(<WalletFallback stage="rejected" />);

    // Should show the rejection alert
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Wallet connection was not approved.");

    // Should NOT show the loading-data alert
    const alerts = container.querySelectorAll('[role="alert"]');
    expect(alerts.length).toBe(1);

    // The main status should still indicate the stage
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Wallet connection was not approved.",
    );
  });

  it("network-mismatch: shows mismatch alert and distinguishes from loading", () => {
    const { container } = render(<WalletFallback stage="network-mismatch" />);

    // Should show the network mismatch alert
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Your wallet is on the wrong network.");

    // Should NOT show multiple alerts
    const alerts = container.querySelectorAll('[role="alert"]');
    expect(alerts.length).toBe(1);
  });
});
