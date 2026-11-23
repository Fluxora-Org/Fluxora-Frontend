import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ApiVersionGuard from "./ApiVersionGuard";
import { checkApiVersion, SUPPORTED_API_VERSION_RANGE } from "../lib/apiVersion";

vi.mock("../lib/apiVersion", () => ({
  checkApiVersion: vi.fn(),
  SUPPORTED_API_VERSION_RANGE: "1.x",
}));

const mockConfig = vi.hoisted(() => ({
  apiUrl: "https://api.fluxora.test" as string | null,
  useMocks: false,
}));

vi.mock("../lib/config", () => ({
  config: mockConfig,
}));

describe("ApiVersionGuard states (issue #1968)", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.apiUrl = "https://api.fluxora.test";
    mockConfig.useMocks = false;
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Loading state
  // ───────────────────────────────────────────────────────────────────────────
  describe("Loading state", () => {
    it("does not render the warning alert while the version check is pending", () => {
      // Return a promise that stays pending
      vi.mocked(checkApiVersion).mockReturnValue(new Promise(() => {}));

      const { container } = render(<ApiVersionGuard />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(container.firstChild).toBeNull();
    });

    it("renders children while the version check is pending", () => {
      vi.mocked(checkApiVersion).mockReturnValue(new Promise(() => {}));

      render(
        <ApiVersionGuard>
          <div data-testid="app-content">Fluxora Dashboard</div>
        </ApiVersionGuard>,
      );

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByTestId("app-content")).toBeInTheDocument();
      expect(screen.getByText("Fluxora Dashboard")).toBeVisible();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Empty state
  // ───────────────────────────────────────────────────────────────────────────
  describe("Empty state", () => {
    it("renders nothing and skips check when apiUrl is not configured", () => {
      mockConfig.apiUrl = null;

      const { container } = render(<ApiVersionGuard />);

      expect(checkApiVersion).not.toHaveBeenCalled();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing and skips check when useMocks is enabled", () => {
      mockConfig.useMocks = true;

      const { container } = render(<ApiVersionGuard />);

      expect(checkApiVersion).not.toHaveBeenCalled();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing when the version check confirms compatibility without children", async () => {
      vi.mocked(checkApiVersion).mockResolvedValue({
        status: "compatible",
        version: "1.2.0",
      });

      const { container } = render(<ApiVersionGuard />);

      await waitFor(() => {
        expect(checkApiVersion).toHaveBeenCalledWith("https://api.fluxora.test");
      });

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(container.firstChild).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Populated state
  // ───────────────────────────────────────────────────────────────────────────
  describe("Populated state", () => {
    it("renders children when the backend version is compatible", async () => {
      vi.mocked(checkApiVersion).mockResolvedValue({
        status: "compatible",
        version: "1.0.0",
      });

      render(
        <ApiVersionGuard>
          <main data-testid="main-view">
            <h1>Welcome to Fluxora</h1>
          </main>
        </ApiVersionGuard>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("main-view")).toBeInTheDocument();
      });

      expect(screen.getByText("Welcome to Fluxora")).toBeVisible();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("renders children without an alert when the API check is unavailable (transient outage)", async () => {
      vi.mocked(checkApiVersion).mockResolvedValue({
        status: "unavailable",
      });

      render(
        <ApiVersionGuard>
          <div data-testid="fallback-view">Normal App Flow</div>
        </ApiVersionGuard>,
      );

      await waitFor(() => {
        expect(checkApiVersion).toHaveBeenCalled();
      });

      expect(screen.getByTestId("fallback-view")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Error state
  // ───────────────────────────────────────────────────────────────────────────
  describe("Error state", () => {
    it("asserts what the user actually sees when the backend API is incompatible", async () => {
      vi.mocked(checkApiVersion).mockResolvedValue({
        status: "incompatible",
        version: "2.0.0",
      });

      render(<ApiVersionGuard />);

      const alert = await screen.findByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toBeVisible();

      // Heading that informs user of the issue
      expect(
        screen.getByText("Fluxora needs an API update"),
      ).toBeVisible();

      // Description with version information and recovery guidance
      const expectedMessage = `This frontend supports backend API version ${SUPPORTED_API_VERSION_RANGE}, but the configured backend returned an unrecognized version. Reload to try again, or ask the maintainer to deploy a compatible API.`;
      expect(screen.getByText(expectedMessage)).toBeVisible();

      // Action button to recover
      const reloadButton = screen.getByRole("button", {
        name: "Reload Fluxora",
      });
      expect(reloadButton).toBeVisible();
    });

    it("triggers window reload when the user clicks the reload button", async () => {
      const user = userEvent.setup();
      const reloadMock = vi.fn();
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { reload: reloadMock },
      });

      vi.mocked(checkApiVersion).mockResolvedValue({
        status: "incompatible",
        version: null,
      });

      render(<ApiVersionGuard />);

      const reloadButton = await screen.findByRole("button", {
        name: "Reload Fluxora",
      });

      await user.click(reloadButton);
      expect(reloadMock).toHaveBeenCalledTimes(1);
    });

    it("handles unexpected rejection gracefully without surfacing unhandled errors", async () => {
      vi.mocked(checkApiVersion).mockRejectedValue(new Error("Network timeout"));

      const { container } = render(<ApiVersionGuard />);

      await waitFor(() => {
        expect(checkApiVersion).toHaveBeenCalled();
      });

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(container.firstChild).toBeNull();
    });

    it("cleans up active subscription and does not update state if unmounted before completion", async () => {
      let resolvePromise: (value: { status: "incompatible"; version: string }) => void;
      const pendingPromise = new Promise<{ status: "incompatible"; version: string }>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(checkApiVersion).mockReturnValue(pendingPromise);

      const { unmount } = render(<ApiVersionGuard />);

      // Unmount before check completes
      unmount();

      // Resolve after unmount — should not throw or log state update warning
      resolvePromise!({ status: "incompatible", version: "2.0.0" });
      await Promise.resolve();

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
