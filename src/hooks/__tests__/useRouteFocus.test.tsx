/**
 * useRouteFocus — tests
 * ─────────────────────────────────────────────────────────────────────────────
 * Asserts the four acceptance criteria from issue #1788:
 *
 *   1. Focus moves to the new route's heading or main region on navigation.
 *   2. The route change is announced (via the optional announceRouteChange cb).
 *   3. Focus is restored correctly on back navigation.
 *   4. Focus placement is asserted for several routes.
 *
 * The hook requires a router context. We use MemoryRouter from react-router-dom
 * and a thin wrapper component that calls the hook and renders a page with
 * a <main id="main-content" tabIndex={-1}> and an <h1>.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import {
  MemoryRouter,
  Routes,
  Route,
  Link,
  useNavigate,
} from "react-router-dom";
import { useRouteFocus } from "../useRouteFocus";

// ── Test helpers ──────────────────────────────────────────────────────────────

/**
 * A minimal shell that uses the hook and renders page content with the
 * same structure as Layout.tsx (main#main-content[tabIndex=-1] + h1).
 */
function Shell({ announceRouteChange }: { announceRouteChange?: (l: string) => void }) {
  useRouteFocus({ mainContentId: "main-content", announceRouteChange });

  return (
    <div>
      <nav>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/streams">Streams</Link>
        <Link to="/recipient">Recipient</Link>
        <Link to="/treasury">Treasury</Link>
      </nav>

      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/dashboard" element={<><h1>Dashboard</h1><p>content</p></>} />
          <Route path="/streams" element={<><h1>Streams</h1><p>content</p></>} />
          <Route path="/recipient" element={<><h1>Recipient Portal</h1><p>content</p></>} />
          <Route path="/treasury" element={<><h1>Treasury Overview</h1><p>content</p></>} />
          {/* Route with NO h1 — tests the main-region fallback */}
          <Route path="/no-heading" element={<p>No heading on this page</p>} />
          <Route path="/" element={<><h1>Home</h1><p>content</p></>} />
        </Routes>
      </main>
    </div>
  );
}

function renderAtRoute(
  initialPath: string,
  announceRouteChange?: (l: string) => void,
) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Shell announceRouteChange={announceRouteChange} />
    </MemoryRouter>,
  );
}

// ── rAF flushing ──────────────────────────────────────────────────────────────

// jsdom does not run rAF callbacks automatically. We swap it out for a
// synchronous implementation so act() flushes everything in one step.
let rafCallbacks: FrameRequestCallback[] = [];
let rafHandle = 0;

function installSyncRaf() {
  vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
    rafCallbacks.push(cb);
    return ++rafHandle;
  });
  vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation((id) => {
    rafCallbacks = rafCallbacks.filter((_, i) => i !== id - 1);
  });
}

function flushRaf() {
  const pending = [...rafCallbacks];
  rafCallbacks = [];
  pending.forEach((cb) => cb(performance.now()));
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  installSyncRaf();
});

afterEach(() => {
  vi.restoreAllMocks();
  rafCallbacks = [];
  rafHandle = 0;
});

// ── AC1: Focus moves to heading or main region on navigation ──────────────────

describe("useRouteFocus — AC1: focus placement on route change", () => {
  it("focuses the h1 on the Dashboard route after navigation from Streams", async () => {
    const { getByRole } = renderAtRoute("/streams");

    // Navigate to Dashboard
    await act(async () => {
      getByRole("link", { name: "Dashboard" }).click();
      flushRaf();
      flushRaf(); // second rAF removes tmp tabIndex
    });

    const h1 = screen.getByRole("heading", { name: "Dashboard", level: 1 });
    expect(document.activeElement).toBe(h1);
  });

  it("focuses the h1 on the Streams route", async () => {
    const { getByRole } = renderAtRoute("/dashboard");

    await act(async () => {
      getByRole("link", { name: "Streams" }).click();
      flushRaf();
      flushRaf();
    });

    const h1 = screen.getByRole("heading", { name: "Streams", level: 1 });
    expect(document.activeElement).toBe(h1);
  });

  it("focuses the h1 on the Recipient Portal route", async () => {
    const { getByRole } = renderAtRoute("/dashboard");

    await act(async () => {
      getByRole("link", { name: "Recipient" }).click();
      flushRaf();
      flushRaf();
    });

    const h1 = screen.getByRole("heading", { name: "Recipient Portal", level: 1 });
    expect(document.activeElement).toBe(h1);
  });

  it("focuses the h1 on the Treasury Overview route", async () => {
    const { getByRole } = renderAtRoute("/dashboard");

    await act(async () => {
      getByRole("link", { name: "Treasury" }).click();
      flushRaf();
      flushRaf();
    });

    const h1 = screen.getByRole("heading", { name: "Treasury Overview", level: 1 });
    expect(document.activeElement).toBe(h1);
  });

  it("falls back to #main-content when the route has no h1", async () => {
    // Render directly at /no-heading but navigate there from /dashboard so the
    // hook fires.
    function GoToNoHeading() {
      useRouteFocus({ mainContentId: "main-content" });
      const navigate = useNavigate();
      return (
        <main id="main-content" tabIndex={-1}>
          <Routes>
            <Route path="/dashboard" element={
              <>
                <h1>Dashboard</h1>
                <button onClick={() => navigate("/no-heading")}>Go</button>
              </>
            } />
            <Route path="/no-heading" element={<p>No heading here</p>} />
          </Routes>
        </main>
      );
    }

    const { getByRole } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <GoToNoHeading />
      </MemoryRouter>,
    );

    await act(async () => {
      getByRole("button", { name: "Go" }).click();
      flushRaf();
      flushRaf();
    });

    const main = document.getElementById("main-content");
    expect(document.activeElement).toBe(main);
  });
});

