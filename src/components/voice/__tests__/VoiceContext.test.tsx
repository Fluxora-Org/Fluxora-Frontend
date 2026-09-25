/**
 * Tests for VoiceContext.tsx — state machine transitions
 *
 * Covers the full lifecycle that the existing VoiceCommandManager.test.tsx
 * does NOT: explicit state assertions for every transition, confirm/cancel
 * path clearing pendingDestructiveCommand, stopListening, toggleListening
 * gating, isSupported=false gating, SpeechRecognition mock for startListening,
 * alias matching, and processSpokenPhrase return values.
 *
 * Issue: #968
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { VoiceProvider, useVoiceContext } from "../VoiceContext";

// ─── Shared test consumer ─────────────────────────────────────────────────────

/**
 * Renders a minimal consumer that exposes every piece of context state
 * via data-testid attributes and buttons for every action.
 */
function VoiceConsumer({
  onReturnValue,
}: {
  onReturnValue?: (v: boolean) => void;
}) {
  const location = useLocation();
  const ctx = useVoiceContext();
  return (
    <div>
      <span data-testid="state">{ctx.state}</span>
      <span data-testid="is-supported">{String(ctx.isSupported)}</span>
      <span data-testid="transcript">{ctx.transcript}</span>
      <span data-testid="pending">
        {ctx.pendingDestructiveCommand?.id ?? "none"}
      </span>
      <span data-testid="recognized">
        {ctx.recognizedCommand?.command.id ?? "none"}
      </span>
      <span data-testid="panel-open">{String(ctx.panelOpen)}</span>
      <span data-testid="location">{location.pathname + location.search}</span>

      {/* processSpokenPhrase */}
      <button
        data-testid="phrase-streams"
        onClick={() => {
          const r = ctx.processSpokenPhrase("Go to streams");
          onReturnValue?.(r);
        }}
      >
        phrase-streams
      </button>
      <button
        data-testid="phrase-dashboard"
        onClick={() => ctx.processSpokenPhrase("Go to dashboard")}
      >
        phrase-dashboard
      </button>
      <button
        data-testid="phrase-recipient"
        onClick={() => ctx.processSpokenPhrase("Go to recipient")}
      >
        phrase-recipient
      </button>
      <button
        data-testid="phrase-create"
        onClick={() => ctx.processSpokenPhrase("Create stream")}
      >
        phrase-create
      </button>
      <button
        data-testid="phrase-withdraw"
        onClick={() => ctx.processSpokenPhrase("Withdraw")}
      >
        phrase-withdraw
      </button>
      <button
        data-testid="phrase-cancel-stream"
        onClick={() => {
          const r = ctx.processSpokenPhrase("Cancel stream");
          onReturnValue?.(r);
        }}
      >
        phrase-cancel-stream
      </button>
      <button
        data-testid="phrase-unknown"
        onClick={() => {
          const r = ctx.processSpokenPhrase("xyzzy nonsense phrase");
          onReturnValue?.(r);
        }}
      >
        phrase-unknown
      </button>
      <button
        data-testid="phrase-ambiguous"
        onClick={() => {
          const r = ctx.processSpokenPhrase("stream");
          onReturnValue?.(r);
        }}
      >
        phrase-ambiguous
      </button>
      <button
        data-testid="phrase-confirm"
        onClick={() => ctx.processSpokenPhrase("confirm")}
      >
        phrase-confirm
      </button>
      <button
        data-testid="phrase-yes"
        onClick={() => ctx.processSpokenPhrase("yes")}
      >
        phrase-yes
      </button>
      <button
        data-testid="phrase-cancel-word"
        onClick={() => ctx.processSpokenPhrase("cancel")}
      >
        phrase-cancel-word
      </button>
      <button
        data-testid="phrase-no"
        onClick={() => ctx.processSpokenPhrase("no")}
      >
        phrase-no
      </button>
      <button
        data-testid="phrase-abort"
        onClick={() => ctx.processSpokenPhrase("abort")}
      >
        phrase-abort
      </button>

      {/* Alias variants */}
      <button
        data-testid="alias-streams"
        onClick={() => ctx.processSpokenPhrase("streams")}
      >
        alias-streams
      </button>
      <button
        data-testid="alias-withdraw"
        onClick={() => ctx.processSpokenPhrase("claim funds")}
      >
        alias-withdraw
      </button>
      <button
        data-testid="alias-cancel"
        onClick={() => ctx.processSpokenPhrase("delete stream")}
      >
        alias-cancel
      </button>

      {/* Direct actions */}
      <button data-testid="confirm-action" onClick={ctx.confirmDestructiveAction}>
        confirm-action
      </button>
      <button data-testid="cancel-action" onClick={ctx.cancelDestructiveAction}>
        cancel-action
      </button>
      <button data-testid="start-listening" onClick={ctx.startListening}>
        start-listening
      </button>
      <button data-testid="stop-listening" onClick={ctx.stopListening}>
        stop-listening
      </button>
      <button data-testid="toggle-listening" onClick={ctx.toggleListening}>
        toggle-listening
      </button>
      <button data-testid="toggle-panel" onClick={ctx.togglePanel}>
        toggle-panel
      </button>
    </div>
  );
}

