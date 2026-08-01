# ConnectWalletModal Component

A modular, accessible modal component for connecting Stellar wallets to Fluxora.

## Features

- ✅ Dark theme with rounded corners matching Figma design
- ✅ Three wallet options: Freighter, Albedo, WalletConnect
- ✅ Accessible with focus trap and keyboard navigation
- ✅ Close via X button, backdrop click, or Escape key
- ✅ Terms of Service disclaimer with link
- ✅ Hover effects on wallet options
- ✅ Fully modular and reusable

## Usage

```tsx
import { useState } from 'react';
import ConnectWalletModal from './components/ConnectWalletModal';

function MyComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Connect Wallet
      </button>

      <ConnectWalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnectFreighter={() => {
          // Your Freighter connection logic
          setIsModalOpen(false);
        }}
        onConnectAlbedo={() => {
          // Your Albedo connection logic
          setIsModalOpen(false);
        }}
        onConnectWalletConnect={() => {
          // Your WalletConnect connection logic
          setIsModalOpen(false);
        }}
      />
    </>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls modal visibility |
| `onClose` | `() => void` | Yes | Called when modal should close |
| `onConnectFreighter` | `() => void` | No | Handler for Freighter wallet connection |
| `onConnectAlbedo` | `() => void` | No | Handler for Albedo wallet connection |
| `onConnectWalletConnect` | `() => void` | No | Handler for WalletConnect connection |

## Accessibility

- Focus is trapped within the modal when open
- First focusable element (close button) receives focus on open
- Tab/Shift+Tab cycles through focusable elements
- Escape key closes the modal
- Proper ARIA attributes (`role="dialog"`, `aria-modal`, `aria-labelledby`)

## Styling

The component uses inline styles that match the existing Fluxora design system:
- Background: `#0a0e17` (dark)
- Surface: `#121a2a` (dark grey)
- Border: `#1e2d42`
- Text: `#ffffff` (white) and `#6b7a94` (light grey)
- Accent: `#00d4aa` (teal)

## Customization

To customize wallet icons, edit the `walletOptions` array in `ConnectWalletModal.tsx`:

```tsx
const walletOptions = [
  {
    id: 'freighter',
    name: 'Freighter',
    description: 'Stellar browser extension wallet.',
    icon: '🚀', // Replace with custom icon component
    onClick: onConnectFreighter || (() => console.log('Freighter clicked')),
  },
  // ...
];
```

## Integration Example

Use the `ConnectWalletModal` component as demonstrated in the Usage section above.

## Edge Case Behaviors & States

The modal explicitly manages various edge cases and interaction states to ensure a robust user flow:

- **Loading State**: When a wallet connection is initiated and the request is in flight, the selected wallet button displays a spinning loader, the description updates to `"Connecting..."`, and all wallet options become disabled to prevent concurrent requests.
- **Empty / Disabled State**: If a wallet option (e.g., Albedo or WalletConnect) does not have a provided action handler, it is rendered in a disabled state. It appears with reduced opacity, a `"coming soon"` badge, and a `not-allowed` cursor, and it cannot be clicked or focused.
- **Retry State**: If a connection is rejected by the user or encounters a network mismatch/timeout, a specific error view is shown. This view includes a "Retry Connection" or "Check Network Again" button which allows the user to re-initiate the identical connection flow without closing the modal.
- **Keyboard & Hover States**: The modal explicitly tracks focused and hovered items to provide unified styling. Active options receive an elevated background, a highlighted border, and a focus ring (when navigating via keyboard) to ensure visual feedback is locked down.
- **Pending Connection Escape Handling**: While a wallet connection request is in progress, pressing Escape will not dismiss the modal, so the loading state can complete without interrupting the flow.
- **Responsive / Mobile State**: The component adjusts based on the viewport width (using `BREAKPOINT_MD`). On mobile viewports, the Hardware Wallet flow intercepts the user with a `"Device Unsupported on Mobile"` error state, prompting them to use WalletConnect instead of the standard USB scanning flow.
