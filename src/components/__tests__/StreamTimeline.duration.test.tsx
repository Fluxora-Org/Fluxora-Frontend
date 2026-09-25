import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StreamTimeline } from '../StreamTimeline';
import { en } from '../../i18n/en';

describe('StreamTimeline Duration', () => {
  it('renders a fallback when duration is zero (end == start)', () => {
    render(
      <StreamTimeline
        startDate="2024-01-01T00:00:00Z"
        cliffDate={null}
        currentDate="2024-01-01T00:00:00Z"
        endDate="2024-01-01T00:00:00Z"
        withdrawableAmount={0}
        totalAmount={100}
        status="active"
      />
    );
    expect(screen.getByText('Invalid date configuration')).toBeInTheDocument();
  });

  it('renders a fallback when duration is negative (end < start)', () => {
    render(
      <StreamTimeline
        startDate="2024-02-01T00:00:00Z"
        cliffDate={null}
        currentDate="2024-01-15T00:00:00Z"
        endDate="2024-01-01T00:00:00Z"
        withdrawableAmount={0}
        totalAmount={100}
        status="active"
      />
    );
    expect(screen.getByText('Invalid date configuration')).toBeInTheDocument();
  });
});

// New tests for pluralized translation keys
const countPluralKeys = [
  'transactionDemo.successes',
  'transactionDemo.failures',
  'transactionDemo.skipped',
  'invalidRowsSkipped',
] as const;

const parameterizedPluralKeys = [
  'streamTimeline.progress',
  'streamTimeline.withdrawable',
  'streamTimeline.totalAmount',
] as const;

describe('Pluralized translations', () => {
  it('defines _one/_other plural forms for stream counts and batch results in the en catalog', () => {
    for (const base of countPluralKeys) {
      const one = `${base}_one`;
      const other = `${base}_other`;
      expect(one in en, `Missing ${one} in en catalog`).toBe(true);
      expect(other in en, `Missing ${other} in en catalog`).toBe(true);
      const oneVal = (en as Record<string, string>)[one];
      const otherVal = (en as Record<string, string>)[other];
      expect(oneVal.includes('{count}'), `${one} must interpolate {count}`).toBe(true);
      expect(otherVal.includes('{count}'), `${other} must interpolate {count}`).toBe(true);
    }
  });

  it('defines _one/_other parameterized timeline messages in the en catalog', () => {
    for (const base of parameterizedPluralKeys) {
      const one = `${base}_one`;
      const other = `${base}_other`;
      expect(one in en, `Missing ${one} in en catalog`).toBe(true);
      expect(other in en, `Missing ${other} in en catalog`).toBe(true);
    }
  });
});