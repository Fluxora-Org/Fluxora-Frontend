import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecipientStreams, {
  sortRecipientStreams,
} from "../recipient/RecipientStreams";
import {
  mockRecipientStreams,
  type RecipientStream,
} from "../../fixtures/recipientStreams";

function streamNames() {
  return screen
    .getAllByRole("article")
    .map((article) =>
      article.getAttribute("aria-label")?.replace("Stream from ", "")
    );
}

describe("RecipientStreams structure", () => {
  it("renders the streams list heading and labelled list", () => {
    render(<RecipientStreams />);

    expect(
      screen.getByRole("heading", { level: 2, name: /your incoming streams/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("list", { name: /your incoming streams/i })).toBeInTheDocument();
  });

  it("renders reusable fixture streams with ISO-8601 start times", () => {
    render(<RecipientStreams />);

    expect(screen.getAllByRole("listitem")).toHaveLength(mockRecipientStreams.length);
    mockRecipientStreams.forEach((stream) => {
      expect(stream.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
      expect(Date.parse(stream.startTime)).not.toBeNaN();
      expect(
        screen.getByRole("article", { name: `Stream from ${stream.senderName}` })
      ).toBeInTheDocument();
    });
  });

  it("renders From, Accrued, Rate, and Status column labels", () => {
    render(<RecipientStreams />);

    expect(screen.getByText(/^From$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Accrued$/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^Rate$/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/^Status$/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders progress bars, status badges, pin buttons, and detail buttons", () => {
    render(<RecipientStreams />);

    expect(screen.getAllByRole("progressbar")).toHaveLength(mockRecipientStreams.length);
    expect(screen.getAllByRole("status")).toHaveLength(mockRecipientStreams.length);
    expect(
      screen.getAllByRole("button", { name: /pin stream|unpin stream/i })
    ).toHaveLength(mockRecipientStreams.length);
    expect(
      screen.getAllByRole("button", { name: /view details for stream from/i })
    ).toHaveLength(mockRecipientStreams.length);
  });
});

describe("RecipientStreams pin and sort behavior", () => {
  it("defaults to pinned-first order", () => {
    render(<RecipientStreams />);

    expect(streamNames()).toEqual([
      "Stellar Dev Foundation",
      "Fluxora DAO",
      "Ecosystem Grant #42",
    ]);
  });

  it("sorts unpinned streams by newest while keeping pinned streams first", async () => {
    const user = userEvent.setup();
    render(<RecipientStreams />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: /sort by/i }),
      "newest"
    );

    expect(streamNames()).toEqual([
      "Stellar Dev Foundation",
      "Ecosystem Grant #42",
      "Fluxora DAO",
    ]);
  });

  it("sorts unpinned streams by highest rate while keeping pinned streams first", async () => {
    const user = userEvent.setup();
    render(<RecipientStreams />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: /sort by/i }),
      "rate"
    );

    expect(streamNames()).toEqual([
      "Stellar Dev Foundation",
      "Fluxora DAO",
      "Ecosystem Grant #42",
    ]);
  });

  it("moves a newly pinned stream into the pinned group", async () => {
    const user = userEvent.setup();
    render(<RecipientStreams />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: /sort by/i }),
      "newest"
    );
    await user.click(
      screen.getByRole("button", { name: /pin stream from Ecosystem Grant #42/i })
    );

    expect(streamNames()).toEqual([
      "Ecosystem Grant #42",
      "Stellar Dev Foundation",
      "Fluxora DAO",
    ]);
    expect(
      screen.getByRole("button", { name: /unpin stream from Ecosystem Grant #42/i })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps same-key ties stable after pinned precedence", () => {
    const streams: RecipientStream[] = [
      {
        ...mockRecipientStreams[1],
        id: "unpinned-a",
        senderName: "Unpinned A",
        rate: 10,
        startTime: "2024-04-01T00:00:00.000Z",
      },
      {
        ...mockRecipientStreams[2],
        id: "unpinned-b",
        senderName: "Unpinned B",
        rate: 10,
        startTime: "2024-04-01T00:00:00.000Z",
      },
      {
        ...mockRecipientStreams[0],
        id: "pinned",
        senderName: "Pinned",
        rate: 1,
        startTime: "2024-01-01T00:00:00.000Z",
        isPinned: true,
      },
    ];

    expect(sortRecipientStreams(streams, "rate").map((stream) => stream.senderName)).toEqual([
      "Pinned",
      "Unpinned A",
      "Unpinned B",
    ]);
    expect(sortRecipientStreams(streams, "newest").map((stream) => stream.senderName)).toEqual([
      "Pinned",
      "Unpinned A",
      "Unpinned B",
    ]);
  });
});

describe("RecipientStreams accessibility details", () => {
  it("labels sort options and pin state", () => {
    render(<RecipientStreams />);

    expect(screen.getByRole("option", { name: /priority/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /newest/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /highest rate/i })).toBeInTheDocument();

    screen
      .getAllByRole("button", { name: /pin stream|unpin stream/i })
      .forEach((button) => expect(button).toHaveAttribute("aria-pressed"));
  });

  it("keeps each card's metric and SVG accessibility contracts", () => {
    const { container } = render(<RecipientStreams />);

    screen.getAllByRole("article").forEach((article) => {
      expect(within(article).getByText(/USDC Total/i)).toBeInTheDocument();
      expect(within(article).getByText(/USDC\/hr/i)).toBeInTheDocument();
    });
    container.querySelectorAll("svg").forEach((svg) => {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });
});
