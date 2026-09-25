# Design Specification: Hardware Wallet connection flow (Ledger/Trezor)

This specification details the user experience, styling tokens, states, accessibility annotations, and testing procedures for connecting USB-based hardware wallets (Ledger & Trezor) within the `ConnectWalletModal` component.

---

## 1. Visual & UX Walkthrough

The connection flow is split into a **Desktop Flow (USB Connection)** and a **Mobile Flow (Unsupported Fallback)**.

### 1.1 Default Wallet List Entry
- **Label**: `Hardware Wallet`
- **Icon**: A hardware microchip icon (`lucide/Cpu` or `lucide/Usb`).
- **Description**: `Connect via Ledger or Trezor device (USB).`
- **Behavior**: Clicking this entry determines if the client is on desktop or mobile. 
  - If mobile: transitions directly to `mobile-unsupported` state.
  - If desktop: transitions to the desktop hardware connection flow starting at `device-searching`.

### 1.2 Desktop Flow Steps
```
┌────────────────────────────────────────────────────────┐
│ [←] Back  [×] Close                                    │
│                                                        │
│             Badge: [ Hardware Wallet ]                 │
│             Title: Connect via USB                     │
│                                                        │
│             (Step-specific view content)               │
│                                                        │
│             [ Secondary Action / Back ]                │
└────────────────────────────────────────────────────────┘
```

#### Step 1: Device Discovery (`device-searching`)
- **Header**: "Step 1 of 3: Connect Device"
- **UX**: Visual scanning radar or pulsing ring animation indicating search activity.
- **Copy**: "Searching for connected hardware wallets... Please plug in your Ledger or Trezor device via USB, unlock it with your PIN, and ensure the Stellar app is open."
- **Action**: A "Cancel" button to return to the provider list.

#### Step 2: Device Selection & Derivation Path (`device-found-selecting`)
- **Header**: "Step 2 of 3: Configure Device"
- **UX**: 
  - **Device List**: Radio-button-like cards for found devices (e.g., `Ledger Nano X (USB)`, `Trezor Model T (USB)`).
  - **Derivation Path Selector**: A labeled `<select>` dropdown with predefined Stellar path configurations:
    - `Stellar Standard (m/44'/148'/0')` (Default)
    - `Stellar Secondary (m/44'/148'/1')`
    - `Custom Derivation Path` (Renders a validation-guarded text input field when selected, e.g. `m/44'/148'/x'`).
- **Action**: "Connect selected device" (Primary action) and "Back" (Secondary action).

#### Step 3: On-Device Confirmation Waiting State (`awaiting-device-confirmation`)
- **Header**: "Step 3 of 3: Confirm on Device"
- **UX**: Progress indicator showing a waiting state. Employs `aria-live="polite"` progress messaging.
- **Copy**: "Please review and approve the connection request on your device screen. Make sure the Stellar App is active."
- **Action**: "Cancel Connection" button.

---

## 2. Hardware Wallet Error States

To ensure parity with the existing Freighter states, the hardware-wallet flow specifies three parallel error screens. Each contains a detailed description, visual warning icon, and recovery path.

| Hardware Error State | Parallel Freighter State | Trigger Condition | UX Recovery CTA |
| :--- | :--- | :--- | :--- |
| **`device-locked-error`** | `not_installed` / `rejected` | Device is connected but PIN has not been entered. | **Retry Connection** (triggers check again) |
| **`wrong-app-error`** | `network_mismatch` | Stellar app is not open on the hardware wallet. | **Retry Connection** |
| **`unplugged-error`** | `network_timeout` | USB cable is disconnected or power is lost mid-flow. | **Scan for Device** (returns to step 1) |

---

## 3. Mobile Fallback Messaging (`mobile-unsupported`)

USB/HID access via standard web browsers is typically unavailable on mobile operating systems (iOS and Android). Clicking the "Hardware Wallet" option on mobile redirects to an explicit fallback state rather than breaking silently.

- **Header**: "Mobile Fallback"
- **Icon**: Shield/Alert icon (`lucide/AlertCircle` or `lucide/ShieldAlert`) inside a soft warning banner.
- **Title**: `Device Unsupported on Mobile`
- **Description**: `USB hardware wallet connections are not supported on mobile browsers. Please use a browser extension on desktop, or connect with a mobile-friendly wallet instead.`
- **Primary CTA**: `Connect via WalletConnect` (initiates QR code/mobile pairing flow).
- **Secondary CTA**: `Back to wallet list`.

---

## 4. Design Tokens & Visual Specs

| Component State | Target Token | Light Theme | Dark Theme |
| :--- | :--- | :--- | :--- |
| **Radar Ring** | `var(--color-accent-primary)` | `#00b8d4` (Opacity 0.15) | `#00d4aa` (Opacity 0.15) |
| **Device Card Selected** | `var(--color-bg-secondary)` | `#f4f6f9` (Teal Border) | `#1a263d` (Teal Border) |
| **Custom Path Input** | `var(--color-border-default)` | Border: `#c0c8d3` | Border: `#283952` |
| **Aria Live Alert Banner** | `var(--status-info)` | Font: `#00838f` | Font: `#00e5ff` |

---

## 5. Accessibility (WCAG 2.1 AA) Compliance

### 5.1 Color Contrast
All labels, selector choices, custom input borders, and warning states have been checked to exceed a **4.5:1** contrast ratio against the light background and dark background respectively.

### 5.2 Keyboard Walkthrough
- **Device Selection**: The device list cards are focusable (`tabindex="0"` or using `<button>`) and support selection using `Space`/`Enter` keys.
- **Derivation Path Dropdown**: Labeled `<select>` complies with standard browser arrow-key navigability.
- **Custom Input**: Focus is shifted programmatically to the custom input field when "Custom Derivation Path" is selected.

### 5.3 Screen Reader (ARIA) Annotations
- **Polite Progress updates**: The `awaiting-device-confirmation` state contains a container with `aria-live="polite"` so screen readers read aloud "Awaiting confirmation on your Ledger/Trezor device..." rather than displaying a silent loading spinner.
- **Clear Headings**: Headers map to step tags (`aria-labelledby="connect-wallet-modal-title"`).

---

## 6. Verification & Test Plan

- **Responsive Viewport Test**: View modal at `375px` and verify the "Device Unsupported on Mobile" layout displays in place of the USB pairing screens.
- **State Switcher Validation**: Use the bottom Design QA Preview Toolbar to cycle through all 7 new states and inspect layout alignments, micro-animations, and contrast ratios.
- **Unit Testing**: Vitest test coverage for list-entry selection, device selection, custom path validation, and mobile fallback behaviors.
