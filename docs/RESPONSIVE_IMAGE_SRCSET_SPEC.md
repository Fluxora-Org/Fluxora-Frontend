# Responsive Image Srcset Spec

## Overview
This document outlines the responsive image strategy for the Fluxora Frontend, specifically detailing the usage of `srcset`, `sizes`, `loading`, and `alt` attributes for raster images (PNG, WebP, JPG) and vector images (SVG).

## Breakpoint Tokens Reference
The design assumes standard breakpoints corresponding to Tailwind tokens:
- `--breakpoint-sm`: 640px
- `--breakpoint-md`: 768px
- `--breakpoint-lg`: 1024px
- `--breakpoint-xl`: 1280px
- `--breakpoint-2xl`: 1536px

## Raster Assets (`src/assets/*.png`)
Raster assets like `dashboard.png`, `streams.png`, and `recipient.png` require multi-resolution exports to support high-DPR displays and responsive viewports.

### Sizes Strategy
`sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 800px"`
*Adjust `sizes` per actual layout usage.*

### Srcset Buckets
For Hero illustrations and full-width/half-width screenshots:
- `sm`: 640w
- `md`: 768w
- `lg`: 1024w
- `xl`: 1280w
- `2xl` (High-DPR): 1536w
- `3xl` (High-DPR): 2048w

Example usage:
```html
<img
  src="/assets/dashboard-800w.png"
  srcset="/assets/dashboard-640w.png 640w,
          /assets/dashboard-768w.png 768w,
          /assets/dashboard-1024w.png 1024w,
          /assets/dashboard-1280w.png 1280w,
          /assets/dashboard-1536w.png 1536w,
          /assets/dashboard-2048w.png 2048w"
  sizes="(max-width: 1024px) 100vw, 50vw"
  alt="Fluxora dashboard showing active treasury streams and analytics"
  loading="eager"
  fetchpriority="high"
/>
```

## Vector Assets (SVG)
Wallet provider logos (`freighter.svg`, `albedo.svg`, `walletconnect.svg`) are vector graphics and do not require `srcset` or multiple resolutions. They are infinitely scalable.

Example usage:
```html
<img 
  src="/assets/images/freighter.svg" 
  alt="" 
  aria-hidden="true" 
  loading="lazy" 
  width="48" 
  height="48" 
/>
```
*Note: If the logo is purely decorative, use `alt=""` and `aria-hidden="true"`. If it's a button/link, the surrounding element should have aria-labels or the image should have meaningful alt text.*

## Attribute Matrix
| Image Role | Above/Below Fold | `loading` | `fetchpriority` | `alt` | `aria-hidden` | `srcset` needed? |
| --- | --- | --- | --- | --- | --- | --- |
| Hero Illustration | Above | `eager` | `high` | Meaningful text describing intent | `false` | Yes (Raster) / No (SVG) |
| Dashboard/Screenshots | Below | `lazy` | `auto` | Descriptive, informative text | `false` | Yes (Raster) |
| Wallet Logos (Decorative) | Below | `lazy` | `auto` | `""` (Empty string) | `true` | No (SVG) |
| Wallet Logos (Interactive)| Below | `lazy` | `auto` | e.g. "Freighter Wallet" | `false` | No (SVG) |

## Accessibility (WCAG 2.1 AA)
- **Contrast**: Any text overlaid on these images must maintain a 4.5:1 contrast ratio against the image background at all resolutions.
- **Alt Text**: Informative images must describe the content or function (e.g., "Dashboard showing 2 active streams"). Purely decorative elements must explicitly opt-out of screen readers via `alt=""` and `aria-hidden="true"`.
- **Keyboard Navigation**: Images themselves should not be interactive unless wrapped in a `<button>` or `<a>`, and must not be unlabeled interactive controls.

## Design States for Testing
- **Mobile-served-asset**: Tests at 375px wide viewport, ensuring the 640w or nearest asset loads.
- **Tablet-served-asset**: Tests at 768px wide viewport.
- **Desktop-served-asset**: Tests at 1280px wide viewport.
- **High-DPR-served-asset**: Tests at 2x pixel density, validating the browser selects the 1536w/2048w assets.
