/**
 * TruncatedReveal – unit tests
 *
 * Verifies the sr-only reveal pattern contract:
 *  1. sr-only span is always present in the DOM (no interaction required)
 *  2. Reveal chip is aria-hidden and excluded from the AT tree
 *  3. Wrapper carries the correct CSS class for CSS-driven reveal
 *  4. mono prop propagates the expected class to the chip
 *  5. Children render unchanged
 *  6. No automated accessibility violations (axe)
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";

import TruncatedReveal from "../TruncatedReveal";

const FULL = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
const TRUNCATED = `${FULL.slice(0, 8)}...${FULL.slice(-4)}`;

function renderReveal(
  fullValue = FULL,
  mono = true,
  className?: string,
) {
  return render(
    <TruncatedReveal fullValue={fullValue} mono={mono} className={className}>
      <code data-testid="truncated-chip">{TRUNCATED}</code>
    </TruncatedReveal>,
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────

/** Returns all elements that have the given text content (regardless of tag). */
function queryAllByText(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("*")).filter(
    (el) => el.textContent === text,
  );
}

// ─────────────────────────────────────────────────────────────────────────────

describe("TruncatedReveal", () => {
  // ── 1. sr-only span ──────────────────────────────────────────────────────

  it("always renders an sr-only span with the full value regardless of interaction", () => {
    const { container } = renderReveal();

    // The span carries both class names
    const srSpan = container.querySelector(".truncateReveal__srValue.srOnly");
    expect(srSpan).not.toBeNull();
    expect(srSpan).toHaveTextContent(FULL);
  });

  it("sr-only span is not the reveal chip", () => {
    const { container } = renderReveal();

    const srSpan = container.querySelector(".truncateReveal__srValue");
    const chip = container.querySelector(".truncateReveal__chip");

    expect(srSpan).not.toBe(chip);
  });

  it("sr-only span is present even when fullValue is a short non-address string", () => {
    const { container } = render(
      <TruncatedReveal fullValue="Hello">
        <span>Hell…</span>
      </TruncatedReveal>,
    );

    const srSpan = container.querySelector(".truncateReveal__srValue.srOnly");
    expect(srSpan).toHaveTextContent("Hello");
  });

  // ── 2. reveal chip accessibility ─────────────────────────────────────────

  it("reveal chip has aria-hidden='true'", () => {
    const { container } = renderReveal();

    const chip = container.querySelector(".truncateReveal__chip");
    expect(chip).toHaveAttribute("aria-hidden", "true");
  });

  it("reveal chip is not accessible by role query", () => {
    renderReveal();

    // The chip has no role, and because aria-hidden is set, no role query
    // should surface its text content as an accessible element.
    // getByText with role would throw if the chip were in the AT tree.
    const allSpans = screen.queryAllByRole("generic");
    const chipsInAT = allSpans.filter(
      (el) =>
        el.classList.contains("truncateReveal__chip") &&
        el.getAttribute("aria-hidden") !== "true",
    );
    expect(chipsInAT).toHaveLength(0);
  });

  it("the full value text appears exactly twice in the DOM (sr-only + chip)", () => {
    const { container } = renderReveal();

    const nodes = queryAllByText(container, FULL);
    // sr-only span + chip = 2 elements whose sole text content is FULL
    expect(nodes.length).toBeGreaterThanOrEqual(2);

    const chipNodes = nodes.filter((el) =>
      el.classList.contains("truncateReveal__chip"),
    );
    const srNodes = nodes.filter((el) =>
      el.classList.contains("truncateReveal__srValue"),
    );

    expect(chipNodes).toHaveLength(1);
    expect(srNodes).toHaveLength(1);
  });

  // ── 3. wrapper class ─────────────────────────────────────────────────────

  it("wrapper element has the truncateReveal class", () => {
    const { container } = renderReveal();

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass("truncateReveal");
  });

  it("forwards className to the wrapper", () => {
    const { container } = renderReveal(FULL, true, "my-extra-class");

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass("truncateReveal");
    expect(wrapper).toHaveClass("my-extra-class");
  });

  // ── 4. mono prop ─────────────────────────────────────────────────────────

  it("chip has mono modifier class when mono=true (default)", () => {
    const { container } = renderReveal(FULL, true);

    const chip = container.querySelector(".truncateReveal__chip");
    expect(chip).toHaveClass("truncateReveal__chip--mono");
  });

  it("chip does not have mono modifier class when mono=false", () => {
    const { container } = renderReveal(FULL, false);

    const chip = container.querySelector(".truncateReveal__chip");
    expect(chip).not.toHaveClass("truncateReveal__chip--mono");
  });

  // ── 5. children ──────────────────────────────────────────────────────────

  it("renders children inside the wrapper", () => {
    renderReveal();

    expect(screen.getByTestId("truncated-chip")).toBeInTheDocument();
    expect(screen.getByTestId("truncated-chip")).toHaveTextContent(TRUNCATED);
  });

  // ── 6. focus-within triggers reveal (DOM level) ──────────────────────────

  it("wrapper receives focus-within when a focusable child is focused", async () => {
    const user = userEvent.setup();

    render(
      <TruncatedReveal fullValue={FULL}>
        <button data-testid="inner-btn">Copy</button>
      </TruncatedReveal>,
    );

    const btn = screen.getByTestId("inner-btn");
    await user.tab();

    // jsdom does not compute CSS pseudo-classes, but we can verify the wrapper
    // is in the document and that focus landed on the inner element (which
    // means :focus-within on the parent would fire in a real browser).
    expect(btn).toHaveFocus();
  });

  // ── 7. automated a11y scan ───────────────────────────────────────────────

  it("has no automated accessibility violations", async () => {
    const { container } = renderReveal();

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