function renderVoice(
  initialPath = "/app",
  onReturnValue?: (v: boolean) => void
) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <VoiceProvider>
        <VoiceConsumer onReturnValue={onReturnValue} />
      </VoiceProvider>
    </MemoryRouter>
  );
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  // Default: no native SpeechRecognition in jsdom → feature detection fires
  delete (window as any).SpeechRecognition;
  delete (window as any).webkitSpeechRecognition;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ─── Initial state ─────────────────────────────────────────────────────────────

describe("VoiceContext — initial state", () => {
  it("starts in unsupported-browser state when SpeechRecognition is absent", () => {
    renderVoice();
    expect(screen.getByTestId("state").textContent).toBe("unsupported-browser");
    expect(screen.getByTestId("is-supported").textContent).toBe("false");
  });

  it("starts in idle state when SpeechRecognition is present", () => {
    (window as any).SpeechRecognition = vi.fn();
    renderVoice();
    expect(screen.getByTestId("state").textContent).toBe("idle");
    expect(screen.getByTestId("is-supported").textContent).toBe("true");
  });

  it("starts with no pending destructive command", () => {
    renderVoice();
    expect(screen.getByTestId("pending").textContent).toBe("none");
  });

  it("starts with panel closed", () => {
    renderVoice();
    expect(screen.getByTestId("panel-open").textContent).toBe("false");
  });

  it("exposes the full DEFAULT_COMMANDS list via availableCommands", () => {
    function CmdCount() {
      const { availableCommands } = useVoiceContext();
      return <span data-testid="cmd-count">{availableCommands.length}</span>;
    }
    render(
      <MemoryRouter>
        <VoiceProvider>
          <CmdCount />
        </VoiceProvider>
      </MemoryRouter>
    );
    expect(parseInt(screen.getByTestId("cmd-count").textContent!)).toBeGreaterThanOrEqual(6);
  });
});

// ─── processSpokenPhrase — non-destructive recognized commands ─────────────────

