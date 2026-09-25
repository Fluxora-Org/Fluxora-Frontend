/**
 * TrustSection — Landing page "Powered by Stellar" section
 *
 * Uses CSS variables from design-tokens.css so colors respond
 * to the active theme (light / dark) without inline hex values.
 */

interface TrustSectionProps {
  theme?: "light" | "dark";
}

export type TrustClaimKind =
  | "product-capability"
  | "ecosystem-status"
  | "integration-count"
  | "use-case";

interface TrustSource {
  name: string;
  url: string;
  kind: "repository" | "official-documentation";
  lastReviewed: string;
  referenceDate: string;
}

export interface TrustClaim {
  id: string;
  kind: TrustClaimKind;
  title: string;
  text: string;
  source: TrustSource;
}

const REVIEW_DATE = "2026-09-25";

export const REVIEW_CADENCE = {
  owner: "Fluxora frontend maintainers",
  lastReviewed: REVIEW_DATE,
  staleAfterDays: 90,
  intervalsByKind: {
    "product-capability": 90,
    "ecosystem-status": 30,
    "integration-count": 30,
    "use-case": 180,
  } satisfies Record<TrustClaimKind, number>,
  unsubstantiatedClaimPolicy: "remove" as const,
};

const STELLAR_SOURCE: TrustSource = {
  name: "Stellar developer documentation",
  url: "https://developers.stellar.org/",
  kind: "official-documentation",
  lastReviewed: REVIEW_DATE,
  referenceDate: REVIEW_DATE,
};

const REPOSITORY_SOURCE: TrustSource = {
  name: "Fluxora Frontend repository",
  url: "https://github.com/Fluxora-Org/Fluxora-Frontend",
  kind: "repository",
  lastReviewed: REVIEW_DATE,
  referenceDate: REVIEW_DATE,
};

export const TRUST_CLAIMS: TrustClaim[] = [
  {
    id: "trusted-stellar-patterns",
    kind: "product-capability",
    title: "Trusted Stellar treasury patterns",
    text: "Trusted Stellar treasury patterns",
    source: REPOSITORY_SOURCE,
  },
  {
    id: "stellar-ecosystem",
    kind: "product-capability",
    title: "Stellar ecosystem support",
    text: "Built for treasury workflows using Stellar network primitives.",
    source: STELLAR_SOURCE,
  },
  {
    id: "dao-treasury",
    kind: "use-case",
    title: "DAO Treasury",
    text: "Automate contributor payments",
    source: REPOSITORY_SOURCE,
  },
  {
    id: "grant-program",
    kind: "use-case",
    title: "Grant Program",
    text: "Milestone-based fund distribution",
    source: REPOSITORY_SOURCE,
  },
  {
    id: "ecosystem-fund",
    kind: "use-case",
    title: "Ecosystem Fund",
    text: "Continuous builder incentives",
    source: REPOSITORY_SOURCE,
  },
];

export function getCadenceForKind(kind: TrustClaimKind): number {
  return REVIEW_CADENCE.intervalsByKind[kind];
}

export function isClaimSubstantiated(claim: TrustClaim): boolean {
  return Boolean(
    claim.id &&
      claim.title &&
      claim.text &&
      claim.source.name &&
      /^https:\/\//.test(claim.source.url) &&
      claim.source.lastReviewed &&
      claim.source.referenceDate,
  );
}

const useCases = TRUST_CLAIMS.filter(({ kind }) => kind === "use-case");

function claimAttributes(claim: TrustClaim) {
  return {
    "data-claim-id": claim.id,
    "data-claim-kind": claim.kind,
    "data-claim-source": claim.source.name,
    "data-claim-source-url": claim.source.url,
    "data-claim-last-reviewed": claim.source.lastReviewed,
    "data-claim-reference-date": claim.source.referenceDate,
  };
}

function SourceLink({ source }: { source: TrustSource }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="text-xs underline"
    >
      Source: {source.name}
    </a>
  );
}

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

  const [headingClaim, descriptionClaim] = TRUST_CLAIMS;

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
      <div
        className="mx-auto max-w-6xl px-6 flex flex-col items-center gap-6"
        data-testid="trust-review-metadata"
        data-review-last-reviewed={REVIEW_CADENCE.lastReviewed}
        data-review-cadence-owner={REVIEW_CADENCE.owner}
        data-review-stale-after-days={REVIEW_CADENCE.staleAfterDays}
      >
        <span className="sr-only">
          Trust sources last reviewed {REVIEW_CADENCE.lastReviewed}.
        </span>
        {/* "Powered by Stellar" badge */}
        <div
          className="flex items-center gap-2 rounded-full px-5 py-2"
          data-testid="trust-badge"
          data-claim-id="powered-by-stellar"
          data-claim-kind="ecosystem-status"
          data-claim-source={STELLAR_SOURCE.name}
          data-claim-source-url={STELLAR_SOURCE.url}
          data-claim-last-reviewed={STELLAR_SOURCE.lastReviewed}
          data-claim-reference-date={STELLAR_SOURCE.referenceDate}
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
          <SourceLink source={STELLAR_SOURCE} />
        </div>

        <h2
          id="landing-trust-title"
          className="text-center text-3xl font-extrabold"
          data-testid="trust-claim"
          {...claimAttributes(headingClaim)}
          style={{ color: "var(--color-text-primary)" }}
        >
          Trusted Stellar treasury patterns <SourceLink source={headingClaim.source} />
        </h2>

        {/* Description */}
        <p
          className="text-center text-base leading-relaxed max-w-md"
          data-testid="trust-claim"
          {...claimAttributes(descriptionClaim)}
          style={{ color: "var(--color-text-tertiary)" }}
        >
          Built for treasury workflows using Stellar network primitives.
          <span className="mt-2 block">
            <SourceLink source={descriptionClaim.source} />
          </span>
        </p>

        {/* Use-case cards */}
        <div className="mt-8 grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
          {useCases.map((claim) => (
            <div
              key={claim.id}
              className="flex flex-col items-center gap-4 rounded-2xl p-8"
              data-testid="trust-use-case-card"
              {...claimAttributes(claim)}
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
                {claim.title}
              </h3>

              <p
                className="text-sm text-center"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {claim.text}
              </p>
              <SourceLink source={claim.source} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
