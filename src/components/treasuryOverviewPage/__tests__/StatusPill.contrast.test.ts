import { getContrastRatio } from '../../utils/contrastUtils';

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

describe('StatusPill contrast ratios', () => {
  variants.forEach(v => {
    test(`${v.name} variant meets WCAG AA contrast`, () => {
      const rgbaMatch = v.bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
      if (!rgbaMatch) throw new Error('Invalid bg color format');
      const [, r, g, b] = rgbaMatch;
      const bgHex = `#${Number(r).toString(16).padStart(2, '0')}${Number(g).toString(16).padStart(2, '0')}${Number(b).toString(16).padStart(2, '0')}`;
      const ratio = getContrastRatio(v.textColor, bgHex);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });
});
