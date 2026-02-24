import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import WalletButton from "./wallet-connect/Walletbutton";

interface NavbarProps {
  onThemeToggle?: () => void;
  theme?: "light" | "dark";
}

export default function Navbar({
  onThemeToggle,
  theme = "light",
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleThemeToggle = () => {
    onThemeToggle?.();
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav style={styles.navbar} role="navigation" aria-label="Main navigation">
        <div style={styles.logoContainer}>
          <Link
            to="/"
            style={styles.logoLink}
            aria-label="Fluxora home"
            onClick={closeMobileMenu}
          >
            <div style={styles.logoBrand}>
              <svg
                width="40"
                height="40"
                viewBox="0 0 46 46"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ marginTop: "10px" }}
              >
                <defs>
                  <filter
                    id="filter0_dd_0_388"
                    x="0"
                    y="0"
                    width="45.9936"
                    height="45.9936"
                    filterUnits="userSpaceOnUse"
                    colorInterpolationFilters="sRGB"
                  >
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix
                      in="SourceAlpha"
                      type="matrix"
                      values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                      result="hardAlpha"
                    />
                    <feMorphology
                      radius="2"
                      operator="erode"
                      in="SourceAlpha"
                      result="effect1_dropShadow_0_388"
                    />
                    <feOffset dy="2" />
                    <feGaussianBlur stdDeviation="2" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix
                      type="matrix"
                      values="0 0 0 0 0 0 0 0 0 0.721569 0 0 0 0 0.831373 0 0 0 0.2 0"
                    />
                    <feBlend
                      mode="normal"
                      in2="BackgroundImageFix"
                      result="effect1_dropShadow_0_388"
                    />
                    <feColorMatrix
                      in="SourceAlpha"
                      type="matrix"
                      values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                      result="hardAlpha"
                    />
                    <feMorphology
                      radius="1"
                      operator="erode"
                      in="SourceAlpha"
                      result="effect2_dropShadow_0_388"
                    />
                    <feOffset dy="4" />
                    <feGaussianBlur stdDeviation="3" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix
                      type="matrix"
                      values="0 0 0 0 0 0 0 0 0 0.721569 0 0 0 0 0.831373 0 0 0 0.2 0"
                    />
                    <feBlend
                      mode="normal"
                      in2="effect1_dropShadow_0_388"
                      result="effect2_dropShadow_0_388"
                    />
                    <feBlend
                      mode="normal"
                      in="SourceGraphic"
                      in2="effect2_dropShadow_0_388"
                      result="shape"
                    />
                  </filter>
                  <linearGradient
                    id="paint0_linear_0_388"
                    x1="22.9968"
                    y1="1"
                    x2="22.9968"
                    y2="36.9936"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#00B8D4" />
                    <stop offset="1" stopColor="#0097A7" />
                  </linearGradient>
                  <clipPath id="clip0_0_388">
                    <rect
                      width="19.9952"
                      height="19.9952"
                      fill="white"
                      transform="translate(12.9938 8.99917)"
                    />
                  </clipPath>
                </defs>
                <g filter="url(#filter0_dd_0_388)">
                  <path
                    d="M5 9.00001C5 4.58173 8.58172 1 13 1H32.9936C37.4119 1 40.9936 4.58172 40.9936 9V28.9936C40.9936 33.4119 37.4119 36.9936 32.9936 36.9936H13C8.58173 36.9936 5 33.4119 5 28.9936V9.00001Z"
                    fill="url(#paint0_linear_0_388)"
                    shapeRendering="crispEdges"
                  />
                  <g clipPath="url(#clip0_0_388)">
                    <path
                      d="M14.6601 13.998C15.16 14.4145 15.6598 14.8311 16.7429 14.8311C18.8258 14.8311 18.8258 13.1648 20.9086 13.1648C23.0748 13.1648 22.9081 14.8311 25.0743 14.8311C27.1571 14.8311 27.1571 13.1648 29.24 13.1648C30.323 13.1648 30.8229 13.5814 31.3228 13.998"
                      stroke="white"
                      strokeWidth="2.08284"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14.6601 18.9968C15.16 19.4134 15.6598 19.8299 16.7429 19.8299C18.8258 19.8299 18.8258 18.1637 20.9086 18.1637C23.0748 18.1637 22.9081 19.8299 25.0743 19.8299C27.1571 19.8299 27.1571 18.1637 29.24 18.1637C30.323 18.1637 30.8229 18.5802 31.3228 18.9968"
                      stroke="white"
                      strokeWidth="2.08284"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14.6601 23.9956C15.16 24.4122 15.6598 24.8287 16.7429 24.8287C18.8258 24.8287 18.8258 23.1625 20.9086 23.1625C23.0748 23.1625 22.9081 24.8287 25.0743 24.8287C27.1571 24.8287 27.1571 23.1625 29.24 23.1625C30.323 23.1625 30.8229 23.579 31.3228 23.9956"
                      stroke="white"
                      strokeWidth="2.08284"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                </g>
              </svg>
              <span style={styles.logoText}>Fluxora</span>
            </div>
          </Link>
        </div>

        <button
          style={{
            ...styles.hamburger,
            display: isMobile ? "flex" : "none",
          }}
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          <span
            style={{
              ...styles.hamburgerLine,
              transform: mobileMenuOpen
                ? "rotate(45deg) translate(2px, 2px)"
                : "rotate(0deg) translate(0, 0)",
            }}
          ></span>
          <span
            style={{
              ...styles.hamburgerLine,
              opacity: mobileMenuOpen ? 0 : 1,
            }}
          ></span>
          <span
            style={{
              ...styles.hamburgerLine,
              transform: mobileMenuOpen
                ? "rotate(-45deg) translate(10px, -10px)"
                : "rotate(0deg) translate(0, 0)",
            }}
          ></span>
        </button>

        <div
          style={{
            ...styles.navLinksContainer,
            ...(mobileMenuOpen && isMobile
              ? styles.navLinksContainerOpen
              : isMobile
                ? { display: "none" }
                : {}),
          }}
        >
          <Link to="/" style={styles.navLink} onClick={closeMobileMenu}>
            Product
          </Link>
          <a
            href="#documentation"
            style={styles.navLink}
            onClick={closeMobileMenu}
          >
            Documentation
          </a>
          <a href="#pricing" style={styles.navLink} onClick={closeMobileMenu}>
            Pricing
          </a>

          {mobileMenuOpen && isMobile && (
            <div style={styles.mobileMenuActions}>
              <button
                style={styles.themeToggle}
                onClick={handleThemeToggle}
                aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
                title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              >
                {theme === "light" ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="5"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <line
                      x1="12"
                      y1="1"
                      x2="12"
                      y2="3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="12"
                      y1="21"
                      x2="12"
                      y2="23"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="4.22"
                      y1="4.22"
                      x2="5.64"
                      y2="5.64"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="18.36"
                      y1="18.36"
                      x2="19.78"
                      y2="19.78"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="1"
                      y1="12"
                      x2="3"
                      y2="12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="21"
                      y1="12"
                      x2="23"
                      y2="12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="4.22"
                      y1="19.78"
                      x2="5.64"
                      y2="18.36"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="18.36"
                      y1="5.64"
                      x2="19.78"
                      y2="4.22"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>

              <WalletButton />
            </div>
          )}
        </div>

        <div style={styles.rightContainer}>
          <button
            style={styles.themeToggle}
            onClick={handleThemeToggle}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="5"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <line
                  x1="12"
                  y1="1"
                  x2="12"
                  y2="3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="12"
                  y1="21"
                  x2="12"
                  y2="23"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="4.22"
                  y1="4.22"
                  x2="5.64"
                  y2="5.64"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="18.36"
                  y1="18.36"
                  x2="19.78"
                  y2="19.78"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="1"
                  y1="12"
                  x2="3"
                  y2="12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="21"
                  y1="12"
                  x2="23"
                  y2="12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="4.22"
                  y1="19.78"
                  x2="5.64"
                  y2="18.36"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="18.36"
                  y1="5.64"
                  x2="19.78"
                  y2="4.22"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>

          <WalletButton />
        </div>
      </nav>

      {mobileMenuOpen && isMobile && (
        <div style={styles.mobileMenuBackdrop} onClick={closeMobileMenu} />
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  navbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 1.5rem",
    height: "72px",
    background: "var(--navbar-bg)",
    position: "sticky",
    top: 0,
    zIndex: 1000,
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flexShrink: 0,
    zIndex: 10,
  },
  logoLink: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    textDecoration: "none",
    color: "inherit",
    outline: "none",
  },
  logoBrand: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    height: "52px",
  },
  logoIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "52px",
    height: "52px",
    flexShrink: 0,
    lineHeight: 1,
  },
  logoText: {
    fontSize: "1.25rem",
    fontWeight: 700,
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    color: "var(--navbar-logo-color)",
    letterSpacing: "-0.5px",
    lineHeight: 1.2,
    margin: 0,
    padding: 0,
    whiteSpace: "nowrap",
  },
  navLinksContainer: {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  } as React.CSSProperties & {
    "@media (max-width: 768px)"?: Record<string, string | number>;
  },
  navLinksContainerOpen: {
    position: "absolute",
    top: "72px",
    left: 0,
    right: 0,
    flexDirection: "column",
    gap: "0",
    background: "var(--navbar-bg)",
    borderBottom: "1px solid var(--navbar-border)",
    padding: "0",
    animation: "slideDown 0.3s ease-out",
    display: "flex",
    zIndex: 999,
  } as React.CSSProperties,
  mobileMenuActions: {
    display: "flex",
    gap: "1rem",
    padding: "1rem 1.5rem",
    borderTop: "1px solid var(--navbar-border)",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  } as React.CSSProperties,
  navLink: {
    color: "var(--navbar-link-color)",
    textDecoration: "none",
    fontSize: "0.95rem",
    fontWeight: 500,
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    padding: "0.75rem 1.5rem",
    position: "relative",
    cursor: "pointer",
    transition: "color 0.2s ease",
    outline: "none",
    minHeight: "44px",
    display: "flex",
    alignItems: "center",
  } as React.CSSProperties,
  rightContainer: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    flexShrink: 0,
  } as React.CSSProperties & {
    "@media (max-width: 768px)"?: Record<string, string | number>;
  },
  themeToggle: {
    background: "transparent",
    border: "1px solid var(--navbar-icon-border)",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    minWidth: "44px",
    minHeight: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "var(--navbar-icon-color)",
    transition: "all 0.2s ease",
    padding: 0,
    outline: "none",
  },
  connectWalletBtn: {
    background: "var(--cta-bg)",
    color: "white",
    border: "none",
    borderRadius: "24px",
    padding: "0.75rem 1.5rem",
    fontSize: "0.95rem",
    fontWeight: 600,
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "var(--cta-shadow)",
    outline: "none",
    whiteSpace: "nowrap",
    minHeight: "44px",
  },
  hamburger: {
    flexDirection: "column",
    gap: "6px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    outline: "none",
    zIndex: 11,
    minHeight: "44px",
    minWidth: "44px",
    display: "flex",
    marginTop: "10px",
  } as React.CSSProperties,
  hamburgerLine: {
    width: "24px",
    height: "2px",
    background: "var(--navbar-icon-color)",
    borderRadius: "2px",
    transition: "all 0.3s ease",
  },
  mobileMenuBackdrop: {
    position: "fixed",
    top: "72px",
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    zIndex: 999,
  },
};

// Add keyframe animation via style tag
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    nav > div:nth-of-type(1) a {
      transition: transform 0.2s ease;
    }

    nav > div:nth-of-type(1) a:hover {
      transform: scale(1.05);
    }

    nav > div:nth-of-type(2) a,
    nav > div:nth-of-type(2) > div > a {
      transition: color 0.2s ease;
    }

    nav > div:nth-of-type(2) a:hover,
    nav > div:nth-of-type(2) > div > a:hover {
      opacity: 0.8;
    }
    
    @media (max-width: 768px) {
      nav {
        padding: 0 1rem;
      }
      
      nav a:focus {
        outline: 2px solid var(--accent);
        outline-offset: -4px;
      }
      
      /* Show hamburger on mobile */
      button[aria-label*="Toggle navigation"] {
        display: flex !important;
      }
      
      /* Keep logo visible on mobile */
      nav > div:nth-of-type(1) {
        display: flex !important;
      }
      
      /* Hide right container (theme toggle and connect wallet) on mobile - 3rd div is rightContainer */
      nav > div:nth-of-type(3) {
        display: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}
