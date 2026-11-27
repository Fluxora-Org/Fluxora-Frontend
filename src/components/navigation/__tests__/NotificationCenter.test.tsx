import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  recordNotification,
  resetNotificationHistoryForTests,
} from "../../../lib/notificationHistory";
import NotificationCenter from "../NotificationCenter";

const ADDRESS = `G${"C".repeat(55)}`;

beforeEach(() => {
  window.localStorage.clear();
  resetNotificationHistoryForTests();
  document.head.querySelectorAll('link[rel~="icon"]').forEach((link) => link.remove());
  const favicon = document.createElement("link");
  favicon.id = "favicon";
  favicon.rel = "icon";
  favicon.href = "/Icon.svg";
  document.head.appendChild(favicon);
});

describe("NotificationCenter", () => {
  it("renders a closed disclosure with an unread badge and polite announcement", () => {
    recordNotification({ message: "Stream created", variant: "success" });
    recordNotification({ message: "Withdrawal failed", variant: "error" });
    render(<NotificationCenter />);

    const trigger = screen.getByRole("button", { name: /notifications, 2 unread/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-controls", "notification-center-panel");
    expect(trigger.querySelector(".notification-center__badge")).toHaveTextContent("2");
    expect(screen.getByRole("status")).toHaveTextContent(
      "You have 2 unread notifications.",
    );
    expect(screen.queryByRole("region", { name: /notification history/i })).toBeNull();
  });

  it("opens the panel with newest entries first and relative times", () => {
    recordNotification({ message: "Older event", variant: "info" });
    recordNotification({
      message: `Withdrawal from ${ADDRESS}`,
      variant: "success",
      kind: "withdraw",
    });
    render(<NotificationCenter />);

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    const panel = screen.getByRole("region", { name: /notification history/i });
    const messages = panel.querySelectorAll(".notification-center__message");
    expect(messages[0]).toHaveTextContent("Withdrawal from");
    expect(messages[0].textContent).not.toContain(ADDRESS);
    expect(messages[1]).toHaveTextContent("Older event");
    expect(panel.querySelectorAll("time").length).toBe(2);
    expect(panel).toHaveTextContent(/today/i);
  });

  it("Escape closes the panel and restores focus to the trigger", () => {
    recordNotification({ message: "Event", variant: "success" });
    render(<NotificationCenter />);
    const trigger = screen.getByRole("button", { name: /notifications/i });

    fireEvent.click(trigger);
    expect(screen.getByRole("region", { name: /notification history/i })).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });

    expect(screen.queryByRole("region", { name: /notification history/i })).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on outside pointer down without stealing focus", () => {
    recordNotification({ message: "Event", variant: "success" });
    render(<div><NotificationCenter /><button type="button">Outside</button></div>);
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    fireEvent.mouseDown(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("region", { name: /notification history/i })).toBeNull();
  });

  it("keeps the panel open for non-Escape keys and pointer downs inside", () => {
    recordNotification({ message: "Event", variant: "success" });
    render(<NotificationCenter />);
    const trigger = screen.getByRole("button", { name: /notifications/i });

    fireEvent.click(trigger);
    act(() => {
      fireEvent.keyDown(document, { key: "Enter" });
    });
    fireEvent.mouseDown(trigger);

    expect(screen.getByRole("region", { name: /notification history/i })).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("renders a truncated transaction reference", () => {
    const hash = "a".repeat(64);
    recordNotification({
      message: "Transaction confirmed",
      variant: "success",
      reference: hash,
    });
    render(<NotificationCenter />);
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

    expect(screen.getByText(`${hash.slice(0, 6)}…${hash.slice(-4)}`)).toBeInTheDocument();
  });

  it("marks all entries read, resetting badge and favicon", () => {
    recordNotification({ message: "Event", variant: "success" });
    render(<NotificationCenter />);
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

    fireEvent.click(screen.getByRole("button", { name: /mark all as read/i }));

    expect(screen.queryByText(/you have 1 unread notification/i)).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("You have no unread notifications.");
    expect(
      screen.getByRole("button", { name: "Notifications" }).querySelector(".notification-center__badge"),
    ).toBeNull();
    expect(document.querySelector('link[rel~="icon"]')).toHaveAttribute("href", "/Icon.svg");
  });

  it("marks one entry read from the list", () => {
    recordNotification({ message: "Single event", variant: "success" });
    render(<NotificationCenter />);
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

    fireEvent.click(screen.getByRole("button", { name: /mark "single event" as read/i }));

    expect(screen.queryByRole("button", { name: /mark "single event" as read/i })).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("You have no unread notifications.");
  });

  it("clears history and shows the empty state", () => {
    recordNotification({ message: "Event", variant: "success" });
    render(<NotificationCenter />);
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

    fireEvent.click(screen.getByRole("button", { name: /clear history/i }));

    expect(screen.getByText("No notifications yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notifications" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("closes and clears history when the account switches", () => {
    const { rerender } = render(
      <NotificationCenter address={ADDRESS} network="TESTNET" connected />,
    );
    act(() => {
      recordNotification({ message: "Old account event", variant: "success" });
    });
    expect(screen.getByRole("button", { name: /notifications, 1 unread/i })).toBeInTheDocument();

    rerender(
      <NotificationCenter address={`G${"D".repeat(55)}`} network="TESTNET" connected />,
    );

    expect(screen.getByRole("button", { name: "Notifications" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("status")).toHaveTextContent("You have no unread notifications.");
  });
});
