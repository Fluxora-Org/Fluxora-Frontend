import React from 'react';
import './skeleton.css';

export interface TreasuryOverviewLoadingProps {
  shimmer?: boolean;
}

export default function TreasuryOverviewLoading({ shimmer = true }: TreasuryOverviewLoadingProps) {
  const skeletonClass = shimmer ? 'skeleton' : 'skeleton-static';

  return (
    <div>
      <div className="treasury-loading-header">
        <div>
          <h1 style={{ margin: 0 }}>Treasury overview</h1>
          <p style={{ color: 'var(--muted)', marginTop: 6 }}>Treasury overview and active stream summary.</p>
        </div>
        <div>
          <button disabled style={{ padding: '0.5rem 0.75rem', borderRadius: 8 }}>Create stream</button>
        </div>
      </div>

      <div className="treasury-metrics">
        {[0, 1, 2].map((i) => (
          <div key={i} className="metric-card">
            <div className={"metric-icon " + skeletonClass} />
            <div className="metric-text">
              <div className={"metric-label " + skeletonClass} />
              <div className={"metric-value " + skeletonClass} />
            </div>
          </div>
        ))}
      </div>

      <div className="recent-header">
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Recent streams</h2>
        <a style={{ color: 'var(--primary)' }}>View all →</a>
      </div>

      <table className="recent-table" aria-hidden>
        <thead>
          <tr>
            <th>STREAM</th>
            <th>RECIPIENT</th>
            <th>RATE</th>
            <th>STATUS</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 4 }).map((_, r) => (
            <tr key={r}>
              <td>
                <div className="stream-two-lines">
                  <div className={skeletonClass} style={{ height: 12, width: r % 2 ? '55%' : '70%' }} />
                  <div className={skeletonClass} style={{ height: 10, width: '40%' }} />
                </div>
              </td>
              <td>
                <div className={skeletonClass} style={{ height: 12, width: '60%' }} />
              </td>
              <td>
                <div className={skeletonClass} style={{ height: 12, width: '50%' }} />
              </td>
              <td>
                <div className={skeletonClass} style={{ height: 12, width: '45%' }} />
              </td>
              <td>
                <div className={"action-placeholder " + skeletonClass} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
