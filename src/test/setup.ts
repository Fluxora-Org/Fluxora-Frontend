import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { webcrypto, randomBytes } from 'node:crypto';

// Polyfill Web Crypto API for Stellar SDK / @noble/ed25519 in test environment
const customCrypto = {
  ...webcrypto,
  getRandomValues<T extends ArrayBufferView | null>(array: T): T {
    if (!array) return array;
    const bytes = randomBytes((array as any).byteLength);
    const u8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    u8.set(bytes);
    return array;
  },
  subtle: webcrypto.subtle,
};

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'crypto', {
    value: customCrypto,
    writable: true,
    configurable: true,
  });
}
Object.defineProperty(globalThis, 'crypto', {
  value: customCrypto,
  writable: true,
  configurable: true,
});

expect.extend(matchers);

// jsdom does not implement matchMedia. Provide a no-op default (no preference,
// no listeners) so components/hooks that probe it don't crash. Individual tests
// can still override window.matchMedia with a richer mock when needed.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

afterEach(() => {
  cleanup();
});

vi.mock('../components/wallet-connect/Walletcontext', () => {
  return {
    useWallet: () => ({
      address: null,
      network: null,
      connected: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    WalletProvider: ({ children }: any) => children,
  };
});

vi.mock('../components/toast/ToastProvider', () => {
  return {
    useToast: () => ({
      addToast: vi.fn(),
      removeToast: vi.fn(),
    }),
    ToastProvider: ({ children }: any) => children,
  };
});
