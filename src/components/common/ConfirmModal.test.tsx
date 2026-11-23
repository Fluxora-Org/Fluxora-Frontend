import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmModal } from "./ConfirmModal";

const modalProps = {
  isOpen: true,
  title: "Confirm transfer",
  description: "Send 10 USDC to the recipient?",
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe("ConfirmModal keyboard accessibility", () => {
  it("exposes a named modal and its description to assistive technology", () => {
    render(<ConfirmModal {...modalProps} />);

    const dialog = screen.getByRole("dialog", { name: "Confirm transfer" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(
      within(dialog).getByText("Send 10 USDC to the recipient?"),
    ).toBeVisible();
  });

  it("keeps each idle action reachable by Tab in DOM order with a visible focus style", async () => {
    const user = userEvent.setup();
    render(<ConfirmModal {...modalProps} />);

    const dialog = screen.getByRole("dialog");
    const [closeButton, confirmButton, cancelButton] =
      within(dialog).getAllByRole("button");

    await waitFor(() => expect(confirmButton).toHaveFocus());

    await user.tab({ shift: true });
    expect(closeButton).toHaveFocus();
    expect(closeButton).toHaveAccessibleName("Cancel");
    expect(closeButton).toHaveClass("focus-visible:ring-2");

    await user.tab();
    expect(confirmButton).toHaveFocus();
    expect(confirmButton).toHaveClass("focus-visible:ring-2");

    await user.tab();
    expect(cancelButton).toHaveFocus();
    expect(cancelButton).toHaveClass("focus-visible:ring-2");

    await user.tab();
    expect(closeButton).toHaveFocus();
  });

  it("exposes named controls and invokes confirm and cancel from keyboard activation", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmModal
        {...modalProps}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const dialog = screen.getByRole("dialog");
    const confirmButton = within(dialog).getByRole("button", {
      name: "Confirm",
    });
    const cancelButton = within(dialog).getAllByRole("button", {
      name: "Cancel",
    })[1];

    await waitFor(() => expect(confirmButton).toHaveFocus());
    await user.keyboard("{Enter}");
    expect(onConfirm).toHaveBeenCalledOnce();

    cancelButton.focus();
    await user.keyboard(" ");
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("cancels with Escape when the transaction is not pending", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmModal {...modalProps} onCancel={onCancel} />);

    await user.keyboard("{Escape}");

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("does not cancel with Escape while a transaction is pending", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmModal {...modalProps} status="pending" onCancel={onCancel} />,
    );

    await user.keyboard("{Escape}");

    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe("ConfirmModal transaction announcements", () => {
  it.each([
    ["pending", "Transaction in progress..."],
    ["success", "Transaction confirmed successfully."],
    ["error", "Insufficient balance to complete the transfer."],
  ] as const)(
    "announces the %s message through a polite status",
    (status, text) => {
      render(
        <ConfirmModal
          {...modalProps}
          status={status}
          errorMessage="Insufficient balance to complete the transfer."
          onRetry={vi.fn()}
        />,
      );

      expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
      expect(screen.getByRole("status")).toHaveTextContent(text);
    },
  );

  it("provides a named retry action in the error state", () => {
    render(
      <ConfirmModal
        {...modalProps}
        status="error"
        errorMessage="Transfer failed."
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();
    expect(
      within(screen.getByRole("dialog")).getAllByRole("button", {
        name: "Cancel",
      })[1],
    ).toBeVisible();
  });

  it("makes error recovery actions keyboard reachable with visible focus", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmModal
        {...modalProps}
        status="error"
        errorMessage="Transfer failed."
        onRetry={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    const closeButton = within(dialog).getAllByRole("button", {
      name: "Cancel",
    })[0];
    const retryButton = screen.getByRole("button", { name: "Retry" });
    const cancelButton = within(dialog).getAllByRole("button", {
      name: "Cancel",
    })[1];

    await user.tab();
    expect(closeButton).toHaveFocus();
    expect(closeButton).toHaveClass("focus-visible:ring-2");

    await user.tab();
    expect(retryButton).toHaveFocus();
    expect(retryButton).toHaveClass("focus-visible:ring-2");

    await user.tab();
    expect(cancelButton).toHaveFocus();
    expect(cancelButton).toHaveClass("focus-visible:ring-2");
  });

  it("provides a named close action in the success state", () => {
    render(<ConfirmModal {...modalProps} status="success" />);

    expect(screen.getByRole("button", { name: "Close" })).toBeVisible();
  });

  it("updates the polite announcement when the transaction status changes", () => {
    const { rerender } = render(<ConfirmModal {...modalProps} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    rerender(<ConfirmModal {...modalProps} status="pending" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Transaction in progress...",
    );

    rerender(<ConfirmModal {...modalProps} status="success" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Transaction confirmed successfully.",
    );

    rerender(
      <ConfirmModal
        {...modalProps}
        status="error"
        errorMessage="Transfer failed."
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Transfer failed.");
  });
});
