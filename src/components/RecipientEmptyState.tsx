import React from "react";

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    minHeight: "100vh",
    backgroundColor: "#0B0F19",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  container: {
    textAlign: "center",
    maxWidth: "520px",
    width: "100%",
  },
  iconBox: {
    width: "72px",
    height: "72px",
    margin: "0 auto 24px auto",
  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.1) 100%)",
    borderRadius: "24px",
    border: "1px solid #FFFFFF1A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#FFFFFF",
    marginBottom: "16px",
  },
  description: {
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#99A1AF",
    marginBottom: "28px",
    maxWidth:"400px"
  },
  button: {
    display: "inline-flex",
    alignItems: "center",
    backgroundColor:"#FFFFFF0D",
    gap: "8px",
    padding: "10px 18px",
    borderRadius: "6px",
    border: "1px solid #FFFFFF33",
    color: "#FFFFFF",
    textDecoration: "none",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    
  },
};

export default function RecipientPortal() {
  // Replace this with real stream data from wallet
  const streams: any[] = [];

  const docsUrl = "https://docs.fluxora.xyz";

  if (streams.length === 0) {
    return (
      <div style={styles.wrapper} role="region" aria-label="Recipient empty state">
        <div style={styles.container}>
          {/* Icon */}
          <div style={styles.iconBox}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M43.9958 23.9976H31.9971L27.9975 29.9969H19.9983L15.9988 23.9976H4" stroke="#6A7282" stroke-width="3.99959" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M10.8993 10.2188L4 23.9974V35.9961C4 37.0569 4.42138 38.0742 5.17145 38.8243C5.92152 39.5743 6.93883 39.9957 7.99958 39.9957H39.9963C41.057 39.9957 42.0743 39.5743 42.8244 38.8243C43.5745 38.0742 43.9958 37.0569 43.9958 35.9961V23.9974L37.0966 10.2188C36.7654 9.55244 36.255 8.99166 35.6226 8.59952C34.9903 8.20738 34.261 7.99942 33.5169 7.99902H14.4789C13.7348 7.99942 13.0056 8.20738 12.3732 8.59952C11.7408 8.99166 11.2304 9.55244 10.8993 10.2188Z" stroke="#6A7282" stroke-width="3.99959" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

          </div>

          {/* Heading */}
          <h2 style={styles.title}>No active streams</h2>

          {/* Description */}
          <p style={styles.description}>
            When someone streams USDC to your wallet address, it will appear here.
            You'll be able to track incoming payments and withdraw accrued funds.
          </p>

          {/* Button */}
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.button}
            onMouseOver={(e) =>
              ((e.target as HTMLAnchorElement).style.backgroundColor = "#2C2C2C")
            }
            onMouseOut={(e) =>
              ((e.target as HTMLAnchorElement).style.backgroundColor = "transparent")
            }
          >
            Learn more
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#BDBDBD"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 3h7v7" />
              <path d="M10 14L21 3" />
              <path d="M21 14v7h-7" />
              <path d="M3 10v11h11" />
            </svg>
          </a>
        </div>
      </div>
    );
  }

  // Future: render stream list when available
  return <div>Streams will render here.</div>;
}