describe("VoiceContext — processSpokenPhrase: non-destructive recognized", () => {
  beforeEach(() => {
    (window as any).SpeechRecognition = vi.fn();
  });

  it("transitions idle → processing → command-recognized for 'Go to streams'", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-streams"));
    expect(screen.getByTestId("state").textContent).toBe("command-recognized");
  });

  it("returns true for a recognized non-destructive phrase", () => {
    const spy = vi.fn();
    renderVoice("/app", spy);
    fireEvent.click(screen.getByTestId("phrase-streams"));
    expect(spy).toHaveBeenCalledWith(true);
  });

  it("sets transcript to the spoken phrase", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-streams"));
    expect(screen.getByTestId("transcript").textContent).toBe("Go to streams");
  });

  it("stores the recognized command id", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-streams"));
    expect(screen.getByTestId("recognized").textContent).toBe("nav-streams");
  });

  it("navigates to /app/streams for 'Go to streams'", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-streams"));
    expect(screen.getByTestId("location").textContent).toBe("/app/streams");
  });

  it("navigates to /app for 'Go to dashboard'", () => {
    renderVoice("/app/streams");
    fireEvent.click(screen.getByTestId("phrase-dashboard"));
    expect(screen.getByTestId("location").textContent).toBe("/app");
  });

  it("navigates to /app/recipient for 'Go to recipient'", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-recipient"));
    expect(screen.getByTestId("location").textContent).toBe("/app/recipient");
  });

  it("navigates to /app/streams?action=create for 'Create stream'", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-create"));
    expect(screen.getByTestId("location").textContent).toBe("/app/streams?action=create");
  });

  it("navigates to /app/recipient?action=withdraw for 'Withdraw'", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-withdraw"));
    expect(screen.getByTestId("location").textContent).toBe("/app/recipient?action=withdraw");
  });

  it("auto-resets from command-recognized to listening after 2 s", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-streams"));
    expect(screen.getByTestId("state").textContent).toBe("command-recognized");
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByTestId("state").textContent).toBe("listening");
  });

  it("does NOT reset to listening if state changed before timer fires", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-streams"));
    // Trigger another phrase before timer fires to move away from command-recognized
    fireEvent.click(screen.getByTestId("phrase-unknown"));
    act(() => { vi.advanceTimersByTime(2000); });
    // State should be command-unrecognized, not listening
    expect(screen.getByTestId("state").textContent).toBe("command-unrecognized");
  });
});

// ─── processSpokenPhrase — alias matching ─────────────────────────────────────

describe("VoiceContext — processSpokenPhrase: alias matching", () => {
  beforeEach(() => {
    (window as any).SpeechRecognition = vi.fn();
  });

  it("matches alias 'streams' → nav-streams → command-recognized", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("alias-streams"));
    expect(screen.getByTestId("state").textContent).toBe("command-recognized");
    expect(screen.getByTestId("recognized").textContent).toBe("nav-streams");
  });

  it("matches alias 'claim funds' → action-withdraw → command-recognized", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("alias-withdraw"));
    expect(screen.getByTestId("state").textContent).toBe("command-recognized");
    expect(screen.getByTestId("recognized").textContent).toBe("action-withdraw");
  });

  it("matches alias 'delete stream' → destructive-cancel-stream → confirming-destructive", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("alias-cancel"));
    expect(screen.getByTestId("state").textContent).toBe("confirming-destructive");
    expect(screen.getByTestId("pending").textContent).toBe("destructive-cancel-stream");
  });
});

// ─── processSpokenPhrase — unrecognized ───────────────────────────────────────

describe("VoiceContext — processSpokenPhrase: unrecognized phrase", () => {
  beforeEach(() => {
    (window as any).SpeechRecognition = vi.fn();
  });

  it("transitions to command-unrecognized for an unknown phrase", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-unknown"));
    expect(screen.getByTestId("state").textContent).toBe("command-unrecognized");
  });

  it("returns false for an unrecognized phrase", () => {
    const spy = vi.fn();
    renderVoice("/app", spy);
    fireEvent.click(screen.getByTestId("phrase-unknown"));
    expect(spy).toHaveBeenCalledWith(false);
  });

  it("sets transcript even for unrecognized phrases", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-unknown"));
    expect(screen.getByTestId("transcript").textContent).toBe("xyzzy nonsense phrase");
  });

  it("auto-resets from command-unrecognized to listening after 3 s", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-unknown"));
    expect(screen.getByTestId("state").textContent).toBe("command-unrecognized");
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByTestId("state").textContent).toBe("listening");
  });

  it("does NOT auto-reset if state changed before 3 s timer fires", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-unknown"));
    // Trigger a recognized phrase to change state
    fireEvent.click(screen.getByTestId("phrase-streams"));
    act(() => { vi.advanceTimersByTime(3000); });
    // Should still be command-recognized (or listening from its own timer)
    expect(screen.getByTestId("state").textContent).not.toBe("command-unrecognized");
  });
});

