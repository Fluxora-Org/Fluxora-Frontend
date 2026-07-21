import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Header from '../Header';

describe('TreasuryOverviewHeader', () => {
  it('renders the treasury heading with theme-aware text styles and no fixed black/white color class', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    const heading = screen.getByRole('heading', { name: 'Treasury overview' });
    const subtext = screen.getByText('Your streaming activity at a glance.');

    expect(heading).toBeInTheDocument();
    expect(subtext).toBeInTheDocument();
    expect(heading.className).not.toContain('text-black');
    expect(heading.className).not.toContain('text-white');
    expect(subtext.className).not.toContain('text-black');
    expect(subtext.className).not.toContain('text-white');
  });
});
