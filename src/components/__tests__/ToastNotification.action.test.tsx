import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ToastNotification from "../ToastNotification";

describe("ToastNotification action", () => {
  it("does not render an action button when actionLabel/onAction are absent", () => {
    render(<ToastNotification message="msg" variant="success" onClose={() => {}} />);
    expect(screen.queryByRole("button", { name: /view stream/i })).not.toBeInTheDocument();
  });

  it("renders the action and calls both onAction and onClose when clicked", () => {
    const onAction = vi.fn();
    const onClose = vi.fn();
    render(
      <ToastNotification
        message="Your queued stream was submitted."
        variant="success"
        onClose={onClose}
        actionLabel="View stream"
        onAction={onAction}
      />,
    );

    screen.getByRole("button", { name: "View stream" }).click();

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render the action if only one of actionLabel/onAction is provided", () => {
    render(
      <ToastNotification
        message="msg"
        variant="success"
        onClose={() => {}}
        actionLabel="View stream"
      />,
    );
    expect(screen.queryByRole("button", { name: /view stream/i })).not.toBeInTheDocument();
  });
});
