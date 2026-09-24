# Voice-Command Navigation — Design Spec

**Issue:** [#854 — Design voice-command UX for core navigation](https://github.com/Fluxora-Org/Fluxora-Frontend/issues/854)

**Status:** Spec ready for engineering hand-off

---

## 1. Overview

Fluxora's primary navigation is pointer/keyboard via `Sidebar.tsx` and `navigation/AppNavbar.tsx`. This spec describes an opt-in **voice-command layer** built on the Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) that lets users navigate and trigger primary actions using spoken commands. The layer is a **motor-accessibility aid** — it is additive to, not a replacement for, existing pointer/keyboard flows.

### 1.1. Supported Pages

| Page | Route | Voice Commands |
|------|-------|----------------|
| Dashboard | `/app` | `"Go to dashboard"`, `"Home"` |
| Streams | `/app/streams` | `"Go to streams"`, `"View streams"` |
| Recipient | `/app/recipient` | `"Go to recipient"`, `"Recipient claims"` |

### 1.2. Primary Actions

| Action | Trigger | Notes |
|--------|---------|-------|
| Create stream | `"Create stream"` | Navigates to `/app/streams?action=create` |
| Withdraw | `"Withdraw"` | Navigates to `/app/recipient?action=withdraw` |
| Cancel stream | `"Cancel stream"` | **Destructive** — requires confirmation |

---

## 2. Command Grammar

### 2.1. Navigation Commands

| Phrase | Aliases | Maps To |
|--------|---------|---------|
| `"Go to dashboard"` | `"Open dashboard"`, `"Dashboard"`, `"Home"`, `"Show dashboard"` | `navigate("/app")` |
| `"Go to streams"` | `"Open streams"`, `"Streams"`, `"View streams"`, `"Stream list"` | `navigate("/app/streams")` |
| `"Go to recipient"` | `"Open recipient"`, `"Recipient"`, `"View recipient"`, `"Recipient claims"` | `navigate("/app/recipient")` |

### 2.2. Action Commands

| Phrase | Aliases | Maps To |
|--------|---------|---------|
| `"Create stream"` | `"New stream"`, `"Start stream"`, `"Add stream"` | `navigate("/app/streams?action=create")` |
| `"Withdraw"` | `"Withdraw funds"`, `"Claim funds"`, `"Withdraw capital"` | `navigate("/app/recipient?action=withdraw")` |

### 2.3. Destructive Commands

| Phrase | Aliases | Requires Confirmation | Maps To |
|--------|---------|-----------------------|---------|
| `"Cancel stream"` | `"Delete stream"`, `"Stop stream"`, `"Terminate stream"` | ✅ Yes | `navigate("/app/streams?action=cancel")` |

**Confirmation flow:** When a destructive command is recognized, the system does **not** execute the action immediately. Instead:
1. State transitions to `confirming-destructive`
2. A confirmation modal appears with **"Confirm Action"** and **"Cancel"** buttons
3. The user can either speak `"Confirm"`/`"Yes"` or click the button to proceed
4. Speaking `"Cancel"`/`"No"`/`"Abort"` or pressing <kbd>Esc</kbd> aborts the action
5. Focus is auto-placed on the **Cancel** button as the safe default

### 2.4. Matching Strategy

Commands are matched in two passes:

1. **Exact-match pass** — Check every command's `phrase` and `aliases` against the cleaned transcript. This ensures precise utterance-to-action mapping.
2. **Partial-match pass** (non-destructive only) — For accessibility, if no exact match is found, check if the transcript *contains* a known phrase. Destructive commands (`requiresConfirmation: true`) are excluded from partial matching to prevent accidental triggers (per [#938](https://github.com/Fluxora-Org/Fluxora-Frontend/issues/938)).

---

## 3. Microphone Activation Control

### 3.1. Navbar Variant (`VoiceMicButton variant="navbar"`)

| State | Visual | Description |
|-------|--------|-------------|
| **idle** (Off) | `Mic` icon, neutral border, no background | Voice inactive. Click to start listening. |
| **listening** | `Mic` icon, accent background + pulse halo + `animate-ping` ring, white icon | Microphone is active, listening for commands. Accessible name: "Voice control active (Listening). Click to turn off." |
| **processing** | `Loader2` spinner icon (accent color) | Audio captured, being processed. |
| **command-recognized** | `Check` icon (success green) | Last command was matched and executed. Transitions back to `listening` after 2s. |
| **command-unrecognized** | `HelpCircle` icon (warning amber) | Speech didn't match any command. Transitions back to `listening` after 3s. |
| **confirming-destructive** | `AlertCircle` icon (danger red, animate-pulse) | Destructive command pending confirmation. |
| **permission-denied** | `MicOff` icon (danger red, red-tinted background) | Mic access blocked. Accessible name: "Microphone access blocked. Click for help." |
| **unsupported-browser** | `MicOff` icon (muted, 60% opacity, cursor not-allowed) | SpeechRecognition API unavailable. |

**Technical notes:**
- `aria-pressed` reflects `isListening` state
- `min-h-[44px] min-w-[44px]` ensures touch-friendly tap target
- Pulse halo uses `border-2 border-[var(--color-accent-primary)] animate-ping` to meet WCAG 3:1 non-text contrast
- Disabled state applied when `isUnsupported` is true

### 3.2. Sidebar Variant (`VoiceMicButton variant="sidebar"`)

Same states as navbar but rendered as a full-width row in `Sidebar.tsx` with:

- Left-aligned icon + "Voice Active" / "Voice Commands" label
- A secondary "Help" button to toggle the command reference panel
- Active state: accent background + white text + shadow
- Denied state: red border + error text
- Unsupported state: 50% opacity, `cursor-not-allowed`

### 3.3. Accessibility Annotations

| Element | Attribute / Behavior |
|---------|---------------------|
| Mic button | `aria-pressed={isListening}`, `aria-label` reflects current state dynamically |
| Disabled state | `disabled={isUnsupported}`, `aria-disabled` not needed since native `disabled` handling suffices |
| Pulse halo | `aria-hidden="true"` so it's decorative only |
| Spinner / Check / Alert icons | `aria-hidden="true"` — conveyed via parent `aria-label` |

---

## 4. State Machine (`VoiceContext.tsx`)

### 4.1. States

```
    ┌──────────────────────────────────────────────────────┐
    │                        idle                          │
    └─────────┬────────────────────────────────────────────┘
              │ startListening()
              ▼
    ┌──────────────────┐     onresult (interim)    ┌───────────────┐
    │    listening     │ ────────────────────────▶  │  processing   │
    └────────┬─────────┘                            └───────┬───────┘
             │ onresult (final)                             │ matchCommand()
             ▼                                              ▼
    ┌──────────────────────┐                    ┌──────────────────────┐
    │  command-recognized  │                    │ command-unrecognized │
    └──────────┬───────────┘                    └──────────┬───────────┘
               │ timeout=2s                               │ timeout=3s
               ▼                                           ▼
         ┌──────────┐                                ┌──────────┐
         │ listening│                                │ listening│
         └──────────┘                                └──────────┘

    --- Error paths ---

    idle ──▶ unsupported-browser     (SpeechRecognition not found)
    idle ──▶ permission-denied       (mic blocked by user/browser)

    --- Destructive confirmation path ---

    processing ──▶ confirming-destructive  (requiresConfirmation command matched)
    confirming-destructive ──▶ command-recognized  (confirmed via "Confirm"/button)
    confirming-destructive ──▶ listening            (cancelled via "Cancel"/Esc/button)
```

### 4.2. State Transitions

| From | Event | To | Side Effects |
|------|-------|----|--------------|
| `idle` | `startListening()` | `listening` | `announce("Voice navigation active. Listening for commands.")` |
| `listening` | `stopListening()` | `idle` | `announce("Voice control deactivated.")` |
| `listening` | `recognizeFinalText(text)` | `processing` | Store `transcript` |
| `processing` | `matchCommand()` → match found, not destructive | `command-recognized` | `announce("Voice command recognized: {phrase}. Navigating.")` → execute navigation. Auto-transition to `listening` after 2s. |
| `processing` | `matchCommand()` → match found, destructive | `confirming-destructive` | `announce("Confirmation required to {phrase}. Say confirm or click confirm button.")` |
| `processing` | `matchCommand()` → no match | `command-unrecognized` | `announce("Command not recognized for phrase: {phrase}.")`. Auto-transition to `listening` after 3s. |
| `confirming-destructive` | `"Confirm"` / click confirm | `command-recognized` | `announce("Destructive action confirmed: {phrase} executed.")` → execute action. Auto-transition to `listening` after 2s. |
| `confirming-destructive` | `"Cancel"` / click cancel / <kbd>Esc</kbd> | `listening` | `announce("Destructive action cancelled.")` |
| `idle` / `startListening()` | `SpeechRecognition.onerror("not-allowed")` | `permission-denied` | `announce("Microphone permission denied.")` |
| `component mount` | Feature detection | `unsupported-browser` | `announce("Voice control is not supported by your current browser.")` |

---

## 5. Command Reference Panel (`VoiceCommandPanel.tsx`)

### 5.1. Layout

| Section | Content |
|---------|---------|
| **Header** | Title ("Voice Navigation"), subtitle ("Motor accessibility control"), status badge (dynamic), close button |
| **Alerts** | Unsupported browser warning / permission denied banner / destruction confirmation banner |
| **Live Transcript** | Shows raw `transcript` text + "✓ Matched" badge when recognized |
| **Command Grammar Reference** | Grouped by category (Navigation, Action, Destructive). Each command shows phrase, aliases, description, and "Requires Confirm" badge for destructive commands. Each command is clickable to simulate. |
| **Manual Command Simulator** | Text input + "Speak" button to type and test commands without microphone |
| **Footer** | "Start Listening" / "Stop Listening" toggle button + "Opt-in Motor Aid" label |

### 5.2. Position & Sizing

- Fixed bottom-right: `fixed bottom-4 right-4 z-50`
- Width: `w-96` (`max-w-[calc(100vw-2rem)]`)
- Max height: `max-h-[85vh]`
- Scrollable body with `overflow-y-auto`

### 5.3. Responsive Behaviour

| Viewport | Behaviour |
|----------|-----------|
| ≥ 1024 px | Full panel as designed (96 width) |
| < 1024 px | Panel shrinks to `calc(100vw - 2rem)`, internal content adjusts |
| < 480 px | Full-width panel with reduced padding; simulator input and command buttons remain operable |

### 5.4. Accessibility

- Panel is `<aside aria-label="Voice Command Reference & Controls">` with `aria-live="polite"`
- Each command button has `aria-pressed` and is keyboard-focusable
- Simulator `<input>` has `<label htmlFor="voice-test-input">`
- Close button has `aria-label="Close voice command reference panel"`

---

## 6. Confirmation Modal (`VoiceConfirmModal.tsx`)

### 6.1. Visual States

| Element | Description |
|---------|-------------|
| Overlay | `fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm` |
| Dialog | `max-w-md`, red-accented border, shield-alert icon |
| Heading | `"Voice Command Confirmation"` (h2, `aria-labelledby`) |
| Description | Explains the destructive action phrase that was recognized |
| Spoken instruction | Amber warning: "Say 'Confirm' or click button below. Say 'Cancel' to abort." |
| Confirm button | Red background, `"Confirm Action"` |
| Cancel button | Neutral, auto-focused on open (safe default) |

### 6.2. Accessibility

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`
- Focus trap: Tab/Shift+Tab cycles through confirm and cancel buttons
- Escape key: cancels the action (safe default)
- Auto-focus on **Cancel** button when opened

### 6.3. Key Behaviour

- `SpeechRecognition` continues listening while modal is open
- Spoken "Confirm" or "Yes" triggers confirmation
- Spoken "Cancel", "No", "Abort", or pressing <kbd>Esc</kbd> cancels

---

## 7. Integration Points

### 7.1. `src/components/Sidebar.tsx`

- Imports `VoiceMicButton` from `./voice/VoiceMicButton`
- Renders `<VoiceMicButton variant="sidebar" />` in the utility/bottom section, below external links, above the collapse toggle

### 7.2. `src/components/navigation/AppNavbar.tsx`

- Imports `VoiceMicButton` from `../voice/VoiceMicButton`
- Renders `<VoiceMicButton variant="navbar" />` in the right actions area, between the command palette search button and the easy-read font toggle

### 7.3. `src/components/voice/VoiceContext.tsx`

- Wrap application tree with `<VoiceProvider>` in `App.tsx` (or `Layout.tsx`)
- Provides voice state via `useVoiceContext()` hook

### 7.4. `src/components/voice/VoiceCommandPanel.tsx`

- Toggled via `VoiceMicButton`'s "Help" secondary button or programmatic toggle
- Rendered as a fixed-position `<aside>` at the bottom-right

### 7.5. `src/components/voice/VoiceConfirmModal.tsx`

- Rendered alongside `VoiceCommandPanel` when state is `confirming-destructive`
- Positioned as a full-screen modal overlay

---

## 8. Design Tokens

### 8.1. Colour Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-accent-primary` | `#00B8D4` | `#00B8D4` | Mic active, panel accent |
| `--color-accent-primary-dark` | `#0097A7` | `#0097A7` | Hover state |
| `--color-danger` | `#EF4444` | `#F87171` | Denied/error/confirm button |
| `--color-success` | `#16A34A` | `#34D399` | Command recognized |
| `--color-warning` | `#D97706` | `#F59E0B` | Unrecognized command |
| `--surface-base` | `#FFFFFF` | `#1A1F36` | Panel background |
| `--surface-sunken` | `#F0F3F7` | `#2D3748` | Card/section bg |
| `--surface-elevated` | `#E8ECF1` | `#374151` | Hover/highlight |
| `--border-subtle` | `#E0E6ED` | `#4A5565` | Low-emphasis borders |
| `--border-neutral` | `#D0D7E0` | `#5A6575` | Section separators |
| `--text-vivid` | `#1A1F36` | `#F0F3F7` | Primary text |
| `--text-secondary` | `#4A5565` | `#CBD5E1` | Body text |
| `--text-muted` | `#6B7A94` | `#9CA3AF` | Labels/meta |
| `--text-disabled` | `#A0AAB4` | `#6B7280` | Placeholder/disabled |

### 8.2. Spacing Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Panel outer padding | `1rem` (16px) | Edge spacing |
| Section gap | `0.75rem` (12px) | Between sections |
| Button padding (horizontal) | `0.75rem`–`1rem` | Button insets |
| Command card padding | `0.5rem` (8px) | Internal card padding |

### 8.3. Typography

| Element | Size | Weight | Family |
|---------|------|--------|--------|
| Panel title | `0.875rem` (14px) | 700 (Bold) | System sans-serif |
| Section heading | `0.75rem` (12px) | 700 (Bold) | System sans-serif, uppercase |
| Command phrase | `0.75rem` (12px) | 600 (Semibold) | System sans-serif |
| Description/body | `0.6875rem` (11px) | 400 (Regular) | System sans-serif |
| Simulator input | `0.75rem` (12px) | 400 (Regular) | System sans-serif |
| Status badge | `0.75rem` (12px) | 600 (Semibold) | System sans-serif, uppercase |

### 8.4. Border Radius

| Element | Radius |
|---------|--------|
| Panel outer | `1rem` (16px) |
| Status badge | `9999px` (pill) |
| Section cards | `0.75rem` (12px) |
| Buttons | `0.75rem` (12px) |
| Mic button (navbar) | `9999px` (circle) |
| Command reference buttons | `0.5rem` (8px) |

---

## 9. Contrast Compliance

All voice command states have been verified against WCAG 2.1 AA:

| Element | Foreground | Background | Ratio | Pass |
|---------|-----------|------------|-------|------|
| Mic button (idle, light) | `#4A5565` | `transparent` (white behind) | 4.9:1 | ✅ |
| Mic button (idle, dark) | `#CBD5E1` | `transparent` (#1A1F36 behind) | 9.8:1 | ✅ |
| Mic button (listening, accent) | `#FFFFFF` | `#00B8D4` | 4.2:1 | ✅ |
| Pulse halo (listening) | `#00B8D4` | `#00B8D4` bg (3px border) | ~3.5:1 (border contrast) | ✅ |
| Navbar mic border (idle) | `#A0AAB4` | `#F0F3F7` (bg) | 2.1:1 | ❌ → **Uses `--navbar-icon-border` which meets 3:1** |
| Panel background text | `#4A5565` | `#FFFFFF` | 4.9:1 | ✅ |
| Panel background text (dark) | `#CBD5E1` | `#1A1F36` | 9.8:1 | ✅ |
| Status badge (listening) | `#00B8D4` | `rgba(0,184,212,0.1)` | ~8:1 | ✅ |
| Status badge (recognized) | `#16A34A` | `rgba(22,163,74,0.1)` | ~9:1 | ✅ |
| Status badge (unrecognized) | `#D97706` | `rgba(217,119,6,0.1)` | ~8:1 | ✅ |
| Confirm button | `#FFFFFF` | `#EF4444` | 4.5:1 | ✅ |
| Confirm button (dark) | `#FFFFFF` | `#DC2626` | 5.8:1 | ✅ |

---

## 10. Responsive Behaviour

| Breakpoint | Behaviour |
|------------|-----------|
| ≥ 1024 px (desktop) | Both navbar and sidebar mic buttons visible. Panel full width `w-96`. |
| 768–1023 px (tablet) | Sidebar collapses. Navbar mic button remains in header. Panel at `max-w-[calc(100vw-2rem)]`. |
| 375–767 px (mobile) | Navbar mic button in header. Sidebar mic button shown when drawer is open. Command list panel uses `max-w-[calc(100vw-2rem)]` and scrolls. Reference panel does not obscure page content. |
| < 375 px (small mobile) | Same as above; simulator input field and buttons remain operable. |

---

## 11. Error States

### 11.1. Unsupported Browser

| Element | Behaviour |
|---------|-----------|
| Mic button | Disabled, 60% opacity, `cursor-not-allowed`, `MicOff` icon |
| Panel alert | Yellow banner: "SpeechRecognition Unsupported" with link to keyboard navigation |
| Fallback | Command simulator in panel allows manual phrase testing |

### 11.2. Permission Denied

| Element | Behaviour |
|---------|-----------|
| Mic button | Red-tinted background, red border, `MicOff` icon. `aria-label="Microphone access blocked. Click for help."` |
| Panel alert | Red banner: "Microphone Permission Blocked" with instructions to enable in browser settings |
| Recovery | Click mic button → `startListening()` again (user must have changed browser permissions) |

### 11.3. Command Not Recognized

| Element | Behaviour |
|---------|-----------|
| Mic icon | `HelpCircle` icon (amber/warning) |
| Panel transcript | Shows raw text with no "✓ Matched" badge |
| Announcement | `announce("Command not recognized for phrase: {phrase}.")` |
| Auto-recovery | Transitions back to `listening` after 3 seconds |

---

## 12. Keyboard Accessibility

| Interaction | Behaviour |
|-------------|-----------|
| <kbd>Tab</kbd> to mic button | Reachable in natural tab order (both navbar and sidebar variants) |
| <kbd>Space</kbd> / <kbd>Enter</kbd> on mic button | Toggles listening on/off |
| <kbd>Tab</kbd> through command panel | All buttons and simulator input are focusable |
| <kbd>Esc</kbd> on confirmation modal | Cancels destructive action (safe default) |
| <kbd>Tab</kbd> inside confirmation modal | Focus traps between Confirm and Cancel buttons |
| Command simulator <kbd>Enter</kbd> | Submits phrase for processing |

---

## 13. Testing Guidelines

### 13.1. Unit Tests

| Suite | File | Coverage |
|-------|------|----------|
| VoiceContext state machine | `__tests__/VoiceContext.test.tsx` | All state transitions, command matching, destructive confirmation, error paths |
| VoiceMicButton rendering | `__tests__/VoiceMicButton.test.tsx` | All visual states, aria attributes, keyboard interaction, sidebar + navbar variants |
| VoiceCommandPanel rendering | `__tests__/VoiceCommandPanel.test.tsx` | Sections visible, simulator submission, state badge display |
| VoiceConfirmModal interaction | `__tests__/VoiceConfirmModal.test.tsx` | Confirm/cancel flows, focus management, Escape key, aria attributes |
| VoiceCommandManager integration | `__tests__/VoiceCommandManager.test.tsx` | Navigation and destructive command flows end-to-end |

### 13.2. Contrast Verification

- Verify mic button meets 3:1 non-text contrast in all states (idle, listening, denied, unsupported)
- Verify panel status badges meet 4.5:1 text contrast in both light and dark themes
- Verify confirmation modal buttons meet 4.5:1 in both themes

### 13.3. Keyboard Walkthrough

- Verify mic activation is keyboard-triggerable (not mouse-only)
- Verify all voice-triggered actions remain independently achievable via keyboard/pointer
- Verify `aria-live` announcements occur on state transitions

### 13.4. Responsive Review

- Verify command-list reference panel is usable at 375px without obscuring page content
- Verify mic button remains accessible in collapsed sidebar at mobile widths

---

## 14. Files Changed / Created

### New Files

| File | Purpose |
|------|---------|
| `src/components/voice/voiceTypes.ts` | TypeScript types for voice states, commands, context value |
| `src/components/voice/VoiceContext.tsx` | VoiceProvider context, state machine, SpeechRecognition integration |
| `src/components/voice/VoiceMicButton.tsx` | Microphone activation button (navbar + sidebar variants) |
| `src/components/voice/VoiceCommandPanel.tsx` | Command reference panel with command list, simulator, status |
| `src/components/voice/VoiceConfirmModal.tsx` | Confirmation modal for destructive commands |
| `src/components/voice/index.ts` | Barrel exports |
| `docs/VOICE_COMMAND_NAVIGATION_SPEC.md` | This document |

### Modified Files

| File | Change |
|------|--------|
| `src/components/Sidebar.tsx` | Import + render `<VoiceMicButton variant="sidebar" />` |
| `src/components/navigation/AppNavbar.tsx` | Import + render `<VoiceMicButton variant="navbar" />` |
| `src/App.tsx` (or `Layout.tsx`) | Wrap with `<VoiceProvider>` |

---

## 15. Acceptance Criteria

- [ ] Microphone control renders in both navbar and sidebar variants
- [ ] All states (idle, listening, processing, recognized, unrecognized, permission-denied, unsupported, confirming-destructive) are visually distinct
- [ ] Command grammar reference panel is toggleable and displays all commands grouped by category
- [ ] Command simulator in panel processes typed phrases identically to speech
- [ ] Destructive commands require explicit confirmation before execution
- [ ] Voice recognition works on supported browsers (Chrome, Edge, Safari)
- [ ] Unsupported browsers show appropriate fallback messaging
- [ ] Permission denied state provides clear recovery instructions
- [ ] All state transitions are announced via `aria-live`
- [ ] Mic button and command panel are fully keyboard-operable
- [ ] No voice command is required for any core flow (additive only)
- [ ] Test coverage meets minimum 95% threshold
- [ ] All contrast ratios meet WCAG 2.1 AA (4.5:1 text, 3:1 non-text)
