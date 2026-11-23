# Theme Customization E2E Test Validation Guide

## Overview

This document provides instructions for validating the theme customization end-to-end test suite.

## Test File Location

`e2e/theme-customization.spec.ts`

## What the Test Covers

The test suite covers the complete theme customization flow as a user would experience it:

### Success Paths
1. **Basic toggle flow**: User clicks theme toggle button, theme changes, preference persists across reload
2. **Round-trip toggle**: User can toggle from dark back to light
3. **Cross-route persistence**: Theme choice persists when navigating between pages
4. **Keyboard accessibility**: Theme toggle works via keyboard (Tab, Enter, Space)
5. **Mobile menu**: Theme toggle works in the mobile navigation menu
6. **System preference**: App respects system dark/light mode when no explicit choice exists
7. **Explicit override**: User's explicit choice overrides system preference

### Failure Paths
1. **localStorage unavailable**: App handles blocked storage gracefully (theme works in memory, falls back to system preference on reload)
2. **Invalid theme injection**: App validates and rejects corrupted/malicious theme values

## Running the Tests

### Full suite (all tests, Chromium + Firefox)
```bash
npm run test:e2e -- theme-customization
```

### Single browser (faster for development)
```bash
npm run test:e2e -- theme-customization --project=chromium
```

### Single test
```bash
npm run test:e2e -- theme-customization --project=chromium -g "user can toggle theme from light to dark"
```

### With UI (for debugging)
```bash
npx playwright test theme-customization --project=chromium --ui
```

## CI Integration

The test runs automatically on every pull request via `.github/workflows/ci.yml`.

**Added CI step:**
```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps chromium firefox

- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true
```

## Validation: Breaking the Flow

To confirm the test catches real breakages, introduce each of these intentional bugs and verify the test fails:

### Break 1: Remove theme toggle button

**File:** `src/components/navigation/AppNavbar.tsx`

**Change:** Comment out the theme toggle button (around line 246):
```tsx
{/* Theme toggle */}
{/* BREAK: Comment out this button
<button
  onClick={toggleTheme}
  aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
  ...
>
*/}
```

**Expected failure:** Test fails at `await expect(themeButton).toBeVisible()` with error indicating the button cannot be found.

**Command to verify:**
```bash
npm run test:e2e -- theme-customization --project=chromium -g "user can toggle theme from light to dark"
```

---

### Break 2: Disable theme persistence

**File:** `src/theme/ThemeProvider.tsx`

**Change:** Comment out localStorage write (around line 141):
```tsx
const setTheme = useCallback((next: Theme) => {
  hasExplicitChoiceRef.current = true;
  try {
    // BREAK: Disable persistence
    // window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Ignore persistence failures; in-memory state still updates the UI.
  }
  setThemeState(next);
}, []);
```

**Expected failure:** Test fails after page reload with error indicating theme did not persist (expected "dark", got "light").

**Command to verify:**
```bash
npm run test:e2e -- theme-customization --project=chromium -g "persists"
```

---

### Break 3: Prevent DOM update

**File:** `src/theme/ThemeProvider.tsx`

**Change:** Comment out the DOM attribute update (around line 97):
```tsx
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  // BREAK: Don't update DOM
  // document.documentElement.setAttribute("data-theme", theme);
}
```

**Expected failure:** Test fails immediately after clicking toggle with error indicating `data-theme` attribute did not change.

**Command to verify:**
```bash
npm run test:e2e -- theme-customization --project=chromium -g "user can toggle theme from light to dark"
```

---

### Break 4: Break keyboard accessibility

**File:** `src/components/navigation/AppNavbar.tsx`

**Change:** Add `tabIndex={-1}` to theme button to make it not keyboard-focusable:
```tsx
<button
  tabIndex={-1}  // BREAK: Make unfocusable
  onClick={toggleTheme}
  aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
  ...
>
```

**Expected failure:** Test fails at `await expect(themeButton).toBeFocused()` with error indicating element is not focusable.

**Command to verify:**
```bash
npm run test:e2e -- theme-customization --project=chromium -g "keyboard accessible"
```

---

### Break 5: Remove mobile theme toggle

**File:** `src/components/navigation/AppNavbar.tsx`

**Change:** Comment out the mobile menu theme toggle (around line 329):
```tsx
{/* BREAK: Comment out mobile theme toggle
<button
  onClick={toggleTheme}
  aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
  ...
>
*/}
```

**Expected failure:** Test fails with mobile viewport, unable to find theme toggle in mobile menu.

**Command to verify:**
```bash
npm run test:e2e -- theme-customization --project=chromium -g "mobile menu"
```

---

### Break 6: Allow invalid theme values

**File:** `src/theme/ThemeProvider.tsx`

**Change:** Modify the `isTheme` validation function to allow any value:
```tsx
export function isTheme(value: unknown): value is Theme {
  // BREAK: Accept any string
  return typeof value === "string";
  // Original: return value === "light" || value === "dark";
}
```

**Expected failure:** Security test fails because invalid theme value is not rejected.

**Command to verify:**
```bash
npm run test:e2e -- theme-customization --project=chromium -g "validates data-theme"
```

## Test Quality Checklist

- ✅ **No internals**: Tests use only user-facing selectors (roles, labels, visible text)
- ✅ **Success path**: Covers happy path from start to finish
- ✅ **Failure path**: Covers graceful degradation when localStorage is blocked
- ✅ **Persistence**: Verifies state survives page reload
- ✅ **Accessibility**: Tests keyboard navigation and ARIA labels
- ✅ **Cross-route**: Validates behavior across navigation
- ✅ **Mobile**: Covers responsive mobile menu variant
- ✅ **Security**: Validates input sanitization (rejects invalid theme values)
- ✅ **CI integration**: Runs on every PR automatically

## Expected Test Duration

Approximately 15-25 seconds for the full suite on a single browser.

## Debugging Test Failures

### Test fails with "button not found"
- Check if navbar is rendered on the target route
- Verify aria-label matches the expected theme state
- Use `--ui` mode to inspect the page visually

### Test fails with "attribute not found"
- Check if `ThemeProvider` is wrapping the app
- Verify `applyTheme` is being called
- Check browser console for errors

### Test fails on reload
- Check if localStorage persistence is working
- Verify `getStoredTheme` is reading correctly
- Check for storage permission issues

### Test is flaky
- Add `await page.waitForLoadState('networkidle')` if needed
- Increase `expect.timeout` in playwright.config.ts
- Check for race conditions in theme initialization

## Success Criteria

✅ **All tests pass** when the theme flow is working correctly  
✅ **Tests fail** when any step of the flow is broken  
✅ **Tests run in CI** on every pull request  
✅ **No internal implementation details** are accessed in tests

## Next Steps

After validating:
1. Run the full test suite: `npm run test:e2e`
2. Verify CI passes on your PR
3. Pick one break scenario above and confirm the test catches it
4. Document any flaky behavior and add appropriate waits
5. Consider adding visual regression tests for theme-specific UI changes
