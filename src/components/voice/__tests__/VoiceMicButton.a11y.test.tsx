/**
 * Accessibility tests for VoiceMicButton
 *
 * Validates every acceptance criterion:
 *
 *  1. Listening state is exposed programmatically (aria-pressed, role, label).
 *  2. A state change is announced via an aria-live region.
 *  3. The state is distinguishable without colour (non-colour visual marker).
 *  4. Stopping capture is reachable by keyboard (button role + Enter/Space).
 *
 * @see docs/COMPONENT_GUIDELINES.md
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VoiceMicButton } from "../VoiceMicButton";
import * as VoiceContextModule from "../VoiceContext";
import type { VoiceContextValue, VoiceState } from "../voiceTypes";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function buildCtx(overrides: Partial<VoiceContextValue> = {}): VoiceContextValue {
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
    processSpokenPhrase: vi.fn(() => true),
    ...overrides,
  };
}

function mockCtx(overrides: Partial<VoiceContextValue> = {}) {
  vi.spyOn(VoiceContextModule, "useVoiceContext").mockReturnValue(
    buildCtx(overrides),
  );
}

/**
 * Controlled wrapper that holds its own React state for VoiceState.
 * Tests can drive state transitions by calling controlRef.current.setVoiceState(),
 * which triggers a genuine React re-render that the component's useEffect observes.
 */
function ControlledVoiceMicWrapper({
  controlRef,
  initialState = "idle",
  variant,
  toggleListening,
}: {
  controlRef: React.MutableRefObject<{
    setVoiceState: (s: VoiceState) => void;
  } | null>;
  initialState?: VoiceState;
  variant?: "navbar" | "sidebar";
  toggleListening?: () => void;
}) {
  const [voiceState, setVoiceState] = React.useState<VoiceState>(initialState);

  // Store the setter in the ref so the test body can drive state changes
  React.useLayoutEffect(() => {
    controlRef.current = { setVoiceState };
  });

  vi.spyOn(VoiceContextModule, "useVoiceContext").mockReturnValue(
    buildCtx({ state: voiceState, toggleListening }),
  );

  return <VoiceMicButton variant={variant} />;
}

/** Helper to create a fresh controlRef and render the controlled wrapper */
function renderControlled(initialState: VoiceState = "idle") {
  const controlRef = React.createRef<{
    setVoiceState: (s: VoiceState) => void;
  } | null>() as React.MutableRefObject<{
    setVoiceState: (s: VoiceState) => void;
  } | null>;
  controlRef.current = null;

  const utils = render(
    <ControlledVoiceMicWrapper
      controlRef={controlRef}
      initialState={initialState}
    />,
  );
  return { controlRef, ...utils };
}

