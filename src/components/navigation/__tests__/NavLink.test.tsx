import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import NavLink from "../NavLink";

function renderNavLink(pathname: string, props: Partial<Parameters<typeof NavLink>[0]> = {}) {
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <NavLink to="/app/streams" label="Streams" {...props} />
    </MemoryRouter>,
  );

  return screen.getByRole("link", { name: props.label ?? "Streams" });
}

describe("NavLink", () => {
  it("marks exact route matches as current", () => {
    const link = renderNavLink("/app/streams");

    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("keeps nested detail routes active by path segment", () => {
    const link = renderNavLink("/app/streams/123");

    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("does not activate sibling routes that only share a prefix", () => {
    const link = renderNavLink("/app/stream");

    expect(link).not.toHaveAttribute("aria-current");
  });

  it("normalizes trailing slashes before matching", () => {
    const link = renderNavLink("/app/streams/", { to: "/app/streams/" });

    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("supports exact matching for index-style links", () => {
    const link = renderNavLink("/app/streams/123", { end: true });

    expect(link).not.toHaveAttribute("aria-current");
  });
});
