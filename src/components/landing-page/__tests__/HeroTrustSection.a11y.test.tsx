import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";
import HeroSection from "../HeroSection";
import TrustSection from "../TrustSection";

describe("landing page hero and trust accessibility", () => {
  it("exposes named section landmarks and a logical heading structure", () => {
    render(
      <>
        <HeroSection />
        <TrustSection />
      </>,
    );

    expect(
      screen.getByRole("region", { name: /treasury streaming/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: /trusted stellar treasury patterns/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /trusted stellar treasury patterns/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });

  it("has no axe violations for the landing sections", async () => {
    const { container } = render(
      <>
        <HeroSection />
        <TrustSection />
      </>,
    );

    const results = await axe(container);

    expect(results.violations).toEqual([]);
  });
});
