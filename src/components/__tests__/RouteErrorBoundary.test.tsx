import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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

  it("re-attempts the failed dynamic import when Try Again is clicked", async () => {
    const user = userEvent.setup();
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
