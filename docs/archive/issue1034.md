Description
This is a UI/UX design task. src/components/ConnectWalletModal.tsx currently lists Freighter, Albedo, and WalletConnect as WalletOptions (onConnectFreighter/onConnectAlbedo/onConnectWalletConnect), with Freighter's flow including a network-check timeout guard. Design a new hardware-wallet option (Ledger/Trezor) whose connection flow differs materially by device: a "Connect via USB" desktop flow with device-selection and on-device confirmation steps, versus a device-unsupported message on mobile where USB/HID access is typically unavailable.

Requirements and context
Design the hardware-wallet list entry, the device-detection/pairing screen, the "confirm on your device" waiting state, and the derivation-path selector
Design the explicit mobile fallback messaging (no USB/HID) directing users to a supported alternative instead of a silently broken button
Specify how this new option's error states (device locked, wrong app open, unplugged mid-flow) parallel the existing Freighter not-installed/rejected/network-mismatch states
Must be accessible, tested, and documented
Should be efficient and easy to review
Suggested execution
Fork the repo and create a branch

git checkout -b design/hardware-wallet-connect-flow
Implement changes

Design specs: hardware-wallet list entry, pairing screen, derivation-path selector, on-device-confirmation waiting state
Define states: device-searching, device-found-selecting, awaiting-device-confirmation, device-locked-error, wrong-app-error, unplugged-error, mobile-unsupported
Accessibility annotations: waiting-for-device-confirmation state uses aria-live="polite" progress messaging, not a silent spinner
Update/Write: src/components/ConnectWalletModal.tsx
Add documentation: docs/HARDWARE_WALLET_CONNECT_SPEC.md
Test and commit
Contrast check: all new state banners meet 4.5:1 in both themes
Keyboard walkthrough: device-selection and derivation-path list fully keyboard-navigable
Responsive review: mobile view shows the unsupported-device message in place of the USB flow, verified at 375px
Include annotated screenshots/redlines in the PR
Example commit message

design: spec Ledger/Trezor hardware-wallet connection flow
Guidelines
WCAG 2.1 AA compliance required
Deliver a spec ready for engineering hand-off (states, tokens, redlines annotated)
Timeframe: 96 hours
