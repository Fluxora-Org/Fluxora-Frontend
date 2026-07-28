import { describe, test, expect } from 'vitest';
import {
  getContrastRatio,
  simulatedContrastRatio,
  THEME_BACKGROUNDS,
  type ColorBlindType,
} from '../../../utils/contrastUtils';

type Variant = {
  name: string;
  textColor: string;
  bgColor: string;
};

const variants: Variant[] = [
  { name: 'Active', textColor: '#1ec98e', bgColor: 'rgba(30, 201, 142, 0.3)' },
  { name: 'Paused', textColor: '#ffa726', bgColor: 'rgba(255, 167, 38, 0.3)' },
  { name: 'Completed', textColor: '#00b8d4', bgColor: 'rgba(0, 184, 212, 0.1)' },
  { name: 'Healthy', textColor: '#1ec98e', bgColor: 'rgba(30, 201, 142, 0.3)' },
  { name: 'At-Risk', textColor: '#ffa726', bgColor: 'rgba(255, 167, 38, 0.3)' },
  { name: 'Critical', textColor: '#ff6b6b', bgColor: 'rgba(255, 107, 107, 0.1)' },
];

describe.skip('StatusPill contrast ratios', () => {
  variants.forEach(v => {
    // TODO: PR #786 didn't account for alpha-channel compositing when
    // converting rgba() to hex. Once `getContrastRatio` (or this test) is
    // updated to composite onto a baseline surface, re-enable these.
    const testFn = (v.name === 'Paused' || v.name === 'At-Risk' || v.name === 'Critical')
      ? test.skip
      : test;
    testFn(`${v.name} variant meets WCAG AA contrast`, () => {
      const rgbaMatch = v.bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
      if (!rgbaMatch) throw new Error('Invalid bg color format');
      const [, r, g, b] = rgbaMatch;
      const bgHex = `#${Number(r).toString(16).padStart(2, '0')}${Number(g).toString(16).padStart(2, '0')}${Number(b).toString(16).padStart(2, '0')}`;
      const ratio = getContrastRatio(v.textColor, bgHex);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });
});

describe('StatusPill color-blind simulated contrast ratios', () => {
  const darkBg = THEME_BACKGROUNDS.dark; // '#0a0e17'
  const statusTokens = [
    { name: 'status-success', fg: '#1ec98e' },
    { name: 'status-warning', fg: '#ffa726' },
    { name: 'status-error', fg: '#ff6b6b' },
    { name: 'status-info', fg: '#00b8d4' },
  ];
  const filters: ColorBlindType[] = ['protanopia', 'deuteranopia', 'tritanopia'];

  filters.forEach((filter) => {
    describe(`under ${filter} simulation`, () => {
      statusTokens.forEach(({ name, fg }) => {
        test(`${name} (${fg}) computes a valid simulated contrast ratio against dark theme background`, () => {
          const ratio = simulatedContrastRatio(fg, darkBg, filter);
          expect(ratio).not.toBeNull();
          expect(ratio!).toBeGreaterThan(1.0);
        });
      });
    });
  });
});
