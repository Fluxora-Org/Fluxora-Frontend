import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TreasuryPage from "../../../pages/TreasuryPage";
import { isTreasuryDemoMode } from "../useTreasuryOverviewData";

const getMetrics = vi.fn();
const getStreams = vi.fn();
const treasuryHookState = vi.hoisted(() => ({
  metrics: [] as unknown[],
  streams: [] as unknown[],
  loading: false,
  error: null as string | null,
}));

vi.mock("../useTreasury", () => ({
  useTreasury: () => ({
    ...treasuryHookState,
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
    treasuryHookState.metrics = [];
    treasuryHookState.streams = [];
    treasuryHookState.loading = false;
    treasuryHookState.error = null;
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

    await waitFor(() => {
      expect(
        screen.getByText("No treasury metrics available."),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("Dev Grant - Alice")).not.toBeInTheDocument();
    expect(screen.getByText("No recent streams available.")).toBeInTheDocument();
    expect(getMetrics).not.toHaveBeenCalled();
    expect(getStreams).not.toHaveBeenCalled();
  });
});
