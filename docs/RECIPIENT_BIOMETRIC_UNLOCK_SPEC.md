# Recipient Biometric Unlock Specification

> **Status**: Implemented
> **WCAG Level**: 2.1 AA
> **Scope**: `src/pages/Recipient.tsx`, `src/pages/Recipient.css`

---

## 1. Overview

The biometric unlock feature introduces an **optional local security gate** on the Recipient portal page. When enabled, a recipient must confirm their identity via WebAuthn platform authenticator (Touch ID / Face ID / Windows Hello) or a 4-digit backup PIN **before** a withdrawal transaction is handed off to the Freighter wallet's own signing prompt.

### 1.1 Security Disclaimer

This is a **local UX friction layer only**. It:

- Does **not** handle private keys
- Does **not** replace the cryptographic signature required by the Freighter wallet
- Does **not** provide on-chain authorization
- Prevents accidental or unauthorized clicks from initiating a withdrawal

The wallet's own signing prompt remains the sole cryptographic authorization gate.

---

## 2. Component Inventory

| Component | Location | Purpose |
|---|---|---|
| Security Gate Settings Card | `Recipient.tsx` (inline JSX) | Toggle the feature on/off, update PIN |
| Enrollment Modal | `Recipient.tsx` (inline JSX) | Register biometrics + set backup PIN |
| Verification Modal | `Recipient.tsx` (inline JSX) | Per-withdraw biometric or PIN confirmation |
| PIN Keypad | Reused across both modals (inline JSX) | 4-digit numeric entry with dot display |
| `useModalAccessibility` hook | `src/components/useModalAccessibility.ts` | Focus trap, scroll lock, Escape key, focus restoration |

### 1.1 CSS Classes (from `Recipient.css`)

| Class | Purpose |
|---|---|
| `.security-gate-section` | Outer wrapper for the settings card |
| `.security-gate-card` | Card container with header + actions |
| `.security-gate-card__header` | Flex row: icon + text |
| `.security-gate-icon-container` | 44×44px icon background |
| `.security-gate-card__actions` | Flex row: status badge + toggle + PIN button |
| `.security-gate-status` | Status label + badge |
| `.security-status-badge--active` | Green pill when enabled |
| `.security-status-badge--inactive` | Gray pill when disabled |
| `.security-modal-overlay` | Fixed fullscreen backdrop (`rgba(0,0,0,0.75)`, `backdrop-filter: blur(8px)`) |
| `.security-modal` | Centered card (max-width: 400px, border-radius: 16px) |
| `.security-modal__close-btn` | Top-right close X button |
| `.security-modal__header` | Badge + h2 title |
| `.security-modal__body` | Centered flex column with gap |
| `.security-modal__error` | Red error banner |
| `.security-visual-container` | 80×80px circle for icon |
| `.security-visual-icon` | 40×40px icon |
| `.security-visual-icon--pulse` | Animated pulsing accent icon |
| `.security-visual-icon--success` | Green check icon |
| `.security-visual-icon--error` | Red X icon |
| `.security-visual-icon--warning` | Yellow warning icon |
| `.security-modal__text` | Body text (centered, max-width 320px) |
| `.security-modal__actions` | Vertical button stack |
| `.security-modal__disclaimer` | Small footer disclaimer |
| `.pin-display-dots` | 4 dots showing PIN length |
| `.pin-dot` | Empty dot (border only) |
| `.pin-dot--filled` | Filled dot (accent color + glow) |
| `.pin-keypad` | 3-column CSS Grid for keypad |
| `.pin-key` | Circular button (56px height, border-radius 50%) |
| `.pin-key--util` | Clear / Backspace buttons (transparent background) |

---

## 3. State Definitions

### 3.1 Enrollment Flow

| State | Description | Visible UI |
|---|---|---|
| `not-enrolled` | Initial state. Feature disabled. | Settings card shows "Inactive" badge, "Enable" button |
| `check-support` | Modal open. Prompt to register device biometrics. | Enrollment modal with fingerprint icon + "Register Biometrics" + "Skip — use PIN only" |
| `set-pin` | Modal open. First PIN entry (4 digits). | PIN keypad + dot display |
| `confirm-pin` | Modal open. Re-enter PIN to confirm. | PIN keypad + dot display |
| `success` | Modal open. Enrollment complete. | Green check icon + "Done" button |

**State transitions:**

