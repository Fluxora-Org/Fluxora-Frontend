import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";
import NavLink from "../NavLink";

function renderNavLink(props: Partial<React.ComponentProps<typeof NavLink>> = {}) {
  return render(
    <MemoryRouter initialEntries={["/app/streams"]}>
      <NavLink to="/app/streams" label="Streams" {...props} />
    </MemoryRouter>
  );
}

describe("NavLink active state", () => {
  it("marks active when pathname matches exactly", () => {
    render(
      <MemoryRouter initialEntries={["/app/streams"]}>
        <NavLink to="/app/streams" label="Streams" />
      </MemoryRouter>
    );
    const link = screen.getByRole("link", { name: "Streams" });
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("does not mark sibling route with shared prefix as active", () => {
    render(
      <MemoryRouter initialEntries={["/app/streams"]}>
        <>
          <NavLink to="/app/stream" label="Single Stream" />
          <NavLink to="/app/streams" label="All Streams" />
        </>
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: "All Streams" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(
      screen.getByRole("link", { name: "Single Stream" })
    ).not.toHaveAttribute("aria-current");
  });

  it("marks parent active for nested detail routes (prefix segment match)", () => {
    render(
      <MemoryRouter initialEntries={["/app/streams/abc-123"]}>
        <NavLink to="/app/streams" label="Streams" />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: "Streams" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("does not mark active for completely different route", () => {
    render(
      <MemoryRouter initialEntries={["/app/treasury"]}>
        <NavLink to="/app/streams" label="Streams" />
      </MemoryRouter>
    );
    expect(
      screen.getByRole("link", { name: "Streams" })
    ).not.toHaveAttribute("aria-current");
  });

  it("root path only activates on exact /", () => {
    render(
      <MemoryRouter initialEntries={["/app/streams"]}>
        <NavLink to="/" label="Home" />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("root path activates on exactly /", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <NavLink to="/" label="Home" />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("end prop prevents match on nested routes", () => {
    render(
      <MemoryRouter initialEntries={["/app/streams/abc-123"]}>
        <NavLink to="/app/streams" label="Streams" end />
      </MemoryRouter>
    );
    expect(
      screen.getByRole("link", { name: "Streams" })
    ).not.toHaveAttribute("aria-current");
  });

  it("end prop still matches on exact pathname", () => {
    render(
      <MemoryRouter initialEntries={["/app/streams"]}>
        <NavLink to="/app/streams" label="Streams" end />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: "Streams" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});

describe("NavLink prefix collision cases", () => {
  it.each([
    { current: "/a", to: "/ab", shouldBeActive: false },
    { current: "/ab", to: "/a", shouldBeActive: false },
    { current: "/a/b", to: "/a", shouldBeActive: true },
    { current: "/a/b/c", to: "/a/b", shouldBeActive: true },
    { current: "/a/b", to: "/a/b", shouldBeActive: true },
    { current: "/a", to: "/a", shouldBeActive: true },
  ])(
    "current=$current to=$to → active=$shouldBeActive",
    ({ current, to, shouldBeActive }) => {
      render(
        <MemoryRouter initialEntries={[current]}>
          <NavLink to={to} label="Link" />
        </MemoryRouter>
      );
      const link = screen.getByRole("link", { name: "Link" });
      if (shouldBeActive) {
        expect(link).toHaveAttribute("aria-current", "page");
      } else {
        expect(link).not.toHaveAttribute("aria-current");
      }
    }
  );
});

describe("NavLink with trailing slash", () => {
  it("matches when pathname has trailing slash and to does not", () => {
    render(
      <MemoryRouter initialEntries={["/app/streams/"]}>
        <NavLink to="/app/streams" label="Streams" />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: "Streams" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("matches when to has trailing slash and pathname does not", () => {
    render(
      <MemoryRouter initialEntries={["/app/streams"]}>
        <NavLink to="/app/streams/" label="Streams" />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: "Streams" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});

describe("NavLink disabled state", () => {
  it("applies disabled styles and aria-disabled", () => {
    renderNavLink({ disabled: true });
    const link = screen.getByRole("link", { name: "Streams" });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveStyle({ pointerEvents: "none" });
  });
});

describe("NavLink accessibility", () => {
  it("has no automated accessibility violations", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/app/streams"]}>
        <NavLink to="/app/streams" label="Streams" />
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("does not set aria-current when not active", () => {
    render(
      <MemoryRouter initialEntries={["/other"]}>
        <NavLink to="/app/streams" label="Streams" />
      </MemoryRouter>
    );
    expect(
      screen.getByRole("link", { name: "Streams" })
    ).not.toHaveAttribute("aria-current");
  });
});

describe("NavLink variant styling", () => {
  it("applies secondary class when variant is secondary", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/app/streams"]}>
        <NavLink to="/app/streams" label="Streams" variant="secondary" />
      </MemoryRouter>
    );
    const link = container.firstChild as HTMLElement;
    expect(link.className).toMatch(/navItemSecondary/);
  });
});
