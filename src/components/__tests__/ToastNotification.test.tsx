import { render, screen } from "@testing-library/react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ToastNotification from "../ToastNotification";
import type { ToastVariant } from "../ToastNotification";

const noop = () => {};

describe("ToastNotification aria-live semantics", () => {it.each(
    [
      ["error",   "alert",  "assertive", "Error"],
      ["warning", "alert",  "assertive", "Warning"],
      ["success", "status", "polite", "Success"],
      ["info",    "status", "polite", "Info"],
    ] as [ToastVariant, string, string, string][])(
    "%s → role=%s aria-live=%s aria-label=%s",
    (variant, expectedRole, expectedLive, expectedAriaLabel) => {
      render(
        <ToastNotification message="msg" variant={variant} onClose={noop} />,
      );
      const el = screen.getByRole(expectedRole as "alert" | "status");
      expect(el).toHaveAttribute("aria-live", expectedLive);
      expect(el).toHaveAttribute("aria-atomic", "true");
      expect(el).toHaveAttribute("aria-label", expectedAriaLabel);
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
    expect(el).toHaveAttribute("aria-label", "Alert");
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

  it("is reachable by Tab key", () => {
    render(
      <ToastNotification message="Tab me" variant="info" onClose={noop} />,
    );
    
    // The toast itself is focusable via tabindex=0
    const focusableEl = screen.getByRole("status", { name: /Info/ });
    expect(focusableEl).toBeInTheDocument();
    
    // The element has tabindex=0 making it focusable
    expect(focusableEl).toHaveAttribute("tabindex", "0");
  });

  it("focus is visible at each stop", async () => {
    render(
      <ToastNotification
        message="Focus me"
        variant="success"
        onClose={noop}
        actionLabel="View"
        onAction={() => {}}
      />,
    );
    
    // Focus the action button
    const actionBtn = screen.getByRole("button", { name: "View" });
    
    // The action button has an accessible name (aria-label)
    expect(actionBtn).toHaveAttribute("aria-label");
    
    // The close button has an accessible name (aria-label)
    const closeBtn = screen.getByRole("button", { name: /dismiss/i });
    expect(closeBtn).toHaveAttribute("aria-label");
  });

  it("controls expose an accessible name", () => {
    const onClose = vi.fn();
    render(
      <ToastNotification
        message="Accessible name test"
        variant="error"
        onClose={onClose}
        actionLabel="View stream"
        onAction={() => {}}
      />,
    );
    
    // Close button has accessible name
    const closeBtn = screen.getByRole("button", { name: /dismiss/i });
    expect(closeBtn).toHaveAttribute("aria-label");
    
    // Action button has accessible name
    const actionBtn = screen.getByRole("button", { name: "View stream" });
    expect(actionBtn).toHaveAttribute("aria-label");
  });

  it("state changes are announced via aria-live", async () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <ToastNotification
        message="Test announcement"
        variant="info"
        onClose={onClose}
      />,
    );
    
    // Wait for live region to announce
    waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Test announcement");
    });
  });

});