describe("VoiceContext — ambiguous phrase safety", () => {
  beforeEach(() => {
    (window as any).SpeechRecognition = vi.fn();
  });

  it("does not choose the first command for an ambiguous stream phrase", () => {
    const spy = vi.fn();
    renderVoice("/app", spy);
    fireEvent.click(screen.getByTestId("phrase-ambiguous"));
    expect(screen.getByTestId("state").textContent).toBe("command-ambiguous");
    expect(screen.getByTestId("recognized").textContent).toBe("none");
    expect(screen.getByTestId("location").textContent).toBe("/app");
    expect(spy).toHaveBeenCalledWith(false);
  });
});

// ─── processSpokenPhrase — destructive path ───────────────────────────────────

describe("VoiceContext — processSpokenPhrase: destructive command", () => {
  beforeEach(() => {
    (window as any).SpeechRecognition = vi.fn();
  });

  it("transitions to confirming-destructive for 'Cancel stream'", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    expect(screen.getByTestId("state").textContent).toBe("confirming-destructive");
  });

  it("returns true for a recognized destructive phrase", () => {
    const spy = vi.fn();
    renderVoice("/app", spy);
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    expect(spy).toHaveBeenCalledWith(true);
  });

  it("sets pendingDestructiveCommand to destructive-cancel-stream", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    expect(screen.getByTestId("pending").textContent).toBe("destructive-cancel-stream");
  });

  it("stores the recognized command id for the destructive command", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    expect(screen.getByTestId("recognized").textContent).toBe("destructive-cancel-stream");
  });

  it("does NOT navigate immediately when destructive command requires confirmation", () => {
    renderVoice("/app");
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    expect(screen.getByTestId("location").textContent).toBe("/app");
  });
});

// ─── processSpokenPhrase — confirmation word routing ──────────────────────────

describe("VoiceContext — processSpokenPhrase: confirmation words while pending", () => {
  beforeEach(() => {
    (window as any).SpeechRecognition = vi.fn();
  });

  it("'confirm' word while pending routes to confirmDestructiveAction → command-recognized", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    expect(screen.getByTestId("state").textContent).toBe("confirming-destructive");
    fireEvent.click(screen.getByTestId("phrase-confirm"));
    expect(screen.getByTestId("state").textContent).toBe("command-recognized");
  });

  it("'yes' word while pending routes to confirmDestructiveAction", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    fireEvent.click(screen.getByTestId("phrase-yes"));
    expect(screen.getByTestId("state").textContent).toBe("command-recognized");
  });

  it("'cancel' word while pending routes to cancelDestructiveAction → listening", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    fireEvent.click(screen.getByTestId("phrase-cancel-word"));
    expect(screen.getByTestId("state").textContent).toBe("listening");
  });

  it("'no' word while pending routes to cancelDestructiveAction", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    fireEvent.click(screen.getByTestId("phrase-no"));
    expect(screen.getByTestId("state").textContent).toBe("listening");
  });

  it("'abort' word while pending routes to cancelDestructiveAction", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    fireEvent.click(screen.getByTestId("phrase-abort"));
    expect(screen.getByTestId("state").textContent).toBe("listening");
  });

  it("clears pendingDestructiveCommand after confirm word", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    expect(screen.getByTestId("pending").textContent).toBe("destructive-cancel-stream");
    fireEvent.click(screen.getByTestId("phrase-confirm"));
    expect(screen.getByTestId("pending").textContent).toBe("none");
  });

  it("clears pendingDestructiveCommand after cancel word", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    expect(screen.getByTestId("pending").textContent).toBe("destructive-cancel-stream");
    fireEvent.click(screen.getByTestId("phrase-cancel-word"));
    expect(screen.getByTestId("pending").textContent).toBe("none");
  });
});

