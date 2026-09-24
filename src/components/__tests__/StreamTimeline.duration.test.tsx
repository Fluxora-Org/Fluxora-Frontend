import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StreamTimeline } from '../StreamTimeline';

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
const pluralRequired = {
  streamCount: ['zero', 'one', 'many'],
  batchResults: {
    successes: ['zero', 'one', 'many'],
    failures: ['zero', 'one', 'many'],
    skipped: ['zero', 'one', 'many'],
  },
} as const;

function hasPluralForms(value: unknown, forms: string[]): boolean {
  if (typeof value === 'string') {
    // Accept ICU plural syntax or simple {{count}} placeholder
    return /plural|{{count}}/.test(value);
  }
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    return forms.every((form) => form in obj);
  }
  return false;
}

function validatePlural(
  value: unknown,
  forms: string[],
  messageKey: string,
  path: string
) {
  expect(value, `Missing ${messageKey} in ${path}`).toBeDefined();
  expect(
    hasPluralForms(value, forms),
    `${messageKey} in ${path} is missing plural forms (${forms.join(', ')})`
  ).toBe(true);
}

function validateMessages(messages: Record<string, unknown>, path: string) {
  validatePlural(messages.streamCount, pluralRequired.streamCount, 'streamCount', path);

  const batchResults = messages.batchResults as Record<string, unknown> | undefined;
  expect(batchResults, `Missing batchResults in ${path}`).toBeDefined();
  if (batchResults) {
    for (const [subKey, forms] of Object.entries(pluralRequired.batchResults)) {
      const key = `batchResults.${subKey}`;
      validatePlural(batchResults[subKey], forms, key, path);
    }
  }
}

describe('Pluralized translations', () => {
  const localeFiles = import.meta.glob('../../locales/*.json', { eager: true }) as Record<string, any>;

  it('defines pluralized stream count and batch result messages for all supported locales', () => {
    const files = Object.entries(localeFiles);
    expect(files.length).toBeGreaterThan(0);
    for (const [path, module] of files) {
      const messages = (module.default ?? module) as Record<string, unknown>;
      validateMessages(messages, path);
    }
  });
});