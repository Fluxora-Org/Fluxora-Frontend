import { getContrastRatio } from '../../utils/contrastUtils';

type Variant = {
  name: string;
  background: string;
  color: string;
};

const variants: Variant[] = [
  {
    name: 'Active',
    background: 'rgba(30, 201, 142, 0.30)', // --status-success-bg
    color: '#10b981', // --status-success
  },
  {
    name: 'Paused',
    background: 'rgba(255, 167, 38, 0.30)', // --status-warning-bg
    color: '#f59e0b', // --status-warning
  },
  {
    name: 'Completed',
    background: 'rgba(0, 184, 212, 0.15)', // --status-info-bg
    color: '#3b82f6', // --status-info
  },
  {
    name: 'Healthy',
    background: 'rgba(30, 201, 142, 0.30)', // same as Active
    color: '#10b981',
  },
  {
    name: 'At-Risk',
    background: 'rgba(255, 167, 38, 0.30)', // same as Paused
    color: '#f59e0b',
  },
  {
    name: 'Critical',
    background: 'rgba(255, 107, 107, 0.15)', // --status-error-bg
    color: '#ef4444', // --status-error
  },
];

describe('StatusPill contrast ratios', () => {
  test.each(variants)('variant $name meets WCAG AA contrast', ({ name, background, color }) => {
    const ratio = getContrastRatio(color, background);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
