import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Button, { type ButtonProps } from "../Button";
import styles from "../Button.module.css";

const variants: Array<NonNullable<ButtonProps["variant"]>> = [
  "primary",
  "secondary",
  "danger",
  "success",
  "ghost",
];

function variantClass(variant: NonNullable<ButtonProps["variant"]>) {
  return styles[
    `button${variant.charAt(0).toUpperCase()}${variant.slice(1)}` as keyof typeof styles
  ];
}

describe("Button", () => {
  it.each(variants)("renders the %s variant class", (variant) => {
    render(<Button variant={variant}>{variant}</Button>);

    expect(screen.getByRole("button", { name: variant })).toHaveClass(
      styles.button,
      variantClass(variant),
    );
  });

  it("defaults to a non-submitting button type", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("invokes the click handler when enabled", () => {
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Continue</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("suppresses clicks and exposes disabled state when disabled", () => {
    const onClick = vi.fn();

    render(
      <Button disabled onClick={onClick}>
        Disabled action
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Disabled action" });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("suppresses clicks and exposes busy state while loading", () => {
    const onClick = vi.fn();

    render(
      <Button loading loadingContent="Working" onClick={onClick}>
        Submit
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Working" });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("forwards accessibility attributes and caller class names", () => {
    render(
      <Button
        aria-describedby="button-help"
        aria-label="Refresh streams"
        className="custom-button"
      />,
    );

    const button = screen.getByRole("button", { name: "Refresh streams" });

    expect(button).toHaveAttribute("aria-describedby", "button-help");
    expect(button).toHaveClass(styles.button, "custom-button");
  });

  it("renders icon-only buttons with the supplied accessible name", () => {
    render(
      <Button
        aria-label="Close"
        icon={<svg data-testid="close-icon" />}
        iconOnly
      />,
    );

    expect(screen.getByRole("button", { name: "Close" })).toHaveClass(
      styles.buttonIconOnly,
    );
    expect(screen.getByTestId("close-icon")).toBeInTheDocument();
  });
});
