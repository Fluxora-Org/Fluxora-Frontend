# Theme E2E Test Quick Reference

## Run Commands

```bash
# Full test suite (Chromium + Firefox)
npm run test:e2e -- theme-customization

# Single browser (faster)
npm run test:e2e -- theme-customization --project=chromium

# Specific test
npm run test:e2e -- theme-customization -g "user can toggle theme"

# Debug mode with UI
npx playwright test theme-customization --ui

# Watch mode (during development)
npx playwright test theme-customization --project=chromium --watch
```

## Quick Validation

Break the theme toggle button to verify test catches it:

**File:** `src/components/navigation/AppNavbar.tsx` (line ~246)

**Change:**
```tsx
// Comment out this button temporarily
{/* <button onClick={toggleTheme} ... > */}
```

**Run:**
```bash
npm run test:e2e -- theme-customization --project=chromium
```

**Expected:** Test fails with "button not found" error ✅

**Restore:** Uncomment the button

## Test Coverage at a Glance

| Test | What It Verifies |
|------|------------------|
| `user can toggle theme from light to dark and it persists` | Basic toggle + localStorage persistence |
| `user can toggle theme from dark back to light` | Reverse direction works |
| `theme toggle works across different routes` | Persistence during navigation |
| `theme toggle is keyboard accessible` | Tab, Enter, Space keys work |
| `theme toggle works in mobile menu` | Mobile viewport hamburger menu |
| `handles localStorage unavailable gracefully` | Failure path: blocked storage |
| `validates data-theme attribute` | Security: rejects invalid values |
| `respects system preference` | OS dark/light mode integration |
| `explicit user choice overrides system` | User choice takes precedence |

## Files Involved

```
e2e/theme-customization.spec.ts          ← Test suite
src/theme/ThemeProvider.tsx              ← Theme logic
src/components/navigation/AppNavbar.tsx  ← Toggle UI
.github/workflows/ci.yml                 ← CI integration
```

## Common Issues

**Test fails with "button not found"**
- Check if navbar is rendered on the route
- Verify `aria-label` matches theme state

**Test fails after reload**
- Check localStorage is enabled in browser
- Verify persistence code in `setTheme` callback

**Test is flaky**
- Add `await page.waitForLoadState('networkidle')`
- Check for race conditions in theme init

## CI Status

✅ Runs automatically on every PR  
✅ Must pass before merge  
✅ Browsers: Chromium + Firefox
