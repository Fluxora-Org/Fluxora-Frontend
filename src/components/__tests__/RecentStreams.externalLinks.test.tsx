import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import RecentStreams, { type Stream } from "../RecentStreams";

const baseStream: Stream = {
  id: "STR-1451",
  name: "Contract-derived stream",
  recipient: "GABC",
  rate: "1 USDC/sec",
  status: "Active",
};

function renderStream(detailUrl: string) {
  return render(
    <MemoryRouter>
      <RecentStreams streams={[{ ...baseStream, detailUrl }]} />
    </MemoryRouter>,
  );
}

describe("RecentStreams external detail links", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
  ])("falls back instead of rendering an unsafe detail link", (detailUrl) => {
    renderStream(detailUrl);

    const link = screen.getByRole("link", {
      name: "View details for Contract-derived stream",
    });
    expect(link).toHaveAttribute("href", "/app/streams/STR-1451");
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
  });

  it("keeps relative URLs as internal navigation without external-link attributes", () => {
    renderStream("/app/streams/custom");

    const link = screen.getByRole("link", {
      name: "View details for Contract-derived stream",
    });
    expect(link).toHaveAttribute("href", "/app/streams/custom");
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
  });

  it("canonicalizes HTTPS URLs and preserves secure external-link attributes", () => {
    renderStream(" HTTPS://EXAMPLE.COM/streams/../receipt ");

    const link = screen.getByRole("link", {
      name: "View details for Contract-derived stream",
    });
    expect(link).toHaveAttribute("href", "https://example.com/receipt");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
