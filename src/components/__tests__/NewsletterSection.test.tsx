import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import NewsletterSection, { validateNewsletterEmail } from "../NewsletterSection";

describe("validateNewsletterEmail", () => {
  it("accepts common well-formed addresses", () => {
    expect(validateNewsletterEmail("user@example.com")).toBe(true);
    expect(validateNewsletterEmail("treasury.streams+alerts@sub.example.co")).toBe(true);
  });

  it("rejects whitespace, malformed domains, and invalid TLDs", () => {
    expect(validateNewsletterEmail(" user@example.com")).toBe(false);
    expect(validateNewsletterEmail("user@example.com ")).toBe(false);
    expect(validateNewsletterEmail("user@@example.com")).toBe(false);
    expect(validateNewsletterEmail("user@example")).toBe(false);
    expect(validateNewsletterEmail("user@example.c")).toBe(false);
    expect(validateNewsletterEmail("user@-example.com")).toBe(false);
    expect(validateNewsletterEmail(`${"a".repeat(65)}@example.com`)).toBe(false);
    expect(validateNewsletterEmail(`${"a".repeat(245)}@example.com`)).toBe(false);
  });
});

describe("NewsletterSection", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("associates validation errors with the input and announces them", () => {
    render(<NewsletterSection />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: " invalid@example.com " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));

    const input = screen.getByLabelText("Email address");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Please enter a valid email address");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "newsletter-error");
  });

  it("disables the button while submitting and prevents duplicate submits", async () => {
    vi.useFakeTimers();
    render(<NewsletterSection />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "user@example.com" },
    });

    const button = screen.getByRole("button", { name: "Subscribe" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Subscribing...");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(screen.getByText("Thanks for subscribing!")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByLabelText("Email address")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Subscribe" })).not.toBeDisabled();
  });

  it("clears stale messages when the email field changes", async () => {
    vi.useFakeTimers();
    render(<NewsletterSection />);

    const input = screen.getByLabelText("Email address");
    fireEvent.change(input, { target: { value: "bad" } });
    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "user@example.com" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByText("Thanks for subscribing!")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "next@example.com" } });
    expect(screen.queryByText("Thanks for subscribing!")).not.toBeInTheDocument();
  });
});
