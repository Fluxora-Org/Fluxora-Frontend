import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import NewsletterSection, {
  validateNewsletterEmail,
} from "../NewsletterSection";

function mockNewsletterResponse(status: number) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 500 ? "Internal Server Error" : "",
  } as Response);
}

function submitEmail(email = "user@example.com") {
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: email },
  });
  fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));
}

describe("validateNewsletterEmail", () => {
  it("accepts common well-formed addresses", () => {
    expect(validateNewsletterEmail("user@example.com")).toBe(true);
    expect(
      validateNewsletterEmail("treasury.streams+alerts@sub.example.co"),
    ).toBe(true);
  });

  it("rejects whitespace, malformed local parts, domains, and TLDs", () => {
    expect(validateNewsletterEmail(" user@example.com")).toBe(false);
    expect(validateNewsletterEmail("user@example.com ")).toBe(false);
    expect(validateNewsletterEmail(".user@example.com")).toBe(false);
    expect(validateNewsletterEmail("user.@example.com")).toBe(false);
    expect(validateNewsletterEmail("user..name@example.com")).toBe(false);
    expect(validateNewsletterEmail("user name@example.com")).toBe(false);
    expect(validateNewsletterEmail("user@@example.com")).toBe(false);
    expect(validateNewsletterEmail("user@example")).toBe(false);
    expect(validateNewsletterEmail("user@example.c")).toBe(false);
    expect(validateNewsletterEmail("user@-example.com")).toBe(false);
    expect(validateNewsletterEmail(`${"a".repeat(65)}@example.com`)).toBe(
      false,
    );
    expect(validateNewsletterEmail(`${"a".repeat(245)}@example.com`)).toBe(
      false,
    );
  });
});

describe("NewsletterSection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("catches malformed email before requesting the signup endpoint", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<NewsletterSection />);

    submitEmail(" invalid@example.com ");

    const input = screen.getByLabelText("Email address");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Please enter a valid email address");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "newsletter-error");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ".user@example.com",
    "user..name@example.com",
    "user name@example.com",
  ])(
    "does not request the signup endpoint for malformed local part %s",
    (email) => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      render(<NewsletterSection />);

      submitEmail(email);

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Please enter a valid email address",
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it("shows success and clears the email after a successful response", async () => {
    const fetchSpy = mockNewsletterResponse(201);
    render(<NewsletterSection />);

    submitEmail();

    expect(
      await screen.findByText("Thanks for subscribing!"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toHaveValue("");
    expect(fetchSpy).toHaveBeenCalledWith(
      "/newsletter/subscribe",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      }),
    );
  });

  it("shows a distinct already-subscribed message for a 409 response", async () => {
    mockNewsletterResponse(409);
    render(<NewsletterSection />);

    submitEmail();

    expect(
      await screen.findByText("This email is already subscribed."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Thanks for subscribing!"),
    ).not.toBeInTheDocument();
  });

  it("shows a retry-later message for a rate-limited response", async () => {
    mockNewsletterResponse(429);
    render(<NewsletterSection />);

    submitEmail();

    expect(
      await screen.findByText("Too many attempts. Please try again later."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });

  it("shows a generic failure message for other server responses", async () => {
    mockNewsletterResponse(500);
    render(<NewsletterSection />);

    submitEmail();

    expect(
      await screen.findByText(
        "We couldn't subscribe you right now. Please try again.",
      ),
    ).toBeInTheDocument();
  });

  it("disables the button while submitting and prevents duplicate requests", async () => {
    let resolveResponse: (response: Response) => void = () => undefined;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );
    render(<NewsletterSection />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "user@example.com" },
    });
    const button = screen.getByRole("button", { name: "Subscribe" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Subscribing...");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    resolveResponse({ ok: true, status: 200, statusText: "OK" } as Response);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Subscribe" }),
      ).not.toBeDisabled();
    });
  });

  it("clears stale messages when the email field changes", () => {
    render(<NewsletterSection />);

    const input = screen.getByLabelText("Email address");
    fireEvent.change(input, { target: { value: "bad" } });
    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "user@example.com" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
