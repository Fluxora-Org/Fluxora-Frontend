import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import StreamRow from "../StreamRow";
import type { Stream } from "../Stream";

const stream: Stream = {
  id: "STR-900",
  name: "Security Review Grant",
  recipient: "GABCDEFGHIJKLMNOPQRSTUVWXYZ23456789WXYZ",
  rate: "2,500 USDC/mo",
  accruedAmount: 1234.56,
  status: "Active",
};

function renderRow(rowStream: Stream = stream) {
  const onSelect = vi.fn();

  render(
    <MemoryRouter>
      <table>
        <tbody>
          <StreamRow stream={rowStream} onSelect={onSelect} />
        </tbody>
      </table>
    </MemoryRouter>
  );

  return { onSelect };
}

describe("StreamRow", () => {
  it("truncates long recipient addresses while preserving the full address for assistive text", () => {
    renderRow();

    expect(screen.getByText("GABCDE...WXYZ")).toBeInTheDocument();
    expect(screen.getByLabelText(`Recipient ${stream.recipient}`)).toHaveAttribute(
      "title",
      stream.recipient
    );
  });

  it("renders status and accrued amount formatting for a stream", () => {
    renderRow();

    expect(screen.getByRole("status", { name: "Active status" })).toHaveTextContent("ACTIVE");
    expect(screen.getByText("2,500 USDC/mo")).toBeInTheDocument();
    expect(screen.getByText("1,234.56 USDC accrued")).toBeInTheDocument();
  });

  it("renders dynamic cell content as text instead of HTML", () => {
    const { container } = render(
      <MemoryRouter>
        <table>
          <tbody>
            <StreamRow
              stream={{
                ...stream,
                id: "STR-XSS",
                name: "<script>alert(1)</script>",
                recipient: "<img src=x onerror=alert(1)>",
              }}
              onSelect={vi.fn()}
            />
          </tbody>
        </table>
      </MemoryRouter>
    );

    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("opens the actions menu when the ellipsis button is clicked and closes on Escape", async () => {
    const { onSelect } = renderRow();

    // The ellipsis trigger should exist
    const trigger = screen.getByRole("button", { name: `Actions for stream ${stream.name}` });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    // Click to open
    const user = await import("@testing-library/user-event").then((m) => m.default.setup());
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // The menu items should be rendered
    const menu = screen.getByRole("menu", { name: `Actions for stream ${stream.name}` });
    expect(menu).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /view details/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /copy address/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /view in explorer/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /pause\/cancel/i })).toBeInTheDocument();

    // Roving focus: First item should get focus
    expect(screen.getByRole("menuitem", { name: /view details/i })).toHaveFocus();

    // Press Escape to close and check that focus is restored to the trigger
    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("navigates through items via Arrow keys in the menu", async () => {
    renderRow();
    const trigger = screen.getByRole("button", { name: `Actions for stream ${stream.name}` });

    const user = await import("@testing-library/user-event").then((m) => m.default.setup());
    await user.click(trigger);

    const firstItem = screen.getByRole("menuitem", { name: /view details/i });
    const secondItem = screen.getByRole("menuitem", { name: /copy address/i });
    const thirdItem = screen.getByRole("menuitem", { name: /view in explorer/i });
    const fourthItem = screen.getByRole("menuitem", { name: /pause\/cancel/i });

    expect(firstItem).toHaveFocus();

    // Arrow down
    await user.keyboard("{ArrowDown}");
    expect(secondItem).toHaveFocus();

    // Arrow down again
    await user.keyboard("{ArrowDown}");
    expect(thirdItem).toHaveFocus();

    // Arrow down again
    await user.keyboard("{ArrowDown}");
    expect(fourthItem).toHaveFocus();

    // Arrow down (loop to first)
    await user.keyboard("{ArrowDown}");
    expect(firstItem).toHaveFocus();

    // Arrow up (loop to last)
    await user.keyboard("{ArrowUp}");
    expect(fourthItem).toHaveFocus();
  });

  it("triggers the actions menu via right-click (contextmenu event)", () => {
    renderRow();
    const row = screen.getByRole("row");

    // Initially closed
    const trigger = screen.getByRole("button", { name: `Actions for stream ${stream.name}` });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    // Fire context menu event on the row
    const fireEvent = require("@testing-library/react").fireEvent;
    fireEvent.contextMenu(row, { clientX: 100, clientY: 100 });

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("disables the Pause/Cancel action button for completed streams", async () => {
    renderRow({
      ...stream,
      status: "Completed",
    });

    const trigger = screen.getByRole("button", { name: `Actions for stream ${stream.name}` });
    const user = await import("@testing-library/user-event").then((m) => m.default.setup());
    await user.click(trigger);

    const pauseCancelItem = screen.getByRole("menuitem", { name: /pause\/cancel/i });
    expect(pauseCancelItem).toBeDisabled();
  });
});

