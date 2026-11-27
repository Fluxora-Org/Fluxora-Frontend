vi.unmock("../ToastProvider");
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ToastProvider, useToast } from "../ToastProvider";
import {
  getNotificationHistory,
  resetNotificationHistoryForTests,
} from "../../../lib/notificationHistory";

const HASH = "f".repeat(64);

function Triggers() {
  const { addToast } = useToast();
  return (
    <>
      <button
        type="button"
        onClick={() =>
          addToast("Stream created", "success", {
            timeout: 0,
            persist: { kind: "stream-created", reference: HASH },
          })
        }
      >
        Create stream
      </button>
      <button
        type="button"
        onClick={() =>
          addToast("Withdrawal completed", "success", {
            timeout: 0,
            persist: { kind: "withdraw" },
          })
        }
      >
        Withdraw
      </button>
      <button
        type="button"
        onClick={() =>
          addToast("Transaction failed", "error", {
            persist: { kind: "transaction-failed" },
          })
        }
      >
        Fail
      </button>
      <button type="button" onClick={() => addToast("Ephemeral", "info")}>
        Ephemeral
      </button>
    </>
  );
}

function renderProvider() {
  return render(
    <ToastProvider>
      <Triggers />
    </ToastProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  resetNotificationHistoryForTests();
});

describe("ToastProvider persisted outcomes", () => {
  it("records only events marked persist and truncates references", () => {
    renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "Ephemeral" }));
    expect(getNotificationHistory()).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Create stream" }));
    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
    fireEvent.click(screen.getByRole("button", { name: "Fail" }));

    const entries = getNotificationHistory();
    expect(entries.map((entry) => entry.kind)).toEqual([
      "transaction-failed",
      "withdraw",
      "stream-created",
    ]);
    expect(entries[2].reference).toBe(`${HASH.slice(0, 6)}…${HASH.slice(-4)}`);
  });

  it("does not duplicate a persisted event within the dedupe window", () => {
    renderProvider();
    const create = screen.getByRole("button", { name: "Create stream" });
    fireEvent.click(create);
    fireEvent.click(create);
    expect(getNotificationHistory()).toHaveLength(1);
  });
});
