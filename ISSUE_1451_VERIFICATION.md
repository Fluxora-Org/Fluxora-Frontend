# Issue #1451 Verification Checklist

## Automated Tests

### Unit Tests
Run the link security test suite:
```bash
pnpm vitest run src/utils/__tests__/linkSecurity.test.ts --coverage
```

**Expected Results:**
- ✅ All tests pass (60+ test cases)
- ✅ 100% statement coverage for `src/utils/linkSecurity.ts`
- ✅ 100% branch coverage
- ✅ 100% function coverage

### Integration Tests
Run component tests to ensure no regressions:
```bash
pnpm vitest run src/components/receipt/__tests__
pnpm vitest run src/components/Streams/__tests__
```

### E2E Tests
Run end-to-end tests for affected flows:
```bash
pnpm test:e2e
```

**Critical Paths:**
- ✅ Receipt modal displays and downloads correctly
- ✅ Stream creation flow completes successfully
- ✅ Explorer links open in new tabs
- ✅ Wallet connection and explorer navigation works

## Manual Testing Scenarios

### 1. Transaction Receipt Explorer Links

**Test Case:** Valid transaction explorer link
1. Create a new stream
2. View the transaction receipt in the success modal
3. Click the "Explorer" link

**Expected:**
- ✅ Link opens https://stellar.expert/explorer/{network}/tx/{hash}
- ✅ Opens in new tab with `target="_blank"`
- ✅ No console warnings

---

**Test Case:** Simulated malicious javascript: URL
1. In browser DevTools, inject malicious URL:
   ```js
   // In TransactionReceiptPreview component
   buildReceiptExplorerUrl = () => 'javascript:alert("XSS")';
   ```
2. View receipt

**Expected:**
- ✅ Link is blocked
- ✅ Shows "Explorer unavailable" fallback
- ✅ Console warning: `[LinkSecurity] Blocked unsafe URL: javascript:alert("XSS")`
- ✅ No alert dialog appears

---

**Test Case:** Simulated data: URL
1. Inject malicious data URL:
   ```js
   buildReceiptExplorerUrl = () => 'data:text/html,<script>alert(1)</script>';
   ```
2. View receipt

**Expected:**
- ✅ Link is blocked
- ✅ Shows "Explorer unavailable" fallback
- ✅ Console warning logged
- ✅ No script execution

---

### 2. Stream Creation Modal

**Test Case:** Share link validation
1. Create a new stream
2. View the stream URL in the share preview

**Expected:**
- ✅ Stream URL is a valid HTTPS link
- ✅ Link opens correctly
- ✅ Has `rel="noopener noreferrer"` attribute

---

**Test Case:** Popup blocker fallback
1. Enable popup blocker in browser
2. Create a new stream
3. Try to view stream (popup blocked)
4. Use fallback link

**Expected:**
- ✅ Fallback link appears
- ✅ Fallback link validated with `getSafeLinkProps()`
- ✅ Clicking fallback opens in new tab

---

### 3. Wallet Explorer Navigation

**Test Case:** Account explorer from wallet dropdown
1. Connect wallet
2. Open wallet dropdown menu
3. Click "View in Explorer"

**Expected:**
- ✅ Opens https://stellar.expert/explorer/{network}/account/{address}
- ✅ Uses `safeWindowOpen()`
- ✅ New tab with secure attributes

---

**Test Case:** Account explorer from AppNavbar
1. Connect wallet
2. Click wallet address in navbar
3. Click "View on Explorer" in menu

**Expected:**
- ✅ Opens account page on stellar.expert
- ✅ Uses `safeWindowOpen()`
- ✅ No console errors

---

### 4. Stream List Explorer Links

**Test Case:** Recipient explorer link
1. Navigate to Streams page
2. Find a stream card
3. Click "View in explorer" button

**Expected:**
- ✅ Opens recipient account on stellar.expert
- ✅ Link validated with `getSafeLinkProps()`
- ✅ Opens in new tab

---

**Test Case:** Stream row context menu
1. Right-click or click menu on a stream row
2. Select "View Recipient on Explorer"

**Expected:**
- ✅ Opens recipient account page
- ✅ Uses `safeWindowOpen()`
- ✅ Menu closes after click

---

### 5. Edge Cases

**Test Case:** Empty or null URL
1. Simulate empty explorer URL (e.g., network configuration error)
2. View affected component

**Expected:**
- ✅ Link disabled or hidden
- ✅ Fallback UI shown
- ✅ No runtime errors

---

**Test Case:** Malformed URL
1. Simulate malformed URL (e.g., `https://[invalid`)
2. View affected component

**Expected:**
- ✅ URL validation fails
- ✅ Fallback UI shown
- ✅ No console errors (validation handles gracefully)