// ─── confirmDestructiveAction direct call ─────────────────────────────────────

describe("VoiceContext — confirmDestructiveAction", () => {
  beforeEach(() => {
    (window as any).SpeechRecognition = vi.fn();
  });

  it("transitions confirming-destructive → command-recognized", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    fireEvent.click(screen.getByTestId("confirm-action"));
    expect(screen.getByTestId("state").textContent).toBe("command-recognized");
  });

  it("clears pendingDestructiveCommand", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    fireEvent.click(screen.getByTestId("confirm-action"));
    expect(screen.getByTestId("pending").textContent).toBe("none");
  });

  it("navigates to /app/streams?action=cancel", () => {
    renderVoice("/app");
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    fireEvent.click(screen.getByTestId("confirm-action"));
    expect(screen.getByTestId("location").textContent).toBe("/app/streams?action=cancel");
  });

  it("auto-resets to listening after 2 s", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    fireEvent.click(screen.getByTestId("confirm-action"));
    expect(screen.getByTestId("state").textContent).toBe("command-recognized");
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByTestId("state").textContent).toBe("listening");
  });

  it("is a no-op when pendingDestructiveCommand is null (safe guard)", () => {
    renderVoice();
    // No cancel-stream fired, so pending is null
    expect(screen.getByTestId("pending").textContent).toBe("none");
    fireEvent.click(screen.getByTestId("confirm-action"));
    // State should stay idle (unsupported-browser or idle depending on setup)
    expect(["idle", "unsupported-browser"]).toContain(
      screen.getByTestId("state").textContent
    );
  });
});

// ─── cancelDestructiveAction direct call ─────────────────────────────────────

describe("VoiceContext — cancelDestructiveAction", () => {
  beforeEach(() => {
    (window as any).SpeechRecognition = vi.fn();
  });

  it("transitions confirming-destructive → listening", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    fireEvent.click(screen.getByTestId("cancel-action"));
    expect(screen.getByTestId("state").textContent).toBe("listening");
  });

  it("clears pendingDestructiveCommand", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    fireEvent.click(screen.getByTestId("cancel-action"));
    expect(screen.getByTestId("pending").textContent).toBe("none");
  });

  it("does NOT navigate away", () => {
    renderVoice("/app");
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    fireEvent.click(screen.getByTestId("cancel-action"));
    expect(screen.getByTestId("location").textContent).toBe("/app");
  });

  it("full round-trip: cancel-stream → cancel → no navigation → pending cleared", () => {
    renderVoice("/app/streams");
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    expect(screen.getByTestId("state").textContent).toBe("confirming-destructive");
    expect(screen.getByTestId("pending").textContent).toBe("destructive-cancel-stream");
    fireEvent.click(screen.getByTestId("cancel-action"));
    expect(screen.getByTestId("state").textContent).toBe("listening");
    expect(screen.getByTestId("pending").textContent).toBe("none");
    expect(screen.getByTestId("location").textContent).toBe("/app/streams");
  });
});

// ─── stopListening ────────────────────────────────────────────────────────────

describe("VoiceContext — stopListening", () => {
  beforeEach(() => {
    (window as any).SpeechRecognition = vi.fn();
  });

  it("transitions any state → idle", () => {
    renderVoice();
    // Push into command-recognized first
    fireEvent.click(screen.getByTestId("phrase-streams"));
    expect(screen.getByTestId("state").textContent).toBe("command-recognized");
    fireEvent.click(screen.getByTestId("stop-listening"));
    expect(screen.getByTestId("state").textContent).toBe("idle");
  });

  it("transitions from confirming-destructive → idle", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    fireEvent.click(screen.getByTestId("stop-listening"));
    expect(screen.getByTestId("state").textContent).toBe("idle");
  });
});

