# Theme E2E Test Integration Checklist

## Pre-Merge Validation

Use this checklist to verify the theme E2E tests are working correctly before merging.

### ☐ 1. Install Dependencies (if not already done)

```bash
npm ci
npx playwright install chromium firefox
```

### ☐ 2. Run the Full Test Suite

```bash
npm run test:e2e -- theme-customization
```

**Expected result:** All 9 tests pass ✅

**If tests fail:** Check error messages and refer to `THEME_E2E_TEST_VALIDATION.md` debugging section.

### ☐ 3. Verify Test Catches Breakage

Pick **one** validation scenario from the list below:

#### Option A: Break Toggle Button (Fastest)

**File:** `src/components/navigation/AppNavbar.tsx` (line ~246)

**Change:** Comment out the desktop theme toggle button:
```tsx
{/* VALIDATION TEST - COMMENT THIS OUT
<button
  onClick={toggleTheme}
  aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
  className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full border border-[var(--navbar-icon-border)] text-[var(--navbar-icon-color)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
>
  {theme === "light" ? (
    <Moon size={16} aria-hidden="true" />
  ) : (
    <Sun size={16} aria-hidden="true" />
  )}
</button>
*/}
```

**Run:**
```bash
npm run test:e2e -- theme-customization --project=chromium -g "user can toggle theme from light to dark"
```

**Expected result:** Test FAILS ❌ with error mentioning button not found

**Restore:** Uncomment the button and verify test passes again

---

#### Option B: Break Persistence

**File:** `src/theme/ThemeProvider.tsx` (line ~141)

**Change:** Comment out localStorage write:
```tsx
const setTheme = useCallback((next: Theme) => {
  hasExplicitChoiceRef.current = true;
  try {
    // VALIDATION TEST - COMMENT THIS OUT
    // window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Ignore persistence failures; in-memory state still updates the UI.
  }
  setThemeState(next);
}, []);
```

**Run:**
```bash
npm run test:e2e -- theme-customization --project=chromium -g "persists"
```

**Expected result:** Test FAILS ❌ after page reload

**Restore:** Uncomment the line and verify test passes again

---

### ☐ 4. Verify CI Integration

**Check the workflow file:**
```bash
cat .github/workflows/ci.yml
```

**Confirm these steps exist:**
```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps chromium firefox

- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true
```

### ☐ 5. Test in CI Environment (Optional but Recommended)

If you have CI access, create a draft PR and verify:
- [ ] E2E tests run automatically
- [ ] Tests appear in CI logs
- [ ] Tests must pass for PR to be mergeable

### ☐ 6. Review Documentation

Ensure these files are present and accurate:

- [ ] `e2e/theme-customization.spec.ts` - Test implementation
- [ ] `e2e/THEME_TEST_QUICK_REFERENCE.md` - Quick commands
- [ ] `THEME_E2E_TEST_VALIDATION.md` - Full validation guide
- [ ] `THEME_E2E_IMPLEMENTATION_SUMMARY.md` - What was delivered
- [ ] `e2e/README.md` - Updated with theme test section

## Post-Merge Verification

After merging:

### ☐ 1. Verify CI Passes on Main Branch

Check that the main branch CI run includes and passes the E2E tests.

### ☐ 2. Test on a Fresh PR

Create a small PR (like a README change) and verify:
- [ ] E2E tests run automatically
- [ ] All tests pass
- [ ] PR checks show green ✅

### ☐ 3. Share with Team

Notify team members about:
- New E2E coverage for theme flow
- Quick reference: `e2e/THEME_TEST_QUICK_REFERENCE.md`
- How to run: `npm run test:e2e -- theme-customization`

## Troubleshooting

### "Playwright not found"
```bash
npm ci
npx playwright install chromium firefox
```

### "Port already in use"
```bash
# Set custom port
PLAYWRIGHT_PORT=5174 npm run test:e2e -- theme-customization
```

### "Test timeout"
Increase timeout in `playwright.config.ts`:
```typescript
timeout: 60_000,  // 60 seconds
```

### "Flaky tests"
- Add `await page.waitForLoadState('networkidle')` after navigation
- Increase `expect.timeout` in config
- Check for race conditions in theme initialization

## Sign-Off

Before marking this task complete:

- [ ] All 9 theme tests pass locally
- [ ] At least one validation scenario confirmed (test fails when flow breaks)
- [ ] CI workflow includes E2E test step
- [ ] Documentation is complete and accurate
- [ ] Team is notified about new coverage

**Signed off by:** _________________  
**Date:** _________________

## Questions or Issues?

Refer to:
- Quick help: `e2e/THEME_TEST_QUICK_REFERENCE.md`
- Full guide: `THEME_E2E_TEST_VALIDATION.md`
- Implementation details: `THEME_E2E_IMPLEMENTATION_SUMMARY.md`
