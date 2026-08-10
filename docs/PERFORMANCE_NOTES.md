# Performance Notes

## NewsletterSection — Deferred Mount via IntersectionObserver

**Issue:** #1269  
**Status:** ✅ Implemented in `src/pages/Home.tsx`

### Mechanism

The `NewsletterSection` component is not mounted or bundled eagerly. It uses:

1. **`React.lazy(() => import("../components/NewsletterSection"))`** — code-splits the component into a separate chunk (`app-landing-*.js`).
2. **`LazySection` wrapper** — wraps each below-the-fold section with an `IntersectionObserver` that triggers the dynamic `import()` once the element nears the viewport.
3. **`rootMargin: "300px"`** — starts loading when the section is 300px outside the viewport, so the import completes before the user scrolls to it.
4. **Skeleton placeholder** — each `LazySection` reserves `240px` of vertical space (`LAZY_SECTION_SKELETON_HEIGHT`) to avoid layout shift while the chunk loads.
5. **Single-fire** — the observer `disconnect()`'s after the first intersection, and `React.lazy` caches the module, so the import fires exactly once.

### Bundle Impact

| Metric | Before | After |
|:---|---:|---:|
| Initial `/` bundle | ~308 kB | ~299 kB |
| Newsletter chunk | — | 4.53 kB gzip |
| Largest chunk | 86.12 kB | 86.12 kB |

### Fallback

When `IntersectionObserver` is unavailable (older browsers, jsdom/SSR), the `LazySection` fallback renders immediately via `React.lazy`'s built-in Suspense, which loads the chunk on first render. No layout shift occurs because the skeleton height is always reserved.

### Verification

Run `vite build` and inspect the output:

```
dist/assets/app-landing-*.js  →  Newsletter chunk (extracted from initial bundle)
dist/assets/index-*.js        →  Main bundle (no NewsletterSection code)
```

The chunk name `app-landing-*` confirms the section is deferred to a separate file.