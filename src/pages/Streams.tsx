type stream = {
  id: string;
  name: string;
  recipient: string;
  rate: string;
  accrued: string;
  status: "Active" | "Paused" | "Completed" | "Cancelled";
};

const streams: stream[] = [
  {
    id: "STR-001",
    name: "Payroll",
    recipient: "GSTU...pqr7",
    rate: "4,000 USDC/mo",
    accrued: "0 USDC",
    status: "Active",
  },
  {
    id: "STR-002",
    name: "Bonus",
    recipient: "FSTU...xyz9",
    rate: "2,500 USDC/mo",
    accrued: "1,250 USDC",
    status: "Paused",
  },
  {
    id: "STR-003",
    name: "Dev Grants",
    recipient: "ASTU....aaa1",
    rate: "3,200 USDC/mo",
    accrued: "4,250 USDC",
    status: "Completed",
  },
  {
    id: "STR-004",
    name: "Advisors",
    recipient: "KSTU...zzz2",
    rate: "1,000 USDC/mo",
    accrued: "800 USDC",
    status: "Cancelled",
  },
];

export default function Streams() {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={{ marginTop: 0, fontSize: "2rem", fontWeight: 700 }}>
            Streams
          </h1>
          <p style={{ marginTop: 6, color: "var(--muted)" }}>
            Create and manage USDC streams. Set rate, duration, and cliff from
            the treasury.
          </p>
        </div>
        <button
          style={{
            background: "linear-gradient(to right, #22d3ee, #3b82f6)",
            color: "white",
            height: "40px",
            padding: "0.5rem 1rem",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span>+</span> Create stream
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginTop: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "var(--surface)",
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid var(--border)",

            gap: 4,
          }}
        >
          <span style={{ color: "var(--text)" }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="18px"
              fill="var(--muted)"
            >
              <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z" />
            </svg>
          </span>
          <input
            placeholder="Search by recipient or stream ID"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text)",
              width: "100%",
            }}
          />
        </div>

        <select
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            color: "var(--text)",
            backgroundColor: "var(--surface)",
          }}
        >
          <option value="all">Status:All statuses</option>
          <option>Active</option>
          <option>Paused</option>
          <option>Completed</option>
          <option>Cancelled</option>
        </select>
        <select
          style={{
            padding: "0.5rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            color: "var(--text)",
            backgroundColor: "var(--surface)",
          }}
        >
          <option value="sort">Sort by:Newest first</option>
          <option>Oldest first</option>
        </select>
      </div>

      <div style={tableWrap}>
        <table style={table}>
          <thead
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              fontSize: "0.75rem",
              letterSpacing: "0.05em",
              color: "var(--muted)",
            }}
          >
            <tr
              style={{
                background: "var(--surface)",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.03)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--surface)")
              }
            >
              <th style={thTdStyle}>STREAM</th>
              <th style={thTdStyle}>RECIPIENT</th>
              <th style={thTdStyle}>RATE</th>
              <th style={thTdStyle}>ACCRUED</th>
              <th style={thTdStyle}>STATUS</th>
              <th style={thTdStyle}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {streams.map((stream) => (
              <tr
                key={stream.id}
                style={{
                  background: "var(--surface)",
                  color: "var(--text)",
                }}
              >
                <td style={thTdStyle}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{stream.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      {stream.id}
                    </div>
                  </div>
                </td>
                <td style={thTdStyle}>{stream.recipient}</td>
                <td style={thTdStyle}>{stream.rate}</td>
                <td style={thTdStyle}>{stream.accrued}</td>
                <td style={thTdStyle}>{getStatusStyle(stream.status)}</td>
                <td style={thTdStyle}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#38bdf8",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      View ↗
                    </button>

                    <button
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#38bdf8",
                        cursor: "pointer",
                        fontSize: 18,
                      }}
                    >
                      ⋯
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const tableWrap: React.CSSProperties = {
  marginTop: "1.5rem",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  overflow: "hidden",
  overflowX: "auto",
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thTdStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "18px 16px",
  borderBottom: "1px solid var(--border)",
};

const getStatusStyle = (status: stream["status"]): JSX.Element => {
  const base: React.CSSProperties = {
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: "0.75rem",
    fontWeight: 500,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };

  switch (status) {
    case "Active":
      return (
        <span
          style={{
            ...base,
            background: "rgba(0, 212, 170, 0.15)",
            color: "var(--accent)",
          }}
        >
          ● Active
        </span>
      );

    case "Paused":
      return (
        <span
          style={{
            ...base,
            background: "rgba(245,158,11,0.15)",
            color: "#f59e0b",
          }}
        >
          ‖ Paused
        </span>
      );

    case "Completed":
      return (
        <span
          style={{
            ...base,
            background: "rgba(59,130,246,0.15)",
            color: "#3b82f6",
          }}
        >
          ✓ Completed
        </span>
      );

    case "Cancelled":
      return (
        <span
          style={{
            ...base,
            background: "rgba(107,114,128,0.15)",
            color: "#6b7a94",
          }}
        >
          — Cancelled
        </span>
      );
  }
};
