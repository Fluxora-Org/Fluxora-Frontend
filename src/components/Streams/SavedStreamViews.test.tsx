import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { SavedStreamViews } from "./SavedStreamViews";
import { DEFAULT_STREAM_ROUTE_FILTERS } from "../../lib/streamFilterParams";
import {
  readSavedStreamViews,
  saveStreamView,
} from "../../lib/savedStreamViews";
beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
it("creates, reloads, applies, and deletes the current view using labelled controls", () => {
  const apply = vi.fn();
  const interact = vi.fn();
  const props = {
    account: "alice",
    filters: {
      ...DEFAULT_STREAM_ROUTE_FILTERS,
      search: "str-00",
      status: "Paused" as const,
    },
    onApply: apply,
    onInteraction: interact,
  };
  const { unmount } = render(<SavedStreamViews {...props} />);
  expect(
    screen.getByRole("button", { name: "Save current view" }),
  ).toBeDisabled();
  fireEvent.change(screen.getByLabelText("View name"), {
    target: { value: "Payroll" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save current view" }));
  expect(screen.getByText("View saved.")).toBeInTheDocument();
  unmount();
  render(<SavedStreamViews {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Apply view Payroll" }));
  expect(apply).toHaveBeenCalledWith(props.filters);
  expect(screen.getByText("View applied.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Delete view Payroll" }));
  expect(
    screen.queryByRole("button", { name: "Apply view Payroll" }),
  ).not.toBeInTheDocument();
  expect(readSavedStreamViews("alice")).toEqual([]);
  expect(screen.getByText("View deleted.")).toBeInTheDocument();
  expect(interact).toHaveBeenCalledTimes(3);
});
it("reports duplicate save errors and blocked deletion without removing the view", () => {
  saveStreamView("alice", "Payroll", DEFAULT_STREAM_ROUTE_FILTERS);
  render(
    <SavedStreamViews
      account="alice"
      filters={DEFAULT_STREAM_ROUTE_FILTERS}
      onApply={vi.fn()}
      onInteraction={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("View name"), {
    target: { value: "Payroll" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save current view" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to save");
  vi.spyOn(localStorage, "setItem").mockImplementationOnce(() => {
    throw new Error("blocked");
  });
  fireEvent.click(screen.getByRole("button", { name: "Delete view Payroll" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to delete");
  expect(
    screen.getByRole("button", { name: "Apply view Payroll" }),
  ).toBeInTheDocument();
});

it("keeps saving disabled without a wallet identity", () => {
  render(
    <SavedStreamViews
      account=""
      filters={DEFAULT_STREAM_ROUTE_FILTERS}
      onApply={vi.fn()}
      onInteraction={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("View name"), {
    target: { value: "Name" },
  });
  expect(
    screen.getByRole("button", { name: "Save current view" }),
  ).toBeDisabled();
});
