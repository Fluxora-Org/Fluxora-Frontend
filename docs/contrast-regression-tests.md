# Contrast Regression Tests

## Overview

The contrast regression test suite ensures WCAG 2.1 AA compliance is maintained across theme customisation and theme-provider state transitions. It lives in two files:

| File | Framework | What it covers |
|------|-----------|----------------|
| `src/theme/__tests__/contrastUtils.test.ts` | Vitest (pure) | WCAG math, token validation, custom-theme validation |
| `src/theme/__tests__/contrastUtils.test.tsx` | Vitest + React Testing Library | ThemeProvider DOM snapshots, localStorage rehydration |

## Regression surface

### 1. WCAG contrast math

| Function | Behaviour | Regression risk |
|----------|-----------|-----------------|
| `hexToRgb(hex)` | Parses 3- or 6-digit hex to `[r,g,b]` in `[0,1]`. Throws `TypeError` on invalid input. | Off-by-one in nibble doubling or `parseInt` base. |
| `relativeLuminance(hex)` | WCAG 2.x linearisation via IEC 61966-2-1. Returns `[0,1]`. | Wrong threshold constant (`0.04045` vs `0.03928`). |
| `contrastRatio(a, b)` | `(L_lighter + 0.05) / (L_darker + 0.05)`. Returns `[1, 21]`. Commutative. | Swapping `L1`/`L2` order or wrong `+0.05` offset. |
| `meetsAA(fg, bg)` | `contrastRatio >= 4.5`. | Threshold lowered below WCAG AA. |
| `meetsAALarge(fg, bg)` | `contrastRatio >= 3.0`. | Threshold lowered below WCAG AA-large. |

### 2. Token validation

| Function | Behaviour | Regression risk |
|----------|-----------|-----------------|
| `isValidHex(value)` | Accepts `#RGB` and `#RRGGBB`, with or without `#`. Rejects injection. | Regex loosened to accept 4-/5-/7-digit hex. |
| `normaliseHex(value)` | Trims, adds `#`, lowercases. | Leading/trailing whitespace handling. |
| `validateToken(token, value, bgHex?)` | Returns `ok` or one of `locked`, `disallowed`, `invalid-hex`, `contrast-fail`. | New token added to `ALLOWED_TOKEN_KEYS` without tests. |
| `validateCustomTheme(overrides, resolvedBg?)` | Validates all tokens, then cross-pair contrast check. Returns `{ valid, errors }`. | FG removed from `valid` set when contrast fails. |

### 3. Locked tokens

These tokens are **permanently rejected** by `validateToken` and must never appear in `valid`:

- **Focus ring** (`--focus-ring-*`, `--interactive-focus-ring*`, `--color-focus`): altering these risks making keyboard navigation invisible (WCAG 2.4.7, 2.4.11).
- **Status semantic** (`--status-success`, `--status-warning`, `--status-error`, `--status-info`, `--color-success`, `--color-warning`, `--color-danger`, `--color-info`): altering these could make status indicators indistinguishable (WCAG 1.4.1).

### 4. Contrast pairs

Foreground/background pairs checked by `validateCustomTheme` when both tokens are present:

| FG token | BG token | Required level |
|----------|----------|----------------|
| `--navbar-logo-color` | `--navbar-bg` | AA (4.5:1) |
| `--navbar-link-color` | `--navbar-bg` | AA (4.5:1) |
| `--color-cta-primary-text` | `--color-cta-primary-bg` | AA (4.5:1) |
| `--text-vivid` | `--surface-base` | AA (4.5:1) |
| `--text-secondary` | `--surface-base` | AA (4.5:1) |
| `--color-accent-primary` | `--surface-base` | AA-large (3.0:1) |
| `--color-accent-secondary` | `--surface-base` | AA-large (3.0:1) |

### 5. ThemeProvider snapshots

| Scenario | Expected DOM `data-theme` | Regression risk |
|----------|--------------------------|-----------------|
| No stored theme | `"light"` (default) | Provider reads `localStorage` on mount. |
| Stored `"dark"` | `"dark"` | `initTheme()` applies synchronously. |
| Storage changes before provider mounts | First-applied value wins | Snapshot is locked once `initTheme()` runs. |
| Rerender | Same value persists | `data-theme` not re-set on rerender. |
| Corrupted custom theme JSON | Falls back to `"light"` | `getStoredCustomTheme()` returns `null`. |
| Provider unmount/remount | Theme persists | Stored in `localStorage`, rehydrated on next mount. |

## Edge-case coverage

The following edge cases are explicitly tested:

- **Empty overrides**: `validateCustomTheme({})` returns empty `valid`/`errors`.
- **Undefined values**: Tokens with `undefined` values are skipped.
- **Determinism**: Same input always produces same output (tested across `hexToRgb`, `contrastRatio`, `validateCustomTheme`).
- **Retry/recovery**: Validation succeeds after a prior failure.
- **Boundary contrast**: `meetsAA` at exactly 4.5:1 and 4.48:1 (just below). `meetsAALarge` at exactly 3.0:1 and 2.85:1 (just below).
- **All locked tokens**: Every token in `LOCKED_TOKEN_KEYS` is rejected, including all focus-ring and status semantic tokens.
- **Mixed overrides**: Correct split of valid vs invalid tokens in a single call.
- **Cross-pair removal**: FG token removed from `valid` when contrast fails against overridden BG.
- **resolvedBg fallback**: Contrast check uses `resolvedBg` when BG token is not in overrides.
- **Hex edge cases**: 5-digit hex, 7-char hex without `#`, whitespace-only string, `#` alone.
- **Corrupted localStorage**: Malformed JSON, missing required fields, array instead of object.
- **Provider remount**: Theme survives unmount/remount cycle.

## Backward compatibility

All tests are **additive**. No existing test is modified or removed. The happy path (valid token → ok, locked token → error, contrast fail → error) remains unchanged. The documentation spells out the current behaviour so future changes can be verified against this baseline.

## Running the tests

```bash
# Pure contrast utility tests
npx vitest run src/theme/__tests__/contrastUtils.test.ts

# ThemeProvider snapshot tests
npx vitest run src/theme/__tests__/contrastUtils.test.tsx

# All contrast-related tests
npx vitest run src/theme/__tests__/
```
