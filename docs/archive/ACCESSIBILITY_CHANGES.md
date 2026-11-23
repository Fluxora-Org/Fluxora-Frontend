# Accessibility Audit - Quick Reference

## Summary
✅ **Both pages now have correct landmark regions and heading hierarchy**

## Changes Made

### 1. Dashboard.tsx - Fixed Missing Main Landmark
```tsx
// BEFORE: Generic div wrapper
return (
  <div>
    <h1>Treasury overview</h1>
    {/* content */}
  </div>
);

// AFTER: Semantic main landmark
return (
  <main id="main-content">
    <h1>Treasury overview</h1>
    {/* content */}
  </main>
);
```

### 2. Home.tsx - Already Compliant
No changes needed - already had proper structure:
- ✅ `<main id="main-content">` landmark present
- ✅ Single `<h1>` in HeroSection
- ✅ Proper h2 hierarchy in child sections

## Test Coverage Added

### Both Pages Now Tested For:
1. **Exactly one `<main>` landmark** per page
2. **Exactly one `<h1>` heading** per page  
3. **No skipped heading levels** (e.g., h1 → h3 without h2)
4. **Automated axe-core checks** for WCAG violations

## Test Locations
- `src/pages/__tests__/Home.test.tsx` - New accessibility test suite added
- `src/pages/__tests__/Dashboard.test.tsx` - Enhanced with accessibility tests

## Run Tests
```bash
# Run all tests
npm test

# Run specific page tests
npm test Home.test
npm test Dashboard.test

# Run only accessibility tests
npm test -- --grep "accessibility"
```

## Acceptance Criteria Status
- ✅ Both pages have exactly one `<main>` landmark
- ✅ Both pages have exactly one `<h1>` heading
- ✅ Heading levels don't skip in either page
- ✅ Automated accessibility checks added and configured
- ✅ All changes are semantic-only, no visual regression

## Screen Reader Benefits
- Users can jump directly to main content (landmark navigation)
- Clear page structure via single h1
- Efficient content scanning via proper heading hierarchy
- WCAG 2.1 compliant semantic structure
