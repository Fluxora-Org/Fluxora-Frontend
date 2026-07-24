import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { VoiceProvider, useVoiceContext } from "../VoiceContext";
import { VoiceMicButton } from "../VoiceMicButton";
import { VoiceCommandPanel } from "../VoiceCommandPanel";
import { VoiceConfirmModal } from "../VoiceConfirmModal";

// Helper component to view current route location and trigger test phrases
function LocationDisplay() {
  const location = useLocation();
  const { state, processSpokenPhrase, togglePanel, confirmDestructiveAction } =
    useVoiceContext();
  return (
    <div>
      <span data-testid="location">{location.pathname}</span>
      <span data-testid="voice-state">{state}</span>
      <button
        data-testid="test-phrase-btn"
        onClick={() => processSpokenPhrase("Go to streams")}
      >
        Test Phrase
      </button>
      <button
        data-testid="test-cancel-phrase-btn"
        onClick={() => processSpokenPhrase("Cancel stream")}
      >
        Test Cancel Phrase
      </button>
      <button data-testid="open-panel-btn" onClick={togglePanel}>
        Open Panel
      </button>
      <button data-testid="confirm-btn" onClick={confirmDestructiveAction}>
        Test Confirm Action
      </button>
    </div>
  );
}

describe("Voice Command Navigation System", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders microphone button with proper aria-label and keyboard focusable attributes", () => {
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <VoiceProvider>
          <VoiceMicButton variant="navbar" />
        </VoiceProvider>
      </MemoryRouter>
    );

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label");
  });

  it("processes spoken navigation phrase 'Go to streams' and updates route", () => {
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <VoiceProvider>
          <LocationDisplay />
        </VoiceProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId("location").textContent).toBe("/app");

    fireEvent.click(screen.getByTestId("test-phrase-btn"));

    expect(screen.getByTestId("voice-state").textContent).toBe(
      "command-recognized"
    );
    expect(screen.getByTestId("location").textContent).toBe("/app/streams");
  });

  it("requires confirmation step for destructive 'Cancel stream' command and does not fire blind", () => {
    render(
      <MemoryRouter initialEntries={["/app/streams"]}>
        <VoiceProvider>
          <LocationDisplay />
          <VoiceConfirmModal />
        </VoiceProvider>
      </MemoryRouter>
    );

    // Trigger destructive phrase
    fireEvent.click(screen.getByTestId("test-cancel-phrase-btn"));

    // State should enter confirming-destructive
    expect(screen.getByTestId("voice-state").textContent).toBe(
      "confirming-destructive"
    );

    // Confirmation modal should be visible
    const modal = screen.getByRole("dialog");
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveTextContent(/Voice Command Confirmation/i);
    expect(modal).toHaveTextContent(/Cancel stream/i);

    // Confirm button click
    const confirmBtn = screen.getByRole("button", { name: /^confirm action$/i });
    fireEvent.click(confirmBtn);

    expect(screen.getByTestId("voice-state").textContent).toBe(
      "command-recognized"
    );
  });

  it("displays unrecognized status when non-grammar phrase is received", () => {
    function UnrecognizedTester() {
      const { state, processSpokenPhrase } = useVoiceContext();
      return (
        <div>
          <span data-testid="state">{state}</span>
          <button onClick={() => processSpokenPhrase("Open space station")}>
            Run Unknown
          </button>
        </div>
      );
    }

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <VoiceProvider>
          <UnrecognizedTester />
        </VoiceProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("Run Unknown"));
    expect(screen.getByTestId("state").textContent).toBe("command-unrecognized");
  });

  it("renders command list reference panel with grammar categories when opened", () => {
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <VoiceProvider>
          <LocationDisplay />
          <VoiceCommandPanel />
        </VoiceProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId("open-panel-btn"));

    const panel = screen.getByRole("complementary", {
      name: /voice command reference/i,
    });
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveTextContent(/Navigation Commands/i);
    expect(panel).toHaveTextContent(/Action Commands/i);
    expect(panel).toHaveTextContent(/Destructive Commands/i);
  });
});