// ─── startListening ───────────────────────────────────────────────────────────

describe("VoiceContext — startListening: isSupported=false gating", () => {
  it("transitions to unsupported-browser when isSupported is false (no SpeechRecognition)", () => {
    // SpeechRecognition already deleted in beforeEach
    renderVoice();
    expect(screen.getByTestId("is-supported").textContent).toBe("false");
    fireEvent.click(screen.getByTestId("start-listening"));
    expect(screen.getByTestId("state").textContent).toBe("unsupported-browser");
  });
});

// ─── startListening: SpeechRecognition mock ─────────────────────────────────
// These tests drive startListening via direct ctx calls and use act() wrapping
// inside the mock's start() to flush React state updates synchronously.
// The key insight: state updates triggered from mock callbacks need to be
// wrapped in act() at the call site inside the mock, not around fireEvent.

describe("VoiceContext — startListening: SpeechRecognition mock", () => {
  // jsdom does not implement SpeechRecognition. We install a minimal constructor
  // mock on window so startListening reaches recognition.start(). State updates
  // from recognition callbacks are wrapped in act() inside the mock so React
  // flushes them synchronously.

  function mountMocked(
    startBehavior: (rec: any) => void,
    useWebkit = false
  ) {
    let _onstart: any = null;
    let _onend: any = null;
    let _onerror: any = null;
    const rec: any = {
      continuous: false, interimResults: false, lang: "", onresult: null,
      get onstart() { return _onstart; },
      set onstart(fn: any) { _onstart = fn; },
      get onend()   { return _onend;   },
      set onend(fn: any)   { _onend   = fn; },
      get onerror() { return _onerror; },
      set onerror(fn: any) { _onerror = fn; },
      start: vi.fn().mockImplementation(() => startBehavior(rec)),
      stop:  vi.fn(),
      fire: {
        onstart() { act(() => { _onstart?.();              }); },
        onend()   { act(() => { _onend?.();                }); },
        onerror(code: string) { act(() => { _onerror?.({ error: code }); }); },
      },
    };
    // Must use a regular function (not an arrow) so `new SpeechRecognitionClass()`
    // honours the return value. Arrow functions cannot be constructors and the
    // engine ignores their return value when called with `new`, yielding an
    // empty `this` object instead of `rec`.
    const ctor = vi.fn().mockImplementation(function () { return rec; });
    if (useWebkit) {
      delete (window as any).SpeechRecognition;
      (window as any).webkitSpeechRecognition = ctor;
    } else {
      (window as any).SpeechRecognition = ctor;
    }
    // Capture ctx directly via a helper component — avoids stale-closure issues
    // with the button handler, since we call startListening on the live ctx ref.
    let latestCtx: any;
    function Probe() {
      latestCtx = useVoiceContext();
      return <span data-testid="state">{latestCtx.state}</span>;
    }
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <VoiceProvider><Probe /></VoiceProvider>
      </MemoryRouter>
    );
    return {
      state: () => screen.getByTestId("state").textContent,
      startListening: () => act(() => { latestCtx.startListening(); }),
      rec,
    };
  }

  it("transitions to listening when onstart fires", () => {
    const { state, startListening } = mountMocked((r) => r.fire.onstart());
    startListening();
    expect(state()).toBe("listening");
  });

  it("transitions to permission-denied for 'not-allowed' onerror", () => {
    const { state, startListening } = mountMocked((r) => r.fire.onerror("not-allowed"));
    startListening();
    expect(state()).toBe("permission-denied");
  });

  it("transitions to permission-denied for 'permission-denied' error string", () => {
    const { state, startListening } = mountMocked((r) => r.fire.onerror("permission-denied"));
    startListening();
    expect(state()).toBe("permission-denied");
  });

  it("transitions to idle for non-permission onerror", () => {
    const { state, startListening } = mountMocked((r) => r.fire.onerror("network"));
    startListening();
    expect(state()).toBe("idle");
  });

  it("falls back to idle when recognition.start() throws", () => {
    const { state, startListening } = mountMocked(() => { throw new Error("mic busy"); });
    startListening();
    expect(state()).toBe("idle");
  });

  it("uses webkitSpeechRecognition when SpeechRecognition is absent", () => {
    const { state, startListening } = mountMocked((r) => r.fire.onstart(), true);
    startListening();
    expect(state()).toBe("listening");
  });

  it("transitions to idle via onend when state was listening", () => {
    const { state, startListening, rec } = mountMocked((r) => r.fire.onstart());
    startListening();
    expect(state()).toBe("listening");
    rec.fire.onend();
    expect(state()).toBe("idle");
  });

  it("does NOT reset to idle via onend when state is permission-denied", () => {
    const { state, startListening, rec } = mountMocked((r) => r.fire.onerror("not-allowed"));
    startListening();
    expect(state()).toBe("permission-denied");
    rec.fire.onend();
    expect(state()).toBe("permission-denied");
  });
});

