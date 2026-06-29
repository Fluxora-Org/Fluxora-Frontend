import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useClipboard } from "../useClipboard";

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
