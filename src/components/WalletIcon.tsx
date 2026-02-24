export default function WalletIcon() {
  return (
    <div
      style={{
        width: "clamp(52px, 15vw, 60px)",
        height: "clamp(52px, 15vw, 60px)",
        borderRadius: 14,
        background: "#0d2035",
        border: "1px solid rgba(34,211,238,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "clamp(16px, 5vw, 22px)",
      }}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: "clamp(24px, 7vw, 28px)", height: "clamp(24px, 7vw, 28px)" }}
      >
        <rect x="2" y="5" width="20" height="15" rx="3" />
        <path d="M2 10h20" />
        <rect x="5" y="13" width="5" height="3" rx="1" />
      </svg>
    </div>
  );
}