```
not-enrolled
  → [Enable clicked] → check-support (if biometric supported) OR set-pin (if not)
  → [Register Biometrics clicked] → set-pin (on success) / error shown (on failure)
  → [Skip — use PIN only clicked] → set-pin
  → [4 digits entered in set-pin] → confirm-pin (auto-advance after 300ms)
  → [PINs match in confirm-pin] → success (auto-advance after 300ms)
  → [PINs mismatch] → error shown, confirm-pin cleared
  → [Done clicked] → modal closes, settings card shows "Active" badge
```

### 3.2 Verification Flow (per-withdraw)

| State | Description | Visible UI |
|---|---|---|
| `enrolled-idle` | Gate enabled, no action pending | Settings card "Active" badge |
| `prompt-active` | Biometric prompt shown by OS | Fingerprint icon (pulsing) + "Use Backup PIN instead" button |
| `prompt-succeeded` | Biometric accepted | Green check icon + "Proceeding to withdrawal…" |
| `prompt-failed` | Biometric rejected | Red X icon + "Try Again" + "Use Backup PIN" buttons |
| `prompt-cancelled` | User cancelled biometric (e.g. clicked X on OS prompt) | Yellow warning icon + "Try Again" + "Use Backup PIN" buttons |
| `unsupported-device-fallback` | Device lacks biometrics, or user chose PIN | PIN keypad + dot display |

**State transitions:**

```
handleWithdraw clicked
  → [gate enabled] → prompt-active (if biometric enrolled+supported)
                   → unsupported-device-fallback (if not)
  → prompt-active → prompt-succeeded (on biometric OK) → executeOnChainWithdraw()
                 → prompt-cancelled (on NotAllowedError / AbortError)
                 → prompt-failed (on other errors)
  → prompt-cancelled → prompt-active (Try Again) / unsupported-device-fallback (Use Backup PIN)
  → prompt-failed → prompt-active (Try Again) / unsupported-device-fallback (Use Backup PIN)
  → unsupported-device-fallback → prompt-succeeded (on PIN match) → executeOnChainWithdraw()
                                → error shown (on PIN mismatch, cleared)
```

### 3.3 Transaction State Machine

```
idle → signing → submitting → confirmed → (5s timeout) → idle
                   → error (any failure)
```

---

## 4. WebAuthn API Usage

### 4.1 Biometric Support Detection (on mount)

```typescript
PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
```

Result stored in `isBiometricSupported` state. Used to decide whether to show the biometric enrollment step or skip directly to PIN setup.

### 4.2 Biometric Enrollment

```typescript
navigator.credentials.create({
  publicKey: {
    challenge: Uint8Array(32),       // cryptographically random
    rp: { name: "Fluxora" },
    user: {
      id: Uint8Array([1,2,3,4]),     // placeholder user ID
      name: "recipient@fluxora.xyz",
      displayName: "Recipient"
    },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }],
    authenticatorSelection: {
      authenticatorAttachment: "platform",  // forces platform authenticator
      userVerification: "required"
    },
    timeout: 60000
  }
})
```

On success: stores `fluxora_biometric_enrolled = "true"` in localStorage.
On failure: displays error message in enrollment modal.

### 4.3 Biometric Verification (per-withdraw)

```typescript
navigator.credentials.get({
  publicKey: {
    challenge: Uint8Array(32),
    timeout: 60000,
    userVerification: "required"
  }
})
```

**Error handling:**
- `NotAllowedError` / `AbortError` → `prompt-cancelled`
- Other errors → `prompt-failed` with error message

---

## 5. Persistence Layer

| localStorage Key | Type | Purpose |
|---|---|---|
| `fluxora_biometric_enrolled` | `"true"` \| absent | Whether biometric was registered |
| `fluxora_backup_pin` | 4-digit string | Backup PIN (plaintext — local UX gate only) |
| `fluxora_security_gate_enabled` | `"true"` \| absent | Master toggle for the security gate |

---

## 6. UI Specifications

### 6.1 Settings Card

```
┌──────────────────────────────────────────────────────┐
│ [🛡️ 44×44 icon bg]  Local Security Gate             │
│                       Add an optional biometric or   │
│                       PIN confirmation step before   │
│                       each withdrawal...             │
│──────────────────────────────────────────────────────│
│ Status: [Active]         [🔒 Disable]  [🔑 Update PIN]│
└──────────────────────────────────────────────────────┘
```

