import { describe, it, expect } from 'vitest';
import {
  parseThemeFromQuery,
  parseAccentColorFromQuery,
  isValidCssVariableValue,
  applyThemeConfigSafely,
  type ThemeConfig
} from '../embedThemeParser';

describe('embedThemeParser', () => {
  describe('parseThemeFromQuery', () => {
    it('returns "light" for valid light theme', () => {
      expect(parseThemeFromQuery('light')).toBe('light');
      expect(parseThemeFromQuery('LIGHT')).toBe('light');
      expect(parseThemeFromQuery(' Light ')).toBe('light');
    });

    it('returns "dark" for valid dark theme', () => {
      expect(parseThemeFromQuery('dark')).toBe('dark');
      expect(parseThemeFromQuery('DARK')).toBe('dark');
      expect(parseThemeFromQuery(' Dark ')).toBe('dark');
    });

    it('returns null for invalid themes', () => {
      expect(parseThemeFromQuery('invalid')).toBeNull();
      expect(parseThemeFromQuery('')).toBeNull();
      expect(parseThemeFromQuery(null)).toBeNull();
      expect(parseThemeFromQuery('cyberpunk')).toBeNull();
      expect(parseThemeFromQuery('light-dark')).toBeNull();
    });

    it('rejects injection attempts', () => {
      expect(parseThemeFromQuery('light" onload="alert(1)')).toBeNull();
      expect(parseThemeFromQuery('dark><script>alert()</script>')).toBeNull();
    });
  });

  describe('parseAccentColorFromQuery', () => {
    it('accepts valid 6-digit hex colors', () => {
      expect(parseAccentColorFromQuery('#00AEEF')).toBe('#00AEEF');
      expect(parseAccentColorFromQuery('#ffffff')).toBe('#ffffff');
      expect(parseAccentColorFromQuery('#000000')).toBe('#000000');
      expect(parseAccentColorFromQuery('#123456')).toBe('#123456');
    });

    it('accepts valid 3-digit hex colors', () => {
      expect(parseAccentColorFromQuery('#abc')).toBe('#abc');
      expect(parseAccentColorFromQuery('#DEF')).toBe('#DEF');
      expect(parseAccentColorFromQuery('#123')).toBe('#123');
    });

    it('rejects invalid hex colors', () => {
      expect(parseAccentColorFromQuery('red')).toBeNull();
      expect(parseAccentColorFromQuery('#gggggg')).toBeNull();
      expect(parseAccentColorFromQuery('#12345')).toBeNull(); // 5 digits
      expect(parseAccentColorFromQuery('#1234567')).toBeNull(); // 7 digits
      expect(parseAccentColorFromQuery('123456')).toBeNull(); // missing #
    });

    it('rejects CSS functions and dangerous patterns', () => {
      expect(parseAccentColorFromQuery('rgb(255,0,0)')).toBeNull();
      expect(parseAccentColorFromQuery('hsl(120,100%,50%)')).toBeNull();
      expect(parseAccentColorFromQuery('url("evil.com")')).toBeNull();
      expect(parseAccentColorFromQuery('javascript:alert()')).toBeNull();
      expect(parseAccentColorFromQuery('data:text/html,<script>alert()</script>')).toBeNull();
      expect(parseAccentColorFromQuery('#00AEEF;background:red')).toBeNull();
    });

    it('handles null and empty values', () => {
      expect(parseAccentColorFromQuery(null)).toBeNull();
      expect(parseAccentColorFromQuery('')).toBeNull();
      expect(parseAccentColorFromQuery('   ')).toBeNull();
    });

    it('trims whitespace', () => {
      expect(parseAccentColorFromQuery('  #00AEEF  ')).toBe('#00AEEF');
    });
  });

  describe('isValidCssVariableValue', () => {
    it('accepts safe CSS values', () => {
      expect(isValidCssVariableValue('#00AEEF')).toBe(true);
      expect(isValidCssVariableValue('12px')).toBe(true);
      expect(isValidCssVariableValue('bold')).toBe(true);
      expect(isValidCssVariableValue('var(--custom-token)')).toBe(true);
    });

    it('rejects dangerous patterns', () => {
      expect(isValidCssVariableValue('javascript:alert()')).toBe(false);
      expect(isValidCssVariableValue('data:text/html,<script>')).toBe(false);
      expect(isValidCssVariableValue('expression(alert(1))')).toBe(false);
      expect(isValidCssVariableValue('url("evil.com")')).toBe(false);
      expect(isValidCssVariableValue('</style><script>alert()</script>')).toBe(false);
      expect(isValidCssVariableValue('\\u0061lert(1)')).toBe(false);
      expect(isValidCssVariableValue('\\x61lert(1)')).toBe(false);
    });

    it('rejects CSS with code-like patterns', () => {
      expect(isValidCssVariableValue('{color:red;}')).toBe(false);
      expect(isValidCssVariableValue('color:red;background:blue')).toBe(false);
      expect(isValidCssVariableValue('@import "evil.css"')).toBe(false);
    });
  });

  describe('applyThemeConfigSafely', () => {
    let originalTheme: string | null;
    let originalAccentColor: string;
    let originalFocusRing: string;

    beforeEach(() => {
      originalTheme = document.documentElement.getAttribute('data-theme');
      originalAccentColor = document.documentElement.style.getPropertyValue('--color-accent-primary');
      originalFocusRing = document.documentElement.style.getPropertyValue('--interactive-focus-ring');
      
      // Clear for tests
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.style.removeProperty('--color-accent-primary');
      document.documentElement.style.removeProperty('--interactive-focus-ring');
    });

    afterEach(() => {
      // Restore original
      if (originalTheme) {
        document.documentElement.setAttribute('data-theme', originalTheme);
      }
      if (originalAccentColor) {
        document.documentElement.style.setProperty('--color-accent-primary', originalAccentColor);
      }
      if (originalFocusRing) {
        document.documentElement.style.setProperty('--interactive-focus-ring', originalFocusRing);
      }
    });

    it('applies valid theme configuration', () => {
      const config: ThemeConfig = {
        theme: 'dark',
        accentColor: '#00AEEF'
      };

      const cleanup = applyThemeConfigSafely(config);

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(document.documentElement.style.getPropertyValue('--color-accent-primary')).toBe('#00AEEF');
      expect(document.documentElement.style.getPropertyValue('--interactive-focus-ring')).toBe('#00AEEF');

      cleanup();
    });

    it('applies only theme when no accent color', () => {
      const config: ThemeConfig = {
        theme: 'light',
        accentColor: null
      };

      const cleanup = applyThemeConfigSafely(config);

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(document.documentElement.style.getPropertyValue('--color-accent-primary')).toBe('');
      
      cleanup();
    });

    it('applies only accent color when no theme', () => {
      const config: ThemeConfig = {
        theme: null,
        accentColor: '#FF0000'
      };

      const cleanup = applyThemeConfigSafely(config);

      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
      expect(document.documentElement.style.getPropertyValue('--color-accent-primary')).toBe('#FF0000');
      
      cleanup();
    });

    it('handles invalid accent colors safely', () => {
      const config: ThemeConfig = {
        theme: 'dark',
        accentColor: 'javascript:alert()'
      };

      const cleanup = applyThemeConfigSafely(config);

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(document.documentElement.style.getPropertyValue('--color-accent-primary')).toBe('');
      
      cleanup();
    });

    it('restores original state on cleanup', () => {
      // Set some original state
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.style.setProperty('--color-accent-primary', '#000000');
      document.documentElement.style.setProperty('--interactive-focus-ring', '#000000');

      const config: ThemeConfig = {
        theme: 'dark',
        accentColor: '#FFFFFF'
      };

      const cleanup = applyThemeConfigSafely(config);

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(document.documentElement.style.getPropertyValue('--color-accent-primary')).toBe('#FFFFFF');
      expect(document.documentElement.style.getPropertyValue('--interactive-focus-ring')).toBe('#FFFFFF');

      cleanup();

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(document.documentElement.style.getPropertyValue('--color-accent-primary')).toBe('#000000');
      expect(document.documentElement.style.getPropertyValue('--interactive-focus-ring')).toBe('#000000');
    });

    it('handles missing original state on cleanup', () => {
      const config: ThemeConfig = {
        theme: 'dark',
        accentColor: '#00AEEF'
      };

      const cleanup = applyThemeConfigSafely(config);

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      cleanup();

      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
      expect(document.documentElement.style.getPropertyValue('--color-accent-primary')).toBe('');
      expect(document.documentElement.style.getPropertyValue('--interactive-focus-ring')).toBe('');
    });

    it('restores pre-existing --interactive-focus-ring value on cleanup', () => {
      document.documentElement.style.setProperty('--interactive-focus-ring', '#ABCDEF');

      const config: ThemeConfig = {
        theme: null,
        accentColor: '#FF0000'
      };

      const cleanup = applyThemeConfigSafely(config);

      expect(document.documentElement.style.getPropertyValue('--interactive-focus-ring')).toBe('#FF0000');

      cleanup();

      expect(document.documentElement.style.getPropertyValue('--interactive-focus-ring')).toBe('#ABCDEF');
    });
  });
});