import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Breadcrumb from "../Breadcrumb";

function renderBreadcrumb() {
  return render(
    <MemoryRouter>
      <Breadcrumb
        items={[
          { label: "Dashboard", to: "/" },
          { label: "Streams", to: "/streams" },
          { label: "Stream ABC123", to: "/streams/abc123" },
        ]}
      />
    </MemoryRouter>
  );
}

describe("Breadcrumb accessibility", () => {
  it("keeps intermediate crumbs as focusable links and marks the current page", () => {
    renderBreadcrumb();

    const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
    const streamsLink = screen.getByRole("link", { name: "Streams" });
    const currentPage = screen.getByText("Stream ABC123");

    expect(dashboardLink).toHaveAttribute("href", "/");
    expect(streamsLink).toHaveAttribute("href", "/streams");
    expect(dashboardLink).toHaveClass("breadcrumb-link");
    expect(streamsLink).toHaveClass("breadcrumb-link");
    expect(currentPage).toHaveAttribute("aria-current", "page");
    expect(
      screen.queryByRole("link", { name: "Stream ABC123" })
    ).not.toBeInTheDocument();
  });

  it("mirrors the hover affordance while a breadcrumb link has keyboard focus", () => {
    renderBreadcrumb();

    const streamsLink = screen.getByRole("link", { name: "Streams" });

    fireEvent.focus(streamsLink);
    expect(streamsLink).toHaveStyle({
      color: "var(--breadcrumb-color-hover)",
    });

    fireEvent.blur(streamsLink);
    expect(streamsLink).toHaveStyle({ color: "var(--breadcrumb-color)" });
  });

  it("tabs through only linked breadcrumb items", async () => {
    const user = userEvent.setup();
    renderBreadcrumb();

    await user.tab();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("link", { name: "Streams" })).toHaveFocus();

    expect(
      screen.queryByRole("link", { name: "Stream ABC123" })
    ).not.toBeInTheDocument();
  });
});
