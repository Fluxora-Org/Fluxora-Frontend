/**
 * TrustSection — Landing page "Powered by Stellar" section
 *
 * Uses CSS variables from design-tokens.css so colors respond
 * to the active theme (light / dark) without inline hex values.
 */

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
        stroke="var(--color-accent-primary-dark)"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M8 12.5l2.5 2.5 5.5-6"
        stroke="var(--color-accent-primary-dark)"
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
      fill="var(--color-accent-primary-dark)"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21.02 7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export default function TrustSection({ theme = "light" }: TrustSectionProps) {
  // The data-theme attribute on <html> drives CSS variable values.
  // We keep the `theme` prop for any JS-driven conditional classes
  // but avoid inline hex colors — tokens handle the rest.
  void theme; // consumed by parent; CSS variables handle theming

  return (
    <section
      aria-labelledby="landing-trust-title"
      className="w-full font-['Plus_Jakarta_Sans',system-ui,sans-serif]"
      style={{
        background: "var(--color-bg-primary)",
        paddingTop: "72px",
        paddingBottom: "80px",
      }}
    >
      <div className="mx-auto max-w-6xl px-6 flex flex-col items-center gap-6">
        {/* "Powered by Stellar" badge */}
        <div
          className="flex items-center gap-2 rounded-full px-5 py-2"
          style={{
            background: "var(--color-info-bg)",
            border: "1px solid var(--border-interactive)",
          }}
        >
          <StarIcon />
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Powered by Stellar
          </span>
        </div>

        <h2
          id="landing-trust-title"
          className="text-center text-3xl font-extrabold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Trusted Stellar treasury patterns
        </h2>

        {/* Description */}
        <p
          className="text-center text-base leading-relaxed max-w-md"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          Built specifically for the Stellar ecosystem. Native integration with
          Soroban smart contracts and USDC.
        </p>

        {/* Use-case cards */}
        <div className="mt-8 grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
          {useCases.map(({ title, subtitle }) => (
            <div
              key={title}
              className="flex flex-col items-center gap-4 rounded-2xl p-8"
              style={{
                background: "var(--color-surface-default)",
                border: "1px solid var(--color-border-default)",
              }}
            >
              {/* Icon container */}
              <div
                className="flex items-center justify-center rounded-xl"
                style={{
                  width: 48,
                  height: 48,
                  background: "var(--color-info-bg)",
                }}
              >
                <CheckCircleIcon />
              </div>

              <h3
                className="text-base font-bold text-center"
                style={{ color: "var(--color-text-primary)" }}
              >
                {title}
              </h3>

              <p
                className="text-sm text-center"
                style={{ color: "var(--color-text-tertiary)" }}
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
