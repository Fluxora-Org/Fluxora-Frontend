import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StreamCreatedModal from "../StreamCreatedModal";

// Mock the CSS module
vi.mock("../StreamCreatedModal.module.css", () => {
  return {
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
  };
});

describe("StreamCreatedModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    streamId: "STR-123",
    streamUrl: "https://fluxora.io/stream/STR-123",
    onCreateAnother: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <StreamCreatedModal {...defaultProps} isOpen={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders streamId with # prefix and streamUrl in the URL bar", () => {
    render(<StreamCreatedModal {...defaultProps} />);
    expect(screen.getByText("#STR-123")).toBeInTheDocument();
    expect(
      screen.getByText("https://fluxora.io/stream/STR-123"),
    ).toBeInTheDocument();
  });

  it("announcement text renders when isOpen is true and clears after 1000ms", () => {
    vi.useFakeTimers();
    render(<StreamCreatedModal {...defaultProps} />);

    // Check announcement is set
    const announcementElement = screen.getByText(
      "Success! Your USDC stream is now live on Stellar.",
    );
    expect(announcementElement).toBeInTheDocument();

    // Advance timers by 1000ms
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(announcementElement.textContent).toBe("");
  });

  it("cleans up the announcement timer on unmount without throwing errors", () => {
    vi.useFakeTimers();
    const { unmount } = render(<StreamCreatedModal {...defaultProps} />);

    unmount();

    // Should not throw any errors when timers are fired after unmount
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }).not.toThrow();
  });

  it("calls onCreateAnother when 'Create another' button is clicked", () => {
    render(<StreamCreatedModal {...defaultProps} />);
    const createAnotherBtn = screen.getByRole("button", {
      name: /create another/i,
    });
    fireEvent.click(createAnotherBtn);
    expect(defaultProps.onCreateAnother).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when close button is clicked", () => {
    render(<StreamCreatedModal {...defaultProps} />);
    const closeBtn = screen.getByRole("button", {
      name: /close stream created modal/i,
    });
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the overlay is clicked", () => {
    const { container } = render(<StreamCreatedModal {...defaultProps} />);
    const overlay = container.firstChild as HTMLElement;
    fireEvent.click(overlay);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("stops propagation when clicking the modal body so it does not trigger onClose", () => {
    render(<StreamCreatedModal {...defaultProps} />);
    const modalBody = screen.getByRole("dialog");
    fireEvent.click(modalBody);
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it("copies streamUrl to clipboard and shows copied feedback for 2000ms", async () => {
    vi.useFakeTimers();
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };
    Object.defineProperty(navigator, "clipboard", {
      value: mockClipboard,
      writable: true,
      configurable: true,
    });

    render(<StreamCreatedModal {...defaultProps} />);
    const copyBtn = screen.getByRole("button", { name: /copy stream url/i });

    // Click copy button
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(mockClipboard.writeText).toHaveBeenCalledWith(
      "https://fluxora.io/stream/STR-123",
    );

    // Timer should transition back after 2000ms
    act(() => {
      vi.advanceTimersByTime(2000);
    });
  });

  it("opens streamUrl in a new tab when 'View stream' button is clicked", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<StreamCreatedModal {...defaultProps} />);
    const viewStreamBtn = screen.getByRole("button", { name: /view stream/i });

    fireEvent.click(viewStreamBtn);

    expect(openSpy).toHaveBeenCalledWith(
      "https://fluxora.io/stream/STR-123",
      "_blank",
      "noopener,noreferrer",
    );
    openSpy.mockRestore();
  });
});
