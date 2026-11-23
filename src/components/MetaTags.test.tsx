import { render, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { HelmetProvider } from "react-helmet-async";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MetaTags } from "./MetaTags";
import type { StreamRecord } from "../data/streamRecords";

const mockStream: StreamRecord = {
  id: "STR-TEST",
  name: "Community grants",
  recipientName: "Community Fund",
  recipientAddress: "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P",
  treasuryName: "Growth Treasury",
  treasuryAddress: "GAJSINKGK5UHTCU3VS645X7QAEJCGNCFKZTXRCM2VO6M3XXPAAISFPVT",
  asset: "USDC",
  status: "Active",
  monthlyRate: 1250,
  depositAmount: 12000,
  streamedAmount: 2500,
  withdrawableAmount: 1000,
  remainingAmount: 9500,
  progress: 21,
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  summary: "Monthly grants for community builders.",
  health: "Healthy",
  healthNote: "Funding is on schedule.",
  auditNote: "No review needed.",
  tags: ["Community"],
  timeline: [],
};

function renderMetaTags(props: ComponentProps<typeof MetaTags> = {}) {
  return render(
    <HelmetProvider>
      <MetaTags {...props} />
    </HelmetProvider>,
  );
}

function meta(selector: string): string | null {
  return document.head.querySelector<HTMLMetaElement>(selector)?.content ?? null;
}

describe("MetaTags", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the fallback metadata when no route data is available", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    renderMetaTags();

    await waitFor(() => {
      expect(document.title).toBe("Fluxora — Continuous Capital");
      expect(meta('meta[property="og:description"]')).toContain(
        "Stream treasury capital continuously on Stellar",
      );
      expect(meta('meta[property="og:url"]')).toBe(
        `${window.location.origin}${window.location.pathname}`,
      );
      expect(meta('meta[name="twitter:card"]')).toBe("summary_large_image");
    });

    expect(consoleError).not.toHaveBeenCalled();
  });

  it("uses the page title and description when provided", async () => {
    renderMetaTags({ title: "Treasury overview", description: "Current treasury health." });

    await waitFor(() => {
      expect(document.title).toBe("Treasury overview – Fluxora");
      expect(meta('meta[property="og:title"]')).toBe("Treasury overview – Fluxora");
      expect(meta('meta[property="og:description"]')).toBe("Current treasury health.");
      expect(meta('meta[name="twitter:description"]')).toBe("Current treasury health.");
    });
  });

  it("renders populated stream metadata and cache-busts the stream image", async () => {
    const stream = { ...mockStream, updatedAt: "2026-06-15T12:30:00.000Z" };
    const updatedAt = Date.parse(stream.updatedAt);

    renderMetaTags({ stream });

    await waitFor(() => {
      expect(document.title).toBe("Community grants – Fluxora");
      expect(meta('meta[property="og:description"]')).toBe(stream.summary);
      expect(meta('meta[property="og:url"]')).toBe(
        `${window.location.origin}/app/streams/${stream.id}`,
      );
      expect(meta('meta[property="og:image"]')).toBe(
        `${window.location.origin}/og-image/${stream.id}.png?v=${updatedAt}`,
      );
      expect(meta('meta[property="og:image:alt"]')).toContain("Community grants");
    });
  });

  it("falls back to stream details for an empty summary and invalid dates", async () => {
    const stream = { ...mockStream, summary: "", endDate: "invalid-date", updatedAt: "invalid-date" };

    renderMetaTags({ stream });

    await waitFor(() => {
      expect(meta('meta[property="og:description"]')).toContain("1,250 USDC/mo");
      expect(meta('meta[property="og:image"]')).toBe(
        `${window.location.origin}/og-image/${stream.id}.png`,
      );
      expect(meta('meta[name="twitter:image"]')).not.toContain("NaN");
    });
  });
});
