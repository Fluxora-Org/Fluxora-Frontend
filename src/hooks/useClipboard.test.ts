import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useClipboard } from "./useClipboard";

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "clipboard",
);
const writeText = vi.fn<(...args: [string]) => Promise<void>>();

beforeEach(() => {
  vi.useFakeTimers();
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor);
  } else {
    Reflect.deleteProperty(navigator, "clipboard");
  }
});

describe("useClipboard", () => {
  it("UC-01: copies successfully and resets status after the configured delay", async () => {
    const { result, unmount } = renderHook(() => useClipboard(100));

    let succeeded = false;
    await act(async () => {
      succeeded = await result.current.copy("copied text");
    });

    expect(succeeded).toBe(true);
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith("copied text");
    expect(result.current.status).toBe("copied");

    act(() => {
      vi.advanceTimersByTime(99);
    });
    expect(result.current.status).toBe("copied");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.status).toBe("idle");
    unmount();
  });

  it("UC-02: clears the pending reset timer on unmount", async () => {
    const { result, unmount } = renderHook(() => useClipboard(1000));

    await act(async () => {
      await result.current.copy("copied text");
    });

    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("UC-03: clears the previous timer when resetDelay changes on rerender", async () => {
    const { result, rerender, unmount } = renderHook(
      ({ resetDelay }: { resetDelay: number }) => useClipboard(resetDelay),
      { initialProps: { resetDelay: 100 } },
    );

    await act(async () => {
      await result.current.copy("first copy");
    });
    expect(vi.getTimerCount()).toBe(1);

    rerender({ resetDelay: 250 });
    expect(vi.getTimerCount()).toBe(0);

    await act(async () => {
      await result.current.copy("second copy");
    });
    expect(vi.getTimerCount()).toBe(1);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.status).toBe("copied");

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current.status).toBe("idle");
    unmount();
  });
});
