/**
 * Regression tests for issue #1687 — voice stream identification must never
 * resolve an ambiguous spoken reference to the wrong stream.
 *
 * `streamIdentifier.ts` can already report that a reference is ambiguous, but
 * nothing in the spoken command pipeline ever called it: a spoken
 * "Cancel stream <reference> ..." armed the destructive flow whatever the
 * reference resolved to, and saying "Confirm" then acted on an unidentified
 * target. These tests drive the real provider and assert that an ambiguous or
 * low-confidence reference is refused before any command is armed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { StreamRecord } from "../../../data/streamRecords";
import { VoiceProvider, useVoiceContext } from "../VoiceContext";
import { VoiceCommandPanel } from "../VoiceCommandPanel";

/**
 * Two streams that are indistinguishable by ear: the same spoken name, and
 * recipients whose names differ only by an initial.
 */
const { SIMILAR_STREAMS } = vi.hoisted(() => {
  const make = (
    id: string,
    name: string,
    recipientName: string,
  ): Record<string, unknown> => ({
    id,
    name,
    recipientName,
    treasuryName: "Ops Treasury",
    asset: "USDC",
    status: "Active",
  });

  return {
    SIMILAR_STREAMS: [
      make("STR-900", "Operations", "Alice M."),
      make("STR-901", "Operations", "Alice K."),
    ] as unknown as StreamRecord[],
  };
});

vi.mock("../../../data/streamRecords", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../data/streamRecords")>();
  return { ...actual, getStreamRecords: () => SIMILAR_STREAMS };
});

function Harness({
  phrase,
  onResult,
}: {
  phrase: string;
  onResult?: (handled: boolean) => void;
}) {
  const location = useLocation();
  const { state, pendingDestructiveCommand, ambiguityPrompt, processSpokenPhrase } =
    useVoiceContext();
  return (
    <div>
      <span data-testid="state">{state}</span>
      <span data-testid="location">{location.pathname + location.search}</span>
      <span data-testid="pending">
        {pendingDestructiveCommand?.id ?? "none"}
      </span>
      <span data-testid="ambiguity-prompt">{ambiguityPrompt ?? "none"}</span>
      <button
        data-testid="speak"
        onClick={() => {
          const handled = processSpokenPhrase(phrase);
          onResult?.(handled);
        }}
      >
        speak
      </button>
      <button
        data-testid="say-confirm"
        onClick={() => processSpokenPhrase("confirm")}
      >
        say confirm
      </button>
    </div>
  );
}

function renderHarness(
  phrase: string,
  onResult?: (handled: boolean) => void,
  initialPath = "/app/streams",
) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <VoiceProvider>
        <Harness phrase={phrase} onResult={onResult} />
        <VoiceCommandPanel />
      </VoiceProvider>
    </MemoryRouter>,
  );
}

/** Text currently published in a screen-reader live region. */
function liveRegionText(politeness: "polite" | "assertive"): string {
  return (
    document.querySelector(`[aria-live="${politeness}"]`)?.textContent ?? ""
  );
}

/** Every state the harness must never reach for a refused reference. */
function expectNoCommandArmed() {
  expect(screen.getByTestId("state").textContent).toBe("command-ambiguous");
  expect(screen.getByTestId("pending").textContent).toBe("none");
  expect(screen.getByTestId("location").textContent).toBe("/app/streams");
}

