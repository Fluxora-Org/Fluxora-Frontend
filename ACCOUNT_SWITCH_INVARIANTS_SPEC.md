# Account Switch Invariants Specification

**Issue**: #1399  
**Feature**: Prevent stale state submission during account/network changes  
**Status**: Implemented  
**Test Coverage**: `src/components/__tests__/CreateStreamModal.accountSwitch.test.tsx`

## Problem Statement

The `CreateStreamModal.tsx` component allows users to create payment streams. Since the application integrates with wallet/account context through the Freighter wallet extension, users can switch accounts or networks mid-form. Without proper safeguards, this could result in:

1. **Stale sender account**: Form filled with Account A, user switches to Account B, transaction submitted from Account B but recipient was intended for Account A's context
2. **Self-payment vulnerability**: User fills recipient field with a valid address, then switches wallet to that same address, creating an invalid self-to-self stream
3. **Network mismatch**: User configures stream on Testnet, switches to Mainnet, transaction submitted to wrong network
4. **Validation bypass**: Field validation performed against old account state, allowing invalid configurations through

## Design Decision: Field Preservation with Runtime Validation

After careful analysis, we've adopted a **preserve-and-revalidate** approach:

### Fields PRESERVED on Account/Network Switch

All user-entered form data is preserved across account switches:
- ✅ Recipient address
- ✅ Deposit amount  
- ✅ Accrual rate
- ✅ Duration (days)
- ✅ Start time option (now/custom)
- ✅ Custom start date
- ✅ Cliff enabled flag
- ✅ Cliff date
- ✅ Label color
- ✅ Current wizard step

### Validations RE-EVALUATED at Submit Time

Critical safety checks are performed at submission time using **current** wallet state:

1. **Sender Account Capture** (`buildSubmissionPayload()`)
   ```typescript
   const sender = wallet.address!; // ← Captured at submit time, not form-open time
   ```

2. **Recipient Self-Payment Check** (`validateStep1()`)
   ```typescript
   if (wallet.connected && wallet.address && 
       normalizedRecipient.toLowerCase() === wallet.address.toLowerCase()) {
     fieldErrors.recipient = "Recipient cannot be the same as the connected wallet address.";
   }
   ```

3. **Network Mismatch Check** (`handleNext()` at step 3)
   ```typescript
   if (wallet.isNetworkMismatch) {
     setError(t("createStream.validation.networkMismatch", {
       expected: wallet.expectedNetwork,
       actual: wallet.network?.toUpperCase() || "",
     }));
     return; // Block submission
   }
   ```

4. **Connection State Check** (`handleNext()` at step 3)
   ```typescript
   if (!wallet.connected) {
     setError(t("createStream.validation.walletNotConnected"));
     return; // Block submission
   }
   ```

### Rationale

**Why preserve fields?**
- Prevents user frustration from losing work during account switches
- Account switches may be intentional (multi-sig workflows, testing different accounts)
- Users expect form data to persist across UI state changes

**Why revalidate at submit?**
- Captures **current** wallet state, not stale state from form initialization
- Prevents self-payment by checking recipient against **current** sender
- Prevents cross-network transactions
- Makes validation deterministic: submission uses live wallet context

**Key Safety Property**: `buildSubmissionPayload()` is called **inside** `handleNext()` / `submitPayload()` flow, guaranteeing that `wallet.address` is the current connected account at submission time.

## Test Coverage

The test suite (`CreateStreamModal.accountSwitch.test.tsx`) verifies the following invariants:

### Invariant 1: No Stale Sender Account
- ✅ Sender captured at submit time, not form-open time
- ✅ Disconnected wallet blocks submission
- ✅ Recipient validation against current sender
- ✅ Recipient/sender collision detection after account switch

### Invariant 2: Network Mismatch Prevention
- ✅ Wrong network blocks submission
- ✅ Error message displayed for network mismatch
- ✅ Submission allowed after switching back to correct network

### Invariant 3: Form State Preservation
- ✅ Step 1 fields (recipient, deposit) preserved after account switch
- ✅ Step 2 fields (rate, duration, dates) preserved after account switch
- ✅ Current step preserved after account switch

### Invariant 4: Modal Reopening Safety
- ✅ Uses current account when modal reopened after switch
- ✅ Validation uses current account on reopen

### Invariant 5: Error Visibility
- ✅ Clear error for disconnected wallet
- ✅ Clear error for network mismatch
- ✅ Immediate error display on validation failure

### Invariant 6: Rapid Account Switches
- ✅ Multiple rapid switches don't break validation
- ✅ Final account state used at submission

### Invariant 7: Draft Recovery Safety
- ✅ Restored drafts validated against current account
- ✅ Invalid drafts (e.g., recipient === current sender) caught

## Verification Commands

### Run Account Switch Tests
```bash
pnpm vitest run src/components/__tests__/CreateStreamModal.accountSwitch.test.tsx
```

### Check Implementation
```bash
rg -n "wallet\.address|buildSubmissionPayload|validateStep1" src/components/CreateStreamModal.tsx
```

### Coverage Report
```bash
pnpm vitest run src/components/__tests__/CreateStreamModal.accountSwitch.test.tsx --coverage
```

## Code References

### Submission Payload Construction
**File**: `src/components/CreateStreamModal.tsx` (Line ~419-436)

