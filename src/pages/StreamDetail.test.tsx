import { render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HelmetProvider } from "react-helmet-async";
import { MetaTags } from "../components/MetaTags";
import { StreamRecord } from "../data/streamRecords";

const mockStream: StreamRecord = {
  id: "STR-001",
  name: "Dev Grant - Alice",
  recipientName: "Alice M.",
  recipientAddress: "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P",
  treasuryName: "Protocol Growth Treasury",
  treasuryAddress: "GAJSINKGK5UHTCU3VS645X7QAEJCGNCFKZTXRCM2VO6M3XXPAAISFPVT",
  asset: "USDC",
  status: "Active",
  monthlyRate: 5000,
  depositAmount: 48000,
  streamedAmount: 19250,
  withdrawableAmount: 4200,
  remainingAmount: 28750,
  progress: 40,
  startDate: "2026-01-15",
  endDate: "2026-10-15",
  summary: "Core grant stream for protocol engineering.",
  health: "Healthy",
  healthNote: "Runway covers the remaining schedule.",
  auditNote: "No intervention required.",
  tags: ["Engineering"],
  timeline: [],
};

describe("StreamDetail MetaTags Integration", () => {
  it("injects dynamic per-stream Open Graph and Twitter meta tags into document head", async () => {
    const helmetContext = {};

    render(
      <HelmetProvider context={helmetContext}>
        <MetaTags stream={mockStream} />
      </HelmetProvider>
    );

    await waitFor(() => {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogImage = document.querySelector('meta[property="og:image"]');
      const twitterCard = document.querySelector('meta[name="twitter:card"]');

      expect(ogTitle?.getAttribute("content")).toBe("Dev Grant - Alice – Fluxora");
      expect(ogImage?.getAttribute("content")).toBe(
        `${window.location.origin}/og-image/STR-001.png?v=0`,
      );
      expect(twitterCard?.getAttribute("content")).toBe("summary_large_image");
    });
  });

  it("uses the current runtime origin for generated og url/image values", async () => {
    const helmetContext = {};

    render(
      <HelmetProvider context={helmetContext}>
        <MetaTags stream={mockStream} />
      </HelmetProvider>
    );

    await waitFor(() => {
      const ogUrl = document.querySelector('meta[property="og:url"]');
      const ogImage = document.querySelector('meta[property="og:image"]');

      expect(ogUrl?.getAttribute("content")).toBe(
        `${window.location.origin}/app/streams/STR-001`,
      );
      expect(ogImage?.getAttribute("content")).toContain(
        `${window.location.origin}/og-image/STR-001.png`,
      );
    });
  });

  it("handles fallback and status-based cache-busting query parameter", async () => {
    const helmetContext = {};
    const streamWithUpdate = {
      ...mockStream,
      updatedAt: "2026-07-23T18:00:00.000Z",
    };

    render(
      <HelmetProvider context={helmetContext}>
        <MetaTags stream={streamWithUpdate} />
      </HelmetProvider>
    );

    await waitFor(() => {
      const ogImage = document.querySelector('meta[property="og:image"]');
      const expectedTimestamp = Date.parse("2026-07-23T18:00:00.000Z");
      expect(ogImage?.getAttribute("content")).toContain(`?v=${expectedTimestamp}`);
    });
  });

  it("omits the cache-busting query when updatedAt is missing", async () => {
    const helmetContext = {};
    const streamWithoutUpdate = {
      ...mockStream,
      updatedAt: undefined,
    };

    render(
      <HelmetProvider context={helmetContext}>
        <MetaTags stream={streamWithoutUpdate} />
      </HelmetProvider>
    );

    await waitFor(() => {
      const ogImage = document.querySelector('meta[property="og:image"]');
      const twitterImage = document.querySelector('meta[name="twitter:image"]');
      const imageContent = ogImage?.getAttribute("content") ?? "";
      const twitterContent = twitterImage?.getAttribute("content") ?? "";

      expect(imageContent).not.toContain("v=NaN");
      expect(twitterContent).not.toContain("v=NaN");
      expect(imageContent).toContain("https://fluxora.app/og-image/STR-001.png");
      expect(twitterContent).toContain("https://fluxora.app/og-image/STR-001.png");
    });
  });
});
