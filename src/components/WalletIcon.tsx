export default function WalletIcon() {
  return (
    <div
      style={{
        width: "48px",
        height: "48px",
        borderRadius: "12px",
        background: "#0d2035",
        border: "1px solid rgba(34,211,238,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: "24px", height: "24px" }}
      >
        <rect x="2" y="5" width="20" height="15" rx="3" />
        <path d="M2 10h20" />
        <rect x="5" y="13" width="5" height="3" rx="1" />
      </svg>
    </div>
  );
}