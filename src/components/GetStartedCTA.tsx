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
    backgroundColor: "#FFFFFF",
    border: "0.69px solid #E5E7EB",
    borderRadius: "24px",
    padding: "48px 32px",
    textAlign: "center", 
    boxShadow: "#1018281A",
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
    background: "linear-gradient(90deg, #00B8D4 0%, #0097A7 100%)",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 10px 12px #00B8D466",
    position: "relative",
    zIndex: 1,
  },
  sparkle: {
    width: "32px",
    height: "32px",
    color: "#FFFFFF",
  },
  headline: {
    fontSize: "44px",
    font: "Plus Jakarta Sans",
    fontWeight: 700,
    color: "#101828",
    margin: "0 0 16px 0",
  },
  description: {
    fontSize: "18px",
    color: "#4A5565",
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
    background: "linear-gradient(90deg, #00B8D4 0%, #0097A7 100%)",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "6px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0px 10px 12px #00B8D466",
    transition: "all 0.2s ease",
  },
  primaryButtonHover: {
    filter: "brightness(1.05)",
    transform: "translateY(-1px)",
    boxShadow: "0px 10px 8px #00B8D466",
  },
  secondaryButton: {
    padding: "12px 24px",
    backgroundColor: "transparent",
    color: "#1A202C",
    border: "1px solid #D1D5DC",
    borderRadius: "6px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  secondaryButtonHover: {
    backgroundColor: "#F7FAFC",
    borderColor: "#A0AEC0",
  },
  arrow: {
    fontSize: "18px",
    lineHeight: "1",
  },
};

export default GetStartedCTA;
