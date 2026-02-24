import { Link } from 'react-router-dom';

export type StreamStatus = 'Active' | 'Paused' | 'Completed';

export interface Stream {
  id: string;
  name: string;
  recipient: string;
  rate: string;
  status: StreamStatus;
  detailUrl?: string;
}

interface RecentStreamsProps {
  streams: Stream[];
  viewAllUrl?: string;
}

export default function RecentStreams({ streams, viewAllUrl = '/streams' }: RecentStreamsProps) {
  return (
    <section style={sectionContainer}>
      <div style={header}>
        <h2 style={title}>Recent streams</h2>
        <Link to={viewAllUrl} style={viewAllLink}>
          View all <span style={arrow}>→</span>
        </Link>
      </div>

      <div style={tableCard}>
        <table style={table}>
          <thead>
            <tr style={headerRow}>
              <th style={th}>STREAM</th>
              <th style={th}>RECIPIENT</th>
              <th style={th}>RATE</th>
              <th style={th}>STATUS</th>
              <th style={th}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {streams.map((stream, index) => (
              <tr key={stream.id} style={index % 2 === 0 ? rowEven : rowOdd}>
                <td style={td}>
                  <div style={streamName}>{stream.name}</div>
                  <div style={streamId}>{stream.id}</div>
                </td>
                <td style={td}>
                  <code style={recipientCode}>{stream.recipient}</code>
                </td>
                <td style={td}>
                  <span style={rate}>{stream.rate}</span>
                </td>
                <td style={td}>
                  <StatusPill status={stream.status} />
                </td>
                <td style={td}>
                  <Link 
                    to={stream.detailUrl || `/streams/${stream.id}`} 
                    style={viewLink}
                    aria-label={`View details for ${stream.name}`}
                  >
                    View
                    <svg 
                      width="14" 
                      height="14" 
                      viewBox="0 0 14 14" 
                      fill="none" 
                      style={externalIcon}
                      aria-hidden="true"
                    >
                      <path 
                        d="M10.5 7.5v3.5a1 1 0 01-1 1h-7a1 1 0 01-1-1v-7a1 1 0 011-1H6m1.5-1.5h5v5m0-5L6 7" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: StreamStatus }) {
  const config = {
    Active: {
      bg: '#d1f4e8',
      color: '#00875a',
      icon: (
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" aria-hidden="true">
          <circle cx="4" cy="4" r="4" />
        </svg>
      ),
      label: 'Active'
    },
    Paused: {
      bg: '#fff4cc',
      color: '#cc8800',
      icon: (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="2" y="1" width="2" height="8" />
          <rect x="6" y="1" width="2" height="8" />
        </svg>
      ),
      label: 'Paused'
    },
    Completed: {
      bg: '#d4e7ff',
      color: '#0065cc',
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M2 6l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      label: 'Completed'
    }
  };

  const { bg, color, icon, label } = config[status];

  return (
    <span 
      style={{ ...pill, background: bg, color }} 
      role="status"
      aria-label={`Status: ${label}`}
    >
      <span style={pillIcon}>{icon}</span>
      {label}
    </span>
  );
}

// Styles
const sectionContainer: React.CSSProperties = {
  marginTop: '2rem',
};

const header: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
};

const title: React.CSSProperties = {
  margin: 0,
  fontSize: '1.25rem',
  fontWeight: 700,
  color: 'var(--text)',
};

const viewAllLink: React.CSSProperties = {
  color: '#00d4aa',
  fontSize: '0.9375rem',
  textDecoration: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  transition: 'opacity 0.2s',
};

const arrow: React.CSSProperties = {
  display: 'inline-block',
};

const tableCard: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  overflow: 'auto',
};

const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.9375rem',
  minWidth: '600px',
};

const headerRow: React.CSSProperties = {
  background: 'var(--surface)',
};

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '1rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid var(--border)',
};

const rowEven: React.CSSProperties = {
  background: 'var(--surface)',
};

const rowOdd: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
};

const td: React.CSSProperties = {
  padding: '1rem',
  borderBottom: '1px solid var(--border)',
  verticalAlign: 'middle',
};

const streamName: React.CSSProperties = {
  color: 'var(--text)',
  fontWeight: 500,
  marginBottom: '0.25rem',
};

const streamId: React.CSSProperties = {
  fontSize: '0.8125rem',
  color: 'var(--muted)',
};

const recipientCode: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--muted)',
  fontFamily: 'monospace',
};

const rate: React.CSSProperties = {
  fontWeight: 600,
  color: 'var(--text)',
};

const pill: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.375rem',
  padding: '0.375rem 0.75rem',
  borderRadius: 16,
  fontSize: '0.8125rem',
  fontWeight: 500,
};

const pillIcon: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
};

const viewLink: React.CSSProperties = {
  color: '#00d4aa',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  fontSize: '0.875rem',
  fontWeight: 500,
};

const externalIcon: React.CSSProperties = {
  marginLeft: '0.125rem',
};
