import { FormEvent, useState } from "react";

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setSubmitting(true);

    // 🔹 Replace with real newsletter endpoint later
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSubmitting(false);
    setSuccess(true);
    setEmail("");
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
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            aria-invalid={!!error}
          />

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...styles.button,
              opacity: submitting ? 0.8 : 1,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Subscribing..." : "Subscribe"}
          </button>
        </form>

        {error && <p style={styles.error}>{error}</p>}
        {success && (
          <p style={styles.success}>Thanks for subscribing!</p>
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
  error: {
    marginTop: "12px",
    color: "#DC2626",
    fontSize: "14px",
  },
  success: {
    marginTop: "12px",
    color: "#16A34A",
    fontSize: "14px",
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