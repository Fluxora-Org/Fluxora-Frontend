import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "icon";
  size?: "small" | "large";
  loading?: boolean;
  children: React.ReactNode;
}

/**
 * Unified Button Component
 * Implements all button states from DESIGN_SPEC section 3.2.2
 *
 * Variants:
 * - primary: Cyan action button (default CTA)
 * - secondary: Border button (de-emphasized action)
 * - icon: Minimal icon button for toolbars/navbar
 *
 * States handled: default, hover, focus, active, disabled
 */
export default function Button({
  variant = "primary",
  size = "large",
  loading = false,
  disabled = false,
  style,
  className,
  children,
  ...props
}: ButtonProps) {
  const buttonStyle = getButtonStyle(variant, size, disabled, loading);

  return (
    <button
      style={{ ...buttonStyle, ...style }}
      disabled={disabled || loading}
      aria-busy={loading}
      className={className}
      {...props}
    >
      {loading ? (
        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              width: "14px",
              height: "14px",
              border: "2px solid currentColor",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.6s linear infinite",
            }}
          />
          Loading...
        </span>
      ) : (
        children
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        button:focus-visible {
          outline: 2px solid var(--accent, #00d4aa);
          outline-offset: 2px;
        }

        @media (prefers-reduced-motion: reduce) {
          button * {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </button>
  );
}

function getButtonStyle(
  variant: string,
  size: string,
  disabled: boolean,
  loading: boolean
): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: 600,
    borderRadius: "10px",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.2s ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    fontFamily: "inherit",
    position: "relative",
  };

  const sizeStyle: React.CSSProperties =
    size === "small"
      ? { padding: "8px 16px", minHeight: "36px" }
      : { padding: "12px 24px", minHeight: "44px" };

  // PRIMARY BUTTON (Cyan action)
  if (variant === "primary") {
    return {
      ...baseStyle,
      ...sizeStyle,
      backgroundColor: disabled ? "rgba(0, 212, 170, 0.4)" : "var(--accent, #00d4aa)",
      color: "#0a0e17",
      boxShadow: disabled ? "none" : "0 4px 12px rgba(0, 212, 170, 0.3)",
      opacity: disabled ? 0.6 : 1,
      ":hover:not(:disabled)": {
        backgroundColor: "#00a884",
        boxShadow: "0 4px 12px rgba(0, 212, 170, 0.5)",
        transform: "translateY(-2px)",
      },
      ":active:not(:disabled)": {
        transform: "translateY(0px)",
        boxShadow: "0 2px 6px rgba(0, 212, 170, 0.3)",
      },
    };
  }

  // SECONDARY BUTTON (Border, de-emphasized)
  if (variant === "secondary") {
    return {
      ...baseStyle,
      ...sizeStyle,
      backgroundColor: disabled
        ? "rgba(255,255,255,0.02)"
        : "transparent",
      color: "var(--text, #e8ecf4)",
      border: `1px solid var(--border, #1e2d42)`,
      opacity: disabled ? 0.5 : 1,
      ":hover:not(:disabled)": {
        backgroundColor: "rgba(255,255,255,0.06)",
        borderColor: "var(--accent, #00d4aa)",
      },
    };
  }

  // ICON BUTTON (Minimal, toolbar/navbar)
  if (variant === "icon") {
    return {
      ...baseStyle,
      width: "32px",
      height: "32px",
      padding: "0",
      backgroundColor: "transparent",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "var(--text, #e8ecf4)",
      minHeight: "auto",
      ":hover:not(:disabled)": {
        backgroundColor: "rgba(255,255,255,0.08)",
      },
    };
  }

  return baseStyle;
}
