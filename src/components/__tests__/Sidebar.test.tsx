import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Sidebar from "../Sidebar";

function renderSidebar() {
  render(
    <MemoryRouter>
      <Sidebar
        collapsed={false}
        onToggleCollapse={vi.fn()}
        mobileOpen={false}
        onMobileClose={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe("Sidebar", () => {
  it("uses real external destinations for utility links", () => {
    renderSidebar();

    const documentation = screen.getByRole("link", { name: "Documentation" });
    const legal = screen.getByRole("link", { name: "Legal" });

    expect(documentation).toHaveAttribute(
      "href",
      "https://github.com/Fluxora-Org/Fluxora-Frontend#readme",
    );
    expect(legal).toHaveAttribute(
      "href",
      "https://github.com/Fluxora-Org/Fluxora-Frontend/blob/main/docs/security.md",
    );
    expect(documentation).not.toHaveAttribute("href", "#");
    expect(legal).not.toHaveAttribute("href", "#");
  });

  it("marks external utility links as safe new-tab links", () => {
    renderSidebar();

    for (const label of ["Documentation", "Legal"]) {
      const link = screen.getByRole("link", { name: label });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});