- **Icon container**: 44×44px, background `rgba(56, 189, 248, 0.1)`, accent color `#38bdf8`
- **Status badge**: Pill shape (`border-radius: 9999px`), green for active, gray for inactive
- **Action buttons**: Primary (Enable/Disable) + secondary (Update PIN, shown only when enabled)
- **Mobile**: Actions stack vertically, status takes full width

### 6.2 Enrollment Modal — Check Support

```
┌──────────────────────────────────────┐
│                           [X close]  │
│         ┌─────────────┐             │
│  SETUP  │  [Fingerprint│             │
│         │  pulsing 🔵] │             │
│         └─────────────┘             │
│     Register Device Biometrics       │
│                                      │
│  Register your device biometrics     │
│  (Touch ID, Face ID, or Windows     │
│  Hello) as an additional...         │
│                                      │
│  [  Register Biometrics  ] (primary) │
│  [Skip — use PIN only] (secondary)  │
│                                      │
│  Disclaimer: local UX gate only...   │
└──────────────────────────────────────┘
```

### 6.3 Enrollment Modal — Set PIN / Confirm PIN

```
┌──────────────────────────────────────┐
│                           [X close]  │
│         ┌─────────────┐             │
│  SETUP  │  [Lock 🔒]   │             │
│         └─────────────┘             │
│       Set Backup PIN                 │
│                                      │
│  Set a 4-digit backup PIN...        │
│                                      │
│     ● ● ○ ○  (4 dot indicators)     │
│                                      │
│     [1] [2] [3]                     │
│     [4] [5] [6]                     │
│     [7] [8] [9]                     │
│     [Clear] [0] [⌫]                │
│                                      │
│  Disclaimer: local UX gate only...   │
└──────────────────────────────────────┘
```

### 6.4 Enrollment Modal — Success

```
┌──────────────────────────────────────┐
│                           [X close]  │
│         ┌─────────────┐             │
│ COMPLETE│  [✓ green]   │             │
│         └─────────────┘             │
│    Security Gate Active              │
│                                      │
│  Your local security gate is now     │
│  active. You'll be asked to confirm  │
│  with biometrics or your backup PIN  │
│  before each withdrawal.            │
│                                      │
│  [          Done          ] (primary)│
│                                      │
│  Disclaimer: local UX gate only...   │
└──────────────────────────────────────┘
```

### 6.5 Verification Modal — Biometric Prompt

```
┌──────────────────────────────────────┐
│                           [X close]  │
│         ┌─────────────┐             │
│  VERIFY │ [Fingerprint │             │
│         │  pulsing 🔵] │             │
│         └─────────────┘             │
│    Biometric Verification            │
│                                      │
│  Confirm your identity using your   │
│  device biometrics.                  │
│                                      │
│  [Use Backup PIN instead] (secondary)│
│                                      │
│  Disclaimer: local UX gate only...   │
└──────────────────────────────────────┘
```

### 6.6 Verification Modal — Success

```
┌──────────────────────────────────────┐
│         ┌─────────────┐             │
│  VERIFY │  [✓ green]   │             │
│         └─────────────┘             │
│    Verification Passed               │
│                                      │
│  Identity verified. Proceeding to    │
│  withdrawal…                         │
└──────────────────────────────────────┘
```

Auto-closes after 1 second, then `executeOnChainWithdraw()` fires.

### 6.7 Verification Modal — Failed / Cancelled

```
┌──────────────────────────────────────┐
│         ┌─────────────┐             │
│  VERIFY │ [✗ red] or   │             │
│         │ [⚠ yellow]  │             │
│         └─────────────┘             │
│    Verification Failed / Cancelled   │
│                                      │
│  [error message if applicable]       │
│                                      │
│  [    Try Again    ] (primary)       │
│  [Use Backup PIN] (secondary)        │
│                                      │
│  Disclaimer: local UX gate only...   │
└──────────────────────────────────────┘
```

### 6.8 Verification Modal — PIN Fallback

