import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import WalletIcon from "../WalletIcon";

describe("WalletIcon", () => {
  describe("decorative mode (no props)", () => {
    it("renders the generic wallet SVG", () => {
      const { container } = render(<WalletIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("is marked as aria-hidden", () => {
      const { container } = render(<WalletIcon />);
      const div = container.firstElementChild as HTMLElement;
      expect(div.getAttribute("aria-hidden")).toBe("true");
    });
  });

  describe("first-letter fallback (name only, no iconSrc)", () => {
    it("renders the first letter of the wallet name", () => {
      render(<WalletIcon name="Freighter" />);
      expect(screen.getByText("F")).toBeInTheDocument();
    });

    it("sets aria-label to the wallet name", () => {
      render(<WalletIcon name="Albedo" />);
      const el = screen.getByRole("img", { name: "Albedo" });
      expect(el).toBeInTheDocument();
    });

    it("uppercases the first letter", () => {
      render(<WalletIcon name="walletconnect" />);
      expect(screen.getByText("W")).toBeInTheDocument();
    });

    it("handles single-character names", () => {
      render(<WalletIcon name="X" />);
      expect(screen.getByText("X")).toBeInTheDocument();
    });
  });

  describe("image mode (name + iconSrc)", () => {
    it("renders an img with the correct src", () => {
      render(<WalletIcon name="Freighter" iconSrc="/assets/freighter.svg" />);
      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "/assets/freighter.svg");
      expect(img.tagName).toBe("IMG");
    });

    it("sets alt text to the wallet name", () => {
      render(<WalletIcon name="Freighter" iconSrc="/assets/freighter.svg" />);
      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("alt", "Freighter");
      expect(img.tagName).toBe("IMG");
    });

    it("wrapper does not duplicate role=img when img is visible", () => {
      const { container } = render(
        <WalletIcon name="Freighter" iconSrc="/assets/freighter.svg" />,
      );
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.getAttribute("role")).toBeNull();
      expect(wrapper.getAttribute("aria-label")).toBeNull();
    });
  });

  describe("image load error fallback", () => {
    function renderWithBrokenImg(name: string, iconSrc: string) {
      const view = render(<WalletIcon name={name} iconSrc={iconSrc} />);
      const img = screen.getByRole("img");
      fireEvent.error(img);
      return { ...view, img };
    }

    it("falls back to the first letter when img onError fires", () => {
      renderWithBrokenImg("Freighter", "/nonexistent/icon.svg");
      expect(screen.getByText("F")).toBeInTheDocument();
    });

    it("does not render the broken img after onError", () => {
      const { container } = render(
        <WalletIcon name="Albedo" iconSrc="/nonexistent/icon.svg" />,
      );
      const img = screen.getByRole("img");
      fireEvent.error(img);
      expect(container.querySelector("img")).not.toBeInTheDocument();
    });

    it("still conveys the wallet name via aria-label on fallback", () => {
      renderWithBrokenImg("WalletConnect", "/bad/path.svg");
      const el = screen.getByRole("img", { name: "WalletConnect" });
      expect(el).toBeInTheDocument();
    });

    it("redirects to text fallback even if onError fires multiple times", () => {
      const { container } = render(
        <WalletIcon name="Multi" iconSrc="/fail.svg" />,
      );
      const img = screen.getByRole("img");
      fireEvent.error(img);
      fireEvent.error(img);
      fireEvent.error(img);
      expect(screen.getByText("M")).toBeInTheDocument();
      expect(container.querySelector("img")).not.toBeInTheDocument();
    });
  });
});
