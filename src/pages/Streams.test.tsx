import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Streams from "./Streams";
import { streamRecords } from "../data/streamRecords";

type MatchMediaChangeHandler = (event: MediaQueryListEvent) => void;

function mockMatchMedia(matches: boolean) {
  const listeners: MatchMediaChangeHandler[] = [];

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn((_: string, callback: MatchMediaChangeHandler) => {
        listeners.push(callback);
      }),
      removeEventListener: vi.fn(
        (_: string, callback: MatchMediaChangeHandler) => {
          const index = listeners.indexOf(callback);
          if (index >= 0) listeners.splice(index, 1);
        },
      ),
      addListener: vi.fn((callback: MatchMediaChangeHandler) => {
        listeners.push(callback);
      }),
      removeListener: vi.fn((callback: MatchMediaChangeHandler) => {
        const index = listeners.indexOf(callback);
        if (index >= 0) listeners.splice(index, 1);
      }),
      dispatchEvent: vi.fn(),
    })),
  });
}

function renderStreams() {
  return render(
    <MemoryRouter initialEntries={["/app/streams"]}>
      <Routes>
        <Route path="/app/streams" element={<Streams />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function finishLoading() {
  await act(async () => {
    vi.advanceTimersByTime(2000);
  });
}

describe("Streams disclosure motion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps focus on the toggle button while collapse animation runs", async () => {
    mockMatchMedia(false);
    renderStreams();
    await finishLoading();

    const firstStream = streamRecords[0]!;
    const disclosureId = `stream-expanded-${firstStream.id}`;
    const collapseButton = screen.getByRole("button", {
      name: /collapse deep dive/i,
    });

    expect(document.getElementById(disclosureId)).toBeInTheDocument();

    collapseButton.focus();
    expect(collapseButton).toHaveFocus();

    fireEvent.click(collapseButton);

    expect(collapseButton).toHaveFocus();
    expect(collapseButton).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByText(`${firstStream.name} deep dive collapsed.`),
    ).toBeInTheDocument();
    expect(document.getElementById(disclosureId)).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(document.getElementById(disclosureId)).not.toBeInTheDocument();
  });

  it("removes the disclosure immediately when reduced motion is preferred", async () => {
    mockMatchMedia(true);
    renderStreams();
    await finishLoading();

    const firstStream = streamRecords[0]!;
    const disclosureId = `stream-expanded-${firstStream.id}`;
    const collapseButton = screen.getByRole("button", {
      name: /collapse deep dive/i,
    });

    fireEvent.click(collapseButton);

    expect(collapseButton).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(disclosureId)).not.toBeInTheDocument();
  });
});