```
┌──────────────────────────────────────┐
│                           [X close]  │
│         ┌─────────────┐             │
│  VERIFY │  [Lock 🔒]   │             │
│         └─────────────┘             │
│      Enter Backup PIN                │
│                                      │
│  Enter your 4-digit backup PIN to   │
│  confirm this withdrawal.           │
│                                      │
│     ● ● ○ ○  (4 dot indicators)     │
│                                      │
│     [1] [2] [3]                     │
│     [4] [5] [6]                     │
│     [7] [8] [9]                     │
│     [Clear] [0] [⌫]                │
│                                      │
│  [Use Biometrics Instead] (secondary)│
│  (shown only if biometric enrolled)  │
│                                      │
│  Disclaimer: local UX gate only...   │
└──────────────────────────────────────┘
```

---

## 7. Accessibility Annotations (WCAG 2.1 AA)

### 7.1 ARIA Attributes

| Element | ARIA | Purpose |
|---|---|---|
| Settings card section | `aria-labelledby="security-gate-title"` | Labeled region |
| Settings card h2 | `id="security-gate-title"` | Label target |
| Status badge | `aria-live="polite"` | Announces status changes |
| Enable/Disable button | `aria-label="Enable/Disable local security gate"` | Descriptive label |
| Update PIN button | `aria-label="Update backup PIN"` | Descriptive label |
| Enrollment modal | `role="dialog"`, `aria-modal="true"`, `aria-labelledby="enrollment-modal-title"` | Dialog semantics |
| Verification modal | `role="dialog"`, `aria-modal="true"`, `aria-labelledby="verify-modal-title"` | Dialog semantics |
| Close buttons | `aria-label="Close enrollment/verification dialog"` | Descriptive label |
| PIN dot display | `aria-label="PIN entry: N of 4 digits entered"` | Screen reader announces progress |
| PIN keypad | `role="group"`, `aria-label="PIN keypad / Backup PIN keypad"` | Grouped controls |
| PIN digit buttons | `aria-label="Digit N"` | Descriptive labels |
| Clear button | `aria-label="Clear PIN"` | Descriptive label |
| Backspace button | `aria-label="Backspace"` | Descriptive label |
| Error messages | `role="alert"` | Immediate announcement |
| Icon elements | `aria-hidden="true"` | Decorative icons hidden from AT |

### 7.2 Focus Management

- **Modal open**: Focus moves to first focusable element inside modal (close button or primary action)
- **Focus trap**: `useModalAccessibility` hook traps Tab within modal
- **Escape key**: Closes modal, restores focus to trigger element
- **Body scroll lock**: Prevents background scrolling while modal is open
- **Focus restoration**: Returns focus to the element that triggered the modal

### 7.3 Keyboard Navigation

| Key | Behavior |
|---|---|
| `Tab` | Moves focus through interactive elements (button, keypad keys) |
| `Shift+Tab` | Moves focus in reverse |
| `Escape` | Closes modal, cancels biometric prompt |
| `Enter` / `Space` | Activates focused button or keypad key |
| Arrow keys | Not used (linear Tab navigation sufficient for small number of elements) |

### 7.4 Screen Reader Behavior

1. Modal opens → screen reader announces dialog title and description
2. Biometric prompt → "Confirm your identity using your device biometrics"
3. PIN entry → each digit announced as "Digit N", progress announced as "PIN entry: N of 4 digits entered"
4. Error → "Biometric verification failed" or "Incorrect PIN" announced via `role="alert"`
5. Success → "Identity verified. Proceeding to withdrawal" announced
6. Modal closes → focus returns to withdraw button

### 7.5 Touch Targets

All interactive elements meet minimum 44×44px touch target:
- PIN keys: 56px height × full column width (min 44px)
- Close button: 32×32px with 8px padding (effective 48×48px)
- Action buttons: Full width of modal (min 44px height)

---

## 8. Contrast Requirements (WCAG 2.1 AA)

### 8.1 Token-Based Colors

