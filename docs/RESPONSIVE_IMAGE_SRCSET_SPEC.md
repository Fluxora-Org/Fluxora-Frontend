# Responsive Image Srcset Spec

## Overview
This document defines the responsive image strategy for Fluxora Frontend, specifying `srcset`, `sizes`, `loading`, and accessibility attributes for raster images (PNG) and vector images (SVG). This spec ensures optimal performance across viewports and devices while maintaining WCAG 2.1 AA compliance.

## Breakpoint Tokens Reference
Breakpoints are defined in `src/design-tokens.css` as CSS custom properties:
- `--breakpoint-xs`: 320px
- `--breakpoint-sm`: 640px
- `--breakpoint-md`: 768px
- `--breakpoint-lg`: 1024px
- `--breakpoint-xl`: 1280px
- `--breakpoint-2xl`: 1536px

## Image Inventory

### Raster Assets (Require Multi-Resolution Exports)
Located in `src/assets/`:
- `dashboard.png` - Hero section background illustration
- `streams.png` - Streams page screenshot
- `recipient.png` - Recipient page screenshot
- `active.png` - Status indicator
- `complete.png` - Status indicator
- `pause1.png` - Status indicator
- `nextpage.png` - Navigation icon
- `Icon.png`, `Icon(1).png`, `Icon(2).png` - UI icons

### Vector Assets (No Srcset Required)
Located in `src/assets/images/`:
- `freighter.svg` - Freighter wallet logo
- `albedo.svg` - Albedo wallet logo
- `walletconnect.svg` - WalletConnect logo
- `success.svg` - Success state icon

## Raster Image Strategy

### File Naming Convention
Multi-resolution exports follow the pattern: `{basename}-{width}w.{ext}`
- `dashboard-640w.png`
- `dashboard-768w.png`
- `dashboard-1024w.png`
- `dashboard-1280w.png`
- `dashboard-1536w.png`
- `dashboard-2048w.png`

### Srcset Width Buckets
Standard width descriptors for responsive raster images:
- **Mobile**: 640w (serves up to 640px viewport width)
- **Tablet**: 768w (serves up to 768px viewport width)
- **Desktop**: 1024w (serves up to 1024px viewport width)
- **Large Desktop**: 1280w (serves up to 1280px viewport width)
- **High-DPR 2x**: 1536w (serves 2x pixel density at 768px viewport)
- **High-DPR 3x**: 2048w (serves 2x pixel density at 1024px viewport)

### Sizes Attribute Strategy
The `sizes` attribute tells the browser how wide the image will display at each breakpoint. Use breakpoint-specific queries:

**Hero Illustration (Half-width on desktop, full-width on mobile):**
```css
sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 600px"
```

**Full-width screenshots:**
```css
sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1200px"
```

**Small UI icons (< 100px):**
```css
sizes="48px"
```

### HeroSection.tsx Implementation
Current location: `src/components/landing-page/HeroSection.tsx` (lines 185-193)

**Current Implementation Issues:**
- `sizes="(max-width: 1024px) 100vw, 50vw"` - Missing mobile breakpoint, incorrect desktop sizing
- Referenced files (`dashboard-640w.png`, etc.) do not exist in assets
- No fallback for missing resolution variants

**Recommended Implementation:**
```tsx
<img
  src="/src/assets/dashboard-1024w.png"
  srcSet="/src/assets/dashboard-640w.png 640w,
          /src/assets/dashboard-768w.png 768w,
          /src/assets/dashboard-1024w.png 1024w,
          /src/assets/dashboard-1280w.png 1280w,
          /src/assets/dashboard-1536w.png 1536w,
          /src/assets/dashboard-2048w.png 2048w"
  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 600px"
  alt="Fluxora dashboard showing active treasury streams and analytics"
  loading="eager"
  fetchPriority="high"
  className="absolute -right-10 top-0 max-w-[600px] w-full rounded-2xl shadow-2xl hidden lg:block opacity-40 mix-blend-overlay"
/>
```

**Key Changes:**
1. Updated `sizes` to use proper breakpoint tokens (768px, 1280px)
2. Added 2048w for high-DPR displays
3. Changed default `src` to 1024w (middle of the range)
4. Maintained `loading="eager"` and `fetchPriority="high"` for above-the-fold content

## Vector Image Strategy

### SVG Guidelines
Wallet provider logos are vector graphics and do not require `srcset` or multiple resolutions. They are infinitely scalable.

**Implementation in ConnectWalletModal.tsx:**
```tsx
<img
  src="/src/assets/images/freighter.svg"
  alt="Freighter wallet logo"
  loading="lazy"
  width="32"
  height="32"
/>
```

**Decorative SVG Pattern:**
```tsx
<img
  src="/src/assets/images/success.svg"
  alt=""
  aria-hidden="true"
  loading="lazy"
  width="24"
  height="24"
/>
```

### SVG Best Practices
- Always specify `width` and `height` attributes to prevent layout shift
- Use `loading="lazy"` for below-the-fold SVGs
- Decorative SVGs: `alt=""` + `aria-hidden="true"`
- Informative SVGs: meaningful `alt` text describing the content
- Interactive SVGs (buttons/links): ensure parent element has proper aria-label

## Accessibility Attribute Matrix

