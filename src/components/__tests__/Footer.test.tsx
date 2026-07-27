import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Footer from '../Footer';

const renderFooter = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );

describe('Footer', () => {
  it('renders no anchor with href="#"', () => {
    const { container } = renderFooter();
    const placeholders = container.querySelectorAll('a[href="#"]');
    expect(placeholders).toHaveLength(0);
  });

  it('all external links have rel="noopener noreferrer" and target="_blank"', () => {
    const { container } = renderFooter();
    const externalLinks = Array.from(container.querySelectorAll('a[href^="https://"]'));
    expect(externalLinks.length).toBeGreaterThan(0);
    for (const link of externalLinks) {
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAttribute('target', '_blank');
    }
  });

  it('every anchor has a discernible accessible name', () => {
    const { container } = renderFooter();
    const links = Array.from(container.querySelectorAll('a'));
    for (const link of links) {
      const name = link.getAttribute('aria-label') || link.textContent?.trim();
      expect(name).toBeTruthy();
    }
  });

  it('renders the Fluxora home link', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: /fluxora home/i })).toHaveAttribute('href', '/');
  });

  it('renders expected navigation column headings', () => {
    renderFooter();
    for (const heading of ['Product', 'Contact']) {
      expect(screen.getByRole('navigation', { name: heading })).toBeInTheDocument();
    }
  });

  it('renders the GitHub external link with correct href', () => {
    renderFooter();
    const ghLink = screen.getByRole('link', { name: 'GitHub' });
    expect(ghLink).toHaveAttribute('href', 'https://github.com/Fluxora-Org/Fluxora-Frontend');
    expect(ghLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(ghLink).toHaveAttribute('target', '_blank');
  });

  it('renders the email link without target="_blank"', () => {
    renderFooter();
    const emailLink = screen.getByRole('link', { name: /email/i });
    expect(emailLink).toHaveAttribute('href', 'mailto:hello@fluxora.xyz');
    expect(emailLink).not.toHaveAttribute('target', '_blank');
  });

  it('ensures all internal links point to existing App.tsx routes', () => {
    const { container } = renderFooter();
    const internalLinks = Array.from(container.querySelectorAll('a'))
      .map((a) => a.getAttribute('href'))
      .filter((href): href is string => !!href && !href.startsWith('http') && !href.startsWith('mailto:'));

    const validRoutes = ['/', '/app', '/streams', '/connect-wallet'];

    for (const href of internalLinks) {
      expect(validRoutes).toContain(href);
    }
  });

  it('does not contain any non-existent 404 routes', () => {
    const { container } = renderFooter();
    const allHrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));

    const removedRoutes = [
      '/features',
      '/analytics',
      '/docs/getting-started',
      '/docs/api-reference',
      '/docs/smart-contracts',
      '/docs/integration-guide',
      '/legal/privacy-policy',
      '/legal/terms',
      '/legal/security',
      '/legal/audits',
      '/support',
      '/status',
      '/changelog',
      '/design-system',
      '/error-pages',
    ];

    for (const route of removedRoutes) {
      expect(allHrefs).not.toContain(route);
    }
  });
});

