import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CreateStreamFab from "../CreateStreamFab";

const createAction = (label: string, onSelect = vi.fn()) => ({
  id: label.toLowerCase().replace(/ /g, "-"),
  label,
  onSelect,
});

describe("CreateStreamFab", () => {
  it("opens the create flow and exposes the minimum hit target", () => {
    const onCreateStream = vi.fn();
    render(<CreateStreamFab onCreateStream={onCreateStream} />);

    const fab = screen.getByRole("button", { name: "Create stream" });
    expect(fab).toHaveClass("ui-primary-cta");
    expect(fab).toHaveClass("create-stream-fab__button");

    fireEvent.click(fab);
    expect(onCreateStream).toHaveBeenCalledOnce();
  });

  it("is disabled until the wallet is connected and hides for an open modal", () => {
    const { rerender } = render(
      <CreateStreamFab onCreateStream={vi.fn()} disabled />,
    );

    expect(
      screen.getByRole("button", {
        name: /create stream \(connect wallet first\)/i,
      }),
    ).toBeDisabled();

    rerender(<CreateStreamFab onCreateStream={vi.fn()} hidden />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("supports an expanded speed dial with arrow-key navigation", () => {
    const onCreate = vi.fn();
    const onImport = vi.fn();
    render(
      <CreateStreamFab
        onCreateStream={onCreate}
        actions={[
          createAction("Create stream", onCreate),
          createAction("Import CSV", onImport),
        ]}
      />,
    );

    const fab = screen.getByRole("button", { name: "Create stream" });
    fireEvent.click(fab);

    expect(fab).toHaveAttribute("aria-haspopup", "menu");
    expect(fab).toHaveAttribute("aria-expanded", "true");
    const items = screen.getAllByRole("menuitem");
    expect(items[0]).toHaveFocus();

    fireEvent.keyDown(items[0]!, { key: "ArrowDown" });
    expect(items[1]).toHaveFocus();
    fireEvent.click(items[1]!);
    expect(onImport).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the expanded action menu when clicking outside the FAB (Issue #942)", () => {
    const onCreate = vi.fn();
    const onImport = vi.fn();
    render(
      <div>
        <div data-testid="outside">Outside element</div>
        <CreateStreamFab
          onCreateStream={onCreate}
          actions={[
            createAction("Create stream", onCreate),
            createAction("Import CSV", onImport),
          ]}
        />
      </div>,
    );

    const fab = screen.getByRole("button", { name: "Create stream" });
    fireEvent.click(fab);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    // Click outside the FAB — menu should close.
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
