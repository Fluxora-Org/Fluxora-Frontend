import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Breadcrumb from "../Breadcrumb";

const VALID_STELLAR =
  "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
const CHECKSUM_INVALID_STELLAR = `${VALID_STELLAR.slice(0, -1)}A`;

function renderBreadcrumb(label: string) {
  return render(
    <MemoryRouter>
      <Breadcrumb items={[{ label: "Streams", to: "/app/streams" }, { label }]} />
    </MemoryRouter>,
  );
}

describe("Breadcrumb Stellar address handling", () => {
  it("masks checksum-valid Stellar addresses and keeps the full title", () => {
    const { container } = renderBreadcrumb(VALID_STELLAR);

    const maskedText = `${VALID_STELLAR.slice(0, 8)}...${VALID_STELLAR.slice(-4)}`;

    // The masked text is inside TruncatedReveal's inner span; the title lives
    // on the parent breadcrumb span that wraps TruncatedReveal.
    const maskedSpan = container.querySelector(`span[title="${VALID_STELLAR}"]`);
    expect(maskedSpan).not.toBeNull();
    expect(maskedSpan).toContainHTML(maskedText);
  });

  it("does not treat checksum-invalid 56-character G strings as Stellar addresses", () => {
    renderBreadcrumb(CHECKSUM_INVALID_STELLAR);

    expect(screen.getByText(CHECKSUM_INVALID_STELLAR)).toBeInTheDocument();
    expect(
      screen.queryByText(
        `${CHECKSUM_INVALID_STELLAR.slice(0, 8)}...${CHECKSUM_INVALID_STELLAR.slice(-4)}`,
      ),
    ).not.toBeInTheDocument();
  });

  // ── sr-only reveal pattern (TruncatedReveal integration) ──────────────────

  it("always renders an sr-only span with the full address in the DOM", () => {
    const { container } = renderBreadcrumb(VALID_STELLAR);

    const srSpan = container.querySelector(".truncateReveal__srValue.srOnly");
    expect(srSpan).not.toBeNull();
    expect(srSpan).toHaveTextContent(VALID_STELLAR);
  });

  it("sr-only span is present before any hover or focus interaction", () => {
    const { container } = renderBreadcrumb(VALID_STELLAR);

    // No userEvent fired — assert purely on initial render.
    const srSpan = container.querySelector(".truncateReveal__srValue.srOnly");
    expect(srSpan).toHaveTextContent(VALID_STELLAR);
  });

  it("reveal chip is aria-hidden so screen readers do not read the address twice", () => {
    const { container } = renderBreadcrumb(VALID_STELLAR);

    const chip = container.querySelector(".truncateReveal__chip");
    expect(chip).toHaveAttribute("aria-hidden", "true");
  });

  it("reveal chip carries the full unmasked address", () => {
    const { container } = renderBreadcrumb(VALID_STELLAR);

    const chip = container.querySelector(".truncateReveal__chip");
    expect(chip).toHaveTextContent(VALID_STELLAR);
  });

  it("does not render reveal pattern for non-Stellar labels", () => {
    const { container } = renderBreadcrumb("Stream Details");

    // TruncatedReveal should not be used for plain text labels.
    expect(container.querySelector(".truncateReveal")).toBeNull();
  });

  it("does not render reveal pattern for checksum-invalid addresses", () => {
    const { container } = renderBreadcrumb(CHECKSUM_INVALID_STELLAR);

    expect(container.querySelector(".truncateReveal")).toBeNull();
  });
});
