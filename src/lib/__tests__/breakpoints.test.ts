import { describe, it, expect, vi, afterEach } from 'vitest';
import { isMobileViewport, BREAKPOINT_MD } from '../breakpoints';

describe('isMobileViewport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('boundary values around BREAKPOINT_MD', () => {
    it('returns true just below the breakpoint (767)', () => {
      expect(isMobileViewport(767)).toBe(true);
    });

    it('returns false exactly at the breakpoint (768)', () => {
      expect(isMobileViewport(BREAKPOINT_MD)).toBe(false);
    });

    it('returns false just above the breakpoint (769)', () => {
      expect(isMobileViewport(769)).toBe(false);
    });
  });

  describe('unusual widths', () => {
    it('treats 0 as mobile', () => {
      expect(isMobileViewport(0)).toBe(true);
    });

    it('treats a very large width as desktop', () => {
      expect(isMobileViewport(10000)).toBe(false);
    });
  });

  describe('default parameter behavior', () => {
    it('falls back to window.innerWidth when no argument is passed', () => {
      vi.stubGlobal('innerWidth', 500);
      expect(isMobileViewport()).toBe(true);
    });

    it('reflects a desktop-sized window.innerWidth by default', () => {
      vi.stubGlobal('innerWidth', 1024);
      expect(isMobileViewport()).toBe(false);
    });
  });
});