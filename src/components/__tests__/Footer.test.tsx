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
    const ghLink = screen.getByRole('link', { name: /github/i });
    expect(ghLink).toHaveAttribute('href', 'https://github.com/Fluxora-Org/Fluxora-Frontend');
    expect(ghLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(ghLink).toHaveAttribute('target', '_blank');
  });

  it('renders the email link without target="_blank"', () => {
    renderFooter();
    const emailLink = screen.getByRole('link', { name: /email fluxora/i });
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

// ─── Issue #1725: keyboard reachability and accessible labelling ───────────────

describe('Footer keyboard accessibility (#1725)', () => {
  it('every footer link is keyboard-reachable (no tabIndex="-1")', () => {
    const { container } = renderFooter();
    const links = Array.from(container.querySelectorAll('a'));
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).not.toHaveAttribute('tabindex', '-1');
    }
  });

  it('every footer link has a non-empty accessible name', () => {
    const { container } = renderFooter();
    const links = Array.from(container.querySelectorAll('a'));
    for (const link of links) {
      // accessible name: aria-label takes precedence, then text content
      const name =
        link.getAttribute('aria-label') ?? link.textContent?.trim() ?? '';
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it('focus-visible outline class is defined on footer links (CSS coverage)', () => {
    // Verify the footer__link and footer__icon-button classes exist in the DOM
    // so the CSS focus-visible rules have selectors to apply to.
    const { container } = renderFooter();
    const footerLinks = container.querySelectorAll('.footer__link');
    const iconButtons = container.querySelectorAll('.footer__icon-button');
    expect(footerLinks.length).toBeGreaterThan(0);
    expect(iconButtons.length).toBeGreaterThan(0);
  });

  it('external column links include an "opens in new tab" notice in their accessible name', () => {
    const { container } = renderFooter();
    // Find all anchors that open in a new tab inside a nav column
    const externalColumnLinks = Array.from(
      container.querySelectorAll('nav .footer__link[target="_blank"]')
    );
    expect(externalColumnLinks.length).toBeGreaterThan(0);
    for (const link of externalColumnLinks) {
      const textContent = link.textContent ?? '';
      expect(textContent.toLowerCase()).toContain('opens in new tab');
    }
  });

  it('social icon buttons include "opens in new tab" in their aria-label for external links', () => {
    const { container } = renderFooter();
    const socialIcons = Array.from(
      container.querySelectorAll('.footer__icon-button[target="_blank"]')
    );
    expect(socialIcons.length).toBeGreaterThan(0);
    for (const icon of socialIcons) {
      const label = icon.getAttribute('aria-label') ?? '';
      expect(label.toLowerCase()).toContain('opens in new tab');
    }
  });

  it('Twitter column link announces it opens in a new tab', () => {
    const { container } = renderFooter();
    // The Twitter column link lives inside a <nav> element
    const nav = container.querySelector('nav[aria-label="Contact"]') as HTMLElement;
    const twitterLink = nav.querySelector('a.footer__link[href="https://twitter.com/FluxoraHQ"]') as HTMLAnchorElement;
    expect(twitterLink).toBeTruthy();
    expect(twitterLink).toHaveAttribute('target', '_blank');
    expect(twitterLink.textContent?.toLowerCase()).toContain('opens in new tab');
  });

  it('Discord column link announces it opens in a new tab', () => {
    const { container } = renderFooter();
    const nav = container.querySelector('nav[aria-label="Contact"]') as HTMLElement;
    const discordLink = nav.querySelector('a.footer__link[href="https://discord.gg/fluxora"]') as HTMLAnchorElement;
    expect(discordLink).toBeTruthy();
    expect(discordLink).toHaveAttribute('target', '_blank');
    expect(discordLink.textContent?.toLowerCase()).toContain('opens in new tab');
  });

  it('GitHub column link announces it opens in a new tab', () => {
    renderFooter();
    const githubLink = screen.getByRole('link', { name: /github/i });
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink.textContent?.toLowerCase()).toContain('opens in new tab');
  });

  it('Twitter social icon aria-label includes "opens in new tab"', () => {
    const { container } = renderFooter();
    const twitterIcon = container.querySelector(
      'a.footer__icon-button[href="https://twitter.com/FluxoraHQ"]'
    ) as HTMLAnchorElement;
    expect(twitterIcon).toBeTruthy();
    expect(twitterIcon.getAttribute('aria-label')?.toLowerCase()).toContain('opens in new tab');
  });

  it('Discord social icon aria-label includes "opens in new tab"', () => {
    const { container } = renderFooter();
    const discordIcon = container.querySelector(
      'a.footer__icon-button[href="https://discord.gg/fluxora"]'
    ) as HTMLAnchorElement;
    expect(discordIcon).toBeTruthy();
    expect(discordIcon.getAttribute('aria-label')?.toLowerCase()).toContain('opens in new tab');
  });

  it('email link is not marked as external (mailto: does not open a new browser tab)', () => {
    renderFooter();
    const emailLink = screen.getByRole('link', { name: /email fluxora/i });
    expect(emailLink).not.toHaveAttribute('target', '_blank');
  });
});

