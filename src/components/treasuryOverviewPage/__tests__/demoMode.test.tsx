import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TreasuryPage from "../../../pages/TreasuryPage";
import { isTreasuryDemoMode } from "../useTreasuryOverviewData";

const useTreasuryMock = vi.fn();

vi.mock("../useTreasury", () => ({
  useTreasury: () => useTreasuryMock(),
  useRecipientStreams: () => ({
    streams: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
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
    useTreasuryMock.mockReset();
    useTreasuryMock.mockReturnValue({
      metrics: [],
      streams: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
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
  });

  it("explicitly pairs DemoBanner with fixture data — never sample data without banner", () => {
    vi.stubEnv("VITE_DEMO_MODE", "true");

    renderTreasuryPage();

    // Invariant: DemoBanner must always be visible whenever fixture data is rendered
    expect(screen.getByText("Demo state:")).toBeInTheDocument();
    expect(screen.getByText("Dev Grant - Alice")).toBeInTheDocument();
    expect(screen.getByText("Active Streams")).toBeInTheDocument();
  });

  it("defaults to live data and does not render fixture streams", async () => {
    useTreasuryMock.mockReturnValue({
      metrics: [],
      streams: [],
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { rerender } = renderTreasuryPage();

    expect(screen.queryByText("Demo state:")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading treasury overview...",
    );

    useTreasuryMock.mockReturnValue({
      metrics: [],
      streams: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    rerender(
      <MemoryRouter>
        <TreasuryPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText("No treasury metrics available."),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("Dev Grant - Alice")).not.toBeInTheDocument();
    expect(screen.getByText("No recent streams available.")).toBeInTheDocument();
  });
});
