import React, { useRef, useState } from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useModalAccessibility } from "../useModalAccessibility";

function TestModal({
  onClose,
  initialFocusRef,
}: {
  onClose: () => void;
  initialFocusRef?: React.RefObject<HTMLElement>;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  useModalAccessibility({
    isOpen: true,
    onClose,
    modalRef,
    initialFocusRef,
  });

  return (
    <div role="dialog" ref={modalRef} tabIndex={-1} data-testid="modal">
      <button data-testid="modal-btn-1">Modal Button 1</button>
      <button data-testid="modal-btn-2">Modal Button 2</button>
    </div>
  );
}

function TestApp({ onCloseMock }: { onCloseMock?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const handleClose = () => {
    setIsOpen(false);
    onCloseMock?.();
  };

  return (
    <div>
      <button data-testid="trigger" onClick={() => setIsOpen(true)}>
        Open Modal
      </button>
      <button data-testid="outside-btn">Outside Button</button>
      {isOpen && <TestModal onClose={handleClose} />}
    </div>
  );
}

describe("useModalAccessibility", () => {
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

  it("moves focus into the modal when opened", async () => {
    render(<TestApp />);
    const trigger = screen.getByTestId("trigger");

    await user.click(trigger);

    // modal should be in document
    const modal = screen.getByTestId("modal");
    expect(modal).toBeInTheDocument();

    // Advance requestAnimationFrame for focus move
    act(() => {
      vi.runAllTimers();
    });

    const firstButton = screen.getByTestId("modal-btn-1");
    expect(firstButton).toHaveFocus();
  });

  it("calls onClose when Escape is pressed", async () => {
    const onCloseMock = vi.fn();
    render(<TestApp onCloseMock={onCloseMock} />);

    const trigger = screen.getByTestId("trigger");
    await user.click(trigger);

    act(() => {
      vi.runAllTimers();
    });

    // Escape should close the modal
    await user.keyboard("{Escape}");
    expect(onCloseMock).toHaveBeenCalledOnce();
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });

  it("returns focus to the previously-focused element when the modal closes", async () => {
    render(<TestApp />);

    const trigger = screen.getByTestId("trigger");
    trigger.focus();
    expect(trigger).toHaveFocus();

    await user.click(trigger);

    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByTestId("modal-btn-1")).toHaveFocus();

    // Close the modal
    await user.keyboard("{Escape}");

    act(() => {
      vi.runAllTimers(); // Advance requestAnimationFrame for focus restore
    });

    expect(trigger).toHaveFocus();
  });

  it("traps focus within the modal", async () => {
    render(<TestApp />);
    const trigger = screen.getByTestId("trigger");
    await user.click(trigger);

    act(() => {
      vi.runAllTimers();
    });

    const firstButton = screen.getByTestId("modal-btn-1");
    const secondButton = screen.getByTestId("modal-btn-2");

    expect(firstButton).toHaveFocus();

    // Tab forwards
    await user.keyboard("{Tab}");
    expect(secondButton).toHaveFocus();

    // Tab forwards from the last element should wrap to the first element
    await user.keyboard("{Tab}");
    expect(firstButton).toHaveFocus();

    // Tab backwards (Shift+Tab) from the first element should wrap to the last element
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(secondButton).toHaveFocus();
  });

  it("handles modal with no focusable elements", async () => {
    function EmptyModal({ onClose }: { onClose: () => void }) {
      const ref = useRef<HTMLDivElement>(null);
      useModalAccessibility({ isOpen: true, onClose, modalRef: ref });
      return (
        <div role="dialog" ref={ref} tabIndex={-1} data-testid="empty-modal">
          No focusable content
        </div>
      );
    }

    function EmptyModalApp() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div>
          <button data-testid="trigger-empty" onClick={() => setIsOpen(true)}>
            Open
          </button>
          {isOpen && <EmptyModal onClose={() => setIsOpen(false)} />}
        </div>
      );
    }

    render(<EmptyModalApp />);
    await user.click(screen.getByTestId("trigger-empty"));

    act(() => {
      vi.runAllTimers();
    });

    const modal = screen.getByTestId("empty-modal");
    expect(modal).toHaveFocus();

    // Tab should keep focus on modal
    await user.keyboard("{Tab}");
    expect(modal).toHaveFocus();
  });

  it("handles focus escaping the modal", async () => {
    render(<TestApp />);
    await user.click(screen.getByTestId("trigger"));

    act(() => {
      vi.runAllTimers();
    });

    // Manually move focus outside the modal
    const outsideBtn = screen.getByTestId("outside-btn");
    outsideBtn.focus();
    expect(outsideBtn).toHaveFocus();

    // Tab should bring focus back to the first element
    await user.keyboard("{Tab}");
    expect(screen.getByTestId("modal-btn-1")).toHaveFocus();

    // Shift+Tab from outside should bring focus to the last element
    outsideBtn.focus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(screen.getByTestId("modal-btn-2")).toHaveFocus();
  });

  it("ignores hidden elements for focus trap", async () => {
    function HiddenModalApp() {
      const ref = useRef<HTMLDivElement>(null);
      useModalAccessibility({ isOpen: true, onClose: () => {}, modalRef: ref });
      return (
        <div role="dialog" ref={ref} tabIndex={-1} data-testid="hidden-modal">
          <button aria-hidden="true" data-testid="hidden-1">Hidden 1</button>
          <button data-testid="visible-1">Visible 1</button>
          <button hidden data-testid="hidden-2">Hidden 2</button>
          <input type="hidden" data-testid="hidden-3" />
          <button style={{ display: 'none' }} data-testid="hidden-4">Hidden 4</button>
          <button style={{ visibility: 'hidden' }} data-testid="hidden-5">Hidden 5</button>
          <button tabIndex={-1} data-testid="hidden-6">Hidden 6</button>
          <button data-testid="visible-2">Visible 2</button>
        </div>
      );
    }
    
    render(<HiddenModalApp />);
    act(() => { vi.runAllTimers(); });

    // Initial focus should skip hidden elements and go to Visible 1
    const visible1 = screen.getByTestId("visible-1");
    expect(visible1).toHaveFocus();

    // Tab should go to Visible 2
    await user.keyboard("{Tab}");
    expect(screen.getByTestId("visible-2")).toHaveFocus();

    // Tab again should wrap to Visible 1
    await user.keyboard("{Tab}");
    expect(visible1).toHaveFocus();
  });
});
