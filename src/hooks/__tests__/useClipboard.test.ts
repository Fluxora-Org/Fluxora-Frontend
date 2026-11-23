import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyToClipboard, useClipboard } from "../useClipboard";

/**
 * jsdom exposes `navigator.clipboard` as a getter-only property, so it must be
 * redefined (not assigned) when stubbing. `undefined` simulates an insecure
 * context where the Clipboard API is absent.
 */
function setClipboard(value: { writeText: ReturnType<typeof vi.fn> } | undefined) {
  Object.defineProperty(navigator, "clipboard", {
    value,
    configurable: true,
    writable: true,
  });
}

describe("useClipboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("sets status to 'copied' on a successful Clipboard API write", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    const { result } = renderHook(() => useClipboard());

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.copy("GABC");
    });

    expect(returned).toBe(true);
    expect(writeText).toHaveBeenCalledWith("GABC");
    expect(result.current.status).toBe("copied");
  });

  it("copies the exact displayed value through the Clipboard API (no truncation)", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    const address = "GABCDEFGHIJKLMNOPQRSTUVWXYZ2345678901234567890";
    const displayedTruncated = "GABCDE...7890";

    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy(address);
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(address);
    // What lands on the clipboard must be the full value, never a truncated
    // rendering of it.
    expect(writeText).not.toHaveBeenCalledWith(displayedTruncated);
    expect(result.current.status).toBe("copied");
  });

  it("resets status to 'idle' after the reset delay", async () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });

    const { result } = renderHook(() => useClipboard(2000));

    await act(async () => {
      await result.current.copy("GABC");
    });
    expect(result.current.status).toBe("copied");

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.status).toBe("idle");
  });

  it("falls back to execCommand when the Clipboard API is unavailable", async () => {
    setClipboard(undefined);
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand;

    const { result } = renderHook(() => useClipboard());

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.copy("GABC");
    });

    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(returned).toBe(true);
    expect(result.current.status).toBe("copied");
  });

  it("stages the exact displayed value in the execCommand fallback", async () => {
    setClipboard(undefined);
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand;
    // Call-through spy: the real append still happens and we capture the node.
    const appendSpy = vi.spyOn(document.body, "appendChild");

    const address = "GABCDEFGHIJKLMNOPQRSTUVWXYZ2345678901234567890";
    const { result } = renderHook(() => useClipboard());

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.copy(address);
    });

    expect(returned).toBe(true);
    expect(result.current.status).toBe("copied");
    expect(execCommand).toHaveBeenCalledWith("copy");

    const appended = appendSpy.mock.calls.map((call) => call[0] as Node);
    const textarea = appended.find(
      (node): node is HTMLTextAreaElement =>
        node instanceof HTMLTextAreaElement,
    );
    expect(textarea).toBeDefined();
    // The fallback must stage the exact value the user saw — not a truncated form.
    expect(textarea?.value).toBe(address);
  });

  it("sets status to 'failed' when the Clipboard API rejects", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("NotAllowedError")) });

    const { result } = renderHook(() => useClipboard());

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.copy("GABC");
    });

    expect(returned).toBe(false);
    expect(result.current.status).toBe("failed");
  });

  it("surfaces a denied clipboard permission as failure instead of silently succeeding", async () => {
    const denied = new DOMException(
      "The request is not allowed",
      "NotAllowedError",
    );
    setClipboard({ writeText: vi.fn().mockRejectedValue(denied) });
    // The documented behaviour is that a denial is surfaced, not silently
    // retried via a fallback that would likely also be blocked.
    const execCommand = vi.fn(() => false);
    document.execCommand = execCommand;

    const { result } = renderHook(() => useClipboard());

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.copy("GABC");
    });

    // Failure is surfaced through both channels consumers rely on: the
    // resolved value (drives error toasts) and the status (drives the UI).
    expect(returned).toBe(false);
    expect(result.current.status).toBe("failed");
    expect(execCommand).not.toHaveBeenCalled();

    // The failure stays visible for the whole feedback window instead of
    // being swallowed back to idle immediately.
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(result.current.status).toBe("failed");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.status).toBe("idle");
  });

  it("sets status to 'failed' when both paths fail", async () => {
    setClipboard(undefined);
    document.execCommand = vi.fn().mockReturnValue(false);

    const { result } = renderHook(() => useClipboard());

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.copy("GABC");
    });

    expect(returned).toBe(false);
    expect(result.current.status).toBe("failed");
  });

  it("reset() forces status back to idle immediately", async () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });

    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy("GABC");
    });
    expect(result.current.status).toBe("copied");

    act(() => {
      result.current.reset();
    });
    expect(result.current.status).toBe("idle");
  });

  it("debounces rapid successive copies onto a single reset timer", async () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });

    const { result } = renderHook(() => useClipboard(2000));

    await act(async () => {
      await result.current.copy("A");
      await result.current.copy("B");
    });

    expect(result.current.status).toBe("copied");

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.status).toBe("idle");
  });
});

describe("copyToClipboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves false when the Clipboard API rejects a denied permission", async () => {
    const denied = new DOMException(
      "The request is not allowed",
      "NotAllowedError",
    );
    setClipboard({ writeText: vi.fn().mockRejectedValue(denied) });

    // Direct consumers (Streams.tsx, Walletbutton.tsx) rely on `false` to
    // show an error; it must never silently resolve `true`.
    await expect(copyToClipboard("GABC")).resolves.toBe(false);
  });
});
