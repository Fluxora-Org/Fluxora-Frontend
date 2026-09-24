import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import RouteErrorBoundary from "../RouteErrorBoundary";

const CHUNK_ERROR = "Chunk load failed: page chunk";

function renderBoundary(loader: () => Promise<{ default: () => JSX.Element }>) {
  return render(
    <MemoryRouter initialEntries={["/app/test"]}>
      <Routes>
        <Route
          path="/app/test"
          element={
            <RouteErrorBoundary load={loader}>
              <div>Fallback children element</div>
            </RouteErrorBoundary>
          }
        />
        <Route path="/app" element={<div>Dashboard landing</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RouteErrorBoundary", () => {
  it("rejects a genuine dynamic-import failure with an accessible recovery view", async () => {
    const loader = vi.fn(async () => {
      throw new Error(CHUNK_ERROR);
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const preventExpectedError = (event: ErrorEvent) => {
      if (event.error?.message?.includes(CHUNK_ERROR)) event.preventDefault();
    };
    window.addEventListener("error", preventExpectedError);

    renderBoundary(loader);

    expect(
      await screen.findByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /back to dashboard/i }),
    ).toBeInTheDocument();

    window.removeEventListener("error", preventExpectedError);
    consoleErrorSpy.mockRestore();
  });

  it("re-attempts the failed dynamic import when Try Again is clicked without reloading the document", async () => {
    const user = userEvent.setup();
    const reloadSpy = vi.spyOn(window.location, "reload").mockImplementation(() => {});
    let calls = 0;
    const loader = vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new Error(CHUNK_ERROR);
      return { default: () => <div>Recovered page content</div> };
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const preventExpectedError = (event: ErrorEvent) => {
      if (event.error?.message?.includes(CHUNK_ERROR)) event.preventDefault();
    };
    window.addEventListener("error", preventExpectedError);

    renderBoundary(loader);

    await screen.findByRole("heading", { name: /something went wrong/i });

    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(
      await screen.findByText("Recovered page content"),
    ).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("heading", { name: /something went wrong/i }),
    ).not.toBeInTheDocument();

    window.removeEventListener("error", preventExpectedError);
    consoleErrorSpy.mockRestore();
    reloadSpy.mockRestore();
  });

  it("preserves application state outside the failed route across recovery", async () => {
    const user = userEvent.setup();
    let calls = 0;
    const loader = vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new Error(CHUNK_ERROR);
      return { default: () => <div>Recovered page content</div> };
    });

    function AppWithOuterState() {
      const [userSessionData, setUserSessionData] = useState("ActiveSessionState_123");
      return (
        <div>
          <div data-testid="outer-app-state">{userSessionData}</div>
          <button onClick={() => setUserSessionData("MutatedSessionState_456")}>
            Update Outer State
          </button>
          <MemoryRouter initialEntries={["/app/test"]}>
            <Routes>
              <Route
                path="/app/test"
                element={
                  <RouteErrorBoundary load={loader}>
                    <div>Initial child</div>
                  </RouteErrorBoundary>
                }
              />
            </Routes>
          </MemoryRouter>
        </div>
      );
    }

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const preventExpectedError = (event: ErrorEvent) => {
      if (event.error?.message?.includes(CHUNK_ERROR)) event.preventDefault();
    };
    window.addEventListener("error", preventExpectedError);

    render(<AppWithOuterState />);

    // Mutate outer application state prior to failure recovery
    await user.click(screen.getByRole("button", { name: /update outer state/i }));
    expect(screen.getByTestId("outer-app-state")).toHaveTextContent("MutatedSessionState_456");

    // Route boundary caught the error
    await screen.findByRole("heading", { name: /something went wrong/i });
    expect(screen.getByTestId("outer-app-state")).toHaveTextContent("MutatedSessionState_456");

    // Click Try Again to recover
    await user.click(screen.getByRole("button", { name: /try again/i }));

    // Page recovers and outer state survives intact
    expect(await screen.findByText("Recovered page content")).toBeInTheDocument();
    expect(screen.getByTestId("outer-app-state")).toHaveTextContent("MutatedSessionState_456");

    window.removeEventListener("error", preventExpectedError);
    consoleErrorSpy.mockRestore();
  });

  it("handles repeated failures gracefully without looping indefinitely", async () => {
    const user = userEvent.setup();
    const loader = vi.fn(async () => {
      throw new Error(CHUNK_ERROR);
    });

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const preventExpectedError = (event: ErrorEvent) => {
      if (event.error?.message?.includes(CHUNK_ERROR)) event.preventDefault();
    };
    window.addEventListener("error", preventExpectedError);

    renderBoundary(loader);

    await screen.findByRole("heading", { name: /something went wrong/i });
    expect(loader).toHaveBeenCalledTimes(1);

    // First retry
    await user.click(screen.getByRole("button", { name: /try again/i }));
    await screen.findByRole("heading", { name: /something went wrong/i });
    expect(loader).toHaveBeenCalledTimes(2);

    // Second retry
    await user.click(screen.getByRole("button", { name: /try again/i }));
    await screen.findByRole("heading", { name: /something went wrong/i });
    expect(loader).toHaveBeenCalledTimes(3);

    window.removeEventListener("error", preventExpectedError);
    consoleErrorSpy.mockRestore();
  });

  it("allows the user to navigate away from a failed route", async () => {
    const user = userEvent.setup();
    const loader = vi.fn(async () => {
      throw new Error(CHUNK_ERROR);
    });

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const preventExpectedError = (event: ErrorEvent) => {
      if (event.error?.message?.includes(CHUNK_ERROR)) event.preventDefault();
    };
    window.addEventListener("error", preventExpectedError);

    render(
      <MemoryRouter initialEntries={["/app/test"]}>
        <nav>
          <Link to="/app/other">Other Route Link</Link>
        </nav>
        <Routes>
          <Route
            path="/app/test"
            element={
              <RouteErrorBoundary load={loader}>
                <div>Fallback children element</div>
              </RouteErrorBoundary>
            }
          />
          <Route path="/app/other" element={<div>Other Route Landing</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { name: /something went wrong/i });

    // Navigate away using the navigation link
    await user.click(screen.getByRole("link", { name: /other route link/i }));

    expect(await screen.findByText("Other Route Landing")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /something went wrong/i }),
    ).not.toBeInTheDocument();

    window.removeEventListener("error", preventExpectedError);
    consoleErrorSpy.mockRestore();
  });

  it("navigates to the dashboard via Back to Dashboard", async () => {
    const user = userEvent.setup();
    const loader = vi.fn(async () => {
      throw new Error(CHUNK_ERROR);
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const preventExpectedError = (event: ErrorEvent) => {
      if (event.error?.message?.includes(CHUNK_ERROR)) event.preventDefault();
    };
    window.addEventListener("error", preventExpectedError);

    renderBoundary(loader);

    await screen.findByRole("heading", { name: /something went wrong/i });

    await user.click(screen.getByRole("button", { name: /back to dashboard/i }));

    expect(
      await screen.findByText("Dashboard landing"),
    ).toBeInTheDocument();

    window.removeEventListener("error", preventExpectedError);
    consoleErrorSpy.mockRestore();
  });
});
