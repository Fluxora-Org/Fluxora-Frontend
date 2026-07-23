import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import NotFound from "../NotFound";

// Mock useNavigate
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual as any,
    useNavigate: vi.fn(),
  };
});

describe("NotFound component", () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);
  });

  function renderNotFound() {
    return render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );
  }

  it("renders the 404 page correctly", () => {
    renderNotFound();
    expect(screen.getByRole("heading", { name: "404" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /page not found/i })).toBeInTheDocument();
  });

  it("navigates to dashboard when 'Go to dashboard' is clicked", () => {
    renderNotFound();
    const dashboardBtn = screen.getByRole("button", { name: /go to dashboard/i });
    fireEvent.click(dashboardBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/app", { replace: true });
  });

  it("navigates to home when 'Back to home' is clicked", () => {
    renderNotFound();
    const homeBtn = screen.getByRole("button", { name: /back to home/i });
    fireEvent.click(homeBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
