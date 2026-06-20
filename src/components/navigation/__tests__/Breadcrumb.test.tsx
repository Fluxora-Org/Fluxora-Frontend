import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";

import Breadcrumb from "../Breadcrumb";

const renderBreadcrumb = (items: React.ComponentProps<typeof Breadcrumb>["items"]) =>
  render(
    <MemoryRouter>
      <Breadcrumb items={items} />
    </MemoryRouter>
  );

describe("Breadcrumb", () => {
  it("keeps the current page as non-interactive text with aria-current", () => {
    renderBreadcrumb([
      { label: "Streams", to: "/streams" },
      { label: "Stream details" },
    ]);

    expect(screen.getByRole("link", { name: "Streams" })).toHaveAttribute(
      "href",
      "/streams"
    );
    expect(screen.queryByRole("link", { name: "Stream details" })).toBeNull();
    expect(screen.getByText("Stream details")).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("uses class-based focus styling on keyboard-focusable breadcrumb links", async () => {
    const user = userEvent.setup();

    renderBreadcrumb([
      { label: "Treasury", to: "/treasury" },
      { label: "Streams", to: "/streams" },
      { label: "Details" },
    ]);

    const firstLink = screen.getByRole("link", { name: "Treasury" });
    const secondLink = screen.getByRole("link", { name: "Streams" });

    expect(firstLink).toHaveClass("breadcrumb-link");
    expect(secondLink).toHaveClass("breadcrumb-link");

    await user.tab();
    expect(firstLink).toHaveFocus();

    await user.tab();
    expect(secondLink).toHaveFocus();
  });

  it("truncates Stellar address labels visually while preserving the full label for assistive context", () => {
    // Checksum-valid Stellar public key (the centralized validator from #331
    // rejects addresses with an invalid CRC16 checksum).
    const address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

    renderBreadcrumb([
      { label: "Streams", to: "/streams" },
      { label: address },
    ]);

    const currentPage = screen.getByLabelText(address);

    expect(currentPage).toHaveTextContent(
      `${address.slice(0, 8)}...${address.slice(-4)}`,
    );
    expect(currentPage).toHaveAttribute("title", address);
    expect(currentPage).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: /GATDOSCZ/ })).toBeNull();
  });

  it("has no automated accessibility violations", async () => {
    const { container } = renderBreadcrumb([
      { label: "Home", to: "/" },
      { label: "Treasury", to: "/treasury" },
      { label: "Current page" },
    ]);

    const results = await axe(container);

    expect(results.violations).toEqual([]);
  });
});