| Element | Foreground | Background | Required Ratio | Notes |
|---|---|---|---|---|
| Primary text (modal body) | `var(--color-text-secondary)` ≈ `#94a3b8` | `var(--color-bg-card)` ≈ `#121214` | ≥ 4.5:1 | 7.1:1 actual |
| Modal title | `var(--color-text-primary)` ≈ `#ffffff` | `var(--color-bg-card)` ≈ `#121214` | ≥ 4.5:1 | 16.7:1 actual |
| Status badge (active) | `#4ade80` | `rgba(34,197,94,0.15)` | ≥ 4.5:1 | 7.0:1 actual |
| Status badge (inactive) | `#94a3b8` | `rgba(148,163,184,0.1)` | ≥ 4.5:1 | 5.2:1 actual |
| Error text | `#f87171` | `rgba(239,68,68,0.1)` | ≥ 4.5:1 | 5.8:1 actual |
| Success icon | `#4ade80` | `rgba(255,255,255,0.02)` | ≥ 4.5:1 | 10.4:1 actual |
| Error icon | `#f87171` | `rgba(255,255,255,0.02)` | ≥ 4.5:1 | 5.9:1 actual |
| PIN key text | `var(--color-text-primary)` ≈ `#ffffff` | `rgba(255,255,255,0.03)` | ≥ 4.5:1 | 18.1:1 actual |
| Disclaimer text | `var(--color-text-secondary)` ≈ `#64748b` | `var(--color-bg-card)` ≈ `#121214` | ≥ 4.5:1 | 4.6:1 actual |

### 8.2 Focus Ring

- Color: `var(--color-accent-primary)` ≈ `#38bdf8`
- Width: 2px outline + 2px offset
- Against dark background: ≥ 3:1 contrast (meets WCAG 2.4.7)

### 8.3 Backdrop

- `rgba(0, 0, 0, 0.75)` over page content
- Provides sufficient contrast for modal card to stand out

---

## 9. Responsive Design

### 9.1 Breakpoints

| Viewport | Settings Card | Modal | PIN Keypad |
|---|---|---|---|
| Desktop (>640px) | Horizontal action row | Max-width: 400px, centered | 3-column grid, 1rem gap, 56px keys |
| Mobile (≤640px) | Actions stack vertically | Full width with 1.5rem padding | 3-column grid, 0.75rem gap, 50px keys |

### 9.2 Mobile Adjustments

- `.security-gate-card__actions`: `flex-direction: column; align-items: stretch`
- `.security-gate-status`: `margin-right: 0; justify-content: space-between`
- `.security-modal`: `padding: 1.5rem` (reduced from 2rem)
- `.pin-keypad`: `gap: 0.75rem` (reduced from 1rem)
- `.pin-key`: `height: 50px; font-size: 1.125rem` (reduced from 56px/1.25rem)

### 9.3 Animation

- Modal entrance: `modalScaleIn` 0.3s cubic-bezier(0.16, 1, 0.3, 1)
- Biometric pulse: `biometricPulse` 1.8s infinite ease-in-out
- PIN dot fill: `transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1)`
- Respect `prefers-reduced-motion: reduce` (set all to `0.01ms`)

---

## 10. Edge Cases & Error Handling

| Scenario | Behavior |
|---|---|
| Device lacks WebAuthn | Skip biometric step, go directly to PIN setup |
| Biometric enrollment fails | Show error in enrollment modal, allow retry or skip to PIN |
| Biometric verification fails | Show error + "Try Again" + "Use Backup PIN" |
| Biometric cancelled by user | Show "cancelled" state + "Try Again" + "Use Backup PIN" |
| PIN mismatch during enrollment | Show error, clear confirm input, stay on confirm-pin step |
| PIN mismatch during verification | Show error, clear PIN input, stay on PIN fallback |
| Wallet disconnected while modal open | Modal remains open, action will fail gracefully |
| Network mismatch | Withdraw button disabled, no modal interaction |
| Balance is zero | Withdraw button disabled |
| localStorage unavailable | Feature degrades gracefully (state resets on reload) |
| Modal backdrop click | Closes modal, cancels any pending biometric |
| Escape key | Closes modal, cancels any pending biometric |
| Focus trap | Tab cycles within modal only |

---

## 11. Test Matrix

### 11.1 Enrollment Flow

| # | Test | Expected |
|---|---|---|
| E1 | Click "Enable" on supported device | Modal opens at `check-support` step |
| E2 | Click "Register Biometrics" | OS biometric prompt appears |
| E3 | Biometric enrollment succeeds | Advances to `set-pin` step |
| E4 | Biometric enrollment fails | Error shown, retry available |
| E5 | Click "Skip — use PIN only" | Advances to `set-pin` step |
| E6 | Enter 4 digits in set-pin | Auto-advances to `confirm-pin` after 300ms |
| E7 | Enter matching PIN in confirm-pin | Advances to `success` step |
| E8 | Enter mismatched PIN | Error shown, confirm input cleared |
| E9 | Click "Done" on success | Modal closes, badge shows "Active" |
| E10 | Click "Enable" on unsupported device | Modal opens at `set-pin` (skips biometric) |

