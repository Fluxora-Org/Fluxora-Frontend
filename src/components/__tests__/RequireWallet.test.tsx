import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import RequireWallet, { sanitizeReturnTo } from "../RequireWallet";

const walletState = vi.hoisted(() => ({
  connected: false,
  loading: false,
  address: null as string | null,
  network: null as string | null,
}));

vi.mock("../wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    ...walletState,
    error: null,
    expectedNetwork: "TESTNET",
    expectedNetworkLabel: "Testnet",
    isNetworkMismatch: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

function LocationProbe() {
  const location = useLocation();
  const state = location.state as { returnTo?: string } | null;

  return (
    <output>
      {location.pathname}
      {location.search}
      {state?.returnTo ? ` returnTo=${state.returnTo}` : ""}
    </output>
  );
}

function renderGuard(initialPath = "/app/streams?status=active#row-1") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/app/*"
          element={
            <RequireWallet>
              <div>Protected app</div>
            </RequireWallet>
          }
        />
        <Route path="/connect-wallet" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("sanitizeReturnTo", () => {
  it("allows valid in-app relative paths", () => {
    expect(sanitizeReturnTo("/app")).toBe("/app");
    expect(sanitizeReturnTo("/app/streams")).toBe("/app/streams");
    expect(sanitizeReturnTo("/app/recipient/new")).toBe("/app/recipient/new");
  });

  it("allows paths with query strings and hashes", () => {
    expect(sanitizeReturnTo("/app/streams?status=active")).toBe(
      "/app/streams?status=active",
    );
    expect(sanitizeReturnTo("/app/streams#section-1")).toBe(
      "/app/streams#section-1",
    );
    expect(
      sanitizeReturnTo("/app/streams?status=active&sort=asc#row-1"),
    ).toBe("/app/streams?status=active&sort=asc#row-1");
  });

  it("allows root path", () => {
    expect(sanitizeReturnTo("/")).toBe("/");
  });

  it("rejects absolute http URLs", () => {
    expect(sanitizeReturnTo("http://evil.com/phish")).toBe("/app");
  });

  it("rejects absolute https URLs", () => {
    expect(sanitizeReturnTo("https://evil.com/phish")).toBe("/app");
  });

  it("rejects uppercase scheme URLs", () => {
    expect(sanitizeReturnTo("HTTP://evil.com")).toBe("/app");
    expect(sanitizeReturnTo("HTTPS://evil.com")).toBe("/app");
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeReturnTo("//evil.com/phish")).toBe("/app");
    expect(sanitizeReturnTo("//www.example.com")).toBe("/app");
  });

  it("rejects javascript: URIs", () => {
    expect(sanitizeReturnTo("javascript:alert(1)")).toBe("/app");
  });

  it("rejects data: URIs", () => {
    expect(sanitizeReturnTo("data:text/html,<script>alert(1)</script>")).toBe(
      "/app",
    );
  });

  it("rejects vbscript: URIs", () => {
    expect(sanitizeReturnTo("vbscript:msgbox(1)")).toBe("/app");
  });

  it("rejects empty string", () => {
    expect(sanitizeReturnTo("")).toBe("/app");
  });

  it("rejects whitespace-only string", () => {
    expect(sanitizeReturnTo("   ")).toBe("/app");
  });

  it("rejects null", () => {
    expect(sanitizeReturnTo(null)).toBe("/app");
  });

  it("rejects undefined", () => {
    expect(sanitizeReturnTo(undefined)).toBe("/app");
  });

  it("rejects number", () => {
    expect(sanitizeReturnTo(42)).toBe("/app");
  });

  it("rejects object", () => {
    expect(sanitizeReturnTo({ path: "/app" })).toBe("/app");
  });

  it("rejects path traversal with ..", () => {
    expect(sanitizeReturnTo("/app/../../etc/passwd")).toBe("/app");
    expect(sanitizeReturnTo("/../secret")).toBe("/app");
    expect(sanitizeReturnTo("/app/..")).toBe("/app");
  });

  it("rejects relative paths not starting with /", () => {
    expect(sanitizeReturnTo("app/streams")).toBe("/app");
    expect(sanitizeReturnTo("relative/path")).toBe("/app");
  });

  it("rejects mixed-case scheme bypass attempts", () => {
    expect(sanitizeReturnTo("JAVASCRIPT:alert(1)")).toBe("/app");
    expect(sanitizeReturnTo("Data:text/html,<script>")).toBe("/app");
  });
});

describe("RequireWallet", () => {
  it("redirects disconnected users to connect-wallet with sanitized returnTo", () => {
    walletState.connected = false;
    walletState.loading = false;

    renderGuard();

    expect(
      screen.getByText("/connect-wallet returnTo=/app/streams?status=active#row-1"),
    ).toBeInTheDocument();
  });

  it("renders protected content for connected users", () => {
    walletState.connected = true;
    walletState.loading = false;

    renderGuard("/app/recipient");

    expect(screen.getByText("Protected app")).toBeInTheDocument();
  });

  it("waits during silent wallet restore without redirecting", () => {
    walletState.connected = false;
    walletState.loading = true;

    renderGuard("/app");

    expect(screen.getByRole("status")).toHaveTextContent(
      "Restoring wallet session...",
    );
    expect(screen.queryByText("/connect-wallet")).not.toBeInTheDocument();
  });

  it("sanitizes returnTo through the component for a valid path", () => {
    walletState.connected = false;
    walletState.loading = false;

    renderGuard("/app/tx/123?view=detail#confirm");

    expect(
      screen.getByText("/connect-wallet returnTo=/app/tx/123?view=detail#confirm"),
    ).toBeInTheDocument();
  });
});
