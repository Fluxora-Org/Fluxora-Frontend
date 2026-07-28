/**
 * Tests for src/components/voice/VoiceCommandPanel.tsx
 *
 * Covers:
 *  • All eight VoiceState branches of getStatusBadge (7 explicit + default/idle)
 *  • panelOpen=false renders nothing
 *  • Category filtering — Navigation / Action / Destructive command buckets
 *  • isSupported=false renders the unsupported-browser alert
 *  • state="permission-denied" renders the mic-denied alert
 *  • state="confirming-destructive" renders the confirmation banner
 *  • Live transcript display when transcript / recognizedCommand are set
 *  • Manual simulator form (input + submit)
 *  • togglePanel and toggleListening wiring
 *  • Close button calls togglePanel
 *
 * Issue: #967
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VoiceCommandPanel } from "../VoiceCommandPanel";
import * as VoiceContextModule from "../VoiceContext";
import type { VoiceContextValue, VoiceState, VoiceCommandDef } from "../voiceTypes";

// ─── Mock helpers ──────────────────────────────────────────────────────────────

/**
 * Build the minimum VoiceContextValue mock, overridable per-test.
 */
function buildCtx(overrides: Partial<VoiceContextValue> = {}): VoiceContextValue {
  return {
    state: "idle",
    isSupported: true,
    transcript: "",
    recognizedCommand: null,
    pendingDestructiveCommand: null,
    availableCommands: [],
    panelOpen: true,
    toggleListening: vi.fn(),
    startListening: vi.fn(),
    stopListening: vi.fn(),
    togglePanel: vi.fn(),
    confirmDestructiveAction: vi.fn(),
    cancelDestructiveAction: vi.fn(),
    processSpokenPhrase: vi.fn(() => true),
    ...overrides,
  };
}

/**
 * Spy on useVoiceContext and return the given context value.
 */
function mockUseVoiceContext(ctx: VoiceContextValue) {
  vi.spyOn(VoiceContextModule, "useVoiceContext").mockReturnValue(ctx);
}

// ─── Sample commands ───────────────────────────────────────────────────────────

const NAV_CMD: VoiceCommandDef = {
  id: "nav-dashboard",
  phrase: "Go to dashboard",
  aliases: ["dashboard"],
  category: "Navigation",
  description: "Navigate to dashboard",
};

const ACTION_CMD: VoiceCommandDef = {
  id: "action-withdraw",
  phrase: "Withdraw",
  aliases: ["claim funds"],
  category: "Action",
  description: "Initiate withdrawal",
};

const DESTRUCTIVE_CMD: VoiceCommandDef = {
  id: "destructive-cancel",
  phrase: "Cancel stream",
  aliases: ["delete stream"],
  category: "Destructive",
  description: "Cancel active stream",
  requiresConfirmation: true,
};

const ALL_CATEGORY_COMMANDS: VoiceCommandDef[] = [NAV_CMD, ACTION_CMD, DESTRUCTIVE_CMD];

// ─── Restore mocks after every test ───────────────────────────────────────────

beforeEach(() => {
  vi.restoreAllMocks();
});

// ─── panelOpen gate ────────────────────────────────────────────────────────────