/** Flush React state + the setTimeout(0) used by the live-region cycle */
async function flushAll() {
  await act(async () => {});
  await act(async () => {
    await new Promise<void>((r) => setTimeout(r, 0));
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// Criterion 1 — Listening state exposed programmatically
// ═══════════════════════════════════════════════════════════════════════════════

describe("Criterion 1 — Listening state exposed programmatically", () => {
  const variants = ["navbar", "sidebar"] as const;

  variants.forEach((variant) => {
    describe(`variant="${variant}"`, () => {
      it("button has role=button so it is keyboard-accessible and discoverable", () => {
        mockCtx({ state: "idle" });
        render(<VoiceMicButton variant={variant} />);
        const btn = screen.getAllByRole("button")[0];
        expect(btn.tagName).toBe("BUTTON");
      });

      it("aria-pressed=false when state is idle", () => {
        mockCtx({ state: "idle" });
        render(<VoiceMicButton variant={variant} />);
        const btn = screen.getAllByRole("button")[0];
        expect(btn).toHaveAttribute("aria-pressed", "false");
      });

      it("aria-pressed=true when state is listening", () => {
        mockCtx({ state: "listening" });
        render(<VoiceMicButton variant={variant} />);
        const btn = screen.getAllByRole("button")[0];
        expect(btn).toHaveAttribute("aria-pressed", "true");
      });

      it("aria-pressed=false when state is processing (not locked-in listening)", () => {
        mockCtx({ state: "processing" });
        render(<VoiceMicButton variant={variant} />);
        const btn = screen.getAllByRole("button")[0];
        expect(btn).toHaveAttribute("aria-pressed", "false");
      });

      const stateLabels: Array<{ state: VoiceState; fragment: string }> = [
        { state: "idle", fragment: "enable voice commands" },
        { state: "listening", fragment: "stop voice control" },
        { state: "processing", fragment: "stop voice control" },
        { state: "command-recognized", fragment: "recognized" },
        { state: "command-unrecognized", fragment: "not recognized" },
        { state: "confirming-destructive", fragment: "confirmation required" },
        { state: "permission-denied", fragment: "microphone access blocked" },
        { state: "unsupported-browser", fragment: "unsupported" },
      ];

      stateLabels.forEach(({ state, fragment }) => {
        it(`aria-label contains "${fragment}" when state="${state}"`, () => {
          mockCtx({ state, isSupported: state !== "unsupported-browser" });
          render(<VoiceMicButton variant={variant} />);
          const btn = screen.getAllByRole("button")[0];
          const label = btn.getAttribute("aria-label") ?? "";
          expect(label.toLowerCase()).toContain(fragment.toLowerCase());
        });
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Criterion 2 — State change is announced
// ═══════════════════════════════════════════════════════════════════════════════

describe("Criterion 2 — State change is announced via aria-live region", () => {
  it("renders an aria-live=assertive region (data-testid=voice-mic-live-region)", () => {
    mockCtx({ state: "idle" });
    render(<VoiceMicButton />);
    const region = screen.getByTestId("voice-mic-live-region");
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute("aria-live", "assertive");
    expect(region).toHaveAttribute("role", "status");
    expect(region).toHaveAttribute("aria-atomic", "true");
  });

  it("live region is empty when state has not changed since mount", () => {
    mockCtx({ state: "idle" });
    render(<VoiceMicButton />);
    const region = screen.getByTestId("voice-mic-live-region");
    expect(region).toHaveTextContent("");
  });

  it("live region announces when state transitions to listening", async () => {
    const { controlRef } = renderControlled("idle");
    await flushAll();

    await act(async () => {
      controlRef.current!.setVoiceState("listening");
    });
    await flushAll();

    expect(screen.getByTestId("voice-mic-live-region").textContent).toMatch(
      /listening/i,
    );
  });

  it("live region announces when state transitions to idle (mic stopped)", async () => {
    const { controlRef } = renderControlled("idle");
    // First go to listening to establish a prior state
    await act(async () => {
      controlRef.current!.setVoiceState("listening");
    });
    await flushAll();

    // Now stop
    await act(async () => {
      controlRef.current!.setVoiceState("idle");
    });
    await flushAll();

    expect(screen.getByTestId("voice-mic-live-region").textContent).toMatch(
      /microphone off/i,
    );
  });

  it("live region announces processing state", async () => {
    const { controlRef } = renderControlled("idle");
    await flushAll();

    await act(async () => {
      controlRef.current!.setVoiceState("processing");
    });
    await flushAll();

    expect(screen.getByTestId("voice-mic-live-region").textContent).toMatch(
      /processing/i,
    );
  });

  it("live region announces command-unrecognized state", async () => {
    const { controlRef } = renderControlled("listening");
    await flushAll();

    await act(async () => {
      controlRef.current!.setVoiceState("command-unrecognized");
    });
    await flushAll();

    expect(screen.getByTestId("voice-mic-live-region").textContent).toMatch(
      /not recognized/i,
    );
  });

  it("live region announces permission-denied state", async () => {
    const { controlRef } = renderControlled("idle");
    await flushAll();

    await act(async () => {
      controlRef.current!.setVoiceState("permission-denied");
    });
    await flushAll();

    expect(screen.getByTestId("voice-mic-live-region").textContent).toMatch(
      /microphone access blocked/i,
    );
  });

  it("live region announces confirming-destructive state", async () => {
    const { controlRef } = renderControlled("listening");
    await flushAll();

    await act(async () => {
      controlRef.current!.setVoiceState("confirming-destructive");
    });
    await flushAll();

    expect(screen.getByTestId("voice-mic-live-region").textContent).toMatch(
      /confirmation required/i,
    );
  });

  it("sidebar variant also renders a live region", () => {
    mockCtx({ state: "idle" });
    render(<VoiceMicButton variant="sidebar" />);
    expect(screen.getByTestId("voice-mic-live-region")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Criterion 3 — State distinguishable without colour
// ═══════════════════════════════════════════════════════════════════════════════

describe("Criterion 3 — State distinguishable without colour", () => {
  describe("navbar variant", () => {
    it("aria-label explicitly conveys state as text — state differs between idle and listening", () => {
      mockCtx({ state: "idle" });
      const { unmount } = render(<VoiceMicButton variant="navbar" />);
      const idleLabel = screen.getByRole("button").getAttribute("aria-label");
      unmount();

      mockCtx({ state: "listening" });
      render(<VoiceMicButton variant="navbar" />);
      const listeningLabel = screen
        .getByRole("button")
        .getAttribute("aria-label");

      expect(idleLabel).not.toEqual(listeningLabel);
    });

    it("renders the non-colour recording dot when listening", () => {
      mockCtx({ state: "listening" });
      const { container } = render(<VoiceMicButton variant="navbar" />);
      const dot = container.querySelector('[title="Recording"]');
      expect(dot).toBeInTheDocument();
    });

    it("does not render the non-colour recording dot when idle", () => {
      mockCtx({ state: "idle" });
      const { container } = render(<VoiceMicButton variant="navbar" />);
      const dot = container.querySelector('[title="Recording"]');
      expect(dot).toBeNull();
    });
  });

  describe("sidebar variant", () => {
    it("renders REC badge when listening — state is text-distinguishable without colour", () => {
      mockCtx({ state: "listening" });
      const { container } = render(<VoiceMicButton variant="sidebar" />);
      const badge = Array.from(
        container.querySelectorAll('[aria-hidden="true"]'),
      ).find((el) => el.textContent === "REC");
      expect(badge).toBeDefined();
    });

    it("does not render REC badge when idle", () => {
      mockCtx({ state: "idle" });
      const { container } = render(<VoiceMicButton variant="sidebar" />);
      const badge = Array.from(
        container.querySelectorAll('[aria-hidden="true"]'),
      ).find((el) => el.textContent === "REC");
      expect(badge).toBeUndefined();
    });

    it("shows 'Voice Active' visible text when listening (non-colour label change)", () => {
      mockCtx({ state: "listening" });
      render(<VoiceMicButton variant="sidebar" />);
      expect(screen.getByText("Voice Active")).toBeInTheDocument();
    });

    it("shows 'Voice Commands' visible text when idle", () => {
      mockCtx({ state: "idle" });
      render(<VoiceMicButton variant="sidebar" />);
      expect(screen.getByText("Voice Commands")).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Criterion 4 — Stopping capture reachable by keyboard
// ═══════════════════════════════════════════════════════════════════════════════

describe("Criterion 4 — Stopping capture reachable by keyboard", () => {
  // userEvent.setup() creates its own event dispatch loop compatible with
  // real timers. No vi.useFakeTimers() needed here.
  const user = userEvent.setup();

  it("the mic button is a native <button> — keyboard-activatable by default", () => {
    mockCtx({ state: "listening" });
    render(<VoiceMicButton variant="navbar" />);
    const btn = screen.getByRole("button");
    expect(btn.tagName).toBe("BUTTON");
    expect(btn).not.toBeDisabled();
  });

  it("clicking the button while listening calls toggleListening", async () => {
    const toggleListening = vi.fn();
    mockCtx({ state: "listening", toggleListening });
    render(<VoiceMicButton variant="navbar" />);
    await user.click(screen.getByRole("button"));
    expect(toggleListening).toHaveBeenCalledOnce();
  });

  it("keyboard focus + Enter activates the button while listening", async () => {
    const toggleListening = vi.fn();
    mockCtx({ state: "listening", toggleListening });
    render(<VoiceMicButton variant="navbar" />);
    const btn = screen.getByRole("button");
    btn.focus();
    expect(btn).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(toggleListening).toHaveBeenCalledOnce();
  });

  it("Space activates the button (native button behaviour)", async () => {
    const toggleListening = vi.fn();
    mockCtx({ state: "listening", toggleListening });
    render(<VoiceMicButton variant="navbar" />);
    const btn = screen.getByRole("button");
    btn.focus();
    await user.keyboard(" ");
    expect(toggleListening).toHaveBeenCalledOnce();
  });

  it("has focus-visible ring class (keyboard focus indicator)", () => {
    mockCtx({ state: "listening" });
    render(<VoiceMicButton variant="navbar" />);
    const btn = screen.getByRole("button");
    expect(btn.tabIndex).toBe(0);
    expect(btn.className).toMatch(/focus-visible:ring-2/);
  });

  it("sidebar variant Stop button is reachable by keyboard", async () => {
    const toggleListening = vi.fn();
    mockCtx({ state: "listening", toggleListening });
    render(<VoiceMicButton variant="sidebar" />);
    const btn = screen.getByRole("button", { name: /stop voice control/i });
    expect(btn).toBeInTheDocument();
    expect(btn.tabIndex).toBe(0);
    btn.focus();
    expect(btn).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(toggleListening).toHaveBeenCalledOnce();
  });

  it("aria-label explicitly says 'Stop' so screen reader users know the action", () => {
    mockCtx({ state: "listening" });
    render(<VoiceMicButton variant="navbar" />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toMatch(/stop/i);
  });

  it("disabled when unsupported — cannot trigger an unachievable action", () => {
    mockCtx({ state: "unsupported-browser", isSupported: false });
    render(<VoiceMicButton variant="navbar" />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
