import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import RecentStreamsGraph, { computeTwoColumnLayout } from "./RecentStreamsGraph";
import type { Stream } from "./treasuryOverviewPage/Stream";

describe("computeTwoColumnLayout", () => {
  const mockStream: Stream = {
    name: "Test Stream",
    id: "1",
    recipient: "GABC123",
    rate: "100 USDC/month",
    accruedAmount: 1000,
    status: "Active",
    startDate: "2024-01-01",
  };

  describe("empty streams", () => {
    it("returns empty layout for empty streams array", () => {
      const layout = computeTwoColumnLayout([]);
      expect(layout.nodes).toEqual([]);
      expect(layout.edges).toEqual([]);
      expect(layout.ariaLabel).toBe("No streams to display");
    });
  });

  describe("single stream", () => {
    it("creates one sender and one recipient node", () => {
      const layout = computeTwoColumnLayout([mockStream]);
      expect(layout.nodes).toHaveLength(2);
      expect(layout.edges).toHaveLength(1);
      expect(layout.ariaLabel).toContain("1 stream");
    });

    it("positions sender on left and recipient on right", () => {
      const layout = computeTwoColumnLayout([mockStream]);
      const senderNode = layout.nodes.find((n) => n.isSender);
      const recipientNode = layout.nodes.find((n) => !n.isSender);

      expect(senderNode?.x).toBe(150);
      expect(recipientNode?.x).toBe(650);
    });
  });

  describe("node capping", () => {
    it("caps nodes at MAX_NODES (12) plus 'other' node", () => {
      const streams: Stream[] = Array.from({ length: 15 }, (_, i) => ({
        ...mockStream,
        id: String(i),
        recipient: `GADDR${i}`,
      }));

      const layout = computeTwoColumnLayout(streams);
      expect(layout.nodes.length).toBeLessThanOrEqual(14); // 12 + "other" for each column
    });

    it("creates 'other' node when exceeding MAX_NODES", () => {
      const streams: Stream[] = Array.from({ length: 15 }, (_, i) => ({
        ...mockStream,
        id: String(i),
        recipient: `GADDR${i}`,
      }));

      const layout = computeTwoColumnLayout(streams);
      const otherNode = layout.nodes.find((n) => n.id.startsWith("other-"));
      expect(otherNode).toBeDefined();
    });
  });

  describe("edge width calculation", () => {
    it("calculates edge width based on stream rate", () => {
      const streams: Stream[] = [
        { ...mockStream, rate: "10 USDC/month" },
        { ...mockStream, id: "2", recipient: "GDEF456", rate: "100 USDC/month" },
      ];

      const layout = computeTwoColumnLayout(streams);
      expect(layout.edges).toHaveLength(2);
      expect(layout.edges[0].width).toBeGreaterThan(0);
      expect(layout.edges[1].width).toBeGreaterThan(0);
    });

    it("handles equal rates with consistent edge widths", () => {
      const streams: Stream[] = [
        { ...mockStream, rate: "50 USDC/month" },
        { ...mockStream, id: "2", recipient: "GDEF456", rate: "50 USDC/month" },
      ];

      const layout = computeTwoColumnLayout(streams);
      expect(layout.edges[0].width).toEqual(layout.edges[1].width);
    });
  });

  describe("cumulative amount calculation", () => {
    it("sums accrued amounts per recipient", () => {
      const streams: Stream[] = [
        { ...mockStream, recipient: "GABC123", accruedAmount: 100 },
        { ...mockStream, id: "2", recipient: "GABC123", accruedAmount: 200 },
      ];

      const layout = computeTwoColumnLayout(streams);
      const abcNode = layout.nodes.find((n) => n.id === "GABC123");
      expect(abcNode?.cumulativeAmount).toBe(300);
    });
  });

  describe("aria label generation", () => {
    it("generates descriptive aria label for single stream", () => {
      const layout = computeTwoColumnLayout([mockStream]);
      expect(layout.ariaLabel).toBe("Relationship graph showing 1 stream between 2 nodes");
    });

    it("generates descriptive aria label for multiple streams", () => {
      const streams: Stream[] = [
        mockStream,
        { ...mockStream, id: "2", recipient: "GDEF456" },
      ];
      const layout = computeTwoColumnLayout(streams);
      expect(layout.ariaLabel).toBe("Relationship graph showing 2 streams between 2 nodes");
    });
  });
});

