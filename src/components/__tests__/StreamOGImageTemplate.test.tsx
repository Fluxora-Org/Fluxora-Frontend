import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StreamOGImageTemplate from "../StreamOGImageTemplate";
import type { StreamRecord } from "../../data/streamRecords";

const baseStream: StreamRecord = {
  id: "STR-TEST-1",
  name: "Core Infrastructure Grant",
  recipientName: "Satoshi N.",
  recipientAddress: "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P",
  treasuryName: "Growth Treasury",
  treasuryAddress: "GAJSINKGK5UHTCU3VS645X7QAEJCGNCFKZTXRCM2VO6M3XXPAAISFPVT",
  asset: "USDC",
  status: "Active",
  monthlyRate: 8500,
  depositAmount: 51000,
  streamedAmount: 17000,
  withdrawableAmount: 2500,
  remainingAmount: 34000,
  progress: 33.3,
  startDate: "2026-01-01",
  endDate: "2026-07-01",
  cliffDate: "2026-01-31",
  summary: "Infrastructure development grant stream.",
  health: "Healthy",
  healthNote: "Runway covers the remaining schedule.",
  auditNote: "No intervention required.",
  tags: ["Infrastructure"],
  timeline: [],
};

describe("StreamOGImageTemplate", () => {
  it("renders standard 1200x630 canvas layout with stream title and metadata", () => {
    render(<StreamOGImageTemplate stream={baseStream} />);

    const container = screen.getByTestId("stream-og-image-template");
    expect(container).toBeDefined();
    expect(container.style.width).toBe("1200px");
    expect(container.style.height).toBe("630px");

    expect(screen.getByText("Core Infrastructure Grant")).toBeDefined();
    expect(screen.getByText("Satoshi N.")).toBeDefined();
    expect(screen.getByText("GAJC...CA3P")).toBeDefined();
    expect(screen.getByText("FLUXORA")).toBeDefined();
  });

  it("renders Active status pill variant", () => {
    render(<StreamOGImageTemplate stream={{ ...baseStream, status: "Active" }} />);
    const pill = screen.getByTestId("og-status-pill");
    expect(pill.textContent).toContain("ACTIVE");
  });

  it("renders Paused status pill variant", () => {
    render(<StreamOGImageTemplate stream={{ ...baseStream, status: "Paused" }} />);
    const pill = screen.getByTestId("og-status-pill");
    expect(pill.textContent).toContain("PAUSED");
  });

  it("renders Completed status pill variant", () => {
    render(<StreamOGImageTemplate stream={{ ...baseStream, status: "Completed" }} />);
    const pill = screen.getByTestId("og-status-pill");
    expect(pill.textContent).toContain("COMPLETED");
  });

  it("renders Cliff Milestone when cliffDate is provided", () => {
    render(<StreamOGImageTemplate stream={baseStream} />);
    expect(screen.getByText("CLIFF MILESTONE")).toBeDefined();
    expect(screen.getByText("2026-01-31")).toBeDefined();
  });

  it("renders fallback schedule composition when cliffDate is missing", () => {
    const streamNoCliff = {
      ...baseStream,
      cliffDate: undefined,
    };

    render(<StreamOGImageTemplate stream={streamNoCliff} />);
    expect(screen.queryByText("CLIFF MILESTONE")).toBeNull();
    expect(screen.getByText("STREAM SCHEDULE")).toBeDefined();
    expect(screen.getByText("2026-01-01 → 2026-07-01")).toBeDefined();
  });
});
