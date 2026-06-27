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
