# Cyberpunk Alternate Theme

## Intent and scope

Cyberpunk is a strictly opt-in proof-of-concept skin. It is never selected by
the operating-system preference and `toggleTheme()` continues to switch only
between light and dark. An integration may explicitly call
`setTheme("cyberpunk")`; the provider persists that choice under `theme`.

Only `MetricCard` and `StreamCreatedModal` currently opt in with
`data-skin="cyberpunk"`. Existing consumers keep their normal token values, so
the alternate layer can be reviewed without recolouring the application.

## States

| State | Behaviour |
| --- | --- |
| default-theme | Light or dark follows the existing provider rules. No Cyberpunk selectors apply. |
| cyberpunk-enabled | Explicit `setTheme("cyberpunk")`; target surfaces use the neon token ramp, static scanlines, and a restrained glow animation. |
| cyberpunk-enabled-reduced-motion | Same colors, contrast, and scanlines; `prefers-reduced-motion: reduce` disables all Cyberpunk animation. |

## Tokens and measured contrast

All values below are measured independently with `contrastRatio()` in
`src/theme/__tests__/CyberpunkContrast.test.ts`; every text, icon, status, and
button pairing is at least 4.5:1.

| Pairing | Foreground | Background | Ratio |
| --- | --- | --- | ---: |
| Primary text | `#f4f7ff` | `#070b12` | 18.55:1 |
| Secondary text | `#b4bfd1` | `#070b12` | 10.71:1 |
| Cyan accent / icon | `#65f6ff` | `#070b12` | 15.31:1 |
| Green success | `#62ffc9` | `#070b12` | 15.77:1 |
| Magenta accent | `#ff75d8` | `#070b12` | 8.32:1 |
| Yellow focus / status | `#ffe66d` | `#070b12` | 15.89:1 |
| Secondary panel text | `#b4bfd1` | `#101827` | 9.57:1 |
| Primary button text | `#070b12` | `#65f6ff` | 15.31:1 |

## Decorative treatment and focus

The scanline texture is a static repeating linear gradient with no flicker.
The glow uses a low-amplitude box-shadow animation only inside
`@media (prefers-reduced-motion: no-preference)`. Focus rings remain a solid
yellow dual-layer outline above the glow and use the near-black surface as the
separator, preserving keyboard visibility.

The target card uses a one-pixel cyan edge and the modal uses a restrained
cyan/magenta halo. Both effects are clipped to their surfaces and use no
layout-changing transforms. On narrow modal widths, scanlines remain a single
paint layer and the layout switches actions to a column at 480px.

## Review redlines

- MetricCard: `data-skin="cyberpunk"` adds a near-black surface, cyan edge,
  static scanlines, and cyan glow; labels and descriptions stay secondary text.
- StreamCreatedModal: overlay remains darkened, modal becomes near-black with
  a cyan/magenta halo, stream ID is cyan, success state is green, and the
  primary action is cyan with near-black text.
- Reduced motion: compare the enabled and reduced-motion states with DevTools
  emulation; the palette and scanline texture must remain, while glow animation
  must be absent.