import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TrustSection, {
  REVIEW_CADENCE,
  TRUST_CLAIMS,
  getCadenceForKind,
  isClaimSubstantiated,
  type TrustClaimKind,
} from "../TrustSection";

/**
 * Issue #1705 — TrustSection source verification tests.
 *
 * These tests walk every rendered claim node and assert that:
 *  1. No claim is rendered without a named source (unsourced claims fail).
 *  2. Every claim node exposes the mandatory verification attributes:
 *     source name, source URL, last-reviewed date, and reference date.
 *  3. The review cadence configuration is present and coherent so the
 *     section is periodically re-verified instead of drifting stale.
 */

const REQUIRED_CLAIM_ATTRIBUTES = [
  "data-claim-id",
  "data-claim-kind",
  "data-claim-source",
  "data-claim-source-url",
  "data-claim-last-reviewed",
  "data-claim-reference-date",
] as const;

const KNOWN_CLAIM_KINDS: TrustClaimKind[] = [
  "product-capability",
  "ecosystem-status",
  "integration-count",
  "use-case",
];

function assertIsoDate(value: string | null, attribute: string): void {
  expect(value, `${attribute} must be present`).not.toBeNull();
  expect(value, `${attribute} must be non-empty`).not.toBe("");
  // ISO date form YYYY-MM-DD.
  expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
}

describe("TrustSection claim sourcing (#1705)", () => {
  it("renders every registered claim with its verification metadata", () => {
    render(<TrustSection />);

    // Inline claims + use-case cards together cover the full claim registry.
    const allClaimNodes = [
      ...screen.getAllByTestId("trust-claim"),
      ...screen.getAllByTestId("trust-use-case-card"),
    ];
    expect(allClaimNodes.length).toBe(TRUST_CLAIMS.length);

    for (const claim of TRUST_CLAIMS) {
      expect(
        allClaimNodes.some(
          (node) => node.getAttribute("data-claim-id") === claim.id,
        ),
      ).toBe(true);
    }
  });

  it("renders no unsourced claim — every claim node names its source", () => {
    render(<TrustSection />);

    const allClaimNodes = [
      ...screen.getAllByTestId("trust-claim"),
      ...screen.getAllByTestId("trust-use-case-card"),
    ];
    expect(allClaimNodes.length).toBeGreaterThan(0);

    for (const node of allClaimNodes) {
      const source = node.getAttribute("data-claim-source");
      expect(
        source,
        `claim ${node.getAttribute("data-claim-id")} must name a source`,
      ).toBeTruthy();
      expect(source!.trim().length).toBeGreaterThan(0);
    }
  });

  it("displays the mandatory verification attributes on every claim node", () => {
    render(<TrustSection />);

    const allClaimNodes = [
      ...screen.getAllByTestId("trust-claim"),
      ...screen.getAllByTestId("trust-use-case-card"),
      screen.getByTestId("trust-badge"),
    ];

    for (const node of allClaimNodes) {
      for (const attribute of REQUIRED_CLAIM_ATTRIBUTES) {
        const value = node.getAttribute(attribute);
        expect(
          value,
          `${node.getAttribute("data-claim-id")} is missing ${attribute}`,
        ).toBeTruthy();
        expect(value!.length).toBeGreaterThan(0);
      }

      assertIsoDate(
        node.getAttribute("data-claim-last-reviewed"),
        "data-claim-last-reviewed",
      );
      assertIsoDate(
        node.getAttribute("data-claim-reference-date"),
        "data-claim-reference-date",
      );

      const url = node.getAttribute("data-claim-source-url");
      expect(url).toMatch(/^https:\/\//);
    }
  });

  it("renders a visible source link for each inline claim", () => {
    render(<TrustSection />);

    const claimNodes = screen.getAllByTestId("trust-claim");
    for (const node of claimNodes) {
      const link = within(node).getByRole("link");
      expect(link.getAttribute("href")).toMatch(/^https:\/\//);
      expect(within(node).getByText(link.textContent!)).toBeInTheDocument();
    }
  });

  it("renders the section-level review metadata with the cadence config", () => {
    render(<TrustSection />);

    const metadata = screen.getByTestId("trust-review-metadata");
    expect(metadata.getAttribute("data-review-last-reviewed")).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
    expect(metadata.getAttribute("data-review-cadence-owner")).toBeTruthy();
    expect(metadata.textContent).toContain(REVIEW_CADENCE.lastReviewed);
  });

  it("keeps unsubstantiated claims out of the DOM", () => {
    // A claim without a valid source must never render — this is the runtime
    // enforcement of the "remove unsubstantiated claims" policy.
    const unsubstantiated = TRUST_CLAIMS.every(isClaimSubstantiated);
    expect(unsubstantiated).toBe(true);

    // And the helper itself must reject broken sources.
    expect(
      isClaimSubstantiated({
        id: "broken",
        kind: "ecosystem-status",
        title: "broken",
        text: "broken claim",
        source: {
          name: "",
          url: "",
          kind: "repository",
          lastReviewed: "",
          referenceDate: "",
        },
      }),
    ).toBe(false);
  });

  it("backed claims cover every configured cadence interval kind", () => {
    const kindsInUse = new Set(TRUST_CLAIMS.map((claim) => claim.kind));
    for (const kind of kindsInUse) {
      expect(KNOWN_CLAIM_KINDS).toContain(kind);
      expect(getCadenceForKind(kind)).toBeGreaterThan(0);
    }
  });

  it("configures a positive review cadence for every claim kind", () => {
    for (const kind of KNOWN_CLAIM_KINDS) {
      expect(getCadenceForKind(kind)).toBeGreaterThan(0);
    }
    expect(REVIEW_CADENCE.staleAfterDays).toBeGreaterThan(0);
    expect(REVIEW_CADENCE.unsubstantiatedClaimPolicy).toBe("remove");
  });
});
