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
 *  7. Revealing never moves a neighbouring node, in a dense row list or in a
 *     standalone block container (Issue #1677)
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import TruncatedReveal from "../TruncatedReveal";

const FULL = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
const TRUNCATED = `${FULL.slice(0, 8)}...${FULL.slice(-4)}`;

function renderReveal(fullValue = FULL, mono = true, className?: string) {
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

/* ═══════════════════════════════════════════════════════════════════════════
   LAYOUT STABILITY HARNESS (Issue #1677)
   ───────────────────────────────────────────────────────────────────────────
   jsdom ships no layout engine: every getBoundingClientRect() reports an
   all-zero box, which would make "nothing moved after the reveal" vacuous.

   This harness therefore installs a small, deterministic flow model over
   HTMLElement.prototype.getBoundingClientRect and seeds it with the REAL
   stylesheet (src/styles/accessibility.css is injected into <head>), so
   `display` / `position` are resolved through the same cascade a browser
   applies instead of being hard-coded in the test.

   Model rules (deliberately minimal, but faithful to what the issue guards):
     • block containers stack children vertically; inline-level children pack
       left-to-right on the current line, so anything that enters the flow
       inside a row pushes every sibling after it sideways;
     • flex / inline-flex containers lay their in-flow children out in a row;
     • absolutely / fixed positioned boxes are anchored to their containing
       block and contribute NOTHING to their ancestors' geometry — exactly
       the invariant the reveal overlay has to satisfy;
     • display:none generates no box.
   ═════════════════════════════════════════════════════════════════════════ */

type FlowBox = { x: number; y: number; w: number; h: number };

type ElementStyle = {
  display: string;
  position: string;
  declaredWidth?: number;
  declaredHeight?: number;
  padT: number;
  padR: number;
  padB: number;
  padL: number;
  borderT: number;
  borderR: number;
  borderB: number;
  borderL: number;
};

type LayoutItem =
  | { kind: "element"; el: HTMLElement }
  | { kind: "text"; text: string };

type RectMeasurement = { id: string; rect: number[] };

/** Average advance width of the mock font, in px. */
const CHAR_WIDTH = 8;
/** Height of a single mock line box, in px. */
const LINE_HEIGHT = 20;
/** Width of the mocked viewport the layout is computed against. */
const VIEWPORT_WIDTH = 800;

const INLINE_LEVEL_TAGS = new Set([
  "SPAN",
  "CODE",
  "A",
  "B",
  "I",
  "EM",
  "STRONG",
  "SMALL",
  "TIME",
  "LABEL",
  "IMG",
  "INPUT",
  "BUTTON",
  "SELECT",
  "TEXTAREA",
  "SVG",
]);

function pxValue(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function isOutOfFlow(position: string): boolean {
  return position === "absolute" || position === "fixed";
}

function isBlockLevel(display: string): boolean {
  return (
    display === "block" ||
    display === "flex" ||
    display === "grid" ||
    display === "list-item" ||
    display === "table" ||
    display.startsWith("table-")
  );
}

function textMetrics(text: string): { w: number; h: number } {
  const normalized = text.replace(/\s+/g, " ").trim();
  return {
    w: normalized.length * CHAR_WIDTH,
    h: normalized.length > 0 ? LINE_HEIGHT : 0,
  };
}

function readStyle(
  el: HTMLElement,
  cache: Map<HTMLElement, ElementStyle>,
): ElementStyle {
  const hit = cache.get(el);
  if (hit) return hit;

  const computed = window.getComputedStyle(el);
  const declaredDisplay = computed.display.trim();
  const style: ElementStyle = {
    display:
      declaredDisplay ||
      (INLINE_LEVEL_TAGS.has(el.tagName) ? "inline" : "block"),
    position: computed.position.trim() || "static",
    declaredWidth: pxValue(computed.width),
    declaredHeight: pxValue(computed.height),
    padT: pxValue(computed.paddingTop) ?? 0,
    padR: pxValue(computed.paddingRight) ?? 0,
    padB: pxValue(computed.paddingBottom) ?? 0,
    padL: pxValue(computed.paddingLeft) ?? 0,
    borderT: pxValue(computed.borderTopWidth) ?? 0,
    borderR: pxValue(computed.borderRightWidth) ?? 0,
    borderB: pxValue(computed.borderBottomWidth) ?? 0,
    borderL: pxValue(computed.borderLeftWidth) ?? 0,
  };
  cache.set(el, style);
  return style;
}

function layoutItems(el: HTMLElement): LayoutItem[] {
  const items: LayoutItem[] = [];
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      items.push({ kind: "text", text: node.textContent ?? "" });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      items.push({ kind: "element", el: node as HTMLElement });
    }
  }
  return items;
}

type LayoutContext = {
  boxes: Map<HTMLElement, FlowBox>;
  styles: Map<HTMLElement, ElementStyle>;
};

function placeChild(
  item: LayoutItem,
  x: number,
  y: number,
  availW: number,
  ctx: LayoutContext,
): { w: number; h: number } {
  if (item.kind === "text") return textMetrics(item.text);
  return place(item.el, x, y, availW, ctx);
}

/** Anchors an out-of-flow box at (anchorX, anchorY) without advancing flow. */
function placeOutOfFlow(
  el: HTMLElement,
  anchorX: number,
  anchorY: number,
  availW: number,
  ctx: LayoutContext,
): { w: number; h: number } {
  const style = readStyle(el, ctx.styles);
  if (style.display === "none") {
    ctx.boxes.set(el, { x: anchorX, y: anchorY, w: 0, h: 0 });
    return { w: 0, h: 0 };
  }

  const outerW = style.padL + style.padR + style.borderL + style.borderR;
  const outerH = style.padT + style.padB + style.borderT + style.borderB;
  const contentX = anchorX + style.borderL + style.padL;
  const contentY = anchorY + style.borderT + style.padT;
  const innerW = Math.max(0, availW - outerW);

  let shrinkW = 0;
  let shrinkH = 0;
  for (const item of layoutItems(el)) {
    const size = placeChild(item, contentX, contentY, innerW, ctx);
    shrinkW += size.w;
    shrinkH = Math.max(shrinkH, size.h);
  }

  const box: FlowBox = {
    x: anchorX,
    y: anchorY,
    w: style.declaredWidth ?? shrinkW + outerW,
    h: style.declaredHeight ?? shrinkH + outerH,
  };
  ctx.boxes.set(el, box);
  return { w: box.w, h: box.h };
}

function place(
  el: HTMLElement,
  x: number,
  y: number,
  availW: number,
  ctx: LayoutContext,
): { w: number; h: number } {
  const style = readStyle(el, ctx.styles);

  if (style.display === "none") {
    ctx.boxes.set(el, { x, y, w: 0, h: 0 });
    return { w: 0, h: 0 };
  }
  if (isOutOfFlow(style.position)) {
    return placeOutOfFlow(el, x, y, availW, ctx);
  }

  const outerW = style.padL + style.padR + style.borderL + style.borderR;
  const outerH = style.padT + style.padB + style.borderT + style.borderB;
  const containingX = x + style.borderL;
  const containingY = y + style.borderT;
  const contentX = containingX + style.padL;
  const contentY = containingY + style.padT;
  const innerW = Math.max(0, availW - outerW);
  const items = layoutItems(el);

  let contentW = 0;
  let contentH = 0;

  if (isBlockLevel(style.display)) {
    let cursorY = contentY;
    let lineX = contentX;
    let lineH = 0;
    const flushLine = () => {
      cursorY += lineH;
      lineX = contentX;
      lineH = 0;
    };

    for (const item of items) {
      if (item.kind === "text") {
        const metrics = textMetrics(item.text);
        if (metrics.h === 0) continue;
        lineX += metrics.w;
        lineH = Math.max(lineH, metrics.h);
        continue;
      }
      const childStyle = readStyle(item.el, ctx.styles);
      if (isOutOfFlow(childStyle.position)) {
        placeOutOfFlow(item.el, containingX, containingY, innerW, ctx);
        continue;
      }
      if (isBlockLevel(childStyle.display)) {
        flushLine();
        const size = place(item.el, contentX, cursorY, innerW, ctx);
        cursorY += size.h;
      } else {
        const size = place(item.el, lineX, cursorY, innerW, ctx);
        lineX += size.w;
        lineH = Math.max(lineH, size.h);
      }
    }
    flushLine();

    contentW = innerW;
    contentH = cursorY - contentY;
  } else {
    // inline / inline-block / flex / inline-flex → single horizontal run
    let cursorX = contentX;
    let maxH = 0;
    for (const item of items) {
      if (
        item.kind === "element" &&
        isOutOfFlow(readStyle(item.el, ctx.styles).position)
      ) {
        placeOutOfFlow(item.el, containingX, containingY, innerW, ctx);
        continue;
      }
      const size = placeChild(item, cursorX, contentY, innerW, ctx);
      cursorX += size.w;
      maxH = Math.max(maxH, size.h);
    }
    contentW = cursorX - contentX;
    contentH = maxH;
  }

  const box: FlowBox = { x, y, w: contentW + outerW, h: contentH + outerH };
  ctx.boxes.set(el, box);
  return { w: box.w, h: box.h };
}

let layoutCache: Map<HTMLElement, FlowBox> | null = null;

function layoutOf(el: HTMLElement): FlowBox {
  if (!layoutCache) {
    const ctx: LayoutContext = {
      boxes: new Map(),
      styles: new Map(),
    };
    place(document.body, 0, 0, VIEWPORT_WIDTH, ctx);
    layoutCache = ctx.boxes;
  }
  return layoutCache.get(el) ?? { x: 0, y: 0, w: 0, h: 0 };
}

function installLayoutMock() {
  return vi
    .spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockImplementation(function (this: HTMLElement) {
      const box = layoutOf(this);
      return {
        x: box.x,
        y: box.y,
        width: box.w,
        height: box.h,
        top: box.y,
        left: box.x,
        right: box.x + box.w,
        bottom: box.y + box.h,
        toJSON: () => ({
          x: box.x,
          y: box.y,
          width: box.w,
          height: box.h,
          top: box.y,
          left: box.x,
          right: box.x + box.w,
          bottom: box.y + box.h,
        }),
      } as DOMRect;
    });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Full bounding client snapshot (position AND size) of every node under
 * `root`, except the reveal chip itself: the chip is the one element whose
 * paint is allowed to change, everything else must stay nailed down.
 */
function measureAll(root: HTMLElement): RectMeasurement[] {
  layoutCache = null;
  const seen = new Map<string, number>();
  const measurements: RectMeasurement[] = [];

  for (const el of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
    if (el.classList.contains("truncateReveal__chip")) continue;

    const base = el.dataset.testid ?? el.tagName.toLowerCase();
    const occurrence = (seen.get(base) ?? 0) + 1;
    seen.set(base, occurrence);

    const rect = el.getBoundingClientRect();
    measurements.push({
      id: `${base}#${occurrence}`,
      rect: [
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        rect.top,
        rect.right,
        rect.bottom,
        rect.left,
      ].map(round2),
    });
  }

  return measurements;
}

/** Bounding client rect of a single node, [x, y, width, height]. */
function measureBox(el: HTMLElement): number[] {
  layoutCache = null;
  const rect = el.getBoundingClientRect();
  return [rect.x, rect.y, rect.width, rect.height].map(round2);
}

function revealWrapperFor(childTestId: string): HTMLElement {
  const wrapper = screen
    .getByTestId(childTestId)
    .closest<HTMLElement>(".truncateReveal");
  if (!wrapper) {
    throw new Error(`no .truncateReveal wrapper above "${childTestId}"`);
  }
  return wrapper;
}

/** Dense, multi-row layout: a table of data streams with address cells. */
function DenseStreamList() {
  const rows = [
    { id: "a", name: "Payroll", amount: "1,250.00 XLM" },
    { id: "b", name: "Vesting", amount: "48,000.00 XLM" },
    { id: "c", name: "Grant", amount: "9,500.00 XLM" },
  ];

  return (
    <div data-testid="stream-table">
      <div data-testid="stream-table-header">Stream · Address · Amount</div>
      {rows.map((row) => (
        <div key={row.id} data-testid={`stream-row-${row.id}`}>
          <span data-testid={`stream-name-${row.id}`}>{row.name}</span>
          <TruncatedReveal fullValue={FULL} mono>
            <code data-testid={`stream-address-${row.id}`}>{TRUNCATED}</code>
          </TruncatedReveal>
          <span data-testid={`stream-amount-${row.id}`}>{row.amount}</span>
        </div>
      ))}
      <div data-testid="stream-table-footer">{rows.length} streams</div>
    </div>
  );
}

/** The same component in isolation inside a standalone block container. */
function StandaloneBlock() {
  return (
    <div data-testid="standalone-block">
      <div data-testid="standalone-label">Recipient address</div>
      <TruncatedReveal fullValue={FULL} mono>
        <code data-testid="standalone-address">{TRUNCATED}</code>
      </TruncatedReveal>
      <div data-testid="standalone-note">Funds settle every 30 days.</div>
    </div>
  );
}

describe("TruncatedReveal layout stability on reveal (Issue #1677)", () => {
  let revealStylesheet: HTMLStyleElement | null = null;
  let layoutSpy: ReturnType<typeof installLayoutMock> | null = null;

  beforeAll(() => {
    revealStylesheet = document.createElement("style");
    revealStylesheet.textContent = readFileSync(
      resolve(__dirname, "../../../styles/accessibility.css"),
      "utf-8",
    );
    document.head.appendChild(revealStylesheet);
    layoutSpy = installLayoutMock();
  });

  afterAll(() => {
    layoutSpy?.mockRestore();
    layoutSpy = null;
    layoutCache = null;
    revealStylesheet?.remove();
    revealStylesheet = null;
  });

  it("keeps every node of a dense row list at identical coordinates when a row reveals its value", async () => {
    const user = userEvent.setup();
    const { container } = render(<DenseStreamList />);

    const before = measureAll(container);

    // Harness sanity: the rows are really stacked with real, non-zero boxes.
    const rowRects = ["a", "b", "c"].map(
      (id) => before.find((m) => m.id === `stream-row-${id}#1`)!.rect,
    );
    for (const rowRect of rowRects) {
      expect(rowRect[2]).toBeGreaterThan(0);
      expect(rowRect[3]).toBeGreaterThan(0);
    }
    expect(rowRects[1][1]).toBeGreaterThan(rowRects[0][1]);
    expect(rowRects[2][1]).toBeGreaterThan(rowRects[1][1]);

    // ── mouse reveal ──
    await user.hover(screen.getByTestId("stream-address-b"));
    expect(revealWrapperFor("stream-address-b")).toHaveAttribute(
      "data-revealed",
      "true",
    );
    expect(measureAll(container)).toEqual(before);

    await user.unhover(screen.getByTestId("stream-address-b"));
    expect(revealWrapperFor("stream-address-b")).toHaveAttribute(
      "data-revealed",
      "false",
    );
    expect(measureAll(container)).toEqual(before);
  });

  it("keeps every node of a dense row list at identical coordinates for a keyboard reveal", () => {
    const { container } = render(<DenseStreamList />);
    const before = measureAll(container);
    const target = screen.getByTestId("stream-address-c");

    fireEvent.focus(target);
    expect(revealWrapperFor("stream-address-c")).toHaveAttribute(
      "data-revealed",
      "true",
    );
    expect(measureAll(container)).toEqual(before);

    fireEvent.blur(target);
    expect(revealWrapperFor("stream-address-c")).toHaveAttribute(
      "data-revealed",
      "false",
    );
    expect(measureAll(container)).toEqual(before);
  });

  it("keeps every node of a standalone block container at identical coordinates when the value is revealed", async () => {
    const user = userEvent.setup();
    const { container } = render(<StandaloneBlock />);
    const before = measureAll(container);

    expect(
      before.find((m) => m.id === "standalone-note#1")!.rect[1],
    ).toBeGreaterThan(
      before.find((m) => m.id === "standalone-address#1")!.rect[1],
    );

    await user.hover(screen.getByTestId("standalone-address"));
    expect(revealWrapperFor("standalone-address")).toHaveAttribute(
      "data-revealed",
      "true",
    );
    expect(measureAll(container)).toEqual(before);

    fireEvent.focus(screen.getByTestId("standalone-address"));
    expect(measureAll(container)).toEqual(before);

    fireEvent.blur(screen.getByTestId("standalone-address"));
    await user.unhover(screen.getByTestId("standalone-address"));
    expect(measureAll(container)).toEqual(before);
  });

  it("keeps the trigger zone anchored directly under the pointer after disclosure", async () => {
    const user = userEvent.setup();
    render(<StandaloneBlock />);

    const child = screen.getByTestId("standalone-address");
    const wrapper = revealWrapperFor("standalone-address");
    const chip = wrapper.querySelector<HTMLElement>(".truncateReveal__chip");
    expect(chip).not.toBeNull();

    // The overlay must never steal the pointer: the trigger zone underneath
    // keeps receiving hover, so the cursor stays on the same element.
    expect(window.getComputedStyle(chip!).pointerEvents).toBe("none");

    const before = measureBox(wrapper);
    expect(before[2]).toBeGreaterThan(0);
    expect(before[3]).toBeGreaterThan(0);
    const cursor = {
      x: before[0] + before[2] / 2,
      y: before[1] + before[3] / 2,
    };

    await user.hover(child);

    const after = measureBox(wrapper);
    expect(after).toEqual(before);
    // The pointer's position is still inside the trigger zone bounds.
    expect(after[0]).toBeLessThanOrEqual(cursor.x);
    expect(after[0] + after[2]).toBeGreaterThanOrEqual(cursor.x);
    expect(after[1]).toBeLessThanOrEqual(cursor.y);
    expect(after[1] + after[3]).toBeGreaterThanOrEqual(cursor.y);
  });

  it("renders the reveal chip as an out-of-flow overlay with zero structural footprint", () => {
    const { container } = render(<StandaloneBlock />);
    const chip = container.querySelector<HTMLElement>(".truncateReveal__chip");
    expect(chip).not.toBeNull();

    // Structural guarantee: the overlay floats above the document hierarchy,
    // so it can never occupy a line box, widen a cell or grow a row.
    expect(["absolute", "fixed"]).toContain(
      window.getComputedStyle(chip!).position,
    );

    // Removing the overlay must not change a single surrounding rect —
    // proof that it reserves no in-flow space in either state.
    const before = measureAll(container);
    chip!.remove();
    expect(measureAll(container)).toEqual(before);
  });

  it("preserves DOM shape and node identity across the whole reveal transition", async () => {
    const user = userEvent.setup();
    render(<StandaloneBlock />);

    const wrapper = revealWrapperFor("standalone-address");
    const childCount = wrapper.childElementCount;
    const truncatedNode = wrapper.firstElementChild;
    const chipNode = wrapper.querySelector(".truncateReveal__chip");
    const srNode = wrapper.querySelector(".truncateReveal__srValue");

    await user.hover(screen.getByTestId("standalone-address"));
    expect(wrapper.childElementCount).toBe(childCount);
    expect(wrapper.firstElementChild).toBe(truncatedNode);
    expect(wrapper.querySelector(".truncateReveal__chip")).toBe(chipNode);
    expect(wrapper.querySelector(".truncateReveal__srValue")).toBe(srNode);
    // The overlay really discloses the full value while staying out of flow.
    expect(chipNode).toHaveTextContent(FULL);
    expect(srNode).toHaveTextContent(FULL);

    await user.unhover(screen.getByTestId("standalone-address"));
    expect(wrapper.childElementCount).toBe(childCount);
    expect(wrapper.firstElementChild).toBe(truncatedNode);
    expect(wrapper.querySelector(".truncateReveal__chip")).toBe(chipNode);
    expect(wrapper.querySelector(".truncateReveal__srValue")).toBe(srNode);
  });

  it("control: an in-flow node added to the list does shift the rows below it", () => {
    // Guards against the harness itself being vacuous: if inserting real
    // flow content did NOT change any rect, the equality assertions above
    // would prove nothing.
    const { container } = render(<DenseStreamList />);
    const before = measureAll(container);

    const row = container.querySelector<HTMLElement>(
      '[data-testid="stream-row-b"]',
    );
    expect(row?.parentElement).not.toBeNull();

    const injected = document.createElement("div");
    injected.textContent = "injected flow content";
    row!.parentElement!.insertBefore(injected, row!.nextSibling);

    const after = measureAll(container);
    expect(after).not.toEqual(before);
  });
});
