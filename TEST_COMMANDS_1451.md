# Test Commands for Issue #1451

## Quick Test (Recommended First)

Run only the link security tests:

```bash
cd Fluxora-Frontend
pnpm vitest run src/utils/__tests__/linkSecurity.test.ts
```

**Expected Output:**
```
✓ src/utils/__tests__/linkSecurity.test.ts (60+ tests)
  ✓ linkSecurity
    ✓ ALLOWED_PROTOCOLS constant
    ✓ SAFE_LINK_ATTRS constant
    ✓ validateSafeUrl
      ✓ valid HTTPS URLs
      ✓ valid mailto URLs
      ✓ dangerous javascript: scheme
      ✓ dangerous data: scheme
      ✓ dangerous file: scheme
      ✓ other dangerous schemes
      ✓ relative URLs
      ✓ edge cases and invalid inputs
    ✓ sanitizeExternalUrl
    ✓ isSafeExternalLink
    ✓ getSafeLinkProps
    ✓ safeWindowOpen
    ✓ integration: stream metadata and receipt scenarios

Test Files  1 passed (1)
     Tests  60+ passed (60+)
```

---

## Full Test Suite with Coverage

Run all tests with coverage report:

```bash
cd Fluxora-Frontend
pnpm vitest run src --coverage
```

This will:
- Run all unit tests including the new security tests
- Generate coverage report for all source files
- Show coverage for `src/utils/linkSecurity.ts` (should be 100%)

---

## Affected Component Tests

Test the components that were modified:

```bash
cd Fluxora-Frontend

# Receipt component tests
pnpm vitest run src/components/receipt/

# Stream components tests
pnpm vitest run src/components/Streams/

# Navigation component tests
pnpm vitest run src/components/navigation/

# All component tests
pnpm vitest run src/components/
```

---

## End-to-End Tests

Test the full user flows:

```bash
cd Fluxora-Frontend

# All E2E tests
pnpm test:e2e

# Just accessibility tests
pnpm test:a11y

# Specific E2E test
pnpm test:e2e -- receipt
```

---

## Watch Mode (Development)

Run tests in watch mode while developing:

```bash
cd Fluxora-Frontend
pnpm test:watch src/utils/__tests__/linkSecurity.test.ts
```

---

## Linting and Type Checking

Ensure code quality:

```bash
cd Fluxora-Frontend

# TypeScript compilation
pnpm build

# ESLint
pnpm lint

# Prettier formatting check
pnpm format:check
```

---

## Complete Pre-Merge Checklist

Run all checks before merging:

```bash
cd Fluxora-Frontend

# 1. Run all unit tests with coverage
pnpm vitest run src --coverage

# 2. Run E2E tests
pnpm test:e2e

# 3. Run accessibility tests
pnpm test:a11y

# 4. Lint check
pnpm lint

# 5. Format check
pnpm format:check

# 6. Build production bundle
pnpm build

# 7. Check bundle size
pnpm build:report
```

---

## Troubleshooting

### If pnpm is not installed:

```bash
# Install pnpm globally
npm install -g pnpm

# Or use npm directly (slower)
npm test
```

### If tests fail to run:

```bash
# Clean and reinstall dependencies
rm -rf node_modules
pnpm install

# Or
rm -rf node_modules
npm install
```

### If coverage is low:

```bash
# Run coverage with detailed report
pnpm vitest run src/utils/__tests__/linkSecurity.test.ts --coverage --reporter=verbose
```

---

## Performance Benchmarking

Test the validation performance:

```javascript
// Run in browser console after starting dev server
const { validateSafeUrl } = await import('/src/utils/linkSecurity.ts');

console.time('validate-1000-urls');
for (let i = 0; i < 1000; i++) {
  validateSafeUrl('https://stellar.expert/explorer/public/tx/abc123');
}
console.timeEnd('validate-1000-urls');
// Expected: < 10ms
```

---

## Manual Browser Testing

1. Start development server:
```bash
cd Fluxora-Frontend
pnpm dev
```

2. Open browser to http://localhost:5173

3. Test scenarios:
   - Create a stream → Check receipt modal → Click explorer link
   - Connect wallet → Open wallet menu → Click "View in Explorer"
   - Navigate to Streams page → Click "View in explorer" on a stream
   - Open browser console → Check for no errors

4. Security testing in console:
```javascript
// Should block
const { safeWindowOpen } = await import('/src/utils/linkSecurity.ts');
safeWindowOpen('javascript:alert(1)'); // Should return null and log warning
safeWindowOpen('data:text/html,<script>alert(1)</script>'); // Should return null
safeWindowOpen('file:///etc/passwd'); // Should return null

// Should allow
safeWindowOpen('https://stellar.expert'); // Should open new tab
safeWindowOpen('mailto:hello@fluxora.xyz'); // Should open email client
```

---

## CI/CD Pipeline Commands

For GitHub Actions or CI environment:

```yaml
# .github/workflows/pr-checks.yml
- name: Install dependencies
  run: pnpm install

- name: Run link security tests
  run: pnpm vitest run src/utils/__tests__/linkSecurity.test.ts --coverage

- name: Run all unit tests
  run: pnpm vitest run src --coverage

- name: Run E2E tests
  run: pnpm test:e2e

- name: Lint
  run: pnpm lint

- name: Build
  run: pnpm build
```

---

## Expected Test Results Summary

### Unit Tests
- ✅ 60+ tests in linkSecurity.test.ts
- ✅ 100% coverage for src/utils/linkSecurity.ts
- ✅ All existing tests still pass
- ✅ No test regressions

### E2E Tests
- ✅ Receipt modal opens and displays correctly
- ✅ Stream creation flow completes
- ✅ Explorer links open in new tabs
- ✅ Wallet navigation works

### Build
- ✅ TypeScript compiles without errors
- ✅ No ESLint warnings
- ✅ Bundle size increase < 3KB
- ✅ Production build succeeds

---

## Questions or Issues?

If tests fail or you encounter issues:

1. Check this document's troubleshooting section
2. Review `ISSUE_1451_VERIFICATION.md` for detailed test scenarios
3. Check PR description at https://github.com/damiedee96/Fluxora-Frontend/pull/1
4. Contact the developer who implemented this (check git blame)

---

**Quick Start:**
```bash
cd Fluxora-Frontend
pnpm vitest run src/utils/__tests__/linkSecurity.test.ts
```

If all tests pass, the implementation is working correctly! ✅
