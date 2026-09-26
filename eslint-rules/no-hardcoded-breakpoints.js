/**
 * Local ESLint rule — `no-hardcoded-breakpoints`
 *
 * Responsive widths are owned by `src/lib/breakpoints.ts` (issue #1625). That
 * module declares the design-system scale, the named layout steps, and the
 * `mediaUp` / `mediaDown` helpers that turn a declared name into a media
 * query string.
 *
 * A hardcoded width is worse here than a magic number elsewhere because it is
 * invisible to review. A stylesheet's `@media (max-width: 767px)` looks
 * deliberate, but it is a token value minus one — the same boundary spelled two
 * different ways in two files, so the layout flips a pixel apart depending on
 * which component renders. This rule rejects the three shapes that let a width
 * re-enter the codebase:
 *
 *   • `window.matchMedia("(max-width: 768px)")` and template equivalents
 *   • `window.innerWidth < 480` — a viewport comparison against a literal
 *   • a raw px width inside a media query written in a template literal or
 *     string (inline `<style>` blocks, styled templates, `img sizes`)
 *
 * The fix is always to use a name:
 *
 *   import { mediaDown, mediaUp, LAYOUT_STEPS } from "../lib/breakpoints";
 *   window.matchMedia(mediaDown("md"));   // "(max-width: 768px)"
 *   window.matchMedia(mediaUp("sm"));     // "(min-width: 640px)"
 *   window.innerWidth < LAYOUT_STEPS.compact;
 *
 * A width that genuinely cannot come from the module can be suppressed with a
 * described `eslint-disable`, which is what makes the exception reviewable.
 */

/** `(min-width: 768px)` / `(max-width: 767px)` inside any string. */
const WIDTH_FEATURE_RE =
  /\(\s*(?:min-width|max-width)\s*:\s*(\d+(?:\.\d+)?)px\s*\)/gi;

/** Comparison operators that turn a width literal into a breakpoint test. */
const COMPARISON_OPERATORS = new Set(["<", "<=", ">", ">="]);

/** `window.innerWidth`, `innerWidth`, `globalThis.innerWidth`, … */
function isInnerWidth(node) {
  if (node.type !== "MemberExpression" || node.computed) return false;
  if (node.property.type === "Identifier") {
    return node.property.name === "innerWidth";
  }
  if (node.property.type === "Literal") {
    return node.property.value === "innerWidth";
  }
  return false;
}

/** `matchMedia(...)` or `window.matchMedia(...)`. */
function isMatchMediaCall(node) {
  const callee = node.callee;
  if (callee.type === "Identifier") return callee.name === "matchMedia";
  return (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier" &&
    callee.property.name === "matchMedia"
  );
}

/** True when `node` is a direct argument of a `matchMedia` call. */
function isMatchMediaArgument(node) {
  const parent = node.parent;
  return (
    parent &&
    parent.type === "CallExpression" &&
    parent.arguments.includes(node) &&
    isMatchMediaCall(parent)
  );
}

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow hardcoded viewport widths in media queries and viewport comparisons; use src/lib/breakpoints.ts.",
      recommended: false,
    },
    schema: [],
    messages: {
      hardcodedMediaQuery:
        "Hardcoded media query width `{{feature}}`. Build the query from a declared breakpoint name with `mediaDown(\"md\")` / `mediaUp(\"sm\")` from `src/lib/breakpoints.ts` instead of writing {{width}}px by hand.",
      hardcodedMatchMedia:
        "`matchMedia(\"{{feature}}\")` hardcodes the {{width}}px breakpoint. Import `mediaDown` / `mediaUp` from `src/lib/breakpoints.ts` and pass the declared name instead.",
      hardcodedComparison:
        "Comparing the viewport against the hardcoded width {{width}}px re-defines a breakpoint. Use a declared value from `src/lib/breakpoints.ts` (e.g. `LAYOUT_STEPS.compact`) or the `isMobileViewport` / `mediaUp` helpers.",
    },
  },
  create(context) {
    return {
      // `matchMedia("(max-width: 767px)")` — the most common re-derivation.
      CallExpression(node) {
        if (!isMatchMediaCall(node)) return;
        for (const arg of node.arguments) {
          if (arg.type === "Literal" && typeof arg.value === "string") {
            reportWidthLiterals(
              context,
              arg,
              arg.value,
              "hardcodedMatchMedia",
            );
          }
        }
      },

      // `window.innerWidth >= 768` — a breakpoint without a media query.
      BinaryExpression(node) {
        if (!COMPARISON_OPERATORS.has(node.operator)) return;

        for (const side of [node.left, node.right]) {
          if (!isInnerWidth(side)) continue;
          const other = side === node.left ? node.right : node.left;
          if (other.type !== "Literal" || typeof other.value !== "number") {
            continue;
          }
          context.report({
            node,
            messageId: "hardcodedComparison",
            data: { width: String(other.value) },
          });
        }
      },

      // Inline `<style>` blocks and styled templates: a media query authored in
      // a template literal is still a hardcoded breakpoint. Quasis are joined
      // with a sentinel so a width split by an `${mediaUp("md")}` interpolation
      // cannot be reassembled into a false positive.
      TemplateLiteral(node) {
        const text = node.quasis
          .map((quasi) => quasi.value.raw)
          .join("\u0000");
        reportWidthLiterals(context, node, text, "hardcodedMediaQuery");
      },

      // `sizes="(max-width: 768px) 100vw, …"` and similar string attributes.
      Literal(node) {
        if (typeof node.value !== "string") return;
        if (!/^\s*\(?\s*(?:min|max)-width\s*:/.test(node.value)) return;
        if (isMatchMediaArgument(node)) return;
        reportWidthLiterals(context, node, node.value, "hardcodedMediaQuery");
      },
    };
  },
};

/** Reports every px width found in a string or template literal. */
function reportWidthLiterals(context, node, text, messageId) {
  for (const match of text.matchAll(WIDTH_FEATURE_RE)) {
    context.report({
      node,
      messageId,
      data: { width: match[1], feature: match[0].trim() },
    });
  }
}

export default {
  rules: {
    "no-hardcoded-breakpoints": rule,
  },
};
