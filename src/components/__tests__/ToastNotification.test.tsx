import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ToastNotification from "../ToastNotification";
import type { ToastVariant } from "../ToastNotification";

const noop = () => {};

describe("ToastNotification aria-live semantics", () => {
  it.each([
    ["error",   "alert",  "assertive"],
    ["warning", "alert",  "assertive"],
    ["success", "status", "polite"],
    ["info",    "status", "polite"],
  ] as [ToastVariant, string, string][])(
    "%s → role=%s aria-live=%s",
    (variant, expectedRole, expectedLive) => {
      render(
        <ToastNotification message="msg" variant={variant} onClose={noop} />,
      );
      const el = screen.getByRole(expectedRole as "alert" | "status");
      expect(el).toHaveAttribute("aria-live", expectedLive);
      expect(el).toHaveAttribute("aria-atomic", "true");
    },
  );

  it("unknown variant falls back to assertive alert semantics", () => {
    // Cast to bypass TypeScript's type guard — simulates a runtime unknown value
    const unknown = "critical" as ToastVariant;
    render(
      <ToastNotification message="unknown msg" variant={unknown} onClose={noop} />,
    );
    const el = screen.getByRole("alert");
    expect(el).toHaveAttribute("aria-live", "assertive");
    expect(el).toHaveAttribute("aria-atomic", "true");
    expect(screen.getByText("unknown msg")).toBeInTheDocument();
  });

  it("unknown variant close button still works", () => {
    const onClose = vi.fn();
    const unknown = "critical" as ToastVariant;
    render(
      <ToastNotification message="msg" variant={unknown} onClose={onClose} />,
    );
    screen.getByRole("button", { name: /dismiss/i }).click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("ToastNotification undo action", () => {
  it("renders an accessible countdown and invokes undo plus close", () => {
    const onUndo = vi.fn();
    const onClose = vi.fn();
    render(
      <ToastNotification
        message="Stream paused"
        variant="info"
        onClose={onClose}
        onUndo={onUndo}
      />,
    );

    expect(screen.getByRole("progressbar", { name: "Undo time remaining" })).toBeInTheDocument();
    expect(screen.getByText("5s")).toBeInTheDocument();
    screen.getByRole("button", { name: "Undo" }).click();
    expect(onUndo).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("ToastNotification keyboard interactions", () => {
  it("dismisses the toast when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <ToastNotification message="Escape me" variant="info" onClose={onClose} />,
    );
    
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
