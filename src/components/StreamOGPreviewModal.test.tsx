import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { StreamOGPreviewModal } from "./StreamOGPreviewModal";
import type { StreamRecord } from "../data/streamRecords";

const mockStream: StreamRecord = {
  id: "STR-OG-999",
  name: "Protocol Ecosystem Grant",
  recipientName: "Bob Builder",
  recipientAddress: "GBJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3Q",
  treasuryName: "DAO Treasury",
  treasuryAddress: "GBJSINKGK5UHTCU3VS645X7QAEJCGNCFKZTXRCM2VO6M3XXPAAISFPVU",
  asset: "USDC",
  status: "Active",
  monthlyRate: 2500,
  depositAmount: 15000,
  streamedAmount: 5000,
  withdrawableAmount: 1000,
  remainingAmount: 10000,
  progress: 33.3,
  startDate: "2026-01-01T00:00:00Z",
  endDate: "2026-07-01T00:00:00Z",
  summary: "Builder grant stream for protocol expansion.",
  health: "Healthy",
  healthNote: "Stream is active and solvent.",
  tags: ["Ecosystem", "Grant"],
  timeline: [],
  public: true,
};

describe("StreamOGPreviewModal states (#1974)", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe("Loading state", () => {
    it("renders loading indicator with accessible status role when isLoading is true", () => {
      render(
        <StreamOGPreviewModal
          isOpen={true}
          isLoading={true}
          onClose={vi.fn()}
        />,
      );

      const statusElement = screen.getByRole("status");
      expect(statusElement).toBeInTheDocument();
      expect(screen.getByText("Loading preview...")).toBeVisible();
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

      // Ensure canvas and action buttons are not rendered while loading
      expect(screen.queryByTestId("copy-og-url-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("share-og-stream-btn")).not.toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("renders nothing when isOpen is false", () => {
      const { container } = render(
        <StreamOGPreviewModal
          isOpen={false}
          stream={mockStream}
          onClose={vi.fn()}
        />,
      );

      expect(container.firstChild).toBeNull();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders empty state notice when open without stream data", () => {
      render(
        <StreamOGPreviewModal
          isOpen={true}
          stream={null}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("No stream preview available")).toBeVisible();
      expect(
        screen.getByText("No preview data found for this stream."),
      ).toBeVisible();

      // Canvas and copy/share buttons are not present
      expect(screen.queryByTestId("copy-og-url-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("share-og-stream-btn")).not.toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("renders alert role and asserts what the user actually sees for a string error", () => {
      const errorMessage = "Unable to generate preview for private stream.";

      render(
        <StreamOGPreviewModal
          isOpen={true}
          error={errorMessage}
          onClose={vi.fn()}
        />,
      );

      const alertElement = screen.getByRole("alert");
      expect(alertElement).toBeInTheDocument();
      expect(screen.getByText("Failed to load preview")).toBeVisible();
      expect(screen.getByText(errorMessage)).toBeVisible();

      // Canvas and action controls are omitted during error
      expect(screen.queryByTestId("copy-og-url-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("share-og-stream-btn")).not.toBeInTheDocument();
    });

    it("renders alert role and asserts what the user actually sees for an Error instance", () => {
      const errorObj = new Error("Failed to load stream metadata from network.");

      render(
        <StreamOGPreviewModal
          isOpen={true}
          error={errorObj}
          onClose={vi.fn()}
        />,
      );

      const alertElement = screen.getByRole("alert");
      expect(alertElement).toBeInTheDocument();
      expect(screen.getByText("Failed to load preview")).toBeVisible();
      expect(
        screen.getByText("Failed to load stream metadata from network."),
      ).toBeVisible();
    });
  });

  describe("Populated state", () => {
    it("renders the full preview modal with title, canvas, and share buttons", () => {
      render(
        <StreamOGPreviewModal
          isOpen={true}
          stream={mockStream}
          onClose={vi.fn()}
        />,
      );

      expect(
        screen.getByRole("dialog", { name: "Open Graph Social Preview" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Protocol Ecosystem Grant")).toBeInTheDocument();
      expect(screen.getByText("Bob Builder")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Copy Image URL" }),
      ).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Share Stream" }),
      ).toBeVisible();
      expect(
        screen.getByText(/https:\/\/fluxora\.app\/og-image\/STR-OG-999\.png/),
      ).toBeInTheDocument();
    });
  });

  describe("Console and act() hygiene", () => {
    it("transitions between states without console errors or act() warnings", () => {
      const { rerender } = render(
        <StreamOGPreviewModal
          isOpen={true}
          isLoading={true}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByRole("status")).toBeInTheDocument();

      rerender(
        <StreamOGPreviewModal
          isOpen={true}
          error="Network failure"
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();

      rerender(
        <StreamOGPreviewModal
          isOpen={true}
          stream={mockStream}
          onClose={vi.fn()}
        />,
      );

      expect(
        screen.getByRole("dialog", { name: "Open Graph Social Preview" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Protocol Ecosystem Grant")).toBeInTheDocument();
    });
  });
});
