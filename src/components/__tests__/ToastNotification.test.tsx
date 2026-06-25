import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ToastNotification, { type ToastVariant } from "../ToastNotification";

function renderToast(variant: ToastVariant | (string & {})) {
  const onClose = vi.fn();
  render(<ToastNotification message={`${variant} message`} variant={variant} onClose={onClose} />);
  return { onClose };
}

describe("ToastNotification", () => {
  it.each([
    ["success", "Success"],
    ["info", "Info"],
  ] as const)("%s uses polite status semantics", (variant, label) => {
    renderToast(variant);

    const toast = screen.getByRole("status");
    expect(toast).toHaveAttribute("aria-live", "polite");
    expect(toast).toHaveAttribute("aria-atomic", "true");
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it.each([
    ["warning", "Warning"],
    ["error", "Error"],
  ] as const)("%s uses assertive alert semantics", (variant, label) => {
    renderToast(variant);

    const toast = screen.getByRole("alert");
    expect(toast).toHaveAttribute("aria-live", "assertive");
    expect(toast).toHaveAttribute("aria-atomic", "true");
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("fails safe to assertive alert semantics for unknown variants", () => {
    renderToast("urgent");

    const toast = screen.getByRole("alert");
    expect(toast).toHaveAttribute("aria-live", "assertive");
    expect(toast).toHaveClass("toast-notification--warning");
    expect(screen.getByText("Notification")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss notification" })).toBeInTheDocument();
  });
});
