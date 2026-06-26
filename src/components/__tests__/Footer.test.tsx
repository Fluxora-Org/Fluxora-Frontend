import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Footer from '../Footer';

describe('Footer', () => {
  it('renders no anchor with href="#"', () => {
    const { container } = render(<Footer />);
    const placeholders = container.querySelectorAll('a[href="#"]');
    expect(placeholders).toHaveLength(0);
  });

  it('all external links have rel="noopener noreferrer" and target="_blank"', () => {
    const { container } = render(<Footer />);
    const externalLinks = Array.from(container.querySelectorAll('a[href^="https://"]'));
    expect(externalLinks.length).toBeGreaterThan(0);
    for (const link of externalLinks) {
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAttribute('target', '_blank');
    }
  });

  it('every anchor has a discernible accessible name', () => {
    const { container } = render(<Footer />);
    const links = Array.from(container.querySelectorAll('a'));
    for (const link of links) {
      const name =
        link.getAttribute('aria-label') ||
        link.textContent?.trim();
      expect(name).toBeTruthy();
    }
  });

  it('renders the Fluxora home link', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: /fluxora home/i })).toHaveAttribute('href', '/');
  });

  it('renders expected navigation column headings', () => {
    render(<Footer />);
    for (const heading of ['Product', 'Documentation', 'Legal', 'Contact']) {
      expect(screen.getByRole('navigation', { name: heading })).toBeInTheDocument();
    }
  });

  it('renders the GitHub external link with correct href', () => {
    render(<Footer />);
    const ghLink = screen.getByRole('link', { name: 'GitHub' });
    expect(ghLink).toHaveAttribute('href', 'https://github.com/Fluxora-Org/Fluxora-Frontend');
    expect(ghLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(ghLink).toHaveAttribute('target', '_blank');
  });

  it('renders the email link without target="_blank"', () => {
    render(<Footer />);
    const emailLink = screen.getByRole('link', { name: /email/i });
    expect(emailLink).toHaveAttribute('href', 'mailto:hello@fluxora.xyz');
    expect(emailLink).not.toHaveAttribute('target', '_blank');
  });
});
