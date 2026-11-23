import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { InputWithUnit } from "./InputWithUnit";
import { ValidationMessage } from "./ValidationMessage";

describe("InputWithUnit", () => {
  describe("validation message associations", () => {
    it.each([undefined, "Enter ↵"])(
      "exposes every active error and removes cleared messages (keyboard hint: %s)",
      (keyboardHint) => {
        function RateField({ errors }: { errors: string[] }) {
          return (
            <>
              <label htmlFor="rate">Daily rate</label>
              <InputWithUnit
                id="rate"
                unit="USDC / day"
                keyboardHint={keyboardHint}
                hasError={errors.length > 0}
                aria-describedby={
                  errors.map((_, index) => `rate-error-${index}`).join(" ") ||
                  undefined
                }
              />
              {errors.map((error, index) => (
                <ValidationMessage
                  key={index}
                  id={`rate-error-${index}`}
                  message={error}
                />
              ))}
            </>
          );
        }

        const { rerender } = render(<RateField errors={[]} />);
        const input = screen.getByRole("textbox", { name: "Daily rate" });
        const initialDescription = input.getAttribute("aria-describedby");
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();

        rerender(
          <RateField
            errors={[
              "Enter a positive daily rate.",
              "The rate exceeds the available deposit.",
            ]}
          />,
        );
        for (const alert of screen.getAllByRole("alert")) {
          expect(
            input.getAttribute("aria-describedby")?.split(/\s+/),
          ).toContain(alert.id);
          expect(alert).toHaveAttribute("aria-live", "assertive");
        }
        expect(input).toHaveAccessibleDescription(
          /Enter a positive daily rate\./,
        );
        expect(input).toHaveAccessibleDescription(
          /The rate exceeds the available deposit\./,
        );
        expect(input).toHaveAccessibleDescription(/USDC \/ day/);
        if (keyboardHint) {
          expect(input).toHaveAccessibleDescription(/Enter ↵/);
        }

        rerender(
          <RateField errors={["The rate exceeds the available deposit."]} />,
        );
        expect(screen.getAllByRole("alert")).toHaveLength(1);
        expect(input).toHaveAccessibleDescription(
          /The rate exceeds the available deposit\./,
        );
        expect(input).not.toHaveAccessibleDescription(
          /Enter a positive daily rate\./,
        );

        rerender(<RateField errors={[]} />);
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(document.getElementById("rate-error-0")).toBeNull();
        expect(document.getElementById("rate-error-1")).toBeNull();
        expect(input).toHaveAttribute("aria-describedby", initialDescription);
        expect(input).not.toHaveAttribute("aria-invalid");
        expect(input).not.toHaveAccessibleDescription(/deposit|positive/);
      },
    );
  });

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

  describe("description association", () => {
    it("preserves a caller-supplied aria-describedby alongside the unit id", () => {
      render(
        <InputWithUnit
          id="create-stream-accrual-rate"
          unit="USDC / day"
          aria-describedby="create-stream-accrual-rate-error"
        />,
      );
      const input = screen.getByRole("textbox");
      const describedBy = input.getAttribute("aria-describedby") ?? "";
      expect(describedBy.split(" ")).toContain(
        "create-stream-accrual-rate-error",
      );
      expect(describedBy.split(" ")).toContain("create-stream-accrual-rate-unit");
    });

    it("preserves a caller-supplied aria-describedby together with the keyboard hint", () => {
      render(
        <InputWithUnit
          id="create-stream-duration"
          unit="days"
          keyboardHint="Enter ↵"
          aria-describedby="create-stream-duration-hint"
        />,
      );
      const describedBy =
        screen.getByRole("textbox").getAttribute("aria-describedby") ?? "";
      expect(describedBy.split(" ")).toContain("create-stream-duration-hint");
      expect(describedBy.split(" ")).toContain("create-stream-duration-unit");
      expect(describedBy.split(" ")).toContain(
        "create-stream-duration-keyboard-hint",
      );
      // The component-owned references must resolve to real elements.
      expect(
        document.getElementById("create-stream-duration-unit"),
      ).not.toBeNull();
      expect(
        document.getElementById("create-stream-duration-keyboard-hint"),
      ).not.toBeNull();
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

    it("sets aria-invalid=\"true\" on the input when hasError is true", () => {
      render(<InputWithUnit id="rate" unit="USDC" hasError />);
      expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    });

    it("omits aria-invalid on the input when hasError is false", () => {
      render(<InputWithUnit id="rate" unit="USDC" hasError={false} />);
      expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-invalid");
    });

    it("omits aria-invalid on the input when hasError is unset", () => {
      render(<InputWithUnit id="rate" unit="USDC" />);
      expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-invalid");
    });

    it("takes precedence over a caller-supplied aria-invalid attribute", () => {
      // The component's hasError prop is the source of truth; it overrides any
      // aria-invalid conflated into ...inputProps.
      render(
        <InputWithUnit
          id="rate"
          unit="USDC"
          hasError
          aria-invalid="false"
        />,
      );
      expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("disabled state", () => {
    it("disables the input when disabled prop is set", () => {
      render(<InputWithUnit id="rate" unit="USDC" disabled />);
      expect(screen.getByRole("textbox")).toBeDisabled();
    });
  });
});
