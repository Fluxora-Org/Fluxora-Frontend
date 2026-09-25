import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WidgetTray from "../WidgetTray";
import type { Metric } from "../Metric";

const hiddenWidgets: Array<{ metric: Metric; id: string }> = [
  {
    metric: {
      icon: "📈",
      label: "Net Flow",
      value: "$2.1M",
      desc: "Net flow metric",
    },
    id: "net-flow",
  },
  {
    metric: {
      icon: "💰",
      label: "Treasury Balance",
      value: "$5.4M",
      desc: "Treasury balance metric",
    },
    id: "treasury-balance",
  },
];

describe("WidgetTray", () => {
  it("calls onRestore with the correct widget id when the restore action is triggered", () => {
    const onRestore = vi.fn();

    render(<WidgetTray hiddenWidgets={hiddenWidgets} onRestore={onRestore} />);

    fireEvent.click(screen.getByRole("button", { name: /restore net flow widget/i }));

    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(onRestore).toHaveBeenCalledWith("net-flow");
  });

  it("renders the reset layout action when onResetAll is provided and hides it otherwise", () => {
    const { rerender } = render(
      <WidgetTray hiddenWidgets={hiddenWidgets} onRestore={vi.fn()} onResetAll={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: /reset layout/i })).toBeInTheDocument();

    rerender(<WidgetTray hiddenWidgets={hiddenWidgets} onRestore={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /reset layout/i })).not.toBeInTheDocument();
  });

  it("forwards drag events to the matching widget id", () => {
    const onDragOver = vi.fn();
    const onDragEnter = vi.fn();
    const onDragLeave = vi.fn();
    const onDrop = vi.fn();

    render(
      <WidgetTray
        hiddenWidgets={hiddenWidgets}
        onRestore={vi.fn()}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      />,
    );

    const widgetCard = screen.getByText("Treasury Balance").closest("div");

    expect(widgetCard).not.toBeNull();

    fireEvent.dragOver(widgetCard!);
    fireEvent.dragEnter(widgetCard!);
    fireEvent.dragLeave(widgetCard!);
    fireEvent.drop(widgetCard!);

    expect(onDragOver).toHaveBeenCalledWith(expect.any(Object), "treasury-balance");
    expect(onDragEnter).toHaveBeenCalledWith(expect.any(Object), "treasury-balance");
    expect(onDragLeave).toHaveBeenCalledWith(expect.any(Object), "treasury-balance");
    expect(onDrop).toHaveBeenCalledWith(expect.any(Object), "treasury-balance");
  });
});