describe("RecentStreamsGraph component", () => {
  const mockStreams: Stream[] = [
    {
      name: "Stream 1",
      id: "1",
      recipient: "GABC123",
      rate: "100 USDC/month",
      accruedAmount: 1000,
      status: "Active",
      startDate: "2024-01-01",
    },
    {
      name: "Stream 2",
      id: "2",
      recipient: "GDEF456",
      rate: "50 USDC/month",
      accruedAmount: 500,
      status: "Active",
      startDate: "2024-01-01",
    },
  ];

  describe("rendering", () => {
    it("renders graph container with role img", () => {
      render(<RecentStreamsGraph streams={mockStreams} />);
      const container = screen.getByRole("img");
      expect(container).toBeInTheDocument();
    });

    it("renders SVG element with aria-hidden true", () => {
      const { container } = render(<RecentStreamsGraph streams={mockStreams} />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });

    it("renders accessible list for screen readers", () => {
      const { container } = render(<RecentStreamsGraph streams={mockStreams} />);
      const list = container.querySelector(".sr-only");
      expect(list).toBeInTheDocument();
      expect(list).toHaveTextContent("Streams list");
    });

    it("renders legend", () => {
      render(<RecentStreamsGraph streams={mockStreams} />);
      expect(screen.getByText("Sender")).toBeInTheDocument();
      expect(screen.getByText("Recipient")).toBeInTheDocument();
      expect(screen.getByText("Higher rate")).toBeInTheDocument();
      expect(screen.getByText("Lower rate")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("renders empty state message when no streams", () => {
      render(<RecentStreamsGraph streams={[]} />);
      expect(screen.getByText("No streams to display")).toBeInTheDocument();
    });

    it("applies empty state styling", () => {
      const { container } = render(<RecentStreamsGraph streams={[]} />);
      const emptyState = container.querySelector(".recent-streams-graph-empty");
      expect(emptyState).toBeInTheDocument();
    });
  });

  describe("keyboard navigation", () => {
    it("allows node selection with Enter key", async () => {
      const user = userEvent.setup();
      render(<RecentStreamsGraph streams={mockStreams} />);
      
      const nodes = screen.getAllByRole("button");
      await user.click(nodes[0]);
      await user.keyboard("{Enter}");
      
      expect(nodes[0]).toHaveClass("selected");
    });

    it("allows node selection with Space key", async () => {
      const user = userEvent.setup();
      render(<RecentStreamsGraph streams={mockStreams} />);
      
      const nodes = screen.getAllByRole("button");
      await user.click(nodes[0]);
      await user.keyboard(" ");
      
      expect(nodes[0]).toHaveClass("selected");
    });

    it("deselects node with Escape key", async () => {
      const user = userEvent.setup();
      render(<RecentStreamsGraph streams={mockStreams} />);
      
      const nodes = screen.getAllByRole("button");
      await user.click(nodes[0]);
      await user.keyboard("{Escape}");
      
      expect(nodes[0]).not.toHaveClass("selected");
    });
  });

  describe("node interaction", () => {
    it("selects node on click", async () => {
      const user = userEvent.setup();
      render(<RecentStreamsGraph streams={mockStreams} />);
      
      const nodes = screen.getAllByRole("button");
      await user.click(nodes[0]);
      
      expect(nodes[0]).toHaveClass("selected");
    });

    it("toggles selection on second click", async () => {
      const user = userEvent.setup();
      render(<RecentStreamsGraph streams={mockStreams} />);
      
      const nodes = screen.getAllByRole("button");
      await user.click(nodes[0]);
      await user.click(nodes[0]);
      
      expect(nodes[0]).not.toHaveClass("selected");
    });
  });

  describe("accessibility", () => {
    it("provides aria-label for each node", () => {
      render(<RecentStreamsGraph streams={mockStreams} />);
      const nodes = screen.getAllByRole("button");
      
      nodes.forEach((node) => {
        expect(node).toHaveAttribute("aria-label");
        const label = node.getAttribute("aria-label");
        expect(label).toMatch(/Sender|Recipient/);
      });
    });

    it("includes cumulative amount in node aria-label", () => {
      render(<RecentStreamsGraph streams={mockStreams} />);
      const nodes = screen.getAllByRole("button");
      
      const recipientNode = nodes.find((n) => 
        n.getAttribute("aria-label")?.includes("Recipient")
      );
      expect(recipientNode?.getAttribute("aria-label")).toMatch(/cumulative:/);
    });

    it("provides aria-label for graph container", () => {
      render(<RecentStreamsGraph streams={mockStreams} />);
      const container = screen.getByRole("img");
      expect(container).toHaveAttribute("aria-label");
      expect(container.getAttribute("aria-label")).toContain("Relationship graph");
    });
  });

  describe("edge cases", () => {
    it("handles 200 streams with node capping", () => {
      const largeStreams: Stream[] = Array.from({ length: 200 }, (_, i) => ({
        ...mockStreams[0],
        id: String(i),
        recipient: `GADDR${i}`,
      }));

      const { container } = render(<RecentStreamsGraph streams={largeStreams} />);
      const nodes = container.querySelectorAll(".graph-node");
      expect(nodes.length).toBeLessThanOrEqual(14); // Capped at 12 + "other"
    });

    it("handles malformed rate strings gracefully", () => {
      const malformedStreams: Stream[] = [
        { ...mockStreams[0], rate: "invalid rate" },
      ];

      const { container } = render(<RecentStreamsGraph streams={malformedStreams} />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("handles zero accrued amounts", () => {
      const zeroStreams: Stream[] = [
        { ...mockStreams[0], accruedAmount: 0 },
      ];

      const { container } = render(<RecentStreamsGraph streams={zeroStreams} />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });
});
