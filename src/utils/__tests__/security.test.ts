import { describe, it, expect } from 'vitest';
import { isSafeUrl, sanitizeUrl, sanitizeMetadataText } from '../security';

describe('security utils - safe URL navigation and text sanitization policy', () => {
  describe('isSafeUrl', () => {
    it('accepts safe https, http, and mailto URLs', () => {
      expect(isSafeUrl('https://stellar.expert/explorer/public')).toBe(true);
      expect(isSafeUrl('http://localhost:3000')).toBe(true);
      expect(isSafeUrl('mailto:support@fluxora.xyz')).toBe(true);
    });

    it('accepts safe relative paths and fragment links', () => {
      expect(isSafeUrl('/app/streams/STR-001')).toBe(true);
      expect(isSafeUrl('#documentation')).toBe(true);
      expect(isSafeUrl('/app')).toBe(true);
    });

    it('rejects dangerous javascript: schemes', () => {
      expect(isSafeUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeUrl('javascript:void(0)')).toBe(false);
      expect(isSafeUrl('JAVASCRIPT:alert(document.domain)')).toBe(false);
    });

    it('rejects data: URI schemes', () => {
      expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isSafeUrl('data:application/javascript,alert(1)')).toBe(false);
    });

    it('rejects vbscript:, file:, and ftp: schemes', () => {
      expect(isSafeUrl('vbscript:MsgBox(1)')).toBe(false);
      expect(isSafeUrl('file:///etc/passwd')).toBe(false);
      expect(isSafeUrl('ftp://evil.com/payload')).toBe(false);
    });

    it('rejects protocol-relative URLs starting with //', () => {
      expect(isSafeUrl('//evil.com/phishing')).toBe(false);
    });

    it('rejects empty, whitespace-only, or non-string inputs', () => {
      expect(isSafeUrl('')).toBe(false);
      expect(isSafeUrl('   ')).toBe(false);
      expect(isSafeUrl(null)).toBe(false);
      expect(isSafeUrl(undefined)).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    it('returns safe URL unchanged', () => {
      expect(sanitizeUrl('https://fluxora.xyz')).toBe('https://fluxora.xyz');
      expect(sanitizeUrl('/app/streams')).toBe('/app/streams');
    });

    it('replaces dangerous schemes with safe fallback', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
      expect(sanitizeUrl('data:text/html,evil', '/app/streams')).toBe('/app/streams');
      expect(sanitizeUrl('file:///etc/passwd')).toBe('#');
    });
  });

  describe('sanitizeMetadataText', () => {
    it('strips null bytes from untrusted strings', () => {
      expect(sanitizeMetadataText('Stream\x00Name')).toBe('StreamName');
      expect(sanitizeMetadataText('Safe Name')).toBe('Safe Name');
    });

    it('handles null and undefined gracefully', () => {
      expect(sanitizeMetadataText(null)).toBe('');
      expect(sanitizeMetadataText(undefined)).toBe('');
    });
  });
});
