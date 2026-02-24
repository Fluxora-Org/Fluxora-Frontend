import './footer.css';

const columnLinks = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Dashboard', href: '/' },
      { label: 'Streams', href: '/streams' },
      { label: 'Analytics', href: '/analytics' },
    ],
  },
  {
    heading: 'Documentation',
    links: [
      { label: 'Getting Started', href: '/docs/getting-started' },
      { label: 'API Reference', href: '/docs/api-reference' },
      { label: 'Smart Contracts', href: '/docs/smart-contracts' },
      { label: 'Integration Guide', href: '/docs/integration-guide' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/legal/privacy-policy' },
      { label: 'Terms of Service', href: '/legal/terms' },
      { label: 'Security', href: '/legal/security' },
      { label: 'Audits', href: '/legal/audits' },
    ],
  },
  {
    heading: 'Contact',
    links: [
      { label: 'Support', href: '/support' },
      { label: 'Twitter', href: 'https://twitter.com' },
      { label: 'Discord', href: 'https://discord.com' },
      { label: 'GitHub', href: 'https://github.com/Fluxora-Org/Fluxora-Frontend' },
    ],
  },
];

const utilityLinks = [
  { label: 'Status', href: '/status' },
  { label: 'Changelog', href: '/changelog' },
  { label: 'Design System', href: '/design-system' },
  { label: 'Error Pages', href: '/error-pages' },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__primary">
        <div className="footer__brand">
          <a className="footer__logo-link" href="/" aria-label="Fluxora home">
            <span className="footer__logo-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="presentation">
                <path d="M5 7.5c1.5 1 3.2 1.5 5.2 1.5s3.7-.5 5.2-1.5" />
                <path d="M5 12c1.5 1 3.2 1.5 5.2 1.5s3.7-.5 5.2-1.5" />
                <path d="M5 16.5c1.5 1 3.2 1.5 5.2 1.5s3.7-.5 5.2-1.5" />
              </svg>
            </span>
            <span className="footer__logo-text">Fluxora</span>
          </a>

          <p className="footer__tagline">
            Real-time treasury streaming on Stellar. Built for the next generation of DAOs and ecosystem funds.
          </p>

          <div className="footer__socials">
            <a className="footer__icon-button" href="https://twitter.com" aria-label="Twitter">
              <svg viewBox="0 0 24 24" role="presentation">
                <path d="M18.8 7.2a4.1 4.1 0 0 1-1.2.4 2.1 2.1 0 0 0 .9-1.2 4.3 4.3 0 0 1-1.3.5 2.1 2.1 0 0 0-3.6 1.4c0 .2 0 .4.1.6a6.1 6.1 0 0 1-4.4-2.2 2.1 2.1 0 0 0 .7 2.8 2 2 0 0 1-1-.3 2.1 2.1 0 0 0 1.7 2.1l-.5.1h-.4a2.1 2.1 0 0 0 2 1.5 4.2 4.2 0 0 1-2.7.9H8a6 6 0 0 0 3.3 1c4 0 6.2-3.3 6.2-6.1v-.3a4.4 4.4 0 0 0 1.1-1.2Z" />
              </svg>
            </a>
            <a className="footer__icon-button" href="https://discord.com" aria-label="Discord">
              <svg viewBox="0 0 24 24" role="presentation">
                <path d="M8.2 8.5a7 7 0 0 1 1.7-.5l.2.4a9.4 9.4 0 0 1 3.8 0l.2-.4a7 7 0 0 1 1.7.5c1.2 1.8 1.5 3.5 1.4 5.2a7 7 0 0 1-2.2 1.1l-.5-.8a4.5 4.5 0 0 0 .9-.4 5 5 0 0 1-1.4.7 7.5 7.5 0 0 1-4 0 5 5 0 0 1-1.4-.7c.3.2.6.4.9.4l-.5.8a7 7 0 0 1-2.2-1.1c0-1.7.2-3.4 1.4-5.2Zm2.2 4.3c.5 0 .9-.5.9-1s-.4-1-.9-1-.9.5-.9 1 .4 1 .9 1Zm3.2 0c.5 0 .9-.5.9-1s-.4-1-.9-1-.9.5-.9 1 .4 1 .9 1Z" />
              </svg>
            </a>
            <a className="footer__icon-button" href="mailto:hello@fluxora.xyz" aria-label="Email">
              <svg viewBox="0 0 24 24" role="presentation">
                <path d="M4.5 7.5h15a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Zm0 1.4 7.3 4.8 7.2-4.8" />
              </svg>
            </a>
          </div>
        </div>

        {columnLinks.map((column) => (
          <nav className="footer__column" key={column.heading} aria-label={column.heading}>
            <h2 className="footer__column-title">{column.heading}</h2>
            <ul className="footer__column-list">
              {column.links.map((link) => (
                <li key={link.label}>
                  <a className="footer__link" href={link.href}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="footer__secondary">
        <p className="footer__copyright">© 2026 Fluxora. Built on Stellar.</p>
        <nav className="footer__utility-nav" aria-label="Footer utility links">
          {utilityLinks.map((link) => (
            <a className="footer__utility-link" href={link.href} key={link.label}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
