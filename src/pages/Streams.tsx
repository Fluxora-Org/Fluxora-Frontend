type stream = {
  id: string;
  name: string;
  recipient: string;
  rate: string;
  accured: string;
  status: "Active" | "Paused" | "Completed" | "Cancelled";
};

const streams: stream[] = [
  {
    id: "STR-001",
    name: "Payroll",
    recipient: "GSTU...pqr7",
    rate: "4,000 USDC/mo",
    accured: "0 USDC",
    status: "Active",
  },
  {
    id: "STR-002",
    name: "Bonus",
    recipient: "FSTU...xyz9",
    rate: "2,500 USDC/mo",
    accured: "1,250 USDC",
    status: "Paused",
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
          <h1 style={{ marginTop: 0 }}>Streams</h1>
          <p style={{ color: "var(--muted)" }}>
            Create and manage USDC streams. Set rate, duration, and cliff from
            the treasury.
          </p>
        </div>
        <button
          style={{
            background: "linear-gradient(to right, #22d3ee, #3b82f6)",
            color: "white",
            height: "40px",
            padding: "o.5rem 1rem",
            borderRadius: 8,
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
          alignItems: "cemter",
        }}
      >
        <input
          placeholder="Search by recipient or stream ID"
          style={{
            padding: "o.5rem 1rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            backgroundColor: "var(--surface-dark)",
            color: "var(--text-light)",
            flex: 0.5,
          }}
        />

        <select
          style={{
            padding: "0.5rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            color: "var(--muted)",
            backgroundColor: "var(--surface-dark)",
          }}
        >
          <option>
            Status: <span style={{ color: "var(--)" }}>All statuses</span>
          </option>
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
            color: "var(--muted)",
            backgroundColor: "var(--surface-dark)",
          }}
        >
          <option>Sort by: Newest first</option>
          <option>Oldest first</option>
        </select>
      </div>

      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th>STREAM</th>
              <th>RECIPIENT</th>
              <th>RATE</th>
              <th>ACCRUED</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {streams.map((stream) => (
              <tr
                key={stream.id}
                style={{
                  background: "var(--surface-dark)",
                  color: "var(--textlight)",
                }}
              >
                <td>
                  <div>
                    <strong>{stream.name}</strong>
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                      {stream.id}
                    </div>
                  </div>
                </td>
                <td>{stream.recipient}</td>
                <td>{stream.rate}</td>
                <td>{stream.accured}</td>
                <td>
                  <span
                    style={{
                      padding: "0.25rem 0.5rem",
                      borderRadius: 999,
                      background:
                        stream.status === "Active"
                          ? "green"
                          : stream.status === "Paused"
                            ? "orange"
                            : stream.status === "Completed"
                              ? "darkblue"
                              : "gray",
                      color: "white",
                      fontSize: "0.75rem",
                    }}
                  >
                    {stream.status}
                  </span>
                </td>
                <td>
                  <button style={{ color: "#22d3ee" }}>View</button>
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
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};
