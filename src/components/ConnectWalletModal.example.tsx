/**
 * ConnectWalletModal Usage Example
 * 
 * This file demonstrates how to integrate the ConnectWalletModal component
 * into your pages or components.
 */

import { useState } from 'react';
import ConnectWalletModal from './ConnectWalletModal';

export default function ExampleUsage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handler for Freighter wallet connection
  const handleConnectFreighter = () => {
    console.log('Connecting to Freighter wallet...');
    // Add your Freighter connection logic here
    // Example: await freighter.connect()
    setIsModalOpen(false);
  };

  // Handler for Albedo wallet connection
  const handleConnectAlbedo = () => {
    console.log('Connecting to Albedo wallet...');
    // Add your Albedo connection logic here
    // Example: await albedo.connect()
    setIsModalOpen(false);
  };

  // Handler for WalletConnect connection
  const handleConnectWalletConnect = () => {
    console.log('Connecting to WalletConnect...');
    // Add your WalletConnect connection logic here
    // Example: await walletConnect.connect()
    setIsModalOpen(false);
  };

  return (
    <div>
      {/* Trigger button */}
      <button onClick={() => setIsModalOpen(true)}>
        Connect Wallet
      </button>

      {/* Modal component */}
      <ConnectWalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnectFreighter={handleConnectFreighter}
        onConnectAlbedo={handleConnectAlbedo}
        onConnectWalletConnect={handleConnectWalletConnect}
      />
    </div>
  );
}

/**
 * MINIMAL USAGE (with placeholder handlers):
 * 
 * <ConnectWalletModal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 * />
 * 
 * The component will use console.log placeholders if handlers are not provided.
 */
