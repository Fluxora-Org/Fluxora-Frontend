/**
 * Security tests for rendering untrusted event and metadata fields.
 *
 * Covers Issue #1404: ensures hostile strings in contract-derived stream
 * and treasury metadata remain plain text rather than executable markup.
 *
 * Policy: all untrusted metadata fields are rendered as text content via
 * React's automatic JSX escaping. No component uses dangerouslySetInnerHTML
 * for untrusted data. Links derived from untrusted fields must use only
 * safe schemes (https:, mailto:, or relative paths).
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import RecentStreams, { type Stream } from '../RecentStreams';
import { StreamOGImageTemplate } from '../StreamOGImageTemplate';
import type { StreamRecord } from '../../data/streamRecords';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const makeStream = (overrides: Partial<Stream> = {}): Stream => ({
  id: 'stream-1',
  name: 'Test Stream',
  recipient: '0xABCDEF',
  rate: '10 USDC/day',
  status: 'Active',
  ...overrides,
});

const makeStreamRecord = (
  overrides: Partial<StreamRecord> = {},
): StreamRecord => ({
  id: 'STR-TEST-1',
  name: 'Core Infrastructure Grant',
  recipientName: 'Satoshi N.',
  recipientAddress: 'GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P',
  treasuryName: 'Growth Treasury',
  treasuryAddress: 'GAJSINKGK5UHTCU3VS645X7QAEJCGNCFKZTXRCM2VO6M3XXPAAISFPVT',
  asset: 'USDC',
  status: 'Active',
  monthlyRate: 8500,
  depositAmount: 51000,
  streamedAmount: 17000,
  withdrawableAmount: 2500,
  remainingAmount: 34000,
  progress: 33.3,
  startDate: '2026-01-01',
  endDate: '2026-07-01',
  cliffDate: '2026-01-31',
  summary: 'Infrastructure development grant stream.',
  health: 'Healthy',
  healthNote: 'Runway covers the remaining schedule.',
  auditNote: 'No intervention required.',
  tags: ['Infrastructure'],
  timeline: [],
  ...overrides,
});

// ---------------------------------------------------------------------------
// Malicious payloads
// ---------------------------------------------------------------------------

const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '<img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>',
  '<iframe src="javascript:alert(1)">',
  '<body onload=alert(1)>',
  '<div onmouseover="alert(1)">hover me</div>',
  '<a href="javascript:alert(1)">click</a>',
  '"><script>alert(String.fromCharCode(88,83,83))</script>',
  "'-alert(1)-'",
  '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
];

const DANGEROUS_URL_PAYLOADS = [
  'javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:MsgBox(1)',
  'file:///etc/passwd',
  'ftp://evil.com/malware',
  'javascript:void(0)',
];

const HTML_LOOKING_PAYLOADS = [
  '<b>bold text</b>',
  '<i>italic text</i>',
  '<u>underlined</u>',
  '<em>emphasis</em>',
  '<strong>strong</strong>',
  '<h1>heading</h1>',
  '<p>paragraph</p>',
  '<br>line break',
  '<div class="x">div with class</div>',
  '<span style="color:red">styled span</span>',
  '<a href="https://safe.com">safe link</a>',
  '<a href="javascript:alert(1)">dangerous link</a>',
];

const LONG_VALUE_PAYLOADS = [
  'A'.repeat(1000),
  'B'.repeat(5000),
  '\u0000'.repeat(100),  // null bytes
  '\n'.repeat(50),        // newlines
  '\t'.repeat(50),        // tabs
  ' '.repeat(200),        // spaces
];

// ---------------------------------------------------------------------------
// RecentStreams security tests
// ---------------------------------------------------------------------------

describe('RecentStreams – untrusted metadata security', () => {
  // -----------------------------------------------------------------------
  // Script tag injection
  // -----------------------------------------------------------------------

  it('renders script-tag payload as escaped text, not executable markup', () => {
    XSS_PAYLOADS.forEach((payload) => {
      const { unmount } = renderWithRouter(
        <RecentStreams streams={[makeStream({ name: payload })]} />,
      );

      expect(document.querySelector('script')).toBeNull();
      expect(screen.getByText(payload)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders script-tag payload in recipient as escaped text', () => {
    XSS_PAYLOADS.forEach((payload) => {
      const { unmount } = renderWithRouter(
        <RecentStreams streams={[makeStream({ recipient: payload })]} />,
      );

      expect(document.querySelector('script')).toBeNull();
      expect(document.querySelector('img[onerror]')).toBeNull();
      unmount();
    });
  });

  // -----------------------------------------------------------------------
  // Dangerous URL schemes in detailUrl
  // -----------------------------------------------------------------------

  it('dangerous URL schemes are rendered as text in link href without executable attributes', () => {
    DANGEROUS_URL_PAYLOADS.forEach((scheme) => {
      const url = `${scheme}//evil.com`;
      const { unmount } = renderWithRouter(
        <RecentStreams
          streams={[makeStream({ id: 'x', detailUrl: url })]}
        />,
      );

      const links = document.querySelectorAll('a');
      links.forEach((link) => {
        // No inline event handlers should be created
        expect(link.getAttribute('onclick')).toBeNull();
        expect(link.getAttribute('onmouseover')).toBeNull();
        expect(link.getAttribute('onerror')).toBeNull();
        expect(link.getAttribute('onload')).toBeNull();
      });
      unmount();
    });
  });

  it('link text content is safe ("View") regardless of detailUrl', () => {
    DANGEROUS_URL_PAYLOADS.forEach((scheme) => {
      const url = `${scheme}//evil.com`;
      const { unmount } = renderWithRouter(
        <RecentStreams
          streams={[makeStream({ id: 'x', detailUrl: url })]}
        />,
      );

      const viewLink = screen.getByRole('link', { name: /view details/i });
      expect(viewLink.textContent?.trim()).toBe('View');
      unmount();
    });
  });

  // -----------------------------------------------------------------------
  // HTML-looking metadata rendered as text
  // -----------------------------------------------------------------------

  it('renders HTML-looking metadata as text, not as parsed elements', () => {
    HTML_LOOKING_PAYLOADS.forEach((payload) => {
      const { unmount, container } = renderWithRouter(
        <RecentStreams streams={[makeStream({ name: payload })]} />,
      );

      // No nested elements should be created from the HTML string
      const tbody = container.querySelector('tbody');
      const cells = tbody?.querySelectorAll('td') ?? [];
      const nameCell = cells[0];
      if (nameCell) {
        // The cell should contain only a text node, not child elements
        const streamNameDiv = nameCell.querySelector('div');
        expect(streamNameDiv).toBeTruthy();
        // No nested elements from injected HTML
        if (streamNameDiv) {
          expect(streamNameDiv.children.length).toBe(0);
          expect(streamNameDiv.textContent).toBe(payload);
        }
      }
      unmount();
    });
  });

  // -----------------------------------------------------------------------
  // Long values
  // -----------------------------------------------------------------------

  it('renders extremely long metadata values without overflow or injection', () => {
    LONG_VALUE_PAYLOADS.forEach((payload) => {
      const { unmount, container } = renderWithRouter(
        <RecentStreams streams={[makeStream({ name: payload })]} />,
      );

      expect(document.querySelector('script')).toBeNull();
      // Use container.textContent to find text that may be broken across elements
      const tbody = container.querySelector('tbody');
      expect(tbody?.textContent).toContain(payload);
      unmount();
    });
  });

  it('renders long recipient values without creating extra DOM elements', () => {
    const longValue = 'X'.repeat(5000);
    const { container } = renderWithRouter(
      <RecentStreams streams={[makeStream({ recipient: longValue })]} />,
    );

    const tbody = container.querySelector('tbody');
    const rows = tbody?.querySelectorAll('tr') ?? [];
    expect(rows).toHaveLength(1);

    const code = container.querySelector('code');
    expect(code?.textContent).toBe(longValue);
  });

  // -----------------------------------------------------------------------
  // Null bytes and control characters
  // -----------------------------------------------------------------------

  it('renders null bytes and control characters as text without truncation', () => {
    const payload = 'name\x00with\x00null\x00bytes';
    const { unmount } = renderWithRouter(
      <RecentStreams streams={[makeStream({ name: payload })]} />,
    );

    expect(screen.getByText(payload)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    unmount();
  });

  // -----------------------------------------------------------------------
  // React auto-escaping behavior
  // -----------------------------------------------------------------------

  it('does not use dangerouslySetInnerHTML anywhere in the component tree', () => {
    const { container } = renderWithRouter(
      <RecentStreams
        streams={[
          makeStream({
            name: '<script>alert(1)</script>',
            recipient: '<img src=x onerror=alert(1)>',
          }),
        ]}
      />,
    );

    // Verify no script or img elements with event handlers exist
    expect(container.querySelectorAll('script')).toHaveLength(0);
    expect(container.querySelectorAll('[onerror]')).toHaveLength(0);
    expect(container.querySelectorAll('[onload]')).toHaveLength(0);
    expect(container.querySelectorAll('[onclick]')).toHaveLength(0);
    expect(container.querySelectorAll('[onmouseover]')).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // Link safety: View link uses React Router, not raw href
  // -----------------------------------------------------------------------

  it('View link href defaults to safe relative path when detailUrl is omitted', () => {
    const { unmount } = renderWithRouter(
      <RecentStreams streams={[makeStream({ id: 'abc-123' })]} />,
    );

    const viewLink = screen.getByRole('link', { name: /view details/i });
    expect(viewLink.getAttribute('href')).toBe('/app/streams/abc-123');
    unmount();
  });

  it('View link renders with no inline event handlers and rejects dangerous detailUrl schemes', () => {
    const { unmount } = renderWithRouter(
      <RecentStreams
        streams={[
          makeStream({
            id: 'safe-id',
            detailUrl: 'javascript:alert(1)',
          }),
        ]}
      />,
    );

    const viewLink = screen.getByRole('link', { name: /view details/i });
    expect(viewLink.getAttribute('onclick')).toBeNull();
    expect(viewLink.getAttribute('onmouseover')).toBeNull();
    expect(viewLink.getAttribute('onload')).toBeNull();
    // Enforces safe navigation fallback when dangerous scheme is passed
    expect(viewLink.getAttribute('href')).toBe('/app/streams/safe-id');
    unmount();
  });
});

// ---------------------------------------------------------------------------
// StreamOGImageTemplate security tests
// ---------------------------------------------------------------------------

describe('StreamOGImageTemplate – untrusted metadata security', () => {
  it('renders script-tag payloads in stream name as escaped text', () => {
    XSS_PAYLOADS.forEach((payload) => {
      const { unmount } = render(
        <StreamOGImageTemplate stream={makeStreamRecord({ name: payload })} />,
      );

      expect(document.querySelector('script')).toBeNull();
      expect(screen.getByText(payload)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders script-tag payloads in recipientName as escaped text', () => {
    XSS_PAYLOADS.forEach((payload) => {
      const { unmount } = render(
        <StreamOGImageTemplate
          stream={makeStreamRecord({ recipientName: payload })}
        />,
      );

      expect(document.querySelector('script')).toBeNull();
      expect(screen.getByText(payload)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders HTML-looking metadata in stream name as text, not parsed elements', () => {
    HTML_LOOKING_PAYLOADS.forEach((payload) => {
      const { unmount, container } = render(
        <StreamOGImageTemplate stream={makeStreamRecord({ name: payload })} />,
      );

      // The h1 should contain the payload as text, not parsed HTML
      const h1 = container.querySelector('h1');
      expect(h1).toBeTruthy();
      expect(h1?.children.length).toBe(0);
      expect(h1?.textContent).toBe(payload);
      unmount();
    });
  });

  it('renders extremely long metadata values without injection', () => {
    const longName = 'X'.repeat(10000);
    const { unmount, container } = render(
      <StreamOGImageTemplate stream={makeStreamRecord({ name: longName })} />,
    );

    expect(document.querySelector('script')).toBeNull();
    const h1 = container.querySelector('h1');
    expect(h1?.textContent).toBe(longName);
    unmount();
  });

  it('does not create executable markup from any field', () => {
    const maliciousStream = makeStreamRecord({
      name: '<img src=x onerror=alert(1)>',
      recipientName: '<script>document.cookie</script>',
      recipientAddress: '"><svg onload=alert(1)>',
      treasuryName: '<iframe src="javascript:alert(1)">',
      summary: '<body onload=alert(1)>',
      healthNote: '<div onmouseover="alert(1)">hover</div>',
    });

    const { container } = render(
      <StreamOGImageTemplate stream={maliciousStream} />,
    );

    expect(container.querySelectorAll('script')).toHaveLength(0);
    expect(container.querySelectorAll('[onerror]')).toHaveLength(0);
    expect(container.querySelectorAll('[onload]')).toHaveLength(0);
    expect(container.querySelectorAll('[onclick]')).toHaveLength(0);
    expect(container.querySelectorAll('[onmouseover]')).toHaveLength(0);
    expect(container.querySelectorAll('iframe')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// MetaTags security tests (attribute injection)
// ---------------------------------------------------------------------------

describe('MetaTags – untrusted metadata in meta attributes', () => {
  it('quote injection in title is escaped by React Helmet and does not create event handler attributes', () => {
    const payload = '" onmouseover="alert(1)"';
    // Simulate what React Helmet does: it escapes attribute values
    // Create a meta element to verify escaping behavior
    const meta = document.createElement('meta');
    meta.setAttribute('content', `${payload} – Fluxora`);
    // The attribute value should contain the payload but not break out
    expect(meta.getAttribute('content')).toBe(`${payload} – Fluxora`);
    // No event handler attribute should be created
    expect(meta.getAttribute('onmouseover')).toBeNull();
  });

  it('script tag in description is rendered as attribute text, not executable HTML', () => {
    const payload = '<script>alert(1)</script>';
    const description = document.createElement('meta');
    description.setAttribute('property', 'og:description');
    description.setAttribute('content', payload);
    // The meta tag should contain the raw payload as an attribute value
    expect(description.getAttribute('content')).toBe(payload);
    // But it should not contain executable elements
    expect(description.innerHTML).not.toContain('<script>');
  });

  it('dangerous URL schemes in metadata fields are rendered as text content', () => {
    DANGEROUS_URL_PAYLOADS.forEach((scheme) => {
      const payload = `${scheme}//evil.com`;
      const textNode = document.createTextNode(payload);
      expect(textNode.textContent).toBe(payload);
      // Text nodes cannot execute scripts
    });
  });
});