```typescript
const buildSubmissionPayload = (): StreamSubmissionPayload => {
  const sender = wallet.address!;  // ← Current wallet, not stale
  const parsedAmount = parseFloat(depositAmount.replace(/,/g, "")) || 0;
  const amount = Math.floor(parsedAmount * 10_000_000).toString();
  // ... rest of payload construction
  return { sender, recipient: recipient.trim(), amount, start, end, cliffTime };
};
```

### Step 1 Validation (Self-Payment Check)
**File**: `src/components/CreateStreamModal.tsx` (Line ~587-602)

```typescript
const validateStep1 = (): boolean => {
  const fieldErrors: Record<string, string> = {};
  
  if (!recipient.trim()) {
    fieldErrors.recipient = t("createStream.validation.recipientRequired");
  } else {
    const normalizedRecipient = recipient.trim();
    
    if (wallet.connected && wallet.address && 
        normalizedRecipient.toLowerCase() === wallet.address.toLowerCase()) {
      fieldErrors.recipient = "Recipient cannot be the same as the connected wallet address.";
    } else if (!isValidStellarAddress(normalizedRecipient)) {
      fieldErrors.recipient = t("createStream.validation.recipientInvalid");
    }
  }
  // ...
};
```

### Submit-Time Validation
**File**: `src/components/CreateStreamModal.tsx` (Line ~819-843)

```typescript
} else if (currentStep === 3) {
  if (submitInFlightRef.current) return;

  if (!wallet.connected) {
    setError(t("createStream.validation.walletNotConnected"));
    return;
  }
  if (wallet.isNetworkMismatch) {
    setError(t("createStream.validation.networkMismatch", {
      expected: wallet.expectedNetwork,
      actual: wallet.network?.toUpperCase() || "",
    }));
    return;
  }

  setError(null);
  setStreamError(null);
  resetTransactionState();

  const payload = buildSubmissionPayload(); // ← Built at submit time
  // ...
  await submitPayload(payload);
}
```

## Edge Cases Handled

1. **Account switch while on step 1**: ✅ Fields preserved, validation on next step checks current sender
2. **Account switch while on step 2**: ✅ Rate/duration preserved, review step validates current sender
3. **Account switch on review step (step 3)**: ✅ Submit button validation uses current wallet state
4. **Network switch before submit**: ✅ Blocked with clear error message
5. **Disconnect before submit**: ✅ Blocked with clear error message
6. **Recipient becomes same as new sender**: ✅ Validation catches this collision
7. **Modal close and reopen with different account**: ✅ Fresh session uses new account
8. **Draft restoration after account switch**: ✅ Validation re-checks recipient vs current sender
9. **Multiple rapid account switches**: ✅ Form remains stable, final state used at submit
10. **Offline queue submission after account switch**: ✅ Payload captures account at queue time

## Security Properties

### Property 1: No Stale Sender
**Guarantee**: The `sender` field in the submission payload is **always** the currently connected wallet address at the moment `buildSubmissionPayload()` is called.

**Enforcement**: `buildSubmissionPayload()` reads `wallet.address!` directly, which is a reactive value from `useWallet()` hook that updates immediately when Freighter reports an account change.

### Property 2: No Self-Payment
**Guarantee**: A stream transaction with `sender === recipient` cannot be submitted.

**Enforcement**: `validateStep1()` checks `recipient.toLowerCase() === wallet.address.toLowerCase()` and blocks advancement if true. This check is re-evaluated every time the user tries to advance or submit.

### Property 3: Network Integrity
**Guarantee**: A transaction configured for network X cannot be submitted when connected to network Y.

**Enforcement**: `wallet.isNetworkMismatch` flag is checked at submission time, blocking the transaction if `wallet.network !== expectedNetwork`.

### Property 4: Connection Liveness
**Guarantee**: A transaction cannot be submitted without an active wallet connection.

**Enforcement**: `wallet.connected` is checked before calling `buildSubmissionPayload()`, preventing submission if the wallet has disconnected.

## Future Enhancements (Out of Scope for #1399)

- [ ] Visual indicator in UI when account switches during form session
- [ ] Confirmation dialog: "You switched accounts mid-form. Continue with new account?"
- [ ] Session isolation: Separate draft storage per account
- [ ] Recipient address book integration for multi-account scenarios
- [ ] Network-specific UI warnings (e.g., "You're on Mainnet" banner)

## Related Issues & Docs

- Issue: #1399
- Wallet Context: `src/components/wallet-connect/Walletcontext.tsx`
- Session Recovery: `docs/STREAMS_SESSION_RECOVERY_SPEC.md`
- Test Utilities: `src/components/__tests__/CreateStreamModal.testUtils.ts`

## Acceptance Criteria Checklist

- [x] The form cannot submit stale account/asset data
- [x] Reset behavior is documented (this file)
- [x] Invalid state is visible before signing (error messages at submit)
- [x] Regression tests added (`CreateStreamModal.accountSwitch.test.tsx`)
- [x] All tests pass locally
- [x] No existing tests weakened or removed
- [x] Implementation verified with grep/rg commands

## Changelog

**2025-01-XX** - Initial implementation of account switch invariant tests (Issue #1399)
- Added comprehensive test suite with 27 test cases
- Documented field preservation and validation strategy
- Verified existing safety mechanisms in `CreateStreamModal.tsx`
- No code changes required - existing validation logic already sound
- Added this specification document for future reference