| Image Role | Location | `loading` | `fetchpriority` | `alt` | `aria-hidden` | `srcset` | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Hero Illustration | Above fold | `eager` | `high` | Descriptive text | `false` | Yes (Raster) | Critical LCP element |
| Dashboard Screenshot | Below fold | `lazy` | `auto` | Descriptive text | `false` | Yes (Raster) | Informative content |
| Streams Screenshot | Below fold | `lazy` | `auto` | Descriptive text | `false` | Yes (Raster) | Informative content |
| Recipient Screenshot | Below fold | `lazy` | `auto` | Descriptive text | `false` | Yes (Raster) | Informative content |
| Wallet Logo (Button) | Below fold | `lazy` | `auto` | `{Wallet Name} logo` | `false` | No (SVG) | Interactive control |
| Wallet Logo (Decorative) | Below fold | `lazy` | `auto` | `""` | `true` | No (SVG) | Purely decorative |
| Status Icon (Active) | Any | `lazy` | `auto` | `""` | `true` | No (Raster) | Decorative status |
| Status Icon (Success) | Any | `lazy` | `auto` | `""` | `true` | No (SVG) | Decorative status |
| Navigation Icon | Any | `lazy` | `auto` | `""` | `true` | No (Raster) | Decorative |

## Alt Text Guidelines

### Informative Images
Describe the content and function:
- **Good**: "Fluxora dashboard showing active treasury streams and analytics"
- **Good**: "Freighter wallet connection button"
- **Bad**: "dashboard.png"
- **Bad**: "image"

### Decorative Images
Use empty alt text and aria-hidden:
```tsx
<img src="/src/assets/images/success.svg" alt="" aria-hidden="true" />
```

### Functional Images (Buttons/Links)
Describe the action, not the appearance:
- **Good**: "Connect with Freighter wallet"
- **Bad**: "Click the rocket icon"

## WCAG 2.1 AA Compliance

### Contrast Requirements
- Any text overlaid on images must maintain 4.5:1 contrast ratio at all resolutions
- Test contrast at each served resolution (640w, 768w, 1024w, 1280w, 1536w, 2048w)
- HeroSection currently uses `mix-blend-overlay` and `opacity-40` - verify text readability

### Keyboard Navigation
- Images must not be interactive controls unless wrapped in `<button>` or `<a>`
- Interactive images must have accessible names (via alt text or parent aria-label)
- Focus indicators must be visible on image-based controls

### Screen Reader Support
- All informative images must have descriptive alt text
- Decorative images must have `alt=""` and `aria-hidden="true"`
- Avoid redundant announcements (e.g., don't repeat button text in image alt)

## Performance Optimization

### Loading Strategy
- **Above-the-fold**: `loading="eager"` + `fetchpriority="high"`
- **Below-the-fold**: `loading="lazy"` + `fetchpriority="auto"`
- **Hero images**: Critical for LCP, prioritize appropriately

### Format Recommendations
- Use WebP format for raster images when browser support allows
- Keep PNG as fallback for older browsers
- Consider AVIF for next-gen optimization (progressive enhancement)

### File Size Targets
- 640w: < 50KB
- 768w: < 75KB
- 1024w: < 100KB
- 1280w: < 150KB
- 1536w: < 200KB
- 2048w: < 300KB

## Design States for Testing

### Viewport Testing
- **Mobile-served-asset**: 375px viewport → expects 640w image
- **Tablet-served-asset**: 768px viewport → expects 768w image
- **Desktop-served-asset**: 1280px viewport → expects 1280w image
- **Large-desktop-served-asset**: 1536px viewport → expects 1536w image

### DPR Testing
- **1x DPR**: Standard pixel density
- **2x DPR**: High-density displays (Retina) → expects 1536w at 768px viewport
- **3x DPR**: Ultra-high-density → expects 2048w at 1024px viewport

### Testing Commands
```bash
# Test responsive behavior in Chrome DevTools
# Open DevTools → Network tab → Select "Img" filter
# Resize viewport and observe which image loads

# Test with Lighthouse
lighthouse https://your-site.com --view
# Check "Images" section for proper sizing and lazy loading
```

## Implementation Checklist

### For Each Raster Image
- [ ] Export multi-resolution variants (640w, 768w, 1024w, 1280w, 1536w, 2048w)
- [ ] Add `srcset` with width descriptors
- [ ] Add `sizes` attribute matching layout breakpoints
- [ ] Set appropriate `loading` attribute (eager/lazy)
- [ ] Set appropriate `fetchpriority` (high/auto)
- [ ] Add descriptive `alt` text
- [ ] Verify contrast at all resolutions
- [ ] Test in DevTools Network tab

### For Each Vector Image
- [ ] Verify SVG is optimized (remove unnecessary metadata)
- [ ] Add explicit `width` and `height` attributes
- [ ] Set `loading="lazy"` for below-the-fold
- [ ] Add appropriate `alt` text or `alt=""` + `aria-hidden="true"`
- [ ] Test scaling at various viewport sizes

## Migration Path

### Phase 1: HeroSection (Critical)
1. Export dashboard.png at all required resolutions
2. Update HeroSection.tsx with proper srcset/sizes
3. Test at 375px, 768px, 1280px viewports
4. Verify LCP improvement

### Phase 2: Other Screenshots
1. Export streams.png at required resolutions
2. Export recipient.png at required resolutions
3. Update components with srcset/sizes
4. Add lazy loading

### Phase 3: Wallet Logos
1. Verify all SVGs have proper alt text
2. Add loading="lazy" to below-the-fold logos
3. Test screen reader announcements

## References
- [MDN: Responsive Images](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)
- [Web.dev: Serve responsive images](https://web.dev/serve-responsive-images/)
- [WCAG 2.1: Non-text Content](https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html)
- [Design Tokens](../src/design-tokens.css) - Breakpoint definitions
