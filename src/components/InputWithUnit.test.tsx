import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { InputWithUnit } from "./InputWithUnit";

describe("InputWithUnit", () => {
  describe("unit label rendering", () => {
    it("renders the unit label text", () => {
      render(<InputWithUnit id="test" unit="USDC / day" />);
      expect(screen.getByText("USDC / day")).toBeInTheDocument();
    });

    it("renders unit badge with accessible aria-label", () => {
      render(<InputWithUnit id="test" unit="days" />);
      expect(screen.getByLabelText("Unit: days")).toBeInTheDocument();
    });

    it("associates input with unit via aria-describedby", () => {
      render(<InputWithUnit id="amount" unit="USDC" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-describedby", "amount-unit");
      const unit = document.getElementById("amount-unit");
      expect(unit).toBeInTheDocument();
    });
  });

  describe("value parsing", () => {
    it("accepts a numeric string value", () => {
      render(<InputWithUnit id="rate" unit="USDC" value="42.5" onChange={vi.fn()} />);
      expect(screen.getByRole("textbox")).toHaveValue("42.5");
    });

    it("accepts empty string", () => {
      render(<InputWithUnit id="rate" unit="USDC" value="" onChange={vi.fn()} />);
      expect(screen.getByRole("textbox")).toHaveValue("");
    });

    it("fires onChange with user input", async () => {
      const onChange = vi.fn();
      render(<InputWithUnit id="rate" unit="USDC" onChange={onChange} />);
      await userEvent.type(screen.getByRole("textbox"), "10");
      expect(onChange).toHaveBeenCalled();
    });

    it("respects placeholder prop", () => {
      render(<InputWithUnit id="rate" unit="USDC" placeholder="0.00" />);
      expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("applies error class when hasError is true", () => {
      const { container } = render(<InputWithUnit id="rate" unit="USDC" hasError />);
      expect(container.firstChild).toHaveClass("input-with-unit--error");
    });

    it("does not apply error class when hasError is false", () => {
      const { container } = render(<InputWithUnit id="rate" unit="USDC" hasError={false} />);
      expect(container.firstChild).not.toHaveClass("input-with-unit--error");
    });
  });

  describe("disabled state", () => {
    it("disables the input when disabled prop is set", () => {
      render(<InputWithUnit id="rate" unit="USDC" disabled />);
      expect(screen.getByRole("textbox")).toBeDisabled();
    });
  });
});
