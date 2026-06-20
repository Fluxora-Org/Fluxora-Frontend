import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { Stream } from "../Stream";
import { RecentStreamsContent } from "../RecentStreams";

vi.mock("../StatusPill", () => ({
  default: ({ status }: { status: string }) => (
    <span role="status">{status}</span>
  ),
}));

const stream: Stream = {
  name: "Dev Grant",
  id: "STR-TEST",
  recipient: "GABC...TEST",
  rate: "10 USDC/mo",
  status: "Active",
};

function renderRecentStreams(
  props: ComponentProps<typeof RecentStreamsContent>,
) {
  return render(
    <MemoryRouter>
      <RecentStreamsContent {...props} />
    </MemoryRouter>,
  );
}

describe("RecentStreamsContent", () => {
  it("renders a loading state while recent streams load", () => {
    renderRecentStreams({
      streams: [],
      loading: true,
      error: null,
      onRetry: vi.fn(),
    });

    expect(screen.getByText(/loading recent streams/i)).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("renders an error state with retry action", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    renderRecentStreams({
      streams: [],
      loading: false,
      error: "Unable to load treasury overview data.",
      onRetry,
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      /unable to load treasury overview data/i,
    );

    await user.click(screen.getByRole("button", { name: /retry/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders streams from hook data", () => {
    renderRecentStreams({
      streams: [stream],
      loading: false,
      error: null,
      onRetry: vi.fn(),
    });

    expect(
      screen.getByRole("grid", { name: /active streams/i }),
    ).toHaveAttribute("aria-rowcount", "1");
    expect(screen.getByText("Dev Grant")).toBeInTheDocument();
  });

  it("renders an empty table state when no streams are returned", () => {
    renderRecentStreams({
      streams: [],
      loading: false,
      error: null,
      onRetry: vi.fn(),
    });

    expect(screen.getByText(/no recent streams available/i)).toBeInTheDocument();
  });
});
