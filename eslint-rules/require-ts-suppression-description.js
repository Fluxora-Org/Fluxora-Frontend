/**
 * Local ESLint rule — `require-ts-suppression-description`
 *
 * TypeScript suppressions (`// @ts-ignore` and `// @ts-expect-error`) hide a
 * real type error from the compiler. A suppression that outlives its cause
 * silently masks a genuine error in the same expression, so every one must
 * state why it is correct and what change would allow its removal.
 *
 * This rule enforces two things on line-comment suppressions:
 *
 *   • `@ts-ignore` is rejected — `@ts-expect-error` is the only acceptable
 *     directive, because an unused `@ts-expect-error` fails the type-check
 *     while a stale `@ts-ignore` never does.
 *   • Every suppression must carry a meaningful description after the
 *     directive (longer than decorative padding such as a leading dash).
 *
 * Block-comment suppressions (`/* @ts-expect-error ... *​/`) are left alone:
 * they are rare, and a description is already required when they appear in a
 * `//` comment.
 */

const SUPPRESSION_RE = /^\s*@ts-(ignore|expect-error)(?:\s+([\s\S]*))?$/;

/** Descriptions shorter than this are treated as empty ("x", "-", "—"). */
const MIN_DESCRIPTION_LENGTH = 12;

/** Strips leading dashes, em dashes and whitespace used as decoration. */
function stripDecoration(text) {
  return text.replace(/^[\s-—–]+/, "").trim();
}

function hasMeaningfulDescription(description) {
  return stripDecoration(description).length >= MIN_DESCRIPTION_LENGTH;
}

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require every @ts-ignore / @ts-expect-error comment to state a reason, and ban @ts-ignore in favour of @ts-expect-error.",
      recommended: false,
    },
    schema: [],
    messages: {
      prefersExpectError:
        "Use `@ts-expect-error` instead of `@ts-ignore`. An unused `@ts-expect-error` fails the type-check, while a stale `@ts-ignore` silently masks a real error.",
      missingDescription:
        "`@ts-{{directive}}` must state a reason. Write: `// @ts-expect-error <why this suppression is correct and what change would let you remove it>`.",
    },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (comment.type !== "Line") continue;

          const match = comment.value.match(SUPPRESSION_RE);
          if (!match) continue;

          const directive = match[1];
          const description = (match[2] ?? "").trim();

          if (directive === "ignore") {
            context.report({
              node: comment,
              messageId: "prefersExpectError",
            });
          }

          if (!hasMeaningfulDescription(description)) {
            context.report({
              node: comment,
              messageId: "missingDescription",
              data: { directive },
            });
          }
        }
      },
    };
  },
};

export default {
  rules: {
    "require-ts-suppression-description": rule,
  },
};