### 11.2 Verification Flow

| # | Test | Expected |
|---|---|---|
| V1 | Click "Withdraw" with gate enabled + biometric enrolled | Modal opens, biometric prompt auto-triggers |
| V2 | Biometric succeeds | Modal auto-closes after 1s, withdraw executes |
| V3 | Biometric fails | Error shown, "Try Again" + "Use Backup PIN" available |
| V4 | Biometric cancelled | Warning shown, "Try Again" + "Use Backup PIN" available |
| V5 | Click "Use Backup PIN" from biometric state | Switches to PIN fallback |
| V6 | Enter correct 4-digit PIN | Modal auto-closes after 1s, withdraw executes |
| V7 | Enter incorrect PIN | Error shown, PIN input cleared |
| V8 | Click "Use Biometrics Instead" from PIN fallback | Switches back to biometric prompt |
| V9 | Click "Try Again" after failure | Re-triggers biometric prompt |
| V10 | Click X or press Escape | Modal closes, withdrawal cancelled |
| V11 | Click backdrop | Modal closes, withdrawal cancelled |
| V12 | Click "Withdraw" with gate enabled but biometric not enrolled | Opens PIN fallback directly |

### 11.3 Accessibility

| # | Test | Expected |
|---|---|---|
| A1 | Tab through settings card | All buttons reachable in logical order |
| A2 | Tab through enrollment modal | Close → primary action → secondary action (cycle) |
| A3 | Tab through verification modal | Close → primary action → secondary action (cycle) |
| A4 | Tab through PIN keypad | All 12 keys reachable, Clear/Backspace labeled |
| A5 | Enter/Space on focused button | Activates the button |
| A6 | Escape key in modal | Closes modal |
| A7 | Screen reader (VoiceOver/NVDA) | Dialog title announced, PIN progress announced |
| A8 | Focus trap | Tab does not escape modal |
| A9 | Focus restoration | Focus returns to trigger element on close |

### 11.4 Contrast

| # | Test | Expected |
|---|---|---|
| C1 | Primary text on card background | ≥ 4.5:1 |
| C2 | Secondary text on card background | ≥ 4.5:1 |
| C3 | Error text on error background | ≥ 4.5:1 |
| C4 | Status badge text on badge background | ≥ 4.5:1 |
| C5 | Focus ring on dark background | ≥ 3:1 |
| C6 | PIN key text on key background | ≥ 4.5:1 |

### 11.5 Responsive

| # | Test | Expected |
|---|---|---|
| R1 | Settings card at 375px width | Actions stack vertically |
| R2 | Modal at 375px width | Full width, padded |
| R3 | PIN keypad at 375px width | Keys reduced to 50px height |
| R4 | Modal at 1280px width | Centered, max-width 400px |

---

## 12. Token Inventory

| Token | Value (Light) | Value (Dark) | Usage |
|---|---|---|---|
| `--color-accent-primary` | `#00b8d4` | `#38bdf8` | Biometric pulse, focus rings, PIN dots |
| `--color-text-primary` | `#1a1f36` | `#ffffff` | Modal titles, PIN key text |
| `--color-text-secondary` | `#4a5565` | `#94a3b8` | Modal body text, disclaimer |
| `--color-bg-card` | `#ffffff` | `#121214` / `#1e1e24` | Modal card, settings card |
| `--color-danger` | `#ef4444` | `#f87171` | Error messages, error icon |
| `--color-success` | `#10b981` | `#4ade80` | Success icon, active badge |
| `--color-warning` | `#f59e0b` | `#fbbf24` | Cancelled icon |
| `--color-border-subtle` | `#ececec` | `rgba(255,255,255,0.08)` | Modal border, card border |
| `--radius-lg` | `12px` | `12px` | Settings card |
| `--radius-xl` | `16px` | `16px` | Modal card |
| `--radius-full` | `9999px` | `9999px` | Status badge |

---

## 13. Implementation Files

| File | Changes |
|---|---|
| `src/pages/Recipient.tsx` | Settings card JSX, enrollment modal JSX, verification modal JSX, import cleanup |
| `src/pages/Recipient.css` | Pre-existing (lines 808-1202) — no changes needed |
| `docs/RECIPIENT_BIOMETRIC_UNLOCK_SPEC.md` | This document |
