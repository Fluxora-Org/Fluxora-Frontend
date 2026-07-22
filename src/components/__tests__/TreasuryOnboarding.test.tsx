import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TreasuryOnboarding from "../TreasuryOnboarding";
import { writeOnboardingDismissed } from "../../lib/onboarding";

vi.mock("../../lib/onboarding", () => ({
  writeOnboardingDismissed: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeProps(overrides: Partial<Parameters<typeof TreasuryOnboarding>[0]> = {}) {
  return {
    walletConnected: false,
    walletAddress: null,
    onConnectWallet: vi.fn(),
    onCreateStream: vi.fn(),
    onDismiss: vi.fn(),
    ...overrides,
  };
}

function renderOnboarding(overrides: Partial<Parameters<typeof TreasuryOnboarding>[0]> = {}) {
  const props = makeProps(overrides);
  const view = render(<TreasuryOnboarding {...props} />);
  return { props, ...view };
}

/** Clicks the primary (Next / final CTA) button. */
async function clickNext(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", {
      name: /next|create first stream|connect freighter/i,
    }),
  );
}

/** Advances from step 0 to the given step via the Next button. */
async function goToStep(user: ReturnType<typeof userEvent.setup>, step: number) {
  for (let i = 0; i < step; i++) {
    await clickNext(user);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Step content ──────────────────────────────────────────────────────────────

describe("TreasuryOnboarding — step content", () => {
  it("renders the Welcome step content on step 1", () => {
    renderOnboarding();

    expect(
      screen.getByRole("heading", { level: 2, name: "Welcome to Fluxora Treasury" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/stream USDC to recipients in real time/i)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Key concepts" })).toBeInTheDocument();
    expect(screen.getByText("Real-time streams")).toBeInTheDocument();
    expect(screen.getByText("Smart-contract lock")).toBeInTheDocument();
    expect(screen.getByText("USDC on Stellar")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
  });

  it("renders the How-it-works step content on step 2", async () => {
    const user = userEvent.setup();
    renderOnboarding();
    await goToStep(user, 1);

    expect(
      screen.getByRole("heading", { level: 2, name: "How a stream works" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Stream creation steps" })).toBeInTheDocument();
    expect(screen.getByText("Set recipient & deposit")).toBeInTheDocument();
    expect(screen.getByText("Configure rate & schedule")).toBeInTheDocument();
    expect(screen.getByText("Review & sign")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(/cancel an active stream at any time/i);
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
  });

  it("renders the disconnected Get-started step content on step 3", async () => {
    const user = userEvent.setup();
    renderOnboarding({ walletConnected: false });
    await goToStep(user, 2);

    expect(
      screen.getByRole("heading", { level: 2, name: "Connect your wallet first" }),
    ).toBeInTheDocument();
    const walletOptions = screen.getByRole("list", { name: "Supported wallets" });
    expect(walletOptions).toHaveTextContent("Freighter");
    expect(walletOptions).toHaveTextContent("Recommended · Stellar browser extension");
    expect(screen.getByRole("button", { name: "Connect Freighter" })).toBeInTheDocument();
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
  });

  it("renders the connected Get-started step content with truncated address", async () => {
    const user = userEvent.setup();
    const walletAddress = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW";
    renderOnboarding({ walletConnected: true, walletAddress });
    await goToStep(user, 2);

    expect(
      screen.getByRole("heading", { level: 2, name: "You're ready to stream" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Pre-flight checklist" })).toBeInTheDocument();
    expect(screen.getByText("Wallet connected")).toBeInTheDocument();
    expect(
      screen.getByLabelText(`Wallet address ${walletAddress}`),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create first stream" })).toBeInTheDocument();
  });
});

// ── Next / Back navigation ────────────────────────────────────────────────────

describe("TreasuryOnboarding — Next/Back navigation", () => {
  it("does not render a Back button on the first step", () => {
    renderOnboarding();
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
  });

  it("navigates forward through all steps with Next", async () => {
    const user = userEvent.setup();
    renderOnboarding();

    await clickNext(user);
    expect(
      screen.getByRole("heading", { level: 2, name: "How a stream works" }),
    ).toBeInTheDocument();

    await clickNext(user);
    expect(
      screen.getByRole("heading", { level: 2, name: "Connect your wallet first" }),
    ).toBeInTheDocument();
  });

  it("navigates backward with Back", async () => {
    const user = userEvent.setup();
    renderOnboarding();
    await goToStep(user, 2);

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(
      screen.getByRole("heading", { level: 2, name: "How a stream works" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(
      screen.getByRole("heading", { level: 2, name: "Welcome to Fluxora Treasury" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
  });
});

// ── Skip ──────────────────────────────────────────────────────────────────────

describe("TreasuryOnboarding — Skip", () => {
  it("persists dismissal and calls onDismiss", async () => {
    const user = userEvent.setup();
    const { props } = renderOnboarding();

    await user.click(screen.getByRole("button", { name: "Skip onboarding" }));

    expect(writeOnboardingDismissed).toHaveBeenCalledTimes(1);
    expect(writeOnboardingDismissed).toHaveBeenCalledWith(true);
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
    expect(props.onConnectWallet).not.toHaveBeenCalled();
    expect(props.onCreateStream).not.toHaveBeenCalled();
  });

  it("is available on every step", async () => {
    const user = userEvent.setup();
    const { props } = renderOnboarding();
    await goToStep(user, 2);

    await user.click(screen.getByRole("button", { name: "Skip onboarding" }));

    expect(writeOnboardingDismissed).toHaveBeenCalledWith(true);
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });
});

// ── Final-step completion ─────────────────────────────────────────────────────

describe("TreasuryOnboarding — final-step completion", () => {
  it("calls onCreateStream (not onConnectWallet) when wallet is connected", async () => {
    const user = userEvent.setup();
    const { props } = renderOnboarding({ walletConnected: true });
    await goToStep(user, 2);

    await user.click(screen.getByRole("button", { name: "Create first stream" }));

    expect(writeOnboardingDismissed).toHaveBeenCalledWith(true);
    expect(props.onCreateStream).toHaveBeenCalledTimes(1);
    expect(props.onConnectWallet).not.toHaveBeenCalled();
    expect(props.onDismiss).not.toHaveBeenCalled();
  });

  it("calls onConnectWallet (not onCreateStream) when wallet is disconnected", async () => {
    const user = userEvent.setup();
    const { props } = renderOnboarding({ walletConnected: false });
    await goToStep(user, 2);

    await user.click(screen.getByRole("button", { name: "Connect Freighter" }));

    expect(writeOnboardingDismissed).toHaveBeenCalledWith(true);
    expect(props.onConnectWallet).toHaveBeenCalledTimes(1);
    expect(props.onCreateStream).not.toHaveBeenCalled();
    expect(props.onDismiss).not.toHaveBeenCalled();
  });

  it("does not persist dismissal before reaching the final step", async () => {
    const user = userEvent.setup();
    renderOnboarding();

    await clickNext(user);
    await clickNext(user);

    expect(writeOnboardingDismissed).not.toHaveBeenCalled();
  });
});

// ── Stepper dots ──────────────────────────────────────────────────────────────

describe("TreasuryOnboarding — stepper dots", () => {
  function getDot(name: RegExp) {
    return screen.getByRole("button", { name });
  }

  it("disables all dots at or ahead of the current step on step 1", () => {
    renderOnboarding();

    expect(getDot(/^Step 1: Welcome \(current\)$/)).toBeDisabled();
    expect(getDot(/^Step 2: How it works$/)).toBeDisabled();
    expect(getDot(/^Step 3: Get started$/)).toBeDisabled();
  });

  it("only enables completed steps on step 2", async () => {
    const user = userEvent.setup();
    renderOnboarding();
    await goToStep(user, 1);

    expect(getDot(/^Step 1: Welcome \(completed\)$/)).toBeEnabled();
    expect(getDot(/^Step 2: How it works \(current\)$/)).toBeDisabled();
    expect(getDot(/^Step 3: Get started$/)).toBeDisabled();
  });

  it("marks the current step with aria-current='step'", async () => {
    const user = userEvent.setup();
    renderOnboarding();
    await goToStep(user, 1);

    const items = screen.getAllByRole("listitem", { name: "" });
    const currentItems = items.filter(
      (item) => item.getAttribute("aria-current") === "step",
    );
    expect(currentItems).toHaveLength(1);
    expect(currentItems[0]).toHaveTextContent("How it works");
  });

  it("navigates back to a completed step when its dot is clicked", async () => {
    const user = userEvent.setup();
    renderOnboarding();
    await goToStep(user, 2);

    await user.click(getDot(/^Step 1: Welcome \(completed\)$/));

    expect(
      screen.getByRole("heading", { level: 2, name: "Welcome to Fluxora Treasury" }),
    ).toBeInTheDocument();
  });
});

// ── Heading focus management ──────────────────────────────────────────────────

describe("TreasuryOnboarding — heading focus", () => {
  it("focuses the step heading on mount", () => {
    renderOnboarding();
    expect(
      screen.getByRole("heading", { level: 2, name: "Welcome to Fluxora Treasury" }),
    ).toHaveFocus();
  });

  it("moves focus to the new heading when navigating forward", async () => {
    const user = userEvent.setup();
    renderOnboarding();

    await clickNext(user);
    expect(
      screen.getByRole("heading", { level: 2, name: "How a stream works" }),
    ).toHaveFocus();

    await clickNext(user);
    expect(
      screen.getByRole("heading", { level: 2, name: "Connect your wallet first" }),
    ).toHaveFocus();
  });

  it("moves focus to the new heading when navigating backward", async () => {
    const user = userEvent.setup();
    renderOnboarding();
    await goToStep(user, 2);

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(
      screen.getByRole("heading", { level: 2, name: "How a stream works" }),
    ).toHaveFocus();
  });
});
