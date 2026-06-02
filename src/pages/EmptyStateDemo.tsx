import { useState } from "react";
import EmptyState from "../components/EmptyState";

/**
 * EmptyStateDemo
 * ──────────────
 * Design QA page for all EmptyState variants.
 * Accessible at /app/empty-state-demo (dev only).
 *
 * Covers:
 *  - All 6 variants: treasury, streams, recipient, zero-accrual,
 *    search-no-results, error
 *  - Connected / disconnected wallet states
 *  - Loading skeleton
 *  - Error banner with retry
 *  - Responsive breakpoints: 320 / 375 / 768 / 1024
 */
export default function EmptyStateDemo() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

  return (
    <main
      id="main-content"
      style={{ padding: "clamp(16px, 4vw, 40px)", maxWidth: 1100, margin: "0 auto" }}
    >
      <h1 style={{ fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 700, marginBottom: 8 }}>
        EmptyState — Design QA
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: 24, fontSize: 14 }}>
        All variants, states, and responsive breakpoints for{" "}
        <code>src/components/EmptyState.tsx</code>
      </p>

      {/* Controls */}
      <section
        aria-label="Demo controls"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 32,
          padding: "16px 20px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={walletConnected}
            onChange={(e) => setWalletConnected(e.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          Wallet connected
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showLoading}
            onChange={(e) => setShowLoading(e.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          Show loading skeleton
        </label>
      </section>

      {/* ── Existing variants ─────────────────────────────────────── */}
      <Section title="Existing variants">
        <Grid>
          <Cell label="treasury">
            <EmptyState
              variant="treasury"
              walletConnected={walletConnected}
              loading={showLoading}
              onPrimaryAction={() => alert("treasury CTA")}
            />
          </Cell>
          <Cell label="streams">
            <EmptyState
              variant="streams"
              walletConnected={walletConnected}
              loading={showLoading}
              onPrimaryAction={() => alert("streams CTA")}
            />
          </Cell>
          <Cell label="recipient">
            <EmptyState
              variant="recipient"
              walletConnected={walletConnected}
              loading={showLoading}
              onPrimaryAction={() => alert("recipient CTA")}
            />
          </Cell>
          <Cell label="zero-accrual">
            <EmptyState
              variant="zero-accrual"
              walletConnected={walletConnected}
              loading={showLoading}
              onPrimaryAction={() => alert("zero-accrual CTA")}
            />
          </Cell>
        </Grid>
      </Section>

      {/* ── New variants ──────────────────────────────────────────── */}
      <Section title="New variants (Issue #220)">
        <Grid>
          <Cell label="search-no-results">
            <EmptyState
              variant="search-no-results"
              walletConnected={walletConnected}
              loading={showLoading}
              onClearFilters={() => alert("Filters cleared")}
            />
          </Cell>
          <Cell label="error">
            <EmptyState
              variant="error"
              walletConnected={walletConnected}
              loading={showLoading}
              onRetry={() => alert("Retrying…")}
            />
          </Cell>
        </Grid>
      </Section>

      {/* ── Error variant with custom message ─────────────────────── */}
      <Section title="Error variant — custom message">
        <EmptyState
          variant="error"
          walletConnected={walletConnected}
          errorMessage="Failed to fetch streams: 503 Service Unavailable. The API is temporarily down."
          onRetry={() => alert("Retrying…")}
        />
      </Section>

      {/* ── Error banner on top of treasury ───────────────────────── */}
      <Section title="Error banner overlay (treasury + error prop)">
        <EmptyState
          variant="treasury"
          walletConnected={walletConnected}
          error="Network error — could not load treasury data."
          onRetry={() => alert("Retrying…")}
          onPrimaryAction={() => alert("Create stream")}
        />
      </Section>

      {/* ── Edge cases ────────────────────────────────────────────── */}
      <Section title="Edge cases">
        <Grid>
          <Cell label="search-no-results — long query text">
            <EmptyState
              variant="search-no-results"
              walletConnected={true}
              onClearFilters={() => alert("Filters cleared")}
            />
          </Cell>
          <Cell label="error — long Stellar address in message">
            <EmptyState
              variant="error"
              walletConnected={true}
              errorMessage={
                "Stream GBXXX…AAAA (GDKIJJIKXLOM2NRMPNQZUUYK24ZPVFC6426GZAIC3LFNGIXYZ1234567890) failed to load."
              }
              onRetry={() => alert("Retrying…")}
            />
          </Cell>
        </Grid>
      </Section>

      {/* ── Responsive preview note ───────────────────────────────── */}
      <section
        aria-label="Responsive breakpoint note"
        style={{
          marginTop: 40,
          padding: "16px 20px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          fontSize: 13,
          color: "var(--muted)",
        }}
      >
        <strong style={{ color: "var(--text)" }}>Responsive QA</strong>
        <p style={{ margin: "6px 0 0" }}>
          Resize the browser to 320 px, 375 px, 768 px, and 1024 px to verify
          that all variants remain readable and the icon box, heading, description,
          and CTA stack correctly. The component uses{" "}
          <code>clamp()</code> for padding and font sizes.
        </p>
      </section>
    </main>
  );
}

// ── Local layout helpers ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} style={{ marginBottom: 40 }}>
      <h2
        style={{
          fontSize: 16,
          fontWeight: 600,
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: "1px solid var(--border)",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 440px), 1fr))",
        gap: 24,
      }}
    >
      {children}
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--muted)",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}
