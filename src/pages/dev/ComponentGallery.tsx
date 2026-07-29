/**
 * ComponentGallery
 * ────────────────
 * Design QA page for Button, Input, StatusPill, and MetricCard.
 * Accessible at /app/component-gallery (dev only — IS_DEV guard in App.tsx).
 *
 * Covers:
 *  - Button  — all variants × sizes × states (loading, disabled, icon-only,
 *              full-width)
 *  - Input   — all types × states (error, disabled, required, helper text)
 *  - StatusPill — all 6 statuses × all 4 icon sizes
 *  - MetricCard — standard, multi-token, with trend sparkline, edge cases
 *  - Live theme toggle (light / dark / cyberpunk) without leaving the page
 *
 * Accessibility (WCAG 2.1 AA):
 *  - <main id="main-content"> targeted by the global skip-link
 *  - Every section uses <section aria-labelledby="…">
 *  - Every example uses <figure aria-label="…"> + <figcaption>
 *  - Theme toggle is a <fieldset>/<legend> radio group (arrow-key navigable)
 *  - Colour is never the only differentiator — labels always present
 *  - No layout overflow at 320 px (min-width clamp grids)
 */

import { type ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import type { Theme } from "../../theme/ThemeProvider";
import Button from "../../components/Button";
import Input from "../../components/Input";
import StatusPill from "../../components/treasuryOverviewPage/StatusPill";
import MetricCard from "../../components/treasuryOverviewPage/MetricCard";
import { Zap, TrendingUp, Users, DollarSign, Star } from "lucide-react";

// ─── Constant matrices ────────────────────────────────────────────────────────

const BUTTON_VARIANTS = [
  "primary",
  "secondary",
  "danger",
  "success",
  "ghost",
] as const;

const BUTTON_SIZES = ["sm", "md", "lg"] as const;

const STATUS_PILL_STATUSES = [
  "Active",
  "Paused",
  "Completed",
  "Healthy",
  "At-Risk",
  "Critical",
] as const;

const ICON_SIZES = ["xs", "sm", "md", "lg"] as const;

const THEMES: Theme[] = ["light", "dark", "cyberpunk"];

// ─── Page component ───────────────────────────────────────────────────────────

export default function ComponentGallery() {
  const { theme, setTheme } = useTheme();

  return (
    <main
      id="main-content"
      style={{
        padding: "clamp(16px, 4vw, 40px)",
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      {/* ── Page header ───────────────────────────────────────── */}
      <header>
        <h1
          style={{
            fontSize: "clamp(20px, 3vw, 28px)",
            fontWeight: 700,
            marginBottom: 8,
            color: "var(--color-text-primary, var(--text))",
          }}
        >
          Component Gallery — Design QA
        </h1>
        <p
          style={{
            color: "var(--color-text-secondary, var(--muted))",
            marginBottom: 24,
            fontSize: 14,
          }}
        >
          Full variant/state matrix for Button, Input, StatusPill, and MetricCard.
          Use the theme toggle to inspect light, dark, and cyberpunk appearances.
        </p>
      </header>

      {/* ── Theme toggle ──────────────────────────────────────── */}
      <ThemeToggle current={theme} onChange={setTheme} />

      {/* ── Button ────────────────────────────────────────────── */}
      <GallerySection id="gallery-buttons" title="Button">
        <SourceNote path="src/components/Button.tsx" />

        <SubSection title="Variants × Sizes">
          <VariantSizeGrid />
        </SubSection>

        <SubSection title="Loading state">
          <Grid>
            {BUTTON_VARIANTS.map((variant) => (
              <Cell key={variant} label={`Button — ${variant}, loading`}>
                <Button variant={variant} loading>
                  Saving…
                </Button>
              </Cell>
            ))}
          </Grid>
        </SubSection>

        <SubSection title="Disabled state">
          <Grid>
            {BUTTON_VARIANTS.map((variant) => (
              <Cell key={variant} label={`Button — ${variant}, disabled`}>
                <Button variant={variant} disabled>
                  Disabled
                </Button>
              </Cell>
            ))}
          </Grid>
        </SubSection>

        <SubSection title="Icon-only (requires aria-label)">
          <Grid>
            {BUTTON_VARIANTS.map((variant) => (
              <Cell key={variant} label={`Button — ${variant}, icon-only`}>
                <Button
                  variant={variant}
                  iconOnly
                  icon={<Zap size={16} aria-hidden="true" />}
                  aria-label={`${variant} action`}
                />
              </Cell>
            ))}
          </Grid>
        </SubSection>

        <SubSection title="Full-width">
          <Cell label="Button — primary, full-width">
            <Button variant="primary" fullWidth>
              Full-Width Primary
            </Button>
          </Cell>
        </SubSection>
      </GallerySection>

      {/* ── Input ─────────────────────────────────────────────── */}
      <GallerySection id="gallery-inputs" title="Input">
        <SourceNote path="src/components/Input.tsx" />

        <SubSection title="Text input types">
          <Grid>
            <Cell label="Input — text, default">
              <Input label="Full name" type="text" placeholder="Ada Lovelace" />
            </Cell>
            <Cell label="Input — email, default">
              <Input label="Email address" type="email" placeholder="ada@example.com" />
            </Cell>
            <Cell label="Input — password, default">
              <Input label="Password" type="password" placeholder="••••••••" />
            </Cell>
            <Cell label="Input — number, default">
              <Input label="Amount (USDC)" type="number" placeholder="0.00" />
            </Cell>
          </Grid>
        </SubSection>

        <SubSection title="Textarea and Select">
          <Grid>
            <Cell label="Input — textarea, default">
              <Input label="Notes" type="textarea" placeholder="Stream notes…" />
            </Cell>
            <Cell label="Input — select, default">
              <Input
                label="Network"
                type="select"
                placeholder="Select network"
                options={[
                  { value: "testnet", label: "Testnet" },
                  { value: "mainnet", label: "Mainnet" },
                ]}
              />
            </Cell>
          </Grid>
        </SubSection>

        <SubSection title="Validation states">
          <Grid>
            <Cell label="Input — text, error">
              <Input
                label="Stellar address"
                type="text"
                error="Must start with G and be 56 characters long."
                defaultValue="not-valid"
              />
            </Cell>
            <Cell label="Input — email, error">
              <Input
                label="Email address"
                type="email"
                error="Enter a valid email address."
                defaultValue="not-an-email"
              />
            </Cell>
            <Cell label="Input — text, helper text">
              <Input
                label="Stream ID"
                type="text"
                helperText="Copy the 12-character ID from the transaction receipt."
                placeholder="abc123…"
              />
            </Cell>
            <Cell label="Input — select, error">
              <Input
                label="Asset"
                type="select"
                error="Please select an asset."
                options={[
                  { value: "usdc", label: "USDC" },
                  { value: "xlm", label: "XLM" },
                ]}
              />
            </Cell>
          </Grid>
        </SubSection>

        <SubSection title="Disabled and required states">
          <Grid>
            <Cell label="Input — text, disabled">
              <Input
                label="Read-only address"
                type="text"
                disabled
                defaultValue="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              />
            </Cell>
            <Cell label="Input — text, required">
              <Input label="Recipient address" type="text" required placeholder="G…" />
            </Cell>
            <Cell label="Input — password, required + disabled">
              <Input
                label="API key"
                type="password"
                required
                disabled
                defaultValue="sk_live_xxx"
              />
            </Cell>
          </Grid>
        </SubSection>
      </GallerySection>

      {/* ── StatusPill ────────────────────────────────────────── */}
      <GallerySection id="gallery-status-pill" title="StatusPill">
        <SourceNote path="src/components/treasuryOverviewPage/StatusPill.tsx" />

        <SubSection title="All statuses, default icon size (xs)">
          <Grid>
            {STATUS_PILL_STATUSES.map((status) => (
              <Cell key={status} label={`StatusPill — ${status}`}>
                <StatusPill status={status} iconSize="xs" />
              </Cell>
            ))}
          </Grid>
        </SubSection>

        <SubSection title="Icon sizes (Active status)">
          <Grid>
            {ICON_SIZES.map((size) => (
              <Cell key={size} label={`StatusPill — Active, iconSize ${size}`}>
                <StatusPill status="Active" iconSize={size} />
              </Cell>
            ))}
          </Grid>
        </SubSection>

        {/* Full matrix — all statuses × all icon sizes, as an accessible table */}
        <SubSection title="Full matrix — all statuses × all icon sizes">
          <div style={{ overflowX: "auto" }}>
            <table
              aria-label="StatusPill variant matrix"
              style={{
                borderCollapse: "collapse",
                minWidth: 480,
                width: "100%",
              }}
            >
              <thead>
                <tr>
                  <th
                    scope="col"
                    style={thStyle}
                  >
                    Status
                  </th>
                  {ICON_SIZES.map((size) => (
                    <th key={size} scope="col" style={thStyle}>
                      icon-{size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STATUS_PILL_STATUSES.map((status) => (
                  <tr key={status}>
                    <th scope="row" style={{ ...thStyle, textAlign: "left", fontWeight: 500 }}>
                      {status}
                    </th>
                    {ICON_SIZES.map((size) => (
                      <td
                        key={size}
                        style={{ padding: "8px 12px" }}
                        aria-label={`${status}, icon size ${size}`}
                      >
                        <StatusPill status={status} iconSize={size} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SubSection>
      </GallerySection>

      {/* ── MetricCard ────────────────────────────────────────── */}
      <GallerySection id="gallery-metric-card" title="MetricCard">
        <SourceNote path="src/components/treasuryOverviewPage/MetricCard.tsx" />

        <SubSection title="Basic variants">
          <Grid minWidth={280}>
            <Cell label="MetricCard — standard">
              <MetricCard
                icon={<DollarSign size={24} aria-hidden="true" />}
                label="Total Streamed"
                value="12,400 USDC"
                desc="Across all active streams"
              />
            </Cell>
            <Cell label="MetricCard — with trend sparkline">
              <MetricCard
                icon={<TrendingUp size={24} aria-hidden="true" />}
                label="Weekly Flow"
                value="3,200 USDC"
                desc="Up 18% from last week"
                trend={[1200, 1400, 1100, 1600, 1800, 2100, 3200]}
              />
            </Cell>
            <Cell label="MetricCard — multi-token">
              <MetricCard
                icon={<Zap size={24} aria-hidden="true" />}
                label="Vault Balance"
                value=""
                desc="Combined multi-asset balance"
                tokens={[
                  { asset: "USDC", amount: 8500 },
                  { asset: "XLM", amount: 42000 },
                ]}
              />
            </Cell>
            <Cell label="MetricCard — active streams count">
              <MetricCard
                icon={<Users size={24} aria-hidden="true" />}
                label="Active Streams"
                value="24"
                desc="14 healthy · 8 at-risk · 2 critical"
              />
            </Cell>
          </Grid>
        </SubSection>

        <SubSection title="Edge cases">
          <Grid minWidth={280}>
            <Cell label="MetricCard — long label">
              <MetricCard
                icon={<Star size={24} aria-hidden="true" />}
                label="Total Treasury Capital Deployed This Quarter"
                value="99,999.99 USDC"
                desc="Long label wraps correctly inside the card."
              />
            </Cell>
            <Cell label="MetricCard — zero value">
              <MetricCard
                icon={<DollarSign size={24} aria-hidden="true" />}
                label="Pending Withdrawals"
                value="0 USDC"
                desc="No withdrawals pending."
              />
            </Cell>
          </Grid>
        </SubSection>
      </GallerySection>

      {/* ── Responsive note ───────────────────────────────────── */}
      <section
        aria-label="Responsive QA note"
        style={{
          marginTop: 40,
          padding: "16px 20px",
          background: "var(--color-surface-default, var(--surface))",
          border: "1px solid var(--color-border-default, var(--border))",
          borderRadius: 10,
          fontSize: 13,
          color: "var(--color-text-secondary, var(--muted))",
        }}
      >
        <strong style={{ color: "var(--color-text-primary, var(--text))" }}>
          Responsive QA
        </strong>
        <p style={{ margin: "6px 0 0" }}>
          Resize the viewport to 320 px, 375 px, 768 px, and 1024 px to verify
          all cards remain readable and grids reflow. Each grid uses{" "}
          <code>minmax(min(100%, Xpx), 1fr)</code> so cells never overflow on
          narrow viewports.
        </p>
      </section>
    </main>
  );
}

// ─── Theme toggle (fieldset/legend radio group) ───────────────────────────────

function ThemeToggle({
  current,
  onChange,
}: {
  current: Theme;
  onChange: (t: Theme) => void;
}) {
  const THEME_LABELS: Record<Theme, { emoji: string; label: string }> = {
    light: { emoji: "☀️", label: "Light" },
    dark: { emoji: "🌙", label: "Dark" },
    cyberpunk: { emoji: "⚡", label: "Cyberpunk" },
  };

  return (
    <fieldset
      style={{
        border: "1px solid var(--color-border-default, var(--border))",
        borderRadius: 10,
        padding: "12px 20px",
        marginBottom: 32,
        background: "var(--color-surface-default, var(--surface))",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
      }}
    >
      <legend
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--color-text-primary, var(--text))",
          paddingInline: 4,
        }}
      >
        Gallery theme
      </legend>

      {THEMES.map((t) => {
        const { emoji, label } = THEME_LABELS[t];
        const isSelected = current === t;
        return (
          <label
            key={t}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 6,
              border: `2px solid ${
                isSelected
                  ? "var(--color-accent-primary, #6366f1)"
                  : "var(--color-border-default, var(--border))"
              }`,
              background: isSelected
                ? "var(--color-accent-bg, rgba(99,102,241,0.1))"
                : "transparent",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: isSelected ? 600 : 400,
              color: isSelected
                ? "var(--color-accent-primary, #6366f1)"
                : "var(--color-text-primary, var(--text))",
              transition: "border-color 0.15s, background 0.15s, color 0.15s",
            }}
          >
            <input
              type="radio"
              name="gallery-theme"
              value={t}
              checked={isSelected}
              onChange={() => onChange(t)}
              style={{
                /* Hidden visually but keeps keyboard/AT semantics */
                position: "absolute",
                opacity: 0,
                width: 0,
                height: 0,
              }}
            />
            <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>
              {emoji}
            </span>
            {label}
          </label>
        );
      })}
    </fieldset>
  );
}

// ─── Section layout helpers ───────────────────────────────────────────────────

function GallerySection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section aria-labelledby={headingId} style={{ marginBottom: 56 }}>
      <h2
        id={headingId}
        style={{
          fontSize: "clamp(17px, 2.5vw, 22px)",
          fontWeight: 700,
          marginBottom: 16,
          paddingBottom: 10,
          borderBottom: "2px solid var(--color-border-default, var(--border))",
          color: "var(--color-text-primary, var(--text))",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3
        style={{
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 12,
          color: "var(--color-text-secondary, var(--muted))",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function Grid({ children, minWidth = 200 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minWidth}px), 1fr))`,
        gap: 20,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Cell — wraps an example with a visible label.
 * Uses <figure> so screen readers associate the label with the content.
 */
function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure style={{ margin: 0 }} aria-label={label}>
      <figcaption
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--color-text-secondary, var(--muted))",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          userSelect: "none",
        }}
      >
        {label}
      </figcaption>
      {children}
    </figure>
  );
}

function SourceNote({ path }: { path: string }) {
  return (
    <p
      style={{
        fontSize: 12,
        color: "var(--color-text-secondary, var(--muted))",
        marginBottom: 16,
        marginTop: -8,
      }}
    >
      Source: <code>{path}</code>
    </p>
  );
}

// ─── Shared table header cell style ──────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: "6px 12px",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--color-text-secondary, var(--muted))",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  textAlign: "center",
  borderBottom: "1px solid var(--color-border-default, var(--border))",
};

// ─── Button variant × size grid ───────────────────────────────────────────────

function VariantSizeGrid() {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        aria-label="Button variant and size matrix"
        style={{ borderCollapse: "collapse", minWidth: 360, width: "100%" }}
      >
        <thead>
          <tr>
            <th scope="col" style={{ ...thStyle, textAlign: "left" }}>
              Variant
            </th>
            {BUTTON_SIZES.map((size) => (
              <th key={size} scope="col" style={thStyle}>
                size={size}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {BUTTON_VARIANTS.map((variant) => (
            <tr key={variant}>
              <th
                scope="row"
                style={{
                  ...thStyle,
                  textAlign: "left",
                  fontWeight: 500,
                  textTransform: "none",
                  letterSpacing: "normal",
                }}
              >
                {variant}
              </th>
              {BUTTON_SIZES.map((size) => (
                <td
                  key={size}
                  style={{ padding: "8px 12px", textAlign: "center" }}
                  aria-label={`Button — ${variant}, size ${size}`}
                >
                  <Button variant={variant} size={size}>
                    {variant.charAt(0).toUpperCase() + variant.slice(1)}
                  </Button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