describe("VoiceCommandPanel — panelOpen gate", () => {
  it("renders nothing when panelOpen is false", () => {
    mockUseVoiceContext(buildCtx({ panelOpen: false }));
    const { container } = render(<VoiceCommandPanel />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the panel aside when panelOpen is true", () => {
    mockUseVoiceContext(buildCtx({ panelOpen: true }));
    render(<VoiceCommandPanel />);
    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });
});

// ─── getStatusBadge — all VoiceState branches ─────────────────────────────────

describe("VoiceCommandPanel — getStatusBadge", () => {
  const cases: Array<{ state: VoiceState; expectedLabel: string }> = [
    { state: "idle", expectedLabel: "Idle (Off)" },
    { state: "listening", expectedLabel: "Listening..." },
    { state: "processing", expectedLabel: "Processing..." },
    { state: "command-recognized", expectedLabel: "Recognized" },
    { state: "command-unrecognized", expectedLabel: "Not Recognized" },
    { state: "confirming-destructive", expectedLabel: "Confirmation Required" },
    { state: "permission-denied", expectedLabel: "Mic Denied" },
    { state: "unsupported-browser", expectedLabel: "Unsupported" },
  ];

  cases.forEach(({ state, expectedLabel }) => {
    it(`state="${state}" renders badge label "${expectedLabel}"`, () => {
      mockUseVoiceContext(buildCtx({ state }));
      render(<VoiceCommandPanel />);
      // The badge label appears in the status span inside the header
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });
  });

  it('default branch (idle) renders "Idle (Off)" badge label', () => {
    // Explicitly pass idle to exercise the default case
    mockUseVoiceContext(buildCtx({ state: "idle" }));
    render(<VoiceCommandPanel />);
    expect(screen.getByText("Idle (Off)")).toBeInTheDocument();
  });
});

// ─── Category filtering ────────────────────────────────────────────────────────

describe("VoiceCommandPanel — category filtering", () => {
  it("renders a 'Navigation Commands' section heading", () => {
    mockUseVoiceContext(buildCtx({ availableCommands: ALL_CATEGORY_COMMANDS }));
    render(<VoiceCommandPanel />);
    expect(screen.getByText("Navigation Commands")).toBeInTheDocument();
  });

  it("renders an 'Action Commands' section heading", () => {
    mockUseVoiceContext(buildCtx({ availableCommands: ALL_CATEGORY_COMMANDS }));
    render(<VoiceCommandPanel />);
    expect(screen.getByText("Action Commands")).toBeInTheDocument();
  });

  it("renders a 'Destructive Commands' section heading", () => {
    mockUseVoiceContext(buildCtx({ availableCommands: ALL_CATEGORY_COMMANDS }));
    render(<VoiceCommandPanel />);
    expect(screen.getByText("Destructive Commands")).toBeInTheDocument();
  });

  it("places Navigation command phrase only under Navigation Commands", () => {
    mockUseVoiceContext(buildCtx({ availableCommands: ALL_CATEGORY_COMMANDS }));
    render(<VoiceCommandPanel />);

    // The phrase should appear; we verify it is NOT inside the Action section
    const navSection = screen.getByText("Navigation Commands").closest("div")!;
    const navSectionContainer = navSection.parentElement!;
    expect(within(navSectionContainer).getByText(/"Go to dashboard"/)).toBeInTheDocument();
    // Action command phrase should not be in the nav section container
    expect(within(navSectionContainer).queryByText(/"Withdraw"/)).toBeNull();
  });

  it("places Action command phrase only under Action Commands", () => {
    mockUseVoiceContext(buildCtx({ availableCommands: ALL_CATEGORY_COMMANDS }));
    render(<VoiceCommandPanel />);

    const actionSection = screen.getByText("Action Commands").closest("div")!;
    const actionSectionContainer = actionSection.parentElement!;
    expect(within(actionSectionContainer).getByText(/"Withdraw"/)).toBeInTheDocument();
    expect(within(actionSectionContainer).queryByText(/"Go to dashboard"/)).toBeNull();
  });

  it("places Destructive command phrase only under Destructive Commands", () => {
    mockUseVoiceContext(buildCtx({ availableCommands: ALL_CATEGORY_COMMANDS }));
    render(<VoiceCommandPanel />);

    const destructiveSection = screen.getByText("Destructive Commands").closest("div")!;
    const destructiveSectionContainer = destructiveSection.parentElement!;
    expect(within(destructiveSectionContainer).getByText(/"Cancel stream"/)).toBeInTheDocument();
    expect(within(destructiveSectionContainer).queryByText(/"Withdraw"/)).toBeNull();
  });

  it("renders 'Requires Confirm' badge only on commands with requiresConfirmation=true", () => {
    mockUseVoiceContext(buildCtx({ availableCommands: ALL_CATEGORY_COMMANDS }));
    render(<VoiceCommandPanel />);
    const confirmBadges = screen.getAllByText("Requires Confirm");
    expect(confirmBadges).toHaveLength(1);
  });

  it("renders command descriptions", () => {
    mockUseVoiceContext(buildCtx({ availableCommands: ALL_CATEGORY_COMMANDS }));
    render(<VoiceCommandPanel />);
    expect(screen.getByText("Navigate to dashboard")).toBeInTheDocument();
    expect(screen.getByText("Initiate withdrawal")).toBeInTheDocument();
    expect(screen.getByText("Cancel active stream")).toBeInTheDocument();
  });

  it("renders command aliases as text", () => {
    mockUseVoiceContext(buildCtx({ availableCommands: [NAV_CMD] }));
    render(<VoiceCommandPanel />);
    expect(screen.getByText(/Aliases:/)).toBeInTheDocument();
    expect(screen.getByText(/"dashboard"/)).toBeInTheDocument();
  });

  it("renders empty category sections when no commands are provided", () => {
    mockUseVoiceContext(buildCtx({ availableCommands: [] }));
    render(<VoiceCommandPanel />);
    // All three section headings still render (category loop always runs)
    expect(screen.getByText("Navigation Commands")).toBeInTheDocument();
    expect(screen.getByText("Action Commands")).toBeInTheDocument();
    expect(screen.getByText("Destructive Commands")).toBeInTheDocument();
    // No command phrases rendered
    expect(screen.queryByText(/"Go to dashboard"/)).toBeNull();
  });

  it("filters correctly when only one category has commands", () => {
    mockUseVoiceContext(buildCtx({ availableCommands: [NAV_CMD] }));
    render(<VoiceCommandPanel />);
    expect(screen.getByText(/"Go to dashboard"/)).toBeInTheDocument();
    expect(screen.queryByText(/"Withdraw"/)).toBeNull();
    expect(screen.queryByText(/"Cancel stream"/)).toBeNull();
  });

  it("clicking a command row calls processSpokenPhrase with the phrase", () => {
    const processSpokenPhrase = vi.fn(() => true);
    mockUseVoiceContext(
      buildCtx({ availableCommands: [NAV_CMD], processSpokenPhrase })
    );
    render(<VoiceCommandPanel />);
    const row = screen.getByTitle('Click to test phrase "Go to dashboard"');
    fireEvent.click(row);
    expect(processSpokenPhrase).toHaveBeenCalledWith("Go to dashboard");
  });

  it("focusable command rows activate processSpokenPhrase with Enter key", async () => {
    const processSpokenPhrase = vi.fn(() => true);
    mockUseVoiceContext(
      buildCtx({ availableCommands: [NAV_CMD], processSpokenPhrase })
    );
    render(<VoiceCommandPanel />);
    const row = screen.getByTitle('Click to test phrase "Go to dashboard"');
    row.focus();
    expect(row).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(processSpokenPhrase).toHaveBeenCalledWith("Go to dashboard");
  });
});

// ─── isSupported=false alert ───────────────────────────────────────────────────

describe("VoiceCommandPanel — isSupported=false alert", () => {
  it("renders the SpeechRecognition Unsupported alert when isSupported is false", () => {
    mockUseVoiceContext(buildCtx({ isSupported: false }));
    render(<VoiceCommandPanel />);
    expect(screen.getByText("SpeechRecognition Unsupported")).toBeInTheDocument();
  });

  it("does not render the unsupported alert when isSupported is true", () => {
    mockUseVoiceContext(buildCtx({ isSupported: true }));
    render(<VoiceCommandPanel />);
    expect(screen.queryByText("SpeechRecognition Unsupported")).toBeNull();
  });
});

// ─── permission-denied alert ──────────────────────────────────────────────────

describe("VoiceCommandPanel — state=permission-denied alert", () => {
  it("renders the Microphone Permission Blocked alert", () => {
    mockUseVoiceContext(buildCtx({ state: "permission-denied" }));
    render(<VoiceCommandPanel />);
    expect(screen.getByText("Microphone Permission Blocked")).toBeInTheDocument();
  });

  it("does not render the mic-denied alert for other states", () => {
    mockUseVoiceContext(buildCtx({ state: "idle" }));
    render(<VoiceCommandPanel />);
    expect(screen.queryByText("Microphone Permission Blocked")).toBeNull();
  });
});

// ─── confirming-destructive banner ────────────────────────────────────────────

describe("VoiceCommandPanel — state=confirming-destructive banner", () => {
  it("renders the confirmation banner when state is confirming-destructive and pendingDestructiveCommand is set", () => {
    mockUseVoiceContext(
      buildCtx({
        state: "confirming-destructive",
        pendingDestructiveCommand: DESTRUCTIVE_CMD,
      })
    );
    render(<VoiceCommandPanel />);
    // "Confirmation Required" appears in both the status badge AND the banner heading —
    // use getAllByText and assert at least two occurrences to verify the banner rendered.
    const instances = screen.getAllByText("Confirmation Required");
    expect(instances.length).toBeGreaterThanOrEqual(2);
    // The Confirm button only appears in the banner, not the badge
    expect(screen.getByText('Say / Click "Confirm"')).toBeInTheDocument();
    expect(screen.getByText(/"Cancel stream"/)).toBeInTheDocument();
  });

  it("calls confirmDestructiveAction when confirm button is clicked", () => {
    const confirmDestructiveAction = vi.fn();
    mockUseVoiceContext(
      buildCtx({
        state: "confirming-destructive",
        pendingDestructiveCommand: DESTRUCTIVE_CMD,
        confirmDestructiveAction,
      })
    );
    render(<VoiceCommandPanel />);
    fireEvent.click(screen.getByText('Say / Click "Confirm"'));
    expect(confirmDestructiveAction).toHaveBeenCalledOnce();
  });

  it("calls cancelDestructiveAction when cancel button is clicked", () => {
    const cancelDestructiveAction = vi.fn();
    mockUseVoiceContext(
      buildCtx({
        state: "confirming-destructive",
        pendingDestructiveCommand: DESTRUCTIVE_CMD,
        cancelDestructiveAction,
      })
    );
    render(<VoiceCommandPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancelDestructiveAction).toHaveBeenCalledOnce();
  });

  it("does not render the confirmation banner when pendingDestructiveCommand is null", () => {
    mockUseVoiceContext(
      buildCtx({
        state: "confirming-destructive",
        pendingDestructiveCommand: null,
      })
    );
    render(<VoiceCommandPanel />);
    // "Confirmation Required" appears in the badge but NOT the big banner button
    expect(screen.queryByText('Say / Click "Confirm"')).toBeNull();
  });
});

// ─── Live transcript display ───────────────────────────────────────────────────

describe("VoiceCommandPanel — live transcript display", () => {
  it("renders transcript text when transcript is non-empty", () => {
    mockUseVoiceContext(buildCtx({ transcript: "go to streams" }));
    render(<VoiceCommandPanel />);
    expect(screen.getByText('"go to streams"')).toBeInTheDocument();
  });

  it("renders recognizedCommand rawTranscript when transcript is empty", () => {
    mockUseVoiceContext(
      buildCtx({
        transcript: "",
        recognizedCommand: {
          command: NAV_CMD,
          rawTranscript: "Go to dashboard",
          timestamp: Date.now(),
        },
      })
    );
    render(<VoiceCommandPanel />);
    expect(screen.getByText('"Go to dashboard"')).toBeInTheDocument();
    // Matched label appears
    expect(screen.getByText("✓ Matched")).toBeInTheDocument();
  });

  it("does not render transcript section when both transcript and recognizedCommand are empty/null", () => {
    mockUseVoiceContext(buildCtx({ transcript: "", recognizedCommand: null }));
    render(<VoiceCommandPanel />);
    expect(screen.queryByText("Live Transcript")).toBeNull();
  });

  it("highlights the recognized command row when it matches a command in availableCommands", () => {
    mockUseVoiceContext(
      buildCtx({
        availableCommands: [NAV_CMD],
        recognizedCommand: {
          command: NAV_CMD,
          rawTranscript: "Go to dashboard",
          timestamp: Date.now(),
        },
      })
    );
    render(<VoiceCommandPanel />);
    // The highlighted row has the accent class applied
    const row = screen.getByTitle('Click to test phrase "Go to dashboard"');
    expect(row.className).toMatch(/accent/);
  });
});

// ─── Manual simulator form ────────────────────────────────────────────────────

describe("VoiceCommandPanel — voice command simulator form", () => {
  it("renders the simulator input and Speak button", () => {
    mockUseVoiceContext(buildCtx());
    render(<VoiceCommandPanel />);
    expect(
      screen.getByLabelText("Voice Command Simulator (Keyboard Test)")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /speak/i })).toBeInTheDocument();
  });

  it("calls processSpokenPhrase with the typed phrase on form submit", () => {
    const processSpokenPhrase = vi.fn(() => true);
    mockUseVoiceContext(buildCtx({ processSpokenPhrase }));
    render(<VoiceCommandPanel />);
    const input = screen.getByLabelText("Voice Command Simulator (Keyboard Test)");
    fireEvent.change(input, { target: { value: "Go to streams" } });
    fireEvent.click(screen.getByRole("button", { name: /speak/i }));
    expect(processSpokenPhrase).toHaveBeenCalledWith("Go to streams");
  });

  it("clears the input after submit", () => {
    mockUseVoiceContext(buildCtx());
    render(<VoiceCommandPanel />);
    const input = screen.getByLabelText(
      "Voice Command Simulator (Keyboard Test)"
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Withdraw" } });
    fireEvent.click(screen.getByRole("button", { name: /speak/i }));
    expect(input.value).toBe("");
  });

  it("does not call processSpokenPhrase when input is blank", () => {
    const processSpokenPhrase = vi.fn(() => true);
    mockUseVoiceContext(buildCtx({ processSpokenPhrase }));
    render(<VoiceCommandPanel />);
    // Submit empty form
    fireEvent.click(screen.getByRole("button", { name: /speak/i }));
    expect(processSpokenPhrase).not.toHaveBeenCalled();
  });

  it("does not call processSpokenPhrase when input is whitespace only", () => {
    const processSpokenPhrase = vi.fn(() => true);
    mockUseVoiceContext(buildCtx({ processSpokenPhrase }));
    render(<VoiceCommandPanel />);
    const input = screen.getByLabelText("Voice Command Simulator (Keyboard Test)");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /speak/i }));
    expect(processSpokenPhrase).not.toHaveBeenCalled();
  });
});

