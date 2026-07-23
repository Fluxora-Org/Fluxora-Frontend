import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { webcrypto, randomBytes } from 'node:crypto';
import { en as mockEn } from '../i18n/en';

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
  randomUUID: (): `${string}-${string}-${string}-${string}-${string}` =>
    webcrypto.randomUUID(),
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

// Mock localStorage and sessionStorage for jsdom tests
const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
    setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    length: 0,
  } as unknown as Storage;
};
Object.defineProperty(window, 'localStorage', { value: createStorageMock(), writable: true });
Object.defineProperty(window, 'sessionStorage', { value: createStorageMock(), writable: true });

afterEach(() => {
  cleanup();
});

vi.mock('../components/wallet-connect/Walletcontext', () => {
  return {
    useWallet: () => ({
      address: null,
      network: null,
      connected: false,
      loading: false,
      error: null,
      expectedNetwork: 'TESTNET',
      expectedNetworkLabel: 'Testnet',
      isNetworkMismatch: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    WalletProvider: ({ children }: any) => children,
  };
});

vi.mock('../components/toast/ToastProvider', () => {
  const ctx = {
    addToast: vi.fn(),
    removeToast: vi.fn(),
    dismiss: vi.fn(),
  };
  return {
    useToast: () => ctx,
    useOptionalToast: () => ctx,
    ToastProvider: ({ children }: any) => children,
  };
});

vi.mock('../i18n', () => {
  return {
    useI18n: () => ({
      locale: 'en',
      t: (key: any, params?: any) => {
        let resolvedKey = key;
        if (params && typeof params.count === 'number') {
          const suffix = params.count === 1 ? '_one' : '_other';
          const pluralKey = `${key}${suffix}`;
          if (pluralKey in mockEn) {
            resolvedKey = pluralKey;
          }
        }
        let val = (mockEn as any)[resolvedKey];
        if (!val) return resolvedKey;
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            val = val.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
          }
        }
        return val;
      },
      changeLocale: vi.fn(),
    }),
    I18nProvider: ({ children }: any) => children,
  };
});

vi.mock('../i18n/index', () => {
  return {
    useI18n: () => ({
      locale: 'en',
      t: (key: any, params?: any) => {
        let resolvedKey = key;
        if (params && typeof params.count === 'number') {
          const suffix = params.count === 1 ? '_one' : '_other';
          const pluralKey = `${key}${suffix}`;
          if (pluralKey in mockEn) {
            resolvedKey = pluralKey;
          }
        }
        let val = (mockEn as any)[resolvedKey];
        if (!val) return resolvedKey;
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            val = val.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
          }
        }
        return val;
      },
      changeLocale: vi.fn(),
    }),
    I18nProvider: ({ children }: any) => children,
  };
});