// ── AC2: Route change is announced ───────────────────────────────────────────

describe("useRouteFocus — AC2: route change announcement", () => {
  it("calls announceRouteChange with the h1 text on navigation", async () => {
    const announce = vi.fn();
    const { getByRole } = renderAtRoute("/dashboard", announce);

    // Initial render should not announce (no navigation happened yet).
    flushRaf();
    expect(announce).not.toHaveBeenCalled();

    await act(async () => {
      getByRole("link", { name: "Streams" }).click();
      flushRaf();
      flushRaf();
    });

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith("Streams");
  });

  it("calls announceRouteChange with the Recipient Portal heading text", async () => {
    const announce = vi.fn();
    const { getByRole } = renderAtRoute("/dashboard", announce);

    await act(async () => {
      getByRole("link", { name: "Recipient" }).click();
      flushRaf();
      flushRaf();
    });

    expect(announce).toHaveBeenCalledWith("Recipient Portal");
  });

  it("does NOT call announceRouteChange on the initial render", async () => {
    const announce = vi.fn();
    renderAtRoute("/dashboard", announce);

    await act(async () => {
      flushRaf();
    });

    expect(announce).not.toHaveBeenCalled();
  });
});

// ── AC3: Focus restored on back navigation ────────────────────────────────────

describe("useRouteFocus — AC3: focus on back navigation", () => {
  it("moves focus to the previous route heading when the user navigates back", async () => {
    // Simulate forward then back navigation using programmatic history.
    function BackNavShell() {
      useRouteFocus({ mainContentId: "main-content" });
      const navigate = useNavigate();

      return (
        <main id="main-content" tabIndex={-1}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <>
                  <h1>Dashboard</h1>
                  <button onClick={() => navigate("/streams")}>Go to Streams</button>
                </>
              }
            />
            <Route
              path="/streams"
              element={
                <>
                  <h1>Streams</h1>
                  <button onClick={() => navigate(-1)}>Back</button>
                </>
              }
            />
          </Routes>
        </main>
      );
    }

    const { getByRole } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <BackNavShell />
      </MemoryRouter>,
    );

    // Navigate forward to Streams
    await act(async () => {
      getByRole("button", { name: "Go to Streams" }).click();
      flushRaf();
      flushRaf();
    });

    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Streams", level: 1 }),
    );

    // Navigate back to Dashboard
    await act(async () => {
      getByRole("button", { name: "Back" }).click();
      flushRaf();
      flushRaf();
    });

    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Dashboard", level: 1 }),
    );
  });
});

// ── AC4: Focus placement for several routes ───────────────────────────────────

describe("useRouteFocus — AC4: focus placement across multiple routes", () => {
  const routes: Array<{ link: string; heading: string }> = [
    { link: "Dashboard", heading: "Dashboard" },
    { link: "Streams", heading: "Streams" },
    { link: "Recipient", heading: "Recipient Portal" },
    { link: "Treasury", heading: "Treasury Overview" },
  ];

  routes.forEach(({ link, heading }) => {
    it(`focuses h1 "${heading}" when navigating via the ${link} link`, async () => {
      const { getByRole } = renderAtRoute("/dashboard");

      await act(async () => {
        getByRole("link", { name: link }).click();
        flushRaf();
        flushRaf();
      });

      const h1 = screen.getByRole("heading", { name: heading, level: 1 });
      expect(document.activeElement).toBe(h1);
    });
  });
});
