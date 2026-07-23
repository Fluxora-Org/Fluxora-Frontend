import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Input from "../Input";

describe("Input Validation ARIA attributes", () => {
  it("updates aria-invalid and aria-describedby when error is shown and cleared", () => {
    const { rerender } = render(
      <Input id="test-input" label="Test Input" />,
    );

    const input = screen.getByLabelText("Test Input");

    // Initial state: no error, no helper. `aria-describedby` is omitted from
    // the rendered DOM when undefined, so getAttribute returns null — assert
    // null (the DOM contract), not undefined (the JS-level contract).
    expect(input.getAttribute("aria-invalid")).toBe("false");
    expect(input.getAttribute("aria-describedby")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();

    // Show error
    rerender(
      <Input id="test-input" label="Test Input" error="This field is required" />,
    );

    // Error state
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();

    const alert = screen.getByRole("alert");
    expect(alert).not.toBeNull();
    expect(alert.getAttribute("id")).toBe(describedBy);
    expect(alert.textContent).toBe("This field is required");

    // Clear error
    rerender(<Input id="test-input" label="Test Input" />);

    // Cleared state
    expect(input.getAttribute("aria-invalid")).toBe("false");
    expect(input.getAttribute("aria-describedby")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("maintains helperText association when error is toggled", () => {
    const { rerender } = render(
      <Input id="test-input" label="Test Input" helperText="Helper text here" />,
    );

    const input = screen.getByLabelText("Test Input");

    // Initial state: hint only.
    expect(input.getAttribute("aria-invalid")).toBe("false");
    const hintDescribedBy = input.getAttribute("aria-describedby");
    expect(hintDescribedBy).toBeTruthy();

    // Show error
    rerender(
      <Input
        id="test-input"
        label="Test Input"
        helperText="Helper text here"
        error="Now has error"
      />,
    );

    // Error state: aria-describedby must collapse to just the error id because
    // the helper <span> is no longer rendered when there's an error — see
    // src/components/Input.tsx.
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const errorDescribedBy = input.getAttribute("aria-describedby");
    expect(errorDescribedBy).toBeTruthy();
    expect(errorDescribedBy).not.toBe(hintDescribedBy);

    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("id")).toBe(errorDescribedBy);

    // Clear error
    rerender(
      <Input id="test-input" label="Test Input" helperText="Helper text here" />,
    );

    // Back to hint only
    expect(input.getAttribute("aria-invalid")).toBe("false");
    expect(input.getAttribute("aria-describedby")).toBe(hintDescribedBy);
  });
});
