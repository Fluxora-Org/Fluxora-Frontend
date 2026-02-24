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

See `ConnectWalletModal.example.tsx` for a complete working example.
