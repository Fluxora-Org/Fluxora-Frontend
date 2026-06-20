import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TreasuryPage from "../../../pages/TreasuryPage";
import { isTreasuryDemoMode } from "../useTreasuryOverviewData";

const getMetrics = vi.fn();
const getStreams = vi.fn();

vi.mock("../useTreasury", () => ({
  useTreasury: () => ({
    getMetrics,
    getStreams,
  }),
}));

vi.mock("../StreamRow", () => ({
  default: ({ stream }: { stream: { name: string } }) => (
    <tr>
      <td>{stream.name}</td>
    </tr>
  ),
}));

function renderTreasuryPage() {
  return render(
    <MemoryRouter>
      <TreasuryPage />
    </MemoryRouter>,
  );
}

describe("treasury overview demo mode", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    getMetrics.mockReset();
    getStreams.mockReset();
    getMetrics.mockResolvedValue([]);
    getStreams.mockResolvedValue([]);
  });

  it("parses the demo mode flag explicitly", () => {
    expect(isTreasuryDemoMode("true")).toBe(true);
    expect(isTreasuryDemoMode("1")).toBe(true);
    expect(isTreasuryDemoMode("false")).toBe(false);
    expect(isTreasuryDemoMode(undefined)).toBe(false);
  });

  it("renders fixture data only when VITE_DEMO_MODE is enabled", () => {
    vi.stubEnv("VITE_DEMO_MODE", "true");

    renderTreasuryPage();

    expect(screen.getByText("Demo state:")).toBeInTheDocument();
    expect(screen.getByText("Active Streams")).toBeInTheDocument();
    expect(screen.getByText("Dev Grant - Alice")).toBeInTheDocument();
    expect(getMetrics).not.toHaveBeenCalled();
    expect(getStreams).not.toHaveBeenCalled();
  });

  it("defaults to live data and does not render fixture streams", async () => {
    renderTreasuryPage();

    expect(screen.queryByText("Demo state:")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading treasury overview...",
    );

    await waitFor(() => {
      expect(
        screen.getByText("No treasury metrics available."),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("Dev Grant - Alice")).not.toBeInTheDocument();
    expect(screen.getByText("No recent streams available.")).toBeInTheDocument();
    expect(getMetrics).toHaveBeenCalledTimes(1);
    expect(getStreams).toHaveBeenCalledTimes(1);
  });
});
