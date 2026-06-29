import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StreamCreatedModal from "../StreamCreatedModal";

vi.mock("../StreamCreatedModal.module.css", () => ({
  default: {
    overlay: "overlay",
    modal: "modal",
    closeButton: "closeButton",
    successIconWrapper: "successIconWrapper",
    successIconImg: "successIconImg",
    title: "title",
    description: "description",
    streamInfoCard: "streamInfoCard",
    streamIdRow: "streamIdRow",
    streamIdLabel: "streamIdLabel",
    streamIdValue: "streamIdValue",
    urlContainer: "urlContainer",
    urlBar: "urlBar",
    copyButton: "copyButton",
    copied: "copied",
    nextStepsBox: "nextStepsBox",
    nextStepsText: "nextStepsText",
    nextStepsTitle: "nextStepsTitle",
    actions: "actions",
    btn: "btn",
    btnSecondary: "btnSecondary",
    btnPrimary: "btnPrimary",
  },
}));

const STREAM_URL = "https://fluxora.io/stream/STR-123";

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  streamId: "STR-123",
  streamUrl: STREAM_URL,
  onCreateAnother: vi.fn(),
};

function setClipboard(writeText?: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

describe("StreamCreatedModal copy button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("sets copied state only after clipboard write resolves and resets after 2000ms", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);

    render(<StreamCreatedModal {...defaultProps} />);
    const copyBtn = screen.getByRole("button", { name: /copy stream url/i });

    expect(copyBtn).not.toHaveClass("copied");

    await act(async () => {
      fireEvent.click(copyBtn);
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith(STREAM_URL);
    expect(copyBtn).toHaveClass("copied");

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(copyBtn).not.toHaveClass("copied");
  });

  it("announces failure when clipboard write rejects and does not show copied state", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    setClipboard(writeText);

    render(<StreamCreatedModal {...defaultProps} />);
    const copyBtn = screen.getByRole("button", { name: /copy stream url/i });

    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Could not copy stream URL. Please select and copy the URL manually.",
        ),
      ).toBeInTheDocument();
    });

    expect(copyBtn).not.toHaveClass("copied");

    const loggedMessages = consoleErrorSpy.mock.calls.flat().join(" ");
    expect(loggedMessages).not.toContain(STREAM_URL);
    consoleErrorSpy.mockRestore();
  });

  it("falls back to execCommand when navigator.clipboard is undefined", async () => {
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });
    setClipboard(undefined);

    render(<StreamCreatedModal {...defaultProps} />);
    const copyBtn = screen.getByRole("button", { name: /copy stream url/i });

    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(execCommand).toHaveBeenCalledWith("copy");
    });

    expect(copyBtn).toHaveClass("copied");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("announces failure when execCommand fallback returns false", async () => {
    const execCommand = vi.fn().mockReturnValue(false);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });
    setClipboard(undefined);

    render(<StreamCreatedModal {...defaultProps} />);
    const copyBtn = screen.getByRole("button", { name: /copy stream url/i });

    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Could not copy stream URL. Please select and copy the URL manually.",
        ),
      ).toBeInTheDocument();
    });

    expect(copyBtn).not.toHaveClass("copied");
  });

  it("clears failure announcement after 3000ms without resetting copied timer semantics", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    setClipboard(writeText);

    render(<StreamCreatedModal {...defaultProps} />);
    const copyBtn = screen.getByRole("button", { name: /copy stream url/i });

    await act(async () => {
      fireEvent.click(copyBtn);
      await Promise.resolve();
    });

    const failureMessage =
      "Could not copy stream URL. Please select and copy the URL manually.";
    expect(screen.getByText(failureMessage)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText(failureMessage)).not.toBeInTheDocument();
    expect(copyBtn).not.toHaveClass("copied");
  });

  it("preserves aria-label on the copy button", () => {
    setClipboard(vi.fn().mockResolvedValue(undefined));
    render(<StreamCreatedModal {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: "Copy stream URL" }),
    ).toBeInTheDocument();
  });

  it("keeps the stream URL visible in the URL bar as a manual fallback", () => {
    setClipboard(undefined);
    render(<StreamCreatedModal {...defaultProps} />);

    expect(screen.getByText(STREAM_URL)).toBeInTheDocument();
  });
});
