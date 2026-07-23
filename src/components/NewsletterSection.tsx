import { FormEvent, useState } from "react";
import {
  subscribeNewsletter,
  type NewsletterResult,
} from "../lib/api/newsletterService";
import { ValidationMessage } from "./ValidationMessage";

const EMAIL_MAX_LENGTH = 254;
const LOCAL_PART_MAX_LENGTH = 64;
const LOCAL_PART_PATTERN =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const DOMAIN_LABEL_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
const TLD_PATTERN = /^[A-Za-z]{2,63}$/;

type Feedback = {
  inputInvalid?: boolean;
  message: string;
  type: "error" | "success";
} | null;

const FEEDBACK_BY_RESULT: Record<NewsletterResult, NonNullable<Feedback>> = {
  success: { message: "Thanks for subscribing!", type: "success" },
  "already-subscribed": {
    message: "This email is already subscribed.",
    type: "success",
  },
  "rate-limited": {
    message: "Too many attempts. Please try again later.",
    type: "error",
  },
};

export function validateNewsletterEmail(rawValue: string): boolean {
  const value = rawValue.trim();
  if (
    value !== rawValue ||
    value.length === 0 ||
    value.length > EMAIL_MAX_LENGTH
  ) {
    return false;
  }

  const parts = value.split("@");
  if (parts.length !== 2) return false;

  const [localPart, domain] = parts;
  if (
    !localPart ||
    localPart.length > LOCAL_PART_MAX_LENGTH ||
    !LOCAL_PART_PATTERN.test(localPart) ||
    !domain
  ) {
    return false;
  }

  const domainLabels = domain.split(".");
  if (
    domainLabels.length < 2 ||
    !TLD_PATTERN.test(domainLabels[domainLabels.length - 1])
  ) {
    return false;
  }

  return domainLabels.every((label) => DOMAIN_LABEL_PATTERN.test(label));
}

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState(false);

  const messageId = feedback
    ? feedback.type === "error"
      ? "newsletter-error"
      : "newsletter-success"
    : undefined;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (submitting) return;

    if (!validateNewsletterEmail(email)) {
      setFeedback({
        inputInvalid: true,
        message:
          "Please enter a valid email address without leading or trailing spaces.",
        type: "error",
      });
      return;
    }

    setFeedback(null);
    setSubmitting(true);

    try {
      const result = await subscribeNewsletter(email);
      setFeedback(FEEDBACK_BY_RESULT[result]);
      if (result === "success") {
        setEmail("");
      }
    } catch {
      setFeedback({
        message: "We couldn't subscribe you right now. Please try again.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <h2 style={styles.title}>
          Stay updated on Stellar ecosystem streaming
        </h2>

        <p style={styles.subtitle}>
          Get the latest updates on treasury streaming infrastructure and
          Stellar integration.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label htmlFor="newsletter-email" style={styles.srOnly}>
            Email address
          </label>

          <input
            id="newsletter-email"
            type="text"
            inputMode="email"
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFeedback(null);
            }}
            style={styles.input}
            aria-invalid={feedback?.inputInvalid === true}
            aria-describedby={messageId}
            maxLength={EMAIL_MAX_LENGTH}
          />

          <button
            type="submit"
            disabled={submitting}
            aria-disabled={submitting}
            style={{
              ...styles.button,
              opacity: submitting ? 0.8 : 1,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Subscribing..." : "Subscribe"}
          </button>
        </form>

        {feedback && (
          <div style={styles.feedback}>
            <ValidationMessage
              id={messageId!}
              message={feedback.message}
              type={feedback.type}
            />
          </div>
        )}
      </div>
    </section>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  section: {
    background: "#F9FAFB",
    padding: "80px 20px",
    textAlign: "center",
  },
  container: {
    maxWidth: "720px",
    margin: "0 auto",
  },
  title: {
    fontSize: "24px",
    fontWeight: 600,
    color: "#111827",
    marginBottom: "16px",
  },
  subtitle: {
    fontSize: "15px",
    color: "#6B7280",
    marginBottom: "32px",
  },
  form: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  input: {
    flex: 1,
    minWidth: "260px",
    maxWidth: "420px",
    padding: "12px 16px",
    fontSize: "14px",
    borderRadius: "6px",
    border: "1px solid #E5E7EB",
    outline: "none",
    background: "#FFFFFF",
  },
  button: {
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: 500,
    borderRadius: "6px",
    border: "none",
    color: "#FFFFFF",
    background: "linear-gradient(90deg, #38BDF8 0%, #06B6D4 100%)",
    boxShadow: "0 4px 12px rgba(6, 182, 212, 0.3)",
    transition: "all 0.2s ease",
  },
  feedback: {
    display: "flex",
    justifyContent: "center",
    marginTop: "12px",
  },
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    border: 0,
  },
};
