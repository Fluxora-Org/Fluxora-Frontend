interface TrustSectionProps {
  theme?: "light" | "dark";
}

const useCases = [
  {
    title: "DAO Treasury",
    subtitle: "Automate contributor payments",
  },
  {
    title: "Grant Program",
    subtitle: "Milestone-based fund distribution",
  },
  {
    title: "Ecosystem Fund",
    subtitle: "Continuous builder incentives",
  },
];

function CheckCircleIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="#0097a7"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M8 12.5l2.5 2.5 5.5-6"
        stroke="#0097a7"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="#0097a7"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21.02 7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export default function TrustSection({ theme = "light" }: TrustSectionProps) {
  const isDark = theme === "dark";

  return (
    <section
      className="w-full font-['Plus_Jakarta_Sans',system-ui,sans-serif]"
      style={{
        background: isDark ? "#0a0e17" : "#ffffff",
        paddingTop: "72px",
        paddingBottom: "80px",
      }}
    >
      <div className="mx-auto max-w-6xl px-6 flex flex-col items-center gap-6">
        <div
          className="flex items-center gap-2 rounded-full px-5 py-2"
          style={{
            background: isDark ? "rgba(0,184,212,0.08)" : "#e8f6fb",
            border: isDark
              ? "1px solid rgba(0,184,212,0.25)"
              : "1px solid #b3dff0",
          }}
        >
          <StarIcon />
          <span
            className="text-sm font-semibold"
            style={{ color: isDark ? "#e8ecf4" : "#1e293b" }}
          >
            Powered by Stellar
          </span>
        </div>

        <p
          className="text-center text-base leading-relaxed max-w-md"
          style={{ color: isDark ? "#94a3b8" : "#475569" }}
        >
          Built specifically for the Stellar ecosystem. Native integration with
          Soroban smart contracts and USDC.
        </p>

        <div className="mt-8 grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
          {useCases.map(({ title, subtitle }) => (
            <div
              key={title}
              className="flex flex-col items-center gap-4 rounded-2xl p-8"
              style={{
                background: isDark ? "#121a2a" : "#f7f8f9",
                border: isDark ? "1px solid #1e2d42" : "1px solid #e8edf2",
              }}
            >
              <div
                className="flex items-center justify-center rounded-xl"
                style={{
                  width: 48,
                  height: 48,
                  background: isDark ? "rgba(0,151,167,0.15)" : "#e0f5f8",
                }}
              >
                <CheckCircleIcon />
              </div>

              <p
                className="text-base font-bold text-center"
                style={{ color: isDark ? "#e8ecf4" : "#1e293b" }}
              >
                {title}
              </p>

              <p
                className="text-sm text-center"
                style={{ color: isDark ? "#6b7a94" : "#94a3b8" }}
              >
                {subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
