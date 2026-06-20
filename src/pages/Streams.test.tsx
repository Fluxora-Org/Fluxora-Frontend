import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Streams from "./Streams";
import { streamRecords } from "../data/streamRecords";
import { ToastProvider } from "../components/toast/ToastProvider";

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
    <ToastProvider>
      <MemoryRouter initialEntries={["/app/streams"]}>
        <Routes>
          <Route path="/app/streams" element={<Streams />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

async function finishLoading() {
  await act(async () => {
    vi.advanceTimersByTime(2000);
  });
}

const VALID_STELLAR_ADDRESS =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

async function advanceCreateStreamModalToReview() {
  fireEvent.click(screen.getByRole("button", { name: "Create stream" }));
  const dialog = screen.getByRole("dialog", { name: "Create stream" });

  fireEvent.change(within(dialog).getByRole("textbox", { name: "Recipient" }), {
    target: { value: VALID_STELLAR_ADDRESS },
  });
  fireEvent.change(
    within(dialog).getByRole("textbox", { name: "Deposit amount" }),
    {
      target: { value: "120" },
    },
  );
  fireEvent.click(within(dialog).getByRole("button", { name: /^next$/i }));

  fireEvent.change(document.querySelector("#create-stream-accrual-rate")!, {
    target: { value: "30" },
  });
  fireEvent.change(document.querySelector("#create-stream-duration")!, {
    target: { value: "4" },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: /^next$/i }));

  expect(
    dialog.querySelector(".review-card-amount")?.textContent?.replace(/\s+/g, " ").trim(),
  ).toBe("120.00 USDC");
  return dialog;
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

describe("Streams create transaction lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("opens the success modal only after transaction confirmation", async () => {
    mockMatchMedia(false);
    renderStreams();
    await finishLoading();
    const dialog = await advanceCreateStreamModalToReview();

    fireEvent.click(
      within(dialog).getByRole("button", {
        name: /^Create stream$/,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByText(/waiting for stellar confirmation/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: /stream created/i }),
    ).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(750);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      screen.getByRole("dialog", { name: /stream created/i }),
    ).toBeInTheDocument();
  });
});
