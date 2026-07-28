# Spec: High-DPI and Zoom-Adaptive Icon Sizing Strategy
**WCAG Target:** 2.1 AA  
**Status:** Implemented  
**Date:** July 24, 2026

---

## 1. Problem Statement
Fixed-pixel sizes (e.g., `16px`, `20px`, `24px`, `32px`) defined on SVG icons prevent them from scaling dynamically when a user zooms the browser. This results in visual shrinkage of icons relative to the surrounding text. Furthermore, fractional scaled stroke widths at non-standard sizes lead to anti-aliased subpixel rendering, causing icons to look blurry on 1x/2x/3x display pixel ratio (DPR) screens.

---

## 2. High-DPI Rendering Strategy (Grid-Aligned Stroke Widths)
To keep icons perfectly sharp across all screen densities (1x, 2x, and 3x device pixel ratios), the physical stroke widths must compile to exact integer physical pixels. 

Lucide icons are drawn on a `24x24` viewBox grid. The physical stroke width on screen can be computed as:
$$\text{Physical Stroke Width} = \text{DPR} \times \text{Size} \times \frac{\text{StrokeWidth}_{\text{lucide}}}{24}$$

By choosing targeted Lucide `stroke-width` overrides in CSS for each design token size, we align strokes directly to the screen's pixel grid:

| Icon Size Token | Layout Size (CSS px) | Lucide Grid Stroke Width | Physical Stroke Width (1x DPR) | Physical Stroke Width (2x DPR) | Physical Stroke Width (3x DPR) | Crispness |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `--icon-size-xs` | `16px` (`1rem`) | **`1.5`** | $1.0\text{px}$ (1px stroke) | $2.0\text{px}$ (2px stroke) | $3.0\text{px}$ (3px stroke) | **Perfect** |
| `--icon-size-sm` | `20px` (`1.25rem`) | **`2.4`** | $2.0\text{px}$ (2px stroke) | $4.0\text{px}$ (4px stroke) | $6.0\text{px}$ (6px stroke) | **Perfect** |
| `--icon-size-md` | `24px` (`1.5rem`) | **`2.0`** | $2.0\text{px}$ (2px stroke) | $4.0\text{px}$ (4px stroke) | $6.0\text{px}$ (6px stroke) | **Perfect** |
| `--icon-size-lg` | `32px` (`2rem`) | **`1.5`** | $2.0\text{px}$ (2px stroke) | $4.0\text{px}$ (4px stroke) | $6.0\text{px}$ (6px stroke) | **Perfect** |

---

## 3. Zoom-Adaptive Sizing Tokens
Instead of hardcoding fixed pixels, all icon sizes are bound to `rem` units (relative to root font size) in `src/design-tokens.css`. This ensures that when the browser is zoomed (which adjusts the root font size), the icons scale automatically in proportion with surrounding text.

```css
/* Icon sizes (relative to root font-size for zoom scaling) */
--icon-size-xs: 1rem;       /* inline, 16px base */
--icon-size-sm: 1.25rem;    /* button/label, 20px base */
--icon-size-md: 1.5rem;     /* standalone/structure, 24px base */
--icon-size-lg: 2rem;       /* hero/empty-state, 32px base */

/* Utility classes for icon sizing and high-DPI crisp rendering */
.icon-xs { width: var(--icon-size-xs); height: var(--icon-size-xs); stroke-width: 1.5; }
.icon-sm { width: var(--icon-size-sm); height: var(--icon-size-sm); stroke-width: 2.4; }
.icon-md { width: var(--icon-size-md); height: var(--icon-size-md); stroke-width: 2.0; }
.icon-lg { width: var(--icon-size-lg); height: var(--icon-size-lg); stroke-width: 1.5; }
```

---

## 4. Accessibility Target Size (WCAG 2.5.5 Compliance)
All interactive buttons containing only icons must have a hit target of at least `44x44px` (CSS pixels) independent of the visual icon glyph size. This remains true at all browser zoom levels.

We have audited and updated interactive controls in `Sidebar.tsx` and `AppNavbar.tsx`:

*   **Sidebar Mobile Close Button**: Changed from padding-based sizing (which generated a $36\text{px}$ height) to explicit `min-w-[44px]` and `min-h-[44px]` layout styling with flex center alignment.
*   **Sidebar Collapse Toggle (when collapsed)**: The button inherits a `min-h-[44px] min-w-[44px]` layout to remain accessible even when compressed.
*   **AppNavbar Mobile Menu Toggle**: Upgraded from `w-10 h-10` ($40\text{px}$) to `w-11 h-11` ($44\text{px}$) and centered the `icon-md` icon inside.
*   **Theme Toggle Buttons (Desktop / Mobile)**: Enforce a container layout of `min-w-[44px] min-h-[44px]`.

---

## 5. Verification Checklist

- [x] **Grid Alignment**: Check stroke crispness on 1x, 2x, and 3x DPR displays.
- [x] **Adaptive Zooming**: Zoom browser to 150% and 200%. Verify icons scale with adjacent text and do not shrink.
- [x] **Minimum Hit Targets**: Audit all icon-only interactive controls to guarantee they cover at least $44 \times 44\text{px}$.
- [x] **Keyboard Accessibility**: Ensure all icon buttons are reachable using `Tab` and have visible `:focus-visible` outlines.
- [x] **A11y Labeling**: Verify that all icon-only buttons have descriptive labels (`aria-label` or `aria-expanded` as appropriate) and decorative icons are marked `aria-hidden="true"`.
- [x] **Contrast Compliance**: Ensure icon stroke colors maintain a $\ge 3:1$ contrast ratio against the background color on both light and dark themes.
