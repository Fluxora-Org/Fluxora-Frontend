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
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(alert).toHaveAttribute("aria-atomic", "true");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "newsletter-error");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects an empty email address before submission", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<NewsletterSection />);

    submitEmail("");

    const input = screen.getByLabelText("Email address");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Please enter a valid email address");
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(alert).toHaveAttribute("aria-atomic", "true");
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

      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("Please enter a valid email address");
      expect(alert).toHaveAttribute("aria-live", "assertive");
      expect(alert).toHaveAttribute("aria-atomic", "true");
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it("shows success and clears the email after a successful response", async () => {
    const fetchSpy = mockNewsletterResponse(201);
    render(<NewsletterSection />);

    submitEmail();

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Thanks for subscribing!");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-atomic", "true");

    const input = screen.getByLabelText("Email address");
    expect(input).toHaveValue("");
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input).toHaveAttribute("aria-describedby", "newsletter-success");

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

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("This email is already subscribed.");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-atomic", "true");
    expect(
      screen.queryByText("Thanks for subscribing!"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "We couldn't subscribe you right now. Please try again.",
      ),
    ).not.toBeInTheDocument();

    const input = screen.getByLabelText("Email address");
    expect(input).toHaveAttribute("aria-describedby", "newsletter-success");
  });

  it("shows a retry-later message for a rate-limited response", async () => {
    mockNewsletterResponse(429);
    render(<NewsletterSection />);

    submitEmail();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Too many attempts. Please try again later.",
    );
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(alert).toHaveAttribute("aria-atomic", "true");

    const input = screen.getByLabelText("Email address");
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input).toHaveAttribute("aria-describedby", "newsletter-error");
  });

  it("shows a generic failure message for other server responses", async () => {
    mockNewsletterResponse(500);
    render(<NewsletterSection />);

    submitEmail();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "We couldn't subscribe you right now. Please try again.",
    );
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(alert).toHaveAttribute("aria-atomic", "true");
    expect(
      screen.queryByText("Thanks for subscribing!"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("This email is already subscribed."),
    ).not.toBeInTheDocument();

    const input = screen.getByLabelText("Email address");
    expect(input).toHaveAttribute("aria-describedby", "newsletter-error");
  });

  it("shows failure message when network request throws an error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("Network connection error"),
    );
    render(<NewsletterSection />);

    submitEmail();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "We couldn't subscribe you right now. Please try again.",
    );
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(alert).toHaveAttribute("aria-atomic", "true");

    const input = screen.getByLabelText("Email address");
    expect(input).toHaveAttribute("aria-describedby", "newsletter-error");
  });

  it("disables the controls while submitting and prevents duplicate requests", async () => {
    let resolveResponse: (response: Response) => void = () => undefined;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );
    render(<NewsletterSection />);

    const input = screen.getByLabelText("Email address");
    fireEvent.change(input, {
      target: { value: "user@example.com" },
    });
    const button = screen.getByRole("button", { name: "Subscribe" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Subscribing...");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    resolveResponse({ ok: true, status: 200, statusText: "OK" } as Response);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Subscribe" }),
      ).not.toBeDisabled();
      expect(screen.getByLabelText("Email address")).not.toBeDisabled();
    });
  });

  it("submits valid, invalid and duplicate addresses and asserts each distinct outcome", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<NewsletterSection />);

    const input = screen.getByLabelText("Email address");
    const button = screen.getByRole("button", { name: "Subscribe" });

    // 1. Invalid address is rejected before submission
    fireEvent.change(input, { target: { value: "invalid-email" } });
    fireEvent.click(button);

    expect(fetchSpy).not.toHaveBeenCalled();
    const invalidAlert = screen.getByRole("alert");
    expect(invalidAlert).toHaveTextContent(
      "Please enter a valid email address",
    );
    expect(invalidAlert).toHaveAttribute("aria-live", "assertive");
    expect(invalidAlert).toHaveAttribute("aria-atomic", "true");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "newsletter-error");

    // 2. Valid address submission produces success outcome
    mockNewsletterResponse(200);
    fireEvent.change(input, { target: { value: "valid@example.com" } });
    fireEvent.click(button);

    const successStatus = await screen.findByRole("status");
    expect(successStatus).toHaveTextContent("Thanks for subscribing!");
    expect(successStatus).toHaveAttribute("aria-live", "polite");
    expect(successStatus).toHaveAttribute("aria-atomic", "true");
    expect(input).toHaveValue("");
    expect(input).toHaveAttribute("aria-describedby", "newsletter-success");

    // 3. Duplicate address submission produces distinct duplicate outcome
    mockNewsletterResponse(409);
    fireEvent.change(input, { target: { value: "duplicate@example.com" } });
    fireEvent.click(button);

    const duplicateStatus = await screen.findByRole("status");
    expect(duplicateStatus).toHaveTextContent(
      "This email is already subscribed.",
    );
    expect(duplicateStatus).toHaveAttribute("aria-live", "polite");
    expect(duplicateStatus).toHaveAttribute("aria-atomic", "true");
    expect(
      screen.queryByText("Thanks for subscribing!"),
    ).not.toBeInTheDocument();
    expect(input).toHaveAttribute("aria-describedby", "newsletter-success");
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
