import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuSparkles } from "react-icons/lu";

const GetStartedCTA: React.FC = () => {
  const navigate = useNavigate();
  const [isPrimaryHovered, setIsPrimaryHovered] = useState(false);
  const [isSecondaryHovered, setIsSecondaryHovered] = useState(false);

  return (
    <div style={styles.card}>
      {/* Icon */}
      <div style={styles.iconContainer}>
        <div style={styles.iconGlow} />
        <div style={styles.iconBox}>
          <LuSparkles style={styles.sparkle} />
        </div>
      </div>

      {/* Headline */}
      <h2 style={styles.headline}>Ready to start streaming?</h2>

      {/* Description */}
      <p style={styles.description}>
        Join DAOs and ecosystem funds building the future of continuous capital
        on Stellar. Launch your first stream in minutes.
      </p>

      {/* CTAs */}
      <div style={styles.buttonGroup}>
        <button
          style={{
            ...styles.primaryButton,
            ...(isPrimaryHovered ? styles.primaryButtonHover : {}),
          }}
          onMouseEnter={() => setIsPrimaryHovered(true)}
          onMouseLeave={() => setIsPrimaryHovered(false)}
          onClick={() => navigate("/dashboard")}
        >
          Launch dashboard
          <span style={styles.arrow}>→</span>
        </button>
        <button
          style={{
            ...styles.secondaryButton,
            ...(isSecondaryHovered ? styles.secondaryButtonHover : {}),
          }}
          onMouseEnter={() => setIsSecondaryHovered(true)}
          onMouseLeave={() => setIsSecondaryHovered(false)}
        >
          View documentation
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: "var(--color-bg-primary)",
    border: "0.69px solid var(--color-border-default)",
    borderRadius: "24px",
    padding: "48px 32px",
    textAlign: "center",
    boxShadow: "var(--shadow-lg)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxWidth: "896px",
    minHeight: "500px",
    margin: "0 auto",
  },
  iconContainer: {
    position: "relative",
    marginBottom: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBox: {
    width: "64px",
    height: "64px",
    background:
      "linear-gradient(90deg, var(--color-accent-primary) 0%, var(--color-accent-primary-dark) 100%)",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "var(--shadow-cta-primary)",
    position: "relative",
    zIndex: 1,
  },
  sparkle: {
    width: "32px",
    height: "32px",
    color: "var(--color-cta-primary-text)",
  },
  headline: {
    fontSize: "44px",
    font: "Plus Jakarta Sans",
    fontWeight: 700,
    color: "var(--color-text-primary)",
    margin: "0 0 16px 0",
  },
  description: {
    fontSize: "18px",
    color: "var(--color-text-secondary)",
    lineHeight: "25px",
    margin: "0 0 32px 0",
    maxWidth: "400px",
  },
  buttonGroup: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  primaryButton: {
    padding: "12px 24px",
    background:
      "linear-gradient(90deg, var(--color-accent-primary) 0%, var(--color-accent-primary-dark) 100%)",
    color: "var(--color-cta-primary-text)",
    border: "none",
    borderRadius: "6px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "var(--shadow-cta-primary)",
    transition: "all 0.2s ease",
  },
  primaryButtonHover: {
    filter: "brightness(1.05)",
    transform: "translateY(-1px)",
    boxShadow: "var(--shadow-cta-primary-hover)",
  },
  secondaryButton: {
    padding: "12px 24px",
    backgroundColor: "transparent",
    color: "var(--color-cta-secondary-text)",
    border: "1px solid var(--color-cta-secondary-border)",
    borderRadius: "6px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  secondaryButtonHover: {
    backgroundColor: "var(--color-surface-raised)",
    borderColor: "var(--color-border-secondary)",
  },
  arrow: {
    fontSize: "18px",
    lineHeight: "1",
  },
};

export default GetStartedCTA;