// ─── Header controls ──────────────────────────────────────────────────────────

describe("VoiceCommandPanel — header controls", () => {
  it("close button calls togglePanel", () => {
    const togglePanel = vi.fn();
    mockUseVoiceContext(buildCtx({ togglePanel }));
    render(<VoiceCommandPanel />);
    fireEvent.click(
      screen.getByRole("button", { name: /close voice command reference panel/i })
    );
    expect(togglePanel).toHaveBeenCalledOnce();
  });

  it("has the correct aria-label on the panel aside", () => {
    mockUseVoiceContext(buildCtx());
    render(<VoiceCommandPanel />);
    expect(
      screen.getByRole("complementary", {
        name: "Voice Command Reference & Controls",
      })
    ).toBeInTheDocument();
  });
});

// ─── Footer controls ──────────────────────────────────────────────────────────

describe("VoiceCommandPanel — footer controls", () => {
  it("renders 'Start Listening' button when state is not listening", () => {
    mockUseVoiceContext(buildCtx({ state: "idle" }));
    render(<VoiceCommandPanel />);
    expect(
      screen.getByRole("button", { name: /start listening/i })
    ).toBeInTheDocument();
  });

  it("renders 'Stop Listening' button when state is listening", () => {
    mockUseVoiceContext(buildCtx({ state: "listening" }));
    render(<VoiceCommandPanel />);
    expect(
      screen.getByRole("button", { name: /stop listening/i })
    ).toBeInTheDocument();
  });

  it("toggleListening button is disabled when isSupported is false", () => {
    mockUseVoiceContext(buildCtx({ isSupported: false, state: "idle" }));
    render(<VoiceCommandPanel />);
    expect(
      screen.getByRole("button", { name: /start listening/i })
    ).toBeDisabled();
  });

  it("calls toggleListening when the footer button is clicked", () => {
    const toggleListening = vi.fn();
    mockUseVoiceContext(buildCtx({ toggleListening, state: "idle" }));
    render(<VoiceCommandPanel />);
    fireEvent.click(screen.getByRole("button", { name: /start listening/i }));
    expect(toggleListening).toHaveBeenCalledOnce();
  });

  it("renders the 'Opt-in Motor Aid' label in the footer", () => {
    mockUseVoiceContext(buildCtx());
    render(<VoiceCommandPanel />);
    expect(screen.getByText("Opt-in Motor Aid")).toBeInTheDocument();
  });
});

// ─── Static header content ────────────────────────────────────────────────────

describe("VoiceCommandPanel — static header content", () => {
  it("renders the 'Voice Navigation' heading", () => {
    mockUseVoiceContext(buildCtx());
    render(<VoiceCommandPanel />);
    expect(screen.getByText("Voice Navigation")).toBeInTheDocument();
  });

  it("renders the 'Motor accessibility control' sub-heading", () => {
    mockUseVoiceContext(buildCtx());
    render(<VoiceCommandPanel />);
    expect(screen.getByText("Motor accessibility control")).toBeInTheDocument();
  });

  it("renders the 'Command Grammar Reference' section title", () => {
    mockUseVoiceContext(buildCtx());
    render(<VoiceCommandPanel />);
    expect(screen.getByText("Command Grammar Reference")).toBeInTheDocument();
  });
});