describe("voice stream identification refuses ambiguous references (#1687)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (window as unknown as Record<string, unknown>).SpeechRecognition = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("refuses a destructive command that names a stream two streams share", () => {
    const result = vi.fn();
    renderHarness("Cancel stream Operations for Alice M. amount 250 USDC", result);

    fireEvent.click(screen.getByTestId("speak"));

    expect(result).toHaveBeenCalledWith(false);
    expectNoCommandArmed();
  });

  it("refuses a destructive command that names a similar-sounding recipient", () => {
    const result = vi.fn();
    renderHarness("Cancel stream Alice for Ops Treasury amount 250 USDC", result);

    fireEvent.click(screen.getByTestId("speak"));

    expect(result).toHaveBeenCalledWith(false);
    expectNoCommandArmed();
  });

  it("cannot be confirmed into a target after an ambiguous reference is refused", () => {
    renderHarness("Cancel stream Operations for Alice M. amount 250 USDC");

    fireEvent.click(screen.getByTestId("speak"));
    fireEvent.click(screen.getByTestId("say-confirm"));

    // "Confirm" has nothing pending to confirm, so it must not arm or navigate.
    expect(screen.getByTestId("pending").textContent).toBe("none");
    expect(screen.getByTestId("location").textContent).toBe("/app/streams");
  });

  it("still resolves an unambiguous stream reference to the confirmation step", () => {
    const result = vi.fn();
    renderHarness("Cancel stream STR-900 for Alice M. amount 250 USDC", result);

    fireEvent.click(screen.getByTestId("speak"));

    expect(result).toHaveBeenCalledWith(true);
    expect(screen.getByTestId("state").textContent).toBe(
      "confirming-destructive",
    );
    expect(screen.getByTestId("pending").textContent).toBe(
      "destructive-cancel-stream",
    );
  });

  it("asks the user to disambiguate, naming every candidate stream", () => {
    renderHarness("Cancel stream Operations for Alice M. amount 250 USDC");

    fireEvent.click(screen.getByTestId("speak"));

    const prompt = screen.getByTestId("ambiguity-prompt").textContent ?? "";
    // The user is asked to pick a target, and told nothing was executed.
    expect(prompt).toMatch(/matches more than one stream/i);
    expect(prompt).toContain("STR-900");
    expect(prompt).toContain("STR-901");
    expect(prompt).toMatch(/nothing was executed/i);
    expect(prompt).toMatch(/say the full stream id/i);
  });

  it("announces the disambiguation prompt in the assertive live region", () => {
    renderHarness("Cancel stream Operations for Alice M. amount 250 USDC");

    fireEvent.click(screen.getByTestId("speak"));

    const announced = liveRegionText("assertive");
    expect(announced).toBe(
      screen.getByTestId("ambiguity-prompt").textContent,
    );
    expect(announced).toContain("STR-900");
    expect(announced).toContain("STR-901");
  });

  it("shows the disambiguation prompt in the voice panel", () => {
    function OpenPanel() {
      const { togglePanel } = useVoiceContext();
      return (
        <button data-testid="open-panel" onClick={togglePanel}>
          open
        </button>
      );
    }
    render(
      <MemoryRouter initialEntries={["/app/streams"]}>
        <VoiceProvider>
          <Harness phrase="Cancel stream Operations for Alice M. amount 250 USDC" />
          <OpenPanel />
          <VoiceCommandPanel />
        </VoiceProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId("speak"));
    fireEvent.click(screen.getByTestId("open-panel"));

    const panel = screen.getByRole("complementary", {
      name: /voice command reference/i,
    });
    expect(panel).toHaveTextContent(/matches more than one stream/i);
    expect(panel).toHaveTextContent("STR-900");
    expect(panel).toHaveTextContent("STR-901");
  });

  it("clears the disambiguation prompt once a resolvable phrase follows", () => {
    function SayTwice() {
      const { processSpokenPhrase } = useVoiceContext();
      return (
        <>
          <button
            data-testid="say-ambiguous"
            onClick={() =>
              processSpokenPhrase(
                "Cancel stream Operations for Alice M. amount 250 USDC",
              )
            }
          >
            ambiguous
          </button>
          <button
            data-testid="say-clear"
            onClick={() => processSpokenPhrase("Go to streams")}
          >
            clear
          </button>
        </>
      );
    }
    render(
      <MemoryRouter initialEntries={["/app/streams"]}>
        <VoiceProvider>
          <Harness phrase="Go to streams" />
          <SayTwice />
        </VoiceProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId("say-ambiguous"));
    expect(screen.getByTestId("ambiguity-prompt").textContent).not.toBe("none");

    fireEvent.click(screen.getByTestId("say-clear"));
    expect(screen.getByTestId("ambiguity-prompt").textContent).toBe("none");
  });
});
