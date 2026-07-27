# PR Title: design: spec Ledger/Trezor hardware-wallet connection flow

## PR Link
[Create Pull Request for design/hardware-wallet-connect-flow](https://github.com/Michvista/Fluxora-Frontend/pull/new/design/hardware-wallet-connect-flow)

## Branch
`design/hardware-wallet-connect-flow`

---

## Summary
This PR delivers a responsive Ledger/Trezor hardware-wallet connection flow within `ConnectWalletModal.tsx` to support USB-based hardware connections on desktop and provide a mobile fallback message on unsupported mobile viewports.

## Problem
ConnectWalletModal supported only extension-based or mobile-linking wallet options, leaving hardware wallet users without an direct integration flow or a descriptive fallback message on mobile where USB/HID connections are unavailable.

## Solution
1. **Hardware Wallet Selection Entry**: Added "Hardware Wallet" entry under provider list on desktop.
2. **Device Discovery State (`device-searching`)**: Animated radar scanning states with cancellations.
3. **Device Configuration State (`device-found-selecting`)**: Selection cards for found USB devices alongside a derivation path selector with a validated custom path text input.
4. **On-Device Confirmation (`awaiting-device-confirmation`)**: Screen-reader progress announcers.
5. **Mobile Fallback State (`mobile-unsupported`)**: Renders a warning message prompting mobile users to use a desktop browser or connect via WalletConnect instead of presenting a silently broken flow.
6. **Error Parity**: Standardized locked-device, wrong-app, and disconnected-device errors.
7. **Accessibility Features**: Fully keyboard-navigable dialogs, clear headings, focus restoration, and programmatic focusing for custom path inputs.

## Changes

| File | Type | Description |
|------|------|-------------|
| [ConnectWalletModal.tsx](file:///c:/Users/USER/Desktop/wave/Fluxora-Frontend/src/components/ConnectWalletModal.tsx) | [MODIFY] | Implemented ref and focus side-effects for the custom derivation path inputs. |
| [ConnectWalletModal.test.tsx](file:///c:/Users/USER/Desktop/wave/Fluxora-Frontend/src/components/__tests__/ConnectWalletModal.test.tsx) | [MODIFY] | Added unit tests asserting programmatic input focus on selecting custom derivation path. |
| [HARDWARE_WALLET_CONNECT_SPEC.md](file:///c:/Users/USER/Desktop/wave/Fluxora-Frontend/docs/HARDWARE_WALLET_CONNECT_SPEC.md) | [DOCUMENTATION] | Main design specification covering states, visual layouts, styling tokens, error mappings, and WCAG compliance criteria. |

## Verification Plan

### Automated Tests
Run unit tests checking all Hardware Wallet states:
```bash
npx vitest run src/components/__tests__/ConnectWalletModal.test.tsx
```

### Manual Verification
- View modal in a mobile responsive viewport (e.g. 375px) and verify the "Device Unsupported on Mobile" layout displays when selecting Hardware Wallet.
- Switch states using the bottom Design QA Toolbar and verify styling, colors, and layout structure.

closes #1034
