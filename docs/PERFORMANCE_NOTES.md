# Performance Notes

## TrustSection Partner Logos — Lazy Loading

### Change

Added a partner logo strip to `src/components/landing-page/TrustSection.tsx` showing
Stellar ecosystem partners (Stellar, USDC, Soroban).

### Before

- No partner logos were present in the TrustSection.
- The section rendered only use-case cards (DAO Treasury, Grant Program, Ecosystem Fund).

### After

Three partner logos are rendered as `<img>` elements with:

- `loading="lazy"` — defers fetch until the section nears the viewport
- `decoding="async"` — allows the browser to decode the image off the main thread
- Explicit `width` / `height` — reserves layout space to prevent layout shift (CLS)
- `opacity-80` with `hover:opacity-100` — visual consistency with existing design tokens
- Wrapped in a `<ul>` / `<li>` structure for screen-reader-friendly navigation

### Files Changed

| File | Change |
|:---|:---|
| `public/logo-stellar.svg` | New logo asset |
| `public/logo-usdc.svg` | New logo asset |
| `public/logo-soroban.svg` | New logo asset |
| `src/components/landing-page/TrustSection.tsx` | Added partner logo strip with lazy-loaded images |
| `src/components/landing-page/__tests__/HeroTrustSection.a11y.test.tsx` | Added test for lazy loading attributes and alt text |

### Performance Impact

- Partner logos are below the fold and loaded lazily, so they do not block
  initial page render or impact LCP.
- Explicit dimensions prevent CLS when the images load.
- The section itself is already wrapped in `LazySection` (viewport-triggered
  dynamic import) in `Home.tsx`, so the JS chunk is also deferred.