---

**Test Case:** Relative URL
1. Simulate relative URL (e.g., `/app/streams`)
2. Check validation behavior

**Expected:**
- ✅ `validateSafeUrl()` returns null
- ✅ Relative URLs handled separately by React Router
- ✅ External link utilities reject them

---

## Security Verification

### Protocol Blocking Tests

Run in browser console to verify runtime blocking:

```js
// Test javascript: blocking
window.testSecurity = () => {
  const { safeWindowOpen } = await import('/src/utils/linkSecurity.ts');
  
  // Should block
  console.assert(safeWindowOpen('javascript:alert(1)') === null, 'javascript: blocked');
  console.assert(safeWindowOpen('data:text/html,<script>alert(1)</script>') === null, 'data: blocked');
  console.assert(safeWindowOpen('file:///etc/passwd') === null, 'file: blocked');
  
  // Should allow
  console.assert(safeWindowOpen('https://stellar.expert') !== null, 'https: allowed');
  console.assert(safeWindowOpen('mailto:hello@fluxora.xyz') !== null, 'mailto: allowed');
  
  console.log('✅ All security assertions passed');
};

window.testSecurity();
```

**Expected:**
- ✅ All assertions pass
- ✅ Console warnings for blocked URLs
- ✅ No errors thrown

---

### Link Attribute Verification

Inspect generated HTML for external links:

```js
// Check all external links have safe attributes
const externalLinks = document.querySelectorAll('a[target="_blank"]');
externalLinks.forEach(link => {
  const rel = link.getAttribute('rel');
  console.assert(
    rel && rel.includes('noopener') && rel.includes('noreferrer'),
    `Link ${link.href} has safe rel attribute`
  );
});
console.log(`✅ Verified ${externalLinks.length} external links`);
```

**Expected:**
- ✅ All external links have `rel="noopener noreferrer"`
- ✅ All external links have `target="_blank"`

---

## Performance Verification

### Bundle Size Impact

Check build output:
```bash
pnpm build:report
```

**Expected:**
- ✅ `linkSecurity.ts` adds < 3KB minified+gzipped
- ✅ No significant increase in main bundle
- ✅ Tree-shakeable exports work correctly

---

### Runtime Performance

Test validation overhead:
```js
// Performance test
const { validateSafeUrl } = await import('/src/utils/linkSecurity.ts');

console.time('validate-1000-urls');
for (let i = 0; i < 1000; i++) {
  validateSafeUrl('https://stellar.expert/explorer/public/tx/abc123');
}
console.timeEnd('validate-1000-urls');
```

**Expected:**
- ✅ < 10ms for 1000 validations (native URL constructor is fast)
- ✅ No memory leaks
- ✅ No frame drops during navigation

---

## Regression Testing

### Existing Functionality

Verify no regressions in:

- ✅ Stream creation flow (all steps)
- ✅ Stream list and filtering
- ✅ Wallet connection and disconnection
- ✅ Receipt download functionality
- ✅ Theme switching
- ✅ Navigation between pages
- ✅ Form validation
- ✅ Toast notifications

---

### Accessibility

Run a11y tests:
```bash
pnpm test:a11y
```

**Expected:**
- ✅ No new a11y violations
- ✅ Links still keyboard navigable
- ✅ Focus management unchanged
- ✅ Screen reader announcements work

---

## Coverage Report

Generate coverage report:
```bash
pnpm test:coverage
```

**Expected Coverage:**
- ✅ `src/utils/linkSecurity.ts`: 100% (statements, branches, functions, lines)
- ✅ Updated components: No decrease in coverage
- ✅ Overall project coverage: Maintained or improved

---

## Sign-Off

### Developer
- [ ] All unit tests pass locally
- [ ] All manual test scenarios verified
- [ ] No console errors in development build
- [ ] TypeScript compilation succeeds
- [ ] ESLint passes with no warnings
- [ ] Git commit follows conventional commits format

### Reviewer
- [ ] Code review completed
- [ ] Security implications understood
- [ ] Test coverage adequate
- [ ] No performance concerns
- [ ] Documentation clear

### QA
- [ ] Manual testing completed on staging
- [ ] All scenarios in checklist verified
- [ ] No regressions found
- [ ] Edge cases handled gracefully

---

## Deployment Notes

**Rollback Plan:**
- Simple git revert (no database migrations)
- No API changes
- No breaking changes to existing functionality

**Monitoring:**
- Watch for console warnings `[LinkSecurity] Blocked unsafe URL`
- Monitor error rates for affected components
- Track user reports of broken links

**Hotfix Readiness:**
- If legitimate URLs are blocked, can quickly add to allowed protocols
- Fallback UI ensures no broken user experience
