/**
 * Local ESLint plugin — `no-float-amount-arithmetic`
 *
 * Monetary amounts are carried as exact integer minor units (`bigint`) so a
 * rendered figure can never drift from the value the chain holds. The one way
 * IEEE-754 rounding can silently re-enter an amount path is through
 * floating-point APIs or arithmetic against fractional literals, so this rule
 * rejects all of them:
 *
 *   • `parseFloat(x)` / `Number.parseFloat(x)` — lossy parsing
 *   • `Number(x)` / unary `+x` — lossy coercion
 *   • `x.toFixed(n)` — float rounding dressed up as formatting
 *   • `amount * 1.5`, `amount / 0.01`, `parseFloat(x) * y` — float arithmetic
 *
 * Integer `bigint` arithmetic (`a * b`, `a / 100n`) is intentionally allowed:
 * that is exactly how amounts must be combined.
 *
 * The rule is opted in per amount module (see `eslint.config.js`), so enabling
 * it cannot regress unrelated files that legitimately format presentation
 * percentages with `toFixed`.
 */

const FLOAT_PARSERS = new Set(["parseFloat"]);

/** Is `node` an expression whose value is a floating-point `number`? */
function isFloatProducing(node) {
  if (node === null || node === undefined) return false;

  if (node.type === "CallExpression") {
    const callee = node.callee;
    if (
      callee.type === "Identifier" &&
      (callee.name === "Number" || FLOAT_PARSERS.has(callee.name))
    ) {
      return true;
    }
    if (
      callee.type === "MemberExpression" &&
      callee.property.type === "Identifier" &&
      FLOAT_PARSERS.has(callee.property.name)
    ) {
      return true;
    }
    return false;
  }

  // Unary `+value` performs the same lossy coercion as `Number(value)`.
  if (node.type === "UnaryExpression" && node.operator === "+") return true;

  // A fractional numeric literal (e.g. `1.5`, `0.01`) forces float math.
  // Integer literals, including `bigint` literals (`100n`), are exact and safe.
  if (node.type === "Literal" && typeof node.value === "number") {
    return !Number.isInteger(node.value);
  }

  return false;
}

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow floating-point parsing, coercion, rounding and arithmetic in amount modules; use exact bigint minor units.",
      recommended: false,
    },
    schema: [],
    messages: {
      floatParse:
        "Amounts must not be parsed with floating-point `{{name}}`; parse them into exact bigint minor units instead.",
      numberCoercion:
        "Amounts must not pass through `{{name}}` coercion; use exact bigint minor units instead.",
      floatRound:
        "Amounts must not be rounded with `toFixed()`; format exact bigint minor units instead.",
      floatArithmetic:
        "Amounts must not be multiplied or divided by floating-point values; combine exact bigint minor units instead.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;

        if (callee.type === "Identifier") {
          if (callee.name === "parseFloat") {
            context.report({
              node,
              messageId: "floatParse",
              data: { name: "parseFloat" },
            });
          } else if (callee.name === "Number") {
            context.report({
              node,
              messageId: "numberCoercion",
              data: { name: "Number()" },
            });
          }
          return;
        }

        if (
          callee.type === "MemberExpression" &&
          callee.property.type === "Identifier"
        ) {
          if (callee.property.name === "parseFloat") {
            context.report({
              node,
              messageId: "floatParse",
              data: { name: "Number.parseFloat" },
            });
          } else if (callee.property.name === "toFixed") {
            context.report({ node, messageId: "floatRound" });
          }
        }
      },

      UnaryExpression(node) {
        if (node.operator === "+") {
          context.report({
            node,
            messageId: "numberCoercion",
            data: { name: "unary +" },
          });
        }
      },

      BinaryExpression(node) {
        if (node.operator !== "*" && node.operator !== "/") return;
        if (isFloatProducing(node.left) || isFloatProducing(node.right)) {
          context.report({ node, messageId: "floatArithmetic" });
        }
      },
    };
  },
};

export default {
  rules: {
    "no-float-amount-arithmetic": rule,
  },
};
