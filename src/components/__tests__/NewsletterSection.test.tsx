import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import NewsletterSection, {
  isValidNewsletterEmail,
  normalizeNewsletterEmail,
} from "../NewsletterSection";

describe("newsletter email helpers", () => {
  it("normalizes surrounding whitespace and casing", () => {
    expect(normalizeNewsletterEmail("  User@Example.COM  ")).toBe(
      "user@example.com",
    );
  });

  it("accepts ordinary valid email addresses", () => {
    expect(isValidNewsletterEmail("user@example.com")).toBe(true);
    expect(isValidNewsletterEmail("first.last+news@sub.example.co")).toBe(true);
  });

  it("rejects malformed addresses that the old loose pattern allowed", () => {
    expect(isValidNewsletterEmail("user@example..com")).toBe(false);
    expect(isValidNewsletterEmail(".user@example.com")).toBe(false);
    expect(isValidNewsletterEmail("user@-example.com")).toBe(false);
    expect(isValidNewsletterEmail("user@example")).toBe(false);
  });
});

describe("NewsletterSection", () => {
  it("shows an accessible validation error for invalid email", async () => {
    const user = userEvent.setup();
    render(<NewsletterSection />);

    await user.type(screen.getByLabelText("Email address"), "bad@example");
    await user.click(screen.getByRole("button", { name: "Subscribe" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please enter a valid email address.",
    );
    expect(screen.getByLabelText("Email address")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("prevents duplicate submits while the request is in flight", async () => {
    const user = userEvent.setup();
    render(<NewsletterSection />);

    const email = screen.getByLabelText("Email address");
    const button = screen.getByRole("button", { name: "Subscribe" });

    await user.type(email, "user@example.com");
    await user.dblClick(button);

    expect(button).toBeDisabled();
    expect(email).toBeDisabled();
    expect(button).toHaveTextContent("Subscribing...");

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Thanks for subscribing!",
      ),
    );
    expect(button).toBeEnabled();
    expect(email).toBeEnabled();
    expect(email).toHaveValue("");
  });

  it("clears stale success and error feedback when the email changes", async () => {
    const user = userEvent.setup();
    render(<NewsletterSection />);

    const email = screen.getByLabelText("Email address");

    await user.type(email, "user@example.com");
    await user.click(screen.getByRole("button", { name: "Subscribe" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Thanks for subscribing!",
    );

    await user.type(email, "next");

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
