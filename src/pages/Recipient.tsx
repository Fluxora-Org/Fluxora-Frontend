import { useMemo, useState } from "react";
import "./Recipient.css";

type StreamStatus = "active" | "paused" | "completed";

type Stream = {
  id: string;
  orgName: string;
  address: string;
  rate: string;
  status: StreamStatus;
  accrued: number;
  withdrawable?: number;
};

const INITIAL_STREAMS: Stream[] = [
  {
    id: "stream-stellar-foundation",
    orgName: "Stellar Foundation",
    address: "GXYZ...abc1",
    rate: "5,000 USDC/mo",
    status: "active",
    accrued: 15000,
    withdrawable: 8500,
  },
  {
    id: "stream-defi-dao-treasury",
    orgName: "DeFi DAO Treasury",
    address: "GABC...def2",
    rate: "8,000 USDC/mo",
    status: "active",
    accrued: 12000,
    withdrawable: 12000,
  },
  {
    id: "stream-protocol-labs",
    orgName: "Protocol Labs",
    address: "GDEF...ghi3",
    rate: "3,200 USDC/mo",
    status: "paused",
    accrued: 4250,
    withdrawable: 2100,
  },
  {
    id: "stream-ecosystem-fund",
    orgName: "Ecosystem Fund",
    address: "GHIJ...jk14",
    rate: "4,000 USDC/mo",
    status: "completed",
    accrued: 12000,
  },
];

function formatUsdc(amount: number) {
  return `${amount.toLocaleString()} USDC`;
}

function StatusPill({ status }: { status: StreamStatus }) {
  if (status === "active") {
    return (
      <span className="recipient-status recipient-status-active">
        <span className="recipient-status-dot" aria-hidden="true" />
        Active
      </span>
    );
  }

  if (status === "paused") {
    return (
      <span className="recipient-status recipient-status-paused">
        <svg viewBox="0 0 24 24" className="recipient-status-icon" aria-hidden="true">
          <rect x="7" y="5" width="3" height="14" rx="1" />
          <rect x="14" y="5" width="3" height="14" rx="1" />
        </svg>
        Paused
      </span>
    );
  }

  return (
    <span className="recipient-status recipient-status-completed">
      <svg viewBox="0 0 24 24" className="recipient-status-icon" aria-hidden="true">
        <circle cx="12" cy="12" r="8" fill="none" strokeWidth="2" />
        <path d="M9 12.3l2 2 4-4" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Completed
    </span>
  );
}

function WithdrawIcon() {
  return (
    <svg viewBox="0 0 24 24" className="recipient-withdraw-icon" aria-hidden="true">
      <path d="M12 5v10" fill="none" strokeWidth="2" strokeLinecap="round" />
      <path d="M8.5 11.5L12 15l3.5-3.5" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19h14" fill="none" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Recipient() {
  const [streams, setStreams] = useState<Stream[]>(INITIAL_STREAMS);

  const hasStreams = useMemo(() => streams.length > 0, [streams.length]);

  const handleWithdraw = (streamId: string) => {
    setStreams((current) =>
      current.map((stream) => {
        if (stream.id !== streamId) return stream;
        if (!stream.withdrawable || stream.withdrawable <= 0) return stream;

        return {
          ...stream,
          accrued: Math.max(0, stream.accrued - stream.withdrawable),
          withdrawable: 0,
        };
      }),
    );
  };

  return (
    <section className="recipient-streams-section" aria-labelledby="your-streams-title">
      <h1 id="your-streams-title" className="recipient-streams-title">
        Your streams
      </h1>

      <div className="recipient-table-wrap">
        {hasStreams ? (
          <table className="recipient-streams-table" role="table">
            <thead>
              <tr>
                <th scope="col">FROM</th>
                <th scope="col">RATE</th>
                <th scope="col">STATUS</th>
                <th scope="col" className="recipient-col-right">
                  ACCRUED
                </th>
                <th scope="col" className="recipient-col-right">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {streams.map((stream) => {
                const canWithdraw = Boolean(stream.withdrawable && stream.withdrawable > 0);

                return (
                  <tr key={stream.id}>
                    <td data-label="FROM">
                      <div className="recipient-from-name">{stream.orgName}</div>
                      <div className="recipient-from-address">{stream.address}</div>
                    </td>
                    <td data-label="RATE">
                      <span className="recipient-rate">{stream.rate}</span>
                    </td>
                    <td data-label="STATUS">
                      <StatusPill status={stream.status} />
                    </td>
                    <td data-label="ACCRUED" className="recipient-col-right">
                      <div className="recipient-accrued">{formatUsdc(stream.accrued)}</div>
                      {stream.status !== "completed" ? (
                        <div className="recipient-withdrawable">
                          {canWithdraw ? formatUsdc(stream.withdrawable as number) : "0 USDC"} withdrawable
                        </div>
                      ) : null}
                    </td>
                    <td data-label="ACTIONS" className="recipient-col-right">
                      {stream.status !== "completed" ? (
                        canWithdraw ? (
                          <button
                            type="button"
                            className="recipient-withdraw-btn"
                            onClick={() => handleWithdraw(stream.id)}
                            aria-label={`Withdraw from ${stream.orgName}`}
                          >
                            <WithdrawIcon />
                            Withdraw
                          </button>
                        ) : (
                          <span className="recipient-no-withdraw">Nothing to withdraw</span>
                        )
                      ) : (
                        <span className="recipient-no-withdraw">Nothing to withdraw</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="recipient-empty-state">No streams yet.</p>
        )}
      </div>
    </section>
  );
}
