import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import HeroSection from "../HeroSection";
import TrustSection from "../TrustSection";

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
}

describe("HeroSection and TrustSection responsive layout", () => {
  const viewports = [
    { name: "narrow mobile", width: 375 },
    { name: "wide desktop", width: 1440 },
  ] as const;

  for (const viewport of viewports) {
    it(`renders hero and trust content correctly at ${viewport.name}`, async () => {
      setViewportWidth(viewport.width);
      render(
        <>
          <HeroSection />
          <TrustSection />
        </>,
      );

      const heroHeading = screen.getByRole("heading", {
        level: 1,
        name: /the future of treasury streaming/i,
      });
      expect(heroHeading).toBeInTheDocument();

      const ctaButton = screen.getByRole("button", {
        name: /launch app/i,
      });
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton).not.toBeDisabled();
      expect(getComputedStyle(ctaButton).display).not.toBe("none");
      expect(getComputedStyle(ctaButton).visibility).not.toBe("hidden");

      // Confirm keyboard reachability for the primary CTA.
      ctaButton.focus();
      expect(document.activeElement).toBe(ctaButton);

      const trustHeading = screen.getByRole("heading", {
        level: 2,
        name: /trusted stellar treasury patterns/i,
      });
      expect(trustHeading).toBeInTheDocument();
      expect(screen.getByText(/dao treasury/i)).toBeInTheDocument();
      expect(screen.getByText(/grant program/i)).toBeInTheDocument();
      // Use a heading-scoped query here: HeroSection's copy ("...DAOs, grants,
      // and ecosystem funds.") also matches /ecosystem fund/i as plain text,
      // so a bare getByText ambiguously matches both it and the TrustSection
      // card title when both components are rendered together in this test.
      expect(
        screen.getByRole("heading", { level: 3, name: /ecosystem fund/i }),
      ).toBeInTheDocument();

      // jsdom does not provide true visual overlap detection for responsive layouts.
      // This regression test therefore asserts that key content is present,
      // the primary CTA is visible and focusable, and the section headings are intact.
      expect(heroHeading).toBeVisible();
      expect(trustHeading).toBeVisible();
      expect(ctaButton).toBeVisible();

      const user = userEvent.setup();
      await user.click(ctaButton);
      // The button is intentionally interactive. If jsdom navigation is prevented,
      // the click should still not throw and the CTA remains reachable.
      expect(ctaButton).toBeEnabled();
    });
  }
});
