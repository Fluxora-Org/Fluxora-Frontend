import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VoiceConfirmModal } from "../VoiceConfirmModal";
import { VoiceContextValue, VoiceCommandDef } from "../voiceTypes";

// Mock useVoiceContext
let mockContext: VoiceContextValue;

vi.mock("../VoiceContext", () => ({
  useVoiceContext: () => mockContext,
}));

function buildContext(overrides: Partial<VoiceContextValue> = {}): VoiceContextValue {
  return {
    state: "idle",
    isSupported: true,
    transcript: "",
    recognizedCommand: null,
    pendingDestructiveCommand: null,
    availableCommands: [],
    panelOpen: false,
    toggleListening: vi.fn(),
    startListening: vi.fn(),
    stopListening: vi.fn(),
    togglePanel: vi.fn(),
    confirmDestructiveAction: vi.fn(),
    cancelDestructiveAction: vi.fn(),
    processSpokenPhrase: vi.fn(),
    ...overrides,
  };
}

const destructiveCmd: VoiceCommandDef = {
  id: "destructive-cancel-stream",
  phrase: "Cancel stream",
  aliases: ["delete stream"],
  category: "Destructive",
  description: "Cancel streaming contract",
  requiresConfirmation: true,
};

describe("VoiceConfirmModal", () => {
  beforeEach(() => {
    mockContext = buildContext();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -- isOpen state combinations -----------------------------------------

  it("renders null when state is idle and pendingDestructiveCommand is null", () => {
    mockContext = buildContext({ state: "idle", pendingDestructiveCommand: null });
    const { container } = render(<VoiceConfirmModal />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null when state is idle and pendingDestructiveCommand is set (inconsistent)", () => {
    mockContext = buildContext({ state: "idle", pendingDestructiveCommand: destructiveCmd });
    const { container } = render(<VoiceConfirmModal />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null when state is confirming-destructive but pendingDestructiveCommand is null", () => {
    mockContext = buildContext({ state: "confirming-destructive", pendingDestructiveCommand: null });
    const { container } = render(<VoiceConfirmModal />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the modal when state is confirming-destructive and pendingDestructiveCommand is set", () => {
    mockContext = buildContext({ state: "confirming-destructive", pendingDestructiveCommand: destructiveCmd });
    render(<VoiceConfirmModal />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  // -- Rendered phrase text ----------------------------------------------

  it("renders the pendingDestructiveCommand phrase in the modal body", () => {
    mockContext = buildContext({ state: "confirming-destructive", pendingDestructiveCommand: destructiveCmd });
    render(<VoiceConfirmModal />);
    expect(screen.getByText(/Cancel stream/)).toBeInTheDocument();
  });

  // -- Escape key lifecycle ----------------------------------------------

  it("calls cancelDestructiveAction on window Escape key when open", () => {
    const cancelFn = vi.fn();
    mockContext = buildContext({
      state: "confirming-destructive",
      pendingDestructiveCommand: destructiveCmd,
      cancelDestructiveAction: cancelFn,
    });
    render(<VoiceConfirmModal />);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(cancelFn).toHaveBeenCalledTimes(1);
  });

  it("does not call cancelDestructiveAction on Escape when modal is closed", () => {
    const cancelFn = vi.fn();
    mockContext = buildContext({
      state: "idle",
      pendingDestructiveCommand: null,
      cancelDestructiveAction: cancelFn,
    });
    render(<VoiceConfirmModal />);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(cancelFn).not.toHaveBeenCalled();
  });

  it("removes Escape listener after unmount", () => {
    const cancelFn = vi.fn();
    mockContext = buildContext({
      state: "confirming-destructive",
      pendingDestructiveCommand: destructiveCmd,
      cancelDestructiveAction: cancelFn,
    });
    const { unmount } = render(<VoiceConfirmModal />);
    // First Escape while mounted — should fire
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(cancelFn).toHaveBeenCalledTimes(1);

    unmount();
    // Second Escape after unmount — should not fire
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(cancelFn).toHaveBeenCalledTimes(1);
  });

  // -- Initial focus on Cancel button (safe default) ---------------------

  it("focuses the Cancel button when the modal opens", async () => {
    vi.useFakeTimers();
    mockContext = buildContext({
      state: "confirming-destructive",
      pendingDestructiveCommand: destructiveCmd,
    });

    render(<VoiceConfirmModal />);

    // The modal uses a setTimeout(..., 50) to focus the Cancel button
    act(() => {
      vi.advanceTimersByTime(100);
    });

    const cancelButton = screen.getByRole("button", { name: /^Cancel$/i });
    expect(cancelButton).toHaveFocus();

    // Confirm Action should still be reachable via Tab
    const confirmButton = screen.getByRole("button", { name: /confirm action/i });
    expect(confirmButton).toBeInTheDocument();
    expect(confirmButton).not.toHaveFocus();

    vi.useRealTimers();
  });

  // -- Confirm/Cancel buttons --------------------------------------------

  it("calls confirmDestructiveAction on confirm button click", () => {
    const confirmFn = vi.fn();
    mockContext = buildContext({
      state: "confirming-destructive",
      pendingDestructiveCommand: destructiveCmd,
      confirmDestructiveAction: confirmFn,
    });
    render(<VoiceConfirmModal />);
    screen.getByText("Confirm Action").click();
    expect(confirmFn).toHaveBeenCalledTimes(1);
  });

  it("calls cancelDestructiveAction on cancel button click", () => {
    const cancelFn = vi.fn();
    mockContext = buildContext({
      state: "confirming-destructive",
      pendingDestructiveCommand: destructiveCmd,
      cancelDestructiveAction: cancelFn,
    });
    render(<VoiceConfirmModal />);
    screen.getByText("Cancel").click();
    expect(cancelFn).toHaveBeenCalledTimes(1);
  });

  it("wraps focus between the dialog actions when tabbing forward and backward", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup();

    mockContext = buildContext({
      state: "confirming-destructive",
      pendingDestructiveCommand: destructiveCmd,
    });

    render(<VoiceConfirmModal />);

    // advanceTimersByTimeAsync flushes microtasks between each tick,
    // so the auto-focus setTimeout fires deterministically before we start
    await vi.advanceTimersByTimeAsync(100);

    const dialog = screen.getByRole("dialog");
    const closeButton = screen.getByRole("button", { name: /cancel destructive action/i });
    const confirmButton = screen.getByRole("button", { name: /confirm action/i });
    const cancelButton = screen.getByRole("button", { name: /^Cancel$/i });

    closeButton.focus();
    expect(closeButton).toHaveFocus();

    await user.tab();
    expect(confirmButton).toHaveFocus();

    await user.tab();
    expect(cancelButton).toHaveFocus();

    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(cancelButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(confirmButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(closeButton).toHaveFocus();

    expect(dialog as HTMLElement).toContainElement(document.activeElement as HTMLElement);

    vi.useRealTimers();
  });
});
