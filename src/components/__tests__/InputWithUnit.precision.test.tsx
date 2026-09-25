import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { InputWithUnit } from "../InputWithUnit";
import { MAX_SUPPORTED_AMOUNT, formatAmountString, parseAmountString } from "../../lib/amountPrecision";

/**
 * A controlled wrapper that mirrors how the modal stores a unit-bearing amount:
 * the raw string from the input is kept in state and handed straight back to the
 * control on the next render.
 */
function ControlledAmountInput() {
  const [value, setValue] = useState("");
  return (
    <InputWithUnit
      id="rate"
      unit="USDC / day"
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}

describe("InputWithUnit precision", () => {
  it("re-renders a stored amount unchanged", () => {
    const value = "1234.56";
    const { rerender } = render(
      <InputWithUnit id="rate" unit="USDC / day" value={value} onChange={vi.fn()} />,
    );
    expect(screen.getByRole("textbox")).toHaveValue(value);

    rerender(<InputWithUnit id="rate" unit="USDC / day" value={value} onChange={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveValue(value);
  });

  it("stores and re-renders an entered amount without precision loss", async () => {
    const entered = "999999999999999.99";
    render(<ControlledAmountInput />);

    await userEvent.type(screen.getByRole("textbox"), entered);

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue(entered);

    // The presented value round-trips through the exact parser unchanged.
    const stored = parseAmountString(entered);
    expect(stored).toBe("999999999999999.99");
    expect(formatAmountString(stored, 2)).toBe(entered);
  });

  it("preserves leading and trailing zeros as typed", async () => {
    render(<ControlledAmountInput />);
    await userEvent.type(screen.getByRole("textbox"), "007.50");
    expect(screen.getByRole("textbox")).toHaveValue("007.50");
    // The numeric value is unchanged even though the presentation keeps zeros.
    expect(parseAmountString("007.50")).toBe("7.5");
  });

  it("round-trips the maximum supported amount through the control", () => {
    render(
      <InputWithUnit
        id="rate"
        unit="USDC / day"
        value={MAX_SUPPORTED_AMOUNT}
        onChange={vi.fn()}
      />,
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue(MAX_SUPPORTED_AMOUNT);
    expect(formatAmountString(parseAmountString(input.getAttribute("value") ?? ""), 2)).toBe(
      "999999999999999.00",
    );
  });

  it("never uses a native number input that would coerce the value through a float", () => {
    render(
      <InputWithUnit
        id="rate"
        unit="USDC / day"
        type="number"
        value="123456789012345.67"
        onChange={vi.fn()}
      />,
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("inputmode", "decimal");
    expect(input).toHaveValue("123456789012345.67");
  });
});
