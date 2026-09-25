import React, { useRef, useState } from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { StreamOGPreviewModal } from "../StreamOGPreviewModal";
import type { StreamRecord } from "../../data/streamRecords";

const mockStream: StreamRecord = {
  id: "STR-PREVIEW-1",
  name: "Community Grant Stream",
  recipientName: "Alice Dev",
  recipientAddress: "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P",
  treasuryName: "Ecosystem Treasury",
  treasuryAddress: "GAJSINKGK5UHTCU3VS645X7QAEJCGNCFKZTXRCM2VO6M3XXPAAISFPVT",
  asset: "USDC",
  status: "Active",
  monthlyRate: 5000,
  depositAmount: 30000,
  streamedAmount: 10000,
  withdrawableAmount: 2000,
  remainingAmount: 20000,
  progress: 33.3,
  startDate: "2026-01-01",
  endDate: "2026-07-01",
  summary: "Open-source developer grant.",
  health: "Healthy",
  healthNote: "Funded and active.",
  tags: ["Ecosystem"],
  timeline: [],
};

interface TestHarnessProps {
  onCloseMock?: () => void;
  withExplicitTriggerRef?: boolean;
}

function TestHarness({
  onCloseMock,
  withExplicitTriggerRef = true,
}: TestHarnessProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleClose = () => {
    setIsOpen(false);
    onCloseMock?.();
  };

  return (
    <div>
      <button
        ref={triggerRef}
        data-testid="opening-control"
        onClick={() => setIsOpen(true)}
      >
        Open Social Preview
      </button>
      <button data-testid="outside-control">Outside Page Control</button>

      <StreamOGPreviewModal
        stream={mockStream}
        isOpen={isOpen}
        onClose={handleClose}
        triggerRef={withExplicitTriggerRef ? triggerRef : undefined}
      />
    </div>
  );
}

describe("StreamOGPreviewModal - Keyboard & Focus Trap (#1738)", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.useFakeTimers({
      toFake: ["requestAnimationFrame", "cancelAnimationFrame"],
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("moves focus into the modal on open", async () => {
    render(<TestHarness />);

    const trigger = screen.getByTestId("opening-control");
    trigger.focus();
    expect(trigger).toHaveFocus();

    // Open via Enter key on the opening control
    await user.keyboard("{Enter}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Advance frame for initial focus placement
    act(() => {
      vi.runAllTimers();
    });

    const closeBtn = screen.getByTestId("close-og-preview-btn");
    expect(closeBtn).toHaveFocus();
  });

  it("confines Tab navigation to within the modal", async () => {
    render(<TestHarness />);

    const trigger = screen.getByTestId("opening-control");
    await user.click(trigger);

    act(() => {
      vi.runAllTimers();
    });

    const closeBtn = screen.getByTestId("close-og-preview-btn");
    const copyBtn = screen.getByTestId("copy-og-url-btn");
    const shareBtn = screen.getByTestId("share-og-stream-btn");
    const outsideBtn = screen.getByTestId("outside-control");

    // Initially focused on close button
    expect(closeBtn).toHaveFocus();

    // Tab to next button (Copy Image URL)
    await user.keyboard("{Tab}");
    expect(copyBtn).toHaveFocus();

    // Tab to next button (Share Stream)
    await user.keyboard("{Tab}");
    expect(shareBtn).toHaveFocus();

    // Tab from last element wraps back to first element (Close button)
    await user.keyboard("{Tab}");
    expect(closeBtn).toHaveFocus();
    expect(outsideBtn).not.toHaveFocus();

    // Shift+Tab from first element wraps to last element (Share button)
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(shareBtn).toHaveFocus();
    expect(outsideBtn).not.toHaveFocus();

    // Shift+Tab again moves to middle element (Copy button)
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(copyBtn).toHaveFocus();
  });

  it("closes the modal when Escape is pressed", async () => {
    const onCloseMock = vi.fn();
    render(<TestHarness onCloseMock={onCloseMock} />);

    const trigger = screen.getByTestId("opening-control");
    await user.click(trigger);

    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Press Escape key
    await user.keyboard("{Escape}");

    expect(onCloseMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("returns focus to the opening control when closed via Escape", async () => {
    render(<TestHarness />);

    const trigger = screen.getByTestId("opening-control");
    trigger.focus();
    expect(trigger).toHaveFocus();

    // Open modal with Space key
    await user.keyboard(" ");

    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByTestId("close-og-preview-btn")).toHaveFocus();

    // Dismiss with Escape key
    await user.keyboard("{Escape}");

    // Advance frame for focus restoration
    act(() => {
      vi.runAllTimers();
    });

    expect(trigger).toHaveFocus();
  });

  it("returns focus to opening control even without explicit triggerRef prop", async () => {
    render(<TestHarness withExplicitTriggerRef={false} />);

    const trigger = screen.getByTestId("opening-control");
    trigger.focus();
    expect(trigger).toHaveFocus();

    await user.click(trigger);

    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByTestId("close-og-preview-btn")).toHaveFocus();

    await user.keyboard("{Escape}");

    act(() => {
      vi.runAllTimers();
    });

    expect(trigger).toHaveFocus();
  });

  it("validates full keyboard journey: opens, cycles focus, and dismisses using only keyboard", async () => {
    render(<TestHarness />);

    const trigger = screen.getByTestId("opening-control");
    const outsideBtn = screen.getByTestId("outside-control");

    // 1. Keyboard focus onto the opening control
    trigger.focus();
    expect(trigger).toHaveFocus();

    // 2. Open modal with Enter key
    await user.keyboard("{Enter}");
    act(() => {
      vi.runAllTimers();
    });

    // 3. Modal opens and focus is inside on the close button
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    const closeBtn = screen.getByTestId("close-og-preview-btn");
    expect(closeBtn).toHaveFocus();

    // 4. Tab through all elements inside modal
    const copyBtn = screen.getByTestId("copy-og-url-btn");
    const shareBtn = screen.getByTestId("share-og-stream-btn");

    await user.keyboard("{Tab}");
    expect(copyBtn).toHaveFocus();

    await user.keyboard("{Tab}");
    expect(shareBtn).toHaveFocus();

    // 5. Wrap around to close button
    await user.keyboard("{Tab}");
    expect(closeBtn).toHaveFocus();

    // 6. Outside control never received focus
    expect(outsideBtn).not.toHaveFocus();

    // 7. Dismiss modal with Escape key
    await user.keyboard("{Escape}");
    act(() => {
      vi.runAllTimers();
    });

    // 8. Modal is closed and focus is returned to opening control
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("returns focus to opening control when dismissed via keyboard on close button", async () => {
    render(<TestHarness />);

    const trigger = screen.getByTestId("opening-control");
    trigger.focus();

    await user.keyboard("{Enter}");
    act(() => {
      vi.runAllTimers();
    });

    const closeBtn = screen.getByTestId("close-og-preview-btn");
    expect(closeBtn).toHaveFocus();

    // Press Enter on the close button to dismiss
    await user.keyboard("{Enter}");
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
