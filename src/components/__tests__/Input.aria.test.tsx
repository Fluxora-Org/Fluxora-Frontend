/**
 * Input — ARIA invalid state assertions
 * ─────────────────────────────────────────────────────────────────────────────
 * Covers the four acceptance criteria from issue #1724:
 *
 *   1. An invalid input sets aria-invalid="true".
 *   2. The describing error element is referenced by the input via aria-describedby.
 *   3. The state clears (aria-invalid="false", aria-describedby absent) when
 *      the value becomes valid (error prop removed).
 *   4. The assertions hold for dynamically rendered inputs (id generated or
 *      externally supplied).
 *
 * The tests are kept separate from the property-based Input.test.tsx to make
 * the CI output for this specific issue easy to trace.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Input from "../Input";

// ── AC1: invalid input sets aria-invalid="true" ───────────────────────────────

describe("Input ARIA — AC1: aria-invalid state", () => {
  it("sets aria-invalid=true when an error message is provided", () => {
    render(<Input id="ac1" label="Email" error="Enter a valid email" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("sets aria-invalid=false when no error is provided", () => {
    render(<Input id="ac1-valid" label="Email" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "false");
  });

  it("sets aria-invalid=true for a textarea variant with an error", () => {
    render(<Input id="ac1-ta" label="Message" type="textarea" error="Required" />);
    const textarea = screen.getByLabelText("Message");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
  });

  it("sets aria-invalid=true for a select variant with an error", () => {
    render(
      <Input
        id="ac1-sel"
        label="Country"
        type="select"
        error="Select a country"
        options={[{ value: "us", label: "United States" }]}
      />,
    );
    const select = screen.getByLabelText("Country");
    expect(select).toHaveAttribute("aria-invalid", "true");
  });
});

// ── AC2: the error element is referenced by aria-describedby ──────────────────

describe("Input ARIA — AC2: aria-describedby references the error element", () => {
  it("points aria-describedby at an element whose text matches the error", () => {
    render(
      <Input id="ac2" label="Password" error="Password is too short" />,
    );
    const input = screen.getByLabelText("Password");
    const describedBy = input.getAttribute("aria-describedby");

    expect(describedBy).toBeTruthy();

    // The referenced element must exist in the DOM.
    const errorEl = document.getElementById(describedBy!);
    expect(errorEl).not.toBeNull();
    expect(errorEl!.textContent).toContain("Password is too short");
  });

  it("the referenced error element has role=alert so it is announced immediately", () => {
    render(<Input id="ac2-alert" label="Name" error="Name is required" />);
    const input = screen.getByLabelText("Name");
    const describedBy = input.getAttribute("aria-describedby");
    const errorEl = document.getElementById(describedBy!);
    expect(errorEl).not.toBeNull();
    expect(errorEl!.getAttribute("role")).toBe("alert");
  });

  it("aria-describedby points at helper text element when no error is present", () => {
    render(
      <Input id="ac2-helper" label="Username" helperText="Letters and numbers only" />,
    );
    const input = screen.getByLabelText("Username");
    const describedBy = input.getAttribute("aria-describedby");

    expect(describedBy).toBeTruthy();
    const helperEl = document.getElementById(describedBy!);
    expect(helperEl).not.toBeNull();
    expect(helperEl!.textContent).toContain("Letters and numbers only");
  });

  it("aria-describedby references the error element (not helper) when both are provided", () => {
    render(
      <Input
        id="ac2-both"
        label="Code"
        helperText="Enter your invite code"
        error="Invalid code"
      />,
    );
    const input = screen.getByLabelText("Code");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();

    // Must reference an element containing the error text, not the helper.
    const referencedEl = document.getElementById(describedBy!);
    expect(referencedEl!.textContent).toContain("Invalid code");
    expect(referencedEl!.textContent).not.toContain("Enter your invite code");
  });
});

// ── AC3: state clears when the value becomes valid ────────────────────────────

describe("Input ARIA — AC3: state clears on valid transition", () => {
  it("clears aria-invalid and aria-describedby when the error prop is removed", () => {
    const { rerender } = render(
      <Input id="ac3" label="Card number" error="Invalid card number" />,
    );
    const input = screen.getByLabelText("Card number");

    // Invalid state
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toBeTruthy();

    // Transition to valid: remove error prop
    rerender(<Input id="ac3" label="Card number" />);

    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input.getAttribute("aria-describedby")).toBeNull();
  });

  it("removes the alert element from DOM when error is cleared", () => {
    const { rerender } = render(
      <Input id="ac3-alert" label="CVV" error="CVV is required" />,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(<Input id="ac3-alert" label="CVV" />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("re-adds aria-invalid=true and error association if error returns", () => {
    const { rerender } = render(
      <Input id="ac3-cycle" label="Phone" error="Required" />,
    );
    const input = screen.getByLabelText("Phone");

    // Cycle: invalid → valid → invalid
    rerender(<Input id="ac3-cycle" label="Phone" />);
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input.getAttribute("aria-describedby")).toBeNull();

    rerender(<Input id="ac3-cycle" label="Phone" error="Must be 10 digits" />);
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const errorEl = document.getElementById(describedBy!);
    expect(errorEl!.textContent).toContain("Must be 10 digits");
  });
});

// ── AC4: holds for dynamically rendered inputs ────────────────────────────────

describe("Input ARIA — AC4: dynamically rendered inputs", () => {
  it("associates label and error via generated id when no id prop is supplied", () => {
    // No explicit id — component uses React.useId() to generate one.
    render(<Input label="Search" error="Enter at least 3 characters" />);
    const input = screen.getByLabelText("Search");

    // The input must have a non-empty id.
    expect(input.getAttribute("id")).toBeTruthy();

    // aria-invalid must be set.
    expect(input).toHaveAttribute("aria-invalid", "true");

    // aria-describedby must reference a real element.
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const errorEl = document.getElementById(describedBy!);
    expect(errorEl).not.toBeNull();
    expect(errorEl!.textContent).toContain("Enter at least 3 characters");
  });

  it("maintains consistent aria associations when the error message changes", () => {
    const { rerender } = render(
      <Input label="Amount" error="Amount is required" />,
    );
    const input = screen.getByLabelText("Amount");
    const firstDescribedBy = input.getAttribute("aria-describedby");

    // Change error message (simulates live validation feedback).
    rerender(<Input label="Amount" error="Amount must be positive" />);

    // The aria-describedby id may be the same since the element is stable.
    // The error text must update.
    const errorEl = document.getElementById(
      input.getAttribute("aria-describedby")!,
    );
    expect(errorEl!.textContent).toContain("Amount must be positive");
    expect(firstDescribedBy).toBe(input.getAttribute("aria-describedby"));
  });

  it("independently tracks aria state for two simultaneously rendered Input instances", () => {
    render(
      <>
        <Input label="First name" error="Required" />
        <Input label="Last name" />
      </>,
    );

    const firstName = screen.getByLabelText("First name");
    const lastName = screen.getByLabelText("Last name");

    // Each input must have its own id (no collision).
    expect(firstName.getAttribute("id")).not.toBe(lastName.getAttribute("id"));

    // Only the invalid input should have aria-invalid=true.
    expect(firstName).toHaveAttribute("aria-invalid", "true");
    expect(lastName).toHaveAttribute("aria-invalid", "false");

    // Only the invalid input should have an aria-describedby.
    expect(firstName.getAttribute("aria-describedby")).toBeTruthy();
    expect(lastName.getAttribute("aria-describedby")).toBeNull();
  });
});