// ─── toggleListening ──────────────────────────────────────────────────────────

describe("VoiceContext — toggleListening", () => {
  it("calls startListening (→ unsupported-browser) when isSupported=false", () => {
    renderVoice();
    expect(screen.getByTestId("state").textContent).toBe("unsupported-browser");
    fireEvent.click(screen.getByTestId("toggle-listening"));
    expect(screen.getByTestId("state").textContent).toBe("unsupported-browser");
  });

  it("stopListening resets from command-recognized → idle via stop button", () => {
    (window as any).SpeechRecognition = vi.fn();
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-streams")); // → command-recognized
    expect(screen.getByTestId("state").textContent).toBe("command-recognized");
    fireEvent.click(screen.getByTestId("stop-listening"));
    expect(screen.getByTestId("state").textContent).toBe("idle");
  });

  it("stopListening resets from confirming-destructive → idle", () => {
    (window as any).SpeechRecognition = vi.fn();
    renderVoice();
    fireEvent.click(screen.getByTestId("phrase-cancel-stream"));
    expect(screen.getByTestId("state").textContent).toBe("confirming-destructive");
    fireEvent.click(screen.getByTestId("stop-listening"));
    expect(screen.getByTestId("state").textContent).toBe("idle");
  });

  it("toggleListening when state is idle and isSupported=false stays unsupported-browser", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("toggle-listening"));
    expect(screen.getByTestId("state").textContent).toBe("unsupported-browser");
  });
});

// ─── togglePanel ──────────────────────────────────────────────────────────────

describe("VoiceContext — togglePanel", () => {
  it("toggles panelOpen from false → true", () => {
    renderVoice();
    expect(screen.getByTestId("panel-open").textContent).toBe("false");
    fireEvent.click(screen.getByTestId("toggle-panel"));
    expect(screen.getByTestId("panel-open").textContent).toBe("true");
  });

  it("toggles panelOpen from true → false", () => {
    renderVoice();
    fireEvent.click(screen.getByTestId("toggle-panel"));
    expect(screen.getByTestId("panel-open").textContent).toBe("true");
    fireEvent.click(screen.getByTestId("toggle-panel"));
    expect(screen.getByTestId("panel-open").textContent).toBe("false");
  });
});

// ─── useVoiceContext guard ─────────────────────────────────────────────────────

describe("VoiceContext — useVoiceContext guard", () => {
  it("throws when used outside VoiceProvider", () => {
    function Bare() {
      useVoiceContext();
      return null;
    }
    expect(() => render(<MemoryRouter><Bare /></MemoryRouter>)).toThrow(
      "useVoiceContext must be used within a VoiceProvider"
    );
  });
});
